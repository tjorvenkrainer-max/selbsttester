import { describe, expect, it } from 'vitest';
import {
  answerCurrent,
  buildItems,
  nextRound,
  sessionStats,
  startSession,
  type LearnCard,
  type LearnConfig,
  type LearnContext,
  type LearnScope,
  type LearnState,
} from './learn';
import { dueAfter, emptyProgress } from './srs';
import { seeded } from './random';
import type { Card, CardProgress } from './types';

const NOW = new Date(2026, 10, 4, 18, 0).getTime();
const makeCards = (n: number): Card[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, term: `term ${i}`, definition: `def ${i}` }));

function setup(cards: Card[], progress: Record<string, CardProgress> = {}, scope: LearnScope = 'set', config: Partial<LearnConfig> = {}) {
  const learnCards: LearnCard[] = cards.map((card) => ({ setId: 's', card }));
  const cfg: LearnConfig = { questionTypes: 'both', answerWith: 'term', roundSize: 7, ...config };
  const ctx: LearnContext = {
    cards: new Map(learnCards.map((lc) => [lc.card.id, lc])),
    pools: new Map([['s', cards]]),
    config: cfg,
    rng: seeded(42),
  };
  const items = buildItems(learnCards, progress, cfg, scope, NOW, ctx.rng);
  return { ctx, state: startSession(items, ctx), progress: { ...progress } };
}

/** Beantwortet die aktuelle Frage und schreibt den Fortschritt mit */
function answer(env: { ctx: LearnContext; state: LearnState; progress: Record<string, CardProgress> }, ok: boolean) {
  const id = env.state.question!.itemId;
  const out = answerCurrent(env.state, ok, env.progress[id], env.ctx, NOW);
  env.progress[id] = out.progress;
  env.state = out.state;
  return out;
}

describe('Lernsitzung', () => {
  it('fragt neue Karten erst per Auswahl, dann schriftlich', () => {
    const env = setup(makeCards(3));
    expect(env.state.phase).toBe('question');
    expect(env.state.question?.kind).toBe('mc');
    for (let i = 0; i < 3; i++) answer(env, true);
    expect(env.state.phase).toBe('summary');
    expect(Object.values(env.progress).every((p) => p.level === 1)).toBe(true);

    env.state = nextRound(env.state, env.ctx);
    expect(env.state.question?.kind).toBe('written');
    for (let i = 0; i < 3; i++) answer(env, true);
    expect(env.state.phase).toBe('done');
    for (const p of Object.values(env.progress)) {
      expect(p).toMatchObject({ level: 2, box: 1, due: dueAfter(NOW, 1), seen: 2, correct: 2 });
    }
  });

  it('Auswahl-Optionen enthalten die richtige Antwort genau einmal', () => {
    const env = setup(makeCards(6));
    const q = env.state.question;
    if (q?.kind !== 'mc') throw new Error('Auswahl erwartet');
    expect(q.options).toHaveLength(4);
    expect(q.options[q.correct]).toBe(q.answer);
    expect(new Set(q.options).size).toBe(4);
  });

  it('falsche Antworten bleiben im Stapel und kommen in der nächsten Runde wieder', () => {
    const env = setup(makeCards(2));
    const first = env.state.question!.itemId;
    answer(env, false);
    answer(env, true);
    expect(env.progress[first]).toMatchObject({ level: 0, wrong: 1 });
    env.state = nextRound(env.state, env.ctx);
    expect(env.state.queue).toContain(first);
    expect(sessionStats(env.state)).toMatchObject({ total: 2, done: 0, half: 1, open: 1, mistakes: 1 });
  });

  it('zweimal falsch geschrieben → zurück zur Auswahl', () => {
    const env = setup(makeCards(3), {}, 'set', { roundSize: 1 });
    answer(env, true); // Auswahl
    env.state = nextRound(env.state, env.ctx);
    expect(env.state.question?.kind).toBe('written');
    answer(env, false);
    env.state = nextRound(env.state, env.ctx);
    answer(env, false);
    const id = env.state.roundResults[0].id;
    expect(env.state.items.find((i) => i.id === id)?.needs).toEqual(['mc', 'written']);
    expect(env.progress[id].level).toBe(0);
  });

  it('nimmt pro Runde höchstens roundSize Karten', () => {
    const env = setup(makeCards(10));
    expect(env.state.active).toHaveLength(7);
    expect(env.state.queue).toHaveLength(7);
  });

  it('weicht bei nur einer Karte auf Schreiben aus', () => {
    const env = setup(makeCards(1));
    expect(env.state.question?.kind).toBe('written');
  });

  it('lange Antworten werden selbst geprüft', () => {
    const long = 'Organell der Zelle, in dem durch Zellatmung Energie in Form von ATP bereitgestellt wird';
    const env = setup([{ id: 'x', term: 'Mitochondrium', definition: long }], {}, 'set', { answerWith: 'definition' });
    expect(env.state.question).toMatchObject({ kind: 'written', selfCheck: true });
  });
});

describe('Wiederholung nach Fächern', () => {
  const dueCard = (box: number): CardProgress => ({ ...emptyProgress(), level: 2, box, seen: 4, correct: 4, due: NOW - 1000 });

  it('fällige Karte richtig → ein Fach weiter', () => {
    const env = setup(makeCards(1), { c0: dueCard(2) });
    expect(env.state.question?.kind).toBe('written');
    answer(env, true);
    expect(env.state.phase).toBe('done');
    expect(env.progress.c0).toMatchObject({ level: 2, box: 3, due: dueAfter(NOW, 7) });
  });

  it('fällige Karte vergessen → Stapel, dann wieder Fach 1', () => {
    const env = setup(makeCards(1), { c0: dueCard(4) });
    answer(env, false);
    expect(env.progress.c0).toMatchObject({ level: 1, box: 0 });
    env.state = nextRound(env.state, env.ctx);
    answer(env, true);
    expect(env.progress.c0).toMatchObject({ level: 2, box: 1, due: dueAfter(NOW, 1) });
  });

  it('Fach 5 bleibt das letzte', () => {
    const env = setup(makeCards(1), { c0: dueCard(5) });
    answer(env, true);
    expect(env.progress.c0.box).toBe(5);
  });

  it('„Alles üben“ verschiebt nicht fällige Karten nicht', () => {
    const known: CardProgress = { ...emptyProgress(), level: 2, box: 3, seen: 5, due: NOW + 5 * 86_400_000 };
    const env = setup(makeCards(1), { c0: known }, 'practice');
    answer(env, true);
    expect(env.progress.c0).toMatchObject({ box: 3, due: known.due, seen: 6 });
  });

  it('„set“ lässt Karten, die sitzen und nicht fällig sind, weg', () => {
    const known: CardProgress = { ...emptyProgress(), level: 2, box: 3, seen: 5, due: NOW + 86_400_000 };
    const env = setup(makeCards(2), { c0: known });
    expect(env.state.items.map((i) => i.id)).toEqual(['c1']);
  });

  it('„due“ nimmt nur fällige Karten', () => {
    const env = setup(makeCards(3), { c1: dueCard(1) }, 'due');
    expect(env.state.items.map((i) => i.id)).toEqual(['c1']);
  });

  it('nur Auswahl: neue Karte sitzt nach einer richtigen Auswahl', () => {
    const env = setup(makeCards(4), {}, 'set', { questionTypes: 'mc' });
    for (let i = 0; i < 4; i++) answer(env, true);
    expect(env.state.phase).toBe('done');
    expect(Object.values(env.progress).every((p) => p.level === 2 && p.box === 1)).toBe(true);
  });
});
