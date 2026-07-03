-- Auth wiring + missing RLS policies
-- 001 enabled RLS on most tables but defined almost no policies, which in
-- Postgres means every read/write is silently blocked. This migration adds:
--   1. a SECURITY DEFINER membership helper (avoids RLS self-recursion)
--   2. a trigger that creates a profile row on signup
--   3. a trigger that makes the group creator an owner member
--   4. a join-by-invite-code RPC (members can't SELECT groups they're not in,
--      so joining has to happen through a definer function)
--   5. full member-scoped policies for every trip table

-- ── 1. Membership helper ──────────────────────────────────────────────────────
-- The 001 policy "Members can read membership" queried group_members from its
-- own policy, which Postgres rejects at runtime as infinite recursion.
-- A SECURITY DEFINER function bypasses RLS for the lookup itself.
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ── 2. Profile auto-creation on signup ────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  );
  insert into public.profiles (id, name, initials, avatar_key)
  values (
    new.id,
    display_name,
    upper(left(display_name, 1)),
    'j'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3. Group creator becomes owner member ─────────────────────────────────────
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- ── 4. Join a group by invite code ────────────────────────────────────────────
create or replace function public.join_group_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid from public.groups where invite_code = upper(trim(code));
  if gid is null then
    raise exception 'invalid invite code';
  end if;
  insert into public.group_members (group_id, user_id, role)
  values (gid, auth.uid(), 'member')
  on conflict do nothing;
  return gid;
end;
$$;

-- ── 5. Policies ───────────────────────────────────────────────────────────────

-- profiles: 001 already has select-all + update-own; add insert-own as a
-- fallback for users created before the trigger existed.
create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- groups: replace the 001 read policy (self-join style) and add writes
drop policy if exists "Members can read their groups" on public.groups;
create policy "Members can read their groups" on public.groups
  for select using (public.is_group_member(id));
create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() = created_by);
create policy "Owners can update their groups" on public.groups
  for update using (public.is_group_owner(id));
create policy "Owners can delete their groups" on public.groups
  for delete using (public.is_group_owner(id));

-- group_members: replace recursive 001 read policy
drop policy if exists "Members can read membership" on public.group_members;
create policy "Members can read membership" on public.group_members
  for select using (user_id = auth.uid() or public.is_group_member(group_id));
create policy "Users can leave groups" on public.group_members
  for delete using (user_id = auth.uid());
-- inserts happen only via the definer triggers/RPC above

-- date_options
create policy "Members can read date options" on public.date_options
  for select using (public.is_group_member(group_id));
create policy "Members can propose dates" on public.date_options
  for insert with check (public.is_group_member(group_id) and proposed_by = auth.uid());
create policy "Proposers can remove their dates" on public.date_options
  for delete using (proposed_by = auth.uid());

