import { describe, expect, it } from 'vitest';
import { buildTest, gradeTest } from './testMode';
import { seeded } from './random';

const cards = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, term: `term ${i}`, definition: `def ${i}` }));

describe('Test', () => {
  it('erzeugt die gewünschte Anzahl, sortiert nach Fragetyp', () => {
    const qs = buildTest(cards, { count: 6, kinds: ['tf', 'mc', 'written'], answerWith: 'term' }, seeded(1));
    expect(qs).toHaveLength(6);
    expect(qs.map((q) => q.kind)).toEqual(['tf', 'tf', 'mc', 'mc', 'written', 'written']);
    for (const q of qs) expect(q.answer).toMatch(/^term /);
    const tf = qs[0];
    expect(tf.shown === tf.answer).toBe(tf.isTrue);
  });

  it('wertet aus und erlaubt „doch richtig“ beim Schreiben', () => {
    const qs = buildTest(cards, { count: 3, kinds: ['written'], answerWith: 'definition' }, seeded(2));
    const answers = { [qs[0].id]: qs[0].answer, [qs[1].id]: 'falsch', [qs[2].id]: undefined };
    expect(gradeTest(qs, answers, new Set()).score).toBe(1);
    const withOverride = gradeTest(qs, answers, new Set([qs[1].id]));
    expect(withOverride.score).toBe(2);
    expect(withOverride.graded[1].overridden).toBe(true);
  });
});
