-- Jaunt MVP schema
-- Run in Supabase SQL editor or via supabase db push

-- ── Users (extends Supabase auth.users) ──────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  initials    text not null,
  avatar_key  text not null default 'j',
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- ── Groups ────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  dest         text,
  when_label   text,
  invite_code  text unique not null,
  ready        boolean default false,
  status       text default 'Planning' check (status in ('Active','Planning','Idea')),
  tint         text default '#caa37a',
  created_by   uuid references auth.users not null,
  created_at   timestamptz default now()
);
alter table public.groups enable row level security;

create table if not exists public.group_members (
  group_id  uuid references public.groups on delete cascade,
  user_id   uuid references auth.users on delete cascade,
  role      text default 'member' check (role in ('owner','member')),
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);
alter table public.group_members enable row level security;

create policy "Members can read their groups" on public.groups
  for select using (
    exists (select 1 from public.group_members where group_id = id and user_id = auth.uid())
  );
create policy "Members can read membership" on public.group_members
  for select using (user_id = auth.uid() or group_id in (
    select group_id from public.group_members where user_id = auth.uid()
  ));

-- ── Date options & votes ──────────────────────────────────────────────────────
create table if not exists public.date_options (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references public.groups on delete cascade not null,
  range_label  text not null,
  sub_label    text,
  note         text,
  weather      text,
  proposed_by  uuid references auth.users,
  created_at   timestamptz default now()
);
alter table public.date_options enable row level security;

create table if not exists public.date_votes (
  option_id uuid references public.date_options on delete cascade,
  user_id   uuid references auth.users on delete cascade,
  voted_at  timestamptz default now(),
  primary key (option_id, user_id)
);
alter table public.date_votes enable row level security;

-- ── Discover cards (seeded, group-specific saves) ─────────────────────────────
create table if not exists public.discover_cards (
  id       text primary key,
  cat      text not null,
  kind     text not null,
  title    text not null,
  area     text,
  price    numeric,
  per_unit text,
  duration text,
  rating   numeric,
  tint     text,
  label    text,
  why      text
);

create table if not exists public.saved_cards (
  group_id uuid references public.groups on delete cascade,
  user_id  uuid references auth.users on delete cascade,
  card_id  text references public.discover_cards,
  saved_at timestamptz default now(),
  primary key (group_id, user_id, card_id)
);
alter table public.saved_cards enable row level security;

-- ── Itinerary ──────────────────────────────────────────────────────────────────
create table if not exists public.days (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups on delete cascade not null,
  day_number int not null,
  date_label text,
  title      text,
  area       text,
  unique(group_id, day_number)
);
alter table public.days enable row level security;

create table if not exists public.itinerary_items (
  id         uuid primary key default gen_random_uuid(),
  day_id     uuid references public.days on delete cascade not null,
  time_label text,
  title      text not null,
  place      text,
  cat        text default 'activity',
  who        uuid references auth.users,
  likes      int default 0,
  comments   int default 0,
  sort_order int default 0,
  created_at timestamptz default now()
);
alter table public.itinerary_items enable row level security;

create table if not exists public.item_likes (
  item_id  uuid references public.itinerary_items on delete cascade,
  user_id  uuid references auth.users on delete cascade,
  primary key (item_id, user_id)
);
alter table public.item_likes enable row level security;

-- ── Side trips ────────────────────────────────────────────────────────────────
create table if not exists public.side_trips (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups on delete cascade not null,
  title      text not null,
  host       uuid references auth.users not null,
  when_label text,
  place      text,
  type       text default 'open' check (type in ('solo','open')),
  cap        int,
  note       text,
  created_at timestamptz default now()
);
alter table public.side_trips enable row level security;

create table if not exists public.side_trip_rsvps (
  trip_id  uuid references public.side_trips on delete cascade,
  user_id  uuid references auth.users on delete cascade,
  rsvp_at  timestamptz default now(),
  primary key (trip_id, user_id)
);
alter table public.side_trip_rsvps enable row level security;

-- ── Packing ───────────────────────────────────────────────────────────────────
create table if not exists public.packing_lists (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups on delete cascade not null,
  name       text not null,
  created_at timestamptz default now()
);
alter table public.packing_lists enable row level security;

create table if not exists public.packing_items (
  id        uuid primary key default gen_random_uuid(),
  list_id   uuid references public.packing_lists on delete cascade not null,
  item      text not null,
  who       uuid references auth.users,
  done      boolean default false,
  sort_order int default 0
);
alter table public.packing_items enable row level security;

-- ── Budget & bookings ─────────────────────────────────────────────────────────
create table if not exists public.budgets (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid references public.groups on delete cascade unique not null,
  total         numeric default 0,
  currency      text default '$',
  import_email  text,
  created_at    timestamptz default now()
);
alter table public.budgets enable row level security;

create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  budget_id  uuid references public.budgets on delete cascade not null,
  title      text not null,
  meta       text,
  cost       numeric,
  status     text default 'pending' check (status in ('booked','pending','todo')),
  who        uuid references auth.users,
  ref        text,
  from_email boolean default false,
  files      text[] default '{}',
  created_at timestamptz default now()
);
alter table public.bookings enable row level security;

-- ── Activity feed ─────────────────────────────────────────────────────────────
create table if not exists public.feed_events (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups on delete cascade not null,
  who        uuid references auth.users not null,
  action     text not null,
  what       text,
  to_label   text,
  created_at timestamptz default now()
);
alter table public.feed_events enable row level security;

-- Enable realtime on key tables
alter publication supabase_realtime add table public.itinerary_items;
alter publication supabase_realtime add table public.date_votes;
alter publication supabase_realtime add table public.side_trip_rsvps;
alter publication supabase_realtime add table public.packing_items;
alter publication supabase_realtime add table public.feed_events;
alter publication supabase_realtime add table public.bookings;
