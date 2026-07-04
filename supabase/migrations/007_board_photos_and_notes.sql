-- Mood board grows up: pins can be ideas (tinted tiles), sticky notes,
-- or photos uploaded from the user's device (Supabase Storage).

alter table public.mood_board_items
  add column if not exists kind text default 'idea' check (kind in ('idea','note','photo'));
alter table public.mood_board_items
  add column if not exists image_url text;

-- Public bucket for board photos. Anyone can view (the app is invite-only
-- by URL obscurity at MVP stage); only signed-in users can upload; only the
-- uploader can delete their objects.
insert into storage.buckets (id, name, public)
values ('board', 'board', true)
on conflict (id) do nothing;

create policy "Signed-in users can upload board images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'board');

create policy "Anyone can view board images" on storage.objects
  for select using (bucket_id = 'board');

create policy "Uploaders can delete board images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'board' and owner_id = (select auth.uid()::text));
