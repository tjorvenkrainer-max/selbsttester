// Laden/Speichern im localStorage + Backup-Datei prüfen
import { STORAGE_KEY, THEME_KEY } from '../config';
import { DEFAULT_SETTINGS, SET_COLORS, type AppData, type Card, type CardProgress, type Settings, type StudySet } from './types';

export function defaultData(): AppData {
  return { version: 1, sets: [], progress: {}, bestMatch: {}, seeded: [], settings: { ...DEFAULT_SETTINGS } };
}

const MAX_DATE = 8.64e15; // größtes gültiges Datum in JavaScript
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const num = (x: unknown, fallback = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
const str = (x: unknown, fallback = '') => (typeof x === 'string' ? x : fallback);

function cleanSet(raw: unknown): StudySet | null {
  if (!isObj(raw) || typeof raw.id !== 'string') return null;
  const cards: Card[] = (Array.isArray(raw.cards) ? raw.cards : [])
    .filter((c): c is Record<string, unknown> => isObj(c) && typeof c.id === 'string')
    .map((c) => ({ id: c.id as string, term: str(c.term), definition: str(c.definition) }));
  const color = SET_COLORS.some((c) => c.id === raw.color) ? (raw.color as StudySet['color']) : 'blau';
  return {
    id: raw.id,
    title: str(raw.title, 'Ohne Titel'),
    description: str(raw.description),
    color,
    cards,
    createdAt: num(raw.createdAt, Date.now()),
    updatedAt: num(raw.updatedAt, Date.now()),
  };
}

function cleanProgress(raw: unknown): Record<string, CardProgress> {
  const out: Record<string, CardProgress> = {};
  if (!isObj(raw)) return out;
  for (const [id, p] of Object.entries(raw)) {
    if (!isObj(p)) continue;
    const level = num(p.level);
    out[id] = {
      level: level === 1 || level === 2 ? level : 0,
      box: Math.min(Math.max(Math.round(num(p.box)), 0), 5),
      due: Math.min(Math.max(num(p.due), 0), MAX_DATE), // ungültige Daten würden die Datumsanzeige abstürzen lassen
      seen: num(p.seen),
      correct: num(p.correct),
      wrong: num(p.wrong),
      lastSeen: num(p.lastSeen),
    };
  }
  return out;
}

function cleanSettings(raw: unknown): Settings {
  const s = isObj(raw) ? raw : {};
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  return {
    theme: pick(s.theme, ['system', 'light', 'dark'], DEFAULT_SETTINGS.theme),
    questionTypes: pick(s.questionTypes, ['both', 'mc', 'written'], DEFAULT_SETTINGS.questionTypes),
    answerWith: pick(s.answerWith, ['term', 'definition', 'mixed'], DEFAULT_SETTINGS.answerWith),
    roundSize: Math.min(Math.max(Math.round(num(s.roundSize, DEFAULT_SETTINGS.roundSize)), 3), 20),
    cardFront: pick(s.cardFront, ['term', 'definition'], DEFAULT_SETTINGS.cardFront),
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
  };
}

/** Prüft fremde Daten (localStorage oder Backup-Datei) und füllt Lücken auf. */
export function sanitize(raw: unknown): AppData | null {
  if (!isObj(raw) || !Array.isArray(raw.sets)) return null;
  const sets = raw.sets.map(cleanSet).filter((s): s is StudySet => s !== null);
  const bestMatch: Record<string, number> = {};
  if (isObj(raw.bestMatch)) for (const [k, v] of Object.entries(raw.bestMatch)) if (num(v) > 0) bestMatch[k] = num(v);
  const seeded = Array.isArray(raw.seeded) ? raw.seeded.filter((x): x is string => typeof x === 'string') : [];
  return { version: 1, sets, progress: cleanProgress(raw.progress), bestMatch, seeded, settings: cleanSettings(raw.settings) };
}

export function loadData(): { data: AppData; fresh: boolean } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { data: defaultData(), fresh: true };
  }
  if (!raw) return { data: defaultData(), fresh: true };
  try {
    const data = sanitize(JSON.parse(raw));
    if (data) return { data, fresh: false };
  } catch {
    // kaputte Daten nicht überschreiben, sondern beiseitelegen
  }
  try {
    localStorage.setItem(`${STORAGE_KEY}:kaputt:${Date.now()}`, raw);
  } catch {
    /* egal */
  }
  return { data: defaultData(), fresh: false };
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(THEME_KEY, data.settings.theme);
    return true;
  } catch {
    return false;
  }
}

export function backupJson(data: AppData): string {
  return JSON.stringify({ app: 'tjorven-lernt', exportedAt: new Date().toISOString(), ...data }, null, 2);
}
