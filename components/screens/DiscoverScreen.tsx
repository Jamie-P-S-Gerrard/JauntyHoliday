'use client';
import { toast } from '@/components/ui/Toast';
import { useState, useRef, useEffect } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Placeholder } from '@/components/ui/Placeholder';
import { DISCOVER } from '@/lib/data';
import type { AiSuggestion, BoardApi, ChatMessage, DiscoverCard, GroupPrefs } from '@/types';

interface DiscoverScreenProps {
  saved: string[];
  onSave: (id: string) => void;
  onAdd: (id: string) => void;
  dest?: string;
  prefs?: GroupPrefs;
  tripId: string;
  groupId: string;
  boardApi: BoardApi;
}

async function callDiscover(
  query: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }>,
  dest?: string,
  prefs?: GroupPrefs,
  tripId?: string,
): Promise<{ text: string; cardIds?: string[]; culture?: boolean }> {
  const res = await fetch('/api/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history, dest, prefs, tripId }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? 'discover api error');
  }
  return body;
}

function introFor(dest?: string): ChatMessage {
  return {
    id: 'intro',
    role: 'assistant',
    text: dest
      ? `Hi! I'm your ${dest} trip assistant. Ask me about stays, food, things to do, or local culture — I'll tailor everything to your crew.`
      : "Hi! You haven't picked a destination yet — tell me what you're dreaming of and I'll suggest some places.",
  };
}

function promptsFor(dest?: string): string[] {
  if (dest && /lombok/i.test(dest)) return DISCOVER.prompts;
  if (!dest) {
    return ['Warm, calm, and cheap in October?', 'Best foodie city breaks', 'Where for a first family adventure?', 'Hidden-gem beach destinations'];
  }
  return [
    `Best areas to stay in ${dest}`,
    `Must-try food in ${dest}`,
    `Top things to do in ${dest}`,
    `Local culture tips for ${dest}`,
  ];
}

