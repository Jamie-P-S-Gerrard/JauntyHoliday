'use client';
import { useState } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { Sheet } from '@/components/ui/Sheet';
import { Placeholder } from '@/components/ui/Placeholder';
import { Icon } from '@/components/ui/Icon';
import { USER_NAMES } from '@/lib/data';
import type { Group, TripStatus } from '@/types';

interface GroupsScreenProps {
  groups: Group[];
  userId: string;
  userName?: string;
  onOpen: (g: Group) => void;
  onCreate: (g: Group) => void;
  onJoin: (code: string) => Promise<string | null>;
  onSignOut: () => void;
}

export function GroupsScreen({ groups, userId, userName, onOpen, onCreate, onJoin, onSignOut }: GroupsScreenProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="screen">
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px var(--pad)', flexShrink: 0 }}>
        <Wordmark size={22} />
        <button onClick={onSignOut}>
          <Avatar userId={userId} size="lg" />
        </button>
      </div>

      {/* Greeting */}
      <div style={{ padding: '4px var(--pad) 20px' }}>
        <h1 className="hdr-title" style={{ fontSize: 28 }}>
          Hi {userName ?? USER_NAMES[userId] ?? userId} —{' '}
          <em>where to next?</em>
        </h1>
      </div>

      {/* Actions */}
      <div style={{ padding: '0 var(--pad)', display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="btn" style={{ flex: 1 }} onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={18} color="#fff" />
          New group
        </button>
        <button className="btn ghost" onClick={() => setJoinOpen(true)}>
          Join with code
        </button>
      </div>

      {/* Group list */}
      <div className="scroll-area" style={{ padding: '0 var(--pad)', paddingBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Your groups</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} onOpen={() => onOpen(g)} />
          ))}
        </div>
      </div>

      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} onCreate={(g) => { setCreateOpen(false); onCreate(g); }} />
      <JoinSheet open={joinOpen} onClose={() => setJoinOpen(false)} onJoin={onJoin} />
    </div>
  );
}

function GroupCard({ group, onOpen }: { group: Group; onOpen: () => void }) {
  const memberNames = group.members.length <= 2
    ? group.members.map((id) => USER_NAMES[id] ?? id).join(' & ')
    : `${group.members.length} members`;

  const nextTrip = group.trips[0];
  const tripLine = nextTrip
    ? [nextTrip.dest || 'Destination TBC', nextTrip.when].filter(Boolean).join(' · ')
      + (group.trips.length > 1 ? `  ·  +${group.trips.length - 1} more` : '')
    : 'No trips yet';

  return (
    <button className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={onOpen}>
      {/* Image header */}
      <div style={{ position: 'relative', height: 94, overflow: 'hidden' }}>
        <Placeholder tint={group.tint} style={{ position: 'absolute', inset: 0 }} label={nextTrip?.dest ?? ''} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, rgba(20,14,8,0.65))',
        }} />
        {/* Status chip */}
        {nextTrip && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <StatusChip status={nextTrip.status} />
          </div>
        )}
        {/* Group name */}
        <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, color: '#fff', lineHeight: 1.2 }}>
            {group.name}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
            {tripLine}
          </p>
        </div>
      </div>
      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px var(--cardpad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AvatarStack userIds={group.members} size="sm" />
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{memberNames}</span>
        </div>
        <Icon name="chevron-right" size={16} color="var(--ink-faint)" />
      </div>
    </button>
  );
}

function StatusChip({ status }: { status: TripStatus }) {
  if (status === 'Active') {
    return (
      <span className="chip" style={{ background: 'var(--olive)', color: '#fff', fontSize: 11.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
        Active
      </span>
    );
  }
  return (
    <span className="chip" style={{ background: 'rgba(255,255,255,0.9)', color: 'var(--ink)', fontSize: 11.5 }}>
      {status}
    </span>
  );
}

function CreateSheet({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (g: Group) => void }) {
  const [name, setName] = useState('');
  const [dest, setDest] = useState('');
  const [when, setWhen] = useState('');
  const [email, setEmail] = useState('');
  const [invited, setInvited] = useState<string[]>([]);

  const addEmail = () => {
    if (!email.trim() || !email.includes('@')) return;
    setInvited((p) => [...p, email.trim()]);
    setEmail('');
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const firstTrip = (dest.trim() || when.trim())
      ? [{
          id: `t${Date.now()}`, dest: dest.trim(), when: when.trim(),
          status: 'Idea' as TripStatus, tint: '#9aa56a', ready: false,
        }]
      : [];
    const g: Group = {
      id: `g${Date.now()}`, name: name.trim(),
      members: ['j'], invited, inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      tint: '#9aa56a', trips: firstTrip, prefs: { interests: [] },
    };
    onCreate(g);
    setName(''); setDest(''); setWhen(''); setEmail(''); setInvited([]);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 20 }}>New trip group</h2>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Group name</label>
      <input
        className="input"
        placeholder="e.g. Bali 2026 or The Crew"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '16px 0 6px' }}>Where to? <span style={{ color: 'var(--ink-faint)' }}>(you can decide later)</span></label>
      <input
        className="input"
        placeholder="e.g. Lombok, Indonesia"
        value={dest}
        onChange={(e) => setDest(e.target.value)}
      />
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '16px 0 6px' }}>Roughly when?</label>
      <input
        className="input"
        placeholder="e.g. Oct 2026"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
      />
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '16px 0 6px' }}>Invite by email</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          placeholder="friend@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addEmail()}
          style={{ flex: 1 }}
        />
        <button className="btn sm" onClick={addEmail}>+</button>
      </div>
      {invited.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {invited.map((em) => (
            <span key={em} className="chip">
              {em}
              <button onClick={() => setInvited((p) => p.filter((x) => x !== em))} style={{ marginLeft: 4, opacity: 0.6 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <button
        className="btn"
        disabled={!name.trim()}
        style={{ width: '100%', marginTop: 24 }}
        onClick={handleCreate}
      >
        {invited.length > 0 ? `Create group & invite ${invited.length}` : 'Create group'}
      </button>
    </Sheet>
  );
}

function JoinSheet({ open, onClose, onJoin }: {
  open: boolean; onClose: () => void; onJoin: (code: string) => Promise<string | null>;
}) {
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setJoining(true);
    setError(null);
    const err = await onJoin(code);
    setJoining(false);
    if (err) {
      setError(err);
    } else {
      setCode('');
      onClose();
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 8 }}>Join a group</h2>
      <p className="hdr-sub" style={{ marginBottom: 20 }}>Ask your group host for the 6-character invite code.</p>
      <input
        className="input"
        placeholder="ABC123"
        value={code}
        maxLength={6}
        onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
        style={{ fontFamily: 'var(--serif)', fontSize: 28, textAlign: 'center', letterSpacing: '0.3em' }}
      />
      {error && (
        <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--terra)', marginTop: 10 }}>{error}</p>
      )}
      <button
        className="btn"
        disabled={code.length < 6 || joining}
        style={{ width: '100%', marginTop: 20 }}
        onClick={join}
      >
        {joining ? 'Joining…' : 'Join group'}
      </button>
    </Sheet>
  );
}
