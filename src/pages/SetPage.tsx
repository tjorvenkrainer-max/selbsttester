import { useMemo, useState } from 'react';
import { ArrowLeft, Brain, Flame, ClipboardCheck, Download, Layers, Pencil, RotateCcw, Shapes, Trash2 } from 'lucide-react';
import { deleteSet, resetSetProgress, useData } from '../lib/store';
import { STATUS_LABEL, boxStats, cardStatus, hardCardIds, type CardStatus } from '../lib/srs';
import { downloadText, plural, relativeDay, slugify } from '../lib/format';
import { navigate } from '../router';
import { useNow, useTitle } from '../hooks';
import { Karteikasten } from '../components/Karteikasten';
import { NotFound } from '../components/common';
import { setColorStyle } from '../components/setColor';
import './SetPage.css';

type Filter = CardStatus | 'all';

export function SetPage({ id }: { id: string }) {
  const data = useData();
  const now = useNow();
  const set = data.sets.find((s) => s.id === id);
  useTitle(set?.title ?? 'Set');
  const [filter, setFilter] = useState<Filter>('all');
  const stats = useMemo(() => (set ? boxStats(set.cards, data.progress, now) : null), [set, data.progress, now]);

  if (!set || !stats) return <NotFound what="Set" />;

  const n = set.cards.length;
  const hard = hardCardIds(set.cards, data.progress).length;
  const rows = set.cards
    .map((c) => ({ card: c, status: cardStatus(data.progress[c.id], now), box: data.progress[c.id]?.box ?? 0 }))
    .filter((r) => filter === 'all' || r.status === filter);

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: 'Alle', count: n },
    { value: 'due', label: 'Fällig', count: stats.counts.due },
    { value: 'learning', label: 'Am Lernen', count: stats.counts.learning },
    { value: 'new', label: 'Neu', count: stats.counts.new },
    { value: 'known', label: 'Sitzt', count: stats.counts.known },
  ];

  let kastenNote: string;
  if (stats.counts.due) kastenNote = `${plural(stats.counts.due, 'Karte ist', 'Karten sind')} fällig – „Lernen“ nimmt sie zuerst dran.`;
  else if (stats.nextDue) kastenNote = `Nächste Wiederholung ${relativeDay(stats.nextDue, now)}.`;
  else kastenNote = 'Karten, die du im Lernmodus schaffst, kommen in Fach 1.';

  const base = `#/set/${set.id}`;
  const disabled = n === 0;

  return (
    <div className="wrap setpage" style={setColorStyle(set.color)}>
      <a className="backlink" href="#/">
        <ArrowLeft aria-hidden="true" /> Deine Sets
      </a>

      <header className="setpage__head">
        <div className="setpage__heading">
          <span className="setpage__tab" aria-hidden="true" />
          <h1 className="display setpage__title">{set.title}</h1>
          {set.description && <p className="setpage__desc">{set.description}</p>}
          <p className="setpage__meta">
            {plural(n, 'Karte', 'Karten')} · {stats.counts.known + stats.counts.due} im Kasten · {stats.stack} auf dem Stapel
          </p>
        </div>
        <a className="btn" href={`${base}/bearbeiten`}>
          <Pencil aria-hidden="true" /> Bearbeiten
        </a>
      </header>

      {disabled ? (
        <div className="panel setpage__empty">
          <p>Dieses Set hat noch keine Karten.</p>
          <a className="btn btn--ink" href={`${base}/bearbeiten`}>
            Karten hinzufügen
          </a>
        </div>
      ) : (
        <nav className="modes" aria-label="Lernmodi">
          <a className="mode mode--learn" href={`${base}/lernen`}>
            <Brain aria-hidden="true" />
            <span className="mode__name">Lernen</span>
            <span className="mode__desc">Erst auswählen, dann selbst schreiben. Was sitzt, wandert in den Kasten.</span>
          </a>
          <a className="mode" href={`${base}/karteikarten`}>
            <Layers aria-hidden="true" />
            <span className="mode__name">Karteikarten</span>
            <span className="mode__desc">Umdrehen, blättern, sortieren.</span>
          </a>
          <a className="mode" href={`${base}/test`}>
            <ClipboardCheck aria-hidden="true" />
            <span className="mode__name">Test</span>
            <span className="mode__desc">Gemischte Fragen, am Ende korrigiert.</span>
          </a>
          <a className="mode" href={`${base}/zuordnen`}>
            <Shapes aria-hidden="true" />
            <span className="mode__name">Zuordnen</span>
            <span className="mode__desc">Paare finden – auf Zeit.</span>
          </a>
        </nav>
      )}

      {!disabled && hard > 0 && (
        <a className="hardlink" href={`${base}/lernen/schwierig`}>
          <Flame aria-hidden="true" />
          <span>
            <strong>Schwierige üben</strong> – {plural(hard, 'Karte', 'Karten')}, die du schon mal falsch hattest
          </span>
        </a>
      )}

      {!disabled && (
        <section className="panel setpage__kasten" aria-labelledby="kasten-title">
          <div className="setpage__sectionhead">
            <h2 id="kasten-title" className="panel__title">
              Karteikasten
            </h2>
            <p className="muted">{kastenNote}</p>
          </div>
          <Karteikasten stats={stats} compact />
        </section>
      )}

      {!disabled && (
        <section className="panel" aria-labelledby="cards-title">
          <div className="setpage__sectionhead setpage__sectionhead--row">
            <h2 id="cards-title" className="panel__title">
              Karten
            </h2>
            <div className="filters" role="group" aria-label="Karten filtern">
              {filters.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className="filter"
                  aria-pressed={filter === f.value}
                  disabled={f.count === 0 && f.value !== 'all'}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label} <span className="mono">{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          <ul className="cardlist">
            {rows.map(({ card, status, box }) => (
              <li key={card.id} className="cardrow">
                <span className="cardrow__term">{card.term}</span>
                <span className="cardrow__def">{card.definition}</span>
                <span className={`chip chip--${status}`}>
                  {STATUS_LABEL[status]}
                  {(status === 'known' || status === 'due') && ` · Fach ${box}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="setpage__manage" aria-label="Set verwalten">
        <button
          type="button"
          className="btn btn--sm"
          disabled={disabled}
          onClick={() =>
            downloadText(`${slugify(set.title)}.txt`, set.cards.map((c) => `${c.term}\t${c.definition}`).join('\n'))
          }
        >
          <Download aria-hidden="true" /> Als Text exportieren
        </button>
        <button
          type="button"
          className="btn btn--sm"
          disabled={disabled}
          onClick={() => {
            if (confirm(`Lernstand von „${set.title}“ zurücksetzen? Alle Karten liegen dann wieder auf dem Stapel.`)) resetSetProgress(set.id);
          }}
        >
          <RotateCcw aria-hidden="true" /> Lernstand zurücksetzen
        </button>
        <button
          type="button"
          className="btn btn--sm btn--danger"
          onClick={() => {
            if (confirm(`„${set.title}“ mit ${plural(n, 'Karte', 'Karten')} löschen? Das lässt sich nicht rückgängig machen.`)) {
              deleteSet(set.id);
              navigate('/', true);
            }
          }}
        >
          <Trash2 aria-hidden="true" /> Set löschen
        </button>
      </section>
    </div>
  );
}
