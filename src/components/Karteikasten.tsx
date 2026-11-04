// Signatur der App: Stapel + 5 Fächer. Jede Karte ein Streifen, fällige gelb markiert.
import type { CSSProperties } from 'react';
import { BOX_LABELS, type BoxStats } from '../lib/srs';
import './Karteikasten.css';

const MAX_SLIVERS = 16;

interface Props {
  stats: BoxStats;
  compact?: boolean;
}

export function Karteikasten({ stats, compact = false }: Props) {
  const biggest = Math.max(1, stats.stack, ...stats.boxes.slice(1));
  const scale = biggest > MAX_SLIVERS ? MAX_SLIVERS / biggest : 1;
  const slivers = (n: number) => (n === 0 ? 0 : Math.max(1, Math.round(n * scale)));

  const label =
    `Karteikasten: ${stats.stack} auf dem Stapel` +
    [1, 2, 3, 4, 5]
      .map((b) => `, Fach ${b}: ${stats.boxes[b]}${stats.dueInBox[b] ? ` (davon ${stats.dueInBox[b]} fällig)` : ''}`)
      .join('');

  const anyDue = stats.dueInBox.some((n) => n > 0);

  return (
    <figure className={`kasten${compact ? ' kasten--compact' : ''}${anyDue ? ' has-due' : ''}`} role="img" aria-label={label}>
      <div className="kasten__stack">
        <Pile count={stats.stack} slivers={slivers(stats.stack)} due={0} loose />
        <div className="kasten__base kasten__base--stack">Stapel</div>
        <div className="kasten__hint">neu &amp; am Lernen</div>
      </div>
      <div className="kasten__box">
        <div className="kasten__slots">
          {[1, 2, 3, 4, 5].map((b) => {
            const n = slivers(stats.boxes[b]);
            const due = stats.dueInBox[b] ? Math.max(1, Math.round((n * stats.dueInBox[b]) / stats.boxes[b])) : 0;
            return <Pile key={b} count={stats.boxes[b]} slivers={n} due={due} dueCount={stats.dueInBox[b]} />;
          })}
        </div>
        <div className="kasten__base kasten__front">
          {[1, 2, 3, 4, 5].map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>
        <div className="kasten__labels">
          {[1, 2, 3, 4, 5].map((b) => (
            <span key={b}>{BOX_LABELS[b]}</span>
          ))}
        </div>
      </div>
      {anyDue && (
        <p className="kasten__legend">
          <i aria-hidden="true" /> gelb = heute fällig
        </p>
      )}
    </figure>
  );
}

function Pile({ count, slivers, due, dueCount = 0, loose = false }: { count: number; slivers: number; due: number; dueCount?: number; loose?: boolean }) {
  return (
    <div className={`kasten__col${count === 0 ? ' is-empty' : ''}`}>
      <span className="kasten__count mono">
        {count}
        {dueCount > 0 && (
          <span className="kasten__due">
            {dueCount}
            <span className="kasten__duelabel"> fällig</span>
          </span>
        )}
      </span>
      <div className="kasten__pile">
        {Array.from({ length: slivers }, (_, i) => (
          <i
            key={i}
            className={i >= slivers - due ? 'is-due' : undefined}
            style={loose ? ({ '--tilt': `${((i * 37) % 7) - 3}deg`, '--shift': `${((i * 53) % 9) - 4}px` } as CSSProperties) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
