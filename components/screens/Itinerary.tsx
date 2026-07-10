'use client';
import { toast } from '@/components/ui/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Placeholder } from '@/components/ui/Placeholder';
import { DocRow, DocUploadSheet } from './TripDocuments';
import { formatItemTime, timeToHHMM } from '@/lib/time';
import type {
  AiSuggestion, DatesApi, Day, DocsApi, GroupPrefs, ItineraryApi,
  ItineraryItem, ItineraryItemCat, ItineraryItemInput, LatLng, TripDoc,
} from '@/types';

// Leaflet touches `window`, so the map only renders on the client.
const ItineraryMap = dynamic(() => import('@/components/ui/ItineraryMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 190, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)' }} />
  ),
});

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
const CATS: Array<{ id: ItineraryItemCat; label: string }> = [
  { id: 'activity', label: 'Activity' },
  { id: 'food',     label: 'Food' },
  { id: 'beach',    label: 'Beach' },
  { id: 'stay',     label: 'Stay' },
  { id: 'travel',   label: 'Travel' },
];

interface ItineraryProps {
  tripId: string;
  groupId: string;
  userId: string;
  api: ItineraryApi;
  datesApi: DatesApi;
  docsApi: DocsApi;
  members: string[];
  dest?: string;
  prefs?: GroupPrefs;
}

