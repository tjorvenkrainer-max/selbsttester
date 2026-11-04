import { describe, expect, it } from 'vitest';
import { parseHash } from './router';

describe('parseHash', () => {
  it('erkennt die Lern-Varianten', () => {
    expect(parseHash('#/set/x/lernen')).toEqual({ name: 'learn', id: 'x', practice: false });
    expect(parseHash('#/set/x/lernen/alles')).toEqual({ name: 'learn', id: 'x', practice: true });
    expect(parseHash('#/set/x/lernen/schwierig')).toEqual({ name: 'learn', id: 'x', practice: true, only: 'hard' });
    expect(parseHash('#/set/x/lernen/auswahl?k=a,b')).toEqual({ name: 'learn', id: 'x', practice: true, only: ['a', 'b'] });
  });
});
