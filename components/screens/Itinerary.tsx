'use client';
import { toast } from '@/components/ui/Toast';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Placeholder } from '@/components/ui/Placeholder';
import type { Day, ItineraryApi, ItineraryItemCat } from '@/types';

const CAT_ICONS: Record<string, string> = {
  travel: 'plane', stay: 'bed', food: 'utensils', beach: 'waves', activity: 'map-pin',
};
const CAT_COLORS: Record<string, { bg: string; fg: string }> = {
  travel:   { bg: 'var(--surface-2)',   fg: 'var(--ink-soft)' },
  stay:     { bg: 'var(--olive-bg)',    fg: 'var(--olive)' },
  food:     { bg: 'var(--terra-bg)',    fg: 'var(--terra)' },
  beach:    { bg: '#ddeef4',            fg: '#4e8fa0' },
  activity: { bg: 'var(--gold-bg)',     fg: 'var(--gold)' },
};
const CATS: Array<{ id: ItineraryItemCat; label: string }> = [
  { id: 'activity', label: 'Activity' },
  { id: 'food',     label: 'Food' },
  { id: 'beach',    label: 'Beach' },
  { id: 'stay',     label: 'Stay' },
  { id: 'travel',   label: 'Travel' },
];

interface ItineraryProps {
  tripId: string;
  groupId: string;
  userId: string;
  api: ItineraryApi;
}

