// Hash-Router: #/set/abc/lernen – braucht keine Server-Konfiguration
import { useMemo, useSyncExternalStore } from 'react';

export type Route =
  | { name: 'library' }
  | { name: 'new'; openImport: boolean }
  | { name: 'set'; id: string }
  | { name: 'edit'; id: string }
  | { name: 'learn'; id: string; practice: boolean }
  | { name: 'review' }
  | { name: 'cards'; id: string }
  | { name: 'test'; id: string }
  | { name: 'match'; id: string }
  | { name: 'settings' }
  | { name: 'notfound' };

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'library' };
  if (parts[0] === 'neu' && parts.length === 1) return { name: 'new', openImport: query.includes('import') };
  if (parts[0] === 'einstellungen' && parts.length === 1) return { name: 'settings' };
  if (parts[0] === 'wiederholen' && parts.length === 1) return { name: 'review' };
  if (parts[0] === 'set' && parts[1]) {
    const id = parts[1];
    switch (parts[2]) {
      case undefined:
        return { name: 'set', id };
      case 'bearbeiten':
        return { name: 'edit', id };
      case 'lernen':
        return { name: 'learn', id, practice: parts[3] === 'alles' };
      case 'karteikarten':
        return { name: 'cards', id };
      case 'test':
        return { name: 'test', id };
      case 'zuordnen':
        return { name: 'match', id };
    }
  }
  return { name: 'notfound' };
}

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): { route: Route; hash: string } {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const route = useMemo(() => parseHash(hash), [hash]);
  return { route, hash };
}

export const href = (path: string) => `#${path}`;

export function navigate(path: string, replace = false) {
  if (replace) {
    history.replaceState(null, '', href(path));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = path;
  }
}
