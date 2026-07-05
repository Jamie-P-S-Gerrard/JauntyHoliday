'use client';
import { toast } from '@/components/ui/Toast';
import { useCallback, useEffect, useState } from 'react';
import { AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Placeholder } from '@/components/ui/Placeholder';
import type { AppTab, Day, ItineraryApi, Stay, StaysApi, StayStatus } from '@/types';

const STATUS_META: Record<StayStatus, { label: string; cls: string }> = {
  todo:    { label: 'Idea',    cls: 'gold' },
  pending: { label: 'Pending', cls: 'terra' },
  booked:  { label: 'Booked',  cls: 'olive' },
};
const NEXT_STATUS: Record<StayStatus, StayStatus> = {
  todo: 'pending', pending: 'booked', booked: 'todo',
};

interface RealTripHomeProps {
  groupName: string;
  dest: string;
  when?: string;
  tint: string;
  members: string[];
  tripId: string;
  groupId: string;
  userId: string;
  staysApi: StaysApi;
  itinApi: ItineraryApi;
  onSwitch: () => void;
  go: (tab: AppTab) => void;
}

export function RealTripHome({
  groupName, dest, when, tint, members, tripId, groupId, userId,
  staysApi, itinApi, onSwitch, go,
}: RealTripHomeProps) {
  const [stays, setStays] = useState<Stay[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [addStayOpen, setAddStayOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [s, d] = await Promise.all([staysApi.list(tripId), itinApi.listDays(tripId)]);
      setStays(s);
      setDays(d);
    } catch (e) {
      console.error(e);
    }
  }, [staysApi, itinApi, tripId]);

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

  const upNext = days.find((d) => d.items.length > 0) ?? days[0];

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '16px var(--pad) 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <button onClick={onSwitch} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <p className="hdr-overline" style={{ marginBottom: 0 }}>{groupName.toUpperCase()}</p>
            <Icon name="chevron-down" size={14} color="var(--terra)" />
          </button>
          <AvatarStack userIds={members} size="lg" />
        </div>
        <h1 className="hdr-title" style={{ marginTop: 4 }}>
          Next stop: <em>{dest}</em>
        </h1>
        <p className="hdr-sub">{when || 'Dates to be decided'}</p>
      </div>

      <div className="scroll-area" style={{ padding: '16px var(--pad) 0' }}>
        {/* Hero */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', height: 150, marginBottom: 'var(--gap)' }}>
          <Placeholder tint={tint} style={{ position: 'absolute', inset: 0 }} label={dest} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, rgba(20,14,8,0.5))' }} />
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {([
            { icon: 'calendar', label: 'Vote on dates', tab: 'dates' as AppTab },
            { icon: 'sparkles', label: 'Ask the AI',    tab: 'discover' as AppTab },
            { icon: 'route',    label: 'Daily plan',    tab: 'plan' as AppTab },
          ]).map((a) => (
            <button key={a.tab} className="card" style={{ padding: '14px 10px', textAlign: 'center' }} onClick={() => go(a.tab)}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <Icon name={a.icon} size={18} color="var(--terra)" />
              </div>
              <p style={{ fontSize: 12, fontWeight: 600 }}>{a.label}</p>
            </button>
          ))}
        </div>

        {/* Stays */}
        <div className="sec-head">
          <p className="eyebrow">Where we&apos;re staying</p>
          <button className="btn sm" onClick={() => setAddStayOpen(true)}>
            <Icon name="plus" size={14} color="#fff" /> Add stay
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {stays.length === 0 && (
            <div className="card" style={{ padding: 'var(--cardpad)', textAlign: 'center' }}>
              <p className="hdr-sub">Shortlist accommodation ideas, then tap the status to move them from idea → pending → booked.</p>
            </div>
          )}
          {stays.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px var(--cardpad)' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'var(--olive-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="bed" size={17} color="var(--olive)" />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 1 }}>
                  {[s.area, s.cost ? `$${s.cost}` : null].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  className={`chip ${STATUS_META[s.status].cls}`}
                  style={{ height: 26, fontSize: 11.5 }}
                  onClick={() => run(() => staysApi.setStatus(s.id, NEXT_STATUS[s.status]))}
                  title="Tap to change status"
                >
                  {STATUS_META[s.status].label}
                </button>
                {s.who === userId && (
                  <button onClick={() => run(() => staysApi.remove(s.id))} aria-label="Remove stay" style={{ opacity: 0.45, padding: 2 }}>
                    <Icon name="x" size={13} color="var(--ink-soft)" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Up next */}
        <div className="sec-head">
          <p className="eyebrow">{days.length > 0 ? 'Up next' : 'The plan'}</p>
        </div>
        {upNext ? (
          <button className="card" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px var(--cardpad)', textAlign: 'left', marginBottom: 24 }} onClick={() => go('plan')}>
            <Placeholder tint={tint} style={{ width: 48, height: 48, borderRadius: 12 }} label={`Day ${upNext.n}`} />
            <div>
              <p style={{ fontSize: 14.5, fontWeight: 600 }}>Day {upNext.n}{upNext.date ? ` · ${upNext.date}` : ''}</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                {upNext.items.length > 0 ? `${upNext.items.length} ${upNext.items.length === 1 ? 'plan' : 'plans'} — ${upNext.items[0].title}` : 'Nothing planned yet'}
              </p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <Icon name="chevron-right" size={16} color="var(--ink-faint)" />
            </div>
          </button>
        ) : (
          <button className="card" style={{ width: '100%', padding: 'var(--cardpad)', textAlign: 'center', marginBottom: 24 }} onClick={() => go('plan')}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>Build the day-by-day plan</p>
            <p className="hdr-sub">Set your dates and start filling the days.</p>
          </button>
        )}

        <div style={{ height: 90 }} />
      </div>

      <AddStaySheet
        open={addStayOpen}
        onClose={() => setAddStayOpen(false)}
        onAdd={(input) => {
          setAddStayOpen(false);
          run(() => staysApi.add(tripId, groupId, input));
        }}
      />
    </div>
  );
}

function AddStaySheet({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (input: { title: string; area?: string; cost?: number; status: StayStatus }) => void;
}) {
  const [title, setTitle] = useState('');
  const [area, setArea] = useState('');
  const [cost, setCost] = useState('');
  const [status, setStatus] = useState<StayStatus>('todo');

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 20 }}>Add a stay</h2>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Name</label>
      <input className="input" placeholder="e.g. Ashtari Hillside Villa" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1.6 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Area / notes</label>
          <input className="input" placeholder="e.g. Kuta · ocean view" value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Cost ($)</label>
          <input className="input" type="number" placeholder="940" value={cost} onChange={(e) => setCost(e.target.value)} />
        </div>
      </div>

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 8px' }}>Status</label>
      <div style={{ display: 'flex', gap: 6 }}>
        {(Object.keys(STATUS_META) as StayStatus[]).map((st) => (
          <button key={st} className={`chip${status === st ? ' on' : ''}`} onClick={() => setStatus(st)}>
            {STATUS_META[st].label}
          </button>
        ))}
      </div>

      <button
        className="btn"
        disabled={!title.trim()}
        style={{ width: '100%', marginTop: 24 }}
        onClick={() => {
          onAdd({
            title: title.trim(),
            area: area.trim() || undefined,
            cost: cost ? Number(cost) : undefined,
            status,
          });
          setTitle(''); setArea(''); setCost(''); setStatus('todo');
        }}
      >
        Add stay
      </button>
    </Sheet>
  );
}
