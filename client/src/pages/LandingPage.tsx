import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Design tokens — match index.css CSS variables exactly
const BG_APP     = '#f2ece0';
const BG_SURFACE = '#fefcf8';
const BORDER     = '#e2d9c8';
const BORDER_MID = '#cec3ae';
const TEXT_BASE  = '#1e1a14';
const TEXT_MUTED = '#7a6f65';
const ACCENT     = '#b35110';
const ACCENT_MID = '#d4650f';
const ACCENT_BG  = '#fef3e6';
const ACCENT_BOR = '#f0c090';

// ── NLP Demo ──────────────────────────────────────────────────────────────────

const DEMO_PHRASES = [
  {
    input:    'Emma has soccer Saturday at 9am',
    response: 'Added Soccer Practice for Emma on Saturday!',
    card: { icon: '⚽', title: 'Soccer Practice', time: 'Sat · 9:00 AM', duration: '1h', person: 'Emma', strip: '#FBBF24', bg: '#FFFBEB' },
  },
  {
    input:    'Dentist Monday at 3pm',
    response: 'Got it — Dentist Appointment on Monday at 3pm.',
    card: { icon: '🦷', title: 'Dentist Appointment', time: 'Mon · 3:00 PM', duration: '1h', person: null, strip: '#14B8A6', bg: '#F0FDFA' },
  },
  {
    input:    "Jake's birthday dinner Friday at 7",
    response: 'Birthday Dinner added for Friday evening!',
    card: { icon: '🎂', title: 'Birthday Dinner', time: 'Fri · 7:00 PM', duration: '2h', person: 'Jake', strip: ACCENT_MID, bg: ACCENT_BG },
  },
];

type DemoPhase = 'typing' | 'sent' | 'thinking' | 'shown';

