export type SetColor = 'rot' | 'orange' | 'gelb' | 'gruen' | 'tuerkis' | 'blau' | 'violett' | 'grau';

export const SET_COLORS: { id: SetColor; label: string }[] = [
  { id: 'rot', label: 'Rot' },
  { id: 'orange', label: 'Orange' },
  { id: 'gelb', label: 'Gelb' },
  { id: 'gruen', label: 'Grün' },
  { id: 'tuerkis', label: 'Türkis' },
  { id: 'blau', label: 'Blau' },
  { id: 'violett', label: 'Violett' },
  { id: 'grau', label: 'Grau' },
];

export type Side = 'term' | 'definition';

export interface Card {
  id: string;
  term: string;
  definition: string;
}

export interface StudySet {
  id: string;
  title: string;
  description: string;
  color: SetColor;
  cards: Card[];
  createdAt: number;
  updatedAt: number;
}

/** 0 = neu/unsicher, 1 = Auswahl richtig, 2 = sitzt (liegt in einem Fach) */
export type Level = 0 | 1 | 2;

export interface CardProgress {
  level: Level;
  box: number; // Fach 0–5 (0 = noch in keinem Fach)
  due: number; // ab wann wieder fällig (ms)
  seen: number;
  correct: number;
  wrong: number;
  lastSeen: number;
}

export type QuestionTypes = 'both' | 'mc' | 'written';
export type AnswerWith = 'term' | 'definition' | 'mixed';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  theme: Theme;
  questionTypes: QuestionTypes;
  answerWith: AnswerWith;
  roundSize: number;
  cardFront: Side;
}

export interface AppData {
  version: 1;
  sets: StudySet[];
  progress: Record<string, CardProgress>; // Schlüssel = Karten-ID
  bestMatch: Record<string, number>; // Schlüssel = `${setId}:${paare}` → Bestzeit in ms
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  questionTypes: 'both',
  answerWith: 'term',
  roundSize: 7,
  cardFront: 'term',
};
