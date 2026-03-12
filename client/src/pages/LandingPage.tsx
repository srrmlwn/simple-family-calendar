import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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

// WhatsApp colours
const WA_HEADER = '#075e54';
const WA_BG     = '#ddd4c8';
const WA_USER   = '#dcf8c6';
const WA_BOT    = '#ffffff';
const WA_TEXT   = '#303030';
const WA_MUTED  = '#667781';
const WA_GREEN  = '#25d366';

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

const WhatsAppChrome: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    <div style={{ background: WA_HEADER, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: WA_GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 16 }}>🗓️</span>
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>kinroo.ai</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>online</div>
      </div>
    </div>
    <div style={{ flex: 1, background: WA_BG, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const WaBubble: React.FC<{ from: 'user' | 'bot'; animate?: boolean; children: React.ReactNode }> = ({ from, animate, children }) => (
  <div style={{ display: 'flex', justifyContent: from === 'user' ? 'flex-end' : 'flex-start', animation: animate ? 'fadeUp 0.25s ease' : undefined }}>
    <div style={{ maxWidth: '84%', background: from === 'user' ? WA_USER : WA_BOT, borderRadius: from === 'user' ? '12px 12px 3px 12px' : '12px 12px 12px 3px', padding: '8px 10px', fontSize: 13, color: WA_TEXT, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
      {children}
      <div style={{ fontSize: 10, color: WA_MUTED, textAlign: 'right', marginTop: 1 }}>{from === 'user' ? '✓✓' : ''}</div>
    </div>
  </div>
);

const WaYesNo: React.FC = () => (
  <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
    <span style={{ background: WA_GREEN, color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 10px' }}>YES</span>
    <span style={{ background: '#e0e0e0', color: WA_MUTED, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 10px' }}>NO</span>
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
      <div style={{ flex: 1, padding: '12px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
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
      <div style={{ flex: 1, padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, overflow: 'hidden' }}>

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

// ── Tab 3: WhatsApp text demo ──────────────────────────────────────────────────

const WhatsAppDemo: React.FC = () => {
  // 0→1 user msg, →2 thinking, →3 bot reply, →4 user YES, →5 confirmed
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = [600, 1000, 900, 1700, 1500];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let total = 0;
    delays.forEach((d, i) => { total += d; timers.push(setTimeout(() => setStep(i + 1), total)); });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WhatsAppChrome>
      {step >= 1 && <WaBubble from="user" animate>Soccer moved to Saturday 10am</WaBubble>}
      {step === 2 && <div style={{ paddingLeft: 4 }}><ThinkingDots color="#aaa" /></div>}
      {step >= 3 && (
        <WaBubble from="bot" animate>
          <span style={{ fontWeight: 500 }}>Got it — update Soccer Practice to Sat 10am?</span>
          <WaYesNo />
        </WaBubble>
      )}
      {step >= 4 && <WaBubble from="user" animate>YES</WaBubble>}
      {step >= 5 && (
        <WaBubble from="bot" animate>
          <span style={{ color: '#22C55E', fontWeight: 700 }}>✓ Done!</span> Soccer Practice updated to Saturday 10am.
        </WaBubble>
      )}
    </WhatsAppChrome>
  );
};

// ── Tab 4: File forward via WhatsApp ──────────────────────────────────────────

const ForwardDemo: React.FC = () => {
  // 0→1 attachment, →2 thinking, →3 events list, →4 user YES, →5 confirmed
  const [step, setStep] = useState(0);

  useEffect(() => {
    const delays = [700, 1200, 1500, 1800, 1400];
    const timers: ReturnType<typeof setTimeout>[] = [];
    let total = 0;
    delays.forEach((d, i) => { total += d; timers.push(setTimeout(() => setStep(i + 1), total)); });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <WhatsAppChrome>
      {step >= 1 && (
        <WaBubble from="user" animate>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
            <div style={{ width: 36, height: 36, borderRadius: 7, background: '#e8534a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 18 }}>📄</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: WA_TEXT }}>soccer_schedule.pdf</div>
              <div style={{ fontSize: 10, color: WA_MUTED }}>Forwarded · 84 KB</div>
            </div>
          </div>
        </WaBubble>
      )}
      {step === 2 && <div style={{ paddingLeft: 4 }}><ThinkingDots color="#aaa" /></div>}
      {step >= 3 && (
        <WaBubble from="bot" animate>
          <div style={{ fontWeight: 600, marginBottom: 5 }}>📅 Found 4 games in this schedule:</div>
          {['⚽ Soccer Practice — Thu 4:30 PM', '⚽ Soccer Practice — Sat 9:00 AM', '⚽ Soccer Practice — Mon 4:30 PM', '🏆 Tournament — Sun 11:00 AM'].map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: WA_MUTED, marginBottom: 2 }}>{e}</div>
          ))}
          <WaYesNo />
        </WaBubble>
      )}
      {step >= 4 && <WaBubble from="user" animate>YES</WaBubble>}
      {step >= 5 && (
        <WaBubble from="bot" animate>
          <span style={{ color: '#22C55E', fontWeight: 700 }}>✓ Added 4 events</span> to your calendar!
        </WaBubble>
      )}
    </WhatsAppChrome>
  );
};

// ── Demo showcase (tabbed) ─────────────────────────────────────────────────────

const TABS = [
  { key: 'web',      label: 'Web',      icon: '🖥️' },
  { key: 'voice',    label: 'Voice',    icon: '🎤' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'forward',  label: 'Forward',  icon: '📎' },
] as const;

const TAB_DURATIONS = [8500, 9500, 9000, 10500];

const DemoShowcase: React.FC = () => {
  const [tabIdx, setTabIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const switchTab = useCallback((idx: number) => {
    setTabIdx(idx);
    setAnimKey(k => k + 1);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => switchTab((tabIdx + 1) % 4), TAB_DURATIONS[tabIdx]);
    return () => clearTimeout(t);
  }, [tabIdx, animKey, switchTab]);

  return (
    <div style={{
      background: BG_SURFACE, borderRadius: 16, width: '100%', maxWidth: 380, height: 420,
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
        {tabIdx === 0 && <WebDemo      key={`web-${animKey}`} />}
        {tabIdx === 1 && <VoiceDemo    key={`voice-${animKey}`} />}
        {tabIdx === 2 && <WhatsAppDemo key={`wa-${animKey}`} />}
        {tabIdx === 3 && <ForwardDemo  key={`fwd-${animKey}`} />}
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

        {/* Live demo */}
        <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
          <DemoShowcase />
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ borderTop: `1px solid ${BORDER}`, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <div className="landing-features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
            {[
              { icon: '🗣️', title: 'Talk, don\'t tap',  desc: 'Just say what\'s happening. No date pickers, no dropdowns, no friction.' },
              { icon: '📧', title: 'Forward anything',   desc: 'Coach emails, school PDFs — forward to add@kinroo.ai and events appear.' },
              { icon: '👨‍👩‍👧', title: 'Everyone in sync', desc: 'Assign events to family members. iCal invites go out automatically.' },
              { icon: '💬', title: 'WhatsApp it',         desc: 'Text or WhatsApp your kinroo.ai number from anywhere. No app to open, no login required.' },
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