const NLPDemo: React.FC = () => {
  const [idx,   setIdx]   = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<DemoPhase>('typing');

  useEffect(() => {
    const phrase = DEMO_PHRASES[idx];
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'typing') {
      if (typed.length < phrase.input.length) {
        t = setTimeout(() => setTyped(phrase.input.slice(0, typed.length + 1)), 58);
      } else {
        t = setTimeout(() => setPhase('sent'), 400);
      }
    } else if (phase === 'sent') {
      t = setTimeout(() => setPhase('thinking'), 80);
    } else if (phase === 'thinking') {
      t = setTimeout(() => setPhase('shown'), 850);
    } else {
      t = setTimeout(() => { setPhase('typing'); setTyped(''); setIdx(i => (i + 1) % DEMO_PHRASES.length); }, 3000);
    }
    return () => clearTimeout(t);
  }, [typed, phase, idx]);

  const phrase    = DEMO_PHRASES[idx];
  const card      = phrase.card;
  const isTyping  = phase === 'typing';
  const isSent    = phase !== 'typing';
  const isThinking = phase === 'thinking';
  const isShown   = phase === 'shown';

  return (
    <div style={{
      background: BG_SURFACE, borderRadius: 16, width: '100%', maxWidth: 380,
      boxShadow: '0 24px 64px rgba(30,26,20,0.13), 0 4px 12px rgba(30,26,20,0.06)',
      border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, background: BG_APP }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFCDD2' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFF9C4' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C8E6C9' }} />
        <div style={{ flex: 1, textAlign: 'center', marginRight: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>kinroo.ai</span>
        </div>
      </div>

      {/* Chat thread */}
      <div style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 196 }}>
        {/* Faded context */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.3 }}>
          <div style={{ background: ACCENT, color: ACCENT_BG, fontSize: 12, fontWeight: 600, padding: '7px 11px', borderRadius: '14px 14px 3px 14px', maxWidth: '80%' }}>
            What's on this week?
          </div>
        </div>
        <div style={{ opacity: 0.3 }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, background: '#ede6da', padding: '7px 11px', borderRadius: '3px 14px 14px 14px', maxWidth: '88%', fontSize: 12, color: TEXT_BASE }}>
            <span style={{ color: '#22C55E', marginTop: 1, fontSize: 11 }}>✓</span>
            <span>3 events — Soccer Sat, Dentist Mon, Team call Tue.</span>
          </div>
        </div>

        {/* Animated user bubble */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: isSent ? 1 : 0, transform: isSent ? 'translateY(0)' : 'translateY(6px)', transition: 'opacity 0.22s ease, transform 0.22s ease' }}>
          <div style={{ background: ACCENT, color: ACCENT_BG, fontSize: 13, fontWeight: 600, padding: '8px 12px', borderRadius: '14px 14px 3px 14px', maxWidth: '88%' }}>
            {phrase.input}
          </div>
        </div>

        {/* Thinking dots */}
        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 2 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT_BOR, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        )}

        {/* Response + event card */}
        <div style={{ opacity: isShown ? 1 : 0, transform: isShown ? 'translateY(0)' : 'translateY(8px)', transition: 'opacity 0.28s ease, transform 0.28s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, background: '#ede6da', padding: '8px 12px', borderRadius: '3px 14px 14px 14px', marginBottom: 8, maxWidth: '88%', fontSize: 13, color: TEXT_BASE }}>
            <span style={{ color: '#22C55E', marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>
            <span style={{ fontWeight: 500 }}>{phrase.response}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
            <div style={{ width: 4, flexShrink: 0, background: card.strip }} />
            <div style={{ flex: 1, padding: '10px 11px', background: card.bg }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{card.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_BASE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.title}</span>
              </div>
              <p style={{ fontSize: 11, color: TEXT_MUTED, margin: '3px 0 0 18px' }}>
                {card.time}<span style={{ color: BORDER_MID }}> · {card.duration}</span>
              </p>
              {card.person && (
                <div style={{ marginTop: 5, marginLeft: 18 }}>
                  <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '2px 7px', color: TEXT_BASE, fontWeight: 600 }}>{card.person}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}`, background: BG_APP }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG_SURFACE, border: `1.5px solid ${isTyping ? ACCENT : BORDER}`, borderRadius: 10, padding: '8px 10px', transition: 'border-color 0.2s' }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isTyping ? TEXT_BASE : TEXT_MUTED, minHeight: 20 }}>
            {isTyping
              ? <>{typed}<span style={{ display: 'inline-block', width: 1.5, height: 14, background: ACCENT, marginLeft: 1, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} /></>
              : <span>Add an event…</span>
            }
          </div>
          <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: isTyping ? ACCENT : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
            <span style={{ color: isTyping ? ACCENT_BG : TEXT_MUTED, fontSize: 12, lineHeight: 1 }}>↑</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Shared atoms ──────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0, display: 'block' }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const Logo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <img src="/landing_page_logo_1024x1024.png" alt="kinroo.ai" style={{ width: size, height: size, display: 'block', flexShrink: 0 }} />
);

const BrandName: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <span style={{ fontWeight: 800, fontSize: size, letterSpacing: '-0.04em', color: TEXT_BASE }}>
    kinroo<span style={{ color: ACCENT_MID }}>.ai</span>
  </span>
);

// ── Landing page ──────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  const { loginWithGoogle, loading } = useAuth();

  const signInBtn = (large?: boolean) => (
    <button
      onClick={loginWithGoogle}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: large ? 10 : 8,
        padding: large ? '13px 24px' : '7px 16px',
        borderRadius: large ? 10 : 8,
        background: BG_SURFACE,
        border: `1.5px solid ${BORDER}`,
        fontSize: large ? 16 : 14,
        fontWeight: 700,
        color: TEXT_BASE,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        boxShadow: large ? '0 2px 12px rgba(30,26,20,0.08)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        fontFamily: 'inherit',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT_BOR; e.currentTarget.style.boxShadow = `0 2px 20px rgba(30,26,20,0.12), 0 0 0 3px ${ACCENT_BG}`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = large ? '0 2px 12px rgba(30,26,20,0.08)' : 'none'; }}
    >
      <GoogleIcon />
      {loading ? 'Signing in…' : large ? 'Continue with Google' : 'Sign in'}
    </button>
  );

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      background: BG_APP, minHeight: '100vh', color: TEXT_BASE, letterSpacing: '-0.01em',
    }}>
      {/* Grain overlay — matches body::before in index.css */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.4,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }} />

      {/* NAV */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(242,236,224,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Logo size={26} />
            <BrandName size={18} />
          </div>
          {signInBtn()}
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        maxWidth: 1100, margin: '0 auto',
        padding: 'clamp(48px, 7vw, 88px) 24px clamp(44px, 5vw, 72px)',
        display: 'flex', gap: 52, alignItems: 'center', flexWrap: 'wrap',
        position: 'relative', zIndex: 1,
      }}>
        {/* Left */}
        <div style={{ flex: '1 1 360px' }}>
          <div style={{ marginBottom: 20 }}>
            <Logo size={56} />
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, lineHeight: 1.07, margin: '0 0 18px', letterSpacing: '-0.03em', color: TEXT_BASE }}>
            Family life,<br />
            <span style={{ color: ACCENT }}>finally organized.</span>
          </h1>

          <p style={{ fontSize: 17, fontWeight: 500, color: TEXT_MUTED, margin: '0 0 8px', maxWidth: 420, lineHeight: 1.6 }}>
            The family calendar that actually listens.
          </p>
          <p style={{ fontSize: 15, color: TEXT_MUTED, margin: '0 0 32px', maxWidth: 420, lineHeight: 1.65 }}>
            Type "Emma soccer Saturday 9am" and it's done. WhatsApp your kinroo.ai number from anywhere — no app needed. Forward a school email or schedule PDF to <span style={{ color: ACCENT, fontWeight: 600 }}>add@kinroo.ai</span> and events appear automatically.
          </p>

          {signInBtn(true)}

          <p style={{ marginTop: 14, fontSize: 13, color: TEXT_MUTED }}>
            Free · No credit card required · Works on every device
          </p>
        </div>

        {/* Right — live NLP demo */}
        <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
          <NLPDemo />
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ borderTop: `1px solid ${BORDER}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div className="landing-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {[
              { icon: '🗣️', title: 'Talk, don\'t tap',    desc: 'Just say what\'s happening. No date pickers, no dropdowns, no friction.' },
              { icon: '📧', title: 'Forward anything',     desc: 'Coach emails, school PDFs — forward to add@kinroo.ai and events appear.' },
              { icon: '👨‍👩‍👧', title: 'Everyone in sync', desc: 'Assign events to family members. iCal invites go out automatically.' },
              { icon: '💬', title: 'WhatsApp it',           desc: 'Text or WhatsApp your kinroo.ai number from anywhere. No app to open, no login required.' },
            ].map((f, i) => (
              <div key={i} style={{ padding: '32px 24px', borderRight: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.02em', color: TEXT_BASE }}>{f.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: TEXT_MUTED }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Logo size={20} />
            <BrandName size={14} />
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <Link to="/privacy" style={{ fontSize: 13, color: TEXT_MUTED, textDecoration: 'none', fontWeight: 600 }}>Privacy</Link>
            <Link to="/terms"   style={{ fontSize: 13, color: TEXT_MUTED, textDecoration: 'none', fontWeight: 600 }}>Terms</Link>
            <a href="mailto:hello@kinroo.ai" style={{ fontSize: 13, color: TEXT_MUTED, textDecoration: 'none', fontWeight: 600 }}>hello@kinroo.ai</a>
          </div>
          <span style={{ fontSize: 13, color: TEXT_MUTED }}>© {new Date().getFullYear()} kinroo.ai</span>
        </div>
      </footer>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-5px); opacity: 1; }
        }
        /* Features grid: at 2-col, last item in each row loses right border */
        @media (max-width: 900px) {
          .landing-features > div:nth-child(2n) { border-right: none !important; }
        }
        @media (max-width: 480px) {
          .landing-features > div { border-right: none !important; border-bottom: 1px solid ${BORDER}; }
          .landing-features > div:last-child { border-bottom: none; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
