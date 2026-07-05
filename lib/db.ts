// Supabase data access. Every function assumes supabaseConfigured() is true —
// AppShell routes to the demo implementations in lib/demo-apis.ts otherwise.
import { createClient } from './supabase/client';
import { dateRange, formatDayLabel, formatRange, formatSub } from './dates';
import type {
  Group, GroupPrefs, TripSummary, TripStatus,
  DateOption, DatesApi, BoardItem, BoardApi,
  Day, ItineraryApi, Stay, StaysApi, StayStatus,
  GroupEvent, EventsApi, ChatApi, ChatMsg,
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
      .select('id, kind, title, note, tint, who, image_url')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((i): BoardItem => ({
      id: i.id,
      kind: (i.kind ?? 'idea') as BoardItem['kind'],
      title: i.title,
      note: i.note ?? undefined,
      tint: i.tint ?? '#caa37a',
      who: i.who ?? '',
      imageUrl: i.image_url ?? undefined,
    }));
  },

  async add(tripId, groupId, { kind, title, note, tint, imageFile }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    let imageUrl: string | null = null;
    if (kind === 'photo' && imageFile) {
      if (imageFile.size > 8 * 1024 * 1024) {
        throw new Error('Photo is too large — keep it under 8MB');
      }
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${tripId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('board')
        .upload(path, imageFile, { contentType: imageFile.type || 'image/jpeg' });
      if (uploadError) throw uploadError;
      imageUrl = supabase.storage.from('board').getPublicUrl(path).data.publicUrl;
    }

    const { error } = await supabase.from('mood_board_items').insert({
      trip_id: tripId,
      group_id: groupId,
      kind,
      title,
      note: note || null,
      tint,
      who: user.id,
      image_url: imageUrl,
    });
    if (error) throw error;
  },

  async remove(itemId) {
    const supabase = createClient();
    const { error } = await supabase.from('mood_board_items').delete().eq('id', itemId);
    if (error) throw error;
  },
};

// ── Itinerary ─────────────────────────────────────────────────────────────────

export const dbItineraryApi: ItineraryApi = {
  async listDays(tripId) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('days')
      .select('id, day_number, date_label, title, area, itinerary_items ( id, time_label, title, place, cat, who, sort_order, item_likes ( user_id ) )')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((d): Day => ({
      id: d.id,
      n: d.day_number,
      date: d.date_label ?? '',
      title: d.title ?? `Day ${d.day_number}`,
      area: d.area ?? '',
      items: (d.itinerary_items ?? [])
        .sort((a: { sort_order: number | null; time_label: string | null }, b: { sort_order: number | null; time_label: string | null }) =>
          (a.time_label ?? '99:99').localeCompare(b.time_label ?? '99:99'))
        .map((i: { id: string; time_label: string | null; title: string; place: string | null; cat: string | null; who: string | null; item_likes: Array<{ user_id: string }> }) => ({
          id: i.id,
          t: i.time_label ?? '–',
          title: i.title,
          place: i.place ?? '',
          cat: (i.cat ?? 'activity') as Day['items'][number]['cat'],
          who: i.who ?? '',
          likes: (i.item_likes ?? []).length,
          liked: !!user && (i.item_likes ?? []).some((l: { user_id: string }) => l.user_id === user.id),
          comments: 0,
        })),
    }));
  },

  async setupDays(tripId, groupId, start, end) {
    const supabase = createClient();
    const dates = dateRange(start, end);
    if (dates.length === 0) throw new Error('Pick a valid date range');
    const rows = dates.map((iso, i) => ({
      trip_id: tripId,
      group_id: groupId,
      day_number: i + 1,
      date_label: formatDayLabel(iso),
      title: i === 0 ? 'Arrival day' : i === dates.length - 1 ? 'Heading home' : null,
    }));
    const { error } = await supabase.from('days').insert(rows);
    if (error) throw error;
  },

  async addItem(dayId, { time, title, place, cat }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase.from('itinerary_items').insert({
      day_id: dayId,
      time_label: time || null,
      title,
      place: place || null,
      cat,
      who: user.id,
    });
    if (error) throw error;
  },

  async removeItem(itemId) {
    const supabase = createClient();
    const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId);
    if (error) throw error;
  },

  async toggleLike(itemId, liked) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    if (liked) {
      const { error } = await supabase.from('item_likes').delete()
        .eq('item_id', itemId).eq('user_id', user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('item_likes').insert({ item_id: itemId, user_id: user.id });
      if (error && error.code !== '23505') throw error;
    }
  },
};

