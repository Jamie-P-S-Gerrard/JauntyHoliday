'use client';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Placeholder } from '@/components/ui/Placeholder';
import type { BoardApi, BoardItem } from '@/types';

const BOARD_TINTS = ['#caa37a', '#d98a8a', '#7fa0c0', '#9aa56a', '#b07a9a', '#c77f6a', '#7fa39a', '#cf9a5e'];

interface MoodBoardProps {
  tripId: string;
  groupId: string;
  userId: string;
  api: BoardApi;
}

export function MoodBoard({ tripId, groupId, userId, api }: MoodBoardProps) {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setItems(await api.list(tripId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, tripId]);

  useEffect(() => { reload(); }, [reload]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
      <div className="sec-head">
        <p className="hdr-sub">Pin the feeling of this trip — everyone can add.</p>
        <button className="btn sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={14} color="#fff" /> Pin
        </button>
      </div>

      {loading ? (
        <p className="hdr-sub" style={{ textAlign: 'center', padding: 24 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', marginTop: 8 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 6 }}>An empty canvas</p>
          <p className="hdr-sub">Pin the vibes, colours, and must-dos you&apos;re dreaming of.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 24 }}>
          {items.map((item, i) => (
            <div key={item.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: i % 3 === 0 ? 120 : 88 }}>
                <Placeholder tint={item.tint} style={{ position: 'absolute', inset: 0 }} />
                {item.who === userId && (
                  <button
                    onClick={() => run(() => api.remove(item.id))}
                    aria-label="Remove pin"
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 22, height: 22,
                      borderRadius: '50%', background: 'rgba(0,0,0,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon name="x" size={12} color="#fff" />
                  </button>
                )}
                <div style={{ position: 'absolute', bottom: 6, left: 8 }}>
                  <Avatar userId={item.who} size="sm" />
                </div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <p style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{item.title}</p>
                {item.note && (
                  <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.4 }}>{item.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddPinSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(title, note, tint) => {
          setAddOpen(false);
          run(() => api.add(tripId, groupId, { title, note, tint }));
        }}
      />
      <div style={{ height: 24 }} />
    </div>
  );
}

function AddPinSheet({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (title: string, note: string | undefined, tint: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [tint, setTint] = useState(BOARD_TINTS[0]);

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 20 }}>Pin to the board</h2>
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>What&apos;s the vibe?</label>
      <input
        className="input"
        placeholder="e.g. Sunset beach bonfires"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '16px 0 6px' }}>Details <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
      <input
        className="input"
        placeholder="a link, a place, a note to the crew"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '16px 0 8px' }}>Colour</label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {BOARD_TINTS.map((t) => (
          <button
            key={t}
            aria-label={`colour ${t}`}
            onClick={() => setTint(t)}
            style={{
              width: 34, height: 34, borderRadius: 12, background: t,
              border: tint === t ? '2.5px solid var(--ink)' : '2.5px solid transparent',
            }}
          />
        ))}
      </div>
      <button
        className="btn"
        disabled={!title.trim()}
        style={{ width: '100%', marginTop: 24 }}
        onClick={() => {
          onAdd(title.trim(), note.trim() || undefined, tint);
          setTitle(''); setNote(''); setTint(BOARD_TINTS[0]);
        }}
      >
        Pin it
      </button>
    </Sheet>
  );
}
