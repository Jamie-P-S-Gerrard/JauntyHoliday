// Canned Discover replies for running without an Anthropic API key.
// Mirrors the /api/discover response shape: { text, cardIds, culture, suggestions }.

interface DemoSuggestion {
  title: string;
  area: string;
  detail: string;
  price?: string;
  kind: string;
  time?: string;
  lat?: number;
  lng?: number;
}

interface DemoReply {
  text: string;
  cardIds?: string[];
  culture?: boolean;
  suggestions?: DemoSuggestion[];
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
      suggestions: [
        { title: 'Pink Beach snorkel trip', area: 'Sekotong · SW Lombok', detail: 'Calm reef, barely any crowds before noon.', price: '$38pp', kind: 'activity', time: '07:30', lat: -8.7845, lng: 116.0089 },
        { title: 'Gili Nanggu day boat', area: 'Three south Gilis', detail: 'Turtles most mornings, quieter than the north.', price: '$45pp', kind: 'activity', time: '08:00', lat: -8.7362, lng: 116.0161 },
      ],
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
      suggestions: [
        { title: 'Warung Flora', area: 'Kuta · Sasak home cooking', detail: 'Ayam taliwang and plecing kangkung, ~$6 a head.', price: '$', kind: 'eat', time: '12:30', lat: -8.8894, lng: 116.2822 },
        { title: 'Ashtari Lounge — sunset table', area: 'Kuta hills', detail: 'Cliff-edge tables face west; book the 17:30 slot.', price: '$$', kind: 'eat', time: '17:30', lat: -8.9020, lng: 116.2755 },
      ],
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

export function demoDiscoverReply(query: string, dest?: string): DemoReply {
  // Non-Lombok trips get generic destination-flavoured demo suggestions so
  // the whole flow is testable offline.
  if (/flight|transport|airport|train/i.test(query)) {
    const place = dest || 'your destination';
    return {
      text: 'A few ways to get to ' + place + ' — prices are rough demo figures.' + DEMO_SUFFIX,
      suggestions: [
        { title: 'Direct flight, morning departure', area: 'SYD to ' + place, detail: 'Fastest option; book 6+ weeks out for the best fares.', price: '~$450pp', kind: 'travel' },
        { title: 'One-stop via hub, evening', area: 'SYD to ' + place, detail: 'Cheaper but adds 4-5 hours.', price: '~$320pp', kind: 'travel' },
      ],
    };
  }
  if (dest && !/lombok/i.test(dest)) {
    return {
      text: `Here are a few ideas for ${dest} to get the crew dreaming.` + DEMO_SUFFIX,
      suggestions: [
        { title: 'Old town food walk', area: `Central ${dest}`, detail: 'Graze the local classics with a market stop.', price: '$$', kind: 'activity' },
        { title: 'Boutique stay near the action', area: dest, detail: 'Small, well-reviewed, walkable to the good stuff.', price: '$120/night', kind: 'stay' },
        { title: 'The locals’ favourite dinner spot', area: dest, detail: 'Book ahead for the early sitting.', kind: 'eat' },
      ],
    };
  }

  const rule = RULES.find((r) => r.match.test(query));
  if (rule) {
    return { ...rule.reply, text: rule.reply.text + DEMO_SUFFIX };
  }
  return {
    text: 'I can help with beaches, stays, food, waterfalls, and culture tips for Lombok — try one of the suggested prompts!' + DEMO_SUFFIX,
    cardIds: [],
  };
}
