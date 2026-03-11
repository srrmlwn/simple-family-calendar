import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Load Nunito font if not already loaded
if (!document.querySelector('link[href*="Nunito"]')) {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

const BLUE = '#3B5BDB';
const INDIGO = '#4C3BCF';
const CREAM = '#FFFBF5';
const DARK = '#1C1917';
const MUTED = '#78716C';
const BORDER = '#E7E5E4';
const DARK_PANEL = '#1E1B4B';

const DEMO_PHRASES = [
  {
    text: "Emma has soccer Saturday at 9am",
    card: { title: "Soccer Practice", time: "Sat · 9:00 AM", tag: "Emma", color: "#3B5BDB" },
  },
  {
    text: "Dentist Monday at 3pm — remind Sarah",
    card: { title: "Dentist Appointment", time: "Mon · 3:00 PM", tag: "Sarah", color: "#7048E8" },
  },
  {
    text: "Jake's birthday dinner Friday at 7",
    card: { title: "Birthday Dinner", time: "Fri · 7:00 PM", tag: "Jake", color: "#E67700" },
  },
];

// ── Animated NLP demo ────────────────────────────────────────────────────────

const NLPDemo: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    const phrase = DEMO_PHRASES[idx].text;
    let t: ReturnType<typeof setTimeout>;

    if (!showCard) {
      if (typed.length < phrase.length) {
        t = setTimeout(() => setTyped(phrase.slice(0, typed.length + 1)), 62);
      } else {
        t = setTimeout(() => setShowCard(true), 480);
      }
    } else {
      t = setTimeout(() => {
        setShowCard(false);
        setTimeout(() => {
          setTyped('');
          setIdx(i => (i + 1) % DEMO_PHRASES.length);
        }, 350);
      }, 2700);
    }
    return () => clearTimeout(t);
  }, [typed, showCard, idx]);

  const card = DEMO_PHRASES[idx].card;

  return (
    <div style={{
      background: DARK_PANEL,
      borderRadius: 20,
      padding: 20,
      width: '100%',
      maxWidth: 400,
      boxShadow: '0 28px 72px rgba(30,27,75,0.28)',
    }}>
      {/* Window chrome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
        <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', fontFamily: 'inherit' }}>
          kinroo.ai
        </span>
      </div>

      {/* Event card (appears after typing) */}
      <div style={{ minHeight: 96, marginBottom: 12 }}>
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          borderRadius: 12,
          padding: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          opacity: showCard ? 1 : 0,
          transform: showCard ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
          transition: 'opacity 0.32s ease, transform 0.32s ease',
          pointerEvents: showCard ? 'auto' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: card.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontSize: 17,
            }}>📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2, fontFamily: 'inherit' }}>{card.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontFamily: 'inherit' }}>{card.time}</div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: card.color,
              background: `${card.color}28`, padding: '3px 8px', borderRadius: 6, fontFamily: 'inherit',
            }}>{card.tag}</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button style={{
              flex: 1, padding: '8px 0', borderRadius: 8, background: card.color,
              border: 'none', color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            }}>Add to calendar ✓</button>
            <button style={{
              padding: '8px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.1)',
              border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Edit</button>
          </div>
        </div>
        {!showCard && (
          <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: 'inherit' }}>Events appear here instantly</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{
        background: 'rgba(255,255,255,0.09)',
        borderRadius: 12, padding: '13px 14px',
        border: '1px solid rgba(255,255,255,0.13)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', minHeight: 22, fontFamily: 'inherit' }}>
          {typed || <span style={{ color: 'rgba(255,255,255,0.25)' }}>Add an event…</span>}
          {!showCard && (
            <span style={{
              display: 'inline-block', width: 2, height: 15,
              background: '#fff', marginLeft: 1, verticalAlign: 'middle',
              animation: 'blink 1s step-end infinite',
            }} />
          )}
        </div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'inherit' }}>Plain English · always</span>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 13 }}>↑</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Calendar + chat mockup ───────────────────────────────────────────────────

