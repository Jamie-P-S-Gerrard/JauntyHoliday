// In-memory implementations of the dates + mood board APIs for demo mode
// (no Supabase configured). State survives navigation but not a refresh.
import { dateRange, formatDayLabel, formatRange, formatSub } from './dates';
import { DAYS } from './data';
import type { BoardApi, BoardItem, DateOption, DatesApi, Day, ItineraryApi, Stay, StaysApi } from '@/types';

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
      title: i === 0 ? 'Arrival day' : i === dates.length - 1 ? 'Heading home' : `Day ${i + 1}`,
      area: '',
      items: [],
    }));
  },
  async addItem(dayId, { time, title, place, cat }) {
    await wait();
    for (const days of Object.values(dayStore)) {
      const day = days.find((d) => d.id === dayId);
      if (day) {
        day.items.push({
          id: `i${Date.now()}`, t: time || '–', title, place: place ?? '',
          cat, who: DEMO_USER, likes: 0, liked: false, comments: 0,
        });
        day.items.sort((a, b) => (a.t === '–' ? '99:99' : a.t).localeCompare(b.t === '–' ? '99:99' : b.t));
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
