// In-memory implementations of the dates + mood board APIs for demo mode
// (no Supabase configured). State survives navigation but not a refresh.
import { dateRange, formatDayLabel, formatRange, formatSub } from './dates';
import { byTime, timeFromHHMM } from './time';
import { DAYS } from './data';
import type { BoardApi, BoardItem, ChangeEntry, ChatApi, ChatMsg, ChatScope, DateOption, DatesApi, Day, DocsApi, EventsApi, GroupEvent, HistoryApi, ItineraryApi, PhotosApi, Stay, StaysApi, TripDoc, TripPhoto } from '@/types';

const DEMO_USER = 'j';

// Seeded per-trip stores. The demo Lombok trip (t1) starts with the classic
// two options; other trips start empty.
const dateStore: Record<string, DateOption[]> = {
  t1: [
    {
      id: 'd1', range: 'Oct 3 – 12', sub: 'Sat → Mon · 9 nights',
      note: 'Dry season, calmest seas for the Gilis.', weather: 'Dry · 29°C',
      proposedBy: 'j', votes: ['c', 'j'], startDate: '2026-10-03', endDate: '2026-10-12',
    },
    {
      id: 'd2', range: 'Oct 17 – 26', sub: 'Sat → Mon · 9 nights',
      note: 'Cheaper flights but edges into shoulder rains.', weather: 'Mixed · 28°C',
      proposedBy: 'c', votes: ['c'], startDate: '2026-10-17', endDate: '2026-10-26',
    },
  ],
};

const boardStore: Record<string, BoardItem[]> = {
  t1: [
    { id: 'b1', kind: 'idea', title: 'Cliffside sunset dinners', note: 'Ashtari-style, golden hour', tint: '#c77f6a', who: 'c' },
    { id: 'b2', kind: 'note', title: 'No alarms. No laptops. Sarongs mandatory.', tint: '#cf9a5e', who: 'j' },
    { id: 'b3', kind: 'idea', title: 'Turquoise snorkel bays', tint: '#7fa0c0', who: 'j' },
  ],
};

const wait = () => new Promise((r) => setTimeout(r, 150));

export const demoDatesApi: DatesApi = {
  async list(tripId) {
    await wait();
    return [...(dateStore[tripId] ?? [])];
  },
  async propose(tripId, { start, end, note }) {
    await wait();
    const list = dateStore[tripId] ?? (dateStore[tripId] = []);
    list.push({
      id: `d${Date.now()}`,
      range: formatRange(start, end),
      sub: formatSub(start, end),
      note,
      proposedBy: DEMO_USER,
      votes: [DEMO_USER],
      startDate: start,
      endDate: end,
    });
  },
  async vote(optionId) {
    await wait();
    for (const list of Object.values(dateStore)) {
      const o = list.find((x) => x.id === optionId);
      if (o && !o.votes.includes(DEMO_USER)) o.votes.push(DEMO_USER);
    }
  },
  async unvote(optionId) {
    await wait();
    for (const list of Object.values(dateStore)) {
      const o = list.find((x) => x.id === optionId);
      if (o) o.votes = o.votes.filter((v) => v !== DEMO_USER);
    }
  },
  async remove(optionId) {
    await wait();
    for (const key of Object.keys(dateStore)) {
      dateStore[key] = dateStore[key].filter((x) => x.id !== optionId);
    }
  },
};

export const demoBoardApi: BoardApi = {
  async list(tripId) {
    await wait();
    return [...(boardStore[tripId] ?? [])];
  },
  async add(tripId, _groupId, { kind, title, note, tint, imageFile }) {
    await wait();
    const list = boardStore[tripId] ?? (boardStore[tripId] = []);
    list.unshift({
      id: `b${Date.now()}`,
      kind,
      title,
      note,
      tint,
      who: DEMO_USER,
      imageUrl: kind === 'photo' && imageFile ? URL.createObjectURL(imageFile) : undefined,
    });
  },
  async remove(itemId) {
    await wait();
    for (const key of Object.keys(boardStore)) {
      boardStore[key] = boardStore[key].filter((x) => x.id !== itemId);
    }
  },
};

// ── Trip photos (demo) ────────────────────────────────────────────────────────

const photoStore: Record<string, TripPhoto[]> = {};

export const demoPhotosApi: PhotosApi = {
  async list(tripId) {
    await wait();
    return [...(photoStore[tripId] ?? [])];
  },
  async add(tripId, _groupId, file, caption) {
    await wait();
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
    (photoStore[tripId] ??= []).unshift({
      id: `ph${Date.now()}`,
      url: URL.createObjectURL(file),
      caption: caption?.trim() || undefined,
      who: DEMO_USER,
      at: new Date().toISOString(),
    });
  },
  async remove(photoId) {
    await wait();
    for (const key of Object.keys(photoStore)) {
      photoStore[key] = photoStore[key].filter((p) => p.id !== photoId);
    }
  },
};

