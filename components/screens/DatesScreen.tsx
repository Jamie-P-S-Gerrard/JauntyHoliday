'use client';
import { useState } from 'react';
import { Avatar, AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { DATE_OPTIONS, USER_NAMES } from '@/lib/data';
import type { DateOption } from '@/types';

const GROUP_MEMBERS = ['c', 'j'];

export function DatesScreen() {
  const [options, setOptions] = useState(DATE_OPTIONS);
  const userId = 'j';

  const toggleVote = (id: string) => {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              votes: o.votes.includes(userId)
                ? o.votes.filter((v) => v !== userId)
                : [...o.votes, userId],
            }
          : o
      )
    );
  };

  const confirmed = options.find((o) => GROUP_MEMBERS.every((m) => o.votes.includes(m)));

  return (
    <div className="screen">
      <div className="screen-header" style={{ paddingBottom: 16 }}>
        <h1 className="hdr-title">
          When are <em>we</em> going?
        </h1>
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
              <p style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>Waiting on one more vote</p>
            </>
          )}
        </div>

        {/* Date option cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
          {options.map((opt) => (
            <DateOptionCard
              key={opt.id}
              option={opt}
              userId={userId}
              members={GROUP_MEMBERS}
              onToggle={() => toggleVote(opt.id)}
            />
          ))}
        </div>

        {/* Mini calendar */}
        <MiniCalendar options={options} confirmed={confirmed} />

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

function DateOptionCard({
  option, userId, members, onToggle,
}: {
  option: DateOption; userId: string; members: string[]; onToggle: () => void;
}) {
  const voted = option.votes.includes(userId);
  const allIn = members.every((m) => option.votes.includes(m));

  let footerLabel = 'No votes yet';
  if (allIn) footerLabel = 'Both in';
  else if (option.votes.length === 1) footerLabel = `${USER_NAMES[option.votes[0]] ?? option.votes[0]} is in`;

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
        {option.weather && (
          <span className="chip gold" style={{ fontSize: 11.5, flexShrink: 0 }}>
            <Icon name="sun" size={12} color="var(--gold)" /> {option.weather}
          </span>
        )}
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

const MONTH_DAYS = 31;
const FIRST_DOW = 3; // Oct 1 2026 = Thursday (0=Sun)

function MiniCalendar({ options, confirmed }: { options: DateOption[]; confirmed?: DateOption }) {
  const active = confirmed ?? options.find((o) => o.votes.length > 0) ?? options[0];
  // Oct 3–12 → days 3..12
  const [startDay, endDay] = [3, 12];

  const isInRange = (d: number) => d >= startDay && d <= endDay;
  const isEnd = (d: number) => d === startDay || d === endDay;

  const cells: (number | null)[] = Array(FIRST_DOW).fill(null);
  for (let d = 1; d <= MONTH_DAYS; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card" style={{ padding: 'var(--cardpad)', marginBottom: 'var(--gap)' }}>
      <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, marginBottom: 12 }}>October 2026</p>
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
