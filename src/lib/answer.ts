// Prüft geschriebene Antworten: tolerant bei Groß/klein, Leerzeichen, Satzzeichen am Rand,
// optionalem Klammerinhalt und Synonym-Listen. „Fast richtig“ bei Tippfehlern oder Akzenten.

export type Verdict = { result: 'correct' | 'almost' | 'wrong'; hint?: string };

const EDGE_PUNCT = /^[\s.,;:!?¡¿"'·…-]+|[\s.,;:!?"'·…-]+$/g;
const PART_SPLIT = /\s*;\s*|\s*\/\s*|,\s+/;

export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLocaleLowerCase('de')
    .replace(/[’‘‚`´]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/\s*([,;/])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .replace(EDGE_PUNCT, '')
    .trim();
}

/** Akzeptierte Schreibweisen: „(sich) erinnern“ → auch „sich erinnern“ und „erinnern“ */
export function variants(expected: string): string[] {
  const out = new Set<string>([normalize(expected)]);
  if (/[()[\]]/.test(expected)) {
    out.add(normalize(expected.replace(/[()[\]]/g, '')));
    out.add(normalize(expected.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')));
  }
  out.delete('');
  return [...out];
}

/** „groß, hoch“ oder „Wohnung; Apartment“ → einzelne Antworten (nur wenn es wie eine Liste aussieht) */
export function synonymParts(expected: string): string[] {
  const parts = expected.split(PART_SPLIT).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return [];
  const listLike = parts.every((p) => p.length >= 2 && p.split(/\s+/).length <= 4);
  return listLike ? parts : [];
}

/** Levenshtein mit Vertauschungen (OSA) */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

function isTypo(given: string, target: string): boolean {
  const len = Math.max(given.length, target.length);
  const max = len < 4 ? 0 : len < 8 ? 1 : 2;
  return max > 0 && Math.abs(given.length - target.length) <= max && editDistance(given, target) <= max;
}

const loose = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/g, 'ss');

// Hinweis, wenn nur die Groß-/Kleinschreibung abweicht (großer Anfangsbuchstabe vom Handy zählt nicht)
function caseHint(input: string, expected: string): string | undefined {
  const a = input.trim().replace(/\s+/g, ' ');
  const b = expected.trim().replace(/\s+/g, ' ');
  if (a === b || a.length !== b.length || a.toLocaleLowerCase('de') !== b.toLocaleLowerCase('de')) return undefined;
  const autoCap = a.slice(1) === b.slice(1) && a[0] !== b[0] && a[0] === a[0].toLocaleUpperCase('de');
  return autoCap ? undefined : `Achte auf Groß- und Kleinschreibung: ${expected}`;
}

export function checkAnswer(input: string, expected: string): Verdict {
  const given = normalize(input);
  if (!given) return { result: 'wrong' };

  const whole = variants(expected);
  if (whole.includes(given)) return { result: 'correct', hint: caseHint(input, expected) };

  const parts = synonymParts(expected);
  if (parts.length) {
    const accepted = new Set(parts.flatMap(variants));
    const givenParts = input.split(PART_SPLIT).map(normalize).filter(Boolean);
    if (givenParts.length && givenParts.every((p) => accepted.has(p))) {
      const complete = new Set(givenParts).size >= parts.length;
      return { result: 'correct', hint: complete ? undefined : `Vollständig: ${expected}` };
    }
  }

  const candidates = [...whole, ...parts.flatMap(variants)];
  if (candidates.some((c) => loose(c) === loose(given))) {
    return { result: 'almost', hint: 'Achte auf Umlaute, ß und Akzente.' };
  }
  if (candidates.some((c) => isTypo(given, c))) {
    return { result: 'almost', hint: 'Fast – nur ein kleiner Tippfehler?' };
  }
  return { result: 'wrong' };
}