-- date_votes (scope via the option's group)
create policy "Members can read votes" on public.date_votes
  for select using (exists (
    select 1 from public.date_options o
    where o.id = option_id and public.is_group_member(o.group_id)
  ));
create policy "Members can vote" on public.date_votes
  for insert with check (user_id = auth.uid() and exists (
    select 1 from public.date_options o
    where o.id = option_id and public.is_group_member(o.group_id)
  ));
create policy "Users can remove own votes" on public.date_votes
  for delete using (user_id = auth.uid());

-- discover_cards: seed catalog — readable by any signed-in user.
-- 001 left RLS off entirely, which exposed it to anonymous requests.
alter table public.discover_cards enable row level security;
create policy "Authenticated users can read cards" on public.discover_cards
  for select to authenticated using (true);

-- saved_cards
create policy "Members can read saved cards" on public.saved_cards
  for select using (public.is_group_member(group_id));
create policy "Members can save cards" on public.saved_cards
  for insert with check (user_id = auth.uid() and public.is_group_member(group_id));
create policy "Users can unsave own cards" on public.saved_cards
  for delete using (user_id = auth.uid());

-- days
create policy "Members can read days" on public.days
  for select using (public.is_group_member(group_id));
create policy "Members can manage days" on public.days
  for insert with check (public.is_group_member(group_id));
create policy "Members can update days" on public.days
  for update using (public.is_group_member(group_id));
create policy "Members can delete days" on public.days
  for delete using (public.is_group_member(group_id));

-- itinerary_items (scope via day)
create policy "Members can read items" on public.itinerary_items
  for select using (exists (
    select 1 from public.days d
    where d.id = day_id and public.is_group_member(d.group_id)
  ));
create policy "Members can add items" on public.itinerary_items
  for insert with check (exists (
    select 1 from public.days d
    where d.id = day_id and public.is_group_member(d.group_id)
  ));
create policy "Members can update items" on public.itinerary_items
  for update using (exists (
    select 1 from public.days d
    where d.id = day_id and public.is_group_member(d.group_id)
  ));
create policy "Members can delete items" on public.itinerary_items
  for delete using (exists (
    select 1 from public.days d
    where d.id = day_id and public.is_group_member(d.group_id)
  ));

-- item_likes
create policy "Members can read likes" on public.item_likes
  for select using (exists (
    select 1 from public.itinerary_items i
    join public.days d on d.id = i.day_id
    where i.id = item_id and public.is_group_member(d.group_id)
  ));
create policy "Members can like items" on public.item_likes
  for insert with check (user_id = auth.uid() and exists (
    select 1 from public.itinerary_items i
    join public.days d on d.id = i.day_id
    where i.id = item_id and public.is_group_member(d.group_id)
  ));
create policy "Users can remove own likes" on public.item_likes
  for delete using (user_id = auth.uid());

-- side_trips
create policy "Members can read side trips" on public.side_trips
  for select using (public.is_group_member(group_id));
create policy "Members can create side trips" on public.side_trips
  for insert with check (host = auth.uid() and public.is_group_member(group_id));
create policy "Hosts can update side trips" on public.side_trips
  for update using (host = auth.uid());
create policy "Hosts can delete side trips" on public.side_trips
  for delete using (host = auth.uid());

-- side_trip_rsvps
create policy "Members can read rsvps" on public.side_trip_rsvps
  for select using (exists (
    select 1 from public.side_trips t
    where t.id = trip_id and public.is_group_member(t.group_id)
  ));
create policy "Members can rsvp" on public.side_trip_rsvps
  for insert with check (user_id = auth.uid() and exists (
    select 1 from public.side_trips t
    where t.id = trip_id and public.is_group_member(t.group_id)
  ));
create policy "Users can remove own rsvp" on public.side_trip_rsvps
  for delete using (user_id = auth.uid());

-- packing_lists
create policy "Members can read packing lists" on public.packing_lists
  for select using (public.is_group_member(group_id));
create policy "Members can create packing lists" on public.packing_lists
  for insert with check (public.is_group_member(group_id));
create policy "Members can update packing lists" on public.packing_lists
  for update using (public.is_group_member(group_id));
create policy "Members can delete packing lists" on public.packing_lists
  for delete using (public.is_group_member(group_id));

-- packing_items (scope via list)
create policy "Members can read packing items" on public.packing_items
  for select using (exists (
    select 1 from public.packing_lists l
    where l.id = list_id and public.is_group_member(l.group_id)
  ));
create policy "Members can manage packing items" on public.packing_items
  for insert with check (exists (
    select 1 from public.packing_lists l
    where l.id = list_id and public.is_group_member(l.group_id)
  ));
create policy "Members can update packing items" on public.packing_items
  for update using (exists (
    select 1 from public.packing_lists l
    where l.id = list_id and public.is_group_member(l.group_id)
  ));
create policy "Members can delete packing items" on public.packing_items
  for delete using (exists (
    select 1 from public.packing_lists l
    where l.id = list_id and public.is_group_member(l.group_id)
  ));

-- budgets
create policy "Members can read budgets" on public.budgets
  for select using (public.is_group_member(group_id));
create policy "Members can create budgets" on public.budgets
  for insert with check (public.is_group_member(group_id));
create policy "Members can update budgets" on public.budgets
  for update using (public.is_group_member(group_id));

-- bookings (scope via budget)
create policy "Members can read bookings" on public.bookings
  for select using (exists (
    select 1 from public.budgets b
    where b.id = budget_id and public.is_group_member(b.group_id)
  ));
create policy "Members can add bookings" on public.bookings
  for insert with check (exists (
    select 1 from public.budgets b
    where b.id = budget_id and public.is_group_member(b.group_id)
  ));
create policy "Members can update bookings" on public.bookings
  for update using (exists (
    select 1 from public.budgets b
    where b.id = budget_id and public.is_group_member(b.group_id)
  ));
create policy "Members can delete bookings" on public.bookings
  for delete using (exists (
    select 1 from public.budgets b
    where b.id = budget_id and public.is_group_member(b.group_id)
  ));

-- feed_events
create policy "Members can read feed" on public.feed_events
  for select using (public.is_group_member(group_id));
create policy "Members can post to feed" on public.feed_events
  for insert with check (who = auth.uid() and public.is_group_member(group_id));
