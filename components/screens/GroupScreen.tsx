'use client';
import { useState } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Placeholder } from '@/components/ui/Placeholder';
import { GroupEvents } from './GroupEvents';
import { HistorySheet } from '@/components/ui/HistorySheet';
import { INTEREST_OPTIONS } from '@/lib/data';
import type { ChatApi, EventsApi, Group, GroupPrefs, HistoryApi, TripSummary, TripStatus } from '@/types';

const VIBES: Array<{ id: NonNullable<GroupPrefs['vibe']>; label: string }> = [
  { id: 'cozy',      label: 'Cozy getaway' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'romantic',  label: 'Romantic' },
  { id: 'city',      label: 'City break' },
  { id: 'beach',     label: 'Beach & islands' },
];
const PACES: Array<{ id: NonNullable<GroupPrefs['pace']>; label: string }> = [
  { id: 'chill',    label: 'Chill' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'packed',   label: 'Packed days' },
];
const BUDGETS: Array<{ id: NonNullable<GroupPrefs['budget']>; label: string }> = [
  { id: 'shoestring',  label: 'Shoestring' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'treat',       label: 'Treat ourselves' },
];

const TRIP_TINTS = ['#caa37a', '#7fa0c0', '#9aa56a', '#b07a9a', '#c77f6a', '#7fa39a'];

interface GroupScreenProps {
  group: Group;
  userId: string;
  eventsApi: EventsApi;
  chatApi: ChatApi;
  historyApi: HistoryApi;
  onBack: () => void;
  onOpenTrip: (t: TripSummary) => void;
  onCreateTrip: (t: TripSummary) => void;
  onUpdatePrefs: (p: GroupPrefs) => void;
}

export function GroupScreen({ group, userId, eventsApi, chatApi, historyApi, onBack, onOpenTrip, onCreateTrip, onUpdatePrefs }: GroupScreenProps) {
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const prefsSummary = [
    VIBES.find((v) => v.id === group.prefs.vibe)?.label,
    PACES.find((p) => p.id === group.prefs.pace)?.label,
    BUDGETS.find((b) => b.id === group.prefs.budget)?.label,
    ...group.prefs.interests,
  ].filter(Boolean) as string[];

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '16px var(--pad) 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={onBack} style={{ color: 'var(--terra)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, fontWeight: 600 }}>
          <Icon name="arrow-left" size={16} color="var(--terra)" /> Groups
        </button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Wordmark size={18} />
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Banner */}
      <div style={{ position: 'relative', margin: '16px var(--pad)', borderRadius: 'var(--radius)', overflow: 'hidden', height: 110 }}>
        <Placeholder tint={group.tint} style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, color: '#fff' }}>{group.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <AvatarStack userIds={group.members} size="sm" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
          <button className="chip" style={{ background: 'rgba(255,255,255,0.9)', marginRight: 6 }} onClick={() => setHistoryOpen(true)}>
            <Icon name="history" size={12} color="var(--ink)" />
            Activity
          </button>
          <button className="chip" style={{ background: 'rgba(255,255,255,0.9)' }} onClick={copyCode}>
            <Icon name="copy" size={12} color="var(--ink)" />
            {copied ? 'Copied!' : group.inviteCode}
          </button>
        </div>
      </div>

      <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
        {/* Trips */}
        <div className="sec-head">
          <p className="eyebrow">Trips</p>
          <button className="btn sm" onClick={() => setNewTripOpen(true)}>
            <Icon name="plus" size={14} color="#fff" /> New trip
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {group.trips.length === 0 && (
            <div className="card" style={{ padding: 'var(--cardpad)', textAlign: 'center' }}>
              <p className="hdr-sub">No trips yet — dream one up!</p>
            </div>
          )}
          {group.trips.map((t) => (
            <button
              key={t.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px var(--cardpad)', textAlign: 'left' }}
              onClick={() => onOpenTrip(t)}
            >
              <Placeholder tint={t.tint} style={{ width: 52, height: 52, borderRadius: 14 }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 600 }}>{t.dest || 'Destination TBC'}</p>
                <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 1 }}>{t.when || 'Dates open'}</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`chip ${t.status === 'Active' ? 'olive' : t.status === 'Planning' ? 'terra' : 'gold'}`} style={{ height: 24, fontSize: 11 }}>
                  {t.status}
                </span>
                <Icon name="chevron-right" size={16} color="var(--ink-faint)" />
              </div>
            </button>
          ))}
        </div>

        {/* Events — quick single-date outings */}
        <GroupEvents groupId={group.id} userId={userId} api={eventsApi} chatApi={chatApi} />

        {/* Preferences */}
        <div className="sec-head">
          <p className="eyebrow">Travel preferences</p>
          <button className="btn ghost sm" onClick={() => setPrefsOpen(true)}>Edit</button>
        </div>
        <div className="card" style={{ padding: 'var(--cardpad)', marginBottom: 40 }}>
          {prefsSummary.length === 0 ? (
            <p className="hdr-sub">Tell Jaunt how this crew likes to travel — the AI uses it to make better suggestions.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {prefsSummary.map((s) => (
                  <span key={s} className="chip" style={{ height: 26, fontSize: 12 }}>{s}</span>
                ))}
              </div>
              {group.prefs.notes && (
                <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.45 }}>
                  “{group.prefs.notes}”
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <HistorySheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        groupId={group.id}
        api={historyApi}
      />

      <NewTripSheet
        open={newTripOpen}
        onClose={() => setNewTripOpen(false)}
        nextTint={TRIP_TINTS[group.trips.length % TRIP_TINTS.length]}
        onCreate={(t) => { setNewTripOpen(false); onCreateTrip(t); }}
      />
      <PrefsSheet
        open={prefsOpen}
        prefs={group.prefs}
        onClose={() => setPrefsOpen(false)}
        onSave={(p) => { setPrefsOpen(false); onUpdatePrefs(p); }}
      />
    </div>
  );
}

