'use client';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { BUDGET, USER_NAMES } from '@/lib/data';
import type { BudgetView, Booking } from '@/types';

const GROUP_MEMBERS = ['c', 'j'];

export function BudgetScreen() {
  const [budget, setBudget] = useState(BUDGET);
  const [view, setView] = useState<BudgetView>('split');
  const [addOpen, setAddOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(budget.importEmail).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const addBooking = (b: Booking) => {
    setBudget((prev) => ({
      ...prev,
      bookings: [...prev.bookings, b],
      spent: prev.spent + (b.cost ?? 0),
    }));
    setAddOpen(false);
  };

  const pct = Math.round((budget.spent / budget.total) * 100);
  const left = budget.total - budget.spent;

  // Split logic
  const bookedBookings = budget.bookings.filter((b) => b.status === 'booked');
  const paid: Record<string, number> = {};
  GROUP_MEMBERS.forEach((m) => { paid[m] = 0; });
  bookedBookings.forEach((b) => { if (b.who) paid[b.who] = (paid[b.who] ?? 0) + (b.cost ?? 0); });
  const totalPaid = Object.values(paid).reduce((a, b) => a + b, 0);
  const share = totalPaid / GROUP_MEMBERS.length;

  const settleUp = GROUP_MEMBERS
    .map((m) => ({ id: m, diff: paid[m] - share }))
    .filter((x) => x.diff !== 0);
  const ower = settleUp.find((x) => x.diff < 0);
  const owed = settleUp.find((x) => x.diff > 0);

  return (
    <div className="screen">
      <div className="screen-header" style={{ paddingBottom: 12 }}>
        <h1 className="hdr-title"><em>Budget</em></h1>
      </div>

      <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
        {/* Summary card */}
        <div className="card" style={{ padding: 'var(--cardpad)', marginBottom: 'var(--gap)' }}>
          {/* Split / Joint toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 10, padding: 3, gap: 2, marginBottom: 16 }}>
            {(['split', 'joint'] as BudgetView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  flex: 1, height: 30, borderRadius: 8,
                  background: view === v ? 'var(--surface)' : 'transparent',
                  boxShadow: view === v ? '0 1px 4px rgba(44,40,35,0.1)' : 'none',
                  fontSize: 12.5, fontWeight: view === v ? 700 : 500,
                  color: view === v ? 'var(--ink)' : 'var(--ink-soft)',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 4 }}>Spent so far</p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 600, lineHeight: 1, color: 'var(--ink)', marginBottom: 4 }}>
            {budget.currency}{budget.spent.toLocaleString()}
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 16 }}>
            of {budget.currency}{budget.total.toLocaleString()} · {budget.currency}{left.toLocaleString()} left
          </p>

          {/* Stacked bar */}
          <div style={{ height: 10, borderRadius: 99, overflow: 'hidden', display: 'flex', marginBottom: 8 }}>
            {budget.cats.map((cat) => (
              <div
                key={cat.name}
                style={{
                  height: '100%',
                  width: `${(cat.spent / budget.total) * 100}%`,
                  background: cat.color,
                  minWidth: cat.spent > 0 ? 2 : 0,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
            {pct}% used · Oct 3 – 12, 2026
          </p>

          {view === 'split' ? (
            <SplitView paid={paid} share={share} ower={ower} owed={owed} currency={budget.currency} />
          ) : (
            <JointView paid={paid} total={totalPaid} currency={budget.currency} />
          )}
        </div>

        {/* By category */}
        <div className="card" style={{ padding: 'var(--cardpad)', marginBottom: 'var(--gap)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>By category</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {budget.cats.map((cat) => (
              <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14 }}>{cat.name}</span>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}>
                  {budget.currency}{cat.spent.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bookings */}
        <div style={{ marginBottom: 'var(--gap)' }}>
          <div className="sec-head">
            <p className="sec-title">Bookings</p>
            <button
              className="btn sm"
              style={{ gap: 6 }}
              onClick={() => setAddOpen(true)}
            >
              <Icon name="plus" size={14} color="#fff" /> Add
            </button>
          </div>

          {/* Email import banner */}
          <div className="card" style={{ padding: 'var(--cardpad)', marginBottom: 10, background: 'var(--surface-2)', border: '1px solid var(--line-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Icon name="mail" size={16} color="var(--ink-soft)" />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Forward booking emails here</p>
            </div>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 500, color: 'var(--terra)', marginBottom: 10 }}>
              {budget.importEmail}
            </p>
            <button
              className="btn ghost sm"
              style={{ gap: 6 }}
              onClick={copyEmail}
            >
              <Icon name="copy" size={13} color="var(--ink)" />
              {copied ? 'Copied!' : 'Copy address'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {budget.bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} currency={budget.currency} />
            ))}
          </div>
        </div>

        <div style={{ height: 20 }} />
      </div>

      <AddBookingSheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={addBooking} importEmail={budget.importEmail} />
    </div>
  );
}

function SplitView({ paid, share, ower, owed, currency }: {
  paid: Record<string, number>; share: number;
  ower?: { id: string; diff: number }; owed?: { id: string; diff: number };
  currency: string;
}) {
  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-2)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {GROUP_MEMBERS.map((m) => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar userId={m} size="sm" />
            <span style={{ flex: 1, fontSize: 14 }}>{USER_NAMES[m]}</span>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600 }}>{currency}{(paid[m] ?? 0).toLocaleString()} paid</p>
              <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>share {currency}{Math.round(share).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
      {ower && owed ? (
        <div style={{ background: 'var(--terra-bg)', borderRadius: 10, padding: '10px 12px' }}>
          <p style={{ fontSize: 13.5, color: 'var(--terra-ink)', fontWeight: 600 }}>
            {USER_NAMES[ower.id]} owes {USER_NAMES[owed.id]}{' '}
            {currency}{Math.abs(Math.round(ower.diff)).toLocaleString()}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--olive-bg)', borderRadius: 10, padding: '10px 12px' }}>
          <p style={{ fontSize: 13.5, color: 'var(--olive-ink)', fontWeight: 600 }}>All square</p>
        </div>
      )}
    </div>
  );
}

function JointView({ paid, total, currency }: { paid: Record<string, number>; total: number; currency: string }) {
  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-2)' }}>
      <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8 }}>Shared pot — {currency}{total.toLocaleString()} contributed</p>
      {/* Two-color bar */}
      <div style={{ height: 8, borderRadius: 99, overflow: 'hidden', display: 'flex', marginBottom: 12 }}>
        {GROUP_MEMBERS.map((m, i) => (
          <div
            key={m}
            style={{
              height: '100%',
              width: total > 0 ? `${((paid[m] ?? 0) / total) * 100}%` : '50%',
              background: i === 0 ? 'var(--terra)' : 'var(--olive)',
              minWidth: 2,
            }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GROUP_MEMBERS.map((m) => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar userId={m} size="sm" />
            <span style={{ flex: 1, fontSize: 14 }}>{USER_NAMES[m]}</span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 15, fontWeight: 600 }}>
              {currency}{(paid[m] ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BookingCard({ booking, currency }: { booking: Booking; currency: string }) {
  const STATUS_STYLES: Record<string, { label: string; class: string }> = {
    booked:  { label: 'Booked',   class: 'chip olive' },
    pending: { label: 'Pending',  class: 'chip gold' },
    todo:    { label: 'To do',    class: 'chip' },
  };
  const s = STATUS_STYLES[booking.status] ?? STATUS_STYLES.todo;

  return (
    <div className="card" style={{ padding: 'var(--cardpad)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div>
          <p style={{ fontSize: 14.5, fontWeight: 600 }}>{booking.title}</p>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{booking.meta}</p>
        </div>
        <span className={s.class} style={{ fontSize: 11.5, flexShrink: 0 }}>
          {booking.status === 'booked' && <Icon name="check" size={11} color="var(--olive-ink)" strokeWidth={2.5} />}
          {s.label}
        </span>
      </div>

      {/* Files */}
      {booking.files.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {booking.files.map((f) => (
            <span key={f} className="chip" style={{ fontSize: 11.5, height: 26 }}>
              <Icon name="paperclip" size={11} color="var(--ink-soft)" /> {f}
            </span>
          ))}
          {booking.from === 'email' && (
            <span className="chip" style={{ fontSize: 11.5, height: 26 }}>
              <Icon name="mail" size={11} color="var(--ink-soft)" /> via email
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid var(--line-2)' }}>
        {booking.who ? (
          <>
            <Avatar userId={booking.who} size="sm" />
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', flex: 1 }}>
              {USER_NAMES[booking.who]}
              {booking.ref && <> · {booking.ref}</>}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', flex: 1 }}>Unassigned</span>
        )}
        {booking.cost ? (
          <span style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600 }}>
            {currency}{booking.cost.toLocaleString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AddBookingSheet({ open, onClose, onAdd, importEmail }: {
  open: boolean; onClose: () => void;
  onAdd: (b: Booking) => void; importEmail: string;
}) {
  const [mode, setMode] = useState<'email' | 'manual'>('manual');
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onAdd({
      id: `b${Date.now()}`, title: title.trim(),
      meta: '', cost: cost ? parseFloat(cost) : undefined,
      status: 'pending', who: 'j', files: [],
    });
    setTitle(''); setCost('');
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 16 }}>Add a booking</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['manual', 'email'] as const).map((m) => (
          <button
            key={m}
            className={`chip${mode === m ? ' on' : ''}`}
            style={{ flex: 1, justifyContent: 'center', height: 36 }}
            onClick={() => setMode(m)}
          >
            {m === 'email' ? 'From email' : 'Manually'}
          </button>
        ))}
      </div>

      {mode === 'email' ? (
        <div>
          <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 16 }}>
            Forward your booking confirmation emails to:
          </p>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500, color: 'var(--terra)', marginBottom: 16 }}>
            {importEmail}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
            We'll automatically extract the booking details, reference, cost, and any attached PDFs.
          </p>
        </div>
      ) : (
        <>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Title</label>
          <input className="input" placeholder="e.g. Snorkel trip" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Cost (optional)</label>
          <input className="input" placeholder="$0" type="number" value={cost} onChange={(e) => setCost(e.target.value)} />
          <button className="btn" disabled={!title.trim()} style={{ width: '100%', marginTop: 20 }} onClick={submit}>
            Add booking
          </button>
        </>
      )}
    </Sheet>
  );
}
