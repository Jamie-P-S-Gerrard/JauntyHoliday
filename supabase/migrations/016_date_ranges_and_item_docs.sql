-- Date ranges for stays/flights + confirmations attached to plan items.
--
-- days.date        real calendar date for each itinerary day (date_label stays
--                  for display). Backfilled from the trip's most recent voted
--                  date option where possible.
-- items.end_date   check-out date for stays, return date for flights; the
--                  item's start date is its day's date.
-- docs.item_id     confirmations now hang off itinerary items (activity cards)
--                  instead of the trip-home section.

alter table public.days
  add column if not exists date date;

-- Backfill: day N = option start_date + (N - 1), using each trip's most
-- recently proposed dated option. Imperfect for trips whose days were built
-- from different dates; those simply keep null and the feature degrades
-- gracefully (no ranged placement until days are rebuilt).
update public.days d
set date = o.start_date + (d.day_number - 1)
from (
  select distinct on (trip_id) trip_id, start_date
  from public.date_options
  where start_date is not null and trip_id is not null
  order by trip_id, created_at desc
) o
where d.trip_id = o.trip_id
  and d.date is null;

alter table public.itinerary_items
  add column if not exists end_date date;

alter table public.trip_documents
  add column if not exists item_id uuid references public.itinerary_items on delete set null;
