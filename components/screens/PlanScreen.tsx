'use client';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/components/ui/Placeholder';
import { Sheet } from '@/components/ui/Sheet';
import { MoodBoard } from './MoodBoard';
import { Itinerary } from './Itinerary';
import { SIDE_TRIPS, PACKING_LISTS, USER_NAMES } from '@/lib/data';
import type { PlanTab, SideTrip, PackingList, BoardApi, ItineraryApi, DatesApi, GroupPrefs } from '@/types';

interface PlanScreenProps {
  tripId: string;
  groupId: string;
  userId: string;
  boardApi: BoardApi;
  itinApi: ItineraryApi;
  datesApi: DatesApi;
  members: string[];
  dest?: string;
  prefs?: GroupPrefs;
}

const TAB_LABELS: Record<PlanTab, string> = {
  itinerary: 'Itinerary',
  sidetrips: 'Side trips',
  packing: 'Packing',
  board: 'Board',
};

export function PlanScreen({ tripId, groupId, userId, boardApi, itinApi, datesApi, members, dest, prefs }: PlanScreenProps) {
  const [tab, setTab] = useState<PlanTab>('itinerary');

  return (
    <div className="screen">
      <div className="screen-header" style={{ paddingBottom: 12 }}>
        <h1 className="hdr-title"><em>Plan</em></h1>
      </div>

      {/* Segmented control */}
      <div style={{ padding: '0 var(--pad)', marginBottom: 16, flexShrink: 0 }}>
        <div style={{
          display: 'flex', background: 'var(--surface-2)', borderRadius: 12, padding: 3, gap: 2,
        }}>
          {(['itinerary', 'sidetrips', 'packing', 'board'] as PlanTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, height: 34, borderRadius: 10,
                background: tab === t ? 'var(--surface)' : 'transparent',
                boxShadow: tab === t ? '0 1px 4px rgba(44,40,35,0.1)' : 'none',
                fontSize: 12.5, fontWeight: tab === t ? 700 : 500,
                color: tab === t ? 'var(--ink)' : 'var(--ink-soft)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {tab === 'itinerary' && (
        <Itinerary tripId={tripId} groupId={groupId} userId={userId} api={itinApi} datesApi={datesApi} members={members} dest={dest} prefs={prefs} />
      )}
      {tab === 'sidetrips' && <SideTripsBody />}
      {tab === 'packing' && <PackingBody />}
      {tab === 'board' && (
        <MoodBoard tripId={tripId} groupId={groupId} userId={userId} api={boardApi} />
      )}
    </div>
  );
}

// ── Side trips ────────────────────────────────────────────────────────────────

function SideTripsBody() {
  const [trips, setTrips] = useState(SIDE_TRIPS);
  const [proposeOpen, setProposeOpen] = useState(false);
  const userId = 'j';

  const toggleJoin = (id: string) => {
    setTrips((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              going: t.going.includes(userId)
                ? t.going.filter((u) => u !== userId)
                : [...t.going, userId],
            }
          : t
      )
    );
  };

  const propose = (trip: SideTrip) => {
    setTrips((prev) => [trip, ...prev]);
    setProposeOpen(false);
  };

  return (
    <>
      <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          {trips.map((trip) => (
            <SideTripCard key={trip.id} trip={trip} userId={userId} onToggle={() => toggleJoin(trip.id)} />
          ))}
        </div>
        <button
          className="btn ghost"
          style={{ width: '100%', marginTop: 'var(--gap)', gap: 8 }}
          onClick={() => setProposeOpen(true)}
        >
          <Icon name="plus" size={16} color="var(--ink)" /> Propose a side trip
        </button>
        <div style={{ height: 20 }} />
      </div>
      <ProposeSheet open={proposeOpen} onClose={() => setProposeOpen(false)} onPropose={propose} userId={userId} />
    </>
  );
}

function SideTripCard({ trip, userId, onToggle }: { trip: SideTrip; userId: string; onToggle: () => void }) {
  const isHost = trip.host === userId;
  const isGoing = trip.going.includes(userId);
  const isFull = trip.cap !== undefined && trip.going.length >= trip.cap;

  return (
    <div className="card" style={{ padding: 'var(--cardpad)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className={`chip ${trip.type === 'open' ? 'olive' : ''}`} style={{ fontSize: 11.5 }}>
          {trip.type === 'open' ? 'Open to join' : 'Solo'}
        </span>
      </div>
      <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{trip.title}</p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--ink-soft)' }}>
          <Icon name="calendar" size={13} color="var(--ink-faint)" /> {trip.when}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--ink-soft)' }}>
          <Icon name="map-pin" size={13} color="var(--ink-faint)" /> {trip.place}
        </span>
      </div>
      {trip.note && (
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 10, lineHeight: 1.5 }}>{trip.note}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar userId={trip.host} size="sm" />
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            {trip.type === 'open' && trip.cap
              ? `${trip.going.length}/${trip.cap} going`
              : `${USER_NAMES[trip.host]} only`}
          </span>
        </div>
        {trip.type === 'open' && !isHost && (
          <button
            className={`btn sm${isGoing ? ' olive' : ''}`}
            disabled={!isGoing && isFull}
            onClick={onToggle}
          >
            {isGoing ? "You're in" : isFull ? 'Full' : 'Join'}
          </button>
        )}
        {isHost && (
          <span className="chip terra" style={{ fontSize: 11.5 }}>You&apos;re hosting</span>
        )}
      </div>
    </div>
  );
}

