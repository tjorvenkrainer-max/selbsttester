import { Plus, Settings } from 'lucide-react';
import { LogoMark, Wordmark } from './Logo';
import './Header.css';

export function Header({ current }: { current: 'library' | 'settings' | 'other' }) {
  return (
    <header className="topbar">
      <div className="wrap topbar__inner">
        <a className="wordmark" href="#/" aria-label="Tjorven lernt – zu deinen Sets" aria-current={current === 'library' ? 'page' : undefined}>
          <LogoMark />
          <Wordmark />
        </a>
        <nav className="topbar__nav" aria-label="Hauptmenü">
          <a className="btn btn--ghost btn--sm topbar__settings" href="#/einstellungen" aria-current={current === 'settings' ? 'page' : undefined}>
            <Settings aria-hidden="true" />
            <span className="topbar__label">Einstellungen</span>
          </a>
          <a className="btn btn--ink btn--sm" href="#/neu">
            <Plus aria-hidden="true" />
            Neues Set
          </a>
        </nav>
      </div>
    </header>
  );
}
