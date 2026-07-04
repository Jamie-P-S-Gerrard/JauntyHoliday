'use client';
import { useRef, useState } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/components/ui/Placeholder';
import type { AppTab, Group } from '@/types';

const STEPS: Array<{ id: string; label: string; sub: string; icon: string; tab: AppTab | null }> = [
  { id: 'dates',     label: 'Confirm the dates',   sub: 'Propose options and vote',      icon: 'calendar', tab: 'dates' },
  { id: 'invite',    label: 'Invite your crew',    sub: 'Share the code below',          icon: 'users',    tab: null },
  { id: 'discover',  label: 'Find places with AI', sub: 'Ask the trip assistant',        icon: 'sparkles', tab: 'discover' },
  { id: 'itinerary', label: 'Build the itinerary', sub: 'Plan it day by day',            icon: 'route',    tab: 'plan' },
];

interface SetupScreenProps {
  group: Group;
  onBack: () => void;
  onGo: (tab: AppTab) => void;
}

export function SetupScreen({ group, onBack, onGo }: SetupScreenProps) {
  const [copied, setCopied] = useState(false);
  const [codePulse, setCodePulse] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleStep = (step: (typeof STEPS)[number]) => {
    if (step.tab) {
      onGo(step.tab);
      return;
    }
    // Invite step — draw the eye to the code card below
    codeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setCodePulse(true);
    setTimeout(() => setCodePulse(false), 1400);
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
            {(group.dest || group.when) && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
                {[group.dest, group.when].filter(Boolean).join(' · ')}
              </p>
            )}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {STEPS.map((step) => (
            <button
              key={step.id}
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px var(--cardpad)', textAlign: 'left' }}
              onClick={() => handleStep(step)}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon name={step.icon} size={20} color="var(--ink-soft)" />
              </div>
              <div>
                <p style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)' }}>{step.label}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 1 }}>{step.sub}</p>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex' }}>
                <Icon name="chevron-right" size={16} color="var(--ink-faint)" />
              </div>
            </button>
          ))}
        </div>

        {/* Enter the trip */}
        <button className="btn" style={{ width: '100%', marginBottom: 24 }} onClick={() => onGo('home')}>
          Start planning
          <Icon name="chevron-right" size={16} color="#fff" />
        </button>

        {/* Invite code */}
        <p className="eyebrow" style={{ marginBottom: 12 }}>Invite code</p>
        <div
          ref={codeRef}
          className="card"
          style={{
            padding: 'var(--cardpad)', textAlign: 'center', marginBottom: 40,
            transition: 'box-shadow 0.3s, border-color 0.3s',
            ...(codePulse ? { borderColor: 'var(--terra)', boxShadow: '0 0 0 3px var(--terra-bg)' } : {}),
          }}
        >
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
