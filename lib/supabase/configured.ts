// True when real Supabase credentials are present. The app falls back to a
// simulated "demo mode" sign-in when they are not (e.g. a fresh local clone).
export function supabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('your-project');
}
