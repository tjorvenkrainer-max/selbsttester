// Eingefügten Text in Karten zerlegen (z. B. Export aus Quizlet oder Anki: Begriff<Tab>Definition pro Zeile)

export type TermSep = 'tab' | 'dash' | 'equals' | 'colon' | 'semicolon' | 'comma' | 'custom';
export type CardSep = 'newline' | 'blankline' | 'semicolon' | 'custom';

export const TERM_SEPS: { id: TermSep; label: string }[] = [
  { id: 'tab', label: 'Tab' },
  { id: 'dash', label: 'Bindestrich ( - )' },
  { id: 'equals', label: 'Gleichheitszeichen ( = )' },
  { id: 'colon', label: 'Doppelpunkt ( : )' },
  { id: 'semicolon', label: 'Strichpunkt ( ; )' },
  { id: 'comma', label: 'Komma ( , )' },
  { id: 'custom', label: 'Eigenes Zeichen' },
];

export const CARD_SEPS: { id: CardSep; label: string }[] = [
  { id: 'newline', label: 'Neue Zeile' },
  { id: 'blankline', label: 'Leerzeile' },
  { id: 'semicolon', label: 'Strichpunkt ( ; )' },
  { id: 'custom', label: 'Eigenes Zeichen' },
];

export interface ImportedCard {
  term: string;
  definition: string;
}

const ENTITIES: Record<string, string> = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

function stripHtml(text: string): string {
  if (!/<[a-z/][^>]*>/i.test(text)) return text;
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}

function splitCards(text: string, sep: CardSep, custom: string): string[] {
  switch (sep) {
    case 'newline':
      return text.split('\n');
    case 'blankline':
      return text.split(/\n\s*\n/);
    case 'semicolon':
      return text.split(';');
    case 'custom':
      return custom ? text.split(custom) : [text];
  }
}

function findSep(chunk: string, sep: TermSep, custom: string): { index: number; length: number } | null {
  const literal = (token: string) => {
    const index = token ? chunk.indexOf(token) : -1;
    return index >= 0 ? { index, length: token.length } : null;
  };
  switch (sep) {
    case 'tab':
      return literal('\t');
    case 'dash': {
      const m = /\s+[-–—]\s+/.exec(chunk);
      return m ? { index: m.index, length: m[0].length } : null;
    }
    case 'equals':
      return literal('=');
    case 'colon':
      return literal(':');
    case 'semicolon':
      return literal(';');
    case 'comma':
      return literal(',');
    case 'custom':
      return literal(custom);
  }
}

export function parseImport(
  text: string,
  termSep: TermSep,
  cardSep: CardSep,
  custom: { term: string; card: string } = { term: '', card: '' },
): ImportedCard[] {
  const clean = stripHtml(text).replace(/\r\n?/g, '\n');
  const out: ImportedCard[] = [];
  for (const chunk of splitCards(clean, cardSep, custom.card)) {
    if (!chunk.trim()) continue;
    const m = findSep(chunk, termSep, custom.term);
    const term = (m ? chunk.slice(0, m.index) : chunk).trim();
    const definition = (m ? chunk.slice(m.index + m.length) : '').trim();
    if (term || definition) out.push({ term, definition });
  }
  return out;
}

/** Trennzeichen raten: Tab vor Bindestrich vor = vor : vor ; vor , */
export function detectSeparators(text: string): { term: TermSep; card: CardSep } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim());
  if (!lines.length) return { term: 'tab', card: 'newline' };
  const share = (re: RegExp) => lines.filter((l) => re.test(l)).length / lines.length;
  if (share(/\t/) >= 0.5) return { term: 'tab', card: 'newline' };
  const candidates: [TermSep, RegExp][] = [
    ['dash', /\s[-–—]\s/],
    ['equals', /=/],
    ['colon', /:/],
    ['semicolon', /;/],
    ['comma', /,/],
  ];
  for (const [id, re] of candidates) if (share(re) >= 0.6) return { term: id, card: 'newline' };
  return { term: 'tab', card: 'newline' };
}
