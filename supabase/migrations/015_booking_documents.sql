-- Booking confirmations: PDFs/images in the private `docs` bucket, with
-- member tagging (a booking can cover the whole group, one person, or a
-- subset like a single couple) and an optional link to a stay.
--
-- Visibility model (deliberate): every group member can open every document;
-- member_ids is a label saying who the booking covers, not an access wall.
--
-- Note: trip_documents, the `docs` bucket and its storage policies were
-- created directly on the live DB in an earlier session and the migration
-- file never reached the repo — the guarded DDL below reconstructs them so
-- fresh environments get the same schema.

create table if not exists public.trip_documents (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references public.trips on delete cascade not null,
  group_id    uuid references public.groups on delete cascade not null,
  name        text not null,
  path        text not null,
  mime        text,
  size_bytes  bigint,
  uploaded_by uuid references auth.users,
  created_at  timestamptz default now()
);
alter table public.trip_documents enable row level security;

drop policy if exists "Members can read trip documents" on public.trip_documents;
create policy "Members can read trip documents" on public.trip_documents
  for select using (public.is_group_member(group_id));
drop policy if exists "Members can add trip documents" on public.trip_documents;
create policy "Members can add trip documents" on public.trip_documents
  for insert with check (public.is_group_member(group_id) and uploaded_by = auth.uid());
drop policy if exists "Uploaders can remove trip documents" on public.trip_documents;
create policy "Uploaders can remove trip documents" on public.trip_documents
  for delete using (uploaded_by = auth.uid());

-- Who the booking covers (empty array = the whole group) + optional stay link
alter table public.trip_documents
  add column if not exists member_ids uuid[] not null default '{}',
  add column if not exists stay_id uuid references public.bookings on delete set null;

-- ── Bucket: private, PDFs and images only; enforce limits server-side ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('docs', 'docs', false, 15728640,
        array['application/pdf','image/webp','image/jpeg','image/png'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Storage policies (path = {group_id}/{trip_id}/{uuid}.ext) ────────────────
drop policy if exists "Members can read trip docs" on storage.objects;
create policy "Members can read trip docs" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'docs'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );
drop policy if exists "Members can upload trip docs" on storage.objects;
create policy "Members can upload trip docs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'docs'
    and public.is_group_member(((storage.foldername(name))[1])::uuid)
  );
drop policy if exists "Uploaders can delete trip docs" on storage.objects;
create policy "Uploaders can delete trip docs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'docs' and owner_id = (select auth.uid()::text));
