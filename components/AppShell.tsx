'use client';
import { useEffect, useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/configured';
import type { AppStage, AppTab, Group } from '@/types';

export function AppShell() {
  const [stage, setStage] = useState<AppStage>('login');
  const [checking, setChecking] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>(INIT_GROUPS);
  const [active, setActive] = useState<Group | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [saved, setSaved] = useState<string[]>(['a2']);
  const userId = 'j';

  // Restore an existing Supabase session on load; react to sign-in/out.
  useEffect(() => {
    if (!supabaseConfigured()) {
      setChecking(false);
      return;
    }
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserName(sessionName(session.user.user_metadata, session.user.email));
        setStage('groups');
      }
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserName(null);
        setStage('login');
      } else if (session) {
        setUserName(sessionName(session.user.user_metadata, session.user.email));
        setStage((s) => (s === 'login' ? 'groups' : s));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabaseConfigured()) {
      await createClient().auth.signOut();
    }
    setUserName(null);
    setStage('login');
  };

  const toggleSave = (id: string) =>
    setSaved((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const addToPlan = (id: string) =>
    setSaved((s) => (s.includes(id) ? s : [...s, id]));

  const openGroup = (g: Group) => {
    setActive(g);
    setStage(g.ready ? 'trip' : 'setup');
    setTab('home');
  };

  // Entering the trip from setup marks the group ready, so reopening it
  // goes straight to the trip screens instead of back to first steps.
  const enterTrip = (g: Group, tab: AppTab) => {
    const ready = { ...g, ready: true };
    setGroups((gs) => gs.map((x) => (x.id === g.id ? ready : x)));
    setActive(ready);
    setStage('trip');
    setTab(tab);
  };
  const createGroup = (g: Group) => {
    setGroups((gs) => [g, ...gs]);
    setActive(g);
    setStage('setup');
  };

  const activeGroup = active ?? groups[0];

  const inTrip = stage === 'trip';

  // Avoid flashing the login screen while the session is being restored
  if (checking) {
    return <div className="app-host"><div className="app-frame" /></div>;
  }

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
        <div className="app-main">
          {stage === 'login' && (
            <LoginScreen onDemoLogin={() => setStage('groups')} />
          )}

          {stage === 'groups' && (
            <GroupsScreen
              groups={groups}
              userId={userId}
              userName={userName ?? undefined}
              onOpen={openGroup}
              onCreate={createGroup}
              onSignOut={signOut}
            />
          )}

          {stage === 'setup' && activeGroup && (
            <SetupScreen
              group={activeGroup}
              onBack={() => setStage('groups')}
              onGo={(tab) => enterTrip(activeGroup, tab)}
            />
          )}

          {inTrip && (
            <>
              {tab === 'home' && (
                <HomeScreen
                  groupName={activeGroup?.name ?? ''}
                  dest={activeGroup?.id === 'g1' ? undefined : activeGroup?.dest || undefined}
                  when={activeGroup?.when || undefined}
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

function sessionName(meta: Record<string, unknown>, email?: string): string {
  const name = (meta.full_name ?? meta.name) as string | undefined;
  return name?.trim() || email?.split('@')[0] || 'traveller';
}
