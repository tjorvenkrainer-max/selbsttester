// Karteikasten nach Leitner: Stapel + 5 Fächer mit wachsendem Abstand
import type { CardProgress } from './types';

export const BOX_DAYS = [0, 1, 3, 7, 14, 30] as const; // Index = Fach
export const MAX_BOX = 5;
export const BOX_LABELS = ['', '1 Tag', '3 Tage', '1 Woche', '2 Wochen', '1 Monat'];
const DAY_START_HOUR = 4; // ein Lerntag beginnt um 4 Uhr früh

export function emptyProgress(): CardProgress {
  return { level: 0, box: 0, due: 0, seen: 0, correct: 0, wrong: 0, lastSeen: 0 };
}

/** Zeitpunkt, ab dem eine Karte in `days` Lerntagen wieder fällig ist (immer 4:00 Uhr). */
export function dueAfter(now: number, days: number): number {
  const d = new Date(now - DAY_START_HOUR * 3_600_000);
  d.setHours(DAY_START_HOUR, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

/** Ganze Lerntage zwischen zwei Zeitpunkten (0 = heute) */
export function learningDaysBetween(from: number, to: number): number {
  const a = new Date(from - DAY_START_HOUR * 3_600_000);
  const b = new Date(to - DAY_START_HOUR * 3_600_000);
  a.setHours(12, 0, 0, 0);
  b.setHours(12, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export type CardStatus = 'new' | 'learning' | 'known' | 'due';

export const STATUS_LABEL: Record<CardStatus, string> = {
  new: 'Neu',
  learning: 'Am Lernen',
  known: 'Sitzt',
  due: 'Fällig',
};

export function cardStatus(p: CardProgress | undefined, now: number): CardStatus {
  if (!p || p.seen === 0) return 'new';
  if (p.level < 2) return 'learning';
  return p.due <= now ? 'due' : 'known';
}

/** Karten, die schon mal falsch waren – die mit den meisten Fehlern zuerst */
export function hardCardIds(cards: readonly { id: string }[], progress: Record<string, CardProgress>, limit = 20): string[] {
  return cards
    .map((c) => ({ id: c.id, p: progress[c.id] }))
    .filter((x) => x.p && x.p.wrong > 0)
    .sort((a, b) => b.p.wrong - a.p.wrong || b.p.wrong / Math.max(b.p.seen, 1) - a.p.wrong / Math.max(a.p.seen, 1))
    .slice(0, limit)
    .map((x) => x.id);
}

export interface BoxStats {
  total: number;
  counts: Record<CardStatus, number>;
  stack: number; // neu + am Lernen
  boxes: number[]; // Index 1–5
  dueInBox: number[]; // davon fällig
  nextDue: number | null; // nächste Fälligkeit der nicht fälligen Karten
}

export function boxStats(cards: readonly { id: string }[], progress: Record<string, CardProgress>, now: number): BoxStats {
  const counts: Record<CardStatus, number> = { new: 0, learning: 0, known: 0, due: 0 };
  const boxes = [0, 0, 0, 0, 0, 0];
  const dueInBox = [0, 0, 0, 0, 0, 0];
  let stack = 0;
  let nextDue: number | null = null;
  for (const c of cards) {
    const p = progress[c.id];
    const s = cardStatus(p, now);
    counts[s]++;
    if (!p || s === 'new' || s === 'learning') {
      stack++;
      continue;
    }
    const b = Math.min(Math.max(p.box, 1), MAX_BOX);
    boxes[b]++;
    if (s === 'due') dueInBox[b]++;
    else if (nextDue === null || p.due < nextDue) nextDue = p.due;
  }
  return { total: cards.length, counts, stack, boxes, dueInBox, nextDue };
}
