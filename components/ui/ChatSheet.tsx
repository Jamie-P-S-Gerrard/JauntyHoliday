'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Sheet } from './Sheet';
import { Avatar } from './Avatar';
import { Icon } from './Icon';
import { USER_NAMES } from '@/lib/data';
import type { ChatApi, ChatMsg, ChatScope } from '@/types';

interface ChatSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  scope: ChatScope;
  api: ChatApi;
  userId: string;
}

export function ChatSheet({ open, onClose, title, scope, api, userId }: ChatSheetProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scopeKey = `${scope.groupId}|${scope.tripId ?? ''}|${scope.eventId ?? ''}`;

  const reload = useCallback(async () => {
    try {
      setMessages(await api.list(scope));
    } catch (e) {
      console.error(e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, scopeKey]);

  // Load on open, then poll gently while the sheet stays open
  useEffect(() => {
    if (!open) return;
    reload();
    const interval = setInterval(reload, 4000);
    return () => clearInterval(interval);
  }, [open, reload]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      await api.send(scope, body);
      await reload();
    } catch (e) {
      setDraft(body); // give their words back on failure
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="sec-title" style={{ marginBottom: 4 }}>{title}</h2>
      <p className="hdr-sub" style={{ marginBottom: 14 }}>Chat with the crew — everyone in the group can read along.</p>

      <div style={{ maxHeight: '42vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 6 }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)', padding: '18px 0' }}>
            No messages yet — say hi!
          </p>
        )}
        {messages.map((m) => {
          const mine = m.who === userId;
          return (
            <div key={m.id} style={{ display: 'flex', gap: 8, flexDirection: mine ? 'row-reverse' : 'row' }}>
              {!mine && <Avatar userId={m.who} size="sm" />}
              <div style={{ maxWidth: '80%' }}>
                {!mine && (
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 2, marginLeft: 4 }}>
                    {USER_NAMES[m.who] ?? 'Someone'}
                  </p>
                )}
                <div style={{
                  background: mine ? 'var(--terra)' : 'var(--surface-2)',
                  color: mine ? '#fff' : 'var(--ink)',
                  borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding: '9px 13px', fontSize: 13.5, lineHeight: 1.45,
                }}>
                  {m.body}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input
          className="input"
          placeholder="Message the crew…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          style={{ flex: 1 }}
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: draft.trim() ? 'var(--terra)' : 'var(--surface-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="send" size={18} color={draft.trim() ? '#fff' : 'var(--ink-faint)'} />
        </button>
      </div>
    </Sheet>
  );
}
