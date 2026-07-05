-- Two social features:
--   events   — lightweight single-date outings a member proposes to the crew
--              (dinner + show, hike + brunch) with ticket/venue links + RSVPs
--   messages — chat threads attached to a trip or an event

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references public.groups on delete cascade not null,
  title       text not null,
  event_date  date,
  time_label  text,
  note        text,
  venue       text,
  venue_url   text,
  ticket_url  text,
  tint        text default '#b07a9a',
  created_by  uuid references auth.users,
  created_at  timestamptz default now()
);
alter table public.events enable row level security;

create policy "Members can read events" on public.events
  for select using (public.is_group_member(group_id));
create policy "Members can propose events" on public.events
  for insert with check (created_by = auth.uid() and public.is_group_member(group_id));
create policy "Proposers can update events" on public.events
  for update using (created_by = auth.uid());
create policy "Proposers can remove events" on public.events
  for delete using (created_by = auth.uid());

create table if not exists public.event_rsvps (
  event_id  uuid references public.events on delete cascade,
  user_id   uuid references auth.users on delete cascade,
  created_at timestamptz default now(),
  primary key (event_id, user_id)
);
alter table public.event_rsvps enable row level security;

create policy "Members can read rsvps" on public.event_rsvps
  for select using (exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  ));
create policy "Members can rsvp" on public.event_rsvps
  for insert with check (user_id = auth.uid() and exists (
    select 1 from public.events e
    where e.id = event_id and public.is_group_member(e.group_id)
  ));
create policy "Users can remove own rsvp" on public.event_rsvps
  for delete using (user_id = auth.uid());

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups on delete cascade not null,
  trip_id    uuid references public.trips on delete cascade,
  event_id   uuid references public.events on delete cascade,
  who        uuid references auth.users not null,
  body       text not null,
  created_at timestamptz default now()
);
alter table public.messages enable row level security;

create policy "Members can read messages" on public.messages
  for select using (public.is_group_member(group_id));
create policy "Members can send messages" on public.messages
  for insert with check (who = auth.uid() and public.is_group_member(group_id));
create policy "Authors can delete messages" on public.messages
  for delete using (who = auth.uid());

create index if not exists messages_trip_idx on public.messages (trip_id, created_at);
create index if not exists messages_event_idx on public.messages (event_id, created_at);

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_rsvps;
alter publication supabase_realtime add table public.messages;
