-- Trip photo sharing + user avatars (Supabase Storage).
--
-- Security model:
--   avatars      public bucket, one folder per user ({user_id}/avatar.webp);
--                only the owner can write, anyone can view.
--   trip-photos  PRIVATE bucket ({group_id}/{trip_id}/{uuid}.webp); only group
--                members can upload or view (via short-lived signed URLs),
--                only the uploader can delete.
-- Size and mime limits are enforced at the bucket level (server-side).

-- ── Profiles: uploaded avatar ─────────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text;

-- ── Trip photos table ─────────────────────────────────────────────────────────
create table if not exists public.trip_photos (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references public.trips on delete cascade not null,
  group_id    uuid references public.groups on delete cascade not null,
  path        text not null,
  caption     text,
  who         uuid references auth.users,
  created_at  timestamptz default now()
);
alter table public.trip_photos enable row level security;

create policy "Members can read trip photos" on public.trip_photos
  for select using (public.is_group_member(group_id));
create policy "Members can add trip photos" on public.trip_photos
  for insert with check (public.is_group_member(group_id) and who = auth.uid());
create policy "Uploaders can update their photos" on public.trip_photos
  for update using (who = auth.uid());
create policy "Uploaders can delete their photos" on public.trip_photos
  for delete using (who = auth.uid());

alter publication supabase_realtime add table public.trip_photos;

-- ── Buckets ───────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 8388608, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Storage policies: avatars ─────────────────────────────────────────────────
-- No SELECT policy on purpose: the bucket is public, so objects are served by
-- URL without one, and adding one would let clients LIST every avatar.
create policy "Users can upload their own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can replace their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Storage policies: trip photos (group members only) ───────────────────────
create policy "Members can view trip photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-photos'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );
create policy "Members can upload trip photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-photos'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );
create policy "Uploaders can delete trip photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'trip-photos' and owner_id = (select auth.uid()::text));
