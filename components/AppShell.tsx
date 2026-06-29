'use client';
import { useState } from 'react';
import { TabBar } from './ui/TabBar';
import { LoginScreen } from './screens/LoginScreen';
import { GroupsScreen } from './screens/GroupsScreen';
import { SetupScreen } from './screens/SetupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { DatesScreen } from './screens/DatesScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { PlanScreen } from './screens/PlanScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { INIT_GROUPS } from '@/lib/data';
import type { AppStage, AppTab, Group } from '@/types';

export function AppShell() {
  const [stage, setStage] = useState<AppStage>('login');
  const [groups, setGroups] = useState<Group[]>(INIT_GROUPS);
  const [active, setActive] = useState<Group | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [saved, setSaved] = useState<string[]>(['a2']);
  const userId = 'j';

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const addToPlan = (id: string) =>
    setSaved((s) => (s.includes(id) ? s : [...s, id]));

  const openGroup = (g: Group) => {
    setActive(g);
    setStage(g.ready ? 'trip' : 'setup');
    setTab('home');
  };
  const createGroup = (g: Group) => {
    setGroups((gs) => [g, ...gs]);
    setActive(g);
    setStage('setup');
  };

  const activeGroup = active ?? groups[0];

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-2)' }}>
      {/* Mobile-width container */}
      <div className="app-frame">
        {stage === 'login' && (
          <LoginScreen onLogin={() => setStage('groups')} />
        )}

        {stage === 'groups' && (
          <GroupsScreen
            groups={groups}
            userId={userId}
            onOpen={openGroup}
            onCreate={createGroup}
            onSignOut={() => setStage('login')}
          />
        )}

        {stage === 'setup' && activeGroup && (
          <SetupScreen
            group={activeGroup}
            onBack={() => setStage('groups')}
          />
        )}

        {stage === 'trip' && (
          <>
            {tab === 'home' && (
              <HomeScreen
                groupName={activeGroup?.name ?? ''}
                onSwitch={() => setStage('groups')}
                go={setTab}
              />
            )}
            {tab === 'dates'    && <DatesScreen />}
            {tab === 'discover' && (
              <DiscoverScreen saved={saved} onSave={toggleSave} onAdd={addToPlan} />
            )}
            {tab === 'plan'   && <PlanScreen saved={saved} />}
            {tab === 'budget' && <BudgetScreen />}

            <TabBar active={tab} onChange={setTab} />
          </>
        )}
      </div>
    </div>
  );
}
