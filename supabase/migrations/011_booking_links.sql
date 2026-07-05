-- Booking-site links on itinerary plans and stays (mirrors event links).
alter table public.itinerary_items add column if not exists url text;
alter table public.bookings add column if not exists url text;
