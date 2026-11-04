// Sprachen pro Set-Seite: fürs Vorlesen und für die Akzent-Tasten
export const LANGS: { id: string; label: string }[] = [
  { id: '', label: 'Keine' },
  { id: 'de-DE', label: 'Deutsch' },
  { id: 'en-GB', label: 'Englisch' },
  { id: 'fr-FR', label: 'Französisch' },
  { id: 'es-ES', label: 'Spanisch' },
  { id: 'it-IT', label: 'Italienisch' },
  { id: 'la', label: 'Latein' },
];

const ACCENTS: Record<string, string[]> = {
  fr: ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'î', 'ï', 'ô', 'û', 'ù', 'œ'],
  es: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'],
  it: ['à', 'è', 'é', 'ì', 'ò', 'ù'],
  de: ['ä', 'ö', 'ü', 'ß'],
};

export const accentsFor = (lang: string): string[] => ACCENTS[lang.slice(0, 2)] ?? [];

export const isLang = (x: unknown): x is string => typeof x === 'string' && LANGS.some((l) => l.id === x);
