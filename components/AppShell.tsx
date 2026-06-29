'use client';
import { useState } from 'react';
import { TabBar } from './ui/TabBar';
import { Sidebar } from './ui/Sidebar';
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

  const inTrip = stage === 'trip';

  return (
    <div className={`app-host${inTrip ? ' app-host--trip' : ''}`}>
      <div className={`app-frame${inTrip ? ' app-frame--trip' : ''}`}>

        {/* Sidebar — tablet only, trip stage only */}
        {inTrip && (
          <Sidebar
            active={tab}
            onChange={setTab}
            groupName={activeGroup?.name ?? ''}
            onSwitchGroup={() => setStage('groups')}
          />
        )}

        {/* Main content */}
        <div className={inTrip ? 'app-main' : undefined}>
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

          {inTrip && (
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

              {/* TabBar — mobile only (hidden on tablet via CSS) */}
              <TabBar active={tab} onChange={setTab} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
