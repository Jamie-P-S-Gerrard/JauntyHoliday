'use client';
import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { USER_NAMES } from '@/lib/data';
import { timeAgo } from '@/lib/dates';
import type { ChangeEntry, HistoryApi } from '@/types';

const NOUNS: Record<string, string> = {
  events: 'event',
  event_parts: 'event part',
  itinerary_items: 'plan',
  bookings: 'stay',
  trips: 'trip',
  date_options: 'date option',
  mood_board_items: 'board pin',
  group_preferences: 'travel preferences',
};

const VERBS: Record<ChangeEntry['action'], string> = {
  insert: 'added',
  update: 'updated',
  delete: 'removed',
};

const FIELD_LABELS: Record<string, string> = {
  time_label: 'time', venue_url: 'venue link', ticket_url: 'ticket link',
  event_date: 'date', range_label: 'dates', budget_level: 'budget',
  image_url: 'photo', when_label: 'timing', date_label: 'date',
  start_date: 'start', end_date: 'end', sub_label: 'nights',
};

function fieldLabel(f: string): string {
  return FIELD_LABELS[f] ?? f.replace(/_/g, ' ');
}

interface HistorySheetProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  api: HistoryApi;
}

export function HistorySheet({ open, onClose, groupId, api }: HistorySheetProps) {
  const [entries, setEntries] = useState<ChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.list(groupId)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, api, groupId]);

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 4 }}>Activity</h2>
      <p className="hdr-sub" style={{ marginBottom: 16 }}>Every change, who made it, and what changed.</p>

      {loading ? (
        <p className="hdr-sub" style={{ textAlign: 'center', padding: 20 }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)', padding: '18px 0' }}>
          Nothing yet — changes will show up here.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '55vh', overflowY: 'auto' }}>
          {entries.map((e) => (
            <div key={e.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar userId={e.who ?? '?'} size="sm" />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, lineHeight: 1.45 }}>
                  <strong>{e.who ? (USER_NAMES[e.who] ?? 'Someone') : 'Someone'}</strong>
                  {' '}{VERBS[e.action]} {e.action === 'insert' ? (['event','event part'].includes(NOUNS[e.table] ?? '') ? 'an' : 'a') + ' ' : 'the '}
                  {NOUNS[e.table] ?? e.table}
                  {e.summary && <> <em style={{ color: 'var(--ink-soft)' }}>&ldquo;{e.summary}&rdquo;</em></>}
                </p>
                {e.changedFields.length > 0 && (
                  <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 1 }}>
                    changed: {e.changedFields.map(fieldLabel).join(', ')}
                  </p>
                )}
                <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>{timeAgo(e.at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
