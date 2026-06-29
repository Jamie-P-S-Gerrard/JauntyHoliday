'use client';
import { useState } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/components/ui/Placeholder';
import type { Group } from '@/types';

const STEPS = [
  { id: 'dates',     label: 'Confirm the dates',          icon: 'calendar' },
  { id: 'invite',    label: 'Invite your crew',            icon: 'users' },
  { id: 'discover',  label: 'Find places with AI',         icon: 'sparkles' },
  { id: 'itinerary', label: 'Build the itinerary',         icon: 'route' },
];

interface SetupScreenProps {
  group: Group;
  onBack: () => void;
}

export function SetupScreen({ group, onBack }: SetupScreenProps) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) => setDone((p) => ({ ...p, [id]: !p[id] }));

  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

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
      <div style={{ position: 'relative', margin: '16px var(--pad)', borderRadius: 'var(--radius)', overflow: 'hidden', height: 120 }}>
        <Placeholder tint={group.tint} style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
          <div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, color: '#fff' }}>{group.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <AvatarStack userIds={group.members} size="sm" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                You · {group.invited.length > 0 ? `${group.invited.length} pending` : 'just you so far'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
        {/* First steps */}
        <p className="eyebrow" style={{ marginBottom: 12 }}>First steps</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {STEPS.map((step) => (
            <button
              key={step.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px var(--cardpad)', textAlign: 'left' }}
              onClick={() => toggle(step.id)}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: done[step.id] ? 'var(--olive-bg)' : 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                position: 'relative',
              }}>
                <Icon name={step.icon} size={20} color={done[step.id] ? 'var(--olive)' : 'var(--ink-soft)'} />
                {done[step.id] && (
                  <div style={{
                    position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                    borderRadius: '50%', background: 'var(--olive)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name="check" size={10} color="#fff" strokeWidth={3} />
                  </div>
                )}
              </div>
              <span style={{ fontSize: 14.5, fontWeight: 500, color: done[step.id] ? 'var(--ink-soft)' : 'var(--ink)' }}>
                {step.label}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex' }}>
                <Icon name="chevron-right" size={16} color="var(--ink-faint)" />
              </div>
            </button>
          ))}
        </div>

        {/* Invite code */}
        <p className="eyebrow" style={{ marginBottom: 12 }}>Invite code</p>
        <div className="card" style={{ padding: 'var(--cardpad)', textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 600, letterSpacing: '0.15em', color: 'var(--ink)', marginBottom: 4 }}>
            {group.inviteCode}
          </p>
          <p className="hdr-sub" style={{ marginBottom: 16 }}>Share this code with your travel crew to join the group.</p>
          <button
            className="btn ghost sm"
            style={{ gap: 6 }}
            onClick={copyCode}
          >
            <Icon name="copy" size={14} color="var(--ink)" />
            {copied ? 'Copied!' : 'Copy code'}
          </button>
        </div>
      </div>
    </div>
  );
}
