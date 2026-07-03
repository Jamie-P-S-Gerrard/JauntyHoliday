// Canned Discover replies for running without an Anthropic API key.
// Mirrors the /api/discover response shape: { text, cardIds, culture }.

interface DemoReply {
  text: string;
  cardIds?: string[];
  culture?: boolean;
}

const DEMO_SUFFIX = ' (Demo reply — add an ANTHROPIC_API_KEY for real answers.)';

const RULES: Array<{ match: RegExp; reply: DemoReply }> = [
  {
    match: /culture|etiquette|custom|religio|respect|dress|mosque/i,
    reply: {
      text: 'Lombok is largely Muslim and Sasak — a few gentle habits go a long way. Here are the essentials.',
      culture: true,
    },
  },
  {
    match: /snorkel|beach|swim|reef|pink/i,
    reply: {
      text: 'For snorkelling, the Pink Beach trip is the standout — calm reef and few crowds before noon. The Gili Nanggu day boat is a great second pick with turtles most mornings.',
      cardIds: ['a1', 'a4'],
    },
  },
  {
    match: /stay|hotel|villa|sleep|accommodation|kuta/i,
    reply: {
      text: 'Ashtari Hillside Villa is the one to beat — quiet, ocean-view, and six minutes from Selong Belanak.',
      cardIds: ['a2'],
    },
  },
  {
    match: /eat|food|restaurant|dinner|lunch|warung/i,
    reply: {
      text: 'Warung Flora does authentic Sasak home cooking for about $6 a head, and the sunset table at Ashtari Lounge is worth booking ahead.',
      cardIds: ['e1', 'e2'],
    },
  },
  {
    match: /waterfall|hike|jungle|senaru|rinjani/i,
    reply: {
      text: 'Tiu Kelep in Senaru is a moderate half-day hike through the jungle — it pairs well with a Rinjani foothills morning.',
      cardIds: ['a3'],
    },
  },
  {
    match: /island|boat|gili|day trip/i,
    reply: {
      text: 'The Gili Nanggu day boat covers the three quieter southern Gilis — turtles most mornings and far fewer crowds than the north.',
      cardIds: ['a4'],
    },
  },
];

export function demoDiscoverReply(query: string): DemoReply {
  const rule = RULES.find((r) => r.match.test(query));
  if (rule) {
    return { ...rule.reply, text: rule.reply.text + DEMO_SUFFIX };
  }
  return {
    text: 'I can help with beaches, stays, food, waterfalls, and culture tips for Lombok — try one of the suggested prompts!' + DEMO_SUFFIX,
    cardIds: [],
  };
}