// ── Booking documents (demo) ──────────────────────────────────────────────────

const docStore: Record<string, TripDoc[]> = {};

export const demoDocsApi: DocsApi = {
  async list(tripId) {
    await wait();
    return [...(docStore[tripId] ?? [])];
  },
  async add(tripId, _groupId, file, { name, memberIds, itemId }) {
    await wait();
    const isPdf = file.type === 'application/pdf';
    if (!isPdf && !file.type.startsWith('image/')) throw new Error('Choose a PDF or an image');
    (docStore[tripId] ??= []).unshift({
      id: `doc${Date.now()}`,
      name: name.trim() || file.name,
      url: URL.createObjectURL(file),
      mime: file.type,
      memberIds,
      itemId,
      who: DEMO_USER,
      at: new Date().toISOString(),
    });
  },
  async remove(docId) {
    await wait();
    for (const key of Object.keys(docStore)) {
      docStore[key] = docStore[key].filter((d) => d.id !== docId);
    }
  },
};

export async function updateAvatarDemo(file: File): Promise<string> {
  await wait();
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
  return URL.createObjectURL(file);
}

// ── Itinerary (demo) ──────────────────────────────────────────────────────────

const dayStore: Record<string, Day[]> = {
  t1: DAYS.map((d) => ({ ...d, items: [...d.items] })),
};

export const demoItineraryApi: ItineraryApi = {
  async listDays(tripId) {
    await wait();
    return (dayStore[tripId] ?? []).map((d) => ({ ...d, items: [...d.items] }));
  },
  async setupDays(tripId, _groupId, start, end) {
    await wait();
    const dates = dateRange(start, end);
    dayStore[tripId] = dates.map((iso, i) => ({
      id: `day-${tripId}-${i + 1}`,
      n: i + 1,
      date: formatDayLabel(iso),
      iso,
      title: i === 0 ? 'Arrival day' : i === dates.length - 1 ? 'Heading home' : `Day ${i + 1}`,
      area: '',
      items: [],
    }));
  },
  async addItem(dayId, { time, title, place, cat, url, lat, lng, endDate, endTime }) {
    await wait();
    for (const days of Object.values(dayStore)) {
      const day = days.find((d) => d.id === dayId);
      if (day) {
        day.items.push({
          id: `i${Date.now()}`, time: timeFromHHMM(time), title, place: place ?? '', url,
          cat, who: DEMO_USER,
          coords: lat !== undefined && lng !== undefined ? { lat, lng } : undefined,
          endDate,
          endTime: timeFromHHMM(endTime),
          likes: 0, liked: false, comments: 0,
        });
        day.items.sort(byTime);
      }
    }
  },
  async updateItem(itemId, { time, title, place, cat, url, lat, lng, endDate, endTime }) {
    await wait();
    for (const days of Object.values(dayStore)) {
      for (const day of days) {
        const item = day.items.find((i) => i.id === itemId);
        if (item) {
          item.time = timeFromHHMM(time);
          item.title = title;
          item.place = place ?? '';
          item.cat = cat;
          item.url = url;
          item.coords = lat !== undefined && lng !== undefined ? { lat, lng } : item.coords;
          item.endDate = endDate;
          item.endTime = timeFromHHMM(endTime);
          day.items.sort(byTime);
        }
      }
    }
  },

  async removeItem(itemId) {
    await wait();
    for (const days of Object.values(dayStore)) {
      for (const day of days) {
        day.items = day.items.filter((i) => i.id !== itemId);
      }
    }
  },
  async toggleLike(itemId, liked) {
    await wait();
    for (const days of Object.values(dayStore)) {
      for (const day of days) {
        const item = day.items.find((i) => i.id === itemId);
        if (item) {
          item.liked = !liked;
          item.likes += liked ? -1 : 1;
        }
      }
    }
  },
};

// ── Stays (demo) ──────────────────────────────────────────────────────────────

const stayStore: Record<string, Stay[]> = {
  t1: [
    { id: 's1', title: 'Ashtari Hillside Villa', area: 'Kuta · ocean view', cost: 940, status: 'booked', who: 'c' },
    { id: 's2', title: 'Gili Air beach bungalow', area: 'Gili Air · nights 7–9', cost: 210, status: 'pending', who: 'j' },
  ],
};

