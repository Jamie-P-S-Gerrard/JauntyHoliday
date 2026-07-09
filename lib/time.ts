import type { ItineraryItem } from '@/types';

/**
 * Time of day stored as minutes since midnight (0–1439).
 * Numeric so items sort naturally; converts 1:1 with <input type="time"> values.
 */
export type TimeOfDay = number;

/** "14:30" or "14:30:00" (Postgres time) → 870. Returns null for empty/invalid input. */
export function timeFromHHMM(s: string | null | undefined): TimeOfDay | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 870 → "14:30" (value for <input type="time"> and 24h display). */
export function timeToHHMM(t: TimeOfDay): string {
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Display form of an item's time, or an em dash when unscheduled. */
export function formatItemTime(item: ItineraryItem): string {
  return item.time === null ? '–' : timeToHHMM(item.time);
}

/** Sort comparator: timed items first in time order, unscheduled items last. */
export function byTime(a: ItineraryItem, b: ItineraryItem): number {
  if (a.time === null && b.time === null) return 0;
  if (a.time === null) return 1;
  if (b.time === null) return -1;
  return a.time - b.time;
}
