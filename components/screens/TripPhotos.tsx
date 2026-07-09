'use client';
import { toast } from '@/components/ui/Toast';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { USER_NAMES } from '@/lib/data';
import type { PhotosApi, TripPhoto } from '@/types';

interface TripPhotosProps {
  tripId: string;
  groupId: string;
  userId: string;
  api: PhotosApi;
}

export function TripPhotos({ tripId, groupId, userId, api }: TripPhotosProps) {
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<TripPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingPreview = useMemo(() => (pending ? URL.createObjectURL(pending) : null), [pending]);
  useEffect(() => () => { if (pendingPreview) URL.revokeObjectURL(pendingPreview); }, [pendingPreview]);

  const reload = useCallback(async () => {
    try {
      setPhotos(await api.list(tripId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [api, tripId]);

  useEffect(() => { reload(); }, [reload]);

  const share = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await api.add(tripId, groupId, pending, caption);
      setPending(null);
      setCaption('');
      await reload();
      toast('Photo shared with the crew');
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't upload that photo");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (photo: TripPhoto) => {
    setViewing(null);
    try {
      await api.remove(photo.id);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete the photo");
    }
  };

  return (
    <div style={{ marginBottom: 'var(--gap)' }}>
      <div className="sec-head">
        <div>
          <p className="eyebrow">Memories</p>
          <p className="sec-title">Photos</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13.5, fontWeight: 600, color: 'var(--terra)' }}
        >
          <Icon name="plus" size={14} color="var(--terra)" /> Add
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPending(f);
          e.target.value = '';
        }}
      />

      {loading ? (
        <div className="card" style={{ height: 96 }} />
      ) : photos.length === 0 ? (
        <button
          className="card"
          style={{ padding: 'var(--cardpad)', textAlign: 'center', color: 'var(--ink-faint)', width: '100%' }}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ margin: '4px auto 8px', display: 'flex', justifyContent: 'center' }}>
            <Icon name="camera" size={24} color="var(--ink-faint)" />
          </div>
          <p style={{ fontSize: 13.5 }}>No photos yet — share the first one</p>
          <p style={{ fontSize: 11.5, marginTop: 4 }}>Only your group can see them</p>
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {photos.map((p) => (
            <button key={p.id} onClick={() => setViewing(p)} style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed/object URLs */}
              <img src={p.url} alt={p.caption ?? 'Trip photo'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Caption + share sheet */}
      <Sheet open={!!pending} onClose={() => { setPending(null); setCaption(''); }}>
        <h2 className="sec-title" style={{ marginBottom: 14 }}>Share with the crew</h2>
        {pendingPreview && (
          // eslint-disable-next-line @next/next/no-img-element -- local preview
          <img
            src={pendingPreview}
            alt="Preview"
            style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 14, marginBottom: 14 }}
          />
        )}
        <label style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>Caption <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label>
        <input className="input" placeholder="e.g. First sunset!" value={caption} onChange={(e) => setCaption(e.target.value)} />
        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 10 }}>
          Photos are resized and location metadata is stripped before upload. Only group members can see them.
        </p>
        <button className="btn" disabled={busy} style={{ width: '100%', marginTop: 16 }} onClick={share}>
          {busy ? 'Uploading…' : 'Share photo'}
        </button>
      </Sheet>

      {/* Lightbox */}
      {viewing && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,12,9,0.92)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}
          onClick={() => setViewing(null)}
        >
          <button
            aria-label="Close"
            style={{ position: 'absolute', top: 18, right: 18, padding: 8 }}
            onClick={() => setViewing(null)}
          >
            <Icon name="x" size={22} color="#fff" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed/object URLs */}
          <img src={viewing.url} alt={viewing.caption ?? 'Trip photo'} style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain' }} />
          <div
            style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar userId={viewing.who} size="sm" />
            <div style={{ flex: 1 }}>
              {viewing.caption && <p style={{ fontSize: 13.5, color: '#fff', fontWeight: 600 }}>{viewing.caption}</p>}
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)' }}>
                {USER_NAMES[viewing.who] ?? 'Someone'} · {new Date(viewing.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            {viewing.who === userId && (
              <button
                aria-label="Delete photo"
                style={{ padding: 8, opacity: 0.8 }}
                onClick={() => remove(viewing)}
              >
                <Icon name="x" size={16} color="#f0a9a0" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
