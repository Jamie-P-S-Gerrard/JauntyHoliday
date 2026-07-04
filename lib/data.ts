import type {
  Trip, DateOption, DiscoverData, Day, SideTrip,
  PackingList, Budget, FeedEvent, Group,
} from '@/types';

export const TRIP: Trip = {
  place: 'Lombok',
  tagline: '10 sun-soaked days',
  dates: { label: 'Oct 3 – 12', year: 2026, nights: 9 },
  countdown: 119,
  hero: { label: 'Selong Belanak Beach', tint: '#caa37a' },
};

export const DATE_OPTIONS: DateOption[] = [
  {
    id: 'd1', range: 'Oct 3 – 12', sub: 'Sat → Mon · 9 nights',
    note: 'Dry season, calmest seas for the Gilis.', weather: 'Dry · 29°C',
    proposedBy: 'j', votes: ['c', 'j'],
  },
  {
    id: 'd2', range: 'Oct 17 – 26', sub: 'Sat → Mon · 9 nights',
    note: 'Cheaper flights but edges into shoulder rains.', weather: 'Mixed · 28°C',
    proposedBy: 'c', votes: ['c'],
  },
];

export const DISCOVER: DiscoverData = {
  prompts: [
    'Best beaches for snorkeling',
    'Where to stay near Kuta',
    'Good local restaurants',
    'Cultural etiquette tips',
    'A waterfall day from Senaru',
  ],
  filters: [
    { id: 'all', label: 'All' },
    { id: 'stay', label: 'Stays' },
    { id: 'eat', label: 'Eats' },
    { id: 'see', label: 'Beaches & sights' },
    { id: 'culture', label: 'Culture' },
  ] as any,
  cards: [
    {
      id: 'a1', cat: 'see', kind: 'activity', title: 'Pink Beach snorkel trip', area: 'Sekotong · SW Lombok',
      price: 38, per: 'per person', duration: 'Full day', rating: 4.8, tint: '#d98a8a',
      label: 'Pink Beach', why: "You both saved 'snorkeling' — calm reef, barely any crowds before noon.",
    },
    {
      id: 'a2', cat: 'stay', kind: 'stay', title: 'Ashtari Hillside Villa', area: 'Kuta · ocean view',
      price: 94, per: 'per night', duration: 'Sleeps 2', rating: 4.9, tint: '#9aa56a',
      label: 'Hillside villa', why: "Quiet, 6 min to Selong Belanak, matches your 'calm & private' note.",
    },
    {
      id: 'e1', cat: 'eat', kind: 'eat', title: 'Warung Flora', area: 'Kuta · Sasak home cooking',
      price: 6, per: '~$6 a head', duration: 'Local favourite', rating: 4.7, tint: '#cf9a5e',
      label: 'Sasak warung', why: "Authentic ayam taliwang and plecing kangkung — the dish Christie pinned.",
    },
    {
      id: 'e2', cat: 'eat', kind: 'eat', title: 'Ashtari Lounge — sunset table', area: 'Kuta hills',
      price: 0, per: 'dinner for two', duration: 'Book ahead', rating: 4.6, tint: '#c77f6a',
      label: 'Sunset dining', why: "Cliff-edge tables face west — reserve the 17:30 slot for the light.",
    },
    {
      id: 'a3', cat: 'see', kind: 'activity', title: 'Tiu Kelep waterfall hike', area: 'Senaru · North',
      price: 22, per: 'per person', duration: 'Half day', rating: 4.7, tint: '#7fa39a',
      label: 'Jungle waterfall', why: "Pairs well with a Rinjani foothills morning — moderate 1.5 hr walk.",
    },
    {
      id: 'a4', cat: 'see', kind: 'activity', title: 'Gili Nanggu day boat', area: 'Three south Gilis',
      price: 45, per: 'per person', duration: 'Full day', rating: 4.6, tint: '#7fa0c0',
      label: 'Island hop', why: "Less busy than the northern Gilis — turtles most mornings.",
    },
  ],
  culture: {
    id: 'cu1', title: 'Lombok, respectfully', area: 'Good to know',
    intro: 'Lombok is predominantly Muslim and largely Sasak. A few gentle habits go a long way:',
    tips: [
      { do: true, t: 'Cover shoulders & knees away from the beach, especially near mosques and villages.' },
      { do: true, t: 'A small smile and "terima kasih" (thank you) is warmly received everywhere.' },
      { do: true, t: 'Carry small cash — many warungs and boat operators are cash-only.' },
      { do: false, t: "Avoid public affection and don't photograph people without asking." },
      { do: false, t: 'During call to prayer, keep noise down near mosques.' },
    ],
  },
};

