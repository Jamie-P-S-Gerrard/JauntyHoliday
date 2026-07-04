-- Real dates on date options + per-trip mood boards.

-- date_options gains actual date columns (001 only had display labels),
-- so options can be sorted and rendered on a calendar.
alter table public.date_options add column if not exists start_date date;
alter table public.date_options add column if not exists end_date date;

-- ── Mood board ────────────────────────────────────────────────────────────────
create table if not exists public.mood_board_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid references public.trips on delete cascade not null,
  group_id   uuid references public.groups on delete cascade not null,
  title      text not null,
  note       text,
  tint       text default '#caa37a',
  who        uuid references auth.users,
  created_at timestamptz default now()
);
alter table public.mood_board_items enable row level security;

create policy "Members can read board items" on public.mood_board_items
  for select using (public.is_group_member(group_id));
create policy "Members can add board items" on public.mood_board_items
  for insert with check (who = auth.uid() and public.is_group_member(group_id));
create policy "Authors can update board items" on public.mood_board_items
  for update using (who = auth.uid());
create policy "Authors can remove board items" on public.mood_board_items
  for delete using (who = auth.uid());

alter publication supabase_realtime add table public.mood_board_items;
