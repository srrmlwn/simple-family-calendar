import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Design tokens ──────────────────────────────────────────────────────────────
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

// ── Shared atoms ───────────────────────────────────────────────────────────────

interface CardData {
  icon: string; title: string; time: string; duration: string;
  person: string | null; strip: string; bg: string;
}

const EventCard: React.FC<{ card: CardData }> = ({ card }) => (
  <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
    <div style={{ width: 4, flexShrink: 0, background: card.strip }} />
    <div style={{ flex: 1, padding: '9px 11px', background: card.bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 13, flexShrink: 0 }}>{card.icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_BASE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</span>
      </div>
      <p style={{ fontSize: 11, color: TEXT_MUTED, margin: '3px 0 0 18px' }}>
        {card.time}<span style={{ color: BORDER_MID }}> · {card.duration}</span>
      </p>
      {card.person && (
        <div style={{ marginTop: 4, marginLeft: 18 }}>
          <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.7)', border: `1px solid ${BORDER}`, borderRadius: 20, padding: '2px 7px', color: TEXT_BASE, fontWeight: 600 }}>{card.person}</span>
        </div>
      )}
    </div>
  </div>
);

const ThinkingDots: React.FC<{ color?: string }> = ({ color = ACCENT_BOR }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 2, paddingTop: 2 }}>
    {[0, 1, 2].map(i => (
      <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
    ))}
  </div>
);

const BrowserChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, background: BG_APP, flexShrink: 0 }}>
      {['#FFCDD2', '#FFF9C4', '#C8E6C9'].map((c, i) => (
        <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
      ))}
      <div style={{ flex: 1, textAlign: 'center', marginRight: 36 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_MUTED }}>kinroo.ai</span>
      </div>
    </div>
    {children}
  </div>
);

// ── Tab 1: Web app demo ────────────────────────────────────────────────────────

const WEB_CARD: CardData = { icon: '⚽', title: 'Soccer Practice', time: 'Sat · 9:00 AM', duration: '1h', person: 'Emma', strip: '#FBBF24', bg: '#FFFBEB' };
const WEB_INPUT = 'Emma has soccer Saturday at 9am';
const WEB_REPLY = 'Added Soccer Practice for Emma on Saturday!';

