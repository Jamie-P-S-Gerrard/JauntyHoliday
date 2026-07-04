// In-memory implementations of the dates + mood board APIs for demo mode
// (no Supabase configured). State survives navigation but not a refresh.
import { formatRange, formatSub } from './dates';
import type { BoardApi, BoardItem, DateOption, DatesApi } from '@/types';

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
    { id: 'b1', title: 'Cliffside sunset dinners', note: 'Ashtari-style, golden hour', tint: '#c77f6a', who: 'c' },
    { id: 'b2', title: 'Turquoise snorkel bays', tint: '#7fa0c0', who: 'j' },
    { id: 'b3', title: 'Slow mornings, hammocks', note: 'No alarms allowed', tint: '#9aa56a', who: 'c' },
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
  async add(tripId, _groupId, { title, note, tint }) {
    await wait();
    const list = boardStore[tripId] ?? (boardStore[tripId] = []);
    list.unshift({ id: `b${Date.now()}`, title, note, tint, who: DEMO_USER });
  },
  async remove(itemId) {
    await wait();
    for (const key of Object.keys(boardStore)) {
      boardStore[key] = boardStore[key].filter((x) => x.id !== itemId);
    }
  },
};
