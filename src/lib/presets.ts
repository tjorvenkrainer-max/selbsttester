import type { StudySet } from './types';

// Fest eingebaute Sets: werden einmalig hinzugefügt (feste IDs, damit der Lernstand erhalten bleibt)
const FR_MEINUNG: [string, string][] = [
  ['Je suis d’accord avec toi.', 'Ich bin mit dir einverstanden.'],
  ['Tu as parfaitement raison.', 'Du hast völlig recht.'],
  ['Vous avez tort.', 'Sie haben unrecht.'],
  ['Vous vous trompez.', 'Sie irren sich.'],
  ['Si je ne me trompe pas', 'Wenn ich mich nicht täusche.'],
  ['Je suis convaincu que ...', 'Ich bin überzeugt, dass ...'],
  ['Tu exagères! / Vous exagérez!', 'Du übertreibst / Sie übertreiben...'],
  ['Qu’est-ce que vous en pensez?', 'Was denkt ihr darüber?'],
  ['Moi, je dirais que ...', 'Ich würde sagen, dass'],
  ['Quant à moi', 'Was mich betrifft'],
  ['actuellement/de nos jours/à présent', 'heutzutage'],
  ['autrefois', 'früher'],
  ['à l’époque', 'damals'],
  ['ces dernières années', 'in den letzten Jahren'],
  ['premièrement/d’abord', 'zunächst, zuerst'],
  ['deuxièmement/ensuite', 'weiters'],
  ['pour cette raison', 'aus diesem Grund'],
  ['donc, c’est pourquoi', 'daher, deshalb'],
  ['par conséquent', 'folglich'],
  ['certainement', 'sicherlich'],
  ['Je suis d’avis que', 'Ich bin der Meinung, dass'],
  ['En ce qui me concerne je pense que', 'Was mich betrifft, so denke ich, dass ...'],
  ['Ce qui me frappe, c’est le fait que', 'Was mir auffällt, ist (die Tatsache), dass...'],
  ['Ce que je trouve bon/mauvais est le fait que', 'Was ich gut/schlecht finde ist ...'],
  ['d’un côté/de l’autre côté', 'einerseits ... andererseits'],
  ['de plus, en outre', 'außerdem'],
  ['cependant, pourtant', 'jedoch'],
  ['finalement, enfin', 'schließlich'],
  ['Je veux souligner le fait que', 'Ich möchte betonen, dass'],
  ['pour conclure, en conclusion', 'zum Abschluss, abschliessend'],
];

const CREATED = Date.UTC(2026, 10, 4);

export const PRESET_SETS: StudySet[] = [
  {
    id: 'preset-fr-meinung',
    title: 'Französisch: Meinung & Argumentieren',
    description: 'Redemittel zum Diskutieren und Argumentieren.',
    color: 'violett',
    termLang: 'fr-FR',
    defLang: 'de-DE',
    cards: FR_MEINUNG.map(([term, definition], i) => ({ id: `preset-fr-meinung-${String(i + 1).padStart(2, '0')}`, term, definition })),
    createdAt: CREATED,
    updatedAt: CREATED,
  },
];
