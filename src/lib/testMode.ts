// Testmodus: gemischte Fragen erzeugen und auswerten
import type { AnswerWith, Card, Side } from './types';
import { checkAnswer, type Verdict } from './answer';
import { pickDistractors } from './distractors';
import { sample, shuffle, type Rng } from './random';

export type TestKind = 'tf' | 'mc' | 'written';

export const TEST_KIND_LABEL: Record<TestKind, string> = {
  tf: 'Wahr oder falsch',
  mc: 'Auswahl',
  written: 'Schreiben',
};

export interface TestQuestion {
  id: string;
  kind: TestKind;
  cardId: string;
  prompt: string;
  promptSide: Side;
  answer: string;
  shown?: string; // Wahr/Falsch: angezeigte Antwort
  isTrue?: boolean;
  options?: string[];
}

export interface TestOptions {
  count: number;
  kinds: TestKind[];
  answerWith: AnswerWith;
}

export type TestAnswer = string | boolean | undefined;

export function buildTest(cards: readonly Card[], opts: TestOptions, rng: Rng = Math.random): TestQuestion[] {
  const usable = cards.filter((c) => c.term.trim() && c.definition.trim());
  const picked = sample(usable, Math.min(opts.count, usable.length), rng);
  const kinds: TestKind[] = opts.kinds.length ? shuffle(opts.kinds, rng) : ['written'];

  const questions = picked.map((card, i): TestQuestion => {
    const answerSide: Side = opts.answerWith === 'mixed' ? (rng() < 0.5 ? 'term' : 'definition') : opts.answerWith;
    const promptSide: Side = answerSide === 'term' ? 'definition' : 'term';
    const base = { id: `${card.id}:${i}`, cardId: card.id, prompt: card[promptSide], promptSide, answer: card[answerSide] };
    const kind = kinds[i % kinds.length];
    if (kind === 'mc') {
      const wrong = pickDistractors(usable, card, answerSide, 3, rng);
      if (wrong.length) return { ...base, kind, options: shuffle([base.answer, ...wrong], rng) };
    }
    if (kind === 'tf') {
      const wrong = pickDistractors(usable, card, answerSide, 1, rng);
      const isTrue = !wrong.length || rng() < 0.5;
      return { ...base, kind, isTrue, shown: isTrue ? base.answer : wrong[0] };
    }
    return { ...base, kind: 'written' };
  });

  const order: TestKind[] = ['tf', 'mc', 'written'];
  return questions.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

export interface GradedQuestion {
  q: TestQuestion;
  given: TestAnswer;
  ok: boolean;
  verdict?: Verdict;
  overridden: boolean;
}

export function gradeTest(
  questions: readonly TestQuestion[],
  answers: Record<string, TestAnswer>,
  overrides: ReadonlySet<string>,
): { graded: GradedQuestion[]; score: number } {
  const graded = questions.map((q): GradedQuestion => {
    const given = answers[q.id];
    if (q.kind === 'tf') return { q, given, ok: given === q.isTrue, overridden: false };
    if (q.kind === 'mc') return { q, given, ok: given === q.answer, overridden: false };
    const verdict = checkAnswer(typeof given === 'string' ? given : '', q.answer);
    const overridden = verdict.result !== 'correct' && overrides.has(q.id);
    return { q, given, verdict, ok: verdict.result === 'correct' || overridden, overridden };
  });
  return { graded, score: graded.filter((g) => g.ok).length };
}
