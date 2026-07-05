'use client';
import { toast } from '@/components/ui/Toast';
import { useCallback, useEffect, useState } from 'react';
import { AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { USER_NAMES } from '@/lib/data';
import { monthTitle } from '@/lib/dates';
import type { DateOption, DatesApi } from '@/types';

interface DatesScreenProps {
  tripId: string;
  userId: string;
  members: string[];
  api: DatesApi;
}

export function DatesScreen({ tripId, userId, members, api }: DatesScreenProps) {
  const [options, setOptions] = useState<DateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setOptions(await api.list(tripId));
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

  const confirmed = members.length > 0
    ? options.find((o) => members.every((m) => o.votes.includes(m)))
    : undefined;

  return (
    <div className="screen">
      <div className="screen-header" style={{ paddingBottom: 16, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="hdr-title">
          When are <em>we</em> going?
        </h1>
        <button className="btn sm" onClick={() => setProposeOpen(true)}>
          <Icon name="plus" size={14} color="#fff" /> Propose
        </button>
      </div>

      <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
        {/* Status banner */}
        <div
          className="card"
          style={{
            padding: '12px var(--cardpad)',
            marginBottom: 'var(--gap)',
            background: confirmed ? 'var(--olive-bg)' : 'var(--surface)',
            border: confirmed ? '1.5px solid var(--olive)' : '1px solid var(--line-2)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          {confirmed ? (
            <>
              <Icon name="check" size={16} color="var(--olive)" strokeWidth={2.5} />
              <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--olive-ink)' }}>
                Dates confirmed · {confirmed.range}
              </p>
            </>
          ) : (
            <>
              <Icon name="clock" size={16} color="var(--ink-faint)" />
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
                {options.length === 0
                  ? 'No options yet — propose some dates!'
                  : 'Everyone votes — when the whole crew is in, dates lock.'}
              </p>
            </>
          )}
        </div>

        {/* Date option cards */}
        {loading ? (
          <p className="hdr-sub" style={{ textAlign: 'center', padding: 24 }}>Loading…</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
            {options.map((opt) => (
              <DateOptionCard
                key={opt.id}
                option={opt}
                userId={userId}
                members={members}
                onToggle={() => run(() => (opt.votes.includes(userId) ? api.unvote(opt.id) : api.vote(opt.id)))}
                onRemove={opt.proposedBy === userId ? () => run(() => api.remove(opt.id)) : undefined}
              />
            ))}
          </div>
        )}

        {/* Mini calendar for the leading option */}
        <MiniCalendar options={options} confirmed={confirmed} />

        <div style={{ height: 40 }} />
      </div>

      <ProposeSheet
        open={proposeOpen}
        onClose={() => setProposeOpen(false)}
        onPropose={(start, end, note) => {
          setProposeOpen(false);
          run(() => api.propose(tripId, { start, end, note }));
        }}
      />
    </div>
  );
}

function DateOptionCard({
  option, userId, members, onToggle, onRemove,
}: {
  option: DateOption; userId: string; members: string[];
  onToggle: () => void; onRemove?: () => void;
}) {
  const voted = option.votes.includes(userId);
  const allIn = members.length > 0 && members.every((m) => option.votes.includes(m));

  let footerLabel = 'No votes yet';
  if (allIn) footerLabel = members.length === 2 ? 'Both in' : 'Everyone is in';
  else if (option.votes.length > 0) {
    const names = option.votes.map((v) => USER_NAMES[v] ?? 'Someone');
    footerLabel = names.length === 1 ? `${names[0]} is in` : `${names.length} of ${members.length} in`;
  }

  return (
    <div
      className="card"
      style={{
        border: allIn ? '1.5px solid var(--olive)' : '1px solid var(--line-2)',
        padding: 'var(--cardpad)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            {option.range}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{option.sub}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {option.weather && (
            <span className="chip gold" style={{ fontSize: 11.5 }}>
              <Icon name="sun" size={12} color="var(--gold)" /> {option.weather}
            </span>
          )}
          {onRemove && (
            <button onClick={onRemove} aria-label="Remove option" style={{ opacity: 0.5, padding: 4 }}>
              <Icon name="x" size={14} color="var(--ink-soft)" />
            </button>
          )}
        </div>
      </div>

      {option.note && (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, lineHeight: 1.5 }}>{option.note}</p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {option.votes.length > 0 && <AvatarStack userIds={option.votes} size="sm" />}
          <span style={{ fontSize: 12.5, color: allIn ? 'var(--olive-ink)' : 'var(--ink-soft)', fontWeight: allIn ? 600 : 400 }}>
            {footerLabel}
          </span>
        </div>
        <button
          onClick={onToggle}
          className={`btn sm${voted ? ' olive' : ''}`}
          style={{ minWidth: 72 }}
        >
          {voted ? (
            <><Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> I&apos;m in</>
          ) : (
            "I'm in"
          )}
        </button>
      </div>
    </div>
  );
}

function ProposeSheet({ open, onClose, onPropose }: {
  open: boolean; onClose: () => void;
  onPropose: (start: string, end: string, note?: string) => void;
}) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');

  const valid = start && end && end >= start;

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 20 }}>Propose dates</h2>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>From</label>
          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>To</label>
          <input className="input" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '16px 0 6px' }}>Why these dates? <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
      <input
        className="input"
        placeholder="e.g. school holidays, cheap flights"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button
        className="btn"
        disabled={!valid}
        style={{ width: '100%', marginTop: 24 }}
        onClick={() => {
          onPropose(start, end, note.trim() || undefined);
          setStart(''); setEnd(''); setNote('');
        }}
      >
        Propose to the group
      </button>
    </Sheet>
  );
}

function MiniCalendar({ options, confirmed }: { options: DateOption[]; confirmed?: DateOption }) {
  const active = confirmed
    ?? [...options].sort((a, b) => b.votes.length - a.votes.length)[0];
  if (!active?.startDate || !active?.endDate) return null;

  const start = new Date(`${active.startDate}T00:00:00`);
  const end = new Date(`${active.endDate}T00:00:00`);
  const year = start.getFullYear();
  const month = start.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const inMonth = (d: Date) => d.getFullYear() === year && d.getMonth() === month;
  const startDay = start.getDate();
  const endDay = inMonth(end) ? end.getDate() : daysInMonth;

  const isInRange = (d: number) => d >= startDay && d <= endDay;
  const isEnd = (d: number) => d === startDay || (inMonth(end) && d === end.getDate());

  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card" style={{ padding: 'var(--cardpad)', marginBottom: 'var(--gap)' }}>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
        {monthTitle(active.startDate)}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <p key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', paddingBottom: 4 }}>{d}</p>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const inRange = isInRange(day);
          const endpoint = isEnd(day);
          return (
            <div
              key={i}
              style={{
                height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: endpoint ? '50%' : inRange ? '0' : '50%',
                background: endpoint
                  ? (confirmed ? 'var(--olive)' : 'var(--terra)')
                  : inRange
                  ? (confirmed ? 'var(--olive-bg)' : 'var(--terra-bg)')
                  : 'transparent',
                color: endpoint ? '#fff' : inRange ? (confirmed ? 'var(--olive-ink)' : 'var(--terra-ink)') : 'var(--ink)',
                fontSize: 13,
                fontWeight: endpoint ? 700 : 400,
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
