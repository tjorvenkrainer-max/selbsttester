// Ein kleiner globaler Store: Daten im Speicher, verzögert in localStorage geschrieben
import { useSyncExternalStore } from 'react';
import { STORAGE_KEY } from '../config';
import { defaultData, loadData, sanitize, saveData } from './storage';
import { PRESET_SETS } from './presets';
import { normalize } from './answer';
import { uid } from './random';
import type { AppData, CardProgress, SetColor, Settings, StudySet } from './types';

type Listener = () => void;
const listeners = new Set<Listener>();

let data: AppData;
let saveFailed = false;
let timer: ReturnType<typeof setTimeout> | undefined;

// muss vor dem Start-Block stehen, der sie schon benutzt
const DEMO_TITLE = 'Beispiel: Englisch – Schule';
const DEMO_DESC = 'Zum Ausprobieren. Bearbeiten oder löschen, wenn du es nicht mehr brauchst.';

{
  const loaded = loadData();
  data = loaded.data;
  const next = withPresets(removeOldDemo(data));
  if (loaded.fresh || next !== data) {
    data = next;
    saveData(data);
  }
}

// Früheres Beispiel-Set (Englisch) einmalig entfernen – nur wenn Titel und Beschreibung noch unverändert sind
export function removeOldDemo(d: AppData): AppData {
  if (d.seeded.includes('demo-entfernt')) return d;
  const demo = d.sets.filter((s) => s.title === DEMO_TITLE && s.description === DEMO_DESC);
  const progress = { ...d.progress };
  for (const s of demo) for (const c of s.cards) delete progress[c.id];
  return { ...d, sets: d.sets.filter((s) => !demo.includes(s)), progress, seeded: [...d.seeded, 'demo-entfernt'] };
}

/** Fügt eingebaute Sets hinzu, die noch nie da waren (gelöschte kommen nicht zurück) */
export function withPresets(d: AppData): AppData {
  // eingebaute Sets, die schon da sind, bekommen fehlende Sprachen nachgetragen
  let sets = d.sets;
  if (!d.seeded.includes('sprachen')) for (const p of PRESET_SETS) {
    const cur = sets.find((s) => s.id === p.id);
    if (cur && !cur.termLang && !cur.defLang) {
      sets = sets.map((s) => (s.id === p.id ? { ...s, termLang: p.termLang, defLang: p.defLang } : s));
    }
  }
  if (!d.seeded.includes('sprachen')) d = { ...d, sets, seeded: [...d.seeded, 'sprachen'] };
  const missing = PRESET_SETS.filter((p) => !d.seeded.includes(p.id));
  if (!missing.length) return d;
  const add = missing.filter((p) => !d.sets.some((s) => s.id === p.id));
  return { ...d, sets: [...add, ...d.sets], seeded: [...d.seeded, ...missing.map((p) => p.id)] };
}

function emit() {
  for (const l of listeners) l();
}

function persistNow() {
  timer = undefined;
  const ok = saveData(data);
  if (ok === saveFailed) {
    saveFailed = !ok;
    emit();
  }
}

function schedule() {
  if (timer !== undefined) clearTimeout(timer);
  timer = setTimeout(persistNow, 150);
}

export function flush() {
  if (timer !== undefined) {
    clearTimeout(timer);
    persistNow();
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  // anderer Tab hat gespeichert → übernehmen
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const next = sanitize(JSON.parse(e.newValue));
      if (next) {
        data = next;
        emit();
      }
    } catch {
      /* ignorieren */
    }
  });
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const getData = () => data;
export const useData = () => useSyncExternalStore(subscribe, getData);
export const useSaveFailed = () => useSyncExternalStore(subscribe, () => saveFailed);

function update(fn: (d: AppData) => AppData) {
  data = fn(data);
  emit();
  schedule();
}

// ---------- Aktionen ----------

export interface SetInput {
  id?: string;
  title: string;
  description: string;
  color: SetColor;
  termLang: string;
  defLang: string;
  cards: { id?: string; term: string; definition: string }[];
}

const samePair = (a: { term: string; definition: string }, b: { term: string; definition: string }) => {
  const [at, ad, bt, bd] = [a.term, a.definition, b.term, b.definition].map(normalize);
  return (at === bt && ad === bd) || (at === bd && ad === bt); // Tauschen behält den Lernstand
};

export function saveSet(input: SetInput): string {
  const id = input.id ?? uid();
  const now = Date.now();
  update((d) => {
    const existing = d.sets.find((s) => s.id === id);
    const cards = input.cards.map((c) => ({ id: c.id ?? uid(), term: c.term.trim(), definition: c.definition.trim() }));
    const progress = { ...d.progress };
    // geänderte oder gelöschte Karten verlieren ihren Lernstand
    for (const old of existing?.cards ?? []) {
      const cur = cards.find((c) => c.id === old.id);
      if (!cur || !samePair(cur, old)) delete progress[old.id];
    }
    const set: StudySet = {
      id,
      title: input.title.trim(),
      description: input.description.trim(),
      color: input.color,
      termLang: input.termLang,
      defLang: input.defLang,
      cards,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const sets = existing ? d.sets.map((s) => (s.id === id ? set : s)) : [set, ...d.sets];
    return { ...d, sets, progress };
  });
  return id;
}

export function deleteSet(id: string) {
  update((d) => {
    const set = d.sets.find((s) => s.id === id);
    const progress = { ...d.progress };
    for (const c of set?.cards ?? []) delete progress[c.id];
    const bestMatch = Object.fromEntries(Object.entries(d.bestMatch).filter(([k]) => !k.startsWith(`${id}:`)));
    return { ...d, sets: d.sets.filter((s) => s.id !== id), progress, bestMatch };
  });
}

export function resetSetProgress(id: string) {
  update((d) => {
    const set = d.sets.find((s) => s.id === id);
    const progress = { ...d.progress };
    for (const c of set?.cards ?? []) delete progress[c.id];
    return { ...d, progress };
  });
}

export function recordProgress(cardId: string, p: CardProgress) {
  update((d) => ({ ...d, progress: { ...d.progress, [cardId]: p } }));
}

export function updateSettings(patch: Partial<Settings>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
}

/** Speichert eine Zeit, wenn sie besser ist. Gibt true zurück bei neuem Rekord. */
export function submitMatchTime(key: string, ms: number): boolean {
  const best = data.bestMatch[key];
  if (best !== undefined && best <= ms) return false;
  update((d) => ({ ...d, bestMatch: { ...d.bestMatch, [key]: ms } }));
  return true;
}

export function replaceAll(next: AppData) {
  update(() => next);
}

export function clearAll() {
  update((d) => ({ ...defaultData(), seeded: d.seeded, settings: d.settings }));
}
