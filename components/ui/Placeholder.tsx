'use client';
interface PlaceholderProps {
  tint: string;
  label?: string;
  height?: number | string;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function Placeholder({ tint, label, height, className = '', children, style }: PlaceholderProps) {
  return (
    <div
      className={`ph ${className}`}
      style={{ background: tint, height, ...style }}
    >
      {label && <span className="ph-label">{label}</span>}
      {children}
    </div>
  );
}
