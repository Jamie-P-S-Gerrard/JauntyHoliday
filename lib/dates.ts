// Date-range display helpers shared by the real and demo dates APIs.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parse(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

// "Oct 3 – 12" or "Oct 30 – Nov 5"
export function formatRange(startIso: string, endIso: string): string {
  const s = parse(startIso);
  const e = parse(endIso);
  const sm = MONTHS[s.getMonth()];
  const em = MONTHS[e.getMonth()];
  return sm === em && s.getFullYear() === e.getFullYear()
    ? `${sm} ${s.getDate()} – ${e.getDate()}`
    : `${sm} ${s.getDate()} – ${em} ${e.getDate()}`;
}

// "Sat → Mon · 9 nights"
export function formatSub(startIso: string, endIso: string): string {
  const s = parse(startIso);
  const e = parse(endIso);
  const nights = Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000));
  return `${DOW[s.getDay()]} → ${DOW[e.getDay()]} · ${nights} ${nights === 1 ? 'night' : 'nights'}`;
}

export function monthTitle(iso: string): string {
  const d = parse(iso);
  return `${['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()]} ${d.getFullYear()}`;
}
