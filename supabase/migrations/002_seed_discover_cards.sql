-- Seed discover_cards with the Lombok card catalog
insert into public.discover_cards (id, cat, kind, title, area, price, per_unit, duration, rating, tint, label, why)
values
  ('a1', 'see', 'activity', 'Pink Beach snorkel trip', 'Sekotong · SW Lombok', 38, 'per person', 'Full day', 4.8, '#d98a8a', 'Pink Beach', 'You both saved ''snorkeling'' — calm reef, barely any crowds before noon.'),
  ('a2', 'stay', 'stay', 'Ashtari Hillside Villa', 'Kuta · ocean view', 94, 'per night', 'Sleeps 2', 4.9, '#9aa56a', 'Hillside villa', 'Quiet, 6 min to Selong Belanak, matches your ''calm & private'' note.'),
  ('e1', 'eat', 'eat', 'Warung Flora', 'Kuta · Sasak home cooking', 6, '~$6 a head', 'Local favourite', 4.7, '#cf9a5e', 'Sasak warung', 'Authentic ayam taliwang and plecing kangkung — the dish Christie pinned.'),
  ('e2', 'eat', 'eat', 'Ashtari Lounge — sunset table', 'Kuta hills', 0, 'dinner for two', 'Book ahead', 4.6, '#c77f6a', 'Sunset dining', 'Cliff-edge tables face west — reserve the 17:30 slot for the light.'),
  ('a3', 'see', 'activity', 'Tiu Kelep waterfall hike', 'Senaru · North', 22, 'per person', 'Half day', 4.7, '#7fa39a', 'Jungle waterfall', 'Pairs well with a Rinjani foothills morning — moderate 1.5 hr walk.'),
  ('a4', 'see', 'activity', 'Gili Nanggu day boat', 'Three south Gilis', 45, 'per person', 'Full day', 4.6, '#7fa0c0', 'Island hop', 'Less busy than the northern Gilis — turtles most mornings.')
on conflict (id) do nothing;
