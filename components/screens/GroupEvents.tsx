'use client';
import { useCallback, useEffect, useState } from 'react';
import { AvatarStack } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { ChatSheet } from '@/components/ui/ChatSheet';
import { toast } from '@/components/ui/Toast';
import { formatDayLabel } from '@/lib/dates';
import type { ChatApi, EventInput, EventsApi, GroupEvent } from '@/types';

interface GroupEventsProps {
  groupId: string;
  userId: string;
  api: EventsApi;
  chatApi: ChatApi;
}

export function GroupEvents({ groupId, userId, api, chatApi }: GroupEventsProps) {
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [newOpen, setNewOpen] = useState(false);
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

  return (
    <>
      <div className="sec-head">
        <p className="eyebrow">Events</p>
        <button className="btn ghost sm" onClick={() => setNewOpen(true)}>
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
                  color: '#fff', flexShrink: 0, padding: '6px 2px',
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
                    {ev.who === userId && (
                      <button onClick={() => run(() => api.remove(ev.id))} aria-label="Remove event" style={{ opacity: 0.45, padding: 2 }}>
                        <Icon name="x" size={13} color="var(--ink-soft)" />
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {[ev.time, ev.venue].filter(Boolean).join(' · ') || 'Details to come'}
                  </p>
                  {ev.note && (
                    <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6, lineHeight: 1.45 }}>{ev.note}</p>
                  )}

                  {/* Links */}
                  {(ev.ticketUrl || ev.venueUrl) && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {ev.ticketUrl && (
                        <a className="chip terra" style={{ height: 26, fontSize: 11.5, textDecoration: 'none' }} href={ev.ticketUrl} target="_blank" rel="noreferrer">
                          <Icon name="file" size={11} color="var(--terra-ink)" /> Tickets
                        </a>
                      )}
                      {ev.venueUrl && (
                        <a className="chip" style={{ height: 26, fontSize: 11.5, textDecoration: 'none' }} href={ev.venueUrl} target="_blank" rel="noreferrer">
                          <Icon name="map-pin" size={11} color="var(--ink-soft)" /> Venue
                        </a>
                      )}
                    </div>
                  )}
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

      <NewEventSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={(input) => {
          setNewOpen(false);
          run(() => api.add(groupId, input));
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

function NewEventSheet({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void; onCreate: (input: EventInput) => void;
}) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [venueUrl, setVenueUrl] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [note, setNote] = useState('');

  const submit = () => {
    onCreate({
      title: title.trim(),
      date: date || undefined,
      time: time.trim() || undefined,
      venue: venue.trim() || undefined,
      venueUrl: venueUrl.trim() || undefined,
      ticketUrl: ticketUrl.trim() || undefined,
      note: note.trim() || undefined,
    });
    setTitle(''); setDate(''); setTime(''); setVenue(''); setVenueUrl(''); setTicketUrl(''); setNote('');
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 4 }}>Propose an event</h2>
      <p className="hdr-sub" style={{ marginBottom: 18 }}>One date, quick RSVPs — dinner &amp; a show, a hike &amp; brunch…</p>

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

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Venue / restaurant</label>
      <input className="input" placeholder="e.g. Bar Totti's" value={venue} onChange={(e) => setVenue(e.target.value)} />

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Venue link <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
      <input className="input" type="url" placeholder="https://…" value={venueUrl} onChange={(e) => setVenueUrl(e.target.value)} />

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Ticket link <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
      <input className="input" type="url" placeholder="https://…" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} />

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Anything else?</label>
      <input className="input" placeholder="e.g. early dinner, then the 8pm session" value={note} onChange={(e) => setNote(e.target.value)} />

      <button className="btn" disabled={!title.trim()} style={{ width: '100%', marginTop: 24 }} onClick={submit}>
        Propose to the group
      </button>
    </Sheet>
  );
}
