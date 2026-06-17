'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Screen = 'menu' | 'flashcards' | 'countdown' | 'race' | 'results';
type Tab    = 'game' | 'shop';
type Feedback = 'correct' | 'wrong' | null;
type RacePhase = 'active' | 'ending' | 'ended';

interface Word { spanish: string; english: string; }
interface LevelConfig {
  name: string; emoji: string; color: string; glow: string;
  xpToNext: number;
  words: Word[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME DATA
// ─────────────────────────────────────────────────────────────────────────────
const LEVELS: Record<number, LevelConfig> = {
  1: {
    name: 'Rookie', emoji: '🟢', color: '#22c55e', glow: '0 0 20px #22c55e66',
    xpToNext: 150,
    words: [
      { spanish: 'hola',          english: 'hello' },
      { spanish: 'adiós',         english: 'goodbye' },
      { spanish: 'gracias',       english: 'thank you' },
      { spanish: 'por favor',     english: 'please' },
      { spanish: 'sí',            english: 'yes' },
      { spanish: 'no',            english: 'no' },
      { spanish: 'buenos días',   english: 'good morning' },
      { spanish: 'la mesa',       english: 'the desk' },
      { spanish: 'la silla',      english: 'the chair' },
      { spanish: 'la oficina',    english: 'the office' },
    ],
  },
  2: {
    name: 'Learner', emoji: '🔵', color: '#3b82f6', glow: '0 0 20px #3b82f666',
    xpToNext: 250,
    words: [
      { spanish: 'el trabajo',     english: 'the work / job' },
      { spanish: 'el jefe',        english: 'the boss' },
      { spanish: 'la reunión',     english: 'the meeting' },
      { spanish: 'el correo',      english: 'the email' },
      { spanish: 'necesito',       english: 'I need' },
      { spanish: 'ayuda',          english: 'help' },
      { spanish: 'el documento',   english: 'the document' },
      { spanish: 'el teléfono',    english: 'the telephone' },
      { spanish: 'el compañero',   english: 'the coworker' },
      { spanish: 'la computadora', english: 'the computer' },
    ],
  },
  3: {
    name: 'Intermediate', emoji: '🟡', color: '#f59e0b', glow: '0 0 20px #f59e0b66',
    xpToNext: 400,
    words: [
      { spanish: 'enviar',           english: 'to send' },
      { spanish: 'recibir',          english: 'to receive' },
      { spanish: 'firmar',           english: 'to sign' },
      { spanish: 'el informe',       english: 'the report' },
      { spanish: 'el proyecto',      english: 'the project' },
      { spanish: 'el plazo',         english: 'the deadline' },
      { spanish: 'la presentación',  english: 'the presentation' },
      { spanish: 'el cliente',       english: 'the client' },
      { spanish: 'aprobar',          english: 'to approve' },
      { spanish: 'la contraseña',    english: 'the password' },
    ],
  },
  4: {
    name: 'Advanced', emoji: '🔴', color: '#ef4444', glow: '0 0 20px #ef444466',
    xpToNext: 600,
    words: [
      { spanish: 'la propuesta',    english: 'the proposal' },
      { spanish: 'negociar',        english: 'to negotiate' },
      { spanish: 'el presupuesto',  english: 'the budget' },
      { spanish: 'la factura',      english: 'the invoice' },
      { spanish: 'cumplir',         english: 'to fulfill / meet' },
      { spanish: 'el contrato',     english: 'the contract' },
      { spanish: 'revisar',         english: 'to review' },
      { spanish: 'la capacitación', english: 'the training' },
      { spanish: 'el rendimiento',  english: 'the performance' },
      { spanish: 'la estrategia',   english: 'the strategy' },
    ],
  },
  5: {
    name: 'Expert', emoji: '🟣', color: '#a855f7', glow: '0 0 20px #a855f766',
    xpToNext: 99999,
    words: [
      { spanish: 'la sede',            english: 'the headquarters' },
      { spanish: 'el accionista',      english: 'the shareholder' },
      { spanish: 'la liquidez',        english: 'the liquidity' },
      { spanish: 'la fusión',          english: 'the merger' },
      { spanish: 'la subsidiaria',     english: 'the subsidiary' },
      { spanish: 'la auditoría',       english: 'the audit' },
      { spanish: 'la junta directiva', english: 'the board of directors' },
      { spanish: 'el patrimonio',      english: 'the equity / heritage' },
      { spanish: 'la rentabilidad',    english: 'the profitability' },
      { spanish: 'el apalancamiento',  english: 'the leverage' },
    ],
  },
};

const MAX_LEVEL      = 5;
const WORDS_PER_STAGE = 5;

/** CPU reaches finish in (20 - (level-1)*3) seconds */
const cpuFinishMs = (level: number) => Math.max(8000, (20 - (level - 1) * 3) * 1000);

/** Wrong-answer setback: 0% at L1, +5% per level */
const wrongSetback = (level: number) => (level - 1) * 5;

/** Correct-answer boost: 20 minus seconds taken, min 1 */
const correctBoost = (secs: number) => Math.max(1, Math.floor(20 - secs));

// ─────────────────────────────────────────────────────────────────────────────
// XP helpers
// ─────────────────────────────────────────────────────────────────────────────
const XP_THRESHOLDS = [0, 150, 400, 800, 1400];

function xpToLevel(xp: number): number {
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (xp >= XP_THRESHOLDS[l - 1]) return l;
  }
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function normalize(t: string) {
  return t.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¡¿!?,\.;:]/g, '').trim()
    .replace(/\s+/g, ' ');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  @keyframes roadScroll {
    0%   { background-position: 0 0; }
    100% { background-position: -120px 0; }
  }
  @keyframes carBounce {
    0%,100% { transform: translateY(-50%) scale(1); }
    50%      { transform: translateY(-58%) scale(1.15); }
  }
  @keyframes carBoost {
    0%   { filter: drop-shadow(0 0 0px cyan); }
    50%  { filter: drop-shadow(0 0 14px cyan); }
    100% { filter: drop-shadow(0 0 0px cyan); }
  }
  @keyframes wrongShake {
    0%,100% { transform: translateX(0); }
    25%     { transform: translateX(-8px); }
    75%     { transform: translateX(8px); }
  }
  @keyframes popIn {
    from { opacity:0; transform: scale(0.7); }
    to   { opacity:1; transform: scale(1); }
  }
  @keyframes coinFloat {
    0%   { opacity:0; transform: translateY(0) scale(0.5); }
    40%  { opacity:1; transform: translateY(-28px) scale(1.2); }
    100% { opacity:0; transform: translateY(-60px) scale(0.8); }
  }
  @keyframes levelBurst {
    0%   { opacity:0; transform: scale(0.4) rotate(-10deg); }
    60%  { opacity:1; transform: scale(1.08) rotate(2deg); }
    100% { opacity:1; transform: scale(1) rotate(0deg); }
  }
  @keyframes countdown {
    0%   { opacity:0; transform: scale(2.5); }
    30%  { opacity:1; transform: scale(1); }
    80%  { opacity:1; transform: scale(1); }
    100% { opacity:0; transform: scale(0.5); }
  }
  @keyframes boosterPulse {
    0%,100% { box-shadow: 0 0 8px #fbbf2466; }
    50%      { box-shadow: 0 0 20px #fbbf24aa; }
  }
  .fc-card {
    transform-style: preserve-3d;
    transition: transform 0.55s cubic-bezier(.4,2,.6,1);
    cursor: pointer;
  }
  .fc-card.flipped { transform: rotateY(180deg); }
  .fc-front, .fc-back {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    position: absolute; inset: 0;
    border-radius: 18px;
    display: flex; align-items: center; justify-content: center; flex-direction: column;
  }
  .fc-back { transform: rotateY(180deg); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function RaceTrack({ playerPos, cpuPos, feedback, level }: {
  playerPos: number; cpuPos: number; feedback: Feedback; level: number;
}) {
  const lv = LEVELS[level] || LEVELS[1];
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #ffffff18', background: '#111' }}>
      <div style={{ background: 'linear-gradient(180deg,#0b0b2e,#1a1a3e)', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>SPEED RACE · ESPAÑOL</span>
        <span style={{ fontSize: 11, color: lv.color, fontFamily: 'monospace', textShadow: lv.glow }}>LVL {level} — {lv.name}</span>
      </div>
      <div style={{ background: '#1e1e1e', padding: '14px 16px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 4,
          backgroundImage: 'repeating-linear-gradient(90deg,#f59e0b 0px,#f59e0b 30px,transparent 30px,transparent 60px)',
          animation: 'roadScroll 1.2s linear infinite',
          transform: 'translateY(-50%)', opacity: 0.4,
        }} />
        <Lane label="YOU" car="🏎️" pos={playerPos} color={lv.color} boost={feedback === 'correct'} wrong={feedback === 'wrong'} />
        <div style={{ height: 1, background: '#ffffff0a', margin: '6px 0' }} />
        <Lane label="CPU" car="🚗" pos={cpuPos} color="#ef4444" boost={false} wrong={false} />
      </div>
      <div style={{ background: '#0d0d0d', padding: '8px 16px', display: 'flex', gap: 12 }}>
        <ProgressBar label="YOU" pct={playerPos} color={lv.color} />
        <ProgressBar label="CPU" pct={cpuPos} color="#ef4444" />
      </div>
    </div>
  );
}

function Lane({ label, car, pos, color, boost, wrong }: {
  label: string; car: string; pos: number; color: string; boost: boolean; wrong: boolean;
}) {
  const clamped = Math.min(98, Math.max(2, pos));
  return (
    <div style={{ position: 'relative', height: 54 }}>
      <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#475569', fontFamily: 'monospace', width: 36 }}>{label}</span>
      <div style={{ position: 'absolute', left: 40, right: 40, top: '50%', transform: 'translateY(-50%)', height: 36, background: '#2a2a2a', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 36,
          backgroundImage: 'repeating-conic-gradient(#fff 0% 25%,#000 0% 50%)',
          backgroundSize: '12px 12px', opacity: 0.7 }} />
        <div style={{
          position: 'absolute', left: `${clamped}%`, top: '50%',
          transform: 'translateY(-50%) translateX(-50%)',
          transition: 'left 0.3s ease-out', fontSize: 24, lineHeight: 1,
          animation: boost ? 'carBoost 0.6s ease' : wrong ? 'wrongShake 0.4s ease' : 'carBounce 1.6s ease-in-out infinite',
          filter: boost ? `drop-shadow(0 0 8px ${color})` : 'none',
        }}>{car}</div>
      </div>
      <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🏁</span>
    </div>
  );
}

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 10, color: '#475569', marginBottom: 3, fontFamily: 'monospace' }}>{label} {Math.round(pct)}%</div>
      <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}88,${color})`, transition: 'width 0.3s ease', borderRadius: 3 }} />
      </div>
    </div>
  );
}

function FlashCard({ word, flipped, onFlip }: { word: Word; flipped: boolean; onFlip: () => void }) {
  return (
    <div style={{ perspective: 1100, height: 180 }} onClick={onFlip}>
      <div className={`fc-card${flipped ? ' flipped' : ''}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <div className="fc-front" style={{ background: 'linear-gradient(135deg,#1e3a5f,#0f2744)', border: '1px solid #3b82f640', boxShadow: '0 8px 32px #0004' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>🇪🇸 Spanish</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: '#e2e8f0', textAlign: 'center', padding: '0 20px' }}>{word.spanish}</div>
          <div style={{ fontSize: 12, color: '#475569', marginTop: 14 }}>tap to reveal →</div>
        </div>
        <div className="fc-back" style={{ background: 'linear-gradient(135deg,#1a3a1a,#0f2a0f)', border: '1px solid #22c55e40', boxShadow: '0 8px 32px #0004' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, letterSpacing: 2, textTransform: 'uppercase' }}>🇺🇸 English</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#86efac', textAlign: 'center', padding: '0 20px' }}>{word.english}</div>
          <div style={{ marginTop: 10, background: '#166534', padding: '3px 14px', borderRadius: 20, color: '#bbf7d0', fontSize: 13 }}>✓ got it!</div>
        </div>
      </div>
    </div>
  );
}

