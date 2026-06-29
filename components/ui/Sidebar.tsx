'use client';
import type { CSSProperties } from 'react';
import { Wordmark } from './Wordmark';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import type { AppTab } from '@/types';

const NAV: { id: AppTab; icon: string; label: string }[] = [
  { id: 'home',     icon: 'home',      label: 'Trip' },
  { id: 'dates',    icon: 'calendar',  label: 'Dates' },
  { id: 'discover', icon: 'sparkles',  label: 'Discover' },
  { id: 'plan',     icon: 'route',     label: 'Plan' },
  { id: 'budget',   icon: 'wallet',    label: 'Budget' },
];

interface SidebarProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  groupName: string;
  onSwitchGroup: () => void;
}

export function Sidebar({ active, onChange, groupName, onSwitchGroup }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Wordmark />
      </div>

      <button className="sidebar-group-btn" onClick={onSwitchGroup}>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {groupName}
        </span>
        <Icon name="chevron-down" size={14} color="var(--ink-faint)" />
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV.map(({ id, icon, label }) => {
          const on = active === id;
          return (
            <button
              key={id}
              className={`sidebar-item${on ? ' active' : ''}`}
              onClick={() => onChange(id)}
            >
              <Icon
                name={icon}
                size={20}
                color={on ? 'var(--terra)' : 'var(--ink-soft)'}
                fill={on && id === 'discover' ? 'var(--terra)' : 'none'}
                strokeWidth={on ? 2.1 : 1.9}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
        <Avatar userId="j" size="sm" />
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Jamie</span>
      </div>
    </aside>
  );
}
