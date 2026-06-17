'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────
type Screen   = 'menu' | 'intro' | 'countdown' | 'race' | 'results' | 'mastered';
type Tab      = 'race' | 'blast' | 'missed' | 'coach' | 'review' | 'shop';
interface ChatMsg { role: 'user' | 'assistant'; content: string; }
interface MissEntry { spanish:string; english:string; missCount:number; lastMissed:number; }
const MISSED_KEY = 'spanishMissed';
function trackMiss(word: Word) {
  try {
    const raw: Record<string,MissEntry> = JSON.parse(localStorage.getItem(MISSED_KEY)||'{}');
    const prev = raw[word.spanish] ?? { spanish:word.spanish, english:word.english, missCount:0, lastMissed:0 };
    raw[word.spanish] = { ...prev, missCount: prev.missCount+1, lastMissed: Date.now() };
    localStorage.setItem(MISSED_KEY, JSON.stringify(raw));
  } catch {}
}
type Feedback = 'correct' | 'wrong' | null;
type Phase    = 'active' | 'ending' | 'ended';
interface Word    { spanish: string; english: string; }
interface BlastAsteroid { id:number; letter:string; x:number; y:number; vx:number; vy:number; size:number; }
interface LevelCfg { name: string; emoji: string; color: string; dark: string; glow: string; xpToNext: number; words: Word[]; }

// ── Level data ────────────────────────────────────────────────────────────────
const LEVELS: Record<number, LevelCfg> = {
  1: {
    name: 'Rookie', emoji: '🟢', color: '#22c55e', dark: '#14532d', glow: '0 0 24px #22c55e55', xpToNext: 150,
    words: [
      { spanish: 'hola',          english: 'hello' },
      { spanish: 'adiós',         english: 'goodbye' },
      { spanish: 'gracias',       english: 'thank you' },
      { spanish: 'por favor',     english: 'please' },
      { spanish: 'sí',            english: 'yes' },
      { spanish: 'no',            english: 'no' },
      { spanish: 'buenos días',   english: 'good morning' },
      { spanish: 'buenas noches', english: 'good night' },
      { spanish: 'la mesa',       english: 'the table' },
      { spanish: 'la silla',      english: 'the chair' },
      { spanish: 'la oficina',    english: 'the office' },
      { spanish: 'el agua',       english: 'the water' },
      { spanish: 'la comida',     english: 'the food' },
      { spanish: 'el libro',      english: 'the book' },
      { spanish: 'la casa',       english: 'the house' },
      { spanish: 'el perro',      english: 'the dog' },
      { spanish: 'el gato',       english: 'the cat' },
      { spanish: 'rojo',          english: 'red' },
      { spanish: 'azul',          english: 'blue' },
      { spanish: 'verde',         english: 'green' },
      { spanish: 'uno',           english: 'one' },
      { spanish: 'dos',           english: 'two' },
      { spanish: 'tres',          english: 'three' },
      { spanish: 'el amigo',      english: 'the friend' },
      { spanish: 'la familia',    english: 'the family' },
    ],
  },
  2: {
    name: 'Learner', emoji: '🔵', color: '#3b82f6', dark: '#1e3a5f', glow: '0 0 24px #3b82f655', xpToNext: 250,
    words: [
      { spanish: 'el trabajo',     english: 'the job' },
      { spanish: 'el jefe',        english: 'the boss' },
      { spanish: 'la reunión',     english: 'the meeting' },
      { spanish: 'el correo',      english: 'the email' },
      { spanish: 'necesito',       english: 'I need' },
      { spanish: 'ayuda',          english: 'help' },
      { spanish: 'el documento',   english: 'the document' },
      { spanish: 'el teléfono',    english: 'the telephone' },
      { spanish: 'el compañero',   english: 'the coworker' },
      { spanish: 'la computadora', english: 'the computer' },
      { spanish: 'quiero',         english: 'I want' },
      { spanish: 'hablar',         english: 'to speak' },
      { spanish: 'comer',          english: 'to eat' },
      { spanish: 'beber',          english: 'to drink' },
      { spanish: 'caminar',        english: 'to walk' },
      { spanish: 'el dinero',      english: 'the money' },
      { spanish: 'el tiempo',      english: 'the time' },
      { spanish: 'la semana',      english: 'the week' },
      { spanish: 'el mes',         english: 'the month' },
      { spanish: 'el año',         english: 'the year' },
      { spanish: 'hoy',            english: 'today' },
      { spanish: 'mañana',         english: 'tomorrow' },
      { spanish: 'ayer',           english: 'yesterday' },
      { spanish: 'mucho',          english: 'a lot' },
      { spanish: 'poco',           english: 'a little' },
      // extra 10 (pool size 35)
      { spanish: 'la tienda',      english: 'the store' },
      { spanish: 'el restaurante', english: 'the restaurant' },
      { spanish: 'el médico',      english: 'the doctor' },
      { spanish: 'el hospital',    english: 'the hospital' },
      { spanish: 'la escuela',     english: 'the school' },
      { spanish: 'el mercado',     english: 'the market' },
      { spanish: 'el banco',       english: 'the bank' },
      { spanish: 'la ciudad',      english: 'the city' },
      { spanish: 'el país',        english: 'the country' },
      { spanish: 'el idioma',      english: 'the language' },
    ],
  },
  3: {
    name: 'Intermediate', emoji: '🟡', color: '#f59e0b', dark: '#451a03', glow: '0 0 24px #f59e0b55', xpToNext: 400,
    words: [
      { spanish: 'enviar',          english: 'to send' },
      { spanish: 'recibir',         english: 'to receive' },
      { spanish: 'firmar',          english: 'to sign' },
      { spanish: 'el informe',      english: 'the report' },
      { spanish: 'el proyecto',     english: 'the project' },
      { spanish: 'el plazo',        english: 'the deadline' },
      { spanish: 'la presentación', english: 'the presentation' },
      { spanish: 'el cliente',      english: 'the client' },
      { spanish: 'aprobar',         english: 'to approve' },
      { spanish: 'la contraseña',   english: 'the password' },
      { spanish: 'el departamento', english: 'the department' },
      { spanish: 'la empresa',      english: 'the company' },
      { spanish: 'el gerente',      english: 'the manager' },
      { spanish: 'la solicitud',    english: 'the request' },
      { spanish: 'el horario',      english: 'the schedule' },
      { spanish: 'el proveedor',    english: 'the supplier' },
      { spanish: 'el acuerdo',      english: 'the agreement' },
      { spanish: 'desarrollar',     english: 'to develop' },
      { spanish: 'implementar',     english: 'to implement' },
      { spanish: 'gestionar',       english: 'to manage' },
      { spanish: 'el recurso',      english: 'the resource' },
      { spanish: 'la capacidad',    english: 'the capacity' },
      { spanish: 'el objetivo',     english: 'the objective' },
      { spanish: 'el proceso',      english: 'the process' },
      { spanish: 'la solución',     english: 'the solution' },
      // extra 20 (pool size 45)
      { spanish: 'el archivo',      english: 'the file' },
      { spanish: 'el sistema',      english: 'the system' },
      { spanish: 'la red',          english: 'the network' },
      { spanish: 'el usuario',      english: 'the user' },
      { spanish: 'la pantalla',     english: 'the screen' },
      { spanish: 'el teclado',      english: 'the keyboard' },
      { spanish: 'imprimir',        english: 'to print' },
      { spanish: 'guardar',         english: 'to save' },
      { spanish: 'buscar',          english: 'to search' },
      { spanish: 'el servidor',     english: 'the server' },
      { spanish: 'la nube',         english: 'the cloud' },
      { spanish: 'actualizar',      english: 'to update' },
      { spanish: 'instalar',        english: 'to install' },
      { spanish: 'la aplicación',   english: 'the application' },
      { spanish: 'la carpeta',      english: 'the folder' },
      { spanish: 'el acceso',       english: 'the access' },
      { spanish: 'la contabilidad', english: 'the accounting' },
      { spanish: 'el presupuesto',  english: 'the budget' },
      { spanish: 'la auditoría',    english: 'the audit' },
      { spanish: 'el organigrama',  english: 'the org chart' },
    ],
  },
  4: {
    name: 'Advanced', emoji: '🔴', color: '#ef4444', dark: '#450a0a', glow: '0 0 24px #ef444455', xpToNext: 600,
    words: [
      { spanish: 'la propuesta',    english: 'the proposal' },
      { spanish: 'negociar',        english: 'to negotiate' },
      { spanish: 'el presupuesto',  english: 'the budget' },
      { spanish: 'la factura',      english: 'the invoice' },
      { spanish: 'cumplir',         english: 'to fulfill' },
      { spanish: 'el contrato',     english: 'the contract' },
      { spanish: 'revisar',         english: 'to review' },
      { spanish: 'la capacitación', english: 'the training' },
      { spanish: 'el rendimiento',  english: 'the performance' },
      { spanish: 'la estrategia',   english: 'the strategy' },
      { spanish: 'la inversión',    english: 'the investment' },
      { spanish: 'la rentabilidad', english: 'the profitability' },
      { spanish: 'el mercado',      english: 'the market' },
      { spanish: 'la competencia',  english: 'the competition' },
      { spanish: 'la tendencia',    english: 'the trend' },
      { spanish: 'el balance',      english: 'the balance sheet' },
      { spanish: 'la adquisición',  english: 'the acquisition' },
      { spanish: 'el margen',       english: 'the margin' },
      { spanish: 'la demanda',      english: 'the demand' },
      { spanish: 'la oferta',       english: 'the supply' },
      { spanish: 'el crecimiento',  english: 'the growth' },
      { spanish: 'la deuda',        english: 'the debt' },
      { spanish: 'el activo',       english: 'the asset' },
      { spanish: 'el pasivo',       english: 'the liability' },
      { spanish: 'la utilidad',     english: 'the profit' },
      // extra 30 (pool size 55)
      { spanish: 'el socio',             english: 'the partner' },
      { spanish: 'la alianza',           english: 'the alliance' },
      { spanish: 'el descuento',         english: 'the discount' },
      { spanish: 'la comisión',          english: 'the commission' },
      { spanish: 'el dividendo',         english: 'the dividend' },
      { spanish: 'la acción',            english: 'the share' },
      { spanish: 'el bono',              english: 'the bond' },
      { spanish: 'la tasa',              english: 'the rate' },
      { spanish: 'el índice',            english: 'the index' },
      { spanish: 'la moneda',            english: 'the currency' },
      { spanish: 'la inflación',         english: 'the inflation' },
      { spanish: 'el riesgo',            english: 'the risk' },
      { spanish: 'la oportunidad',       english: 'the opportunity' },
      { spanish: 'el capital',           english: 'the capital' },
      { spanish: 'la reserva',           english: 'the reserve' },
      { spanish: 'el déficit',           english: 'the deficit' },
      { spanish: 'el superávit',         english: 'the surplus' },
      { spanish: 'la exportación',       english: 'the export' },
      { spanish: 'la importación',       english: 'the import' },
      { spanish: 'el impuesto',          english: 'the tax' },
      { spanish: 'el arancel',           english: 'the tariff' },
      { spanish: 'la subvención',        english: 'the subsidy' },
      { spanish: 'el monopolio',         english: 'the monopoly' },
      { spanish: 'la franquicia',        english: 'the franchise' },
      { spanish: 'la fusión',            english: 'the merger' },
      { spanish: 'la escisión',          english: 'the spin-off' },
      { spanish: 'el flujo',             english: 'the cash flow' },
      { spanish: 'la pérdida',           english: 'the loss' },
      { spanish: 'el ingreso',           english: 'the revenue' },
      { spanish: 'la participación',     english: 'the stake' },
    ],
  },
  5: {
    name: 'Expert', emoji: '🟣', color: '#a855f7', dark: '#2e1065', glow: '0 0 24px #a855f755', xpToNext: 2000,
    words: [
      // Emotions & inner life
      { spanish: 'el orgullo',        english: 'pride' },
      { spanish: 'la vergüenza',      english: 'shame' },
      { spanish: 'la esperanza',      english: 'hope' },
      { spanish: 'la confianza',      english: 'confidence' },
      { spanish: 'la culpa',          english: 'guilt' },
      { spanish: 'la envidia',        english: 'envy' },
      { spanish: 'el rencor',         english: 'grudge' },
      { spanish: 'la angustia',       english: 'anguish' },
      { spanish: 'el alivio',         english: 'relief' },
      { spanish: 'la nostalgia',      english: 'nostalgia' },
      { spanish: 'la soledad',        english: 'loneliness' },
      { spanish: 'el asombro',        english: 'amazement' },
      // Character & behavior
      { spanish: 'orgulloso',         english: 'proud' },
      { spanish: 'avergonzado',       english: 'ashamed' },
      { spanish: 'agotado',           english: 'exhausted' },
      { spanish: 'desesperado',       english: 'desperate' },
      { spanish: 'celoso',            english: 'jealous' },
      { spanish: 'terco',             english: 'stubborn' },
      { spanish: 'cobarde',           english: 'cowardly' },
      { spanish: 'valiente',          english: 'brave' },
      { spanish: 'egóista',           english: 'selfish' },
      { spanish: 'generoso',          english: 'generous' },
      { spanish: 'perezoso',          english: 'lazy' },
      { spanish: 'impaciente',        english: 'impatient' },
      { spanish: 'curioso',           english: 'curious' },
      // Abstract nouns
      { spanish: 'el esfuerzo',       english: 'effort' },
      { spanish: 'el fracaso',        english: 'failure' },
      { spanish: 'éxito',             english: 'success' },
      { spanish: 'el recuerdo',       english: 'memory' },
      { spanish: 'la pesadilla',      english: 'nightmare' },
      { spanish: 'el consejo',        english: 'advice' },
      { spanish: 'el destino',        english: 'destiny' },
      { spanish: 'la promesa',        english: 'promise' },
      { spanish: 'la mentira',        english: 'lie' },
      { spanish: 'la costumbre',      english: 'habit' },
      { spanish: 'el propósito',      english: 'purpose' },
      { spanish: 'la duda',           english: 'doubt' },
      { spanish: 'el peligro',        english: 'danger' },
      { spanish: 'la queja',          english: 'complaint' },
      { spanish: 'el placer',         english: 'pleasure' },
      { spanish: 'la herramienta',    english: 'tool' },
      { spanish: 'el comportamiento', english: 'behavior' },
      { spanish: 'la actitud',        english: 'attitude' },
      { spanish: 'el ambiente',       english: 'atmosphere' },
      { spanish: 'la libertad',       english: 'freedom' },
      { spanish: 'la justicia',       english: 'justice' },
      { spanish: 'el poder',          english: 'power' },
      { spanish: 'la muerte',         english: 'death' },
      { spanish: 'el nacimiento',     english: 'birth' },
      { spanish: 'la suerte',         english: 'luck' },
      // Verbs
      { spanish: 'atreverse',         english: 'to dare' },
      { spanish: 'arrepentirse',      english: 'to regret' },
      { spanish: 'fingir',            english: 'to pretend' },
      { spanish: 'lograr',            english: 'to achieve' },
      { spanish: 'superar',           english: 'to overcome' },
      { spanish: 'exigir',            english: 'to demand' },
      { spanish: 'pertenecer',        english: 'to belong' },
      { spanish: 'rechazar',          english: 'to reject' },
      { spanish: 'engañar',           english: 'to deceive' },
      { spanish: 'quejarse',          english: 'to complain' },
      { spanish: 'merecer',           english: 'to deserve' },
      { spanish: 'perdonar',          english: 'to forgive' },
      { spanish: 'destruir',          english: 'to destroy' },
      { spanish: 'reconocer',         english: 'to recognize' },
      { spanish: 'resolver',          english: 'to solve' },
    ],
  },
};