function XPBar({ xp, level }: { xp: number; level: number }) {
  const lv = LEVELS[level] || LEVELS[1];
  const prevXP = XP_THRESHOLDS[level - 1] || 0;
  const nextXP = prevXP + lv.xpToNext;
  const pct = level >= MAX_LEVEL ? 100 : Math.min(100, ((xp - prevXP) / (nextXP - prevXP)) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 11, color: '#64748b', width: 28, fontFamily: 'monospace' }}>XP</span>
      <div style={{ flex: 1, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${lv.color}88,${lv.color})`, transition: 'width 0.6s ease', borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', width: 80, textAlign: 'right' }}>
        {level >= MAX_LEVEL ? 'MAX' : `${xp - prevXP} / ${nextXP - prevXP}`}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function SpanishRacingGame() {

  // ── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('game');

  // ── Persistent state (lazy localStorage init) ────────────────────────────
  const [playerXP, setPlayerXP] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try { return JSON.parse(localStorage.getItem('spanishRacerSave') || '{}').xp ?? 0; } catch { return 0; }
  });
  const [playerCoins, setPlayerCoins] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try { return JSON.parse(localStorage.getItem('spanishRacerSave') || '{}').coins ?? 0; } catch { return 0; }
  });
  const [boosterExpiresAt, setBoosterExpiresAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const v = localStorage.getItem('spanishBooster');
      if (!v) return null;
      const exp = parseInt(v);
      return exp > Date.now() ? exp : null;
    } catch { return null; }
  });

  const playerLevel = xpToLevel(playerXP);

  // ── Clock (drives booster countdown display) ──────────────────────────────
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const boosterSecsLeft = boosterExpiresAt ? Math.max(0, Math.floor((boosterExpiresAt - now) / 1000)) : 0;
  const boosterActive   = boosterSecsLeft > 0;

  // ── Screen ────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('menu');

  // ── Flashcard state ───────────────────────────────────────────────────────
  const [stageWords, setStageWords] = useState<Word[]>([]);
  const [cardIdx,    setCardIdx]    = useState(0);
  const [flipped,    setFlipped]    = useState(false);
  const [seenCount,  setSeenCount]  = useState(0);

  // ── Countdown ─────────────────────────────────────────────────────────────
  const [countdown, setCountdown] = useState(3);

  // ── Race state ────────────────────────────────────────────────────────────
  const [sentIdx,       setSentIdx]       = useState(0);
  const [playerPos,     setPlayerPos]     = useState(0);
  const [cpuPos,        setCpuPos]        = useState(0);
  const [input,         setInput]         = useState('');
  const [feedback,      setFeedback]      = useState<Feedback>(null);
  const [showHint,      setShowHint]      = useState(false);
  const [correctCount,  setCorrectCount]  = useState(0);
  const [wrongCount,    setWrongCount]    = useState(0);
  const [answerLocked,  setAnswerLocked]  = useState(false);
  const [lastCorrectAns,setLastCorrectAns]= useState('');
  const [lastBoost,     setLastBoost]     = useState(0);  // % gained on last answer

  // ── Race timing refs (mutable, no re-render) ─────────────────────────────
  const raceStartRef    = useRef<number>(0);
  const questionStartRef= useRef<number>(0);
  const racePhaseRef    = useRef<RacePhase>('ended');
  const playerPosRef    = useRef<number>(0);
  const cpuPosRef       = useRef<number>(0);
  playerPosRef.current  = playerPos;
  cpuPosRef.current     = cpuPos;

  // ── Results state ─────────────────────────────────────────────────────────
  const [playerWon,   setPlayerWon]   = useState(false);
  const [xpGained,    setXpGained]    = useState(0);
  const [coinsGained, setCoinsGained] = useState(0);
  const [leveledUp,   setLeveledUp]   = useState(false);
  const [newLevel,    setNewLevel]    = useState(1);
  const [showCoin,    setShowCoin]    = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Save helpers ──────────────────────────────────────────────────────────
  const save = useCallback((xp: number, coins: number) => {
    localStorage.setItem('spanishRacerSave', JSON.stringify({ xp, coins }));
  }, []);

  const saveBooster = useCallback((expiry: number | null) => {
    if (expiry) localStorage.setItem('spanishBooster', String(expiry));
    else localStorage.removeItem('spanishBooster');
  }, []);

  // ── End race (called from CPU interval or last answer) ───────────────────
  const endRace = useCallback((finalPlayerPos: number, cpuWonRace: boolean) => {
    racePhaseRef.current = 'ended';
    const finalCpuPos = cpuPosRef.current;
    const won = cpuWonRace ? false : finalPlayerPos >= finalCpuPos;
    setPlayerWon(won);

    const xpMult     = boosterActive ? 2 : 1;
    const xpEarned   = Math.round((won ? 50 + playerLevel * 15 : 15) * xpMult);
    const coinsEarned = won ? 45 + playerLevel * 12 : 10;
    setXpGained(xpEarned);
    setCoinsGained(coinsEarned);

    const newXP    = playerXP + xpEarned;
    const newCoins = playerCoins + coinsEarned;
    const didLevelUp = xpToLevel(newXP) > playerLevel;
    setLeveledUp(didLevelUp);
    setNewLevel(xpToLevel(newXP));
    setPlayerXP(newXP);
    setPlayerCoins(newCoins);
    save(newXP, newCoins);

    setShowCoin(true);
    setTimeout(() => setShowCoin(false), 1800);
    setTimeout(() => setScreen('results'), 1300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerLevel, playerXP, playerCoins, boosterActive, save]);

  // ── Real-time CPU movement ────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'race') return;
    const finishMs = cpuFinishMs(playerLevel);

    const interval = setInterval(() => {
      if (racePhaseRef.current !== 'active') return;
      const elapsed = Date.now() - raceStartRef.current;
      const pos = Math.min(100, (elapsed / finishMs) * 100);
      setCpuPos(pos);
      cpuPosRef.current = pos;

      if (pos >= 100) {
        racePhaseRef.current = 'ending';
        clearInterval(interval);
        endRace(playerPosRef.current, true); // CPU wins
      }
    }, 50);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ── Countdown tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'countdown') return;
    if (countdown <= 0) { setTimeout(() => setScreen('race'), 0); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, countdown]);

  // ── When race screen mounts, start timers ─────────────────────────────────
  useEffect(() => {
    if (screen !== 'race') return;
    raceStartRef.current     = Date.now();
    questionStartRef.current = Date.now();
    racePhaseRef.current     = 'active';
    if (inputRef.current) inputRef.current.focus();
  }, [screen]);

  // ── Focus input on new question ───────────────────────────────────────────
  useEffect(() => {
    if (screen === 'race' && inputRef.current) inputRef.current.focus();
  }, [screen, sentIdx]);

  // ── Start a stage ─────────────────────────────────────────────────────────
  const startStage = useCallback(() => {
    const lv = LEVELS[playerLevel] || LEVELS[1];
    setStageWords(shuffle(lv.words).slice(0, WORDS_PER_STAGE));
    setCardIdx(0); setFlipped(false); setSeenCount(0);
    setScreen('flashcards');
  }, [playerLevel]);

  // ── Launch countdown (reset race state first) ─────────────────────────────
  const launchCountdown = useCallback(() => {
    setPlayerPos(0); setCpuPos(0); setInput(''); setFeedback(null);
    setShowHint(false); setCorrectCount(0); setWrongCount(0);
    setAnswerLocked(false); setLastCorrectAns(''); setSentIdx(0); setLastBoost(0);
    setCountdown(3);
    setScreen('countdown');
  }, []);

  // ── Flashcard nav ─────────────────────────────────────────────────────────
  const flipCard = () => {
    if (!flipped) setSeenCount(s => s + 1);
    setFlipped(f => !f);
  };
  const nextCard = () => { if (cardIdx < stageWords.length - 1) { setCardIdx(i => i + 1); setFlipped(false); } };
  const prevCard = () => { if (cardIdx > 0) { setCardIdx(i => i - 1); setFlipped(false); } };

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = useCallback(() => {
    if (answerLocked || feedback || racePhaseRef.current !== 'active') return;
    const word = stageWords[sentIdx];
    if (!word) return;

    const secs      = (Date.now() - questionStartRef.current) / 1000;
    const isCorrect = normalize(input) === normalize(word.spanish);

    setAnswerLocked(true);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setLastCorrectAns(word.spanish);
    if (isCorrect) setCorrectCount(c => c + 1); else setWrongCount(w => w + 1);

    const gain    = isCorrect  ? correctBoost(secs)           : 0;
    const setback = !isCorrect ? wrongSetback(playerLevel)    : 0;
    const newPlayer = Math.max(0, Math.min(100, playerPos + gain - setback));
    setLastBoost(isCorrect ? gain : -setback);
    setPlayerPos(newPlayer);
    playerPosRef.current = newPlayer;

    const isLast = sentIdx >= stageWords.length - 1;

    setTimeout(() => {
      setFeedback(null); setInput(''); setShowHint(false); setAnswerLocked(false);

      if (isLast && racePhaseRef.current === 'active') {
        racePhaseRef.current = 'ending';
        endRace(newPlayer, false); // Player answered all — compare positions
      } else if (!isLast) {
        setSentIdx(i => i + 1);
        questionStartRef.current = Date.now();
      }
    }, 1200);
  }, [answerLocked, feedback, stageWords, sentIdx, input, playerPos, playerLevel, endRace]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitAnswer();
  }, [submitAnswer]);

  const insertChar = (ch: string) => {
    setInput(prev => prev + ch);
    inputRef.current?.focus();
  };

  // ── Shop ──────────────────────────────────────────────────────────────────
  const buyBooster = useCallback((durationMs: number, cost: number) => {
    if (playerCoins < cost) return;
    const newCoins = playerCoins - cost;
    // Stack on top of existing booster if active
    const base = (boosterExpiresAt && boosterExpiresAt > Date.now()) ? boosterExpiresAt : Date.now();
    const expiry = base + durationMs;
    setPlayerCoins(newCoins);
    setBoosterExpiresAt(expiry);
    save(playerXP, newCoins);
    saveBooster(expiry);
  }, [playerCoins, playerXP, boosterExpiresAt, save, saveBooster]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const lv = LEVELS[playerLevel] || LEVELS[1];

  return (
    <>
      <style>{GLOBAL_STYLES}</style>

      <div style={{
        width: '100%', height: '100%', minHeight: 0,
        background: 'linear-gradient(160deg,#070714 0%,#0d0d1f 60%,#070714 100%)',
        color: '#e2e8f0',
        fontFamily: "'Segoe UI',system-ui,sans-serif",
        overflowY: 'auto',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>

        {/* ── Top tab bar ─────────────────────────────────────────────────── */}
        <div style={{
          width: '100%', maxWidth: 600,
          display: 'flex', gap: 0,
          borderBottom: '1px solid #ffffff0f',
          padding: '0 20px',
          position: 'sticky', top: 0,
          background: '#070714ee',
          backdropFilter: 'blur(12px)',
          zIndex: 20,
        }}>
          {(['game', 'shop'] as Tab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: tab === 'game' ? 1 : 0,
              padding: '12px 20px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              color: activeTab === tab ? lv.color : '#334155',
              borderBottom: activeTab === tab ? `2px solid ${lv.color}` : '2px solid transparent',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}>
              {tab === 'game' ? '🏎️ Game' : '🛒 Shop'}
              {tab === 'shop' && boosterActive && (
                <span style={{ marginLeft: 6, fontSize: 10, background: '#fbbf24', color: '#000', borderRadius: 10, padding: '1px 6px', fontWeight: 700 }}>
                  ⚡ {fmtTime(boosterSecsLeft)}
                </span>
              )}
            </button>
          ))}

          {/* Coins always visible */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '0 0 0 16px' }}>
            <span style={{ fontSize: 16 }}>🪙</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{playerCoins}</span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SHOP TAB                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'shop' && (
          <div style={{ maxWidth: 540, width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'popIn 0.35s ease' }}>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>🛒</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginTop: 6 }}>Shop</div>
              <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Spend coins on boosters to earn more XP</div>
            </div>

            {/* Coin balance */}
            <div style={{ background: '#0f172a', borderRadius: 14, border: '1px solid #fbbf2422', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Your balance</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>🪙 {playerCoins}</span>
            </div>

            {/* Active booster */}
            {boosterActive && (
              <div style={{
                background: 'linear-gradient(135deg,#451a03,#78350f)',
                borderRadius: 14, border: '1px solid #fbbf2444',
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
                animation: 'boosterPulse 2s ease infinite',
              }}>
                <span style={{ fontSize: 32 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>XP Booster Active!</div>
                  <div style={{ fontSize: 12, color: '#d97706', marginTop: 2 }}>2× XP on all wins · {fmtTime(boosterSecsLeft)} remaining</div>
                </div>
              </div>
            )}

            {/* Booster items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: '5-Minute XP Booster', desc: 'Double XP for 5 minutes', duration: 5 * 60 * 1000, cost: 150, icon: '⚡' },
                { label: '15-Minute XP Booster', desc: 'Double XP for 15 minutes', duration: 15 * 60 * 1000, cost: 300, icon: '🚀' },
              ].map(item => {
                const canAfford = playerCoins >= item.cost;
                return (
                  <div key={item.label} style={{
                    background: '#0f172a', borderRadius: 14,
                    border: `1px solid ${canAfford ? '#ffffff15' : '#ffffff08'}`,
                    padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <span style={{ fontSize: 32 }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{item.desc}</div>
                    </div>
                    <button
                      onClick={() => buyBooster(item.duration, item.cost)}
                      disabled={!canAfford}
                      style={{
                        padding: '9px 18px', borderRadius: 10, border: 'none',
                        background: canAfford ? '#fbbf24' : '#1e293b',
                        color: canAfford ? '#000' : '#334155',
                        fontSize: 13, fontWeight: 700, cursor: canAfford ? 'pointer' : 'default',
                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                      }}
                    >🪙 {item.cost}</button>
                  </div>
                );
              })}
            </div>

            {/* How to earn coins */}
            <div style={{ background: '#0f172a', borderRadius: 12, border: '1px solid #ffffff08', padding: 16 }}>
              <div style={{ fontSize: 11, color: '#334155', letterSpacing: 2, marginBottom: 10 }}>HOW TO EARN COINS</div>
              {[
                ['🏆', `Win a race → ${45 + playerLevel * 12} coins`],
                ['😓', `Lose a race → 10 coins`],
                ['⬆️', 'Higher level = more coins per win'],
              ].map(([icon, text]) => (
                <div key={text as string} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* GAME TAB                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'game' && (
          <>
            {/* ── MENU ──────────────────────────────────────────────────── */}
            {screen === 'menu' && (
              <div style={{ maxWidth: 540, width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'popIn 0.4s ease' }}>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48 }}>🇪🇸</div>
                  <h1 style={{ margin: '8px 0 4px', fontSize: 28, fontWeight: 800, background: `linear-gradient(90deg,${lv.color},#ffffff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    SpeedEspañol
                  </h1>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>Learn Spanish. Race to the finish. 🏁</p>
                  {boosterActive && (
                    <div style={{ marginTop: 8, display: 'inline-block', background: '#451a03', border: '1px solid #fbbf2444', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>
                      ⚡ 2× XP active · {fmtTime(boosterSecsLeft)} left
                    </div>
                  )}
                </div>

                {/* Stats card */}
                <div style={{ background: '#0f172a', borderRadius: 16, border: '1px solid #ffffff0f', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${lv.color}22`, border: `2px solid ${lv.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: lv.glow }}>
                        {lv.emoji}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: lv.color }}>{lv.name}</div>
                        <div style={{ fontSize: 11, color: '#475569' }}>Level {playerLevel} of {MAX_LEVEL}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24' }}>🪙 {playerCoins}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>coins earned</div>
                    </div>
                  </div>
                  <XPBar xp={playerXP} level={playerLevel} />
                  {/* Level roadmap */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(l => {
                      const lvl = LEVELS[l];
                      const active = l === playerLevel, done = l < playerLevel;
                      return (
                        <div key={l} style={{
                          flex: 1, height: 32, borderRadius: 8,
                          background: done ? `${lvl.color}33` : active ? `${lvl.color}22` : '#ffffff08',
                          border: `1px solid ${active ? lvl.color : done ? lvl.color + '55' : '#ffffff10'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: active ? lvl.color : done ? lvl.color + 'aa' : '#334155',
                          fontWeight: active ? 700 : 500,
                          boxShadow: active ? lvl.glow : 'none',
                        }}>{done ? '✓' : l}</div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={startStage}
                  style={{
                    padding: '18px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg,${lv.color},${lv.color}99)`,
                    color: '#000', fontSize: 18, fontWeight: 800,
                    boxShadow: lv.glow, transition: 'transform 0.15s',
                  }}
                  onMouseOver={e => { (e.target as HTMLElement).style.transform = 'scale(1.02)'; }}
                  onMouseOut={e =>  { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                >🏎️ START RACE</button>

                {/* How to play */}
                <div style={{ background: '#0f172a', borderRadius: 12, border: '1px solid #ffffff0a', padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 10 }}>HOW TO PLAY</div>
                  {[
                    ['🃏', 'Study 5 flashcards — tap to flip and learn the Spanish word'],
                    ['🏁', 'Race! See an English word and type the Spanish translation'],
                    ['⚡', `Correct = +${20}% minus the seconds you took (faster = more!)`],
                    [`⬇️`, `Wrong = ${wrongSetback(playerLevel) > 0 ? `-${wrongSetback(playerLevel)}%` : 'no setback at Level 1'} (penalty grows each level)`],
                    ['🚗', `CPU finishes in ${(cpuFinishMs(playerLevel) / 1000).toFixed(0)}s — beat it before it reaches the end!`],
                    ['🏆', 'Win to earn coins · spend coins in the Shop on XP boosters'],
                  ].map(([icon, text]) => (
                    <div key={text as string} style={{ display: 'flex', gap: 10, marginBottom: 7, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                      <span style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FLASHCARDS ──────────────────────────────────────────────── */}
            {screen === 'flashcards' && (
              <div style={{ maxWidth: 540, width: '100%', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'popIn 0.35s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: lv.color }}>📚 Study Time</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>Learn these words before your race</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>{cardIdx + 1} / {stageWords.length}</div>
                </div>

                {/* Progress dots */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {stageWords.map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: i < cardIdx ? lv.color : i === cardIdx ? lv.color : '#1e293b',
                      border: `2px solid ${i === cardIdx ? lv.color : '#1e293b'}`,
                      transition: 'all 0.3s',
                      boxShadow: i === cardIdx ? lv.glow : 'none',
                    }} />
                  ))}
                </div>

                <FlashCard word={stageWords[cardIdx]} flipped={flipped} onFlip={flipCard} />

                <div style={{ background: '#0f172a', borderRadius: 10, border: '1px solid #ffffff08', padding: '10px 14px', fontSize: 12, color: '#475569', textAlign: 'center' }}>
                  💡 &ldquo;{stageWords[cardIdx].spanish}&rdquo; = &ldquo;{stageWords[cardIdx].english}&rdquo;
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={prevCard} disabled={cardIdx === 0} style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1px solid #ffffff10', background: '#0f172a', color: cardIdx === 0 ? '#1e293b' : '#94a3b8', fontSize: 14, cursor: cardIdx === 0 ? 'default' : 'pointer' }}>← Prev</button>
                  {cardIdx < stageWords.length - 1 ? (
                    <button onClick={nextCard} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: `1px solid ${lv.color}55`, background: `${lv.color}22`, color: lv.color, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Next →</button>
                  ) : (
                    <button onClick={launchCountdown} style={{ flex: 2, padding: '11px 0', borderRadius: 10, border: 'none', background: lv.color, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: lv.glow }}>🏁 Start Race!</button>
                  )}
                </div>
                {cardIdx < stageWords.length - 1 && seenCount === stageWords.length && (
                  <button onClick={launchCountdown} style={{ background: 'none', border: 'none', color: '#475569', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
                    Skip to race →
                  </button>
                )}
                <button onClick={() => setScreen('menu')} style={{ background: 'none', border: 'none', color: '#334155', fontSize: 11, cursor: 'pointer' }}>← Back to menu</button>
              </div>
            )}

            {/* ── COUNTDOWN ───────────────────────────────────────────────── */}
            {screen === 'countdown' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, animation: 'popIn 0.3s ease', padding: 40 }}>
                <div style={{ fontSize: 14, color: '#475569', letterSpacing: 3, textTransform: 'uppercase' }}>Get ready to race!</div>
                <div key={countdown} style={{
                  fontSize: countdown === 0 ? 52 : 96, fontWeight: 900,
                  color: countdown === 0 ? lv.color : '#fff',
                  animation: 'countdown 1s ease forwards',
                  textShadow: countdown === 0 ? lv.glow : '0 0 30px #ffffff55',
                  minWidth: 140, textAlign: 'center',
                }}>
                  {countdown === 0 ? '¡GO!' : countdown}
                </div>
                <div style={{ fontSize: 13, color: '#334155' }}>Type fast — every second costs you boost%!</div>
              </div>
            )}

            {/* ── RACE ────────────────────────────────────────────────────── */}
            {screen === 'race' && stageWords[sentIdx] && (
              <div style={{ maxWidth: 600, width: '100%', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'popIn 0.3s ease' }}>

                <RaceTrack playerPos={playerPos} cpuPos={cpuPos} feedback={feedback} level={playerLevel} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 700 }}>✓ {correctCount}</span>
                    <span style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>✗ {wrongCount}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {boosterActive && <span style={{ fontSize: 11, color: '#fbbf24', fontFamily: 'monospace' }}>⚡ 2×XP</span>}
                    <span style={{ fontSize: 12, color: '#334155', fontFamily: 'monospace' }}>Word {sentIdx + 1} / {stageWords.length}</span>
                  </div>
                </div>

                {/* Challenge card */}
                <div style={{
                  background: '#0f172a', borderRadius: 14, border: '1px solid #ffffff0a',
                  padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
                  outline: feedback === 'correct' ? `2px solid #22c55e` : feedback === 'wrong' ? `2px solid #ef4444` : '2px solid transparent',
                  transition: 'outline 0.15s',
                }}>
                  <div style={{ fontSize: 11, color: '#475569', letterSpacing: 2, textTransform: 'uppercase' }}>What is the Spanish word for:</div>
                  <div style={{ fontSize: 40, fontWeight: 800, color: '#f1f5f9', textAlign: 'center', padding: '6px 0' }}>
                    {stageWords[sentIdx].english}
                  </div>

                  {showHint && (
                    <div style={{ fontSize: 18, color: '#94a3b8', fontFamily: 'monospace', background: '#1e293b', padding: '8px 16px', borderRadius: 8, letterSpacing: 4, textAlign: 'center' }}>
                      {stageWords[sentIdx].spanish[0]}{'_'.repeat(Math.max(0, stageWords[sentIdx].spanish.length - 1))}
                    </div>
                  )}

                  {feedback && (
                    <div style={{
                      padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                      background: feedback === 'correct' ? '#14532d' : '#450a0a',
                      color: feedback === 'correct' ? '#86efac' : '#fca5a5',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span>
                        {feedback === 'correct' ? '✅ ¡Correcto!' : `❌ Answer: `}
                        {feedback === 'wrong' && <span style={{ color: '#fbbf24' }}>{lastCorrectAns}</span>}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'monospace', color: lastBoost >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                        {lastBoost >= 0 ? `+${lastBoost}%` : `${lastBoost}%`}
                      </span>
                    </div>
                  )}

                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    disabled={!!answerLocked}
                    placeholder="Type the Spanish word…"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                    style={{
                      width: '100%', padding: '13px 16px', borderRadius: 10, fontSize: 16,
                      background: '#1e293b',
                      border: `1px solid ${feedback === 'correct' ? '#22c55e55' : feedback === 'wrong' ? '#ef444455' : '#ffffff15'}`,
                      color: '#f1f5f9', outline: 'none', boxSizing: 'border-box',
                      opacity: answerLocked ? 0.6 : 1,
                    }}
                  />

                  {/* Special chars + hint */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {['á','é','í','ó','ú','ñ','ü','¿','¡'].map(ch => (
                      <button key={ch} onClick={() => insertChar(ch)} style={{
                        padding: '5px 10px', borderRadius: 7, border: '1px solid #ffffff18',
                        background: '#1e293b', color: '#94a3b8', fontSize: 14, cursor: 'pointer', fontFamily: 'monospace',
                      }}>{ch}</button>
                    ))}
                    <button onClick={() => setShowHint(h => !h)} style={{
                      marginLeft: 'auto', padding: '5px 14px', borderRadius: 7,
                      border: `1px solid ${showHint ? lv.color + '66' : '#ffffff18'}`,
                      background: showHint ? `${lv.color}22` : '#1e293b',
                      color: showHint ? lv.color : '#475569', fontSize: 12, cursor: 'pointer',
                    }}>💡 Hint</button>
                  </div>

                  <button
                    onClick={submitAnswer}
                    disabled={!!answerLocked || !input.trim()}
                    style={{
                      padding: '13px 0', borderRadius: 12, border: 'none',
                      background: !answerLocked && input.trim() ? lv.color : '#1e293b',
                      color: !answerLocked && input.trim() ? '#000' : '#334155',
                      fontSize: 15, fontWeight: 700,
                      cursor: !answerLocked && input.trim() ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      boxShadow: !answerLocked && input.trim() ? lv.glow : 'none',
                    }}
                  >Submit ↵</button>
                </div>

                {/* Studied words reference */}
                <div style={{ background: '#0a0f1a', borderRadius: 10, border: '1px solid #ffffff07', padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: '#334155', marginBottom: 6, letterSpacing: 2 }}>WORDS YOU STUDIED</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {stageWords.map(w => (
                      <span key={w.spanish} style={{ background: '#1e293b', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#64748b' }}>
                        <span style={{ color: '#94a3b8' }}>{w.spanish}</span> = {w.english}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── RESULTS ─────────────────────────────────────────────────── */}
            {screen === 'results' && (
              <div style={{ maxWidth: 520, width: '100%', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 18, animation: 'popIn 0.4s ease' }}>

                <div style={{
                  textAlign: 'center', padding: '28px 20px',
                  background: playerWon ? 'linear-gradient(135deg,#14532d,#166534)' : 'linear-gradient(135deg,#450a0a,#7f1d1d)',
                  borderRadius: 18,
                  border: `1px solid ${playerWon ? '#22c55e44' : '#ef444444'}`,
                  boxShadow: playerWon ? '0 0 40px #22c55e22' : '0 0 40px #ef444422',
                }}>
                  <div style={{ fontSize: 56, marginBottom: 8 }}>{playerWon ? '🏆' : '💨'}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: playerWon ? '#86efac' : '#fca5a5' }}>
                    {playerWon ? '¡Ganaste!' : '¡Sigue intentando!'}
                  </div>
                  <div style={{ fontSize: 14, color: playerWon ? '#4ade80' : '#f87171', marginTop: 6 }}>
                    {playerWon ? 'You beat the CPU!' : 'The CPU finished first — practice for speed!'}
                  </div>
                </div>

                {leveledUp && (
                  <div style={{
                    textAlign: 'center', padding: '20px',
                    background: 'linear-gradient(135deg,#312e81,#1e1b4b)',
                    borderRadius: 14, border: '1px solid #a855f744',
                    animation: 'levelBurst 0.6s ease',
                    boxShadow: '0 0 40px #a855f733',
                  }}>
                    <div style={{ fontSize: 42 }}>⬆️</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#c084fc' }}>LEVEL UP!</div>
                    <div style={{ fontSize: 14, color: '#a78bfa', marginTop: 4 }}>
                      You are now <strong>{LEVELS[newLevel]?.name}</strong> — Level {newLevel}
                    </div>
                  </div>
                )}

                <div style={{ background: '#0f172a', borderRadius: 14, border: '1px solid #ffffff0a', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 12, color: '#475569', letterSpacing: 2 }}>RACE SUMMARY</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: 'Correct', value: correctCount, icon: '✅', color: '#22c55e' },
                      { label: 'Wrong',   value: wrongCount,   icon: '❌', color: '#ef4444' },
                      { label: 'XP Earned', value: `+${xpGained}${boosterActive ? ' ⚡' : ''}`, icon: '⚡', color: lv.color },
                      { label: 'Coins',   value: `+${coinsGained}`, icon: '🪙', color: '#fbbf24' },
                    ].map(({ label, value, icon, color }) => (
                      <div key={label} style={{ background: '#1e293b', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: 22 }}>{icon}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  <XPBar xp={playerXP} level={playerLevel} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', borderRadius: 10, padding: '10px 14px' }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>Total coins</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24' }}>🪙 {playerCoins}</span>
                  </div>
                </div>

                <div style={{ background: '#0f172a', borderRadius: 12, border: '1px solid #ffffff08', padding: 16 }}>
                  <div style={{ fontSize: 11, color: '#334155', letterSpacing: 2, marginBottom: 10 }}>WORDS PRACTICED</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {stageWords.map(w => (
                      <div key={w.spanish} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 10px', background: '#1e293b', borderRadius: 8 }}>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{w.spanish}</span>
                        <span style={{ color: '#475569' }}>{w.english}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={startStage} style={{ flex: 2, padding: '15px 0', borderRadius: 12, border: 'none', background: lv.color, color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: lv.glow }}>🏎️ Race Again</button>
                  <button onClick={() => setScreen('menu')} style={{ flex: 1, padding: '15px 0', borderRadius: 12, border: '1px solid #ffffff15', background: '#0f172a', color: '#64748b', fontSize: 14, cursor: 'pointer' }}>Menu</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Floating coin pop */}
        {showCoin && (
          <div style={{
            position: 'fixed', top: '30%', left: '50%', transform: 'translateX(-50%)',
            fontSize: 36, animation: 'coinFloat 1.8s ease forwards',
            pointerEvents: 'none', zIndex: 9999,
          }}>
            🪙 +{coinsGained}
          </div>
        )}
      </div>
    </>
  );
}
