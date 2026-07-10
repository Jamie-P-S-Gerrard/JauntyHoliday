-- Time of day for the end of ranged plans: check-out time for stays,
-- return time for flights. Pairs with end_date from migration 016.

alter table public.itinerary_items
  add column if not exists end_time time;
