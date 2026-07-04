'use client';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/components/ui/Placeholder';
import { Sheet } from '@/components/ui/Sheet';
import { MoodBoard } from './MoodBoard';
import { DAYS, SIDE_TRIPS, PACKING_LISTS, DISCOVER, USER_NAMES } from '@/lib/data';
import type { PlanTab, ItineraryItem, SideTrip, PackingList, BoardApi } from '@/types';

interface PlanScreenProps {
  saved: string[];
  tripId: string;
  groupId: string;
  userId: string;
  boardApi: BoardApi;
}

const TAB_LABELS: Record<PlanTab, string> = {
  itinerary: 'Itinerary',
  sidetrips: 'Side trips',
  packing: 'Packing',
  board: 'Board',
};

export function PlanScreen({ saved, tripId, groupId, userId, boardApi }: PlanScreenProps) {
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

      {tab === 'itinerary' && <ItineraryBody saved={saved} />}
      {tab === 'sidetrips' && <SideTripsBody />}
      {tab === 'packing' && <PackingBody />}
      {tab === 'board' && (
        <MoodBoard tripId={tripId} groupId={groupId} userId={userId} api={boardApi} />
      )}
    </div>
  );
}

// ── Itinerary ─────────────────────────────────────────────────────────────────

function ItineraryBody({ saved }: { saved: string[] }) {
  const [days, setDays] = useState(DAYS);
  const [selectedDay, setSelectedDay] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);

  const day = days.find((d) => d.n === selectedDay)!;

  const addSavedCard = (cardId: string) => {
    const card = DISCOVER.cards.find((c) => c.id === cardId);
    if (!card) return;
    const catMap: Record<string, ItineraryItem['cat']> = { stay: 'stay', eat: 'food', activity: 'beach' };
    const newItem: ItineraryItem = {
      id: `new-${Date.now()}`,
      t: '–',
      title: card.title,
      place: card.area,
      cat: catMap[card.kind] ?? 'activity',
      who: 'j',
      likes: 0, liked: false, comments: 0,
    };
    setDays((prev) =>
      prev.map((d) =>
        d.n === selectedDay ? { ...d, items: [...d.items, newItem] } : d
      )
    );
    setPickerOpen(false);
  };

  const toggleLike = (itemId: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.n === selectedDay
          ? {
              ...d,
              items: d.items.map((item) =>
                item.id === itemId
                  ? { ...item, liked: !item.liked, likes: item.liked ? item.likes - 1 : item.likes + 1 }
                  : item
              ),
            }
          : d
      )
    );
  };

  return (
    <>
      {/* Day strip */}
      <div style={{ overflowX: 'auto', padding: '0 var(--pad) 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
          {days.map((d) => {
            const on = d.n === selectedDay;
            const hasDot = d.items.length > 0;
            return (
              <button
                key={d.n}
                onClick={() => setSelectedDay(d.n)}
                style={{
                  width: 52, height: 52, borderRadius: 999, flexShrink: 0,
                  background: on ? 'var(--terra)' : 'var(--surface)',
                  border: `1px solid ${on ? 'transparent' : 'var(--line-2)'}`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: on ? 'rgba(255,255,255,0.75)' : 'var(--ink-faint)' }}>DAY</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: on ? '#fff' : 'var(--ink)', lineHeight: 1 }}>{d.n}</p>
                {hasDot && !on && (
                  <div style={{ position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: '50%', background: 'var(--terra)' }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
        {/* Day header */}
        <div style={{ marginBottom: 12 }}>
          <p className="eyebrow">{day.date}</p>
          <p className="sec-title">{day.title}</p>
          {day.area && (
            <span className="chip" style={{ marginTop: 6, height: 26, fontSize: 11.5 }}>
              <Icon name="map-pin" size={11} color="var(--ink-soft)" /> {day.area}
            </span>
          )}
        </div>

        {/* Map peek */}
        <div style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 104, marginBottom: 16, position: 'relative' }}>
          <Placeholder tint="#9aad8a" style={{ position: 'absolute', inset: 0 }} label={day.area} />
          {day.items.map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: 20 + (i * 22) % 60, left: 30 + (i * 40) % 120,
              width: 22, height: 22, borderRadius: '50% 50% 50% 0',
              transform: 'rotate(-45deg)', background: 'var(--terra)',
              border: '2px solid #fff',
            }} />
          ))}
        </div>

        {/* Timeline */}
        {day.items.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: 48 }}>
            {/* Rail */}
            <div style={{ position: 'absolute', left: 20, top: 20, bottom: 20, width: 1.5, background: 'var(--line-2)' }} />

            {day.items.map((item) => (
              <div key={item.id} style={{ position: 'relative', marginBottom: 12 }}>
                {/* Time + icon rail */}
                <div style={{ position: 'absolute', left: -48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 14 }}>
                  <p style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.t}</p>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: CAT_COLORS[item.cat]?.bg ?? 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={CAT_ICONS[item.cat] ?? 'map-pin'} size={14} color={CAT_COLORS[item.cat]?.fg ?? 'var(--ink-soft)'} />
                  </div>
                </div>

                <div className="card" style={{ padding: '12px var(--cardpad)' }}>
                  <p style={{ fontSize: 14.5, fontWeight: 600 }}>{item.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Icon name="map-pin" size={11} color="var(--ink-faint)" />
                    <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{item.place}</p>
                    <div style={{ marginLeft: 'auto', display: 'flex' }}>
                      <Avatar userId={item.who} size="sm" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
                    <button onClick={() => toggleLike(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      <Icon name="heart" size={15} color={item.liked ? 'var(--terra)' : 'var(--ink-faint)'} fill={item.liked ? 'var(--terra)' : 'none'} />
                      {item.likes > 0 ? item.likes : ''}
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ink-soft)' }}>
                      <Icon name="message-square" size={15} color="var(--ink-faint)" />
                      {item.comments > 0 ? item.comments : ''}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--cardpad)', textAlign: 'center', color: 'var(--ink-faint)' }}>
            <div style={{ margin: '8px auto', display: 'flex', justifyContent: 'center' }}>
              <Icon name="calendar" size={28} color="var(--ink-faint)" />
            </div>
            <p style={{ fontSize: 14, marginTop: 8 }}>Nothing planned yet for Day {day.n}</p>
          </div>
        )}

        {/* Add to day */}
        <button
          className="btn ghost sm"
          style={{ width: '100%', marginTop: 12, gap: 6 }}
          onClick={() => setPickerOpen(true)}
        >
          <Icon name="plus" size={14} color="var(--ink)" />
          Add a plan to Day {day.n}
        </button>

        <div style={{ height: 20 }} />
      </div>

      {/* Saved ideas picker */}
      <Sheet open={pickerOpen} onClose={() => setPickerOpen(false)}>
        <h2 className="sec-title" style={{ marginBottom: 4 }}>Your saved ideas</h2>
        <p className="hdr-sub" style={{ marginBottom: 16 }}>Pick something to add to Day {day.n}</p>
        {saved.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', padding: 20 }}>
            Save ideas in Discover first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {saved.map((id) => {
              const card = DISCOVER.cards.find((c) => c.id === id);
              if (!card) return null;
              return (
                <button
                  key={id}
                  onClick={() => addSavedCard(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', background: 'var(--surface-2)',
                    borderRadius: 12, textAlign: 'left',
                  }}
                >
                  <Placeholder tint={card.tint} style={{ width: 40, height: 40, borderRadius: 8 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{card.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{card.area}</p>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex' }}>
                    <Icon name="plus" size={16} color="var(--terra)" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Sheet>
    </>
  );
}

const CAT_ICONS: Record<string, string> = {
  travel: 'plane', stay: 'bed', food: 'utensils', beach: 'waves', activity: 'map-pin',
};
const CAT_COLORS: Record<string, { bg: string; fg: string }> = {
  travel:   { bg: 'var(--surface-2)',   fg: 'var(--ink-soft)' },
  stay:     { bg: 'var(--olive-bg)',    fg: 'var(--olive)' },
  food:     { bg: 'var(--terra-bg)',    fg: 'var(--terra)' },
  beach:    { bg: '#ddeef4',            fg: '#4e8fa0' },
  activity: { bg: 'var(--gold-bg)',     fg: 'var(--gold)' },
};

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
