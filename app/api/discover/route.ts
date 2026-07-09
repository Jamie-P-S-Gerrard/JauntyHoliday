import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';
import { demoDiscoverReply } from '@/lib/discover-demo';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/configured';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-4-8';
// Per-user requests per UTC day; generous for family use, fatal for abuse
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 50);

interface GroupPrefsPayload {
  vibe?: string;
  pace?: string;
  budget?: string;
  interests?: string[];
  notes?: string;
}

// The seeded Lombok demo catalog — only referenced when the trip is the
// Lombok demo, so replies can point at real recommendation cards by id.
const LOMBOK_CATALOG = `
AVAILABLE RECOMMENDATION CARDS (reference by id when relevant):
- a1 · activity · Pink Beach snorkel trip · Sekotong, SW Lombok (full day, $38pp, rating 4.8)
- a2 · stay · Ashtari Hillside Villa · Kuta, ocean view (sleeps 2, $94/night, rating 4.9)
- e1 · eat · Warung Flora · Kuta — authentic Sasak home cooking ($6/head, rating 4.7)
- e2 · eat · Ashtari Lounge — sunset table · Kuta hills (dinner for two, book ahead, rating 4.6)
- a3 · activity · Tiu Kelep waterfall hike · Senaru, North Lombok (half day, $22pp, rating 4.7)
- a4 · activity · Gili Nanggu day boat · Three south Gilis (full day, $45pp, rating 4.6)

Use "cardIds" for catalog matches, and "culture": true ONLY when the user asks
about local customs, religion, etiquette, or culture tips.`;

function buildSystem(dest?: string, prefs?: GroupPrefsPayload): string {
  const place = dest?.trim() || 'a destination the group has not chosen yet';
  const isLombok = /lombok/i.test(dest ?? '');

  const prefLines: string[] = [];
  if (prefs?.vibe) prefLines.push(`- Trip vibe they're after: ${prefs.vibe}`);
  if (prefs?.pace) prefLines.push(`- Preferred pace: ${prefs.pace}`);
  if (prefs?.budget) prefLines.push(`- Budget style: ${prefs.budget}`);
  if (prefs?.interests?.length) prefLines.push(`- Interests: ${prefs.interests.join(', ')}`);
  if (prefs?.notes) prefLines.push(`- Their own words: "${prefs.notes}"`);

  return `You are a warm, knowledgeable travel assistant inside Jaunt, a collaborative trip-planning app.

TRIP CONTEXT:
- The group is planning a trip to: ${place}
${prefLines.length > 0 ? `\nGROUP PREFERENCES (tailor every suggestion to these):\n${prefLines.join('\n')}` : ''}
${isLombok ? LOMBOK_CATALOG : ''}

RESPONSE FORMAT — reply ONLY with valid JSON, no markdown fences, no preamble:
{
  "text": "1–3 warm, specific sentences answering the query",
  ${isLombok ? '"cardIds": ["a1"],' : ''}
  "suggestions": [
    { "title": "Name of place/experience", "area": "Neighbourhood or region", "detail": "One specific, useful sentence", "price": "$40pp", "kind": "stay|eat|activity|travel", "time": "HH:mm", "lat": -8.889, "lng": 116.284 }
  ]${isLombok ? ',\n  "culture": false' : ''}
}

RULES:
- "suggestions": 0–3 concrete, real places or experiences that match the query${isLombok ? ' (omit when cardIds already cover it)' : ''}
- "price" is a short indicative string like "$40pp" or "$$" — omit if unknown
- "time" is a sensible 24h start time for the plan (e.g. "17:30" for sunset dinner) — omit if none makes sense
- "lat"/"lng" are your best approximate WGS84 coordinates for the place (numbers, ~3+ decimals) — omit if truly unsure
- Be specific to ${place} — reference real neighbourhoods, seasons, and local details
- If no destination is chosen yet, help them choose: suggest destinations as "suggestions" with kind "activity"
- For flights/transport queries use kind "travel" with realistic routes/airlines and rough indicative prices, and say prices are indicative
- Keep tone friendly and helpful, not generic`;
}

export async function POST(req: NextRequest) {
  const { query, history = [], dest, prefs, tripId } = await req.json() as {
    query: string;
    history: Array<{ role: 'user' | 'assistant'; text: string }>;
    dest?: string;
    prefs?: GroupPrefsPayload;
    tripId?: string;
  };

  if (!query?.trim()) {
    return Response.json({ error: 'query is required' }, { status: 400 });
  }

  // Demo mode — no Anthropic key configured. Serve canned replies so the
  // Discover UI is fully testable offline.
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 400)); // brief "thinking" pause
    return Response.json(demoDiscoverReply(query, dest));
  }

  // A real Anthropic key is spending real money: require a signed-in user
  // and enforce a per-user daily cap.
  let userId: string | null = null;
  let supabase: Awaited<ReturnType<typeof createClient>> | null = null;
  if (supabaseConfigured()) {
    supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: 'Sign in to ask the trip assistant.' }, { status: 401 });
    }
    userId = user.id;

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfDay.toISOString());
    if (!countError && (count ?? 0) >= DAILY_LIMIT) {
      return Response.json(
        { error: "You've hit today's AI limit — it resets tomorrow!" },
        { status: 429 },
      );
    }
  }

  const client = new Anthropic();

  // Build message list: history (prior turns) + current user query
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.text })),
    { role: 'user', content: query.trim() },
  ];

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    thinking: { type: 'adaptive' },
    system: buildSystem(dest, prefs),
    messages,
  });

  const msg = await stream.finalMessage();

  // Record spend (feeds the daily cap + the admin cost dashboard)
  if (supabase && userId) {
    const { error: usageError } = await supabase.from('ai_usage').insert({
      user_id: userId,
      trip_id: tripId ?? null,
      model: MODEL,
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
    });
    if (usageError) console.error('ai_usage insert failed:', usageError.message);
  }

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