// ── Stays (accommodation shortlist backed by budgets/bookings) ────────────────

async function getOrCreateBudget(tripId: string, groupId: string): Promise<string> {
  const supabase = createClient();
  const { data: existing, error } = await supabase
    .from('budgets').select('id').eq('trip_id', tripId).maybeSingle();
  if (error) throw error;
  if (existing) return existing.id;
  const { data: created, error: insertError } = await supabase
    .from('budgets')
    .insert({ trip_id: tripId, group_id: groupId })
    .select('id')
    .single();
  if (insertError) throw insertError;
  return created.id;
}

export const dbStaysApi: StaysApi = {
  async list(tripId) {
    const supabase = createClient();
    const { data: budget, error: budgetError } = await supabase
      .from('budgets').select('id').eq('trip_id', tripId).maybeSingle();
    if (budgetError) throw budgetError;
    if (!budget) return [];
    const { data, error } = await supabase
      .from('bookings')
      .select('id, title, meta, cost, status, who')
      .eq('budget_id', budget.id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((b): Stay => ({
      id: b.id,
      title: b.title,
      area: b.meta ?? undefined,
      cost: b.cost ?? undefined,
      status: (b.status ?? 'todo') as StayStatus,
      who: b.who,
    }));
  },

  async add(tripId, groupId, { title, area, cost, status }) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const budgetId = await getOrCreateBudget(tripId, groupId);
    const { error } = await supabase.from('bookings').insert({
      budget_id: budgetId,
      title,
      meta: area || null,
      cost: cost ?? null,
      status,
      who: user.id,
    });
    if (error) throw error;
  },

  async setStatus(stayId, status) {
    const supabase = createClient();
    const { error } = await supabase.from('bookings').update({ status }).eq('id', stayId);
    if (error) throw error;
  },

  async remove(stayId) {
    const supabase = createClient();
    const { error } = await supabase.from('bookings').delete().eq('id', stayId);
    if (error) throw error;
  },
};

// ── Events ────────────────────────────────────────────────────────────────────

export const dbEventsApi: EventsApi = {
  async list(groupId) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('events')
      .select('id, title, event_date, time_label, note, venue, venue_url, ticket_url, tint, created_by, event_rsvps ( user_id )')
      .eq('group_id', groupId)
      .order('event_date', { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data ?? []).map((e): GroupEvent => ({
      id: e.id,
      title: e.title,
      date: e.event_date ?? undefined,
      time: e.time_label ?? undefined,
      note: e.note ?? undefined,
      venue: e.venue ?? undefined,
      venueUrl: e.venue_url ?? undefined,
      ticketUrl: e.ticket_url ?? undefined,
      tint: e.tint ?? '#b07a9a',
      who: e.created_by ?? '',
      going: (e.event_rsvps ?? []).map((r: { user_id: string }) => r.user_id),
    }));
  },

  async add(groupId, input) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data: event, error } = await supabase.from('events').insert({
      group_id: groupId,
      title: input.title,
      event_date: input.date || null,
      time_label: input.time || null,
      note: input.note || null,
      venue: input.venue || null,
      venue_url: input.venueUrl || null,
      ticket_url: input.ticketUrl || null,
      created_by: user.id,
    }).select('id').single();
    if (error) throw error;
    // Proposer is automatically in
    await supabase.from('event_rsvps').insert({ event_id: event.id, user_id: user.id });
  },

  async rsvp(eventId, going) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    if (going) {
      const { error } = await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: user.id });
      if (error && error.code !== '23505') throw error;
    } else {
      const { error } = await supabase.from('event_rsvps').delete()
        .eq('event_id', eventId).eq('user_id', user.id);
      if (error) throw error;
    }
  },

  async remove(eventId) {
    const supabase = createClient();
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
  },
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const dbChatApi: ChatApi = {
  async list(scope) {
    const supabase = createClient();
    let q = supabase
      .from('messages')
      .select('id, who, body, created_at')
      .eq('group_id', scope.groupId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (scope.eventId) q = q.eq('event_id', scope.eventId);
    else if (scope.tripId) q = q.eq('trip_id', scope.tripId);
    else q = q.is('trip_id', null).is('event_id', null);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((m): ChatMsg => ({
      id: m.id, who: m.who, body: m.body, at: m.created_at,
    }));
  },

  async send(scope, body) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await supabase.from('messages').insert({
      group_id: scope.groupId,
      trip_id: scope.tripId ?? null,
      event_id: scope.eventId ?? null,
      who: user.id,
      body,
    });
    if (error) throw error;
  },
};