export const DAYS: Day[] = [
  {
    n: 1, date: 'Oct 3', title: 'Land & settle', area: 'Kuta',
    items: [
      { id: 'i1', t: '14:30', title: 'Land at Lombok Intl (LOP)', place: 'Praya', cat: 'travel', who: 'j', likes: 0, liked: false, comments: 0 },
      { id: 'i2', t: '16:00', title: 'Check in — Ashtari Villa', place: 'Kuta', cat: 'stay', who: 'c', likes: 1, liked: true, comments: 0 },
      { id: 'i3', t: '19:00', title: 'Dinner at Nugges', place: 'Kuta town', cat: 'food', who: 'c', likes: 0, liked: false, comments: 2 },
    ],
  },
  {
    n: 2, date: 'Oct 4', title: 'Beach day', area: 'Selong Belanak',
    items: [
      { id: 'i4', t: '08:30', title: 'Surf lesson for two', place: 'Selong Belanak', cat: 'beach', who: 'j', likes: 2, liked: true, comments: 0 },
      { id: 'i5', t: '13:00', title: 'Warung lunch on the sand', place: 'Selong Belanak', cat: 'food', who: 'c', likes: 0, liked: false, comments: 0 },
      { id: 'i6', t: '17:30', title: 'Sunset at Ashtari café', place: 'Kuta hills', cat: 'beach', who: 'j', likes: 0, liked: false, comments: 1 },
    ],
  },
  {
    n: 3, date: 'Oct 5', title: 'Pink Beach', area: 'Sekotong',
    items: [
      { id: 'i7', t: '07:30', title: 'Pink Beach snorkel trip', place: 'Sekotong', cat: 'beach', who: 'c', likes: 2, liked: true, comments: 0 },
    ],
  },
  { n: 4,  date: 'Oct 6',  title: 'South Gilis',  area: 'Gili Nanggu', items: [] },
  { n: 5,  date: 'Oct 7',  title: 'Drive north',  area: 'Senggigi',    items: [] },
  { n: 6,  date: 'Oct 8',  title: 'Waterfalls',   area: 'Senaru',      items: [] },
  { n: 7,  date: 'Oct 9',  title: 'Gili Air',     area: 'Gili Air',    items: [] },
  { n: 8,  date: 'Oct 10', title: 'Slow day',     area: 'Gili Air',    items: [] },
  { n: 9,  date: 'Oct 11', title: 'Back south',   area: 'Kuta',        items: [] },
  { n: 10, date: 'Oct 12', title: 'Fly home',     area: 'Praya',       items: [] },
];

export const SIDE_TRIPS: SideTrip[] = [
  { id: 's1', title: 'Sunrise yoga on the sand', host: 'c', when: 'Day 2 · 6:30am', place: 'Selong Belanak', type: 'open', going: ['c'], cap: 6, note: 'Gentle flow as the sun comes up — bring a sarong.' },
  { id: 's2', title: 'Dawn surf session', host: 'j', when: 'Day 2 · 7:00am', place: 'Selong Belanak', type: 'open', going: ['j', 'c'], cap: 4, note: 'Beginner-friendly beach break, boards from the warung.' },
  { id: 's3', title: 'Solo photo walk through Kuta', host: 'j', when: 'Day 1 · 4:30pm', place: 'Kuta town', type: 'solo', going: ['j'], note: 'A quiet golden-hour wander — just me and the camera.' },
  { id: 's4', title: 'Sasak cooking class', host: 'c', when: 'Day 8 · 2:00pm', place: 'Gili Air', type: 'open', going: ['c'], cap: 8, note: 'Market trip then cook four local dishes together.' },
];

export const PACKING_LISTS: PackingList[] = [
  {
    id: 'shared', name: 'Shared kit',
    items: [
      { id: 'p1', item: 'Reef-safe sunscreen', who: 'c', done: true },
      { id: 'p2', item: 'Snorkel masks ×2', who: 'j', done: true },
      { id: 'p3', item: 'Dry bag', who: 'j', done: false },
      { id: 'p4', item: 'Travel adapter (Type C/F)', who: 'j', done: false },
    ],
  },
  {
    id: 'jamie', name: "Jamie's bag",
    items: [
      { id: 'p5', item: 'Camera + charger', who: 'j', done: false },
      { id: 'p6', item: 'Light rain shell', who: 'j', done: true },
    ],
  },
];