export function DiscoverScreen({ saved, onSave, onAdd, dest, prefs, tripId, groupId, boardApi }: DiscoverScreenProps) {
  const [messages, setMessages] = useState<(ChatMessage & { added?: string[]; pinned?: string[] })[]>([introFor(dest)] as any);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [filter, setFilter] = useState('all');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text: string) => {
    if (!text.trim() || thinking) return;
    const userMsg: any = { id: `u${Date.now()}`, role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    try {
      const history = messages
        .filter((m) => m.id !== 'intro')
        .map((m) => ({ role: m.role as 'user' | 'assistant', text: m.text }));
      const reply = await callDiscover(text.trim(), history, dest, prefs, tripId);
      const aiMsg: any = { id: `a${Date.now()}`, role: 'assistant', ...reply };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const aiMsg: any = {
        id: `a${Date.now()}`, role: 'assistant',
        text: e instanceof Error && e.message !== 'discover api error'
          ? e.message
          : "Sorry, I couldn't connect right now. Try again in a moment!",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="screen">
      {/* Header */}
      <div className="screen-header" style={{ paddingBottom: 12 }}>
        <p className="hdr-overline" style={{ color: 'var(--gold)' }}>Powered by Trip AI</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 className="hdr-title">Discover <em>{' '}{dest || 'together'}</em></h1>
          <Avatar userId="ai" size="md" />
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px var(--pad)',
        overflowX: 'auto', flexShrink: 0,
      }}>
        {DISCOVER.filters.map((f: any) => (
          <button
            key={f.id}
            className={`chip${filter === f.id ? ' on' : ''}`}
            style={{ flexShrink: 0 }}
            onClick={() => { setFilter(f.id); send(f.label === 'All' ? 'Show me everything' : f.label); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Chat thread */}
      <div className="scroll-area" style={{ padding: '8px var(--pad)' }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatBubble msg={msg} />
            {msg.cardIds && msg.cardIds.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0 16px 42px' }}>
                {msg.cardIds.map((id) => {
                  const card = DISCOVER.cards.find((c) => c.id === id);
                  if (!card) return null;
                  return (
                    <SuggestCard
                      key={id}
                      card={card}
                      isSaved={saved.includes(id)}
                      isAdded={((msg as any).added ?? []).includes(id)}
                      onSave={() => onSave(id)}
                      onAdd={() => {
                        onAdd(id);
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === msg.id
                              ? { ...m, added: [...((m as any).added ?? []), id] }
                              : m
                          )
                        );
                      }}
                    />
                  );
                })}
              </div>
            )}
            {msg.suggestions && msg.suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0 16px 42px' }}>
                {msg.suggestions.map((s, si) => {
                  const key = `${msg.id}-${si}`;
                  return (
                    <AiSuggestionCard
                      key={key}
                      suggestion={s}
                      pinned={((msg as any).pinned ?? []).includes(key)}
                      onPin={async () => {
                        try {
                          await boardApi.add(tripId, groupId, {
                            kind: 'idea',
                            title: s.title,
                            note: [s.area, s.detail, s.price].filter(Boolean).join(' · '),
                            tint: SUGGESTION_TINTS[s.kind] ?? '#caa37a',
                          });
                          setMessages((prev) =>
                            prev.map((m) =>
                              m.id === msg.id
                                ? { ...m, pinned: [...((m as any).pinned ?? []), key] }
                                : m
                            )
                          );
                        } catch (e) {
                          toast(e instanceof Error ? e.message : 'Could not pin');
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}
            {msg.culture && dest && /lombok/i.test(dest) && (
              <div style={{ margin: '8px 0 16px 42px' }}>
                <CultureCard />
              </div>
            )}
          </div>
        ))}

        {thinking && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <Avatar userId="ai" size="sm" />
            <div style={{ background: 'var(--surface)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', display: 'flex', gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-faint)',
                    animation: `dot-bounce 0.9s ${i * 0.18}s infinite ease-in-out`,
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Prompt suggestions */}
        {messages.length === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {promptsFor(dest).slice(0, 4).map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                style={{
                  textAlign: 'left', padding: '10px 14px',
                  background: 'var(--surface)', borderRadius: 12,
                  border: '1px solid var(--line-2)', fontSize: 13.5,
                  color: 'var(--ink-soft)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Ask bar */}
      <div style={{
        padding: '10px var(--pad) 20px', borderTop: '1px solid var(--line-2)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            className="input"
            placeholder={dest ? `Ask about ${dest}…` : 'Where should we go?'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: input.trim() ? 'var(--terra)' : 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <Icon name="send" size={18} color={input.trim() ? '#fff' : 'var(--ink-faint)'} />
          </button>
        </div>
      </div>
    </div>
  );
}

const SUGGESTION_TINTS: Record<string, string> = {
  stay: '#9aa56a', eat: '#cf9a5e', activity: '#7fa0c0',
};

function AiSuggestionCard({ suggestion, pinned, onPin }: {
  suggestion: AiSuggestion; pinned: boolean; onPin: () => void;
}) {
  const kindLabel: Record<string, string> = { stay: 'Stay', eat: 'Eats', activity: 'To do' };
  const kindIcon: Record<string, string> = { stay: 'bed', eat: 'utensils', activity: 'waves' };

  return (
    <div className="card" style={{ padding: 'var(--cardpad)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span className="chip" style={{ height: 22, fontSize: 10.5, background: 'var(--surface-2)' }}>
              <Icon name={kindIcon[suggestion.kind] ?? 'star'} size={10} color="var(--ink-soft)" />
              {kindLabel[suggestion.kind] ?? suggestion.kind}
            </span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 600 }}>{suggestion.title}</p>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{suggestion.area}</p>
        </div>
        {suggestion.price && (
          <p style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>{suggestion.price}</p>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, margin: '8px 0 12px' }}>
        {suggestion.detail}
      </p>
      <button
        className={`btn sm${pinned ? ' olive' : ' ghost'}`}
        style={{ width: '100%' }}
        onClick={onPin}
        disabled={pinned}
      >
        {pinned ? (
          <><Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> Pinned to board</>
        ) : (
          <><Icon name="plus" size={13} color="var(--ink)" /> Pin to mood board</>
        )}
      </button>
    </div>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {!isUser && <Avatar userId="ai" size="sm" />}
      <div style={{
        maxWidth: '78%',
        background: isUser ? 'var(--terra)' : 'var(--surface)',
        color: isUser ? '#fff' : 'var(--ink)',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        padding: '10px 14px',
        fontSize: 13.5,
        lineHeight: 1.5,
        boxShadow: 'var(--card-shadow)',
      }}>
        {msg.text}
      </div>
    </div>
  );
}

function SuggestCard({
  card, isSaved, isAdded, onSave, onAdd,
}: {
  card: DiscoverCard; isSaved: boolean; isAdded: boolean;
  onSave: () => void; onAdd: () => void;
}) {
  const kindLabel: Record<string, string> = { stay: 'Stay', eat: 'Eats', activity: 'To do' };
  const kindIcon: Record<string, string> = { stay: 'bed', eat: 'utensils', activity: 'waves' };

  return (
    <div className="card">
      <div style={{ position: 'relative', height: 124 }}>
        <Placeholder tint={card.tint} style={{ position: 'absolute', inset: 0 }} label={card.label} />
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          <span className="chip" style={{ background: 'rgba(255,255,255,0.9)', fontSize: 11, height: 26 }}>
            <Icon name={kindIcon[card.kind] ?? 'star'} size={11} color="var(--ink)" />
            {kindLabel[card.kind] ?? card.kind}
          </span>
        </div>
        <button
          onClick={onSave}
          style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="heart" size={16} color={isSaved ? 'var(--terra)' : 'var(--ink-soft)'} fill={isSaved ? 'var(--terra)' : 'none'} />
        </button>
      </div>

      <div style={{ padding: 'var(--cardpad)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600 }}>{card.title}</p>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{card.area}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.1 }}>
              {card.price > 0 ? `$${card.price}` : '$$'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{card.per}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
          {card.rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
              <Icon name="star" size={13} color="var(--gold)" fill="var(--gold)" />
              {card.rating}
            </span>
          )}
          {card.duration && (
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{card.duration}</span>
          )}
        </div>

        {/* AI pick box */}
        <div style={{
          background: 'var(--gold-bg)', borderRadius: 10, padding: '10px 12px',
          display: 'flex', gap: 8, marginBottom: 12,
        }}>
          <div style={{ flexShrink: 0, marginTop: 2, display: 'flex' }}>
            <Icon name="sparkles" size={14} color="var(--gold)" />
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{card.why}</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn${isAdded ? ' olive' : ''}`}
            style={{ flex: 1, height: 38, fontSize: 13 }}
            onClick={onAdd}
          >
            {isAdded ? (
              <><Icon name="check" size={13} color="#fff" strokeWidth={2.5} /> Added to plan</>
            ) : (
              'Add to itinerary'
            )}
          </button>
          <button
            onClick={onSave}
            style={{
              width: 38, height: 38, borderRadius: 999, flexShrink: 0,
              background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="heart" size={16} color={isSaved ? 'var(--terra)' : 'var(--ink-soft)'} fill={isSaved ? 'var(--terra)' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CultureCard() {
  const c = DISCOVER.culture;
  return (
    <div className="card">
      <div style={{ position: 'relative', height: 80 }}>
        <Placeholder tint="#b79a6a" style={{ position: 'absolute', inset: 0 }} label="Culture notes" />
      </div>
      <div style={{ padding: 'var(--cardpad)' }}>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{c.title}</p>
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14, lineHeight: 1.5 }}>{c.intro}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {c.tips.map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                background: tip.do ? 'var(--olive-bg)' : 'var(--terra-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
              }}>
                <Icon name={tip.do ? 'check' : 'x'} size={10} color={tip.do ? 'var(--olive)' : 'var(--terra)'} strokeWidth={2.5} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5 }}>{tip.t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
