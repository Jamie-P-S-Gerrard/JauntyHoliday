'use client';
import { useEffect, useState } from 'react';
import { TabBar } from './ui/TabBar';
import { Sidebar } from './ui/Sidebar';
import { LoginScreen } from './screens/LoginScreen';
import { GroupsScreen } from './screens/GroupsScreen';
import { GroupScreen } from './screens/GroupScreen';
import { SetupScreen } from './screens/SetupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { DatesScreen } from './screens/DatesScreen';
import { DiscoverScreen } from './screens/DiscoverScreen';
import { PlanScreen } from './screens/PlanScreen';
import { BudgetScreen } from './screens/BudgetScreen';
import { INIT_GROUPS } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/configured';
import type { AppStage, AppTab, Group, GroupPrefs, TripSummary } from '@/types';

export function AppShell() {
  const [stage, setStage] = useState<AppStage>('login');
  const [checking, setChecking] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>(INIT_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [saved, setSaved] = useState<string[]>(['a2']);
  const userId = 'j';

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;
  const activeTrip = activeGroup?.trips.find((t) => t.id === activeTripId) ?? null;

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

  const updateGroup = (id: string, fn: (g: Group) => Group) =>
    setGroups((gs) => gs.map((g) => (g.id === id ? fn(g) : g)));

  const openGroup = (g: Group) => {
    setActiveGroupId(g.id);
    setStage('group');
  };

  const createGroup = (g: Group) => {
    setGroups((gs) => [g, ...gs]);
    setActiveGroupId(g.id);
    setStage('group');
  };

  const openTrip = (t: TripSummary) => {
    setActiveTripId(t.id);
    setStage(t.ready ? 'trip' : 'setup');
    setTab('home');
  };

  const createTrip = (t: TripSummary) => {
    if (!activeGroup) return;
    updateGroup(activeGroup.id, (g) => ({ ...g, trips: [...g.trips, t] }));
    setActiveTripId(t.id);
    setStage('setup');
  };

  const updatePrefs = (p: GroupPrefs) => {
    if (!activeGroup) return;
    updateGroup(activeGroup.id, (g) => ({ ...g, prefs: p }));
  };

  // Entering the trip from setup marks it ready, so reopening it goes
  // straight to the trip screens instead of back to first steps.
  const enterTrip = (tab: AppTab) => {
    if (!activeGroup || !activeTrip) return;
    updateGroup(activeGroup.id, (g) => ({
      ...g,
      trips: g.trips.map((t) =>
        t.id === activeTrip.id ? { ...t, ready: true, status: 'Planning' as const } : t
      ),
    }));
    setStage('trip');
    setTab(tab);
  };

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
            onSwitchGroup={() => setStage('group')}
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

          {stage === 'group' && activeGroup && (
            <GroupScreen
              group={activeGroup}
              onBack={() => setStage('groups')}
              onOpenTrip={openTrip}
              onCreateTrip={createTrip}
              onUpdatePrefs={updatePrefs}
            />
          )}

          {stage === 'setup' && activeGroup && activeTrip && (
            <SetupScreen
              group={activeGroup}
              trip={activeTrip}
              onBack={() => setStage('group')}
              onGo={enterTrip}
            />
          )}

          {inTrip && activeGroup && activeTrip && (
            <>
              {tab === 'home' && (
                <HomeScreen
                  groupName={activeGroup.name}
                  dest={activeTrip.id === 't1' ? undefined : activeTrip.dest || undefined}
                  when={activeTrip.when || undefined}
                  onSwitch={() => setStage('group')}
                  go={setTab}
                />
              )}
              {tab === 'dates'    && <DatesScreen />}
              {tab === 'discover' && (
                <DiscoverScreen
                  saved={saved}
                  onSave={toggleSave}
                  onAdd={addToPlan}
                  dest={activeTrip.dest || undefined}
                  prefs={activeGroup.prefs}
                />
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
