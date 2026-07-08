import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/configured';
import type { EmailOtpType } from '@supabase/supabase-js';

// Completes sign-in after Supabase redirects back to us.
// Handles both flows:
//   - OAuth / PKCE magic links:  ?code=...        → exchangeCodeForSession
//   - token-hash email links:    ?token_hash=...&type=magiclink → verifyOtp
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  // Behind Railway's proxy, request.url is the internal address
  // (localhost:8080); the public origin arrives in forwarded headers.
  const proto = (request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')).split(',')[0].trim();
  const host = (request.headers.get('x-forwarded-host') ?? url.host).split(',')[0].trim();
  const home = new URL('/', `${proto}://${host}`);
  const fail = (message: string) => {
    home.searchParams.set('auth_error', message);
    return NextResponse.redirect(home);
  };

  if (!supabaseConfigured()) {
    return fail('Sign-in is not available — Supabase is not configured.');
  }
  if (!code && !tokenHash) {
    return fail('Missing sign-in code — try the link again.');
  }

  try {
    const supabase = await createClient();
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type ?? 'magiclink' });
    return error ? fail(error.message) : NextResponse.redirect(home);
  } catch {
    return fail('Sign-in failed — please try again.');
  }
}