export const demoStaysApi: StaysApi = {
  async list(tripId) {
    await wait();
    return [...(stayStore[tripId] ?? [])];
  },
  async add(tripId, _groupId, input) {
    await wait();
    const list = stayStore[tripId] ?? (stayStore[tripId] = []);
    list.push({ id: `s${Date.now()}`, ...input, who: DEMO_USER });
  },
  async update(stayId, input) {
    await wait();
    for (const list of Object.values(stayStore)) {
      const s = list.find((x) => x.id === stayId);
      if (s) {
        s.title = input.title;
        s.area = input.area;
        s.cost = input.cost;
      }
    }
  },

  async setStatus(stayId, status) {
    await wait();
    for (const list of Object.values(stayStore)) {
      const s = list.find((x) => x.id === stayId);
      if (s) s.status = status;
    }
  },
  async remove(stayId) {
    await wait();
    for (const key of Object.keys(stayStore)) {
      stayStore[key] = stayStore[key].filter((x) => x.id !== stayId);
    }
  },
};

// ── Events (demo) ─────────────────────────────────────────────────────────────

const eventStore: Record<string, GroupEvent[]> = {
  g1: [
    {
      id: 'ev1', title: 'Dinner & a show', date: '2026-08-14', time: '6:30pm',
      note: 'Early dinner then the 8pm session.', venue: 'Bar Totti\'s',
      venueUrl: 'https://example.com/tottis', ticketUrl: 'https://example.com/tickets',
      tint: '#b07a9a', who: 'c', going: ['c', 'j'],
      parts: [
        { id: 'evp1', title: 'The 8pm show', time: '8pm', venue: 'State Theatre', ticketUrl: 'https://example.com/tickets' },
      ],
    },
  ],
};

export const demoEventsApi: EventsApi = {
  async list(groupId) {
    await wait();
    return [...(eventStore[groupId] ?? [])];
  },
  async add(groupId, input) {
    await wait();
    const list = eventStore[groupId] ?? (eventStore[groupId] = []);
    list.push({
      id: `ev${Date.now()}`, tint: '#b07a9a', who: DEMO_USER, going: [DEMO_USER],
      ...input, parts: input.parts ?? [],
    });
  },
  async update(eventId, input) {
    await wait();
    for (const list of Object.values(eventStore)) {
      const i = list.findIndex((x) => x.id === eventId);
      if (i >= 0) {
        list[i] = { ...list[i], ...input, parts: input.parts ?? [] };
      }
    }
  },
  async rsvp(eventId, going) {
    await wait();
    for (const list of Object.values(eventStore)) {
      const e = list.find((x) => x.id === eventId);
      if (!e) continue;
      e.going = going
        ? (e.going.includes(DEMO_USER) ? e.going : [...e.going, DEMO_USER])
        : e.going.filter((u) => u !== DEMO_USER);
    }
  },
  async remove(eventId) {
    await wait();
    for (const key of Object.keys(eventStore)) {
      eventStore[key] = eventStore[key].filter((x) => x.id !== eventId);
    }
  },
};

// ── Chat (demo) ───────────────────────────────────────────────────────────────

const chatStore: Record<string, ChatMsg[]> = {
  'trip:t1': [
    { id: 'm1', who: 'c', body: 'Should we do the waterfall hike on the north day?', at: new Date(Date.now() - 3600e3).toISOString() },
    { id: 'm2', who: 'j', body: 'Yes! And Warung Flora after — I\'m starving already.', at: new Date(Date.now() - 3500e3).toISOString() },
  ],
};

function chatKey(scope: ChatScope): string {
  if (scope.eventId) return `event:${scope.eventId}`;
  if (scope.tripId) return `trip:${scope.tripId}`;
  return `group:${scope.groupId}`;
}

export const demoChatApi: ChatApi = {
  async list(scope) {
    await wait();
    return [...(chatStore[chatKey(scope)] ?? [])];
  },
  async send(scope, body) {
    await wait();
    const key = chatKey(scope);
    const list = chatStore[key] ?? (chatStore[key] = []);
    list.push({ id: `m${Date.now()}`, who: DEMO_USER, body, at: new Date().toISOString() });
  },
};

// ── History (demo) ────────────────────────────────────────────────────────────

const demoHistory: ChangeEntry[] = [
  { id: 'h1', table: 'events', action: 'update', who: 'c', summary: 'Dinner & a show', changedFields: ['venue', 'time_label'], at: new Date(Date.now() - 7200e3).toISOString() },
  { id: 'h2', table: 'itinerary_items', action: 'insert', who: 'j', summary: 'Pink Beach snorkel trip', changedFields: [], at: new Date(Date.now() - 86400e3).toISOString() },
  { id: 'h3', table: 'bookings', action: 'update', who: 'c', summary: 'Ashtari Hillside Villa', changedFields: ['status'], at: new Date(Date.now() - 172800e3).toISOString() },
];

export const demoHistoryApi: HistoryApi = {
  async list() {
    await wait();
    return [...demoHistory];
  },
};
