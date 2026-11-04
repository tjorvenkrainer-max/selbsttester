import { describe, expect, it } from 'vitest';
import { PRESET_SETS } from './presets';
import { checkAnswer } from './answer';

const set = PRESET_SETS[0];

describe('Eingebautes Französisch-Set', () => {
  it('hat alle 30 Karten mit eindeutigen IDs', () => {
    expect(set.cards).toHaveLength(30);
    expect(new Set(set.cards.map((c) => c.id)).size).toBe(30);
    expect(set.cards.every((c) => c.term && c.definition)).toBe(true);
  });

  it('akzeptiert normale Apostrophe, fehlende Satzzeichen und eine der Varianten', () => {
    expect(checkAnswer("je suis d'accord avec toi", 'Je suis d’accord avec toi.').result).toBe('correct');
    expect(checkAnswer('Je suis convaincu que', 'Je suis convaincu que ...').result).toBe('correct');
    expect(checkAnswer('de nos jours', 'actuellement/de nos jours/à présent').result).toBe('correct');
    expect(checkAnswer('Vous exagérez!', 'Tu exagères! / Vous exagérez!').result).toBe('correct');
    expect(checkAnswer('par consequent', 'par conséquent').result).toBe('almost'); // Akzent fehlt
  });
});
