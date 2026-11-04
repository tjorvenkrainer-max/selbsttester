import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { APP_NAME } from './config';

// Uhrzeit, die sich jede Minute aktualisiert (damit „fällig“ ohne Neuladen stimmt)
let now = Date.now();
const nowListeners = new Set<() => void>();
setInterval(() => {
  now = Date.now();
  for (const l of nowListeners) l();
}, 60_000);

export function useNow(): number {
  return useSyncExternalStore(
    (cb) => {
      nowListeners.add(cb);
      return () => nowListeners.delete(cb);
    },
    () => now,
  );
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}

/** Tastenkürzel, solange `active` true ist. Ignoriert Eingaben in Textfeldern, außer allowInInputs. */
export function useKeys(handler: (e: KeyboardEvent) => void, active = true, allowInInputs = false) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing && !allowInInputs) return;
      ref.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, allowInInputs]);
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
