'use client';
import { useCallback, useEffect, useState } from 'react';
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
import { INIT_GROUPS, registerProfiles } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/configured';
import { RealTripHome } from './screens/RealTripHome';
import {
  fetchGroups, createGroupDb, joinGroupDb, createTripDb,
  markTripReadyDb, savePrefsDb, dbDatesApi, dbBoardApi,
  dbItineraryApi, dbStaysApi,
} from '@/lib/db';
import {
  demoDatesApi, demoBoardApi, demoItineraryApi, demoStaysApi,
} from '@/lib/demo-apis';
import type { AppStage, AppTab, Group, GroupPrefs, TripSummary } from '@/types';

export function AppShell() {
  const configured = supabaseConfigured();
  const [stage, setStage] = useState<AppStage>('login');
  const [checking, setChecking] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('j');
  const [groups, setGroups] = useState<Group[]>(configured ? [] : INIT_GROUPS);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [tab, setTab] = useState<AppTab>('home');
  const [saved, setSaved] = useState<string[]>(['a2']);

  const datesApi = configured ? dbDatesApi : demoDatesApi;
  const boardApi = configured ? dbBoardApi : demoBoardApi;
  const itinApi = configured ? dbItineraryApi : demoItineraryApi;
  const staysApi = configured ? dbStaysApi : demoStaysApi;

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;
  const activeTrip = activeGroup?.trips.find((t) => t.id === activeTripId) ?? null;

  const loadData = useCallback(async (): Promise<Group[]> => {
    setLoadingData(true);
    try {
      const { groups: fetched, profiles } = await fetchGroups();
      registerProfiles(profiles);
      setGroups(fetched);
      return fetched;
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : 'Could not load your groups');
      return [];
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Restore an existing Supabase session on load; react to sign-in/out.
  useEffect(() => {
    if (!configured) {
      setChecking(false);
      return;
    }
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserName(sessionName(session.user.user_metadata, session.user.email));
        setUserId(session.user.id);
        setStage('groups');
        loadData();
      }
      setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUserName(null);
        setGroups([]);
        setStage('login');
      } else if (session && event === 'SIGNED_IN') {
        setUserName(sessionName(session.user.user_metadata, session.user.email));
        setUserId(session.user.id);
        setStage((s) => {
          if (s === 'login') {
            loadData();
            return 'groups';
          }
          return s;
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [configured, loadData]);

  const signOut = async () => {
    if (configured) {
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

  const createGroup = async (g: Group) => {
    if (configured) {
      try {
        await createGroupDb(g.name, g.trips[0] ? { dest: g.trips[0].dest, when: g.trips[0].when } : undefined);
        const fresh = await loadData();
        if (fresh[0]) setActiveGroupId(fresh[0].id); // newest first
        setStage('group');
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not create the group');
      }
      return;
    }
    setGroups((gs) => [g, ...gs]);
    setActiveGroupId(g.id);
    setStage('group');
  };

  const joinGroup = async (code: string): Promise<string | null> => {
    if (!configured) {
      return 'Joining needs a real account — this is demo mode.';
    }
    try {
      await joinGroupDb(code);
      const fresh = await loadData();
      const joined = fresh.find((g) => g.inviteCode.toUpperCase() === code.toUpperCase());
      if (joined) {
        setActiveGroupId(joined.id);
        setStage('group');
      }
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not join — check the code';
    }
  };

  const createTrip = async (t: TripSummary) => {
    if (!activeGroup) return;
    if (configured) {
      try {
        await createTripDb(activeGroup.id, t.dest, t.when, t.tint);
        const fresh = await loadData();
        const g = fresh.find((x) => x.id === activeGroup.id);
        const newest = g?.trips[g.trips.length - 1]; // trips sorted oldest→newest
        if (newest) {
          setActiveTripId(newest.id);
          setStage('setup');
        }
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not create the trip');
      }
      return;
    }
    updateGroup(activeGroup.id, (g) => ({ ...g, trips: [...g.trips, t] }));
    setActiveTripId(t.id);
    setStage('setup');
  };

  const updatePrefs = async (p: GroupPrefs) => {
    if (!activeGroup) return;
    updateGroup(activeGroup.id, (g) => ({ ...g, prefs: p })); // optimistic
    if (configured) {
      try {
        await savePrefsDb(activeGroup.id, p);
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Could not save preferences');
        loadData();
      }
    }
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
    if (configured) {
      markTripReadyDb(activeTrip.id).catch(console.error);
    }
    setStage('trip');
    setTab(tab);
  };

  const openTrip = (t: TripSummary) => {
    setActiveTripId(t.id);
    setStage(t.ready ? 'trip' : 'setup');
    setTab('home');
  };

  const inTrip = stage === 'trip';

  // The group's saved vibe re-skins everything inside that group
  const vibe = (stage === 'group' || stage === 'setup' || stage === 'trip')
    ? activeGroup?.prefs.vibe
    : undefined;

  // Avoid flashing the login screen while the session is being restored
  if (checking) {
    return <div className="app-host"><div className="app-frame" /></div>;
  }

  return (
    <div className={`app-host${inTrip ? ' app-host--trip' : ''}`} data-vibe={vibe}>
      <div className={`app-frame${inTrip ? ' app-frame--trip' : ''}`} data-vibe={vibe}>

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
            loadingData ? (
              <div className="screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <p className="hdr-sub">Loading your trips…</p>
              </div>
            ) : (
              <GroupsScreen
                groups={groups}
                userId={userId}
                userName={userName ?? undefined}
                onOpen={openGroup}
                onCreate={createGroup}
                onJoin={joinGroup}
                onSignOut={signOut}
              />
            )
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
                activeTrip.id === 't1' ? (
                  // The seeded Lombok demo keeps its full sample home screen
                  <HomeScreen
                    groupName={activeGroup.name}
                    onSwitch={() => setStage('group')}
                    go={setTab}
                  />
                ) : (
                  <RealTripHome
                    key={activeTrip.id}
                    groupName={activeGroup.name}
                    dest={activeTrip.dest || 'Somewhere new'}
                    when={activeTrip.when || undefined}
                    tint={activeTrip.tint}
                    members={activeGroup.members}
                    tripId={activeTrip.id}
                    groupId={activeGroup.id}
                    userId={userId}
                    staysApi={staysApi}
                    itinApi={itinApi}
                    onSwitch={() => setStage('group')}
                    go={setTab}
                  />
                )
              )}
              {tab === 'dates' && (
                <DatesScreen
                  tripId={activeTrip.id}
                  userId={userId}
                  members={activeGroup.members}
                  api={datesApi}
                />
              )}
              {tab === 'discover' && (
                <DiscoverScreen
                  key={activeTrip.id}
                  saved={saved}
                  onSave={toggleSave}
                  onAdd={addToPlan}
                  dest={activeTrip.dest || undefined}
                  prefs={activeGroup.prefs}
                  tripId={activeTrip.id}
                  groupId={activeGroup.id}
                  boardApi={boardApi}
                />
              )}
              {tab === 'plan' && (
                <PlanScreen
                  key={activeTrip.id}
                  tripId={activeTrip.id}
                  groupId={activeGroup.id}
                  userId={userId}
                  boardApi={boardApi}
                  itinApi={itinApi}
                />
              )}
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