function ProposeSheet({ open, onClose, onPropose, userId }: {
  open: boolean; onClose: () => void; onPropose: (t: SideTrip) => void; userId: string;
}) {
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [type, setType] = useState<'open' | 'solo'>('open');

  const submit = () => {
    if (!title.trim()) return;
    onPropose({
      id: `s${Date.now()}`, title: title.trim(), host: userId,
      when: when || 'TBD', place: where || 'TBD',
      type, going: [userId], cap: type === 'open' ? 6 : undefined,
    });
    setTitle(''); setWhen(''); setWhere(''); setType('open');
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 20 }}>Propose a side trip</h2>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Title</label>
      <input className="input" placeholder="e.g. Sunrise hike" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        <div>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>When</label>
          <input className="input" placeholder="Day 3 · 7am" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Where</label>
          <input className="input" placeholder="Location" value={where} onChange={(e) => setWhere(e.target.value)} />
        </div>
      </div>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 8px' }}>Who can come?</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['open', 'solo'] as const).map((t) => (
          <button
            key={t}
            className={`chip${type === t ? ' on' : ''}`}
            style={{ flex: 1, justifyContent: 'center', height: 38 }}
            onClick={() => setType(t)}
          >
            {t === 'open' ? 'Open to join' : 'Just me'}
          </button>
        ))}
      </div>
      <button className="btn" disabled={!title.trim()} style={{ width: '100%', marginTop: 24 }} onClick={submit}>
        Propose
      </button>
    </Sheet>
  );
}

// ── Packing ───────────────────────────────────────────────────────────────────

function PackingBody() {
  const [lists, setLists] = useState(PACKING_LISTS);
  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const userId = 'j';

  const toggleItem = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, done: !i.done } : i) }
          : l
      )
    );
  };

  const addItem = (listId: string, text: string) => {
    if (!text.trim()) return;
    setLists((prev) =>
      prev.map((l) =>
        l.id === listId
          ? { ...l, items: [...l.items, { id: `p${Date.now()}`, item: text, who: userId, done: false }] }
          : l
      )
    );
  };

  const createList = () => {
    if (!newListName.trim()) return;
    setLists((prev) => [...prev, { id: `list${Date.now()}`, name: newListName.trim(), items: [] }]);
    setNewListName('');
    setAddingList(false);
  };

  return (
    <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        {lists.map((list) => (
          <PackingListCard key={list.id} list={list} onToggle={toggleItem} onAdd={addItem} />
        ))}
      </div>

      {addingList ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 'var(--gap)' }}>
          <input
            className="input"
            placeholder="List name…"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createList()}
            autoFocus
            style={{ flex: 1 }}
          />
          <button className="btn sm" onClick={createList}>Create</button>
          <button className="btn ghost sm" onClick={() => setAddingList(false)}>Cancel</button>
        </div>
      ) : (
        <button
          className="btn ghost"
          style={{ width: '100%', marginTop: 'var(--gap)', gap: 8 }}
          onClick={() => setAddingList(true)}
        >
          <Icon name="plus" size={16} color="var(--ink)" /> New list
        </button>
      )}
      <div style={{ height: 20 }} />
    </div>
  );
}

function PackingListCard({ list, onToggle, onAdd }: {
  list: PackingList;
  onToggle: (listId: string, itemId: string) => void;
  onAdd: (listId: string, text: string) => void;
}) {
  const [newItem, setNewItem] = useState('');
  const done = list.items.filter((i) => i.done).length;
  const pct = list.items.length > 0 ? (done / list.items.length) * 100 : 0;

  return (
    <div className="card" style={{ padding: 'var(--cardpad)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 15, fontWeight: 600 }}>{list.name}</p>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{done}/{list.items.length}</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 14 }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.items.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => onToggle(list.id, item.id)}
              style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: item.done ? 'var(--olive)' : 'transparent',
                border: `1.5px solid ${item.done ? 'var(--olive)' : 'var(--line)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {item.done && <Icon name="check" size={11} color="#fff" strokeWidth={3} />}
            </button>
            <span style={{ flex: 1, fontSize: 14, color: item.done ? 'var(--ink-faint)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none' }}>
              {item.item}
            </span>
            <Avatar userId={item.who} size="sm" />
          </div>
        ))}
        {/* Add item inline */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input
            className="input"
            placeholder="Add an item…"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { onAdd(list.id, newItem); setNewItem(''); } }}
            style={{ flex: 1, height: 36, padding: '0 12px', fontSize: 13.5 }}
          />
          <button
            className="btn sm"
            style={{ width: 36, height: 36, padding: 0 }}
            onClick={() => { onAdd(list.id, newItem); setNewItem(''); }}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