export function Itinerary({ tripId, groupId, userId, api }: ItineraryProps) {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setDays(await api.listDays(tripId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, tripId]);

  useEffect(() => { reload(); }, [reload]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="hdr-sub" style={{ textAlign: 'center', padding: 32 }}>Loading…</p>;
  }

  // No days yet — set up the day-by-day plan from a date range
  if (days.length === 0) {
    return <SetupDays onSetup={(start, end) => run(() => api.setupDays(tripId, groupId, start, end))} />;
  }

  const day = days.find((d) => d.n === selectedDay) ?? days[0];

  return (
    <>
      {/* Day strip */}
      <div style={{ overflowX: 'auto', padding: '0 var(--pad) 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
          {days.map((d) => {
            const on = d.n === day.n;
            const hasDot = d.items.length > 0;
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDay(d.n)}
                style={{
                  width: 52, height: 52, borderRadius: 999, flexShrink: 0,
                  background: on ? 'var(--terra)' : 'var(--surface)',
                  border: `1px solid ${on ? 'transparent' : 'var(--line-2)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: on ? 'rgba(255,255,255,0.75)' : 'var(--ink-faint)' }}>DAY</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: on ? '#fff' : 'var(--ink)', lineHeight: 1 }}>{d.n}</p>
                {hasDot && !on && (
                  <div style={{ position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: '50%', background: 'var(--terra)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
        {/* Day header */}
        <div style={{ marginBottom: 12 }}>
          <p className="eyebrow">{day.date || `Day ${day.n}`}</p>
          <p className="sec-title">{day.title}</p>
          {day.area && (
            <span className="chip" style={{ marginTop: 6, height: 26, fontSize: 11.5 }}>
              <Icon name="map-pin" size={11} color="var(--ink-soft)" /> {day.area}
            </span>
          )}
        </div>

        {/* Map peek */}
        {day.items.length > 0 && (
          <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 104, marginBottom: 16, position: 'relative' }}>
            <Placeholder tint="#9aad8a" style={{ position: 'absolute', inset: 0 }} label={day.area} />
            {day.items.map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: 20 + (i * 22) % 60, left: 30 + (i * 40) % 120,
                width: 22, height: 22, borderRadius: '50% 50% 50% 0',
                transform: 'rotate(-45deg)', background: 'var(--terra)',
                border: '2px solid #fff',
              }} />
            ))}
          </div>
        )}

        {/* Timeline */}
        {day.items.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: 48 }}>
            <div style={{ position: 'absolute', left: 20, top: 20, bottom: 20, width: 1.5, background: 'var(--line-2)' }} />

            {day.items.map((item) => (
              <div key={item.id} style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ position: 'absolute', left: -48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 14 }}>
                  <p style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.t}</p>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: CAT_COLORS[item.cat]?.bg ?? 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={CAT_ICONS[item.cat] ?? 'map-pin'} size={14} color={CAT_COLORS[item.cat]?.fg ?? 'var(--ink-soft)'} />
                  </div>
                </div>

                <div className="card" style={{ padding: '12px var(--cardpad)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600 }}>{item.title}</p>
                    {item.who === userId && (
                      <button
                        onClick={() => run(() => api.removeItem(item.id))}
                        aria-label="Remove plan"
                        style={{ opacity: 0.45, padding: 2, flexShrink: 0 }}
                      >
                        <Icon name="x" size={13} color="var(--ink-soft)" />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    {item.place && (
                      <>
                        <Icon name="map-pin" size={11} color="var(--ink-faint)" />
                        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{item.place}</p>
                      </>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex' }}>
                      <Avatar userId={item.who} size="sm" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
                    <button
                      onClick={() => run(() => api.toggleLike(item.id, item.liked))}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ink-soft)' }}
                    >
                      <Icon name="heart" size={15} color={item.liked ? 'var(--terra)' : 'var(--ink-faint)'} fill={item.liked ? 'var(--terra)' : 'none'} />
                      {item.likes > 0 ? item.likes : ''}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--cardpad)', textAlign: 'center', color: 'var(--ink-faint)' }}>
            <div style={{ margin: '8px auto', display: 'flex', justifyContent: 'center' }}>
              <Icon name="calendar" size={28} color="var(--ink-faint)" />
            </div>
            <p style={{ fontSize: 14, marginTop: 8 }}>Nothing planned yet for Day {day.n}</p>
          </div>
        )}

        {/* Add to day */}
        <button
          className="btn ghost sm"
          style={{ width: '100%', marginTop: 12, gap: 6 }}
          onClick={() => setAddOpen(true)}
        >
          <Icon name="plus" size={14} color="var(--ink)" />
          Add a plan to Day {day.n}
        </button>

        <div style={{ height: 20 }} />
      </div>

      <AddItemSheet
        open={addOpen}
        dayN={day.n}
        onClose={() => setAddOpen(false)}
        onAdd={(input) => {
          setAddOpen(false);
          run(() => api.addItem(day.id, input));
        }}
      />
    </>
  );
}

function SetupDays({ onSetup }: { onSetup: (start: string, end: string) => void }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const valid = start && end && end >= start;

  return (
    <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
      <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ margin: '0 auto 10px', display: 'flex', justifyContent: 'center' }}>
          <Icon name="route" size={28} color="var(--terra)" />
        </div>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 19, marginBottom: 6 }}>Build your day-by-day plan</p>
        <p className="hdr-sub" style={{ marginBottom: 18 }}>
          Set the trip dates and Jaunt lays out a card for every day. (Tip: confirm dates with the crew in the Dates tab first.)
        </p>
        <div style={{ display: 'flex', gap: 10, textAlign: 'left' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>First day</label>
            <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Last day</label>
            <input className="input" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <button
          className="btn"
          disabled={!valid}
          style={{ width: '100%', marginTop: 18 }}
          onClick={() => onSetup(start, end)}
        >
          Create the days
        </button>
      </div>
    </div>
  );
}

function AddItemSheet({ open, dayN, onClose, onAdd }: {
  open: boolean; dayN: number; onClose: () => void;
  onAdd: (input: { time?: string; title: string; place?: string; cat: ItineraryItemCat }) => void;
}) {
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [cat, setCat] = useState<ItineraryItemCat>('activity');

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 20 }}>Add to Day {dayN}</h2>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>What&apos;s the plan?</label>
      <input className="input" placeholder="e.g. Sunset surf lesson" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1.6 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Where <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
          <input className="input" placeholder="e.g. Selong Belanak" value={place} onChange={(e) => setPlace(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Time</label>
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 8px' }}>Type</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {CATS.map((c) => (
          <button key={c.id} className={`chip${cat === c.id ? ' on' : ''}`} onClick={() => setCat(c.id)}>
            <Icon name={CAT_ICONS[c.id]} size={12} color={cat === c.id ? 'var(--surface)' : 'var(--ink-soft)'} />
            {c.label}
          </button>
        ))}
      </div>

      <button
        className="btn"
        disabled={!title.trim()}
        style={{ width: '100%', marginTop: 24 }}
        onClick={() => {
          onAdd({ time: time || undefined, title: title.trim(), place: place.trim() || undefined, cat });
          setTitle(''); setPlace(''); setTime(''); setCat('activity');
        }}
      >
        Add to the plan
      </button>
    </Sheet>
  );
}
