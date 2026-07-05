'use client';
import { useCallback, useEffect, useState } from 'react';
import { AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { ChatSheet } from '@/components/ui/ChatSheet';
import { toast } from '@/components/ui/Toast';
import { formatDayLabel } from '@/lib/dates';
import type { ChatApi, EventInput, EventPart, EventsApi, GroupEvent } from '@/types';

interface GroupEventsProps {
  groupId: string;
  userId: string;
  api: EventsApi;
  chatApi: ChatApi;
}

export function GroupEvents({ groupId, userId, api, chatApi }: GroupEventsProps) {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<GroupEvent | null>(null);
  const [chatEvent, setChatEvent] = useState<GroupEvent | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setEvents(await api.list(groupId));
    } catch (e) {
      console.error(e);
    }
  }, [api, groupId]);

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

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (ev: GroupEvent) => { setEditing(ev); setSheetOpen(true); };

  return (
    <>
      <div className="sec-head">
        <p className="eyebrow">Events</p>
        <button className="btn ghost sm" onClick={openCreate}>
          <Icon name="plus" size={14} color="var(--ink)" /> Propose
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {events.length === 0 && (
          <div className="card" style={{ padding: 'var(--cardpad)', textAlign: 'center' }}>
            <p className="hdr-sub">Propose a night out, a hike, a dinner — one date, quick yes/no.</p>
          </div>
        )}
        {events.map((ev) => {
          const going = ev.going.includes(userId);
          return (
            <div key={ev.id} className="card" style={{ padding: 'var(--cardpad)' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                {/* Date badge */}
                <div style={{
                  width: 52, minHeight: 52, borderRadius: 12, background: ev.tint,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', flexShrink: 0, padding: '6px 2px', alignSelf: 'flex-start',
                }}>
                  {ev.date ? (
                    <>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.85 }}>
                        {formatDayLabel(ev.date).split(' ')[0]}
                      </p>
                      <p style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>
                        {formatDayLabel(ev.date).split(' ')[1]}
                      </p>
                    </>
                  ) : (
                    <Icon name="calendar" size={18} color="#fff" />
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{ev.title}</p>
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => openEdit(ev)} aria-label="Edit event" style={{ opacity: 0.5, padding: 2 }}>
                        <Icon name="edit" size={13} color="var(--ink-soft)" />
                      </button>
                      {ev.who === userId && (
                        <button onClick={() => run(() => api.remove(ev.id))} aria-label="Remove event" style={{ opacity: 0.45, padding: 2 }}>
                          <Icon name="x" size={13} color="var(--ink-soft)" />
                        </button>
                      )}
                    </div>
                  </div>
                  {ev.note && (
                    <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.45 }}>{ev.note}</p>
                  )}

                  {/* Parts timeline: the event's own details are part 1 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    <PartRow
                      n={1}
                      title={ev.venue ? `${ev.title} · ${ev.venue}` : ev.title}
                      time={ev.time}
                      venueUrl={ev.venueUrl}
                      ticketUrl={ev.ticketUrl}
                      only={ev.parts.length === 0}
                    />
                    {ev.parts.map((p, i) => (
                      <PartRow
                        key={p.id ?? i}
                        n={i + 2}
                        title={p.venue ? `${p.title} · ${p.venue}` : p.title}
                        time={p.time}
                        venueUrl={p.venueUrl}
                        ticketUrl={p.ticketUrl}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer: RSVPs + chat */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-2)' }}>
                {ev.going.length > 0 && <AvatarStack userIds={ev.going} size="sm" />}
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {ev.going.length > 0 ? `${ev.going.length} going` : 'No RSVPs yet'}
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="btn ghost sm" style={{ height: 32 }} onClick={() => setChatEvent(ev)}>
                    <Icon name="message-square" size={13} color="var(--ink)" /> Chat
                  </button>
                  <button
                    className={`btn sm${going ? ' olive' : ''}`}
                    style={{ height: 32 }}
                    onClick={() => run(() => api.rsvp(ev.id, !going))}
                  >
                    {going ? (
                      <><Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> I&apos;m in</>
                    ) : (
                      "I'm in"
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EventSheet
        open={sheetOpen}
        event={editing}
        onClose={() => setSheetOpen(false)}
        onSave={(input) => {
          setSheetOpen(false);
          run(() => (editing ? api.update(editing.id, input) : api.add(groupId, input)));
        }}
      />

      {chatEvent && (
        <ChatSheet
          open={!!chatEvent}
          onClose={() => setChatEvent(null)}
          title={chatEvent.title}
          scope={{ groupId, eventId: chatEvent.id }}
          api={chatApi}
          userId={userId}
        />
      )}
    </>
  );
}

function PartRow({ n, title, time, venueUrl, ticketUrl, only }: {
  n: number; title: string; time?: string;
  venueUrl?: string; ticketUrl?: string; only?: boolean;
}) {
  const hasAnything = time || venueUrl || ticketUrl || !only;
  if (!hasAnything) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {!only && (
        <span style={{
          width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-2)',
          fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {n}
        </span>
      )}
      {time && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', flexShrink: 0 }}>{time}</span>}
      {!only && <span style={{ fontSize: 12.5, color: 'var(--ink)', minWidth: 0 }}>{title}</span>}
      {ticketUrl && (
        <a className="chip terra" style={{ height: 24, fontSize: 11, textDecoration: 'none' }} href={ticketUrl} target="_blank" rel="noreferrer">
          <Icon name="file" size={10} color="var(--terra-ink)" /> Tickets
        </a>
      )}
      {venueUrl && (
        <a className="chip" style={{ height: 24, fontSize: 11, textDecoration: 'none' }} href={venueUrl} target="_blank" rel="noreferrer">
          <Icon name="map-pin" size={10} color="var(--ink-soft)" /> Venue
        </a>
      )}
    </div>
  );
}

const EMPTY_PART: EventPart = { title: '', time: '', venue: '', venueUrl: '', ticketUrl: '' };

function EventSheet({ open, event, onClose, onSave }: {
  open: boolean; event: GroupEvent | null; onClose: () => void;
  onSave: (input: EventInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [venueUrl, setVenueUrl] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [note, setNote] = useState('');
  const [parts, setParts] = useState<EventPart[]>([]);

  // Hydrate when opening (create = blank, edit = the event's current values)
  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? '');
    setDate(event?.date ?? '');
    setTime(event?.time ?? '');
    setVenue(event?.venue ?? '');
    setVenueUrl(event?.venueUrl ?? '');
    setTicketUrl(event?.ticketUrl ?? '');
    setNote(event?.note ?? '');
    setParts(event?.parts.map((p) => ({ ...p })) ?? []);
  }, [open, event]);

  const setPart = (i: number, patch: Partial<EventPart>) =>
    setParts((prev) => prev.map((p, x) => (x === i ? { ...p, ...patch } : p)));

  const submit = () => {
    onSave({
      title: title.trim(),
      date: date || undefined,
      time: time.trim() || undefined,
      venue: venue.trim() || undefined,
      venueUrl: venueUrl.trim() || undefined,
      ticketUrl: ticketUrl.trim() || undefined,
      note: note.trim() || undefined,
      parts: parts
        .filter((p) => p.title.trim())
        .map((p) => ({
          ...p,
          title: p.title.trim(),
          time: p.time?.trim() || undefined,
          venue: p.venue?.trim() || undefined,
          venueUrl: p.venueUrl?.trim() || undefined,
          ticketUrl: p.ticketUrl?.trim() || undefined,
        })),
    });
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 4 }}>{event ? 'Edit event' : 'Propose an event'}</h2>
      <p className="hdr-sub" style={{ marginBottom: 18 }}>
        {event ? 'Changes are visible to the whole group, and tracked.' : 'One date, quick RSVPs — add parts for multi-stop plans.'}
      </p>

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>What are we doing?</label>
      <input className="input" placeholder="e.g. Dinner & a show" value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1.3 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>When</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Time</label>
          <input className="input" placeholder="e.g. 6:30pm" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Venue</label>
      <input className="input" placeholder="e.g. State Theatre" value={venue} onChange={(e) => setVenue(e.target.value)} />

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Ticket link</label>
          <input className="input" type="url" placeholder="https://…" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Venue link</label>
          <input className="input" type="url" placeholder="https://…" value={venueUrl} onChange={(e) => setVenueUrl(e.target.value)} />
        </div>
      </div>

      {/* Extra parts */}
      {parts.map((p, i) => (
        <div key={i} className="card" style={{ padding: '12px var(--cardpad)', marginTop: 14, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p className="eyebrow">Part {i + 2}</p>
            <button onClick={() => setParts((prev) => prev.filter((_, x) => x !== i))} aria-label={`Remove part ${i + 2}`} style={{ opacity: 0.5, padding: 2 }}>
              <Icon name="x" size={13} color="var(--ink-soft)" />
            </button>
          </div>
          <input className="input" placeholder="e.g. Late dinner" value={p.title} onChange={(e) => setPart(i, { title: e.target.value })} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="input" placeholder="Time" value={p.time ?? ''} style={{ flex: 0.7 }} onChange={(e) => setPart(i, { time: e.target.value })} />
            <input className="input" placeholder="Venue" value={p.venue ?? ''} style={{ flex: 1.3 }} onChange={(e) => setPart(i, { venue: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input className="input" type="url" placeholder="Ticket link" value={p.ticketUrl ?? ''} onChange={(e) => setPart(i, { ticketUrl: e.target.value })} />
            <input className="input" type="url" placeholder="Venue link" value={p.venueUrl ?? ''} onChange={(e) => setPart(i, { venueUrl: e.target.value })} />
          </div>
        </div>
      ))}

      <button
        className="btn ghost sm"
        style={{ width: '100%', marginTop: 14, gap: 6 }}
        onClick={() => setParts((prev) => [...prev, { ...EMPTY_PART }])}
      >
        <Icon name="plus" size={13} color="var(--ink)" /> Add another part (dinner, drinks, the show…)
      </button>

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Anything else?</label>
      <input className="input" placeholder="e.g. early dinner, then the 8pm session" value={note} onChange={(e) => setNote(e.target.value)} />

      <button className="btn" disabled={!title.trim()} style={{ width: '100%', marginTop: 24 }} onClick={submit}>
        {event ? 'Save changes' : 'Propose to the group'}
      </button>
    </Sheet>
  );
}
