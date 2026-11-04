import { describe, expect, it } from 'vitest';
import { checkAnswer, editDistance, normalize, synonymParts } from './answer';

describe('normalize', () => {
  it('ignoriert Groß/klein, Leerzeichen und Satzzeichen am Rand', () => {
    expect(normalize('  Der   Hund. ')).toBe('der hund');
    expect(normalize('How are you?')).toBe('how are you');
    expect(normalize('groß,hoch')).toBe('groß, hoch');
  });
});

describe('checkAnswer', () => {
  it('erkennt exakte Antworten', () => {
    expect(checkAnswer('Haus', 'Haus').result).toBe('correct');
    expect(checkAnswer('', 'Haus').result).toBe('wrong');
    expect(checkAnswer('Katze', 'Hund').result).toBe('wrong');
  });

  it('Großbuchstabe am Anfang (Handy) zählt, kleines Hauptwort gibt Hinweis', () => {
    expect(checkAnswer('Erklären', 'erklären')).toEqual({ result: 'correct', hint: undefined });
    const v = checkAnswer('haus', 'Haus');
    expect(v.result).toBe('correct');
    expect(v.hint).toMatch(/Groß- und Kleinschreibung/);
  });

  it('Klammerinhalt ist optional', () => {
    expect(checkAnswer('timetable', '(the) timetable').result).toBe('correct');
    expect(checkAnswer('the timetable', '(the) timetable').result).toBe('correct');
    expect(checkAnswer('die Hausaufgaben', 'die Hausaufgabe(n)').result).toBe('correct');
    expect(checkAnswer('die Hausaufgabe', 'die Hausaufgabe(n)').result).toBe('correct');
  });

  it('akzeptiert einzelne Synonyme mit Hinweis auf die volle Antwort', () => {
    const one = checkAnswer('sich merken', 'sich erinnern, sich merken');
    expect(one.result).toBe('correct');
    expect(one.hint).toBe('Vollständig: sich erinnern, sich merken');
    expect(checkAnswer('sich merken, sich erinnern', 'sich erinnern, sich merken')).toEqual({ result: 'correct', hint: undefined });
  });

  it('zerlegt keine Einheiten oder Dezimalzahlen', () => {
    expect(synonymParts('km/h')).toEqual([]);
    expect(checkAnswer('h', 'km/h').result).toBe('wrong');
    expect(checkAnswer('5', '1,5').result).toBe('wrong');
  });

  it('meldet „fast richtig“ bei Akzenten, ß und Tippfehlern', () => {
    expect(checkAnswer('Strasse', 'Straße').result).toBe('almost');
    expect(checkAnswer('cafe', 'café').result).toBe('almost');
    expect(checkAnswer('Hasu', 'Haus').result).toBe('almost');
    expect(checkAnswer('erklaeren', 'erklären').result).toBe('almost');
    expect(checkAnswer('Hut', 'Hund').result).toBe('wrong'); // zu kurz für Toleranz
  });
});

describe('editDistance', () => {
  it('zählt Vertauschungen als einen Fehler', () => {
    expect(editDistance('haus', 'hasu')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});