const MAX_LEVEL      = 5;
const WORDS_PER_RACE = 5;
const POOL_SIZE      = (lv: number) => 25 + (lv - 1) * 10; // L1=25 L2=35 L3=45 L4=55 L5=65
const XP_THRESH      = [0, 150, 400, 800, 1400];

// ── Helpers ───────────────────────────────────────────────────────────────────
function wordLevel(spanish: string): number {
  for (let l = 1; l <= MAX_LEVEL; l++) {
    if ((LEVELS[l]?.words ?? []).some(w => w.spanish === spanish)) return l;
  }
  return 1;
}
function xpToLevel(xp: number) {
  for (let l = MAX_LEVEL; l >= 1; l--) if (xp >= XP_THRESH[l - 1]) return l;
  return 1;
}
const cpuMs   = (lv: number) => Math.max(70000, (80 - (lv - 1) * 5) * 1000); // caps at 70s from level 3
const setPenalty = (lv: number) => (lv - 1) * 5;
const calcBoost  = (secs: number) => Math.max(1, Math.floor(20 - secs));

function normalize(t: string) {
  return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¡¿!?,\.;:]/g, '').trim().replace(/\s+/g, ' ');
}
const BLAST_STARS = Array.from({length:50},(_,i)=>({x:(i*37+13)%100,y:(i*61+7)%100,size:i%4===0?2:1}));
const BLAST_ALPHA = 'abcdefghijklmnopqrstuvwxyz';
function spawnBlastAst(id:number,letter:string): BlastAsteroid {
  const edge=Math.floor(Math.random()*4);
  const spd=0.16+Math.random()*0.24, ang=(Math.random()-0.5)*0.08;
  let x=50,y=50,vx=ang,vy=spd;
  if(edge===0){x=5+Math.random()*90;y=-6;vx=ang;vy=spd;}
  else if(edge===1){x=107;y=5+Math.random()*90;vx=-spd;vy=ang;}
  else if(edge===2){x=5+Math.random()*90;y=107;vx=ang;vy=-spd;}
  else{x=-7;y=5+Math.random()*90;vx=spd;vy=ang;}
  return{id,letter,x,y,vx,vy,size:36+Math.random()*16};
}
function initBlastField(word:Word): BlastAsteroid[] {
  const target=word.spanish.toLowerCase().replace(/ /g,'');
  const letters=[...target.split('')];
  while(letters.length<15)letters.push(BLAST_ALPHA[Math.floor(Math.random()*BLAST_ALPHA.length)]);
  return shuffle(letters).slice(0,15).map((l,i)=>spawnBlastAst(i,l));
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmt(s: number) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; }

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; }

  @keyframes roadScroll { to { background-position: -80px 0; } }
  @keyframes carBounce  {
    0%,100% { transform: translateY(-50%) scale(1); }
    50%     { transform: translateY(-60%) scale(1.1); }
  }
  @keyframes carBoost {
    0%  { filter: drop-shadow(0 0 0px cyan) brightness(1); }
    40% { filter: drop-shadow(0 0 12px cyan) brightness(1.4); }
    100%{ filter: drop-shadow(0 0 0px cyan) brightness(1); }
  }
  @keyframes shake {
    0%,100%{ transform: translateX(0) translateY(-50%); }
    25%    { transform: translateX(-6px) translateY(-50%); }
    75%    { transform: translateX(6px) translateY(-50%); }
  }
  @keyframes popIn {
    from { opacity: 0; transform: translateY(12px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes coinFloat {
    0%  { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
    35% { opacity: 1; transform: translate(-50%, -30px) scale(1.3); }
    100%{ opacity: 0; transform: translate(-50%, -70px) scale(0.9); }
  }
  @keyframes lvlBurst {
    0%  { opacity: 0; transform: scale(0.5) rotate(-8deg); }
    60% { opacity: 1; transform: scale(1.06) rotate(1deg); }
    100%{ opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @keyframes cntDown {
    0%  { opacity: 0; transform: scale(2.2); }
    25% { opacity: 1; transform: scale(1); }
    80% { opacity: 1; }
    100%{ opacity: 0; transform: scale(0.6); }
  }
  @keyframes fireBorderFlash {
    0%   { opacity: 1; }
    60%  { opacity: 0.7; }
    100% { opacity: 0; }
  }
  @keyframes asteroidExplode {
    0%   { transform: translate(-50%,-50%) scale(1);   opacity: 1; filter: brightness(1); }
    25%  { transform: translate(-50%,-50%) scale(1.9); opacity: 1; filter: brightness(2); }
    60%  { transform: translate(-50%,-50%) scale(2.8); opacity: 0.5; filter: brightness(1.5); }
    100% { transform: translate(-50%,-50%) scale(3.5); opacity: 0; filter: brightness(1); }
  }
  @keyframes fireFlicker {
    0%   { opacity: 0.7; transform: translateY(-50%) translateX(-70%) scaleY(0.9); }
    100% { opacity: 1.0; transform: translateY(-55%) translateX(-70%) scaleY(1.1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes boostPulse {
    0%,100%{ opacity: 1; }
    50%    { opacity: 0.75; }
  }
  @keyframes winPop {
    0%  { transform: scale(0.5) rotate(-5deg); opacity: 0; }
    70% { transform: scale(1.15) rotate(2deg); opacity: 1; }
    100%{ transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes gradientShift {
    0%,100% { background-position: 0% 50%; }
    50%     { background-position: 100% 50%; }
  }

  .fc { transform-style: preserve-3d; transition: transform 0.5s cubic-bezier(.4,2,.55,1); cursor: pointer; }
  .fc.flip { transform: rotateY(180deg); }
  .fc-f, .fc-b {
    backface-visibility: hidden; -webkit-backface-visibility: hidden;
    position: absolute; inset: 0; border-radius: 20px;
    display: flex; align-items: center; justify-content: center; flex-direction: column;
  }
  .fc-b { transform: rotateY(180deg); }

  .btn-primary {
    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  }
  .btn-primary:hover { transform: translateY(-1px); filter: brightness(1.1); }
  .btn-primary:active { transform: translateY(1px); filter: brightness(0.95); }
`;

// ── Sub-components ─────────────────────────────────────────────────────────
function Lane({ label, car, pos, color, fb, streak }: {
  label: string; car: string; pos: number; color: string; fb: Feedback; streak?: number;
}) {
  const p = Math.min(95, Math.max(4, pos));
  return (
    <div style={{ position:'relative', height:56, padding:'0 8px' }}>
      <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)',
        fontSize:9, color:'#64748b', fontFamily:'monospace', letterSpacing:1, width:28, textAlign:'center' }}>
        {label}
      </span>
      {(() => {
        const s = streak ?? 0;
        // red (239,68,68) → purple (168,85,247) as streak climbs past 3
        const t    = Math.min(1, (s - 3) / 6); // 0 at streak=3, 1 at streak=9+
        const r    = Math.round(239 - (239 - 168) * t);
        const g    = Math.round(68  + (85  - 68 ) * t);
        const b    = Math.round(68  + (247 - 68 ) * t);
        const alpha    = s >= 3 ? Math.min(0.75, 0.30 + (s - 3) * 0.08) : 0;
        const glowAlpha = s >= 3 ? Math.min(1.0,  0.55 + (s - 3) * 0.12) : 0;
        const glowSize  = s >= 3 ? 10 + (s - 3) * 6 : 0;
        const roadBorder = s >= 3 ? `1px solid rgba(${r},${g},${b},0.7)` : '1px solid rgba(255,255,255,0.06)';
        const roadShadow = s >= 3
          ? `inset 0 0 ${glowSize}px rgba(${r},${g},${b},0.5), 0 0 ${glowSize * 2}px rgba(${r},${g},${b},${glowAlpha})`
          : 'inset 0 2px 8px rgba(0,0,0,0.4)';
        return (
      <div style={{ position:'absolute', left:40, right:8, top:'50%', transform:'translateY(-50%)',
        height:38, background:'linear-gradient(180deg,#1a1a2e,#0d0d1a)', borderRadius:8,
        overflow:'hidden', border:roadBorder,
        boxShadow:roadShadow,
        transition:'box-shadow 0.4s ease, border 0.4s ease' }}>
        {/* Streak road glow overlay — full road fill */}
        {s >= 3 && (
          <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0,
            background:`radial-gradient(ellipse at 30% 50%, rgba(${r},${g},${b},${alpha}) 0%, rgba(${r},${g},${b},${alpha * 0.5}) 50%, rgba(${r},${g},${b},0.08) 100%)`,
            animation:'boostPulse 0.6s ease-in-out infinite' }} />
        )}
        {/* Road markings */}
        <div style={{ position:'absolute', top:'50%', left:0, right:0, height:2,
          backgroundImage:'repeating-linear-gradient(90deg,rgba(255,255,255,0.15) 0,rgba(255,255,255,0.15) 20px,transparent 20px,transparent 40px)',
          transform:'translateY(-50%)', animation:'roadScroll 1.4s linear infinite' }} />
        {/* Finish zone */}
        <div style={{ position:'absolute', right:0, top:0, bottom:0, width:28,
          backgroundImage:'repeating-conic-gradient(rgba(255,255,255,0.9) 0% 25%, rgba(0,0,0,0.8) 0% 50%)',
          backgroundSize:'9px 9px' }} />
        {/* Car */}
        <div style={{
          position:'absolute', left:`${p}%`, top:'50%',
          transition:'left 0.3s cubic-bezier(.4,0,.2,1)',
          fontSize:26, lineHeight:1, zIndex:2,
          animation: fb==='correct' ? 'carBoost 0.65s ease'
                   : fb==='wrong'   ? 'shake 0.4s ease'
                   : 'carBounce 2s ease-in-out infinite',
          transform:'translateY(-50%) translateX(-50%)',
        }}><span style={{ display:'inline-block', transform:'scaleX(-1)' }}>{car}</span></div>
        {/* Fire trail for streak */}
        {(streak ?? 0) >= 3 && (
          <div style={{ position:'absolute', left:`${p}%`, top:'50%',
            transform:'translateY(-50%) translateX(-70%)',
            fontSize:18, lineHeight:1, pointerEvents:'none', zIndex:1,
            animation:'fireFlicker 0.4s ease-in-out infinite alternate' }}>🔥</div>
        )}
        {/* Speed glow */}
        {fb==='correct' && (
          <div style={{ position:'absolute', left:`${p}%`, top:'50%', transform:'translateY(-50%) translateX(-50%)',
            width:60, height:60, borderRadius:'50%',
            background:`radial-gradient(circle, ${(streak ?? 0) >= 3 ? '#f97316' : color}55 0%, transparent 70%)`,
            pointerEvents:'none' }} />
        )}
      </div>
        );
      })()}
    </div>
  );
}

function Track({ playerPos, cpuPos, fb, level, streak }: {
  playerPos:number; cpuPos:number; fb:Feedback; level:number; streak:number;
}) {
  const lv = LEVELS[level] || LEVELS[1];
  return (
    <div style={{ borderRadius:16, overflow:'hidden',
      background:'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(8,12,24,0.95) 100%)',
      border:'1px solid rgba(255,255,255,0.08)',
      boxShadow:'0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      {/* Header */}
      <div style={{ background:'rgba(0,0,0,0.3)', padding:'8px 16px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontSize:10, color:'#334155', fontFamily:'monospace', letterSpacing:2 }}>SPEED RACE</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:lv.color, boxShadow:lv.glow, animation:'boostPulse 2s ease infinite' }} />
          <span style={{ fontSize:10, color:lv.color, fontFamily:'monospace', letterSpacing:1 }}>LVL {level} · {lv.name.toUpperCase()}</span>
        </div>
      </div>
      {/* Lanes */}
      <div style={{ padding:'6px 0' }}>
        <Lane label="YOU" car="🏎️" pos={playerPos} color={lv.color} fb={fb} streak={streak} />
        <div style={{ height:1, background:'rgba(255,255,255,0.04)', margin:'2px 16px' }} />
        <Lane label="CPU" car="🚗" pos={cpuPos} color="#ef4444" fb={null} />
      </div>
      {/* Progress bars */}
      <div style={{ background:'rgba(0,0,0,0.2)', padding:'8px 16px 10px',
        display:'flex', gap:12, borderTop:'1px solid rgba(255,255,255,0.04)' }}>
        {[{label:'YOU', pct:playerPos, color:lv.color}, {label:'CPU', pct:cpuPos, color:'#ef4444'}].map(({label,pct,color})=>(
          <div key={label} style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:9, color:'#334155', fontFamily:'monospace', letterSpacing:1 }}>{label}</span>
              <span style={{ fontSize:9, color:color, fontFamily:'monospace' }}>{Math.round(pct)}%</span>
            </div>
            <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`,
                background:`linear-gradient(90deg,${color}66,${color})`,
                transition:'width 0.3s ease', borderRadius:2,
                boxShadow:`0 0 8px ${color}66` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlipCard({ word, flipped, onFlip }: { word:Word; flipped:boolean; onFlip:()=>void }) {
  return (
    <div style={{ perspective:1200, height:192 }} onClick={onFlip}>
      <div className={`fc${flipped?' flip':''}`} style={{ width:'100%', height:'100%', position:'relative' }}>
        <div className="fc-f" style={{
          background:'linear-gradient(145deg, rgba(30,58,95,0.9), rgba(15,39,68,0.95))',
          border:'1px solid rgba(59,130,246,0.2)',
          boxShadow:'0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, color:'#475569', marginBottom:10, letterSpacing:3, textTransform:'uppercase' }}>🇪🇸 Spanish</div>
          <div style={{ fontSize:38, fontWeight:800, color:'#f1f5f9', textAlign:'center', padding:'0 24px', lineHeight:1.2 }}>{word.spanish}</div>
          <div style={{ marginTop:16, fontSize:11, color:'#334155', display:'flex', alignItems:'center', gap:5 }}>
            <span>tap to reveal</span><span style={{ opacity:.5 }}>→</span>
          </div>
        </div>
        <div className="fc-b" style={{
          background:'linear-gradient(145deg, rgba(20,83,45,0.9), rgba(15,62,30,0.95))',
          border:'1px solid rgba(34,197,94,0.25)',
          boxShadow:'0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:10, color:'#475569', marginBottom:10, letterSpacing:3, textTransform:'uppercase' }}>🇺🇸 English</div>
          <div style={{ fontSize:32, fontWeight:800, color:'#86efac', textAlign:'center', padding:'0 24px', lineHeight:1.3 }}>{word.english}</div>
          <div style={{ marginTop:14, background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)',
            padding:'4px 16px', borderRadius:20, color:'#4ade80', fontSize:12, fontWeight:600 }}>✓ got it</div>
        </div>
      </div>
    </div>
  );
}

function XPBar({ xp, level }: { xp:number; level:number }) {
  const lv   = LEVELS[level] || LEVELS[1];
  const prev = XP_THRESH[level - 1] || 0;
  const next = prev + lv.xpToNext;
  const pct  = level >= MAX_LEVEL ? 100 : Math.min(100, ((xp - prev) / (next - prev)) * 100);
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={{ fontSize:10, color:'#475569', letterSpacing:1 }}>XP PROGRESS</span>
        <span style={{ fontSize:10, color:lv.color, fontFamily:'monospace' }}>
          {`${xp - prev} / ${next - prev}`}
        </span>
      </div>
      <div style={{ height:6, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', position:'relative' }}>
        <div style={{ height:'100%', width:`${pct}%`,
          background:`linear-gradient(90deg, ${lv.color}88, ${lv.color})`,
          transition:'width 0.8s cubic-bezier(.4,0,.2,1)', borderRadius:3,
          boxShadow:`0 0 10px ${lv.color}66` }} />
      </div>
    </div>
  );
}

// ── Glass panel helper ─────────────────────────────────────────────────────
const glass = (extra = ''): React.CSSProperties => ({
  background: 'rgba(15,23,42,0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',

});

// ══════════════════════════════════════════════════════════════════════════════
// LETTER BLAST MINI-GAME
// ══════════════════════════════════════════════════════════════════════════════
function LetterBlast({ coins, setCoins, blastXP, setBlastXP, xpMult, playerXP, saveCoins, markIntroSeen }: {
  coins: number; setCoins: (n:number)=>void;
  blastXP: number; setBlastXP: (n:number)=>void;
  xpMult: number;
  playerXP: number;
  saveCoins: (c:number)=>void;
  markIntroSeen: (lv:number)=>void;
}) {
  type GS = 'idle'|'intro'|'playing'|'over';
  const [gs,   setGs]   = useState<GS>('idle');
  const [time, setTime] = useState(60);
  const [scored, setScored] = useState(0);
  const [asts,  setAsts]  = useState<BlastAsteroid[]>([]);
  const [wIdx,  setWIdx]  = useState(0);
  const [spelled, setSpelled] = useState('');
  const [laser,   setLaser]   = useState<{x:number;y:number}|null>(null);
  const [explIds, setExplIds] = useState<Set<number>>(new Set());
  const [wrongId, setWrongId] = useState<number|null>(null);
  const [bHyd,  setBHyd]  = useState(false);

  const gsRef      = useRef<GS>('idle');
  const spelledRef = useRef('');
  const wIdxRef    = useRef(0);

  const coinsRef   = useRef(coins);
  const xpRef      = useRef(blastXP);
  const scoredRef  = useRef(0);
  const moveRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval>|null>(null);

  // Keep refs in sync with props
  useEffect(()=>{ coinsRef.current=coins; },[coins]);
  useEffect(()=>{ xpRef.current=blastXP; },[blastXP]);
  useEffect(()=>{ setBHyd(true); },[]);
  useEffect(()=>()=>{ if(moveRef.current)clearInterval(moveRef.current); if(timerRef.current)clearInterval(timerRef.current); },[]);

  const blastLevel  = xpToLevel(blastXP);
  const wordPoolRef2 = useRef<Word[]>([]);
  // Only reshuffle when the blast level changes
  const lastBlastLv  = useRef(0);
  if (lastBlastLv.current !== blastLevel) {
    lastBlastLv.current = blastLevel;
    wordPoolRef2.current = shuffle([...(LEVELS[blastLevel]||LEVELS[1]).words]);
  }
  const currentWord  = wordPoolRef2.current[wIdx % Math.max(1, wordPoolRef2.current.length)];
  const targetL      = currentWord ? currentWord.spanish.toLowerCase().replace(/ /g,'') : '';
  const nextLetter   = spelled.length < targetL.length ? targetL[spelled.length] : null;

  const startGame = useCallback(()=>{
    const lv=xpToLevel(xpRef.current);
    const seenLv=parseInt(localStorage.getItem('spanishIntroLevel')||'0');
    if(lv > seenLv){
      setGs('intro'); return;
    }
    gsRef.current='playing'; setGs('playing');
    setTime(60); setScored(0); scoredRef.current=0;
    spelledRef.current=''; setSpelled(''); wIdxRef.current=0; setWIdx(0);
    setExplIds(new Set()); setWrongId(null);
    setAsts(initBlastField(wordPoolRef2.current[0]));
    if(moveRef.current)clearInterval(moveRef.current);
    moveRef.current=setInterval(()=>{
      if(gsRef.current!=='playing')return;
      setAsts(prev=>{
        const moved=prev.map(a=>{
          const nx=a.x+a.vx, ny=a.y+a.vy;
          return(nx<-10||nx>110||ny<-10||ny>110)?spawnBlastAst(a.id,a.letter):{...a,x:nx,y:ny};
        });
        // Guarantee required letter is always on screen
        const bwArr=wordPoolRef2.current;
        const cw=bwArr[wIdxRef.current%Math.max(1,bwArr.length)];
        if(cw){
          const tgt=cw.spanish.toLowerCase().replace(/ /g,'');
          const nl=spelledRef.current.length<tgt.length?tgt[spelledRef.current.length]:null;
          if(nl && !moved.some(a=>a.letter.toLowerCase()===nl)){
            const ri=Math.floor(Math.random()*moved.length);
            const arr=[...moved]; arr[ri]={...arr[ri],letter:nl}; return arr;
          }
        }
        return moved;
      });
    },50);
    if(timerRef.current)clearInterval(timerRef.current);
    timerRef.current=setInterval(()=>{
      if(gsRef.current!=='playing')return;
      setTime(t=>{ if(t<=1){ gsRef.current='over'; setGs('over'); clearInterval(moveRef.current!); clearInterval(timerRef.current!); return 0; } return t-1; });
    },1000);
  },[]);

  const clickAst = useCallback((a:BlastAsteroid)=>{
    if(gsRef.current!=='playing')return;
    const bwArr=wordPoolRef2.current;
    const cw=bwArr[wIdxRef.current%Math.max(1,bwArr.length)];
    if(!cw)return;
    const tgt=cw.spanish.toLowerCase().replace(/ /g,'');
    const nl=spelledRef.current.length<tgt.length?tgt[spelledRef.current.length]:null;
    if(!nl)return;
    setLaser({x:a.x,y:a.y}); setTimeout(()=>setLaser(null),250);
    if(a.letter.toLowerCase()===nl){
      setExplIds(prev=>new Set([...prev,a.id]));
      const newSp=spelledRef.current+a.letter;
      if(newSp.length>=tgt.length){
        // word complete — replace all asteroids after explosion
        const blv=xpToLevel(xpRef.current);
        const coinReward=Math.round((15+(blv-1)*5)*xpMult);
        const xpReward=Math.round((10+blv*5)*xpMult);
        const nc=coinsRef.current+coinReward, nx=xpRef.current+xpReward;
        coinsRef.current=nc; xpRef.current=nx;
        setCoins(nc); setBlastXP(nx);
        saveCoins(nc);
        localStorage.setItem('blastSave',JSON.stringify({blastXP:nx}));
        scoredRef.current+=1; setScored(scoredRef.current);
        spelledRef.current=''; setSpelled('');
        const ni=wIdxRef.current+1; wIdxRef.current=ni; setWIdx(ni);
        setTimeout(()=>{
          setExplIds(new Set());
          // wordPoolRef2 will have updated on next render if level changed; use it
          const pool=wordPoolRef2.current;
          setAsts(initBlastField(pool[ni%Math.max(1,pool.length)]));
        },420);
      } else {
        spelledRef.current=newSp; setSpelled(newSp);
        const nnl=tgt[newSp.length];
        // delay asteroid replacement until explosion finishes
        setTimeout(()=>{
          setExplIds(prev=>{const n=new Set(prev);n.delete(a.id);return n;});
          setAsts(prev=>{
            let arr=prev.map(ast=>ast.id===a.id?spawnBlastAst(ast.id,BLAST_ALPHA[Math.floor(Math.random()*BLAST_ALPHA.length)]):ast);
            if(!arr.some(ast=>ast.letter.toLowerCase()===nnl)){
              const ri=arr.findIndex(ast=>ast.letter.toLowerCase()!==nnl);
              if(ri>=0){arr=[...arr];arr[ri]=spawnBlastAst(arr[ri].id,nnl);}
            }
            return arr;
          });
        },420);
      }
    } else {
      setWrongId(a.id); setTimeout(()=>setWrongId(null),400);
      if(cw) trackMiss(cw);
    }
  },[]);

  if(!bHyd)return null;

  const buildDisplay=()=>{
    if(!currentWord)return[];
    let si=0;
    return currentWord.spanish.toLowerCase().split('').map((ch,i)=>{
      if(ch===' ')return{ch:' ',done:false,space:true,next:false,key:i};
      const done=si<spelled.length, next=si===spelled.length;
      const out={ch:done?ch:'_',done,space:false,next,key:i}; si++; return out;
    });
  };

  return(
    <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:20,fontWeight:800,color:'#f1f5f9'}}>☄️ Letter Blast</div>
        <div style={{display:'flex',gap:14,alignItems:'center'}}>
          <span style={{fontSize:12,color:'#fbbf24'}}>🪙 {coins}</span>
          <span style={{fontSize:12,color:'#a78bfa'}}>⚡ {blastXP} XP · Lv {xpToLevel(blastXP)}</span>
        </div>
      </div>

      {gs==='intro'&&(()=>{
        const blv=xpToLevel(blastXP);
        const blvCfg=LEVELS[blv]||LEVELS[1];
        const introWords=(blvCfg).words;
        return(
          <div style={{display:'flex',flexDirection:'column',gap:18,animation:'popIn .4s ease'}}>
            <div style={{textAlign:'center'}}>
              <div style={{width:72,height:72,borderRadius:20,margin:'0 auto 16px',background:`linear-gradient(135deg,${blvCfg.dark},${blvCfg.color}33)`,border:`2px solid ${blvCfg.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:34,boxShadow:blvCfg.glow}}>{blvCfg.emoji}</div>
              <div style={{fontSize:11,color:blvCfg.color,letterSpacing:3,fontWeight:600,textTransform:'uppercase'}}>Level {blv} Unlocked</div>
              <div style={{fontSize:26,fontWeight:800,color:'#f1f5f9',marginTop:6}}>{blvCfg.name}</div>
              <div style={{fontSize:13,color:'#475569',marginTop:6}}>Here are the {introWords.length} words you&apos;ll blast at this level.</div>
            </div>
            <button onClick={()=>{ markIntroSeen(blv); gsRef.current='playing'; setGs('playing');
              const bw=shuffle([...introWords]); setTime(60); setScored(0); scoredRef.current=0;
              spelledRef.current=''; setSpelled(''); wIdxRef.current=0; setWIdx(0);
              setExplIds(new Set()); setWrongId(null); setAsts(initBlastField(bw[0]));
              if(moveRef.current)clearInterval(moveRef.current);
              moveRef.current=setInterval(()=>{ if(gsRef.current!=='playing')return; setAsts(prev=>{ const moved=prev.map(a=>{ const nx=a.x+a.vx,ny=a.y+a.vy; return(nx<-10||nx>110||ny<-10||ny>110)?spawnBlastAst(a.id,a.letter):{...a,x:nx,y:ny}; }); const bwArr2=wordPoolRef2.current; const cw2=bwArr2[wIdxRef.current%Math.max(1,bwArr2.length)]; if(cw2){ const tgt2=cw2.spanish.toLowerCase().replace(/ /g,''); const nl2=spelledRef.current.length<tgt2.length?tgt2[spelledRef.current.length]:null; if(nl2&&!moved.some(a=>a.letter.toLowerCase()===nl2)){ const ri=Math.floor(Math.random()*moved.length); const arr=[...moved]; arr[ri]={...arr[ri],letter:nl2}; return arr; } } return moved; }); },50);
              if(timerRef.current)clearInterval(timerRef.current);
              timerRef.current=setInterval(()=>{ if(gsRef.current!=='playing')return; setTime(t=>{ if(t<=1){ gsRef.current='over'; setGs('over'); clearInterval(moveRef.current!); clearInterval(timerRef.current!); return 0; } return t-1; }); },1000);
            }} className="btn-primary" style={{padding:'14px 0',borderRadius:13,border:'none',cursor:'pointer',background:`linear-gradient(135deg,${blvCfg.color},${blvCfg.color}cc)`,color:'#000',fontSize:16,fontWeight:800,letterSpacing:0.5,boxShadow:`0 6px 28px ${blvCfg.color}44`}}>
              Got it — Let&apos;s Blast! ☄️
            </button>
            <div style={{...glass(),borderRadius:16,padding:18}}>
              <div style={{fontSize:10,color:'#334155',letterSpacing:2,marginBottom:14}}>VOCABULARY · {introWords.length} WORDS</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                {introWords.map(w=>(
                  <div key={w.spanish} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:9,padding:'9px 12px'}}>
                    <div style={{fontSize:13,fontWeight:700,color:'#e2e8f0'}}>{w.spanish}</div>
                    <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{w.english}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {gs==='idle'&&(()=>{
        const blv=xpToLevel(blastXP);
        const blvCfg=LEVELS[blv]||LEVELS[1];
        const bPrev=XP_THRESH[blv-1]??0;
        const bNext=bPrev+(blvCfg.xpToNext);
        return(
        <div style={{display:'flex',flexDirection:'column',gap:18,animation:'popIn .4s ease'}}>
          {/* Hero */}
          <div style={{textAlign:'center',padding:'8px 0'}}>
            <div style={{fontSize:13,color:'#475569',letterSpacing:3,textTransform:'uppercase',marginBottom:4}}>Letter Blast</div>
            <h2 style={{margin:'0 0 6px',fontSize:30,fontWeight:900,lineHeight:1,background:`linear-gradient(135deg,${blvCfg.color},#fff 70%)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              {blvCfg.emoji} {blvCfg.name}
            </h2>
            <div style={{fontSize:12,color:'#334155'}}>Level {blv} of {MAX_LEVEL}</div>
          </div>

          {/* Stats card */}
          <div style={{...glass(),borderRadius:18,padding:20,display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:52,height:52,borderRadius:14,flexShrink:0,background:`linear-gradient(135deg,${blvCfg.dark},${blvCfg.color}22)`,border:`2px solid ${blvCfg.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,boxShadow:blvCfg.glow}}>
                {blvCfg.emoji}
              </div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontSize:10,color:'#475569',letterSpacing:1}}>BLAST XP</span>
                  <span style={{fontSize:10,color:blvCfg.color,fontFamily:'monospace'}}>{blastXP-bPrev} / {bNext-bPrev}</span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${Math.min(100,((blastXP-bPrev)/(bNext-bPrev))*100)}%`,background:`linear-gradient(90deg,${blvCfg.color},${blvCfg.color}88)`,borderRadius:3,transition:'width .4s ease'}}/>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:20,fontWeight:800,color:'#fbbf24',lineHeight:1}}>{coins}</div>
                <div style={{fontSize:10,color:'#475569',marginTop:2}}>🪙 coins</div>
              </div>
            </div>
            {/* Level roadmap */}
            <div style={{display:'flex',gap:6}}>
              {Array.from({length:MAX_LEVEL},(_,i)=>i+1).map(l=>{
                const lc=LEVELS[l], act=l===blv, done=l<blv;
                return(<div key={l} style={{flex:1,height:32,borderRadius:8,background:done?`${lc.color}22`:act?`${lc.color}18`:'rgba(255,255,255,0.03)',border:`1px solid ${act?lc.color+'55':done?lc.color+'22':'rgba(255,255,255,0.07)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:act?lc.color:done?lc.color+'88':'#1e293b',fontWeight:act?700:500,boxShadow:act?lc.glow:'none'}}>{done?'✓':l}</div>);
              })}
            </div>
          </div>

          {/* Launch button */}
          <button onClick={startGame} className="btn-primary" style={{padding:'18px 0',borderRadius:14,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff',fontSize:18,fontWeight:900,letterSpacing:0.5,boxShadow:'0 8px 32px rgba(59,130,246,0.4)'}}>☄️ LAUNCH BLAST</button>

          {/* How to play */}
          <div style={{...glass(),borderRadius:14,padding:18}}>
            <div style={{fontSize:11,fontWeight:700,color:'#64748b',marginBottom:14,letterSpacing:2}}>HOW TO PLAY</div>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[
                ['☄️','15 asteroids drift across the screen — each carries a letter'],
                ['🎯','An English word is shown. Click asteroids in order to spell it in Spanish'],
                ['💥','Click the right letter → laser fires → asteroid explodes → letter fills in'],
                ['❌','Wrong letter → asteroid flashes red, no penalty'],
                ['⏰','You have 60 seconds — spell as many words as possible'],
                ['🪙',`Coins per word: Lv1=15, Lv2=20, Lv3=25, Lv4=30, Lv5=35 (×booster)`],
                ['⚡',`Blast XP per word: Lv1=15, Lv2=20, Lv3=25... levels use same thresholds as Word Race`],
              ].map(([ic,tx])=>(
                <div key={String(tx)} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                  <span style={{fontSize:14}}>{ic}</span>
                  <span style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>{tx}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
      })()}

      {gs==='playing'&&currentWord&&(
        <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:14,fontFamily:'monospace',fontWeight:700,color:time<=10?'#ef4444':'#94a3b8'}}>⏱ {time}s</span>
            <span style={{fontSize:13,color:'#64748b'}}>✅ {scored} words</span>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:11,color:'#475569',letterSpacing:2,marginBottom:4}}>SPELL IN SPANISH</div>
            <div style={{fontSize:20,fontWeight:700,color:'#f1f5f9'}}>{currentWord.english}</div>
          </div>
          <div style={{display:'flex',justifyContent:'center',gap:5,flexWrap:'wrap',minHeight:42}}>
            {buildDisplay().map((cell,i)=>
              cell.space?<span key={i} style={{width:8}}/>:
              <div key={i} style={{width:30,height:36,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,background:cell.done?'rgba(59,130,246,0.25)':'rgba(255,255,255,0.04)',border:cell.done?'1px solid rgba(59,130,246,0.5)':cell.next?'1px solid rgba(251,191,36,0.45)':'1px solid rgba(255,255,255,0.07)',color:cell.done?'#93c5fd':'#1e293b',transition:'all 0.12s'}}>
                {cell.done?cell.ch.toUpperCase():''}
              </div>
            )}
          </div>
          <div style={{textAlign:'center',fontSize:12,color:'#334155'}}>
            Next: <span style={{color:'#fbbf24',fontWeight:800,fontSize:15}}>{nextLetter?.toUpperCase()??'✓'}</span>
          </div>
          <div style={{position:'relative',width:'100%',height:270,background:'radial-gradient(ellipse at center,rgba(5,8,35,0.97) 0%,rgba(1,2,10,1) 100%)',borderRadius:16,overflow:'hidden',border:'1px solid rgba(59,130,246,0.12)',boxShadow:'0 0 40px rgba(0,0,20,0.95)'}}>
            {BLAST_STARS.map((s,i)=>(<div key={i} style={{position:'absolute',left:`${s.x}%`,top:`${s.y}%`,width:s.size,height:s.size,borderRadius:'50%',background:'rgba(255,255,255,0.55)',pointerEvents:'none'}}/>))}
            {laser&&(
              <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:10}}>
                <line x1="50%" y1="100%" x2={`${laser.x}%`} y2={`${laser.y}%`} stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" style={{filter:'drop-shadow(0 0 6px #3b82f6)'}} opacity={0.95}/>
                <circle cx={`${laser.x}%`} cy={`${laser.y}%`} r="7" fill="#93c5fd" opacity={0.85} style={{filter:'drop-shadow(0 0 8px #60a5fa)'}}/>
              </svg>
            )}
            {asts.map(a=>{
              const expl=explIds.has(a.id), wrong=wrongId===a.id;
              const bg=expl?'radial-gradient(circle,#fef08a,#fbbf24 40%,#f97316)':wrong?'radial-gradient(circle,#fca5a5,#ef4444 50%,#7f1d1d)':'radial-gradient(circle at 35% 30%,#64748b 0%,#334155 35%,#1e293b 65%,#0f172a 100%)';
              const bd=expl?'1.5px solid #fbbf24':wrong?'1.5px solid #ef4444':'1.5px solid rgba(148,163,184,0.18)';
              const sh=expl?'0 0 22px #fbbf24,0 0 6px #f97316':wrong?'0 0 14px #ef4444':'inset 2px 2px 4px rgba(255,255,255,0.06),inset -1px -1px 3px rgba(0,0,0,0.6),0 2px 8px rgba(0,0,0,0.7)';
              return(
              <div key={a.id} onClick={()=>clickAst(a)} style={{position:'absolute',left:`${a.x}%`,top:`${a.y}%`,width:a.size,height:a.size,transform:'translate(-50%,-50%)',borderRadius:'50%',background:bg,border:bd,boxShadow:sh,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:Math.round(a.size*0.42),fontWeight:800,color:expl||wrong?'#fff':'#94a3b8',userSelect:'none',zIndex:5,transition:expl?'none':'box-shadow 0.15s ease',animation:expl?'asteroidExplode 0.4s ease-out forwards':'none',textShadow:expl||wrong?'none':'0 1px 3px rgba(0,0,0,0.8)'}}>
                {expl?'💥':a.letter.toUpperCase()}
              </div>);
            })}
          </div>
        </>
      )}

      {gs==='over'&&(
        <div style={{textAlign:'center',padding:'24px 0',display:'flex',flexDirection:'column',gap:14,alignItems:'center'}}>
          <div style={{fontSize:56}}>⏰</div>
          <div style={{fontSize:22,fontWeight:800,color:'#f1f5f9'}}>Time&apos;s Up!</div>
          <div style={{fontSize:15,color:'#64748b'}}>You spelled <strong style={{color:'#93c5fd'}}>{scored}</strong> word{scored!==1?'s':''}</div>
          <div style={{fontSize:13,color:'#64748b'}}>Rewards earned this round were added to your account.</div>
          <button onClick={startGame} style={{padding:'14px 40px',borderRadius:12,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#3b82f6,#1d4ed8)',color:'#fff',fontSize:15,fontWeight:700,boxShadow:'0 6px 24px rgba(59,130,246,0.4)'}}>🚀 Play Again</button>
        </div>
      )}
      {/* Blast admin controls */}
      <div style={{position:'fixed',bottom:16,left:16,zIndex:999,display:'flex',flexDirection:'column',gap:6,alignItems:'flex-start'}}>
        <div style={{fontSize:9,color:'#1e293b',letterSpacing:2,marginBottom:2}}>BLAST ADMIN</div>
        {[
          { label:'⬆️ LB Level Up', action:()=>{ const next=Math.min(MAX_LEVEL,xpToLevel(blastXP)+1); setBlastXP(XP_THRESH[next-1]); localStorage.setItem('blastSave',JSON.stringify({blastXP:XP_THRESH[next-1]})); }},
          { label:'⬇️ LB Level Down', action:()=>{ const prev=Math.max(1,xpToLevel(blastXP)-1); setBlastXP(XP_THRESH[prev-1]); localStorage.setItem('blastSave',JSON.stringify({blastXP:XP_THRESH[prev-1]})); }},
          { label:'🔄 LB Reset', action:()=>{ setBlastXP(0); localStorage.setItem('blastSave',JSON.stringify({blastXP:0})); }},
        ].map(({label,action})=>(
          <button key={label} onClick={action} style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(15,23,42,0.85)',backdropFilter:'blur(12px)',color:'#475569',fontSize:11,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}
            onMouseOver={e=>(e.currentTarget.style.color='#94a3b8')} onMouseOut={e=>(e.currentTarget.style.color='#475569')}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN GAME
// ══════════════════════════════════════════════════════════════════════════════
export default function SpanishGame() {
  const [tab, setTab] = useState<Tab>('race');
  const [missedVer, setMissedVer] = useState(0);
  const WELCOME: ChatMsg = { role:'assistant', content:'Hola! I am your AI Spanish coach, here to guide you on your learning experience.' };
  const [chatMsgs,  setChatMsgs]  = useState<ChatMsg[]>([WELCOME]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoad,  setChatLoad]  = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendChat = useCallback(async (userText: string, history: ChatMsg[]) => {
    if (!userText.trim() || chatLoad) return;
    const missed: MissEntry[] = (() => { try { return Object.values(JSON.parse(localStorage.getItem(MISSED_KEY)||'{}')); } catch { return []; } })();
    const sorted = (missed as MissEntry[]).sort((a,b)=>b.missCount-a.missCount).slice(0,12);
    const newHistory: ChatMsg[] = [...history, { role:'user', content: userText }];
    setChatMsgs([...newHistory, { role:'assistant', content:'' }]);
    setChatLoad(true);
    try {
      const res = await fetch('/api/coach', {
        method:'POST',
        headers:{'content-type':'application/json'},
        body: JSON.stringify({ messages: newHistory.filter(m=>m.content!==WELCOME.content), missedWords: sorted }),
      });
      if (!res.ok) { setChatMsgs(prev=>{ const a=[...prev]; a[a.length-1]={role:'assistant',content:'Sorry, something went wrong. Try again.'}; return a; }); return; }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const snap = full;
        setChatMsgs(prev=>{ const a=[...prev]; a[a.length-1]={role:'assistant',content:snap}; return a; });
      }
    } catch { setChatMsgs(prev=>{ const a=[...prev]; a[a.length-1]={role:'assistant',content:'Connection error. Try again.'}; return a; }); }
    finally { setChatLoad(false); }
  }, [chatLoad]);

  // ── Persistent state (all default to 0/null; loaded from localStorage after mount) ──
  const [playerXP,      setPlayerXP]      = useState(0);
  const [coins,         setCoins]         = useState(0);
  const [blastXP,       setBlastXP]       = useState(0);
  const [boosterExp,      setBoosterExp]      = useState<number | null>(null);
  const [superBoosterExp, setSuperBoosterExp] = useState<number | null>(null);
  const [lastIntroLevel,setLastIntroLevel]= useState(0);
  const [screen,        setScreen]        = useState<Screen>('menu');
  const [hydrated,      setHydrated]      = useState(false);

  // Load from localStorage once on client
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('spanishSave') || '{}');
      const xp    = saved.xp    ?? 0;
      const c     = saved.coins ?? 0;
      const intro = parseInt(localStorage.getItem('spanishIntroLevel') || '0');
      const bExp  = (() => {
        const v = localStorage.getItem('spanishBooster');
        if (!v) return null;
        const n = parseInt(v);
        return n > Date.now() ? n : null;
      })();
      setPlayerXP(xp);
      setCoins(c);
      try{ const bd=JSON.parse(localStorage.getItem('blastSave')||'{}'); setBlastXP(bd.blastXP||0); }catch{}
      setLastIntroLevel(intro);
      setBoosterExp(bExp);
      const sBExp = (() => {
        const v = localStorage.getItem('spanishSuperBooster');
        if (!v) return null;
        const n = parseInt(v);
        return n > Date.now() ? n : null;
      })();
      setSuperBoosterExp(sBExp);
      setScreen(xpToLevel(xp) > intro ? 'intro' : 'menu');
    } catch {}
    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const level = xpToLevel(playerXP);

  // ── Clock ──────────────────────────────────────────────────────────────────
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now()); // safe here — after hydration
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const boostSecs      = boosterExp      && now > 0 ? Math.max(0, Math.floor((boosterExp      - now) / 1000)) : 0;
  const superBoostSecs = superBoosterExp && now > 0 ? Math.max(0, Math.floor((superBoosterExp - now) / 1000)) : 0;
  const boostActive      = boostSecs > 0;
  const superBoostActive = superBoostSecs > 0;
  const xpMult = superBoostActive ? 3 : boostActive ? 2 : 1;

  // ── Race words ─────────────────────────────────────────────────────────────
  const [words, setWords] = useState<Word[]>([]);

  // ── Review tab state ───────────────────────────────────────────────────────
  const [revIdx,     setRevIdx]     = useState(0);
  const [revFlipped, setRevFlipped] = useState(false);

  // ── Countdown ──────────────────────────────────────────────────────────────
  const [cd, setCd] = useState(3);

  // ── Race state ─────────────────────────────────────────────────────────────
  const [qIdx,      setQIdx]      = useState(0);
  const [playerPos, setPlayerPos] = useState(0);
  const [cpuPos,    setCpuPos]    = useState(0);
  const [input,     setInput]     = useState('');
  const [fb,        setFb]        = useState<Feedback>(null);
  const [hint,      setHint]      = useState(false);
  const [rights,    setRights]    = useState(0);
  const [wrongs,    setWrongs]    = useState(0);
  const [streak,    setStreak]    = useState(0);
  const [fireBorder, setFireBorder] = useState(false);
  const [locked,    setLocked]    = useState(false);
  const [lastAns,   setLastAns]   = useState('');


  // ── Refs ───────────────────────────────────────────────────────────────────
  const raceStart = useRef(0);
  const qStart    = useRef(0);
  const phase     = useRef<Phase>('ended');
  const pPosRef   = useRef(0);
  const cPosRef   = useRef(0);
  const inputRef  = useRef<HTMLInputElement>(null);

  // ── Results state ──────────────────────────────────────────────────────────
  const [won,       setWon]       = useState(false);
  const [xpGained,  setXpGained]  = useState(0);
  const [coinGain,  setCoinGain]  = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [newLv,     setNewLv]     = useState(1);
  const [showCoin,  setShowCoin]  = useState(false);

  // ── Persist ────────────────────────────────────────────────────────────────
  const save = useCallback((xp: number, c: number) => {
    localStorage.setItem('spanishSave', JSON.stringify({ xp, coins: c }));
  }, []);
  const saveBooster = useCallback((exp: number | null) => {
    if (exp) localStorage.setItem('spanishBooster', String(exp));
    else localStorage.removeItem('spanishBooster');
  }, []);
  const saveSuperBooster = useCallback((exp: number | null) => {
    if (exp) localStorage.setItem('spanishSuperBooster', String(exp));
    else localStorage.removeItem('spanishSuperBooster');
  }, []);
  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}); },[chatMsgs]);

  const markIntroSeen = useCallback((lv: number) => {
    setLastIntroLevel(lv);
    localStorage.setItem('spanishIntroLevel', String(lv));
  }, []);
  const goToMenu = useCallback((curLevel: number, lastSeen: number) => {
    if (curLevel > lastSeen) setScreen('intro');
    else setScreen('menu');
  }, []);

  // ── End race ───────────────────────────────────────────────────────────────
  const endRace = useCallback((finalPPos: number, cpuWon: boolean) => {
    phase.current = 'ended';
    const playerWon = cpuWon ? false : finalPPos >= cPosRef.current;
    setWon(playerWon);
    const mult = xpMult;
    const xp   = Math.round((playerWon ? 50 + level * 15 : 15) * mult);
    const c    = playerWon ? 45 + level * 12 : 10;
    setXpGained(xp); setCoinGain(c);
    const newXP    = playerXP + xp;
    const newCoins = coins + c;
    const didLvlUp = xpToLevel(newXP) > level;
    setLeveledUp(didLvlUp); setNewLv(xpToLevel(newXP));
    setPlayerXP(newXP); setCoins(newCoins); save(newXP, newCoins);
    setShowCoin(true);
    setTimeout(() => setShowCoin(false), 2000);
    const mastered = newXP >= XP_THRESH[MAX_LEVEL - 1] + (LEVELS[MAX_LEVEL]?.xpToNext ?? 2000) && xpToLevel(newXP) >= MAX_LEVEL;
    setTimeout(() => setScreen(mastered ? 'mastered' : 'results'), 1400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, playerXP, coins, boostActive, save]);

  // ── Real-time CPU ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'race') return;
    const finish = cpuMs(level);
    const id = setInterval(() => {
      if (phase.current !== 'active') return;
      const p = Math.min(100, ((Date.now() - raceStart.current) / finish) * 100);
      setCpuPos(p); cPosRef.current = p;
      if (p >= 100) {
        phase.current = 'ending';
        clearInterval(id);
        endRace(pPosRef.current, true);
      }
    }, 50);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ── Countdown tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'countdown') return;
    if (cd <= 0) { setTimeout(() => setScreen('race'), 0); return; }
    const t = setTimeout(() => setCd(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, cd]);

  // ── Race mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'race') return;
    raceStart.current = Date.now();
    qStart.current    = Date.now();
    phase.current     = 'active';
    inputRef.current?.focus();
  }, [screen]);

  useEffect(() => {
    if (screen === 'race') inputRef.current?.focus();
  }, [screen, qIdx]);

  // ── Start race ─────────────────────────────────────────────────────────────
  const startRace = useCallback(() => {
    const lv = LEVELS[level] || LEVELS[1];
    setWords(shuffle(lv.words).slice(0, POOL_SIZE(level)));
    setPlayerPos(0); pPosRef.current = 0;
    setCpuPos(0);    cPosRef.current = 0;
    setInput(''); setFb(null); setHint(false);
    setRights(0); setWrongs(0); setStreak(0); setLocked(false);
    setLastAns(''); setQIdx(0);
    setCd(3); setScreen('countdown');
  }, [level]);

  // ── Submit answer ──────────────────────────────────────────────────────────
  const submit = useCallback(() => {
    if (locked || fb || phase.current !== 'active') return;
    const word = words[qIdx];
    if (!word) return;
    const secs = (Date.now() - qStart.current) / 1000;
    const ok   = normalize(input) === normalize(word.spanish);
    setLocked(true); setFb(ok ? 'correct' : 'wrong'); setLastAns(word.spanish);
    const newStreak = ok ? streak + 1 : 0;
    setStreak(newStreak);
    if (ok && newStreak >= 3) {
      setFireBorder(true);
      setTimeout(() => setFireBorder(false), 900);
    }
    if (ok) setRights(r => r + 1); else { setWrongs(w => w + 1); trackMiss(word); }
    const streakMult = newStreak >= 3 ? 1 + (5 + (newStreak - 3) * 3) / 100 : 1;
    const gain  = ok ? calcBoost(secs) * streakMult : 0;
    const lose  = ok ? 0 : setPenalty(level);
    const delta = gain - lose;
    const newP  = Math.max(0, Math.min(100, playerPos + delta));
    setPlayerPos(newP); pPosRef.current = newP;
    setTimeout(() => {
      setFb(null); setInput(''); setHint(false); setLocked(false);
      if (newP >= 100 && phase.current === 'active') {
        phase.current = 'ending';
        endRace(newP, false);
      } else if (phase.current === 'active') {
        setQIdx(i => {
          const next = i + 1;
          if (next >= words.length) {
            // reshuffle and restart from 0
            setWords(shuffle((LEVELS[level] || LEVELS[1]).words).slice(0, POOL_SIZE(level)));
            return 0;
          }
          return next;
        });
        qStart.current = Date.now();
      }
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, fb, words, qIdx, input, playerPos, level, endRace]);

  const onKey = useCallback((e: React.KeyboardEvent) => { if (e.key==='Enter') submit(); }, [submit]);
  const ins   = (ch: string) => { setInput(p => p+ch); inputRef.current?.focus(); };

  // ── Buy booster ────────────────────────────────────────────────────────────
  const buyBooster = useCallback((ms: number, cost: number, isSuper = false) => {
    if (coins < cost) return;
    const newC = coins - cost;
    setCoins(newC); save(playerXP, newC);
    if (isSuper) {
      const base = (superBoosterExp && superBoosterExp > Date.now()) ? superBoosterExp : Date.now();
      const exp  = base + ms;
      setSuperBoosterExp(exp); saveSuperBooster(exp);
    } else {
      const base = (boosterExp && boosterExp > Date.now()) ? boosterExp : Date.now();
      const exp  = base + ms;
      setBoosterExp(exp); saveBooster(exp);
    }
  }, [coins, playerXP, boosterExp, superBoosterExp, save, saveBooster, saveSuperBooster]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const lv       = LEVELS[level] || LEVELS[1];
  const allWords = LEVELS[level]?.words ?? [];

  // ══════════════════════════════════════════════════════════════════════════
  if (!hydrated) return null;

  return (
    <>
      <style>{CSS}</style>
      <div style={{
        minHeight:'100dvh', width:'100%',
        background:'#060612',
        color:'#e2e8f0',
        fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display:'flex', flexDirection:'column', alignItems:'center',
      }}>
        {/* Ambient background glows */}
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
          <div style={{ position:'absolute', top:'-10%', left:'30%', width:500, height:500,
            background:`radial-gradient(circle, ${lv.color}0d 0%, transparent 70%)`,
            transition:'background 0.8s ease' }} />
          <div style={{ position:'absolute', bottom:'-10%', right:'20%', width:400, height:400,
            background:'radial-gradient(circle, #3b82f60a 0%, transparent 70%)' }} />
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div style={{
          width:'100%', maxWidth:640, position:'sticky', top:0, zIndex:20,
          display:'flex', alignItems:'center',
          background:'rgba(6,6,18,0.85)',
          backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          padding:'0 4px',
        }}>
          {/* Brand */}
          <div style={{ padding:'0 12px', fontSize:16, marginRight:4 }}>🇪🇸</div>

          {(['race','blast','missed','coach','review','shop'] as Tab[]).map(t => (
            <button key={t} onClick={() => {
              setTab(t);
              if (t==='review') { setRevIdx(0); setRevFlipped(false); }
            }} style={{
              padding:'14px 16px', background:'none', border:'none', cursor:'pointer',
              fontSize:13, fontWeight:600, letterSpacing:0.3,
              color: tab===t ? lv.color : '#475569',
              borderBottom: tab===t ? `2px solid ${lv.color}` : '2px solid transparent',
              transition:'color 0.2s, border-color 0.2s',
              whiteSpace:'nowrap',
            }}>
              {t==='race'?'🏎️ Word Race':t==='blast'?'☄️ Letter Blast':t==='missed'?'📊 Missed':t==='coach'?'🧠 Coach':t==='review'?'📚 Review':'🛒 Shop'}
              {t==='shop' && boostActive && (
                <span style={{ marginLeft:6, fontSize:9, background:lv.color, color:'#000',
                  borderRadius:20, padding:'2px 7px', fontWeight:700, letterSpacing:0 }}>
                  ⚡{fmt(boostSecs)}
                </span>
              )}
            </button>
          ))}

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'0 12px' }}>
            <span style={{ fontSize:13 }}>🪙</span>
            <span style={{ fontSize:14, fontWeight:700, color:'#fbbf24',
              background:'linear-gradient(90deg,#fbbf24,#f59e0b)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>{coins}</span>
          </div>
        </div>

        {/* Screen border fire flash */}
        {fireBorder && (
          <div style={{
            position:'fixed', inset:0, pointerEvents:'none', zIndex:9999,
            borderRadius:0,
            boxShadow:'inset 0 0 60px 20px rgba(251,191,36,0.6), inset 0 0 120px 40px rgba(249,115,22,0.35)',
            animation:'fireBorderFlash 0.9s ease-out forwards',
          }} />
        )}

        <div style={{ width:'100%', maxWidth:600, position:'relative', zIndex:1 }}>

          {/* ══════════ REVIEW ════════════════════════════════════════════ */}
          {/* ══════════ MISSED TAB ═════════════════════════════════════════════════ */}
          {tab === 'missed' && (()=>{
            void missedVer;
            const raw: Record<string,MissEntry> = (() => { try { return JSON.parse(localStorage.getItem(MISSED_KEY)||'{}'); } catch { return {}; } })();
            const entries = Object.values(raw).sort((a,b)=>b.missCount-a.missCount);
            return (
              <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,color:'#f1f5f9'}}>📊 Missed Words</div>
                    <div style={{fontSize:11,color:'#475569',marginTop:2}}>Words you got wrong across both games</div>
                  </div>
                  {entries.length>0&&(
                    <button onClick={()=>{ localStorage.removeItem(MISSED_KEY); setMissedVer(v=>v+1); }}
                      style={{padding:'6px 12px',borderRadius:8,border:'1px solid rgba(239,68,68,0.3)',background:'rgba(239,68,68,0.08)',color:'#ef4444',fontSize:11,fontWeight:600,cursor:'pointer'}}>
                      Clear All
                    </button>
                  )}
                </div>

                {entries.length===0 ? (
                  <div style={{textAlign:'center',padding:'48px 0',display:'flex',flexDirection:'column',gap:12,alignItems:'center'}}>
                    <div style={{fontSize:56}}>🌟</div>
                    <div style={{fontSize:16,fontWeight:700,color:'#f1f5f9'}}>No misses yet!</div>
                    <div style={{fontSize:12,color:'#475569'}}>Words you get wrong will appear here.</div>
                  </div>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {entries.map((e,i)=>(
                      <div key={e.spanish} style={{
                        ...glass(), borderRadius:12, padding:'12px 16px',
                        display:'flex',alignItems:'center',gap:12,
                        borderLeft:`3px solid ${e.missCount>=5?'#ef4444':e.missCount>=3?'#f59e0b':'#64748b'}`,
                      }}>
                        <div style={{width:28,height:28,borderRadius:8,background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#475569',fontWeight:700,flexShrink:0}}>#{i+1}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:LEVELS[wordLevel(e.spanish)]?.color??'#f1f5f9'}}>{e.spanish}</div>
                          <div style={{fontSize:11,color:'#64748b',marginTop:1}}>{e.english}</div>
                        </div>
                        <div style={{textAlign:'center',flexShrink:0}}>
                          <div style={{fontSize:20,fontWeight:900,color:e.missCount>=5?'#ef4444':e.missCount>=3?'#fbbf24':'#94a3b8',lineHeight:1}}>{e.missCount}</div>
                          <div style={{fontSize:9,color:'#334155',letterSpacing:1,marginTop:2}}>MISSES</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {entries.length > 0 && (
                  <button onClick={()=>setTab('coach')} style={{marginTop:4,padding:'11px 0',borderRadius:12,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.12)',color:'#c084fc',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                    🧠 Ask AI Coach about these words
                  </button>
                )}
              </div>
            );
          })()}

          {/* ══════════ COACH TAB ════════════════════════════════════════════════ */}
          {tab === 'coach' && (
            <div style={{display:'flex',flexDirection:'column',height:520}}>
              {/* Header */}
              <div style={{padding:'14px 20px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                <div>
                  <div style={{fontSize:17,fontWeight:800,color:'#f1f5f9'}}>🧠 AI Coach</div>
                  <div style={{fontSize:11,color:'#475569',marginTop:1}}>Ask anything about Spanish — I know your missed words</div>
                </div>
                {chatMsgs.length>1&&(
                  <button onClick={()=>setChatMsgs([WELCOME])} style={{fontSize:11,color:'#475569',background:'none',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,padding:'4px 8px',cursor:'pointer'}}>Clear</button>
                )}
              </div>

              {/* Messages */}
              <div style={{flex:1,overflowY:'auto',padding:'14px 16px',display:'flex',flexDirection:'column',gap:12}}>
                {chatMsgs.length===0 && (
                  <div style={{display:'flex',flexDirection:'column',gap:10,paddingTop:8}}>
                    <div style={{textAlign:'center',padding:'20px 0 8px'}}>
                      <div style={{fontSize:40,marginBottom:8}}>🧠</div>
                      <div style={{fontSize:13,color:'#64748b'}}>Ask me anything about Spanish!</div>
                    </div>
                    {[
                      'Why do I keep missing these words?',
                      'Tips for remembering gender (el/la)?',
                      'How do accent marks work?',
                      'Give me tricks for my hardest words',
                    ].map(s=>(
                      <button key={s} onClick={()=>{ setChatInput(''); sendChat(s, []); }}
                        style={{textAlign:'left',padding:'10px 14px',borderRadius:10,border:'1px solid rgba(168,85,247,0.25)',background:'rgba(168,85,247,0.07)',color:'#a78bfa',fontSize:12,cursor:'pointer',fontWeight:500}}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {chatMsgs.map((m,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                    <div style={{
                      maxWidth:'82%',padding:'10px 14px',borderRadius:m.role==='user'?'14px 14px 4px 14px':'14px 14px 14px 4px',
                      background:m.role==='user'?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.06)',
                      border:`1px solid ${m.role==='user'?'rgba(99,102,241,0.3)':'rgba(255,255,255,0.08)'}`,
                      fontSize:13,color:'#e2e8f0',lineHeight:1.65,whiteSpace:'pre-wrap',
                    }}>
                      {m.role==='assistant' && !m.content && chatLoad
                        ? <span style={{color:'#475569'}}>▋</span>
                        : m.content.split(/(\*\*[^*]+\*\*)/).map((seg,j)=>
                            seg.startsWith('**')&&seg.endsWith('**')
                              ? <strong key={j} style={{color:'#f1f5f9'}}>{seg.slice(2,-2)}</strong>
                              : <span key={j}>{seg}</span>
                          )
                      }
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef}/>
              </div>

              {/* Input */}
              <div style={{padding:'10px 14px 14px',borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',gap:8,flexShrink:0}}>
                <input
                  value={chatInput}
                  onChange={e=>setChatInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); const t=chatInput.trim(); if(t){ setChatInput(''); sendChat(t,chatMsgs.filter(m=>m.content)); } } }}
                  placeholder="Ask your coach..."
                  disabled={chatLoad}
                  style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 14px',color:'#f1f5f9',fontSize:13,outline:'none'}}
                />
                <button
                  onClick={()=>{ const t=chatInput.trim(); if(t){ setChatInput(''); sendChat(t,chatMsgs.filter(m=>m.content)); } }}
                  disabled={chatLoad||!chatInput.trim()}
                  style={{padding:'10px 16px',borderRadius:10,border:'none',background:chatLoad||!chatInput.trim()?'rgba(99,102,241,0.15)':'rgba(99,102,241,0.4)',color:chatLoad||!chatInput.trim()?'#4338ca':'#e0e7ff',fontWeight:700,fontSize:13,cursor:chatLoad||!chatInput.trim()?'default':'pointer',transition:'all 0.15s'}}>
                  {chatLoad?'…':'Send'}
                </button>
              </div>
            </div>
          )}

          {tab === 'review' && (() => {
            const w = allWords[revIdx];
            return (
              <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:18, animation:'popIn .35s ease' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                  <div>
                    <div style={{ fontSize:20, fontWeight:800, color:'#f1f5f9' }}>Vocabulary Review</div>
                    <div style={{ fontSize:12, color:'#475569', marginTop:3 }}>Level {level} · {lv.name} · {allWords.length} words</div>
                  </div>
                  <div style={{ fontSize:13, color:lv.color, fontFamily:'monospace', fontWeight:600 }}>
                    {revIdx+1} <span style={{ color:'#334155' }}>/ {allWords.length}</span>
                  </div>
                </div>

                {/* Dot progress */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, justifyContent:'center' }}>
                  {allWords.map((_,i) => (
                    <div key={i} onClick={() => { setRevIdx(i); setRevFlipped(false); }} style={{
                      width:7, height:7, borderRadius:'50%', cursor:'pointer',
                      background: i===revIdx ? lv.color : 'rgba(255,255,255,0.1)',
                      border:`1px solid ${i===revIdx ? lv.color : 'transparent'}`,
                      boxShadow: i===revIdx ? lv.glow : 'none',
                      transition:'all .15s',
                    }} />
                  ))}
                </div>

                {w && <FlipCard word={w} flipped={revFlipped} onFlip={() => setRevFlipped(f=>!f)} />}

                {w && (
                  <div style={{ ...glass(), borderRadius:10, padding:'10px 16px',
                    fontSize:12, color:'#475569', textAlign:'center' }}>
                    💡 &ldquo;{w.spanish}&rdquo; = &ldquo;{w.english}&rdquo;
                  </div>
                )}

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={() => { if(revIdx>0){setRevIdx(i=>i-1);setRevFlipped(false);} }}
                    disabled={revIdx===0}
                    style={{ flex:1, padding:'11px 0', borderRadius:10,
                      border:'1px solid rgba(255,255,255,0.08)',
                      background:'rgba(255,255,255,0.03)',
                      color:revIdx===0?'#1e293b':'#94a3b8',
                      fontSize:13, cursor:revIdx===0?'default':'pointer', transition:'all .2s' }}>
                    ← Prev
                  </button>
                  <button onClick={() => { if(revIdx<allWords.length-1){setRevIdx(i=>i+1);setRevFlipped(false);} }}
                    disabled={revIdx===allWords.length-1}
                    style={{ flex:1, padding:'11px 0', borderRadius:10,
                      border:'1px solid rgba(255,255,255,0.08)',
                      background:'rgba(255,255,255,0.03)',
                      color:revIdx===allWords.length-1?'#1e293b':'#94a3b8',
                      fontSize:13, cursor:revIdx===allWords.length-1?'default':'pointer', transition:'all .2s' }}>
                    Next →
                  </button>
                </div>

                {/* Word grid */}
                <div style={{ ...glass(), borderRadius:14, padding:18 }}>
                  <div style={{ fontSize:10, color:'#334155', letterSpacing:2, marginBottom:12 }}>ALL {allWords.length} WORDS</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {allWords.map((ww,i) => (
                      <div key={ww.spanish} onClick={() => { setRevIdx(i); setRevFlipped(false); }} style={{
                        background: i===revIdx ? `${lv.color}14` : 'rgba(255,255,255,0.03)',
                        border:`1px solid ${i===revIdx ? lv.color+'33' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius:8, padding:'8px 12px', cursor:'pointer', transition:'all .15s',
                      }}>
                        <div style={{ fontSize:12, fontWeight:600, color:'#cbd5e1' }}>{ww.spanish}</div>
                        <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>{ww.english}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ══════════ SHOP ══════════════════════════════════════════════ */}
          {tab === 'shop' && (
            <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:16, animation:'popIn .35s ease' }}>
              <div style={{ textAlign:'center', paddingTop:8 }}>
                <div style={{ fontSize:36 }}>🛒</div>
                <div style={{ fontSize:22, fontWeight:800, marginTop:8 }}>Shop</div>
                <div style={{ fontSize:12, color:'#475569', marginTop:4 }}>Spend your hard-earned coins on XP boosters</div>
              </div>

              <div style={{ ...glass(), borderRadius:14, padding:'14px 20px',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Your balance</span>
                <span style={{ fontSize:24, fontWeight:800, color:'#fbbf24' }}>🪙 {coins}</span>
              </div>

              {boostActive && (
                <div style={{
                  background:`linear-gradient(135deg, rgba(120,53,15,0.8), rgba(69,26,3,0.9))`,
                  borderRadius:14, border:'1px solid rgba(251,191,36,0.3)',
                  padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                  boxShadow:'0 0 24px rgba(251,191,36,0.1)', animation:'boostPulse 2.5s ease infinite',
                }}>
                  <span style={{ fontSize:30 }}>⚡</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#fbbf24' }}>XP Booster Active</div>
                    <div style={{ fontSize:12, color:'#d97706', marginTop:2 }}>2× XP on all wins · {fmt(boostSecs)} remaining</div>
                  </div>
                </div>
              )}

              {[
                { label:'5-Min Booster',        sub:'2× XP for 5 minutes',                     ms:5*60*1000,  cost:150, icon:'⚡', isSuper:false, ac:'#fbbf24', sc:'rgba(251,191,36,0.3)', locked:false },
                { label:'15-Min Booster',       sub:'2× XP for 15 minutes',                    ms:15*60*1000, cost:300, icon:'🚀', isSuper:false, ac:'#fbbf24', sc:'rgba(251,191,36,0.3)', locked:false },
                { label:'5-Min Super Booster',  sub:'3× XP for 5 min · Unlocks at Level 3',   ms:5*60*1000,  cost:250, icon:'🌟', isSuper:true,  ac:'#a855f7', sc:'rgba(168,85,247,0.3)', locked:level<3 && xpToLevel(blastXP)<3 },
                { label:'15-Min Super Booster', sub:'3× XP for 15 min · Unlocks at Level 3',  ms:15*60*1000, cost:400, icon:'💫', isSuper:true,  ac:'#a855f7', sc:'rgba(168,85,247,0.3)', locked:level<3 && xpToLevel(blastXP)<3 },
              ].map(item => {
                const okCoins  = !item.locked && coins >= item.cost;
                const ok       = okCoins;
                const dimmed   = item.locked;
                return (
                  <div key={item.label} style={{
                    ...glass(), borderRadius:14,
                    padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                    opacity: item.locked ? 0.4 : ok ? 1 : 0.65,
                    border: item.isSuper ? '1px solid rgba(168,85,247,0.15)' : '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <div style={{ width:48, height:48, borderRadius:12, flexShrink:0,
                      background: ok ? `${item.ac}1a` : 'rgba(255,255,255,0.04)',
                      border:`1px solid ${ok ? item.ac+'33' : 'rgba(255,255,255,0.08)'}`,
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                      {item.locked ? '🔒' : item.icon}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color:item.locked?'#334155':'#f1f5f9' }}>{item.label}</div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{item.sub}</div>
                    </div>
                    <button onClick={() => buyBooster(item.ms, item.cost, item.isSuper)} disabled={dimmed}
                      className={ok ? 'btn-primary' : ''}
                      style={{padding:'9px 18px',borderRadius:10,border:'none',background:ok?`linear-gradient(135deg,${item.ac},${item.ac}cc)`:'rgba(255,255,255,0.06)',color:ok?'#000':'#334155',fontSize:13,fontWeight:700,cursor:ok?'pointer':'default',whiteSpace:'nowrap',boxShadow:ok?`0 4px 14px ${item.sc}`:'none'}}>
                      🪙 {item.cost}
                    </button>
                  </div>
                );
              })}

              <div style={{ ...glass(), borderRadius:12, padding:16 }}>
                <div style={{ fontSize:10, color:'#334155', letterSpacing:2, marginBottom:10 }}>HOW TO EARN COINS</div>
                {[
                  ['🏆', `Win a race → ${45 + level * 12} coins`],
                  ['😓', 'Lose a race → 10 coins (every race rewards you)'],
                  ['⬆️', 'Higher level = bigger win bonus'],
                ].map(([ic, tx]) => (
                  <div key={tx as string} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                    <span style={{ fontSize:14 }}>{ic}</span>
                    <span style={{ fontSize:12, color:'#64748b', lineHeight:1.5 }}>{tx}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ RACE TAB ══════════════════════════════════════════ */}
          {tab === 'blast' && <LetterBlast coins={coins} setCoins={setCoins} blastXP={blastXP} setBlastXP={setBlastXP} xpMult={xpMult} playerXP={playerXP} saveCoins={(c)=>save(playerXP,c)} markIntroSeen={markIntroSeen} />}

          {tab === 'race' && (
            <>
              {/* ── LEVEL INTRO ─────────────────────────────────────────── */}
              {screen === 'intro' && (
                <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:18, animation:'popIn .4s ease' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ width:72, height:72, borderRadius:20, margin:'0 auto 16px',
                      background:`linear-gradient(135deg, ${lv.dark}, ${lv.color}33)`,
                      border:`2px solid ${lv.color}44`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:34, boxShadow:lv.glow }}>
                      {lv.emoji}
                    </div>
                    <div style={{ fontSize:11, color:lv.color, letterSpacing:3, fontWeight:600, textTransform:'uppercase' }}>Level {level} Unlocked</div>
                    <div style={{ fontSize:26, fontWeight:800, color:'#f1f5f9', marginTop:6 }}>{lv.name}</div>
                    <div style={{ fontSize:13, color:'#475569', marginTop:6 }}>
                      Here are all {allWords.length} words you&apos;ll race with at this level.
                    </div>
                  </div>

                  <button onClick={() => { markIntroSeen(level); setScreen('menu'); }}
                    className="btn-primary"
                    style={{
                      padding:'14px 0', borderRadius:13, border:'none', cursor:'pointer',
                      background:`linear-gradient(135deg, ${lv.color}, ${lv.color}cc)`,
                      color:'#000', fontSize:16, fontWeight:800, letterSpacing:0.5,
                      boxShadow:`0 6px 28px ${lv.color}44`,
                    }}>
                    Got it — Let&apos;s Race! 🏁
                  </button>

                  <div style={{ ...glass(), borderRadius:16, padding:18 }}>
                    <div style={{ fontSize:10, color:'#334155', letterSpacing:2, marginBottom:14 }}>VOCABULARY · {allWords.length} WORDS</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                      {allWords.map(w => (
                        <div key={w.spanish} style={{
                          background:'rgba(255,255,255,0.04)',
                          border:'1px solid rgba(255,255,255,0.07)',
                          borderRadius:9, padding:'9px 12px',
                        }}>
                          <div style={{ fontSize:13, fontWeight:700, color:'#e2e8f0' }}>{w.spanish}</div>
                          <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{w.english}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {level === 3 && (
                    <div style={{
                      background:'linear-gradient(135deg,rgba(46,16,101,0.8),rgba(30,10,70,0.9))',
                      border:'1px solid rgba(168,85,247,0.4)', borderRadius:14,
                      padding:'16px 20px', display:'flex', gap:14, alignItems:'center',
                      boxShadow:'0 0 28px rgba(168,85,247,0.15)',
                    }}>
                      <span style={{ fontSize:32 }}>🌟</span>
                      <div>
                        <div style={{ fontSize:14, fontWeight:800, color:'#c084fc' }}>Super XP Booster Unlocked!</div>
                        <div style={{ fontSize:12, color:'#a78bfa', marginTop:4, lineHeight:1.5 }}>
                          You&apos;ve reached Level 3. The <strong>Super Booster</strong> in the Shop now gives <strong>3× XP</strong> instead of 2× — race fast and stack those gains.
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ── MENU ────────────────────────────────────────────────── */}
              {screen === 'menu' && (
                <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:18, animation:'popIn .4s ease' }}>

                  {/* Hero */}
                  <div style={{ textAlign:'center', padding:'8px 0' }}>
                    <div style={{ fontSize:13, color:'#475569', letterSpacing:3, textTransform:'uppercase', marginBottom:4 }}>SpeedEspañol</div>
                    <h1 style={{ margin:'0 0 6px', fontSize:32, fontWeight:900, lineHeight:1,
                      background:`linear-gradient(135deg, ${lv.color}, #fff 70%)`,
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                      {lv.emoji} {lv.name}
                    </h1>
                    <div style={{ fontSize:12, color:'#334155' }}>Level {level} of {MAX_LEVEL}</div>
                    {boostActive && (
                      <div style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:6,
                        background:'rgba(120,53,15,0.6)', border:'1px solid rgba(251,191,36,0.3)',
                        borderRadius:20, padding:'5px 14px', fontSize:12, color:'#fbbf24', fontWeight:600 }}>
                        <span>⚡</span> 2× XP active · {fmt(boostSecs)} left
                      </div>
                    )}
                  </div>

                  {/* Stats card */}
                  <div style={{ ...glass(), borderRadius:18, padding:20, display:'flex', flexDirection:'column', gap:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <div style={{ width:52, height:52, borderRadius:14, flexShrink:0,
                        background:`linear-gradient(135deg, ${lv.dark}, ${lv.color}22)`,
                        border:`2px solid ${lv.color}44`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:24, boxShadow:lv.glow }}>
                        {lv.emoji}
                      </div>
                      <div style={{ flex:1 }}>
                        <XPBar xp={playerXP} level={level} />
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:20, fontWeight:800, color:'#fbbf24', lineHeight:1 }}>{coins}</div>
                        <div style={{ fontSize:10, color:'#475569', marginTop:2 }}>🪙 coins</div>
                      </div>
                    </div>

                    {/* Level roadmap */}
                    <div style={{ display:'flex', gap:6 }}>
                      {Array.from({length:MAX_LEVEL},(_,i)=>i+1).map(l => {
                        const lvl=LEVELS[l]; const act=l===level, done=l<level;
                        return (
                          <div key={l} style={{
                            flex:1, height:32, borderRadius:8,
                            background: done ? `${lvl.color}22` : act ? `${lvl.color}18` : 'rgba(255,255,255,0.03)',
                            border:`1px solid ${act ? lvl.color+'55' : done ? lvl.color+'22' : 'rgba(255,255,255,0.07)'}`,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:10, color:act ? lvl.color : done ? lvl.color+'88' : '#1e293b',
                            fontWeight:act ? 700 : 500,
                            boxShadow:act ? lvl.glow : 'none',
                            transition:'all .3s',
                          }}>{done ? '✓' : l}</div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CTA */}
                  <button onClick={startRace} className="btn-primary" style={{
                    padding:'18px 0', borderRadius:14, border:'none', cursor:'pointer',
                    background:`linear-gradient(135deg, ${lv.color} 0%, ${lv.color}cc 100%)`,
                    color:'#000', fontSize:18, fontWeight:900, letterSpacing:0.5,
                    boxShadow:`0 8px 32px ${lv.color}44`,
                  }}>🏎️ START RACE</button>

                  {/* How to play */}
                  <div style={{ ...glass(), borderRadius:14, padding:18 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#64748b', marginBottom:14, letterSpacing:2 }}>HOW TO PLAY</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {[
                        ['🏁', 'Race the CPU — type the Spanish word before it reaches the finish line'],
                        ['⚡', 'Correct = +20% minus the seconds you took. Faster answers = bigger boost'],
                        ['⬇️', `Wrong = ${setPenalty(level) > 0 ? `-${setPenalty(level)}% setback` : 'no penalty at Level 1'} — penalty grows with each level`],
                        ['🚗', `CPU finishes in ${cpuMs(level)/1000}s at this level and speeds up every level`],
                        ['📚', 'Use the Review tab to study all 25 words at any time'],
                        ['🛒', 'Win coins every race — spend them on XP boosters in the Shop'],
                      ].map(([ic, tx]) => (
                        <div key={tx as string} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                          <span style={{ fontSize:15, flexShrink:0, marginTop:1 }}>{ic}</span>
                          <span style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>{tx}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── COUNTDOWN ───────────────────────────────────────────── */}
              {screen === 'countdown' && (
                <div style={{ minHeight:'70vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20, animation:'popIn .3s ease' }}>
                  <div style={{ fontSize:12, color:'#334155', letterSpacing:4, textTransform:'uppercase' }}>Get ready to race</div>
                  <div key={cd} style={{
                    fontSize: cd===0 ? 56 : 100, fontWeight:900,
                    color: cd===0 ? lv.color : '#f1f5f9',
                    animation:'cntDown 1s ease forwards',
                    textShadow: cd===0 ? lv.glow : '0 0 40px rgba(255,255,255,0.3)',
                    minWidth:150, textAlign:'center', lineHeight:1,
                  }}>
                    {cd===0 ? '¡GO!' : cd}
                  </div>
                  <div style={{ fontSize:12, color:'#1e293b' }}>Every second of delay costs you boost %</div>
                </div>
              )}

              {/* ── RACE ────────────────────────────────────────────────── */}
              {screen === 'race' && words[qIdx] && (
                <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14, animation:'popIn .3s ease' }}>
                  <Track playerPos={playerPos} cpuPos={cpuPos} fb={fb} level={level} streak={streak} />

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ display:'flex', gap:14 }}>
                      <span style={{ fontSize:13, color:'#22c55e', fontWeight:700 }}>✓ {rights}</span>
                      <span style={{ fontSize:13, color:'#ef4444', fontWeight:700 }}>✗ {wrongs}</span>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      {superBoostActive && <span style={{ fontSize:10, color:'#c084fc', fontFamily:'monospace', fontWeight:600 }}>🌟3×XP</span>}
                      {boostActive && !superBoostActive && <span style={{ fontSize:10, color:'#fbbf24', fontFamily:'monospace', fontWeight:600 }}>⚡2×XP</span>}
                      <span style={{ fontSize:11, color:'#334155', fontFamily:'monospace' }}>
                        Word {qIdx+1} / {words.length}
                      </span>
                      {streak >= 3 && (
                        <span style={{
                          fontSize:11, fontWeight:800, fontFamily:'monospace',
                          color:'#f97316', letterSpacing:0.5,
                          animation:'boostPulse 0.5s ease-in-out infinite',
                          textShadow:'0 0 8px rgba(249,115,22,0.7)',
                        }}>🔥 {streak}× STREAK</span>
                      )}
                    </div>
                  </div>

                  {/* Question card */}
                  <div style={{
                    ...glass(), borderRadius:18,
                    padding:22, display:'flex', flexDirection:'column', gap:14,
                    outline: fb==='correct' ? '2px solid rgba(34,197,94,0.4)'
                           : fb==='wrong'   ? '2px solid rgba(239,68,68,0.4)' : '2px solid transparent',
                    transition:'outline .15s, box-shadow .15s',
                    boxShadow: fb==='correct' ? `0 0 30px rgba(34,197,94,0.1), 0 4px 24px rgba(0,0,0,0.3)`
                              : fb==='wrong'  ? `0 0 30px rgba(239,68,68,0.1), 0 4px 24px rgba(0,0,0,0.3)`
                              : '0 4px 24px rgba(0,0,0,0.3)',
                  }}>
                    <div style={{ fontSize:10, color:'#334155', letterSpacing:3, textTransform:'uppercase' }}>
                      Translate to Spanish
                    </div>
                    <div style={{ fontSize:44, fontWeight:900, color:'#f8fafc', textAlign:'center',
                      padding:'8px 0', letterSpacing:-0.5, lineHeight:1.1 }}>
                      {words[qIdx].english}
                    </div>

                    {hint && (
                      <div style={{
                        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                        padding:'9px 16px', borderRadius:10, textAlign:'center',
                        fontSize:18, color:'#94a3b8', fontFamily:'monospace', letterSpacing:6,
                      }}>
                        {words[qIdx].spanish[0]}{'_'.repeat(Math.max(0,words[qIdx].spanish.length-1))}
                      </div>
                    )}

                    {fb && (
                      <div style={{
                        padding:'11px 16px', borderRadius:12, display:'flex', justifyContent:'space-between', alignItems:'center',
                        background: fb==='correct' ? 'rgba(20,83,45,0.6)' : 'rgba(69,10,10,0.6)',
                        border: `1px solid ${fb==='correct' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        backdropFilter:'blur(8px)',
                      }}>
                        <span style={{ fontSize:13, fontWeight:600, color: fb==='correct' ? '#86efac' : '#fca5a5' }}>
                          {fb==='correct' ? '✅ ¡Correcto!' : <span>❌ &nbsp;<span style={{ color:'#fbbf24' }}>{lastAns}</span></span>}
                        </span>

                      </div>
                    )}

                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={onKey}
                      disabled={!!locked}
                      placeholder="Type the Spanish word…"
                      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                      style={{
                        width:'100%', padding:'14px 18px', borderRadius:12, fontSize:16,
                        background:'rgba(255,255,255,0.05)',
                        border:`1px solid ${fb==='correct' ? 'rgba(34,197,94,0.4)' : fb==='wrong' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color:'#f1f5f9', outline:'none',
                        transition:'border-color .2s, background .2s',
                        opacity: locked ? .55 : 1,
                        fontFamily:'inherit',
                      }}
                    />

                    {/* Accent chars + hint */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
                      {['á','é','í','ó','ú','ñ','ü'].map(ch => (
                        <button key={ch} onClick={() => ins(ch)} style={{
                          padding:'5px 11px', borderRadius:7,
                          border:'1px solid rgba(255,255,255,0.1)',
                          background:'rgba(255,255,255,0.05)',
                          color:'#94a3b8', fontSize:14, cursor:'pointer', fontFamily:'monospace',
                          transition:'all .15s',
                        }}>{ch}</button>
                      ))}
                      <button onClick={() => setHint(h=>!h)} style={{
                        marginLeft:'auto', padding:'5px 14px', borderRadius:7,
                        border:`1px solid ${hint ? lv.color+'44' : 'rgba(255,255,255,0.1)'}`,
                        background: hint ? `${lv.color}14` : 'rgba(255,255,255,0.04)',
                        color: hint ? lv.color : '#475569', fontSize:12, cursor:'pointer',
                        transition:'all .2s',
                      }}>💡 Hint</button>
                    </div>

                    <button onClick={submit} disabled={!!locked || !input.trim()} className={!locked && input.trim() ? 'btn-primary' : ''} style={{
                      padding:'14px 0', borderRadius:12, border:'none',
                      background: !locked && input.trim()
                        ? `linear-gradient(135deg, ${lv.color}, ${lv.color}cc)`
                        : 'rgba(255,255,255,0.04)',
                      color: !locked && input.trim() ? '#000' : '#1e293b',
                      fontSize:15, fontWeight:800, letterSpacing:0.3,
                      cursor: !locked && input.trim() ? 'pointer' : 'default',
                      boxShadow: !locked && input.trim() ? `0 4px 20px ${lv.color}44` : 'none',
                      transition:'all .2s',
                    }}>Submit ↵</button>
                  </div>

                  {/* Word reference */}
                  <div style={{ ...glass(), borderRadius:12, padding:'12px 16px' }}>
                    <div style={{ fontSize:9, color:'#1e293b', letterSpacing:2, marginBottom:8 }}>THIS RACE&apos;S WORDS</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {words.map((w,i) => (
                        <span key={w.spanish} style={{
                          background: i===qIdx ? `${lv.color}18` : 'rgba(255,255,255,0.04)',
                          border:`1px solid ${i===qIdx ? lv.color+'33' : 'rgba(255,255,255,0.06)'}`,
                          borderRadius:6, padding:'3px 10px', fontSize:11,
                          color: i===qIdx ? lv.color : '#475569',
                          fontWeight: i===qIdx ? 600 : 400,
                          transition:'all .2s',
                        }}>
                          {w.spanish} <span style={{ opacity:.4 }}>=</span> {w.english}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── RESULTS ─────────────────────────────────────────────── */}
              {screen === 'mastered' && (
                <div style={{ padding:'32px 20px', display:'flex', flexDirection:'column', gap:20, alignItems:'center', textAlign:'center', animation:'popIn .5s ease' }}>
                  <div style={{ fontSize:80, animation:'winPop .8s cubic-bezier(.4,2,.6,1) forwards' }}>🏆</div>
                  <div>
                    <div style={{ fontSize:12, color:'#a855f7', letterSpacing:3, fontWeight:600, textTransform:'uppercase', marginBottom:8 }}>Achievement Unlocked</div>
                    <div style={{ fontSize:34, fontWeight:900, color:'#f1f5f9', lineHeight:1.1 }}>You Have Mastered<br/>Spanish</div>
                    <div style={{ fontSize:15, color:'#94a3b8', marginTop:12, lineHeight:1.6, maxWidth:360 }}>
                      You&apos;ve completed all 5 levels and raced through hundreds of words. <strong style={{ color:'#c084fc' }}>¡Felicitaciones!</strong>
                    </div>
                  </div>
                  <div style={{
                    width:'100%', background:'linear-gradient(135deg,rgba(46,16,101,0.6),rgba(88,28,135,0.4))',
                    border:'1px solid rgba(168,85,247,0.35)', borderRadius:18, padding:'24px 20px',
                    boxShadow:'0 0 60px rgba(168,85,247,0.15)',
                  }}>
                    <div style={{ fontSize:13, color:'#a78bfa', marginBottom:16 }}>Final stats</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                      {[{label:'Level',val:'5 / 5',icon:'🟣'},{label:'XP',val:playerXP,icon:'⚡'},{label:'Coins',val:coins,icon:'🪙'}]
                        .map(({label,val,icon}) => (
                          <div key={label} style={{ background:'rgba(255,255,255,0.05)', borderRadius:12, padding:'14px 8px' }}>
                            <div style={{ fontSize:22 }}>{icon}</div>
                            <div style={{ fontSize:20, fontWeight:800, color:'#e2e8f0', marginTop:4 }}>{val}</div>
                            <div style={{ fontSize:9, color:'#475569', marginTop:3, letterSpacing:1 }}>{label.toUpperCase()}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#334155', fontStyle:'italic' }}>Keep racing to practice — the game never ends.</div>
                  <button onClick={startRace} className="btn-primary" style={{
                    width:'100%', padding:'16px 0', borderRadius:13, border:'none', cursor:'pointer',
                    background:'linear-gradient(135deg,#a855f7,#7c3aed)',
                    color:'#fff', fontSize:16, fontWeight:800, letterSpacing:0.5,
                    boxShadow:'0 6px 28px rgba(168,85,247,0.4)',
                  }}>🏎️ Keep Racing</button>
                </div>
              )}

              {screen === 'results' && (
                <div style={{ padding:'24px 20px', display:'flex', flexDirection:'column', gap:16, animation:'popIn .4s ease' }}>

                  {/* Win/loss hero */}
                  <div style={{
                    textAlign:'center', padding:'32px 24px',
                    background: won
                      ? 'linear-gradient(145deg, rgba(20,83,45,0.8), rgba(15,60,30,0.9))'
                      : 'linear-gradient(145deg, rgba(69,10,10,0.8), rgba(90,20,20,0.9))',
                    borderRadius:20,
                    border:`1px solid ${won ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    boxShadow: won ? '0 0 60px rgba(34,197,94,0.1)' : '0 0 60px rgba(239,68,68,0.08)',
                  }}>
                    <div style={{ fontSize:64, marginBottom:10, animation:'winPop 0.6s cubic-bezier(.4,2,.6,1) forwards' }}>
                      {won ? '🏆' : '💨'}
                    </div>
                    <div style={{ fontSize:30, fontWeight:900, color: won ? '#86efac' : '#fca5a5',
                      letterSpacing:-0.5 }}>
                      {won ? '¡Ganaste!' : '¡Sigue intentando!'}
                    </div>
                    <div style={{ fontSize:14, color: won ? '#4ade80' : '#f87171', marginTop:8, fontWeight:500 }}>
                      {won ? 'You beat the CPU to the finish line!' : 'The CPU crossed the finish first — type faster!'}
                    </div>
                  </div>

                  {leveledUp && (
                    <div style={{
                      textAlign:'center', padding:'20px',
                      background:'linear-gradient(145deg, rgba(49,46,129,0.8), rgba(30,27,75,0.9))',
                      borderRadius:16, border:'1px solid rgba(168,85,247,0.3)',
                      animation:'lvlBurst .6s cubic-bezier(.4,2,.6,1)',
                      boxShadow:'0 0 40px rgba(168,85,247,0.15)',
                    }}>
                      <div style={{ fontSize:40 }}>⬆️</div>
                      <div style={{ fontSize:22, fontWeight:800, color:'#c084fc', marginTop:4 }}>Level Up!</div>
                      <div style={{ fontSize:13, color:'#a78bfa', marginTop:6 }}>
                        You are now <strong style={{ color:'#c084fc' }}>{LEVELS[newLv]?.name}</strong> — Level {newLv}
                      </div>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div style={{ ...glass(), borderRadius:18, padding:20, display:'flex', flexDirection:'column', gap:14 }}>
                    <div style={{ fontSize:10, color:'#334155', letterSpacing:2 }}>RACE SUMMARY</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                      {[
                        { label:'Correct',   val:rights,   icon:'✅', color:'#22c55e' },
                        { label:'Wrong',     val:wrongs,   icon:'❌', color:'#ef4444' },
                        { label:'XP', val:`+${xpGained}${superBoostActive?'🌟':boostActive?'⚡':''}`, icon:'⚡', color:lv.color },
                        { label:'Coins',     val:`+${coinGain}`, icon:'🪙', color:'#fbbf24' },
                      ].map(({label,val,icon,color}) => (
                        <div key={label} style={{
                          background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'12px 8px', textAlign:'center',
                          border:'1px solid rgba(255,255,255,0.06)',
                        }}>
                          <div style={{ fontSize:18, marginBottom:4 }}>{icon}</div>
                          <div style={{ fontSize:20, fontWeight:800, color, lineHeight:1 }}>{val}</div>
                          <div style={{ fontSize:9, color:'#475569', marginTop:4, letterSpacing:1 }}>{label.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    <XPBar xp={playerXP} level={level} />
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                      background:'rgba(255,255,255,0.03)', borderRadius:10, padding:'10px 14px',
                      border:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize:12, color:'#475569' }}>Total coins</span>
                      <span style={{ fontSize:16, fontWeight:800, color:'#fbbf24' }}>🪙 {coins}</span>
                    </div>
                  </div>

                  {/* Words practiced */}
                  <div style={{ ...glass(), borderRadius:14, padding:16 }}>
                    <div style={{ fontSize:10, color:'#334155', letterSpacing:2, marginBottom:10 }}>WORDS PRACTICED</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {words.map(w => (
                        <div key={w.spanish} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                          fontSize:13, padding:'7px 12px',
                          background:'rgba(255,255,255,0.03)', borderRadius:8,
                          border:'1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color:'#cbd5e1', fontWeight:600 }}>{w.spanish}</span>
                          <span style={{ color:'#475569' }}>{w.english}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={startRace} className="btn-primary" style={{
                      flex:2, padding:'15px 0', borderRadius:13, border:'none',
                      background:`linear-gradient(135deg, ${lv.color}, ${lv.color}cc)`,
                      color:'#000', fontSize:15, fontWeight:800, cursor:'pointer',
                      boxShadow:`0 6px 24px ${lv.color}44`, letterSpacing:0.3,
                    }}>🏎️ Race Again</button>
                    <button onClick={() => goToMenu(xpToLevel(playerXP), lastIntroLevel)} style={{
                      flex:1, padding:'15px 0', borderRadius:13,
                      border:'1px solid rgba(255,255,255,0.08)',
                      background:'rgba(255,255,255,0.04)',
                      color:'#64748b', fontSize:13, cursor:'pointer',
                      transition:'all .2s',
                    }}>Menu</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Floating coin animation */}
        {showCoin && (
          <div style={{
            position:'fixed', top:'28%', left:'50%',
            fontSize:28, fontWeight:800, color:'#fbbf24',
            animation:'coinFloat 2s cubic-bezier(.4,0,.2,1) forwards',
            pointerEvents:'none', zIndex:9999, whiteSpace:'nowrap',
            textShadow:'0 0 20px rgba(251,191,36,0.6)',
          }}>
            🪙 +{coinGain}
          </div>
        )}
      </div>

      {/* ── Admin controls ──────────────────────────────────────────────── */}
      <div style={{
        position:'fixed', bottom:16, right:16, zIndex:999,
        display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end',
      }}>
        <div style={{ fontSize:9, color:'#1e293b', letterSpacing:2, textAlign:'right', marginBottom:2 }}>ADMIN</div>
        {[
          { label:'⬆️ Level Up', action: () => {
            const next = Math.min(MAX_LEVEL, level + 1);
            const newXP = XP_THRESH[next - 1];
            setPlayerXP(newXP); save(newXP, coins);
            markIntroSeen(next - 1); setScreen('intro');
          }},
          { label:'⬇️ Level Down', action: () => {
            const prev = Math.max(1, level - 1);
            const newXP = XP_THRESH[prev - 1];
            setPlayerXP(newXP); save(newXP, coins);
            markIntroSeen(prev - 1); setScreen('menu');
          }},
          { label:'🔄 Reset', action: () => {
            setPlayerXP(0); setCoins(0); setLastIntroLevel(0);
            localStorage.setItem('spanishSave', JSON.stringify({ xp:0, coins:0 }));
            localStorage.setItem('spanishIntroLevel', '0');
            setScreen('intro');
          }},
        ].map(({ label, action }) => (
          <button key={label} onClick={action} style={{
            padding:'6px 12px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)',
            background:'rgba(15,23,42,0.85)', backdropFilter:'blur(12px)',
            color:'#475569', fontSize:11, cursor:'pointer', fontWeight:600,
            transition:'all .15s', whiteSpace:'nowrap',
          }}
          onMouseOver={e => (e.currentTarget.style.color='#94a3b8')}
          onMouseOut={e  => (e.currentTarget.style.color='#475569')}>
            {label}
          </button>
        ))}
      </div>
    </>
  );
}
