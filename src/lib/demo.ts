import type { StudySet } from './types';
import { uid } from './random';

// Beispiel-Set beim allerersten Start – zeigt optionale Klammern und Synonyme
const CARDS: [string, string][] = [
  ['(the) timetable', 'der Stundenplan'],
  ['homework', 'die Hausaufgabe(n)'],
  ['to explain', 'erklären'],
  ['(the) break', 'die Pause'],
  ['(the) grade', 'die Note'],
  ['to improve', '(sich) verbessern'],
  ['(the) exam', 'die Prüfung'],
  ['to remember', 'sich erinnern, sich merken'],
  ['(the) subject', 'das (Schul)fach'],
  ['to be late', 'zu spät kommen'],
  ['(the) pencil case', 'das Federpennal'],
  ['to borrow', '(sich) ausleihen'],
];

export function demoSet(now = Date.now()): StudySet {
  return {
    id: uid(),
    title: 'Beispiel: Englisch – Schule',
    description: 'Zum Ausprobieren. Bearbeiten oder löschen, wenn du es nicht mehr brauchst.',
    color: 'blau',
    cards: CARDS.map(([term, definition]) => ({ id: uid(), term, definition })),
    createdAt: now,
    updatedAt: now,
  };
}
