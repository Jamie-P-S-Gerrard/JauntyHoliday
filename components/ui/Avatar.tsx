'use client';
import type { CSSProperties } from 'react';
import { USER_INITIALS } from '@/lib/data';

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

export function Avatar({ userId, size = 'md', className = '', style }: AvatarProps) {
  const { px, fs, fw } = SIZE[size];
  const initial = USER_INITIALS[userId] ?? userId[0]?.toUpperCase() ?? '?';
  return (
    <div
      className={`av av-${userId} ${className}`}
      style={{ width: px, height: px, fontSize: fs, fontWeight: fw, ...style }}
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
