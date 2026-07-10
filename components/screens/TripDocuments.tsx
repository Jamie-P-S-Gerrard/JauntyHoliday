'use client';
import { toast } from '@/components/ui/Toast';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { USER_NAMES } from '@/lib/data';
import type { DocsApi, TripDoc } from '@/types';

interface TripDocumentsProps {
  tripId: string;
  groupId: string;
  userId: string;
  members: string[];
  api: DocsApi;
  /** Stay titles for the "linked to" tag, keyed by stay id. */
  stayNames: Record<string, string>;
  /** When set (paperclip on a stay card), open the picker with this stay linked. */
  attachStayId?: string | null;
  onAttachHandled?: () => void;
}

export function TripDocuments({
  tripId, groupId, userId, members, api, stayNames, attachStayId, onAttachHandled,
}: TripDocumentsProps) {
  const [docs, setDocs] = useState<TripDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [covered, setCovered] = useState<string[]>([]); // empty = whole group
  const [stayId, setStayId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setDocs(await api.list(tripId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, tripId]);

  useEffect(() => { reload(); }, [reload]);

  // Paperclip on a stay card: link that stay, then open the file picker
  useEffect(() => {
    if (attachStayId) {
      setStayId(attachStayId);
      fileRef.current?.click();
      onAttachHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachStayId]);

  const closeSheet = () => {
    setPending(null);
    setName('');
    setCovered([]);
    setStayId(undefined);
  };

  const toggleMember = (id: string) =>
    setCovered((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const save = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      // Everyone selected is the same as "whole group" — store it that way
      const memberIds = covered.length === members.length ? [] : covered;
      await api.add(tripId, groupId, pending, { name, memberIds, stayId });
      closeSheet();
      await reload();
      toast('Confirmation saved for the crew');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload that file");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc: TripDoc) => {
    try {
      await api.remove(doc.id);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete the document");
    }
  };

  const coversLabel = (doc: TripDoc) =>
    doc.memberIds.length === 0
      ? 'Whole group'
      : doc.memberIds.map((m) => USER_NAMES[m] ?? 'Someone').join(' & ');

  return (
    <div style={{ marginBottom: 'var(--gap)' }}>
      <div className="sec-head">
        <div>
          <p className="eyebrow">Confirmations</p>
          <p className="sec-title">Bookings & documents</p>
        </div>
        <button
          onClick={() => { setStayId(undefined); fileRef.current?.click(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 600, color: 'var(--terra)' }}
        >
          <Icon name="plus" size={14} color="var(--terra)" /> Add
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            setPending(f);
            setName(f.name.replace(/\.[^.]+$/, ''));
          }
          e.target.value = '';
        }}
      />

      {loading ? (
        <div className="card" style={{ height: 64 }} />
      ) : docs.length === 0 ? (
        <button
          className="card"
          style={{ padding: 'var(--cardpad)', textAlign: 'center', color: 'var(--ink-faint)', width: '100%' }}
          onClick={() => { setStayId(undefined); fileRef.current?.click(); }}
        >
          <div style={{ margin: '4px auto 8px', display: 'flex', justifyContent: 'center' }}>
            <Icon name="paperclip" size={22} color="var(--ink-faint)" />
          </div>
          <p style={{ fontSize: 13.5 }}>No confirmations yet — add flight, stay or activity bookings</p>
          <p style={{ fontSize: 11.5, marginTop: 4 }}>PDFs or images · only your group can open them</p>
        </button>
      ) : (
        <div className="card" style={{ padding: '4px 0' }}>
          {docs.map((doc, i) => (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px var(--cardpad)',
                borderTop: i > 0 ? '1px solid var(--line-2)' : 'none',
              }}
            >
              <button
                onClick={() => window.open(doc.url, '_blank', 'noopener')}
                style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, textAlign: 'left', minWidth: 0 }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: doc.mime === 'application/pdf' ? 'var(--terra-bg)' : 'var(--olive-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon
                    name={doc.mime === 'application/pdf' ? 'file' : 'camera'}
                    size={15}
                    color={doc.mime === 'application/pdf' ? 'var(--terra)' : 'var(--olive)'}
                  />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {coversLabel(doc)}
                    {doc.stayId && stayNames[doc.stayId] ? ` · ${stayNames[doc.stayId]}` : ''}
                    {' · '}
                    {new Date(doc.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </button>
              {doc.who === userId && (
                <button onClick={() => remove(doc)} aria-label="Delete document" style={{ opacity: 0.45, padding: 4, flexShrink: 0 }}>
                  <Icon name="x" size={13} color="var(--ink-soft)" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Details sheet */}
      <Sheet open={!!pending} onClose={closeSheet}>
        <h2 className="sec-title" style={{ marginBottom: 4 }}>Save a confirmation</h2>
        <p className="hdr-sub" style={{ marginBottom: 16 }}>
          {pending?.type === 'application/pdf' ? 'PDF' : 'Image'} · only your group can open it
          {stayId && stayNames[stayId] ? ` · linked to ${stayNames[stayId]}` : ''}
        </p>

        <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>What is it?</label>
        <input className="input" placeholder="e.g. Flights — SYD to DPS" value={name} onChange={(e) => setName(e.target.value)} />

        <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', margin: '14px 0 8px' }}>Who does it cover?</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button
            className={`chip${covered.length === 0 ? ' on' : ''}`}
            onClick={() => setCovered([])}
          >
            Whole group
          </button>
          {members.map((m) => (
            <button
              key={m}
              className={`chip${covered.includes(m) ? ' on' : ''}`}
              onClick={() => toggleMember(m)}
            >
              {USER_NAMES[m] ?? 'Member'}
            </button>
          ))}
        </div>

        <button className="btn" disabled={busy || !pending} style={{ width: '100%', marginTop: 20 }} onClick={save}>
          {busy ? 'Uploading…' : 'Save confirmation'}
        </button>
      </Sheet>
    </div>
  );
}