function NewTripSheet({ open, onClose, onCreate, nextTint }: {
  open: boolean; onClose: () => void; onCreate: (t: TripSummary) => void; nextTint: string;
}) {
  const [dest, setDest] = useState('');
  const [when, setWhen] = useState('');

  const create = () => {
    const t: TripSummary = {
      id: `t${Date.now()}`,
      dest: dest.trim(),
      when: when.trim(),
      status: 'Idea' as TripStatus,
      tint: nextTint,
      ready: false,
    };
    onCreate(t);
    setDest(''); setWhen('');
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 20 }}>New trip</h2>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Where to? <span style={{ color: 'var(--ink-faint)' }}>(leave blank to decide together)</span></label>
      <input className="input" placeholder="e.g. Lombok, Indonesia" value={dest} onChange={(e) => setDest(e.target.value)} />
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '16px 0 6px' }}>Roughly when?</label>
      <input className="input" placeholder="e.g. Oct 2026" value={when} onChange={(e) => setWhen(e.target.value)} />
      <button className="btn" style={{ width: '100%', marginTop: 24 }} onClick={create}>
        Create trip
      </button>
    </Sheet>
  );
}

function PrefsSheet({ open, prefs, onClose, onSave }: {
  open: boolean; prefs: GroupPrefs; onClose: () => void; onSave: (p: GroupPrefs) => void;
}) {
  const [vibe, setVibe] = useState(prefs.vibe);
  const [pace, setPace] = useState(prefs.pace);
  const [budget, setBudget] = useState(prefs.budget);
  const [interests, setInterests] = useState<string[]>(prefs.interests);
  const [notes, setNotes] = useState(prefs.notes ?? '');

  const toggleInterest = (i: string) =>
    setInterests((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 4 }}>Travel preferences</h2>
      <p className="hdr-sub" style={{ marginBottom: 18 }}>Shared by the whole group — the AI assistant uses these to tailor suggestions.</p>

      <ChipGroup label="What's the vibe?" options={VIBES} value={vibe} onChange={setVibe} />
      <ChipGroup label="Pace" options={PACES} value={pace} onChange={setPace} />
      <ChipGroup label="Budget" options={BUDGETS} value={budget} onChange={setBudget} />

      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '14px 0 8px' }}>Into</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {INTEREST_OPTIONS.map((i) => (
          <button key={i} className={`chip${interests.includes(i) ? ' on' : ''}`} onClick={() => toggleInterest(i)}>
            {i}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '14px 0 8px' }}>Anything else the AI should know?</p>
      <input
        className="input"
        placeholder="e.g. travelling with a toddler, calm over crowds"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <button
        className="btn"
        style={{ width: '100%', marginTop: 24 }}
        onClick={() => onSave({ vibe, pace, budget, interests, notes: notes.trim() || undefined })}
      >
        Save preferences
      </button>
    </Sheet>
  );
}

function ChipGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: Array<{ id: T; label: string }>;
  value: T | undefined;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '14px 0 8px' }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => (
          <button
            key={o.id}
            className={`chip${value === o.id ? ' on' : ''}`}
            onClick={() => onChange(value === o.id ? undefined : o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </>
  );
}