const WebDemo: React.FC = () => {
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<'typing' | 'sent' | 'thinking' | 'shown'>('typing');

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === 'typing') {
      if (typed.length < WEB_INPUT.length) {
        t = setTimeout(() => setTyped(WEB_INPUT.slice(0, typed.length + 1)), 58);
      } else {
        t = setTimeout(() => setPhase('sent'), 400);
      }
    } else if (phase === 'sent') {
      t = setTimeout(() => setPhase('thinking'), 80);
    } else if (phase === 'thinking') {
      t = setTimeout(() => setPhase('shown'), 850);
    }
    return () => clearTimeout(t);
  }, [typed, phase]);

  const isTyping  = phase === 'typing';
  const isSent    = phase !== 'typing';
  const isThinking = phase === 'thinking';
  const isShown   = phase === 'shown';

  return (
    <BrowserChrome>
      <div className="demo-chat" style={{ flex: 1, padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
        {/* Faded prior context */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.3 }}>
          <div style={{ background: ACCENT, color: ACCENT_BG, fontSize: 12, fontWeight: 600, padding: '7px 11px', borderRadius: '14px 14px 3px 14px' }}>What's on this week?</div>
        </div>
        <div style={{ opacity: 0.3 }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, background: '#ede6da', padding: '7px 11px', borderRadius: '3px 14px 14px 14px', fontSize: 12, color: TEXT_BASE }}>
            <span style={{ color: '#22C55E', fontSize: 11 }}>✓</span>
            <span>3 events — Soccer Sat, Dentist Mon, Team call Tue.</span>
          </div>
        </div>

        {/* User message */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', opacity: isSent ? 1 : 0, transform: isSent ? 'none' : 'translateY(6px)', transition: 'opacity 0.22s, transform 0.22s' }}>
          <div style={{ background: ACCENT, color: ACCENT_BG, fontSize: 13, fontWeight: 600, padding: '8px 12px', borderRadius: '14px 14px 3px 14px' }}>{WEB_INPUT}</div>
        </div>

        {isThinking && <ThinkingDots />}

        <div style={{ opacity: isShown ? 1 : 0, transform: isShown ? 'none' : 'translateY(8px)', transition: 'opacity 0.28s, transform 0.28s' }}>
          <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, background: '#ede6da', padding: '8px 12px', borderRadius: '3px 14px 14px 14px', marginBottom: 8, fontSize: 13, color: TEXT_BASE }}>
            <span style={{ color: '#22C55E', flexShrink: 0, fontSize: 12 }}>✓</span>
            <span style={{ fontWeight: 500 }}>{WEB_REPLY}</span>
          </div>
          <EventCard card={WEB_CARD} />
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}`, background: BG_APP, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG_SURFACE, border: `1.5px solid ${isTyping ? ACCENT : BORDER}`, borderRadius: 10, padding: '8px 10px', transition: 'border-color 0.2s' }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isTyping ? TEXT_BASE : TEXT_MUTED, minHeight: 20 }}>
            {isTyping
              ? <>{typed}<span style={{ display: 'inline-block', width: 1.5, height: 14, background: ACCENT, marginLeft: 1, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} /></>
              : 'Add an event…'
            }
          </div>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: isTyping ? ACCENT : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ color: isTyping ? ACCENT_BG : TEXT_MUTED, fontSize: 12 }}>↑</span>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
};

// ── Tab 2: Voice demo ──────────────────────────────────────────────────────────

const VOICE_TEXT = 'Dentist Monday at three pm';
const VOICE_CARD: CardData = { icon: '🦷', title: 'Dentist Appointment', time: 'Mon · 3:00 PM', duration: '1h', person: null, strip: '#14B8A6', bg: '#F0FDFA' };
const WAVEFORM_HEIGHTS = [5, 10, 16, 8, 13, 7, 18, 6, 12, 9];

const VoiceDemo: React.FC = () => {
  // 0=idle, 1=listening, 2=transcribing, 3=thinking, 4=shown
  const [step, setStep] = useState(0);
  const [transcribed, setTranscribed] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setStep(1), 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    const t = setTimeout(() => setStep(2), 2400);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step !== 2) return;
    if (transcribed.length < VOICE_TEXT.length) {
      const t = setTimeout(() => setTranscribed(VOICE_TEXT.slice(0, transcribed.length + 1)), 62);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStep(3), 400);
    return () => clearTimeout(t);
  }, [step, transcribed]);

  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => setStep(4), 900);
    return () => clearTimeout(t);
  }, [step]);

  const isListening = step === 1;
  const isActive    = step >= 1 && step < 4;

  return (
    <BrowserChrome>
      <div className="demo-chat" style={{ flex: 1, padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, overflowY: 'auto' }}>

        {/* Mic button with pulse rings */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, flexShrink: 0 }}>
          {isListening && <>
            <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: ACCENT, opacity: 0.12, animation: 'micPulse 1.5s ease-out infinite' }} />
            <div style={{ position: 'absolute', width: 62, height: 62, borderRadius: '50%', background: ACCENT, opacity: 0.18, animation: 'micPulse 1.5s ease-out 0.35s infinite' }} />
          </>}
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: isActive ? ACCENT : BORDER_MID, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.3s', zIndex: 1, boxShadow: isListening ? `0 0 0 4px ${ACCENT_BG}` : 'none' }}>
            <span style={{ fontSize: 22 }}>🎤</span>
          </div>
        </div>

        {/* Waveform / transcription */}
        <div style={{ textAlign: 'center', minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {step === 0 && <span style={{ fontSize: 13, color: TEXT_MUTED }}>Tap mic to speak</span>}
          {step === 1 && (
            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 28 }}>
              {WAVEFORM_HEIGHTS.map((h, i) => (
                <div key={i} style={{ width: 3, height: h, background: ACCENT, borderRadius: 2, animation: `wavebar 0.7s ease-in-out ${i * 0.07}s infinite alternate`, opacity: 0.85 }} />
              ))}
            </div>
          )}
          {step >= 2 && step < 4 && (
            <p style={{ fontSize: 14, fontWeight: 600, color: TEXT_BASE, margin: 0 }}>
              "{transcribed}{step === 2 && transcribed.length < VOICE_TEXT.length && <span style={{ display: 'inline-block', width: 1.5, height: 13, background: ACCENT, marginLeft: 1, verticalAlign: 'middle', animation: 'blink 1s step-end infinite' }} />}"
            </p>
          )}
        </div>

        {step === 3 && <ThinkingDots />}

        {step === 4 && (
          <div style={{ width: '100%', animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, background: '#ede6da', padding: '8px 12px', borderRadius: '3px 14px 14px 14px', marginBottom: 8, fontSize: 13, color: TEXT_BASE }}>
              <span style={{ color: '#22C55E', flexShrink: 0, fontSize: 12 }}>✓</span>
              <span style={{ fontWeight: 500 }}>Got it — Dentist on Monday at 3pm.</span>
            </div>
            <EventCard card={VOICE_CARD} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${BORDER}`, background: BG_APP, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: BG_SURFACE, border: `1.5px solid ${isActive ? ACCENT : BORDER}`, borderRadius: 10, padding: '8px 10px', transition: 'border-color 0.2s' }}>
          <div style={{ flex: 1, fontSize: 13, color: TEXT_MUTED, minHeight: 20 }}>
            {step === 0 && 'Add an event…'}
            {step === 1 && <span style={{ color: ACCENT, fontWeight: 600 }}>Listening…</span>}
            {step === 2 && (transcribed || 'Transcribing…')}
            {step >= 3 && 'Add an event…'}
          </div>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: isActive ? ACCENT : BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ fontSize: 14, lineHeight: 1 }}>🎤</span>
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
};

