'use client';
interface WordmarkProps {
  size?: number;
  color?: string;
}

export function Wordmark({ size = 22, color = 'var(--ink)' }: WordmarkProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--serif)',
        fontSize: size,
        fontWeight: 500,
        color,
        letterSpacing: '-0.01em',
      }}
    >
      Jaunt
    </span>
  );
}
