import { useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { useData } from '../lib/store';
import { boxStats } from '../lib/srs';
import { formatLongDate, plural, relativeDay } from '../lib/format';
import { useNow, useTitle } from '../hooks';
import { OWNER_NAME } from '../config';
import { Karteikasten } from '../components/Karteikasten';
import { StatusBar } from '../components/common';
import { setColorStyle } from '../components/setColor';
import type { StudySet } from '../lib/types';
import './Library.css';

export function Library() {
  useTitle('');
  const data = useData();
  const now = useNow();
  const [query, setQuery] = useState('');

  const perSet = useMemo(
    () => new Map(data.sets.map((s) => [s.id, boxStats(s.cards, data.progress, now)])),
    [data.sets, data.progress, now],
  );
  const total = useMemo(() => boxStats(data.sets.flatMap((s) => s.cards), data.progress, now), [data.sets, data.progress, now]);
  const due = total.counts.due;
  const dueSets = data.sets.filter((s) => (perSet.get(s.id)?.counts.due ?? 0) > 0).length;

  // fällige zuerst, dann zuletzt bearbeitete
  const sets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.sets
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
      .sort((a, b) => (perSet.get(b.id)?.counts.due ?? 0) - (perSet.get(a.id)?.counts.due ?? 0) || b.updatedAt - a.updatedAt);
  }, [data.sets, perSet, query]);

  // nichts fällig, aber Karten auf dem Stapel → zuletzt bearbeitetes Set mit offenen Karten vorschlagen
  const continueSet =
    due === 0
      ? [...data.sets].sort((a, b) => b.updatedAt - a.updatedAt).find((s) => (perSet.get(s.id)?.stack ?? 0) > 0)
      : undefined;

  let sub: string;
  if (due > 0) sub = `aus ${plural(dueSets, 'Set', 'Sets')}. Wiederholen – dann rücken sie ein Fach weiter.`;
  else if (total.total === 0) sub = 'Leg dein erstes Set an. Jede Karte, die sitzt, wandert in den Karteikasten.';
  else if (total.nextDue) sub = `Nächste Wiederholung ${relativeDay(total.nextDue, now)}.${total.stack ? ` ${plural(total.stack, 'Karte liegt', 'Karten liegen')} noch auf dem Stapel.` : ''}`;
  else sub = `${plural(total.stack, 'Karte liegt', 'Karten liegen')} auf dem Stapel. Lern sie in einem Set – dann kommen sie in Fach 1.`;

  return (
    <div className="wrap library">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__text">
          <p className="eyebrow">{formatLongDate(now)}</p>
          <h1 id="hero-title" className="display hero__title">
            {due > 0 ? (
              <>
                Heute <span className="marker">{plural(due, 'Karte', 'Karten')}</span> fällig
              </>
            ) : total.total === 0 ? (
              <>Servus, {OWNER_NAME}!</>
            ) : (
              <>Heute ist nichts fällig</>
            )}
          </h1>
          <p className="hero__sub">{sub}</p>
          {due > 0 && (
            <a className="btn btn--marker btn--lg hero__cta" href="#/wiederholen">
              Fällige wiederholen
            </a>
          )}
          {continueSet && (
            <a className="btn btn--marker btn--lg hero__cta" href={`#/set/${continueSet.id}/lernen`}>
              Weiterlernen: {continueSet.title}
            </a>
          )}
        </div>
        <div className="hero__kasten">
          <Karteikasten stats={total} />
        </div>
      </section>

      <section className="sets" aria-labelledby="sets-title">
        <div className="sets__head">
          <h2 id="sets-title" className="sets__title">
            Deine Sets <span className="sets__count mono">{data.sets.length}</span>
          </h2>
          {data.sets.length > 4 && (
            <label className="sets__search">
              <Search aria-hidden="true" />
              <span className="visually-hidden">Sets durchsuchen</span>
              <input className="input" type="search" placeholder="Sets durchsuchen" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          )}
        </div>

        {data.sets.length === 0 ? (
          <div className="empty panel">
            <p className="empty__text">Noch keine Sets. Leg eins an oder füg eine Liste aus einem anderen Programm ein.</p>
            <div className="empty__actions">
              <a className="btn btn--ink" href="#/neu">
                <Plus aria-hidden="true" /> Neues Set
              </a>
              <a className="btn" href="#/neu?import">
                <FileText aria-hidden="true" /> Text importieren
              </a>
            </div>
          </div>
        ) : sets.length === 0 ? (
          <p className="muted">Kein Set passt zu „{query}“.</p>
        ) : (
          <ul className="setgrid">
            {sets.map((s) => (
              <SetTile key={s.id} set={s} stats={perSet.get(s.id)!} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SetTile({ set, stats }: { set: StudySet; stats: ReturnType<typeof boxStats> }) {
  const { counts } = stats;
  return (
    <li>
      <a className="settile" href={`#/set/${set.id}`} style={setColorStyle(set.color)}>
        <span className="settile__tab" aria-hidden="true" />
        <span className="settile__title">{set.title}</span>
        <span className="settile__meta">
          {plural(stats.total, 'Karte', 'Karten')}
          {counts.due > 0 && <span className="chip chip--due">{counts.due} fällig</span>}
        </span>
        <StatusBar counts={counts} />
        <span className="settile__legend">
          {counts.known + counts.due} im Kasten · {counts.learning} am Lernen · {counts.new} neu
        </span>
      </a>
    </li>
  );
}
