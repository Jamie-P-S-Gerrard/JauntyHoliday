'use client';
import { useState } from 'react';
import { Wordmark } from '@/components/ui/Wordmark';
import { Placeholder } from '@/components/ui/Placeholder';

interface LoginScreenProps {
  onLogin: () => void;
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.07-.49-2.05-.49-3.17 0-1.37.63-2.1.5-2.99-.38C2.79 14.8 3.51 6.67 9.35 6.36c1.39.07 2.33.74 3.14.76.96-.19 1.89-.88 3.15-.94 1.53.1 2.72.66 3.48 1.77-3.17 1.88-2.4 5.97.49 7.12-.62 1.56-1.43 3.1-2.56 5.21zM12.2 6.27c-.15-2.32 1.7-4.27 3.88-4.27.27 2.68-2.44 4.65-3.88 4.27z"/>
    </svg>
  );
}

type Provider = 'google' | 'apple' | 'email';

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [loading, setLoading] = useState<Provider | null>(null);

  const handleLogin = (provider: Provider) => {
    setLoading(provider);
    setTimeout(() => { setLoading(null); onLogin(); }, 950);
  };

  return (
    <div className="screen" style={{ background: '#8b6a45', position: 'relative' }}>
      {/* Hero */}
      <Placeholder
        tint="#c79a6f"
        style={{ position: 'absolute', inset: 0 }}
      />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
        background: 'linear-gradient(to bottom, transparent, rgba(20,12,5,0.85))',
      }} />

      {/* Wordmark */}
      <div style={{ position: 'absolute', top: 56, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Wordmark size={28} color="#fff" />
      </div>

      {/* Hero copy */}
      <div style={{ position: 'absolute', bottom: 280, left: 28, right: 28 }}>
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
          TRIPS ARE BETTER TOGETHER
        </p>
        <h1 className="hdr-title" style={{ color: '#fff', fontSize: 38 }}>
          Dream it, plan it,{' '}
          <em style={{ color: '#f0c9a8' }}>go.</em>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 14.5, marginTop: 10, lineHeight: 1.5 }}>
          Plan trips together — dates, ideas, bookings, and the itinerary — all in one place.
        </p>
      </div>

      {/* Auth panel */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--surface)',
        borderRadius: '28px 28px 0 0',
        padding: '28px 24px 48px',
      }}>
        <ProviderBtn
          label="Continue with Google"
          icon={<GoogleG />}
          dark={false}
          loading={loading === 'google'}
          onClick={() => handleLogin('google')}
        />
        <ProviderBtn
          label="Continue with Apple"
          icon={<AppleMark />}
          dark={true}
          loading={loading === 'apple'}
          onClick={() => handleLogin('apple')}
          style={{ marginTop: 10 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
        </div>

        <ProviderBtn
          label="Continue with email"
          dark={false}
          loading={loading === 'email'}
          onClick={() => handleLogin('email')}
        />

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 20, lineHeight: 1.5 }}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function ProviderBtn({
  label, icon, dark, loading, onClick, style,
}: {
  label: string; icon?: React.ReactNode; dark?: boolean;
  loading?: boolean; onClick: () => void; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!!loading}
      style={{
        width: '100%', height: 50, borderRadius: 14,
        background: dark ? 'var(--ink)' : 'var(--surface)',
        border: `1px solid ${dark ? 'transparent' : 'var(--line)'}`,
        color: dark ? 'var(--surface)' : 'var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        fontSize: 15, fontWeight: 600, cursor: 'pointer',
        transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', gap: 4 }}>
          {[0,1,2].map((i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: dark ? 'var(--surface)' : 'var(--ink)',
              animation: `dot-bounce 0.9s ${i * 0.18}s infinite ease-in-out`,
            }} />
          ))}
        </span>
      ) : (
        <>{icon && icon}{label}</>
      )}
    </button>
  );
}
