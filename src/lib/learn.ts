// Lernmodus: Runden mit kleinem Arbeitsstapel. Jede Karte erst per Auswahl, dann schriftlich.
// Was sitzt, kommt ins nächste Fach; Vergessenes zurück auf den Stapel.
import type { AnswerWith, Card, CardProgress, QuestionTypes, Side } from './types';
import { BOX_DAYS, MAX_BOX, cardStatus, dueAfter, emptyProgress } from './srs';
import { pickDistractors } from './distractors';
import { shuffle, type Rng } from './random';

export type Stage = 'mc' | 'written';
export type LearnScope = 'set' | 'practice' | 'due';

export interface LearnCard {
  setId: string;
  card: Card;
}

export interface LearnItem {
  id: string; // Karten-ID
  setId: string;
  needs: Stage[]; // noch zu schaffende Stufen
  steps: number; // Stufen am Anfang (für den Fortschrittsbalken)
  review: boolean; // war schon im Kasten (fällig oder Übung)
  scheduled: boolean; // war wirklich fällig → darf ein Fach weiter
  lapsed: boolean; // als Wiederholung falsch beantwortet
  wrongStreak: number;
  mistakes: number;
}

export interface McQuestion {
  kind: 'mc';
  itemId: string;
  prompt: string;
  promptSide: Side;
  answer: string;
  options: string[];
  correct: number;
}

export interface WrittenQuestion {
  kind: 'written';
  itemId: string;
  prompt: string;
  promptSide: Side;
  answer: string;
  selfCheck: boolean; // lange Antworten: aufdecken und selbst bewerten
}

export type Question = McQuestion | WrittenQuestion;

export interface RoundResult {
  id: string;
  ok: boolean;
  stage: Stage;
}

export interface LearnState {
  items: LearnItem[];
  active: string[]; // Arbeitsstapel dieser Runde
  queue: string[]; // Reihenfolge der Fragen
  pos: number;
  round: number;
  roundResults: RoundResult[];
  phase: 'question' | 'summary' | 'done';
  question: Question | null;
}

export interface LearnConfig {
  questionTypes: QuestionTypes;
  answerWith: AnswerWith;
  roundSize: number;
}

export interface LearnContext {
  cards: Map<string, LearnCard>;
  pools: Map<string, Card[]>; // Set-ID → Karten für Auswahl-Optionen
  config: LearnConfig;
  rng: Rng;
}

function stagesFor(types: QuestionTypes): Stage[] {
  if (types === 'mc') return ['mc'];
  if (types === 'written') return ['written'];
  return ['mc', 'written'];
}

const reviewStages = (types: QuestionTypes): Stage[] => (types === 'mc' ? ['mc'] : ['written']);

export function isLongAnswer(s: string): boolean {
  return s.length > 60 || s.trim().split(/\s+/).length > 8;
}

/** Welche Karten in die Sitzung kommen – fällige zuerst, dann angefangene, dann neue (in Listenreihenfolge) */
export function buildItems(
  cards: readonly LearnCard[],
  progress: Record<string, CardProgress>,
  config: LearnConfig,
  scope: LearnScope,
  now: number,
  rng: Rng,
): LearnItem[] {
  const due: LearnItem[] = [];
  const learning: LearnItem[] = [];
  const fresh: LearnItem[] = [];
  const known: LearnItem[] = [];
  const make = (lc: LearnCard, needs: Stage[], review: boolean, scheduled: boolean): LearnItem => ({
    id: lc.card.id,
    setId: lc.setId,
    needs,
    steps: needs.length,
    review,
    scheduled,
    lapsed: false,
    wrongStreak: 0,
    mistakes: 0,
  });

  for (const lc of cards) {
    const p = progress[lc.card.id];
    const status = cardStatus(p, now);
    if (status === 'due') {
      due.push(make(lc, reviewStages(config.questionTypes), true, true));
    } else if (status === 'known') {
      if (scope === 'practice') known.push(make(lc, reviewStages(config.questionTypes), true, false));
    } else if (scope !== 'due') {
      const halfway = status === 'learning' && p?.level === 1 && config.questionTypes === 'both';
      const needs: Stage[] = halfway ? ['written'] : stagesFor(config.questionTypes);
      const item = make(lc, needs, false, false);
      if (halfway) item.steps = 2; // Auswahl war schon geschafft
      (status === 'learning' ? learning : fresh).push(item);
    }
  }
  return [...shuffle(due, rng), ...shuffle(learning, rng), ...fresh, ...shuffle(known, rng)];
}

function pickAnswerSide(mode: AnswerWith, card: Card, stage: Stage, rng: Rng): Side {
  if (mode !== 'mixed') return mode;
  if (stage === 'written') return card.term.length <= card.definition.length ? 'term' : 'definition'; // kürzere Seite tippen
  return rng() < 0.5 ? 'term' : 'definition';
}

export function makeQuestion(item: LearnItem, ctx: LearnContext): Question {
  const entry = ctx.cards.get(item.id);
  if (!entry) throw new Error(`Karte ${item.id} fehlt`);
  const { card, setId } = entry;
  const stage = item.needs[0] ?? 'written';
  const answerSide = pickAnswerSide(ctx.config.answerWith, card, stage, ctx.rng);
  const promptSide: Side = answerSide === 'term' ? 'definition' : 'term';
  const prompt = card[promptSide];
  const answer = card[answerSide];

  if (stage === 'mc') {
    const distractors = pickDistractors(ctx.pools.get(setId) ?? [], card, answerSide, 3, ctx.rng);
    if (distractors.length) {
      const options = shuffle([answer, ...distractors], ctx.rng);
      return { kind: 'mc', itemId: item.id, prompt, promptSide, answer, options, correct: options.indexOf(answer) };
    }
  }
  // zu wenige Karten für eine Auswahl → schriftlich
  return { kind: 'written', itemId: item.id, prompt, promptSide, answer, selfCheck: isLongAnswer(answer) };
}

