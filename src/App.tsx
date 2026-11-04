import { useEffect, useRef, type ReactNode } from 'react';
import { useRoute } from './router';
import { useData, useSaveFailed } from './lib/store';
import { Header } from './components/Header';
import { NotFound } from './components/common';
import { Library } from './pages/Library';
import { SetPage } from './pages/SetPage';
import { SetEditor } from './pages/SetEditor';
import { Learn } from './pages/Learn';
import { Flashcards } from './pages/Flashcards';
import { TestMode } from './pages/TestMode';
import { Match } from './pages/Match';
import { SettingsPage } from './pages/SettingsPage';

const FOCUS_ROUTES = new Set(['learn', 'review', 'cards', 'test', 'match']);

export default function App() {
  const { route, hash } = useRoute();
  const theme = useData().settings.theme;
  const saveFailed = useSaveFailed();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Farbschema anwenden
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);

  // Seitenwechsel: nach oben, Fokus auf den Inhalt (außer die Seite hat selbst etwas fokussiert)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const active = document.activeElement;
    if (!active || active === document.body) mainRef.current?.focus({ preventScroll: true });
  }, [hash]);

  let page: ReactNode;
  switch (route.name) {
    case 'library':
      page = <Library />;
      break;
    case 'new':
      page = <SetEditor openImport={route.openImport} />;
      break;
    case 'set':
      page = <SetPage id={route.id} />;
      break;
    case 'edit':
      page = <SetEditor id={route.id} />;
      break;
    case 'learn':
      page = <Learn setId={route.id} scope={route.practice ? 'practice' : 'set'} />;
      break;
    case 'review':
      page = <Learn scope="due" />;
      break;
    case 'cards':
      page = <Flashcards id={route.id} />;
      break;
    case 'test':
      page = <TestMode id={route.id} />;
      break;
    case 'match':
      page = <Match id={route.id} />;
      break;
    case 'settings':
      page = <SettingsPage />;
      break;
    default:
      page = <NotFound />;
  }

  const focusMode = FOCUS_ROUTES.has(route.name);

  return (
    <>
      <button type="button" className="btn btn--ink skiplink" onClick={() => mainRef.current?.focus()}>
        Zum Inhalt springen
      </button>
      {!focusMode && <Header current={route.name === 'library' ? 'library' : route.name === 'settings' ? 'settings' : 'other'} />}
      <main id="main" ref={mainRef} tabIndex={-1} key={hash}>
        {page}
      </main>
      {saveFailed && (
        <div className="banner" role="alert">
          Speichern hat nicht geklappt – der Browser-Speicher ist voll oder gesperrt. Lad in den Einstellungen ein Backup herunter, bevor du die Seite
          schließt.
        </div>
      )}
    </>
  );
}
