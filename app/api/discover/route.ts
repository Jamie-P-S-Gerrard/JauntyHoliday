import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const client = new Anthropic();

const SYSTEM = `You are a warm, knowledgeable travel assistant inside Jaunt, a trip-planning app.

TRIP CONTEXT:
- Travellers: Christie & Jamie (couple, planning together)
- Destination: Lombok, Indonesia
- Dates: October 3–12, 2026 (10 days, 9 nights)

AVAILABLE RECOMMENDATION CARDS (reference by id when relevant):
- a1 · activity · Pink Beach snorkel trip · Sekotong, SW Lombok (full day, $38pp, rating 4.8)
- a2 · stay · Ashtari Hillside Villa · Kuta, ocean view (sleeps 2, $94/night, rating 4.9)
- e1 · eat · Warung Flora · Kuta — authentic Sasak home cooking ($6/head, rating 4.7)
- e2 · eat · Ashtari Lounge — sunset table · Kuta hills (dinner for two, book ahead, rating 4.6)
- a3 · activity · Tiu Kelep waterfall hike · Senaru, North Lombok (half day, $22pp, rating 4.7)
- a4 · activity · Gili Nanggu day boat · Three south Gilis (full day, $45pp, rating 4.6)

RESPONSE FORMAT — reply ONLY with valid JSON, no markdown fences, no preamble:
{
  "text": "1–3 warm, specific sentences answering the query",
  "cardIds": ["a1", "e1"],
  "culture": false
}

RULES:
- "cardIds": include only card IDs that directly match the query (omit key or use [] if none apply)
- "culture": true ONLY when the user asks about local customs, religion, etiquette, or culture tips
- Be specific to Lombok — reference places, seasons, and local details where possible
- Keep tone friendly and helpful, not generic`;

export async function POST(req: NextRequest) {
  const { query, history = [] } = await req.json() as {
    query: string;
    history: Array<{ role: 'user' | 'assistant'; text: string }>;
  };

  if (!query?.trim()) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  // Build message list: history (prior turns) + current user query
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: query.trim() },
  ];

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: SYSTEM,
    messages,
  });

  const msg = await stream.finalMessage();

  // Find the text block (skip thinking blocks)
  const textBlock = msg.content.find((b) => b.type === 'text');
  const raw = textBlock?.type === 'text' ? textBlock.text.trim() : '';

  try {
    const parsed = JSON.parse(raw);
    return Response.json(parsed);
  } catch {
    // Claude returned something non-JSON — wrap it gracefully
    return Response.json({
      text: raw || "I'm having a moment — try asking again!",
      cardIds: [],
      culture: false,
    });
  }
}
