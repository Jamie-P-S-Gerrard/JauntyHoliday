-- Groups become crews that can plan MULTIPLE trips, and gain shared
-- travel preferences that feed the AI assistant.
--
-- Model change:
--   groups           = the crew (people, invite code, preferences)
--   trips (new)      = one adventure a crew is planning (dest, when, status)
--   trip content     = date options, days, budgets, etc. now belong to a trip
--
-- Existing trip-scoped tables keep their group_id (the 003 RLS policies keep
-- working unchanged) and gain a trip_id. Existing rows are backfilled into a
-- default trip created from each group's legacy dest/when columns.

-- ── Trips ─────────────────────────────────────────────────────────────────────
create table if not exists public.trips (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups on delete cascade not null,
  dest        text,
  when_label  text,
  status      text default 'Idea' check (status in ('Active','Planning','Idea')),
  tint        text default '#caa37a',
  ready       boolean default false,
  created_by  uuid references auth.users,
  created_at  timestamptz default now()
);
alter table public.trips enable row level security;

create policy "Members can read trips" on public.trips
  for select using (public.is_group_member(group_id));
create policy "Members can create trips" on public.trips
  for insert with check (public.is_group_member(group_id));
create policy "Members can update trips" on public.trips
  for update using (public.is_group_member(group_id));
create policy "Members can delete trips" on public.trips
  for delete using (public.is_group_member(group_id));

-- ── Group preferences (shared travel style — consumed by the AI) ─────────────
create table if not exists public.group_preferences (
  group_id     uuid primary key references public.groups on delete cascade,
  vibe         text,            -- cozy | adventure | romantic | city | beach
  pace         text,            -- chill | balanced | packed
  budget_level text,            -- shoestring | comfortable | treat
  interests    text[] default '{}',
  dietary      text,
  notes        text,
  updated_by   uuid references auth.users,
  updated_at   timestamptz default now()
);
alter table public.group_preferences enable row level security;

create policy "Members can read preferences" on public.group_preferences
  for select using (public.is_group_member(group_id));
create policy "Members can set preferences" on public.group_preferences
  for insert with check (public.is_group_member(group_id));
create policy "Members can update preferences" on public.group_preferences
  for update using (public.is_group_member(group_id));

-- ── Re-point trip content at trips ────────────────────────────────────────────
alter table public.date_options  add column if not exists trip_id uuid references public.trips on delete cascade;
alter table public.saved_cards   add column if not exists trip_id uuid references public.trips on delete cascade;
alter table public.days          add column if not exists trip_id uuid references public.trips on delete cascade;
alter table public.side_trips    add column if not exists trip_id uuid references public.trips on delete cascade;
alter table public.packing_lists add column if not exists trip_id uuid references public.trips on delete cascade;
alter table public.budgets       add column if not exists trip_id uuid references public.trips on delete cascade;
alter table public.feed_events   add column if not exists trip_id uuid references public.trips on delete cascade;

-- Backfill: one default trip per existing group, carrying its legacy
-- dest/when/status/tint/ready values.
insert into public.trips (group_id, dest, when_label, status, tint, ready, created_by)
select g.id, g.dest, g.when_label, coalesce(g.status, 'Planning'), g.tint, g.ready, g.created_by
from public.groups g
where not exists (select 1 from public.trips t where t.group_id = g.id);

update public.date_options  x set trip_id = (select t.id from public.trips t where t.group_id = x.group_id order by t.created_at limit 1) where x.trip_id is null;
update public.saved_cards   x set trip_id = (select t.id from public.trips t where t.group_id = x.group_id order by t.created_at limit 1) where x.trip_id is null;
update public.days          x set trip_id = (select t.id from public.trips t where t.group_id = x.group_id order by t.created_at limit 1) where x.trip_id is null;
update public.side_trips    x set trip_id = (select t.id from public.trips t where t.group_id = x.group_id order by t.created_at limit 1) where x.trip_id is null;
update public.packing_lists x set trip_id = (select t.id from public.trips t where t.group_id = x.group_id order by t.created_at limit 1) where x.trip_id is null;
update public.budgets       x set trip_id = (select t.id from public.trips t where t.group_id = x.group_id order by t.created_at limit 1) where x.trip_id is null;
update public.feed_events   x set trip_id = (select t.id from public.trips t where t.group_id = x.group_id order by t.created_at limit 1) where x.trip_id is null;

-- Uniqueness moves from group-scope to trip-scope
alter table public.budgets drop constraint if exists budgets_group_id_key;
alter table public.budgets add constraint budgets_trip_id_key unique (trip_id);
alter table public.days drop constraint if exists days_group_id_day_number_key;
alter table public.days add constraint days_trip_id_day_number_key unique (trip_id, day_number);

-- Realtime on trips + preferences so crews see each other's edits live
alter publication supabase_realtime add table public.trips;
alter publication supabase_realtime add table public.group_preferences;
