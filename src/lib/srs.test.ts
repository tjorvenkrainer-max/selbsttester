import { describe, expect, it } from 'vitest';
import { boxStats, cardStatus, dueAfter, emptyProgress, learningDaysBetween } from './srs';

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).getTime(); // November 2026, Ortszeit

describe('dueAfter', () => {
  it('legt Fälligkeit auf 4 Uhr früh des Ziel-Lerntags', () => {
    expect(dueAfter(at(4, 20), 1)).toBe(at(5, 4));
    expect(dueAfter(at(4, 20), 7)).toBe(at(11, 4));
  });

  it('zählt kurz nach Mitternacht noch zum Vortag', () => {
    expect(dueAfter(at(5, 2), 1)).toBe(at(5, 4));
  });
});

describe('learningDaysBetween', () => {
  it('rechnet in Lerntagen', () => {
    expect(learningDaysBetween(at(4, 20), at(5, 4))).toBe(1);
    expect(learningDaysBetween(at(4, 20), at(4, 23))).toBe(0);
  });
});

describe('cardStatus & boxStats', () => {
  const now = at(4, 12);
  const progress = {
    a: { ...emptyProgress(), seen: 1, level: 1 as const },
    b: { ...emptyProgress(), seen: 3, level: 2 as const, box: 1, due: at(4, 4) },
    c: { ...emptyProgress(), seen: 3, level: 2 as const, box: 3, due: at(9, 4) },
  };

  it('leitet den Status ab', () => {
    expect(cardStatus(undefined, now)).toBe('new');
    expect(cardStatus(progress.a, now)).toBe('learning');
    expect(cardStatus(progress.b, now)).toBe('due');
    expect(cardStatus(progress.c, now)).toBe('known');
  });

  it('zählt Stapel, Fächer und Fällige', () => {
    const s = boxStats([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], progress, now);
    expect(s.stack).toBe(2);
    expect(s.boxes).toEqual([0, 1, 0, 1, 0, 0]);
    expect(s.dueInBox[1]).toBe(1);
    expect(s.counts).toEqual({ new: 1, learning: 1, known: 1, due: 1 });
    expect(s.nextDue).toBe(at(9, 4));
  });
});