const AppMockup: React.FC = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const events = [
    { day: 0, top: 28, h: 36, color: '#3B5BDB', label: 'Team call' },
    { day: 1, top: 52, h: 32, color: '#7048E8', label: 'Dentist' },
    { day: 2, top: 18, h: 28, color: '#E67700', label: 'Soccer' },
    { day: 2, top: 58, h: 24, color: '#3B5BDB', label: 'Pickup' },
    { day: 4, top: 36, h: 44, color: '#2F9E44', label: 'Birthday' },
    { day: 5, top: 14, h: 42, color: '#3B5BDB', label: 'Soccer' },
  ];

  return (
    <div style={{ display: 'flex', gap: 10, padding: 14, minHeight: 220 }}>
      {/* Calendar grid */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: DARK, fontFamily: 'inherit' }}>March 2026</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#F1F0EF' }} />
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#F1F0EF' }} />
          </div>
        </div>
        <div style={{ display: 'flex', height: 150 }}>
          {days.map((day, i) => (
            <div key={day} style={{
              flex: 1, borderRight: i < 6 ? `1px solid ${BORDER}` : 'none',
              position: 'relative', paddingTop: 4,
            }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: MUTED, textAlign: 'center', marginBottom: 2, fontFamily: 'inherit' }}>{day}</div>
              {events.filter(e => e.day === i).map((ev, j) => (
                <div key={j} style={{
                  position: 'absolute', top: ev.top, left: 2, right: 2,
                  height: ev.h, borderRadius: 4, background: ev.color, padding: '2px 3px',
                }}>
                  <span style={{ fontSize: 6, color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{ev.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Chat sidebar */}
      <div style={{ width: 150, background: '#fff', borderRadius: 10, border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '8px 10px 5px', borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: BLUE, fontFamily: 'inherit' }}>kinroo.ai</span>
        </div>
        <div style={{ flex: 1, padding: '7px 7px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ alignSelf: 'flex-end', background: BLUE, borderRadius: '7px 7px 2px 7px', padding: '4px 6px', maxWidth: '88%' }}>
            <span style={{ fontSize: 7.5, color: '#fff', fontFamily: 'inherit' }}>Emma soccer Sat 9am</span>
          </div>
          <div style={{ background: '#F8F7FF', borderRadius: '2px 7px 7px 7px', padding: '5px 6px', border: '1px solid #E0DCFF' }}>
            <div style={{ fontSize: 7, fontWeight: 800, color: DARK, marginBottom: 2, fontFamily: 'inherit' }}>Soccer Practice</div>
            <div style={{ fontSize: 7, color: MUTED, fontFamily: 'inherit' }}>Sat · 9:00 AM · Emma</div>
            <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
              <div style={{ flex: 1, background: BLUE, borderRadius: 3, padding: '2px 0', textAlign: 'center' }}>
                <span style={{ fontSize: 6.5, color: '#fff', fontWeight: 800, fontFamily: 'inherit' }}>Add ✓</span>
              </div>
              <div style={{ flex: 1, background: '#F1F0EF', borderRadius: 3, padding: '2px 0', textAlign: 'center' }}>
                <span style={{ fontSize: 6.5, color: MUTED, fontFamily: 'inherit' }}>Edit</span>
              </div>
            </div>
          </div>
          <div style={{ alignSelf: 'flex-end', background: BLUE, borderRadius: '7px 7px 2px 7px', padding: '4px 6px', maxWidth: '88%' }}>
            <span style={{ fontSize: 7.5, color: '#fff', fontFamily: 'inherit' }}>What's this week?</span>
          </div>
          <div style={{ background: '#F8F7FF', borderRadius: '2px 7px 7px 7px', padding: '5px 6px', border: '1px solid #E0DCFF' }}>
            <div style={{ fontSize: 7, color: DARK, lineHeight: 1.5, fontFamily: 'inherit' }}>3 events — Soccer Sat, Dentist Mon, Team call Tue.</div>
          </div>
        </div>
        <div style={{ padding: '4px 6px', borderTop: `1px solid ${BORDER}`, background: '#FAFAF9' }}>
          <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 5, padding: '3px 6px' }}>
            <span style={{ fontSize: 7, color: '#C4C0BA', fontFamily: 'inherit' }}>Ask anything…</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main landing page ────────────────────────────────────────────────────────

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>k</span>
          </div>
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
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#EEF2FF', borderRadius: 20, padding: '5px 13px', marginBottom: 26,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: BLUE }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>Free to use · No credit card</span>
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

        <p style={{
          fontSize: 20, fontWeight: 600, color: MUTED,
          margin: '0 0 14px', letterSpacing: '-0.01em',
        }}>
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
          Takes 30 seconds to set up. Works on every device.
        </p>
      </div>

      {/* Right — NLP demo */}
      <div style={{ flex: '1 1 340px', display: 'flex', justifyContent: 'center' }}>
        <NLPDemo />
      </div>
    </section>

    {/* PROBLEM STRIP */}
    <section style={{ background: '#fff', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '52px 24px',
        display: 'flex', flexWrap: 'wrap',
      }}>
        {[
          { emoji: '📱', title: 'Buried in group texts', desc: 'Important plans get lost in endless threads and sticky notes that nobody revisits.' },
          { emoji: '😫', title: '12 taps per event', desc: "Most calendar apps weren't built for parents. Every event is a multi-step form. Every time." },
          { emoji: '🤷', title: "Nobody checks the calendar", desc: 'You set it up. They ignore it. Shared family calendars fail because maintenance takes too much effort.' },
        ].map((item, i) => (
          <div key={i} style={{
            flex: '1 1 260px', padding: '20px 28px',
            borderRight: i < 2 ? `1px solid ${BORDER}` : 'none',
          }}>
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
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          How it works
        </h2>
        <p style={{ fontSize: 16, color: MUTED, margin: 0 }}>Three steps. That's it.</p>
      </div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {[
          { n: '1', title: 'Type what\'s happening', desc: 'No forms. Just say it like you\'d text someone. "Emma has soccer Saturday at 9am" is everything kinroo.ai needs.', color: BLUE },
          { n: '2', title: 'Confirm in one tap', desc: 'kinroo.ai parses the details and shows you a card. Tap to add, tap to edit. Done in seconds.', color: INDIGO },
          { n: '3', title: 'Everyone stays in sync', desc: 'Family members get notified automatically. Your morning digest has the full picture every day.', color: '#7048E8' },
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

    {/* APP MOCKUP */}
    <section style={{
      background: 'linear-gradient(160deg, #EEF2FF 0%, #F0F0FF 100%)',
      borderTop: '1px solid #E0DCFF', borderBottom: '1px solid #E0DCFF',
    }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
            Calendar grid meets AI chat
          </h2>
          <p style={{ fontSize: 16, color: MUTED, margin: 0 }}>
            Your week at a glance. Your AI assistant one message away.
          </p>
        </div>
        <div style={{
          background: '#F8F7FF', borderRadius: 18, border: '1px solid #E0DCFF',
          boxShadow: '0 20px 60px rgba(74,60,204,0.12)',
          overflow: 'hidden', maxWidth: 820, margin: '0 auto',
        }}>
          {/* Fake browser bar */}
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
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 900, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Everything your family needs
        </h2>
        <p style={{ fontSize: 16, color: MUTED, margin: 0 }}>No bloat. Just what matters.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}>
        {[
          { emoji: '🗣️', title: 'Natural language first', desc: "Type events like you'd say them. No date pickers. No dropdowns. Just words." },
          { emoji: '☀️', title: 'Morning digest', desc: 'A daily email with today\'s schedule so you wake up knowing the plan.' },
          { emoji: '👨‍👩‍👧', title: 'Built for families', desc: 'Add family members as contacts. Send iCal invites. Everyone stays notified.' },
          { emoji: '📱', title: 'Works everywhere', desc: 'iPhone, Android, any browser. Install it as an app or use it in your tab.' },
        ].map((f, i) => (
          <div key={i} style={{
            background: '#fff', borderRadius: 14, padding: '24px 22px',
            border: `1px solid ${BORDER}`,
          }}>
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
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>k</span>
          </div>
          <span style={{
            fontWeight: 800, fontSize: 15,
            background: `linear-gradient(135deg, ${BLUE}, ${INDIGO})`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>kinroo.ai</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/privacy" style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>Privacy</Link>
          <Link to="/terms" style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>Terms</Link>
          <a href="mailto:hello@kinroo.ai" style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 600 }}>
            hello@kinroo.ai
          </a>
        </div>
        <span style={{ fontSize: 13, color: MUTED }}>© {new Date().getFullYear()} kinroo.ai</span>
      </div>
    </footer>

    <style>{`
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `}</style>
  </div>
);

export default LandingPage;
