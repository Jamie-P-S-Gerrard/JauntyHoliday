// Supabase data access. Every function assumes supabaseConfigured() is true —
// AppShell routes to the demo implementations in lib/demo-apis.ts otherwise.
import { createClient } from './supabase/client';
import { formatRange, formatSub } from './dates';
import type {
  Group, GroupPrefs, TripSummary, TripStatus,
  DateOption, DatesApi, BoardItem, BoardApi,
} from '@/types';

const TRIP_TINTS = ['#caa37a', '#7fa0c0', '#9aa56a', '#b07a9a', '#c77f6a', '#7fa39a'];

interface ProfileRow { id: string; name: string; initials: string }

// ── Groups, trips, preferences ────────────────────────────────────────────────

export async function fetchGroups(): Promise<{
  groups: Group[];
  profiles: ProfileRow[];
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id, name, invite_code, tint,
      group_members ( user_id ),
      trips ( id, dest, when_label, status, tint, ready, created_at ),
      group_preferences ( vibe, pace, budget_level, interests, notes )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const groups: Group[] = (data ?? []).map((g) => {
    const prefs = Array.isArray(g.group_preferences) ? g.group_preferences[0] : g.group_preferences;
    return {
      id: g.id,
      name: g.name,
      members: (g.group_members ?? []).map((m: { user_id: string }) => m.user_id),
      invited: [],
      inviteCode: g.invite_code,
      tint: g.tint ?? '#caa37a',
      trips: (g.trips ?? [])
        .sort((a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at))
        .map((t: { id: string; dest: string | null; when_label: string | null; status: string | null; tint: string | null; ready: boolean | null }): TripSummary => ({
          id: t.id,
          dest: t.dest ?? '',
          when: t.when_label ?? '',
          status: (t.status ?? 'Idea') as TripStatus,
          tint: t.tint ?? '#caa37a',
          ready: !!t.ready,
        })),
      prefs: prefs
        ? {
            vibe: prefs.vibe ?? undefined,
            pace: prefs.pace ?? undefined,
            budget: prefs.budget_level ?? undefined,
            interests: prefs.interests ?? [],
            notes: prefs.notes ?? undefined,
          }
        : { interests: [] },
    };
  });

  // Profiles for everyone we can see (names + initials for avatars)
  const memberIds = [...new Set(groups.flatMap((g) => g.members))];
  let profiles: ProfileRow[] = [];
  if (memberIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, name, initials')
      .in('id', memberIds);
    profiles = profileRows ?? [];
  }

  return { groups, profiles };
}

export async function createGroupDb(name: string, firstTrip?: { dest: string; when: string }): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');

  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data: group, error } = await supabase
    .from('groups')
    .insert({ name, invite_code: inviteCode, created_by: user.id, tint: '#9aa56a' })
    .select('id')
    .single();
  if (error) throw error;

  if (firstTrip && (firstTrip.dest || firstTrip.when)) {
    const { error: tripError } = await supabase.from('trips').insert({
      group_id: group.id,
      dest: firstTrip.dest || null,
      when_label: firstTrip.when || null,
      status: 'Idea',
      tint: TRIP_TINTS[0],
      created_by: user.id,
    });
    if (tripError) throw tripError;
  }
}

export async function joinGroupDb(code: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('join_group_by_code', { code });
  if (error) throw error;
}

export async function createTripDb(groupId: string, dest: string, when: string, tint: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('trips').insert({
    group_id: groupId,
    dest: dest || null,
    when_label: when || null,
    status: 'Idea',
    tint,
    created_by: user?.id,
  });
  if (error) throw error;
}

export async function markTripReadyDb(tripId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('trips')
    .update({ ready: true, status: 'Planning' })
    .eq('id', tripId);
  if (error) throw error;
}

export async function savePrefsDb(groupId: string, prefs: GroupPrefs): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('group_preferences').upsert({
    group_id: groupId,
    vibe: prefs.vibe ?? null,
    pace: prefs.pace ?? null,
    budget_level: prefs.budget ?? null,
    interests: prefs.interests,
    notes: prefs.notes ?? null,
    updated_by: user?.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ── Dates ─────────────────────────────────────────────────────────────────────

export const dbDatesApi: DatesApi = {
  async list(tripId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('date_options')
      .select('id, range_label, sub_label, note, weather, proposed_by, start_date, end_date, date_votes ( user_id )')
      .eq('trip_id', tripId)
      .order('start_date', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((o): DateOption => ({
      id: o.id,
      range: o.range_label,
      sub: o.sub_label ?? '',
      note: o.note ?? undefined,
      weather: o.weather ?? undefined,
      proposedBy: o.proposed_by ?? '',
      votes: (o.date_votes ?? []).map((v: { user_id: string }) => v.user_id),
      startDate: o.start_date ?? undefined,
      endDate: o.end_date ?? undefined,
    }));
  },

  async propose(tripId, { start, end, note }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    // group_id is still required by the 003 RLS policies
    const { data: trip, error: tripError } = await supabase
      .from('trips').select('group_id').eq('id', tripId).single();
    if (tripError) throw tripError;

    const { error } = await supabase.from('date_options').insert({
      trip_id: tripId,
      group_id: trip.group_id,
      range_label: formatRange(start, end),
      sub_label: formatSub(start, end),
      note: note || null,
      proposed_by: user.id,
      start_date: start,
      end_date: end,
    });
    if (error) throw error;
  },

  async vote(optionId) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase.from('date_votes').insert({ option_id: optionId, user_id: user.id });
    if (error && error.code !== '23505') throw error; // ignore double-vote
  },

  async unvote(optionId) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase.from('date_votes').delete()
      .eq('option_id', optionId).eq('user_id', user.id);
    if (error) throw error;
  },

  async remove(optionId) {
    const supabase = createClient();
    const { error } = await supabase.from('date_options').delete().eq('id', optionId);
    if (error) throw error;
  },
};

// ── Mood board ────────────────────────────────────────────────────────────────

export const dbBoardApi: BoardApi = {
  async list(tripId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('mood_board_items')
      .select('id, title, note, tint, who')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((i): BoardItem => ({
      id: i.id,
      title: i.title,
      note: i.note ?? undefined,
      tint: i.tint ?? '#caa37a',
      who: i.who ?? '',
    }));
  },

  async add(tripId, groupId, { title, note, tint }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase.from('mood_board_items').insert({
      trip_id: tripId,
      group_id: groupId,
      title,
      note: note || null,
      tint,
      who: user.id,
    });
    if (error) throw error;
  },

  async remove(itemId) {
    const supabase = createClient();
    const { error } = await supabase.from('mood_board_items').delete().eq('id', itemId);
    if (error) throw error;
  },
};
