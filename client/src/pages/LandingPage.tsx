import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Load Nunito font if not already loaded
if (!document.querySelector('link[href*="Nunito"]')) {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

const BLUE   = '#3B5BDB';
const INDIGO = '#4C3BCF';
const CREAM  = '#FFFBF5';
const DARK   = '#1C1917';
const MUTED  = '#78716C';
const BORDER = '#E7E5E4';

// ── Demo data matching real ChatEventCard styles ──────────────────────────────

const DEMO_PHRASES = [
  {
    input:    "Emma has soccer Saturday at 9am",
    response: "Added Soccer Practice for Emma on Saturday!",
    card: {
      icon: '⚽', title: 'Soccer Practice',
      time: 'Sat, Mar 14 · 9:00 AM', duration: '1h', person: 'Emma',
      strip: '#FBBF24', bg: '#FFFBEB', iconColor: '#F59E0B',
    },
  },
  {
    input:    "Dentist Monday at 3pm",
    response: "Got it — Dentist Appointment on Monday at 3pm.",
    card: {
      icon: '🦷', title: 'Dentist Appointment',
      time: 'Mon, Mar 16 · 3:00 PM', duration: '1h', person: null,
      strip: '#F87171', bg: '#FEF2F2', iconColor: '#EF4444',
    },
  },
  {
    input:    "Jake's birthday dinner Friday at 7",
    response: "🎂 Birthday Dinner added for Friday evening!",
    card: {
      icon: '🎂', title: 'Birthday Dinner',
      time: 'Fri, Mar 20 · 7:00 PM', duration: '2h', person: 'Jake',
      strip: '#C084FC', bg: '#FAF5FF', iconColor: '#A855F7',
    },
  },
];

type DemoPhase = 'typing' | 'sent' | 'thinking' | 'shown';

// ── Realistic chat demo ───────────────────────────────────────────────────────

const NLPDemo: React.FC = () => {
  const [idx,   setIdx]   = useState(0);
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<DemoPhase>('typing');

  useEffect(() => {
    const phrase = DEMO_PHRASES[idx];
    let t: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (typed.length < phrase.input.length) {
        t = setTimeout(() => setTyped(phrase.input.slice(0, typed.length + 1)), 62);
      } else {
        t = setTimeout(() => setPhase('sent'), 420);
      }
    } else if (phase === 'sent') {
      t = setTimeout(() => setPhase('thinking'), 80);
    } else if (phase === 'thinking') {
      t = setTimeout(() => setPhase('shown'), 900);
    } else {
      // shown — hold then advance
      t = setTimeout(() => {
        setPhase('typing');
        setTyped('');
        setIdx(i => (i + 1) % DEMO_PHRASES.length);
      }, 3000);
    }
    return () => clearTimeout(t);
  }, [typed, phase, idx]);

  const phrase = DEMO_PHRASES[idx];
  const card   = phrase.card;
  const isTyping   = phase === 'typing';
  const isSent     = phase === 'sent' || phase === 'thinking' || phase === 'shown';
  const isThinking = phase === 'thinking';
  const isShown    = phase === 'shown';

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      width: '100%', maxWidth: 400,
      boxShadow: '0 24px 64px rgba(59,91,219,0.18), 0 4px 16px rgba(0,0,0,0.08)',
      border: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'inherit',
    }}>
      {/* Window chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '11px 14px', borderBottom: `1px solid ${BORDER}`,
        background: '#FAFAF9',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFCDD2' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFF9C4' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C8E6C9' }} />
        <div style={{ flex: 1, textAlign: 'center', marginRight: 36 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>kinroo.ai</span>
        </div>
      </div>

      {/* Chat thread */}
      <div style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 190 }}>

        {/* Static context messages (always visible, dimmed) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.35 }}>
          <div style={{
            background: '#6366F1', color: '#fff', fontSize: 12, fontWeight: 600,
            padding: '7px 11px', borderRadius: '14px 14px 3px 14px', maxWidth: '80%',
          }}>What's on this week?</div>
        </div>
        <div style={{ opacity: 0.35 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'flex-start', gap: 6,
            background: '#F3F4F6', padding: '7px 11px',
            borderRadius: '3px 14px 14px 14px', maxWidth: '88%', fontSize: 12, color: '#374151',
          }}>
            <span style={{ color: '#22C55E', marginTop: 1, fontSize: 11 }}>✓</span>
            <span>You have 3 events — Soccer Sat, Dentist Mon, Team call Tue.</span>
          </div>
        </div>

        {/* Animated user bubble */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          opacity: isSent ? 1 : 0,
          transform: isSent ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity 0.22s ease, transform 0.22s ease',
        }}>
          <div style={{
            background: '#6366F1', color: '#fff', fontSize: 13, fontWeight: 600,
            padding: '8px 12px', borderRadius: '14px 14px 3px 14px', maxWidth: '88%',
          }}>{phrase.input}</div>
        </div>

        {/* Thinking indicator */}
        {isThinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 2 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB',
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        )}

        {/* Assistant response + event card */}
        <div style={{
          opacity: isShown ? 1 : 0,
          transform: isShown ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.28s ease, transform 0.28s ease',
        }}>
          {/* Text bubble */}
          <div style={{
            display: 'inline-flex', alignItems: 'flex-start', gap: 6,
            background: '#F3F4F6', padding: '8px 12px',
            borderRadius: '3px 14px 14px 14px', marginBottom: 8, maxWidth: '88%',
            fontSize: 13, color: '#374151',
          }}>
            <span style={{ color: '#22C55E', marginTop: 1, flexShrink: 0, fontSize: 12 }}>✓</span>
            <span style={{ fontWeight: 500 }}>{phrase.response}</span>
          </div>

          {/* Event card — matches real ChatEventCard */}
          <div style={{
            display: 'flex', alignItems: 'stretch',
            borderRadius: 10, overflow: 'hidden',
            border: '1px solid #E5E7EB',
          }}>
            {/* Colored left strip */}
            <div style={{ width: 4, flexShrink: 0, background: card.strip }} />
            {/* Card body */}
            <div style={{ flex: 1, padding: '10px 11px', background: card.bg }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: card.iconColor, flexShrink: 0 }}>{card.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {card.title}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>›</span>
              </div>
              <p style={{ fontSize: 11, color: '#6B7280', margin: '3px 0 0 18px' }}>
                {card.time}
                <span style={{ color: '#9CA3AF' }}> · {card.duration}</span>
              </p>
              {card.person && (
                <div style={{ marginTop: 5, marginLeft: 18 }}>
                  <span style={{
                    fontSize: 10, background: 'rgba(255,255,255,0.7)',
                    border: '1px solid #E5E7EB', borderRadius: 20,
                    padding: '2px 7px', color: '#374151', fontWeight: 600,
                  }}>{card.person}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}`, background: '#FAFAF9' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: `1.5px solid ${isTyping ? BLUE : BORDER}`,
          borderRadius: 10, padding: '8px 10px',
          transition: 'border-color 0.2s',
        }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isTyping ? DARK : '#9CA3AF', minHeight: 20 }}>
            {isTyping
              ? <>{typed}<span style={{ display: 'inline-block', width: 1.5, height: 14, background: BLUE, marginLeft: 1, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} /></>
              : <span>Add an event…</span>
            }
          </div>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: isTyping ? `linear-gradient(135deg, ${BLUE}, ${INDIGO})` : '#E5E7EB',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}>
            <span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>↑</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── App mockup (calendar + real-style chat) ───────────────────────────────────

const AppMockup: React.FC = () => {
  const days   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const blocks = [
    { day: 0, top: 28, h: 36, color: '#6366F1', label: 'Team call' },
    { day: 1, top: 52, h: 30, color: '#F87171', label: 'Dentist'   },
    { day: 2, top: 18, h: 28, color: '#FBBF24', label: 'Soccer'    },
    { day: 2, top: 58, h: 24, color: '#6366F1', label: 'Pickup'    },
    { day: 4, top: 36, h: 44, color: '#C084FC', label: 'Birthday'  },
    { day: 5, top: 14, h: 42, color: '#FBBF24', label: 'Soccer'    },
  ];

  return (
    <div style={{ display: 'flex', gap: 10, padding: 14, minHeight: 220 }}>
      {/* Week grid */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: DARK }}>March 2026</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#F1F0EF' }} />
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#F1F0EF' }} />
          </div>
        </div>
        <div style={{ display: 'flex', height: 155 }}>
          {days.map((day, i) => (
            <div key={day} style={{ flex: 1, borderRight: i < 6 ? `1px solid ${BORDER}` : 'none', position: 'relative', paddingTop: 4 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: MUTED, textAlign: 'center', marginBottom: 2 }}>{day}</div>
              {blocks.filter(b => b.day === i).map((b, j) => (
                <div key={j} style={{ position: 'absolute', top: b.top, left: 2, right: 2, height: b.h, borderRadius: 3, background: b.color, padding: '2px 3px' }}>
                  <span style={{ fontSize: 6, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{b.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Chat sidebar — matching real UI styles */}
      <div style={{ width: 156, background: '#fff', borderRadius: 10, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '7px 9px 5px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: BLUE }}>kinroo.ai</span>
        </div>
        <div style={{ flex: 1, padding: '7px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* User bubble */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: '#6366F1', color: '#fff', fontSize: 7.5, fontWeight: 600, padding: '4px 7px', borderRadius: '8px 8px 2px 8px', maxWidth: '90%' }}>
              Emma soccer Sat 9am
            </div>
          </div>
          {/* Assistant bubble + event card */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 3, background: '#F3F4F6', padding: '4px 7px', borderRadius: '2px 8px 8px 8px', marginBottom: 4 }}>
              <span style={{ color: '#22C55E', fontSize: 7, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 7, color: '#374151' }}>Added Soccer Practice!</span>
            </div>
            {/* Mini event card */}
            <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
              <div style={{ width: 3, background: '#FBBF24', flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '4px 6px', background: '#FFFBEB' }}>
                <div style={{ fontSize: 7, fontWeight: 700, color: DARK }}>Soccer Practice</div>
                <div style={{ fontSize: 6.5, color: '#6B7280', marginTop: 1 }}>Sat · 9:00 AM · 1h</div>
                <span style={{ display: 'inline-block', marginTop: 3, fontSize: 6, background: 'rgba(255,255,255,0.7)', border: '1px solid #E5E7EB', borderRadius: 10, padding: '1px 5px', color: '#374151' }}>Emma</span>
              </div>
            </div>
          </div>
          {/* Another exchange */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: '#6366F1', color: '#fff', fontSize: 7.5, fontWeight: 600, padding: '4px 7px', borderRadius: '8px 8px 2px 8px', maxWidth: '90%' }}>
              What's this week?
            </div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 3, background: '#F3F4F6', padding: '4px 7px', borderRadius: '2px 8px 8px 8px', maxWidth: '92%' }}>
            <span style={{ color: '#22C55E', fontSize: 7, marginTop: 1 }}>✓</span>
            <span style={{ fontSize: 7, color: '#374151', lineHeight: 1.4 }}>3 events — Soccer Sat, Dentist Mon, Team call Tue.</span>
          </div>
        </div>
        <div style={{ padding: '4px 6px', borderTop: `1px solid ${BORDER}`, background: '#FAFAF9' }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 6px' }}>
            <span style={{ fontSize: 7, color: '#9CA3AF' }}>Ask anything…</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Logo mark (shared) ────────────────────────────────────────────────────────

const Logo: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <img
    src="/landing_page_logo_1024x1024.png"
    alt="kinroo.ai"
    style={{ width: size, height: size, display: 'block' }}
  />
);

// ── Main landing page ─────────────────────────────────────────────────────────

const LandingPage: React.FC = () => (
  <div style={{ fontFamily: "'Nunito', sans-serif", background: CREAM, minHeight: '100vh', color: DARK }}>

    {/* NAV */}
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,251,245,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '0 24px',
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logo size={30} />
          <span style={{
            fontWeight: 800, fontSize: 18,
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>kinroo.ai</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: MUTED, textDecoration: 'none', padding: '8px 14px' }}>
            Sign in
          </Link>
          <Link to="/register" style={{
            fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: 'none',
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            padding: '8px 18px', borderRadius: 8,
          }}>
            Get Started Free
          </Link>
        </div>
      </div>
    </nav>

    {/* HERO */}
    <section style={{
      maxWidth: 1120, margin: '0 auto',
      padding: 'clamp(52px, 8vw, 96px) 24px clamp(48px, 6vw, 80px)',
      display: 'flex', gap: 64, alignItems: 'center', flexWrap: 'wrap',
    }}>
      {/* Left */}
      <div style={{ flex: '1 1 380px' }}>
        <div style={{ marginBottom: 24 }}>
          <Logo size={64} />
        </div>

        <h1 style={{
          fontSize: 'clamp(40px, 5.5vw, 64px)', fontWeight: 900,
          lineHeight: 1.06, margin: '0 0 10px', letterSpacing: '-0.025em',
        }}>
          Family life,
          <br />
          <span style={{
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>finally organized.</span>
        </h1>

        <p style={{ fontSize: 20, fontWeight: 600, color: MUTED, margin: '0 0 14px', letterSpacing: '-0.01em' }}>
          The family calendar that actually listens.
        </p>

        <p style={{ fontSize: 16, lineHeight: 1.65, color: MUTED, margin: '0 0 36px', maxWidth: 440 }}>
          Add events in plain English. Get a morning digest. Keep the whole family in sync — without the 12-tap dance other calendar apps make you do.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/register" style={{
            fontSize: 16, fontWeight: 800, color: '#fff', textDecoration: 'none',
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            padding: '14px 28px', borderRadius: 10,
            boxShadow: `0 4px 20px ${BLUE}44`,
          }}>
            Get Started Free →
          </Link>
          <Link to="/login" style={{
            fontSize: 16, fontWeight: 700, color: BLUE, textDecoration: 'none',
            padding: '14px 24px', borderRadius: 10,
            border: `2px solid ${BORDER}`, background: '#fff',
          }}>
            Sign in
          </Link>
        </div>

        <p style={{ marginTop: 16, fontSize: 13, color: MUTED }}>
          Free to use · No credit card · Works on every device
        </p>
      </div>

      {/* Right — realistic chat demo */}
      <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'center' }}>
        <NLPDemo />
      </div>
    </section>

    {/* PROBLEM STRIP */}
    <section style={{ background: '#fff', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '52px 24px', display: 'flex', flexWrap: 'wrap' }}>
        {[
          { emoji: '📱', title: 'Buried in group texts',     desc: 'Important plans get lost in endless threads and sticky notes nobody revisits.' },
          { emoji: '😫', title: '12 taps per event',         desc: "Most calendar apps weren't built for parents. Every event is a multi-step form. Every time." },
          { emoji: '🤷', title: "Nobody checks the calendar", desc: 'You set it up. They ignore it. Shared family calendars fail because maintenance takes too much effort.' },
        ].map((item, i) => (
          <div key={i} style={{ flex: '1 1 260px', padding: '20px 28px', borderRight: i < 2 ? `1px solid ${BORDER}` : 'none' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>{item.emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{item.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: MUTED }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </section>

    {/* HOW IT WORKS */}
    <section style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 52 }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>How it works</h2>
        <p style={{ fontSize: 16, color: MUTED, margin: 0 }}>Three steps. That's it.</p>
      </div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {[
          { n: '1', title: "Type what's happening",   desc: 'No forms. Just say it like you\'d text someone. "Emma has soccer Saturday at 9am" is all kinroo.ai needs.', color: BLUE   },
          { n: '2', title: "AI adds it instantly",    desc: 'kinroo.ai parses the details and adds the event. Check the confirmation in the chat — done in seconds.',  color: INDIGO },
          { n: '3', title: "Everyone stays in sync",  desc: 'Family members get notified. Your morning digest has the full picture. Calendar updates in real time.',    color: '#7048E8' },
        ].map((step, i) => (
          <div key={i} style={{ flex: '1 1 260px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `${step.color}18`, border: `2px solid ${step.color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 20, color: step.color,
            }}>{step.n}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{step.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: MUTED }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* CHANNELS SECTION */}
    <section style={{ background: '#fff', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Add events without opening the app
          </h2>
          <p style={{ fontSize: 16, color: MUTED, margin: 0, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            kinroo.ai works wherever you already are. Text it, WhatsApp it, or forward an email — it all lands on your calendar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* WhatsApp / SMS */}
          <div style={{ flex: '1 1 280px', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ background: '#F0FDF4', padding: '24px 24px 20px', borderBottom: `1px solid #DCFCE7` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💬</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Text or WhatsApp</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>
                Save kinroo.ai's number in your contacts. Text it like you'd text anyone — no app, no login.
              </div>
            </div>
            <div style={{ padding: '16px 20px', background: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 11px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%' }}>
                    Soccer moved to Saturday 10am at Magnuson
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, background: '#F3F4F6', padding: '7px 11px', borderRadius: '3px 12px 12px 12px', maxWidth: '88%' }}>
                  <span style={{ color: '#22C55E', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 12, color: '#374151' }}>Got it — Soccer Practice moved to Sat 10:00 AM at Magnuson Park. Added!</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email forward */}
          <div style={{ flex: '1 1 280px', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ background: '#EFF6FF', padding: '24px 24px 20px', borderBottom: `1px solid #DBEAFE` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Forward any email</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>
                Forward a school schedule, coach email, or PDF flyer to <strong style={{ color: DARK }}>add@kinroo.ai</strong> — events extracted automatically.
              </div>
            </div>
            <div style={{ padding: '16px 20px', background: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {/* Forwarded email indicator */}
                <div style={{ background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 3, fontWeight: 700 }}>FORWARDED TO add@kinroo.ai</div>
                  <div style={{ fontSize: 11, color: DARK, fontWeight: 600 }}>⚽ Spring Soccer Season Schedule (PDF)</div>
                  <div style={{ fontSize: 10, color: MUTED }}>8 games, Mar–Jun</div>
                </div>
                {/* Reply */}
                <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, background: '#F3F4F6', padding: '7px 10px', borderRadius: 8, maxWidth: '95%' }}>
                  <span style={{ color: '#22C55E', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 11, color: '#374151' }}>Found 8 soccer games. Reply YES to add all, NO to skip.</span>
                </div>
              </div>
            </div>
          </div>

          {/* In-app chat */}
          <div style={{ flex: '1 1 280px', borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ background: '#EEF2FF', padding: '24px 24px 20px', borderBottom: `1px solid #E0E7FF` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>💻</div>
              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Chat in the app</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: MUTED }}>
                On desktop or mobile, the AI chat is always one tap away alongside your calendar.
              </div>
            </div>
            <div style={{ padding: '16px 20px', background: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: '#6366F1', color: '#fff', fontSize: 12, fontWeight: 600, padding: '7px 11px', borderRadius: '12px 12px 3px 12px', maxWidth: '85%' }}>
                    Jake's dentist Monday at 3pm
                  </div>
                </div>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, background: '#F3F4F6', padding: '7px 11px', borderRadius: '3px 12px 12px 12px', marginBottom: 6 }}>
                    <span style={{ color: '#22C55E', fontSize: 11, marginTop: 1, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, color: '#374151' }}>Added Dentist Appointment for Jake on Monday!</span>
                  </div>
                  {/* Mini event card */}
                  <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <div style={{ width: 4, background: '#F87171', flexShrink: 0 }} />
                    <div style={{ padding: '7px 10px', background: '#FEF2F2' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: DARK }}>Dentist Appointment</div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>Mon · 3:00 PM · 1h</div>
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, background: 'rgba(255,255,255,0.7)', border: '1px solid #E5E7EB', borderRadius: 20, padding: '1px 7px', color: '#374151', fontWeight: 600 }}>Jake</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* APP MOCKUP */}
    <section style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #F0F0FF 100%)', borderTop: '1px solid #E0DCFF', borderBottom: '1px solid #E0DCFF' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Calendar grid meets AI chat
          </h2>
          <p style={{ fontSize: 16, color: MUTED, margin: 0 }}>Your week at a glance. Your AI assistant one message away.</p>
        </div>
        <div style={{
          background: '#F8F7FF', borderRadius: 18, border: '1px solid #E0DCFF',
          boxShadow: '0 20px 60px rgba(74,60,204,0.12)',
          overflow: 'hidden', maxWidth: 820, margin: '0 auto',
        }}>
          <div style={{ background: '#fff', borderBottom: `1px solid ${BORDER}`, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFCDD2' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFF9C4' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C8E6C9' }} />
            </div>
            <div style={{ flex: 1, background: '#F5F4F2', borderRadius: 5, padding: '3px 10px', fontSize: 11, color: MUTED, fontWeight: 600 }}>
              kinroo.ai
            </div>
          </div>
          <AppMockup />
        </div>
      </div>
    </section>

    {/* FEATURES */}
    <section style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Everything your family needs</h2>
        <p style={{ fontSize: 16, color: MUTED, margin: 0 }}>No bloat. Just what matters.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
        {[
          { emoji: '🗣️', title: 'Natural language first', desc: "Type events like you'd say them. No date pickers, no dropdowns, no friction." },
          { emoji: '☀️', title: 'Morning digest',         desc: "A daily email with today's schedule — wake up knowing exactly what's happening." },
          { emoji: '👨‍👩‍👧', title: 'Built for families',    desc: 'Add family members as contacts. Send iCal invites automatically. Everyone stays notified.' },
          { emoji: '📱', title: 'Works everywhere',       desc: 'iPhone, Android, any browser. Install it as an app or use it straight from your tab.' },
        ].map((f, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '24px 22px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 30, marginBottom: 12 }}>{f.emoji}</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.65, color: MUTED }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </section>

    {/* BOTTOM CTA */}
    <section style={{ background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})` }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size={56} />
        </div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, color: '#fff', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
          Ready to try it?
        </h2>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', margin: '0 0 36px' }}>
          Free to use. Takes 30 seconds to set up. Your family will actually use it.
        </p>
        <Link to="/register" style={{
          display: 'inline-block', fontSize: 17, fontWeight: 800, color: BLUE,
          textDecoration: 'none', background: '#fff',
          padding: '15px 36px', borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}>
          Get Started Free →
        </Link>
        <p style={{ marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>
    </section>

    {/* FOOTER */}
    <footer style={{ background: '#fff', borderTop: `1px solid ${BORDER}` }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '26px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={24} />
          <span style={{
            fontWeight: 800, fontSize: 15,
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>kinroo.ai</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/privacy" style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>Privacy</Link>
          <Link to="/terms"   style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>Terms</Link>
          <a href="mailto:hello@kinroo.ai" style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>hello@kinroo.ai</a>
        </div>
        <span style={{ fontSize: 13, color: MUTED }}>© {new Date().getFullYear()} kinroo.ai</span>
      </div>
    </footer>

    <style>{`
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
        40%           { transform: translateY(-5px); opacity: 1;   }
      }
    `}</style>
  </div>
);

export default LandingPage;
