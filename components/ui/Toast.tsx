'use client';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';

// Tiny module-level toast bus: call toast('message') from anywhere;
// <Toaster /> (mounted once in AppShell) renders them.

type ToastKind = 'error' | 'info';
interface ToastMsg { id: number; text: string; kind: ToastKind }

let listeners: Array<(t: ToastMsg) => void> = [];
let nextId = 1;

export function toast(text: string, kind: ToastKind = 'error') {
  const t: ToastMsg = { id: nextId++, text, kind };
  listeners.forEach((fn) => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    const add = (t: ToastMsg) => {
      setToasts((prev) => [...prev.slice(-2), t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 4000);
    };
    listeners.push(add);
    return () => { listeners = listeners.filter((fn) => fn !== add); };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 92, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', flexDirection: 'column', gap: 8, zIndex: 90,
      width: 'calc(100% - 48px)', maxWidth: 380,
    }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className="fade-in"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--ink)', color: 'var(--surface)',
            borderRadius: 14, padding: '12px 16px',
            boxShadow: 'var(--tab-shadow)',
            fontSize: 13.5, lineHeight: 1.4,
          }}
        >
          <Icon
            name={t.kind === 'error' ? 'x' : 'check'}
            size={14}
            color={t.kind === 'error' ? '#e58f7d' : '#a3b574'}
            strokeWidth={2.5}
          />
          {t.text}
        </div>
      ))}
    </div>
  );
}
