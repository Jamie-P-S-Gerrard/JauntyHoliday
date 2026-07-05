-- 1. Multi-part events: the event's own fields act as part 1 (e.g. the show);
--    extra parts (dinner at a second venue) live in event_parts.
-- 2. Change history: a generic audit trigger records who changed what on all
--    editable content tables, with per-field old→new diffs.
-- 3. Collaborative editing: any member can now update events (delete stays
--    with the proposer).

-- ── Event parts ───────────────────────────────────────────────────────────────
create table if not exists public.event_parts (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid references public.events on delete cascade not null,
  seq         int default 1,
  title       text not null,
  time_label  text,
  venue       text,
  venue_url   text,
  ticket_url  text,
  created_at  timestamptz default now()
);
alter table public.event_parts enable row level security;

create policy "Members can read event parts" on public.event_parts
  for select using (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  ));
create policy "Members can add event parts" on public.event_parts
  for insert with check (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  ));
create policy "Members can update event parts" on public.event_parts
  for update using (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  ));
create policy "Members can delete event parts" on public.event_parts
  for delete using (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  ));

-- Events become collaboratively editable
drop policy if exists "Proposers can update events" on public.events;
create policy "Members can update events" on public.events
  for update using (public.is_group_member(group_id));

-- ── Change log ────────────────────────────────────────────────────────────────
create table if not exists public.change_log (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid,
  table_name text not null,
  entity_id  uuid,
  action     text not null check (action in ('insert','update','delete')),
  who        uuid,
  summary    text,
  diff       jsonb,
  created_at timestamptz default now()
);
alter table public.change_log enable row level security;

-- Read-only for members; rows are written exclusively by the trigger below
create policy "Members can read history" on public.change_log
  for select using (group_id is not null and public.is_group_member(group_id));

create index if not exists change_log_group_idx on public.change_log (group_id, created_at desc);

-- Generic audit trigger: resolves the owning group per table, diffs old vs
-- new on updates, and records the actor from the JWT.
create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  oldj jsonb;
  newj jsonb;
  rec  jsonb;
  gid  uuid;
  diff jsonb := '{}'::jsonb;
  k    text;
begin
  if TG_OP <> 'INSERT' then oldj := to_jsonb(OLD); end if;
  if TG_OP <> 'DELETE' then newj := to_jsonb(NEW); end if;
  rec := coalesce(newj, oldj);

  case TG_TABLE_NAME
    when 'itinerary_items' then
      select d.group_id into gid from public.days d where d.id = (rec->>'day_id')::uuid;
    when 'bookings' then
      select b.group_id into gid from public.budgets b where b.id = (rec->>'budget_id')::uuid;
    when 'event_parts' then
      select e.group_id into gid from public.events e where e.id = (rec->>'event_id')::uuid;
    else
      gid := (rec->>'group_id')::uuid;
  end case;

  if TG_OP = 'UPDATE' then
    for k in select jsonb_object_keys(newj) loop
      if newj->k is distinct from oldj->k and k not in ('created_at', 'updated_at', 'updated_by') then
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', oldj->k, 'to', newj->k));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return NEW; -- no-op update, nothing worth recording
    end if;
  end if;

  insert into public.change_log (group_id, table_name, entity_id, action, who, summary, diff)
  values (
    gid,
    TG_TABLE_NAME,
    (rec->>'id')::uuid,
    lower(TG_OP),
    auth.uid(),
    coalesce(rec->>'title', rec->>'range_label', rec->>'dest', rec->>'vibe'),
    case when TG_OP = 'UPDATE' then diff else null end
  );

  return coalesce(NEW, OLD);
end;
$$;

revoke execute on function public.log_change() from public, anon, authenticated;

-- Attach to the editable content tables
do $$
declare t text;
begin
  foreach t in array array[
    'events', 'event_parts', 'itinerary_items', 'bookings',
    'trips', 'date_options', 'mood_board_items', 'group_preferences'
  ] loop
    execute format('drop trigger if exists log_change_trigger on public.%I', t);
    execute format(
      'create trigger log_change_trigger after insert or update or delete on public.%I
       for each row execute function public.log_change()', t);
  end loop;
end;
$$;
