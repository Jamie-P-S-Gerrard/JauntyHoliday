-- Real time-of-day + coordinates for itinerary items.
-- time_label stays (still written by the previously deployed build); it can be
-- dropped in a later cleanup once this release is out.

alter table public.itinerary_items
  add column if not exists start_time time,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Backfill start_time from the old free-text label where it parses cleanly
update public.itinerary_items
  set start_time = time_label::time
  where start_time is null
    and time_label ~ '^\d{1,2}:\d{2}$';

-- Items are always listed by day then time
create index if not exists itinerary_items_day_time_idx
  on public.itinerary_items (day_id, start_time);