// ── Tab 3: Email forward demo ──────────────────────────────────────────────────

const FWDEMAIL_EVENTS = ['⚽ Soccer Practice — Thu 4:30 PM', '⚽ Soccer Practice — Sat 9:00 AM', '⚽ Soccer Practice — Mon 4:30 PM', '🏆 Tournament — Sun 11:00 AM'];

const ForwardDemo: React.FC = () => {
  // 0→1 email shown, →2 thinking, →3 events found, →4 confirmed
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = [700, 1200, 1500, 1600];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let total = 0;
    delays.forEach((d, i) => { total += d; timers.push(setTimeout(() => setStep(i + 1), total)); });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <BrowserChrome>
      <div className="demo-chat" style={{ flex: 1, padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {/* Faded email being forwarded */}
        <div style={{ opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.3s', background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
          <div style={{ color: TEXT_MUTED, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: TEXT_BASE }}>Fwd:</span> Spring Soccer Schedule 2025
          </div>
          <div style={{ color: TEXT_MUTED, marginBottom: 2 }}>
            <span style={{ fontWeight: 600 }}>To:</span>{' '}
            <span style={{ color: ACCENT, fontWeight: 600 }}>add@kinroo.ai</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 8px', background: BG_APP, borderRadius: 7, border: `1px solid ${BORDER}` }}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: '#e8534a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 14 }}>📄</span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_BASE }}>soccer_schedule.pdf</div>
              <div style={{ fontSize: 10, color: TEXT_MUTED }}>84 KB</div>
            </div>
          </div>
        </div>

        {step === 2 && <ThinkingDots />}

        {step >= 3 && (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, background: '#ede6da', padding: '8px 12px', borderRadius: '3px 14px 14px 14px', marginBottom: 8, fontSize: 13, color: TEXT_BASE }}>
              <span style={{ color: '#22C55E', flexShrink: 0, fontSize: 12 }}>✓</span>
              <span style={{ fontWeight: 500 }}>Found 4 events in this schedule:</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {FWDEMAIL_EVENTS.map((e, i) => (
                <div key={i} style={{ fontSize: 12, color: TEXT_MUTED, padding: '4px 8px', background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: 7 }}>{e}</div>
              ))}
            </div>
          </div>
        )}

        {step >= 4 && (
          <div style={{ animation: 'fadeUp 0.25s ease', display: 'inline-flex', alignItems: 'flex-start', gap: 6, background: '#ede6da', padding: '8px 12px', borderRadius: '3px 14px 14px 14px', fontSize: 13, color: TEXT_BASE }}>
            <span style={{ color: '#22C55E', flexShrink: 0, fontWeight: 700, fontSize: 12 }}>✓</span>
            <span style={{ fontWeight: 500 }}>Added 4 events to your calendar!</span>
          </div>
        )}
      </div>

      {/* Address bar reminder */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${BORDER}`, background: BG_APP, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: TEXT_MUTED }}>Forward schedules & PDFs to</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: ACCENT }}>add@kinroo.ai</span>
      </div>
    </BrowserChrome>
  );
};

// ── Demo showcase (tabbed) ─────────────────────────────────────────────────────

const TABS = [
  { key: 'web',     label: 'Web',   icon: '🖥️' },
  { key: 'voice',   label: 'Voice', icon: '🎤' },
  { key: 'forward', label: 'Email', icon: '📧' },
] as const;

const TAB_DURATIONS = [8500, 9500, 10500];

const DemoShowcase: React.FC = () => {
  const [tabIdx, setTabIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const switchTab = useCallback((idx: number) => {
    setTabIdx(idx);
    setAnimKey(k => k + 1);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => switchTab((tabIdx + 1) % 3), TAB_DURATIONS[tabIdx]);
    return () => clearTimeout(t);
  }, [tabIdx, animKey, switchTab]);

  return (
    <div style={{
      background: BG_SURFACE, borderRadius: 16, width: '100%', maxWidth: 380, height: 500,
      boxShadow: '0 24px 64px rgba(30,26,20,0.13), 0 4px 12px rgba(30,26,20,0.06)',
      border: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, background: BG_APP, flexShrink: 0 }}>
        {TABS.map((tab, i) => (
          <button
            key={tab.key}
            onClick={() => switchTab(i)}
            style={{
              flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer',
              background: tabIdx === i ? BG_SURFACE : 'transparent',
              borderBottom: `2px solid ${tabIdx === i ? ACCENT : 'transparent'}`,
              color: tabIdx === i ? ACCENT : TEXT_MUTED,
              fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              transition: 'color 0.15s, background 0.15s',
            }}
          >
            <span style={{ fontSize: 15 }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Demo panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tabIdx === 0 && <WebDemo     key={`web-${animKey}`} />}
        {tabIdx === 1 && <VoiceDemo   key={`voice-${animKey}`} />}
        {tabIdx === 2 && <ForwardDemo key={`fwd-${animKey}`} />}
      </div>
    </div>
  );
};

// ── Shared page atoms ──────────────────────────────────────────────────────────

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

// ── Landing page ───────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => {
  const { loginWithGoogle, loading } = useAuth();
  const location = useLocation();
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { error?: string; message?: string; info?: string } | null;
    if (state?.info) {
      setAuthInfo(state.info);
      window.history.replaceState({}, document.title);
      return;
    }
    if (state?.error) {
      setAuthError({ title: state.error, message: state.message || 'Please try again.' });
      window.history.replaceState({}, document.title);
      return;
    }
    const params = new URLSearchParams(location.search);
    const urlError = params.get('error');
    if (urlError === 'access_denied') {
      setAuthError({ title: 'Access Restricted', message: "kinroo.ai is currently in private beta. Your email is not on the access list. Reach out at hello@kinroo.ai to be added." });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlError === 'auth_failed') {
      setAuthError({ title: 'Sign-in Failed', message: 'Something went wrong. Please try again.' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

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
      {/* Grain overlay */}
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
        <div style={{ flex: '1 1 360px' }}>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 800, lineHeight: 1.07, margin: '0 0 18px', letterSpacing: '-0.03em', color: TEXT_BASE }}>
            Family life,<br />
            <span style={{ color: ACCENT }}>finally organized.</span>
          </h1>
          <p style={{ fontSize: 17, fontWeight: 500, color: TEXT_MUTED, margin: '0 0 8px', maxWidth: 420, lineHeight: 1.6 }}>
            The family calendar that actually listens.
          </p>
          <ul style={{ fontSize: 15, color: TEXT_MUTED, margin: '0 0 32px', maxWidth: 420, lineHeight: 1.75, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              <>Type "Emma soccer Saturday 9am" and it's done</>,
              <>Speak it — tap the mic and say what's happening, hands-free</>,
              <>Forward a school email or schedule PDF to <span style={{ color: ACCENT, fontWeight: 600 }}>add@kinroo.ai</span> and events appear automatically</>,
            ].map((text, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: ACCENT, fontWeight: 700, fontSize: 15, lineHeight: 1.75, flexShrink: 0 }}>✓</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          {authInfo && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: ACCENT_BG, border: `1px solid ${ACCENT_BOR}` }}>
              <p style={{ fontSize: 14, color: ACCENT, margin: 0 }}>{authInfo}</p>
            </div>
          )}
          {authError && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#991b1b', margin: '0 0 2px' }}>{authError.title}</p>
              <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{authError.message}</p>
            </div>
          )}
          {signInBtn(true)}
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Free', 'No credit card', 'Works on every device'].map(label => (
              <span key={label} style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, background: BG_SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '3px 10px' }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Live demo */}
        <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
          <DemoShowcase />
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ borderTop: `1px solid ${BORDER}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ padding: '48px 0 0', textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 10px' }}>Everything a family needs</p>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', color: TEXT_BASE, margin: '0 0 40px' }}>
              Add events the way you already communicate
            </h2>
          </div>
          <div className="landing-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {[
              { icon: '🗣️', title: 'Talk, don\'t tap',  desc: 'Just say what\'s happening. No date pickers, no dropdowns, no friction.' },
              { icon: '📧', title: 'Forward anything',   desc: 'Coach emails, school PDFs — forward to add@kinroo.ai and events appear.' },
              { icon: '👨‍👩‍👧', title: 'Everyone in sync', desc: 'Assign events to family members. iCal invites go out automatically.' },
              { icon: '📱', title: 'Works everywhere',    desc: 'Full web app on desktop or mobile — plus a native app wrapper for your phone.' },
            ].map((f, i, arr) => (
              <div key={i} style={{ padding: '32px 24px 40px', borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
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
        .demo-chat { scrollbar-width: none; -ms-overflow-style: none; }
        .demo-chat::-webkit-scrollbar { display: none; }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%           { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes micPulse {
          0%   { transform: scale(0.95); opacity: 0.18; }
          60%  { transform: scale(1.5);  opacity: 0; }
          100% { transform: scale(1.5);  opacity: 0; }
        }
        @keyframes wavebar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.2); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
