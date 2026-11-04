import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import './FocusBar.css';

// Schlanke Kopfzeile für Lernmodi: Beenden, Modus + Set, optionale Aktionen
export function FocusBar({
  back,
  mode,
  title,
  actions,
  children,
}: {
  back: string;
  mode: string;
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="focusbar">
      <div className="focusbar__inner">
        <a className="btn btn--ghost btn--icon" href={back} aria-label={`${mode} beenden`}>
          <X aria-hidden="true" />
        </a>
        <div className="focusbar__title">
          <span className="focusbar__mode">{mode}</span>
          <span className="focusbar__set">{title}</span>
        </div>
        <div className="focusbar__actions">{actions}</div>
      </div>
      {children}
    </header>
  );
}
