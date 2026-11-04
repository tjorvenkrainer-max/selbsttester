import type { Card, Side } from './types';
import { normalize } from './answer';
import { shuffle, type Rng } from './random';

/** Falsche Antwortoptionen aus anderen Karten desselben Sets (ohne Dubletten) */
export function pickDistractors(pool: readonly Card[], card: Card, side: Side, n: number, rng: Rng): string[] {
  const seen = new Set([normalize(card[side])]);
  const out: string[] = [];
  for (const c of shuffle(pool, rng)) {
    if (c.id === card.id) continue;
    const text = c[side];
    const key = normalize(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length === n) break;
  }
  return out;
}
