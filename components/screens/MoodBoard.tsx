'use client';
import { toast } from '@/components/ui/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { Placeholder } from '@/components/ui/Placeholder';
import type { BoardApi, BoardItem, BoardItemKind } from '@/types';

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
      toast(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="scroll-area" style={{ padding: '0 var(--pad)' }}>
      <div className="sec-head">
        <p className="hdr-sub">Photos, notes, and ideas — pin the feeling of this trip.</p>
        <button className="btn sm" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={14} color="#fff" /> Pin
        </button>
      </div>

      {loading ? (
        <p className="hdr-sub" style={{ textAlign: 'center', padding: 24 }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', marginTop: 8 }}>
          <p style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 6 }}>An empty canvas</p>
          <p className="hdr-sub">Pin photos from your phone, sticky notes, and must-dos.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 24 }}>
          {items.map((item, i) => (
            <BoardTile
              key={item.id}
              item={item}
              rotate={item.kind === 'note' ? (i % 2 === 0 ? -1.2 : 1.4) : 0}
              tall={item.kind !== 'note' && i % 3 === 0}
              onRemove={item.who === userId ? () => run(() => api.remove(item.id)) : undefined}
            />
          ))}
        </div>
      )}

      <AddPinSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(input) => {
          setAddOpen(false);
          run(() => api.add(tripId, groupId, input));
        }}
      />
      <div style={{ height: 24 }} />
    </div>
  );
}

function BoardTile({ item, rotate, tall, onRemove }: {
  item: BoardItem; rotate: number; tall: boolean; onRemove?: () => void;
}) {
  const removeBtn = onRemove && (
    <button
      onClick={onRemove}
      aria-label="Remove pin"
      style={{
        position: 'absolute', top: 6, right: 6, width: 22, height: 22,
        borderRadius: '50%', background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
      }}
    >
      <Icon name="x" size={12} color="#fff" />
    </button>
  );

  // Sticky note: the whole tile is the tinted note
  if (item.kind === 'note') {
    return (
      <div
        className="card"
        style={{
          background: item.tint,
          border: 'none',
          minHeight: 110,
          padding: '14px 14px 12px',
          transform: `rotate(${rotate}deg)`,
          position: 'relative',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}
      >
        {removeBtn}
        <p style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15,
          lineHeight: 1.45, color: 'rgba(20,14,8,0.85)',
        }}>
          {item.title}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <Avatar userId={item.who} size="sm" />
        </div>
      </div>
    );
  }

  // Photo or idea tile
  return (
    <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'relative', height: tall ? 130 : 96 }}>
        {item.kind === 'photo' && item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.title}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Placeholder tint={item.tint} style={{ position: 'absolute', inset: 0 }} />
        )}
        {removeBtn}
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
  );
}

function AddPinSheet({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (input: { kind: BoardItemKind; title: string; note?: string; tint: string; imageFile?: File }) => void;
}) {
  const [kind, setKind] = useState<BoardItemKind>('photo');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [tint, setTint] = useState(BOARD_TINTS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return f ? URL.createObjectURL(f) : null;
    });
  };

  const reset = () => {
    setTitle(''); setNote(''); setTint(BOARD_TINTS[0]); pickFile(null);
  };

  const valid = kind === 'photo' ? !!file : !!title.trim();

  const submit = () => {
    onAdd({
      kind,
      title: kind === 'photo' ? (title.trim() || 'Photo') : title.trim(),
      note: note.trim() || undefined,
      tint,
      imageFile: kind === 'photo' ? file ?? undefined : undefined,
    });
    reset();
  };

  const KINDS: Array<{ id: BoardItemKind; label: string; icon: string }> = [
    { id: 'photo', label: 'Photo', icon: 'camera' },
    { id: 'note',  label: 'Note',  icon: 'message-square' },
    { id: 'idea',  label: 'Idea',  icon: 'sparkles' },
  ];

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 16 }}>Pin to the board</h2>

      {/* Kind selector */}
      <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 12, padding: 3, gap: 2, marginBottom: 18 }}>
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => setKind(k.id)}
            style={{
              flex: 1, height: 34, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: kind === k.id ? 'var(--surface)' : 'transparent',
              boxShadow: kind === k.id ? '0 1px 4px rgba(44,40,35,0.1)' : 'none',
              fontSize: 13, fontWeight: kind === k.id ? 700 : 500,
              color: kind === k.id ? 'var(--ink)' : 'var(--ink-soft)',
            }}
          >
            <Icon name={k.icon} size={14} color={kind === k.id ? 'var(--terra)' : 'var(--ink-faint)'} />
            {k.label}
          </button>
        ))}
      </div>

      {kind === 'photo' && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', height: preview ? 160 : 96,
              borderRadius: 14, border: '1.5px dashed var(--line)',
              background: 'var(--surface-2)', overflow: 'hidden', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="preview" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <Icon name="camera" size={18} color="var(--ink-soft)" />
                <span style={{ fontSize: 13.5, color: 'var(--ink-soft)', fontWeight: 600 }}>Choose a photo</span>
              </>
            )}
          </button>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Caption <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
          <input className="input" placeholder="e.g. THIS beach" value={title} onChange={(e) => setTitle(e.target.value)} />
        </>
      )}

      {kind === 'note' && (
        <>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Your note</label>
          <textarea
            className="input"
            placeholder="e.g. Rule #1: no laptops allowed"
            value={title}
            rows={3}
            onChange={(e) => setTitle(e.target.value)}
            style={{ resize: 'none', fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16 }}
          />
        </>
      )}

      {kind === 'idea' && (
        <>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>What&apos;s the vibe?</label>
          <input className="input" placeholder="e.g. Sunset beach bonfires" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 6px' }}>Details <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
          <input className="input" placeholder="a link, a place, a note to the crew" value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}

      {kind !== 'photo' && (
        <>
          <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 8px' }}>Colour</label>
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
        </>
      )}

      <button
        className="btn"
        disabled={!valid}
        style={{ width: '100%', marginTop: 24 }}
        onClick={submit}
      >
        Pin it
      </button>
    </Sheet>
  );
}
