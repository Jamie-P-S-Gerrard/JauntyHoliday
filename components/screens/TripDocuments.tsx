'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { USER_NAMES } from '@/lib/data';
import type { TripDoc } from '@/types';

// Pieces for booking confirmations (PDFs/images) attached to plan items.
// The Itinerary owns the state; these render the upload sheet and the rows.

export function coversLabel(doc: TripDoc): string {
  return doc.memberIds.length === 0
    ? 'Whole group'
    : doc.memberIds.map((m) => USER_NAMES[m] ?? 'Someone').join(' & ');
}

export function DocUploadSheet({ file, members, itemTitle, busy, onSave, onClose }: {
  file: File | null;
  members: string[];
  itemTitle?: string;
  busy: boolean;
  onSave: (input: { name: string; memberIds: string[] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [covered, setCovered] = useState<string[]>([]); // empty = whole group

  useEffect(() => {
    if (file) {
      setName(file.name.replace(/\.[^.]+$/, ''));
      setCovered([]);
    }
  }, [file]);

  const toggleMember = (id: string) =>
    setCovered((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  return (
    <Sheet open={!!file} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 4 }}>Save a confirmation</h2>
      <p className="hdr-sub" style={{ marginBottom: 16 }}>
        {file?.type === 'application/pdf' ? 'PDF' : 'Image'} · only your group can open it
        {itemTitle ? ` · ${itemTitle}` : ''}
      </p>

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>What is it?</label>
      <input className="input" placeholder="e.g. Flights — SYD to DPS" value={name} onChange={(e) => setName(e.target.value)} />

      <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 8px' }}>Who does it cover?</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button className={`chip${covered.length === 0 ? ' on' : ''}`} onClick={() => setCovered([])}>
          Whole group
        </button>
        {members.map((m) => (
          <button key={m} className={`chip${covered.includes(m) ? ' on' : ''}`} onClick={() => toggleMember(m)}>
            {USER_NAMES[m] ?? 'Member'}
          </button>
        ))}
      </div>

      <button
        className="btn"
        disabled={busy || !file}
        style={{ width: '100%', marginTop: 20 }}
        onClick={() => onSave({
          name,
          // Everyone selected is the same as "whole group" — store it that way
          memberIds: covered.length === members.length ? [] : covered,
        })}
      >
        {busy ? 'Uploading…' : 'Save confirmation'}
      </button>
    </Sheet>
  );
}

export function DocRow({ doc, canDelete, onDelete }: {
  doc: TripDoc;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const isPdf = doc.mime === 'application/pdf';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => window.open(doc.url, '_blank', 'noopener')}
        style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, textAlign: 'left' }}
      >
        <Icon name={isPdf ? 'file' : 'camera'} size={13} color={isPdf ? 'var(--terra)' : 'var(--olive)'} />
        <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint)', flexShrink: 0 }}>{coversLabel(doc)}</span>
      </button>
      {canDelete && (
        <button onClick={onDelete} aria-label="Delete document" style={{ opacity: 0.45, padding: 2, flexShrink: 0 }}>
          <Icon name="x" size={11} color="var(--ink-soft)" />
        </button>
      )}
    </div>
  );
}
