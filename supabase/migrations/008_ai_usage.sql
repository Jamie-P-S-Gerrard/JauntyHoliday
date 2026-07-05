-- Track every AI request: who, which trip, and token counts — feeds the
-- per-user daily cap in /api/discover and the future admin cost dashboard.

create table if not exists public.ai_usage (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade not null,
  trip_id       uuid,
  model         text,
  input_tokens  int default 0,
  output_tokens int default 0,
  created_at    timestamptz default now()
);
alter table public.ai_usage enable row level security;

-- Users see and write only their own usage rows. (A tampered client could
-- only inflate its own count, which counts against its own daily cap.)
create policy "Users can read own usage" on public.ai_usage
  for select using (user_id = auth.uid());
create policy "Users can log own usage" on public.ai_usage
  for insert with check (user_id = auth.uid());

create index if not exists ai_usage_user_day on public.ai_usage (user_id, created_at);