const findItem = (state: LearnState, id: string): LearnItem => {
  const item = state.items.find((i) => i.id === id);
  if (!item) throw new Error(`Eintrag ${id} fehlt`);
  return item;
};

export function startSession(items: LearnItem[], ctx: LearnContext): LearnState {
  const empty: LearnState = { items, active: [], queue: [], pos: 0, round: 0, roundResults: [], phase: 'done', question: null };
  return items.length ? nextRound(empty, ctx) : empty;
}

/** Arbeitsstapel auffüllen: offene Karten der letzten Runde bleiben, neue rücken nach */
export function nextRound(state: LearnState, ctx: LearnContext): LearnState {
  const open = state.items.filter((i) => i.needs.length > 0);
  if (!open.length) return { ...state, phase: 'done', question: null, active: [], queue: [] };
  const openIds = new Set(open.map((i) => i.id));
  const keep = state.active.filter((id) => openIds.has(id));
  const room = Math.max(0, ctx.config.roundSize - keep.length);
  const fill = open.filter((i) => !keep.includes(i.id)).slice(0, room).map((i) => i.id);
  const active = [...keep, ...fill];

  let queue = shuffle(active, ctx.rng);
  const last = state.queue[state.queue.length - 1];
  if (queue.length > 1 && queue[0] === last) queue = [...queue.slice(1), queue[0]]; // nicht zweimal dieselbe hintereinander

  const next: LearnState = { ...state, active, queue, pos: 0, round: state.round + 1, roundResults: [], phase: 'question', question: null };
  return { ...next, question: makeQuestion(findItem(next, queue[0]), ctx) };
}

function applyToItem(item: LearnItem, stage: Stage, ok: boolean, types: QuestionTypes): LearnItem {
  if (ok) return { ...item, needs: item.needs.slice(1), wrongStreak: 0 };
  let needs = item.needs;
  let wrongStreak = item.wrongStreak + 1;
  if (stage === 'written' && wrongStreak >= 2 && types === 'both' && needs[0] !== 'mc') {
    needs = ['mc', 'written']; // zweimal falsch geschrieben → nochmal mit Auswahl
    wrongStreak = 0;
  }
  return { ...item, needs, wrongStreak, mistakes: item.mistakes + 1, lapsed: item.lapsed || item.review };
}

/** Neuer Lernstand einer Karte nach einer Antwort */
export function nextProgress(
  prev: CardProgress | undefined,
  before: LearnItem,
  after: LearnItem,
  ok: boolean,
  now: number,
): CardProgress {
  const p: CardProgress = { ...(prev ?? emptyProgress()) };
  p.seen += 1;
  p.lastSeen = now;
  if (ok) p.correct += 1;
  else p.wrong += 1;

  if (!ok) {
    if (before.review && !before.lapsed) {
      p.level = 1; // vergessen → zurück auf den Stapel
      p.box = 0;
      p.due = 0;
    } else if (after.needs[0] === 'mc' && before.needs[0] !== 'mc') {
      p.level = 0;
    }
    return p;
  }
  if (after.needs.length > 0) {
    if (p.level < 1) p.level = 1; // Auswahl geschafft, Schreiben fehlt noch
    return p;
  }
  if (before.review && !before.scheduled && !before.lapsed) return p; // freiwillige Übung: Fach bleibt
  const box = before.scheduled && !before.lapsed ? Math.min((prev?.box ?? 0) + 1, MAX_BOX) : 1;
  p.level = 2;
  p.box = box;
  p.due = dueAfter(now, BOX_DAYS[box]);
  return p;
}

export interface AnswerOutcome {
  state: LearnState;
  progress: CardProgress;
  cardId: string;
}

export function answerCurrent(
  state: LearnState,
  ok: boolean,
  prev: CardProgress | undefined,
  ctx: LearnContext,
  now: number,
): AnswerOutcome {
  if (!state.question) throw new Error('Keine offene Frage');
  const before = findItem(state, state.question.itemId);
  const stage: Stage = state.question.kind;
  const after = applyToItem(before, stage, ok, ctx.config.questionTypes);
  const progress = nextProgress(prev, before, after, ok, now);
  const items = state.items.map((i) => (i.id === after.id ? after : i));
  const roundResults = [...state.roundResults, { id: after.id, ok, stage }];
  const pos = state.pos + 1;
  let next: LearnState = { ...state, items, roundResults, pos };
  if (pos >= state.queue.length) {
    const allDone = items.every((i) => i.needs.length === 0);
    next = { ...next, phase: allDone ? 'done' : 'summary', question: null };
  } else {
    next = { ...next, question: makeQuestion(findItem(next, state.queue[pos]), ctx) };
  }
  return { state: next, progress, cardId: after.id };
}

export interface SessionStats {
  total: number;
  done: number; // sitzt
  half: number; // Auswahl geschafft
  open: number;
  mistakes: number;
}

export function sessionStats(state: LearnState): SessionStats {
  let done = 0;
  let half = 0;
  let mistakes = 0;
  for (const i of state.items) {
    mistakes += i.mistakes;
    if (!i.needs.length) done++;
    else if (i.needs.length < i.steps) half++;
  }
  const total = state.items.length;
  return { total, done, half, open: total - done - half, mistakes };
}
