'use client';
import type { CSSProperties } from 'react';
import { USER_AVATARS, USER_INITIALS } from '@/lib/data';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE: Record<AvatarSize, { px: number; fs: number; fw: number }> = {
  sm: { px: 22, fs: 9,  fw: 800 },
  md: { px: 30, fs: 12, fw: 800 },
  lg: { px: 40, fs: 15, fw: 800 },
};

interface AvatarProps {
  userId: string;
  size?: AvatarSize;
  className?: string;
  style?: CSSProperties;
}

// Demo user ids with dedicated .av-* CSS gradients; real users (UUIDs) get a
// deterministic gradient from the palette below instead.
const KNOWN_AV = new Set(['c', 'j', 'm', 'r', 'f', 's', 'ai']);
const AV_PALETTE = [
  ['#d2764d', '#b14e2a'], ['#8b9a5f', '#5f7038'], ['#cf8d6b', '#a45c3c'],
  ['#6f93a8', '#496d84'], ['#cdab63', '#a9823c'], ['#a08bb2', '#7a6391'],
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = AV_PALETTE[h % AV_PALETTE.length];
  return `linear-gradient(150deg, ${a}, ${b})`;
}

export function Avatar({ userId, size = 'md', className = '', style }: AvatarProps) {
  const { px, fs, fw } = SIZE[size];
  const initial = USER_INITIALS[userId] ?? userId[0]?.toUpperCase() ?? '?';
  const known = KNOWN_AV.has(userId);
  const photo = USER_AVATARS[userId];

  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are dynamic (signed/object URLs)
      <img
        src={photo}
        alt={initial}
        className={`av ${className}`}
        style={{ width: px, height: px, objectFit: 'cover', ...style }}
      />
    );
  }

  return (
    <div
      className={`av${known ? ` av-${userId}` : ''} ${className}`}
      style={{
        width: px, height: px, fontSize: fs, fontWeight: fw,
        ...(known ? {} : { background: hashColor(userId) }),
        ...style,
      }}
    >
      {initial}
    </div>
  );
}

interface AvatarStackProps {
  userIds: string[];
  size?: AvatarSize;
  max?: number;
}

export function AvatarStack({ userIds, size = 'sm', max = 5 }: AvatarStackProps) {
  const shown = userIds.slice(0, max);
  const overlap = size === 'sm' ? -6 : -9;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((id, i) => (
        <Avatar
          key={id}
          userId={id}
          size={size}
          className=""
          style={{ marginLeft: i === 0 ? 0 : overlap }}
        />
      ))}
    </div>
  );
}
