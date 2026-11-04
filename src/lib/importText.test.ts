import { describe, expect, it } from 'vitest';
import { detectSeparators, parseImport } from './importText';

describe('Import', () => {
  it('liest Tab-getrennte Zeilen (typischer App-Export)', () => {
    const text = 'dog\tder Hund\r\ncat\tdie Katze\n\nbird\tder Vogel';
    expect(detectSeparators(text)).toEqual({ term: 'tab', card: 'newline' });
    expect(parseImport(text, 'tab', 'newline')).toEqual([
      { term: 'dog', definition: 'der Hund' },
      { term: 'cat', definition: 'die Katze' },
      { term: 'bird', definition: 'der Vogel' },
    ]);
  });

  it('erkennt Bindestriche inklusive Gedankenstrich und trennt nur am ersten', () => {
    const text = 'to go – gehen\nwell-known - bekannt - berühmt';
    expect(detectSeparators(text).term).toBe('dash');
    expect(parseImport(text, 'dash', 'newline')).toEqual([
      { term: 'to go', definition: 'gehen' },
      { term: 'well-known', definition: 'bekannt - berühmt' },
    ]);
  });

  it('unterstützt eigene Trennzeichen und Leerzeilen', () => {
    expect(parseImport('a|1##b|2', 'custom', 'custom', { term: '|', card: '##' })).toEqual([
      { term: 'a', definition: '1' },
      { term: 'b', definition: '2' },
    ]);
    expect(parseImport('Zelle: kleinste Einheit\ndes Lebens\n\nAtom: Baustein', 'colon', 'blankline')).toEqual([
      { term: 'Zelle', definition: 'kleinste Einheit\ndes Lebens' },
      { term: 'Atom', definition: 'Baustein' },
    ]);
  });

  it('entfernt HTML aus Anki-Exporten', () => {
    expect(parseImport('<b>dog</b>\tder&nbsp;Hund<br>', 'tab', 'newline')).toEqual([{ term: 'dog', definition: 'der Hund' }]);
  });
});