export function Itinerary({ tripId, groupId, userId, api, datesApi, docsApi, members, dest, prefs }: ItineraryProps) {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: string; time?: string; title: string; place?: string; cat: ItineraryItemCat; url?: string; coords?: LatLng; endDate?: string; endTime?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefill, setPrefill] = useState<{ start?: string; end?: string }>({});

  // Booking confirmations, grouped under their activity cards
  const [docs, setDocs] = useState<TripDoc[]>([]);
  const [attachItem, setAttachItem] = useState<{ id: string; title: string } | null>(null);
  const [pendingDoc, setPendingDoc] = useState<File | null>(null);
  const [docBusy, setDocBusy] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const list = await api.listDays(tripId);
      setDays(list);
      docsApi.list(tripId).then(setDocs).catch(console.error);
      if (list.length === 0) {
        // Prefill the day-builder from the crew's confirmed (or leading) dates
        try {
          const options = await datesApi.list(tripId);
          const confirmed = members.length > 0
            ? options.find((o) => members.every((m) => o.votes.includes(m)))
            : undefined;
          const leading = confirmed
            ?? [...options].sort((a, b) => b.votes.length - a.votes.length).find((o) => o.votes.length > 0)
            ?? options[0];
          if (leading?.startDate && leading?.endDate) {
            setPrefill({ start: leading.startDate, end: leading.endDate });
          }
        } catch { /* dates are a nice-to-have here */ }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, datesApi, docsApi, members, tripId]);

  useEffect(() => { reload(); }, [reload]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="hdr-sub" style={{ textAlign: 'center', padding: 32 }}>Loading…</p>;
  }

  const saveDoc = async (input: { name: string; memberIds: string[] }) => {
    if (!pendingDoc || docBusy) return;
    setDocBusy(true);
    try {
      await docsApi.add(tripId, groupId, pendingDoc, { ...input, itemId: attachItem?.id });
      setPendingDoc(null);
      setAttachItem(null);
      setDocs(await docsApi.list(tripId));
      toast('Confirmation saved');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload that file");
    } finally {
      setDocBusy(false);
    }
  };

  const removeDoc = async (docId: string) => {
    try {
      await docsApi.remove(docId);
      setDocs(await docsApi.list(tripId));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete the document");
    }
  };

  // No days yet — set up the day-by-day plan from a date range
  if (days.length === 0) {
    return <SetupDays initialStart={prefill.start} initialEnd={prefill.end} onSetup={(start, end) => run(() => api.setupDays(tripId, groupId, start, end))} />;
  }

  const day = days.find((d) => d.n === selectedDay) ?? days[0];

  // Ranged items (stay check-out, flight return) land back on the calendar:
  // an item whose end_date matches this day shows as a closing entry, and
  // stays spanning this day show as a "staying" chip.
  const allItems = days.flatMap((d) => d.items.map((item) => ({ item, dayIso: d.iso })));
  const closingToday = day.iso
    ? allItems.filter(({ item }) => item.endDate === day.iso && (item.cat === 'stay' || item.cat === 'travel'))
    : [];
  const stayingToday = day.iso
    ? allItems.filter(({ item, dayIso }) =>
        item.cat === 'stay' && item.endDate && dayIso &&
        dayIso < day.iso! && day.iso! < item.endDate)
    : [];

  // One timeline: the day's own plans plus check-outs/returns landing today,
  // all sorted by time of day (untimed entries last).
  const timeline: Array<{ kind: 'start' | 'end'; item: ItineraryItem }> = [
    ...day.items.map((item) => ({ kind: 'start' as const, item })),
    ...closingToday.map(({ item }) => ({ kind: 'end' as const, item })),
  ].sort((a, b) => {
    const ta = a.kind === 'start' ? a.item.time : a.item.endTime ?? null;
    const tb = b.kind === 'start' ? b.item.time : b.item.endTime ?? null;
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta - tb;
  });

  return (
    <>
      {/* Day strip */}
      <div style={{ overflowX: 'auto', padding: '0 var(--pad) 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, width: 'max-content' }}>
          {days.map((d) => {
            const on = d.n === day.n;
            const hasDot = d.items.length > 0;
            return (
              <button
                key={d.id}
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
          <p className="eyebrow">{day.date || `Day ${day.n}`}</p>
          <p className="sec-title">{day.title}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {day.area && (
              <span className="chip" style={{ height: 26, fontSize: 11.5 }}>
                <Icon name="map-pin" size={11} color="var(--ink-soft)" /> {day.area}
              </span>
            )}
            {stayingToday.map(({ item }) => (
              <span key={item.id} className="chip olive" style={{ height: 26, fontSize: 11.5 }}>
                <Icon name="bed" size={11} color="var(--olive-ink)" /> {item.title}
              </span>
            ))}
          </div>
        </div>

        {/* Map — real pins (numbered in time order) once items carry coordinates */}
        {day.items.some((i) => i.coords) ? (
          <div style={{ marginBottom: 16 }}>
            <ItineraryMap items={day.items} />
          </div>
        ) : day.items.length > 0 && (
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
        )}

        {/* Timeline */}
        {timeline.length > 0 ? (
          <div style={{ position: 'relative', paddingLeft: 48 }}>
            <div style={{ position: 'absolute', left: 20, top: 20, bottom: 20, width: 1.5, background: 'var(--line-2)' }} />

            {timeline.map((entry) => {
              if (entry.kind === 'end') {
                return <ClosingCard key={`end-${entry.item.id}`} item={entry.item} />;
              }
              const item = entry.item;
              const itemDocs = docs.filter((d) => d.itemId === item.id);
              return (
              <div key={item.id} style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{ position: 'absolute', left: -48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 14 }}>
                  <p style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatItemTime(item)}</p>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: CAT_COLORS[item.cat]?.bg ?? 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={CAT_ICONS[item.cat] ?? 'map-pin'} size={14} color={CAT_COLORS[item.cat]?.fg ?? 'var(--ink-soft)'} />
                  </div>
                </div>

                <div className="card" style={{ padding: '12px var(--cardpad)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600 }}>{item.title}</p>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => { setAttachItem({ id: item.id, title: item.title }); docFileRef.current?.click(); }}
                        aria-label={'Attach confirmation to ' + item.title}
                        title="Attach a booking confirmation"
                        style={{ opacity: 0.5, padding: 2 }}
                      >
                        <Icon name="paperclip" size={13} color="var(--ink-soft)" />
                      </button>
                      <button
                        onClick={() => setEditItem({
                          id: item.id,
                          time: item.time !== null ? timeToHHMM(item.time) : undefined,
                          title: item.title,
                          place: item.place || undefined,
                          cat: item.cat,
                          url: item.url,
                          coords: item.coords,
                          endDate: item.endDate,
                          endTime: item.endTime != null ? timeToHHMM(item.endTime) : undefined,
                        })}
                        aria-label="Edit plan"
                        style={{ opacity: 0.5, padding: 2 }}
                      >
                        <Icon name="edit" size={13} color="var(--ink-soft)" />
                      </button>
                      {item.who === userId && (
                        <button
                          onClick={() => run(() => api.removeItem(item.id))}
                          aria-label="Remove plan"
                          style={{ opacity: 0.45, padding: 2 }}
                        >
                          <Icon name="x" size={13} color="var(--ink-soft)" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {item.place && (
                      <>
                        <Icon name="map-pin" size={11} color="var(--ink-faint)" />
                        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{item.place}</p>
                      </>
                    )}
                    {item.endDate && (
                      <span className="chip" style={{ height: 22, fontSize: 10.5 }}>
                        <Icon name="calendar" size={10} color="var(--ink-soft)" />
                        {item.cat === 'stay' ? 'until ' : 'returns '}{formatShortDate(item.endDate)}
                        {item.endTime != null ? ` · ${timeToHHMM(item.endTime)}` : ''}
                      </span>
                    )}
                    {item.url && (
                      <a
                        className="chip terra"
                        style={{ height: 24, fontSize: 11, textDecoration: 'none' }}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icon name="file" size={10} color="var(--terra-ink)" /> Book
                      </a>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex' }}>
                      <Avatar userId={item.who} size="sm" />
                    </div>
                  </div>
                  {itemDocs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
                      {itemDocs.map((doc) => (
                        <DocRow key={doc.id} doc={doc} canDelete={doc.who === userId} onDelete={() => removeDoc(doc.id)} />
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-2)' }}>
                    <button
                      onClick={() => run(() => api.toggleLike(item.id, item.liked))}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ink-soft)' }}
                    >
                      <Icon name="heart" size={15} color={item.liked ? 'var(--terra)' : 'var(--ink-faint)'} fill={item.liked ? 'var(--terra)' : 'none'} />
                      {item.likes > 0 ? item.likes : ''}
                    </button>
                  </div>
                </div>
              </div>
              );
            })}

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
          onClick={() => setAddOpen(true)}
        >
          <Icon name="plus" size={14} color="var(--ink)" />
          Add a plan to Day {day.n}
        </button>

        <div style={{ height: 20 }} />
      </div>

      <AddItemSheet
        open={addOpen || !!editItem}
        dayN={day.n}
        dayDate={day.date}
        dayIso={day.iso}
        tripId={tripId}
        dest={dest}
        prefs={prefs}
        initial={editItem}
        onClose={() => { setAddOpen(false); setEditItem(null); }}
        onAdd={(input, startDate) => {
          const editingId = editItem?.id;
          setAddOpen(false);
          setEditItem(null);
          // A check-in/departure date places the plan on that calendar day
          let targetDay = day;
          if (!editingId && startDate) {
            const match = days.find((d) => d.iso === startDate);
            if (match) {
              targetDay = match;
              if (match.n !== day.n) {
                setSelectedDay(match.n);
                toast(`Added to Day ${match.n} · ${match.date}`);
              }
            } else {
              toast(`${formatShortDate(startDate)} isn't in the trip days — added to Day ${day.n}`);
            }
          }
          run(() => (editingId ? api.updateItem(editingId, input) : api.addItem(targetDay.id, input)));
        }}
      />

      {/* Booking confirmation upload (paperclip on a plan card) */}
      <input
        ref={docFileRef}
        type="file"
        accept="application/pdf,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPendingDoc(f);
          e.target.value = '';
        }}
      />
      <DocUploadSheet
        file={pendingDoc}
        members={members}
        itemTitle={attachItem?.title}
        busy={docBusy}
        onSave={saveDoc}
        onClose={() => { setPendingDoc(null); setAttachItem(null); }}
      />
    </>
  );
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// A stay's check-out or a flight's return landing on this day's timeline.
function ClosingCard({ item }: { item: ItineraryItem }) {
  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <div style={{ position: 'absolute', left: -48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, paddingTop: 14 }}>
        <p style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {item.endTime != null ? timeToHHMM(item.endTime) : '–'}
        </p>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: CAT_COLORS[item.cat]?.bg ?? 'var(--surface-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={CAT_ICONS[item.cat] ?? 'map-pin'} size={14} color={CAT_COLORS[item.cat]?.fg ?? 'var(--ink-soft)'} />
        </div>
      </div>
      <div className="card" style={{ padding: '12px var(--cardpad)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`chip ${item.cat === 'stay' ? 'olive' : 'terra'}`} style={{ height: 22, fontSize: 10.5 }}>
            {item.cat === 'stay' ? 'Check-out' : 'Return'}
          </span>
          <p style={{ fontSize: 14.5, fontWeight: 600, flex: 1, minWidth: 0 }}>{item.title}</p>
          <Avatar userId={item.who} size="sm" />
        </div>
        {item.place && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Icon name="map-pin" size={11} color="var(--ink-faint)" />
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{item.place}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SetupDays({ initialStart, initialEnd, onSetup }: {
  initialStart?: string; initialEnd?: string;
  onSetup: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState(initialStart ?? '');
  const [end, setEnd] = useState(initialEnd ?? '');
  // Dates can arrive after first render (fetched from the votes)
  useEffect(() => {
    if (initialStart) setStart((v) => v || initialStart);
    if (initialEnd) setEnd((v) => v || initialEnd);
  }, [initialStart, initialEnd]);
  const valid = start && end && end >= start;

  return (
    <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
      <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ margin: '0 auto 10px', display: 'flex', justifyContent: 'center' }}>
          <Icon name="route" size={28} color="var(--terra)" />
        </div>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 19, marginBottom: 6 }}>Build your day-by-day plan</p>
        <p className="hdr-sub" style={{ marginBottom: 18 }}>
          Set the trip dates and Jaunt lays out a card for every day.{initialStart ? " We've pre-filled the crew's top-voted dates." : ""}
        </p>
        <div style={{ display: 'flex', gap: 10, textAlign: 'left' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>First day</label>
            <input className="input" type="date" value={start} onChange={(e) => { const v = e.target.value; setStart(v); if (v && (!end || end < v)) setEnd(v); }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Last day</label>
            <input className="input" type="date" value={end} min={start || undefined} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <button
          className="btn"
          disabled={!valid}
          style={{ width: '100%', marginTop: 18 }}
          onClick={() => onSetup(start, end)}
        >
          Create the days
        </button>
      </div>
    </div>
  );
}

function AddItemSheet({ open, dayN, dayDate, dayIso, tripId, dest, prefs, initial, onClose, onAdd }: {
  open: boolean; dayN: number; dayDate?: string; dayIso?: string; tripId: string;
  dest?: string; prefs?: GroupPrefs;
  initial?: { id: string; time?: string; title: string; place?: string; cat: ItineraryItemCat; url?: string; coords?: LatLng; endDate?: string; endTime?: string } | null;
  onClose: () => void;
  onAdd: (input: ItineraryItemInput, startDate?: string) => void;
}) {
  // Type is chosen first; the detail step follows (edits jump straight there).
  const [step, setStep] = useState<'type' | 'detail'>('type');
  const [cat, setCat] = useState<ItineraryItemCat>('activity');
  const [title, setTitle] = useState('');
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('');
  const [url, setUrl] = useState('');
  const [coords, setCoords] = useState<LatLng | undefined>(undefined);
  const [startDate, setStartDate] = useState(''); // check-in / departure
  const [endDate, setEndDate] = useState('');     // check-out / return
  const [endTime, setEndTime] = useState('');     // check-out / return time
  const [ideas, setIdeas] = useState<AiSuggestion[] | null>(null);
  const [loadingIdeas, setLoadingIdeas] = useState(false);

  // Hydrate for edit mode (or clear for create) whenever the sheet opens
  useEffect(() => {
    if (!open) return;
    setStep(initial ? 'detail' : 'type');
    setTitle(initial?.title ?? '');
    setPlace(initial?.place ?? '');
    setTime(initial?.time ?? '');
    setCat(initial?.cat ?? 'activity');
    setUrl(initial?.url ?? '');
    setCoords(initial?.coords);
    setStartDate(dayIso ?? '');
    setEndDate(initial?.endDate ?? '');
    setEndTime(initial?.endTime ?? '');
    setIdeas(null);
  }, [open, initial, dayIso]);

  const ranged = cat === 'stay' || cat === 'travel';
  const dateLabels = cat === 'stay'
    ? { start: 'Check-in', end: 'Check-out', endTime: 'Check-out time' }
    : { start: 'Departure', end: 'Return (optional)', endTime: 'Return time' };

  const askAi = async () => {
    const where = [place.trim(), dest].filter(Boolean).join(', ') || 'our destination';
    const when = dayDate ? ` around ${dayDate}` : '';
    const hint = title.trim() ? ` They have in mind: "${title.trim()}".` : '';
    const queries: Record<ItineraryItemCat, string> = {
      travel: `Flights or transport options to ${where}${when} — a few realistic routes with rough indicative prices.${hint}`,
      food: `Well-reviewed restaurants in ${where} worth booking${when}.${hint}`,
      stay: `Great places to stay in ${where}.${hint}`,
      beach: `Best beaches or outdoor spots around ${where}.${hint}`,
      activity: `Top-rated things to do in ${where}${when}.${hint}`,
    };
    setLoadingIdeas(true);
    setIdeas(null);
    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queries[cat], dest, prefs, tripId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? 'The assistant is unavailable right now');
      setIdeas(body?.suggestions ?? []);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'The assistant is unavailable right now');
    } finally {
      setLoadingIdeas(false);
    }
  };

  const pickIdea = (idea: AiSuggestion) => {
    setTitle(idea.title + (idea.price ? ` (${idea.price})` : ''));
    setPlace(idea.area);
    if (idea.time) setTime(idea.time);
    setCoords(idea.lat !== undefined && idea.lng !== undefined ? { lat: idea.lat, lng: idea.lng } : undefined);
    setIdeas(null);
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
        {step === 'type' ? (
          <>
            <h2 className="sec-title" style={{ marginBottom: 4 }}>Add to Day {dayN}</h2>
            <p className="hdr-sub" style={{ marginBottom: 16 }}>First, what kind of plan is it?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {CATS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCat(c.id); setStep('detail'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', background: 'var(--surface-2)',
                    borderRadius: 12, textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: CAT_COLORS[c.id]?.bg ?? 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={CAT_ICONS[c.id] ?? 'map-pin'} size={16} color={CAT_COLORS[c.id]?.fg ?? 'var(--ink-soft)'} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {!initial && (
                <button onClick={() => setStep('type')} aria-label="Back to plan types" style={{ display: 'flex' }}>
                  <Icon name="arrow-left" size={18} color="var(--ink-soft)" />
                </button>
              )}
              <h2 className="sec-title">{initial ? 'Edit plan' : `Add to Day ${dayN}`}</h2>
              <button
                className="chip terra"
                style={{ marginLeft: 'auto', fontSize: 11.5, gap: 5 }}
                onClick={() => !initial && setStep('type')}
              >
                <Icon name={CAT_ICONS[cat]} size={12} color="var(--terra-ink)" /> {CATS.find((c) => c.id === cat)?.label}
              </button>
            </div>

            <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>What&apos;s the plan?</label>
            <input className="input" placeholder="e.g. Sunset surf lesson" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <div style={{ flex: 1.6 }}>
                <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Approx location <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
                <input className="input" placeholder="e.g. Selong Belanak" value={place} onChange={(e) => setPlace(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>
                  {cat === 'stay' ? 'Check-in time' : cat === 'travel' ? 'Departure time' : 'Time'}
                </label>
                <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            </div>

            {/* Stays get check-in/check-out; flights get departure/return.
                The dates place the plan on the matching calendar days. */}
            {ranged && (
              <>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{dateLabels.start}</label>
                    <input
                      className="input"
                      type="date"
                      value={startDate}
                      disabled={!!initial}
                      onChange={(e) => {
                        const v = e.target.value;
                        setStartDate(v);
                        if (v && endDate && endDate < v) setEndDate(v);
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{dateLabels.end}</label>
                    <input
                      className="input"
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                {endDate && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{dateLabels.endTime}</label>
                      <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}

            <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Booking link <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
            <input className="input" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />

            {/* AI assist */}
            <button
              className="btn ghost sm"
              style={{ width: '100%', marginTop: 16, gap: 6 }}
              disabled={loadingIdeas}
              onClick={askAi}
            >
              <Icon name="sparkles" size={14} color="var(--gold)" />
              {loadingIdeas ? 'Asking the trip assistant…' : `Suggest ${cat === 'food' ? 'restaurants' : cat === 'travel' ? 'flights & transport' : cat === 'stay' ? 'stays' : 'ideas'} with AI`}
            </button>
            {ideas && ideas.length === 0 && (
              <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 8 }}>
                No suggestions this time — try asking in Discover.
              </p>
            )}
            {ideas && ideas.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {ideas.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => pickIdea(idea)}
                    style={{
                      textAlign: 'left', padding: '10px 12px', background: 'var(--surface-2)',
                      borderRadius: 12, border: '1px solid var(--line-2)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <p style={{ fontSize: 13.5, fontWeight: 600 }}>{idea.title}</p>
                      {idea.price && <p style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{idea.price}</p>}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                      {[idea.time, idea.area].filter(Boolean).join(' · ')} — {idea.detail}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {coords && (
              <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="map-pin" size={11} color="var(--ink-faint)" />
                Pinned at {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} — shows on the day map
              </p>
            )}

            <button
              className="btn"
              disabled={!title.trim()}
              style={{ width: '100%', marginTop: 24 }}
              onClick={() => {
                onAdd(
                  {
                    time: time || undefined, title: title.trim(), place: place.trim() || undefined,
                    cat, url: url.trim() || undefined, lat: coords?.lat, lng: coords?.lng,
                    endDate: ranged && endDate ? endDate : undefined,
                    endTime: ranged && endDate && endTime ? endTime : undefined,
                  },
                  ranged && startDate ? startDate : undefined,
                );
                setTitle(''); setPlace(''); setTime(''); setCat('activity'); setUrl('');
                setCoords(undefined); setStartDate(''); setEndDate(''); setEndTime('');
              }}
            >
              {initial ? 'Save changes' : 'Add to the plan'}
            </button>
          </>
        )}
      </div>
    </Sheet>
  );
}
