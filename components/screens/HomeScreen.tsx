'use client';
import { useState } from 'react';
import { AvatarStack, Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/components/ui/Placeholder';
import { TRIP, DAYS, FEED, USER_NAMES } from '@/lib/data';
import type { AppTab } from '@/types';

interface HomeScreenProps {
  groupName: string;
  dest?: string;
  when?: string;
  onSwitch: () => void;
  go: (tab: AppTab) => void;
}

const MILESTONES = [
  { id: 'dates',      label: 'Dates',      icon: 'calendar', done: true,  sub: 'Done' },
  { id: 'stay',       label: 'Stay',        icon: 'bed',      done: true,  sub: 'Done' },
  { id: 'flights',    label: 'Flights',     icon: 'plane',    done: true,  sub: 'Done' },
  { id: 'activities', label: 'Activities',  icon: 'waves',    done: false, sub: '6 saved' },
];

export function HomeScreen({ groupName, dest, when, onSwitch, go }: HomeScreenProps) {
  const [feed, setFeed] = useState(
    FEED.map((f) => ({ ...f, liked: false, likes: (f.react as number | undefined) ?? 0 }))
  );

  const firstDay = DAYS[0];

  const toggleLike = (id: string) => {
    setFeed((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, liked: !f.liked, likes: f.liked ? f.likes - 1 : f.likes + 1 }
          : f
      )
    );
  };

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '16px var(--pad) 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <button onClick={onSwitch} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <p className="hdr-overline" style={{ marginBottom: 0 }}>{groupName.toUpperCase()}</p>
            <Icon name="chevron-down" size={14} color="var(--terra)" />
          </button>
          <AvatarStack userIds={['c', 'j']} size="lg" />
        </div>
        {/* Groups with their own destination show it; the demo group keeps
            the sample Lombok header until real trip data is wired up */}
        {dest ? (
          <>
            <h1 className="hdr-title" style={{ marginTop: 4 }}>
              Next stop: <em>{dest}</em>
            </h1>
            <p className="hdr-sub">{when || 'Dates to be decided'} · sample plan below</p>
          </>
        ) : (
          <>
            <h1 className="hdr-title" style={{ marginTop: 4 }}>
              10 days in <em>{TRIP.place}</em>
            </h1>
            <p className="hdr-sub">{TRIP.dates.label}, {TRIP.dates.year} · {TRIP.dates.nights} nights</p>
          </>
        )}
      </div>

      <div className="scroll-area" style={{ padding: '16px var(--pad) 0' }}>
        {/* Hero image */}
        <div
          style={{
            position: 'relative', borderRadius: 'var(--radius)',
            overflow: 'hidden', height: 208, marginBottom: 'var(--gap)',
          }}
        >
          <Placeholder tint={TRIP.hero.tint} style={{ position: 'absolute', inset: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(20,14,8,0.55))' }} />
          <div style={{ position: 'absolute', top: 12, left: 12 }}>
            <span className="chip" style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 11.5 }}>
              <Icon name="map-pin" size={11} color="#fff" /> {TRIP.hero.label}
            </span>
          </div>
          <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Departing
              </p>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, color: '#fff' }}>
                {TRIP.dates.label}
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
              borderRadius: 14, padding: '10px 14px', textAlign: 'center',
            }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 30, fontWeight: 600, color: '#fff', lineHeight: 1 }}>
                {TRIP.countdown}
              </p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                days to go
              </p>
            </div>
          </div>
        </div>

        {/* Planning card */}
        <div className="card" style={{ padding: 'var(--cardpad)', marginBottom: 'var(--gap)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600 }}>Planning</span>
            <span className="chip olive" style={{ height: 24, fontSize: 11.5 }}>75% there</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {MILESTONES.map((m) => (
              <button
                key={m.id}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                onClick={() => go(m.id === 'activities' ? 'discover' : m.id === 'dates' ? 'dates' : 'plan')}
              >
                <div style={{ position: 'relative', width: 48, height: 48 }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: 14,
                    background: m.done ? 'var(--olive-bg)' : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={m.icon} size={22} color={m.done ? 'var(--olive)' : 'var(--ink-soft)'} />
                  </div>
                  {m.done && (
                    <div style={{
                      position: 'absolute', top: -4, right: -4, width: 18, height: 18,
                      borderRadius: '50%', background: 'var(--olive)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="check" size={10} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', textAlign: 'center' }}>{m.label}</p>
                <p style={{ fontSize: 10, color: m.done ? 'var(--olive-ink)' : 'var(--ink-soft)', marginTop: -4 }}>
                  {m.sub}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Up next */}
        <div style={{ marginBottom: 'var(--gap)' }}>
          <div className="sec-head">
            <div>
              <p className="eyebrow">First day</p>
              <p className="sec-title">Up next</p>
            </div>
            <button
              onClick={() => go('plan')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 600, color: 'var(--terra)' }}
            >
              Itinerary <Icon name="chevron-right" size={14} color="var(--terra)" />
            </button>
          </div>
          <button
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--cardpad)', width: '100%', textAlign: 'left' }}
            onClick={() => go('plan')}
          >
            <Placeholder tint={TRIP.hero.tint} style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0 }} label={firstDay.area} />
            <div style={{ flex: 1 }}>
              <p className="eyebrow">Day {firstDay.n} · {firstDay.date}</p>
              <p style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>{firstDay.title} in {firstDay.area}</p>
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                {firstDay.items.length} plans · check-in at Ashtari Villa
              </p>
            </div>
            <Icon name="chevron-right" size={16} color="var(--ink-faint)" />
          </button>
        </div>

        {/* Recent activity */}
        <div style={{ marginBottom: 40 }}>
          <div className="sec-head">
            <div>
              <p className="eyebrow">Together</p>
              <p className="sec-title">Recent activity</p>
            </div>
          </div>
          <div className="card" style={{ padding: '4px 0' }}>
            {feed.map((event, i) => (
              <div
                key={event.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px var(--cardpad)',
                  borderBottom: i < feed.length - 1 ? '1px solid var(--line-2)' : 'none',
                }}
              >
                <Avatar userId={event.who} size="sm" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                    <strong>{USER_NAMES[event.who] ?? event.who}</strong>{' '}
                    {event.action} <strong>{event.what}</strong>
                    {event.to && <> to {event.to}</>}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 3 }}>{event.when}</p>
                </div>
                {event.action === 'added' && (
                  <button
                    onClick={() => toggleLike(event.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: 4 }}
                  >
                    <Icon
                      name="heart"
                      size={16}
                      color={event.liked ? 'var(--terra)' : 'var(--ink-faint)'}
                      fill={event.liked ? 'var(--terra)' : 'none'}
                    />
                    {event.likes > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{event.likes}</span>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