export const BUDGET: Budget = {
  total: 4800, spent: 2960, currency: '$',
  cats: [
    { name: 'Flights',    spent: 1520, color: 'var(--terra)' },
    { name: 'Stays',      spent: 940,  color: 'var(--olive)' },
    { name: 'Activities', spent: 320,  color: 'var(--gold)' },
    { name: 'Food',       spent: 110,  color: '#b07a9a' },
    { name: 'Transport',  spent: 70,   color: '#6f93a8' },
  ],
  importEmail: 'lombok@plans.jaunt.me',
  bookings: [
    { id: 'b1', title: 'Return flights — SYD ⇄ LOP', meta: 'Garuda · 2 seats',  cost: 1520, status: 'booked',  who: 'j', ref: 'GA-7741Q',   from: 'email', files: ['e-ticket-GA7741.pdf', 'seat-map.pdf'] },
    { id: 'b2', title: 'Ashtari Hillside Villa',       meta: '9 nights · Kuta',  cost: 940,  status: 'booked',  who: 'c', ref: 'AIRBNB-2208', from: 'email', files: ['airbnb-itinerary.pdf'] },
    { id: 'b3', title: 'Pink Beach snorkel trip',      meta: 'Day boat · 2 pax', cost: 76,   status: 'pending', who: 'c', files: [] },
    { id: 'b4', title: 'Airport transfer',             meta: 'Private car',       cost: 0,    status: 'todo',    who: null, files: [] },
  ],
};

export const FEED: FeedEvent[] = [
  { id: 'f1', who: 'c', action: 'added',     what: 'Pink Beach snorkel trip', to: 'Day 3',          when: '2h ago',   react: 1 },
  { id: 'f2', who: 'j', action: 'booked',    what: 'Return flights',          to: 'Bookings',       when: 'Yesterday' },
  { id: 'f3', who: 'c', action: 'commented', what: '"Can we squeeze a sunset here too?"', to: 'Selong Belanak', when: 'Yesterday' },
];

export const INIT_GROUPS: Group[] = [
  {
    id: 'g1', name: 'Christie & Jamie', members: ['c', 'j'], invited: [], inviteCode: 'LOMBTK', tint: '#caa37a',
    prefs: { vibe: 'beach', pace: 'balanced', budget: 'comfortable', interests: ['Snorkelling', 'Food & cafés', 'Culture'], notes: 'Calm & private over party spots.' },
    trips: [
      { id: 't1', dest: 'Lombok',   when: 'Oct 2026', status: 'Active', tint: '#caa37a', ready: true },
      { id: 't2', dest: 'Kyoto',    when: 'Apr 2027', status: 'Idea',   tint: '#b07a9a', ready: false },
    ],
  },
  {
    id: 'g2', name: 'The Gili Crew', members: ['j', 'c', 'm', 'r', 's'], invited: [], inviteCode: 'GILI27', tint: '#7fa0c0',
    prefs: { vibe: 'adventure', pace: 'packed', budget: 'shoestring', interests: ['Diving', 'Nightlife', 'Hiking'] },
    trips: [
      { id: 't3', dest: 'Gili Islands', when: 'Mar 2027', status: 'Planning', tint: '#7fa0c0', ready: false },
    ],
  },
  {
    id: 'g3', name: 'Reid Family · NZ', members: ['j', 'f', 'm'], invited: [], inviteCode: 'NZQTN6', tint: '#9aa56a',
    prefs: { vibe: 'cozy', pace: 'chill', budget: 'comfortable', interests: ['Scenic drives', 'Food & cafés'] },
    trips: [
      { id: 't4', dest: 'Queenstown', when: 'Dec 2026', status: 'Idea', tint: '#9aa56a', ready: false },
    ],
  },
];

export const INTEREST_OPTIONS = [
  'Snorkelling', 'Diving', 'Hiking', 'Food & cafés', 'Culture', 'Nightlife',
  'Photography', 'Scenic drives', 'Wellness & spa', 'Surfing', 'Wildlife', 'Shopping',
];

export const USER_NAMES: Record<string, string> = {
  c: 'Christie', j: 'Jamie', m: 'Mia', r: 'Ravi', f: 'Fiona', s: 'Sam',
};

export const USER_INITIALS: Record<string, string> = {
  c: 'C', j: 'J', m: 'M', r: 'R', f: 'F', s: 'S', ai: '✦',
};

// Real signed-in users get merged in after fetching profiles from Supabase,
// so every screen's name/initial lookups keep working with UUID user ids.
export function registerProfiles(profiles: Array<{ id: string; name: string; initials: string }>) {
  for (const p of profiles) {
    USER_NAMES[p.id] = p.name;
    USER_INITIALS[p.id] = p.initials;
  }
}
