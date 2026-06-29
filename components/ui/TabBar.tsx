'use client';
import { Icon } from './Icon';
import type { AppTab } from '@/types';

const TABS: { id: AppTab; label: string; icon: string }[] = [
  { id: 'home',     label: 'Trip',     icon: 'home' },
  { id: 'dates',    label: 'Dates',    icon: 'calendar' },
  { id: 'discover', label: 'Discover', icon: 'sparkles' },
  { id: 'plan',     label: 'Plan',     icon: 'route' },
  { id: 'budget',   label: 'Budget',   icon: 'wallet' },
];

interface TabBarProps {
  active: AppTab;
  onChange: (tab: AppTab) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => {
        const on = active === tab.id;
        return (
          <button
            key={tab.id}
            className={`tab${on ? ' on' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <Icon
              name={tab.icon}
              size={23}
              color={on ? 'var(--terra)' : 'var(--ink-faint)'}
              fill={on && tab.icon === 'sparkles' ? 'var(--terra)' : 'none'}
              strokeWidth={on ? 2.1 : 1.9}
            />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
