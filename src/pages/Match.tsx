import { useEffect, useMemo, useState } from 'react';
import { Timer, Trophy } from 'lucide-react';
import { submitMatchTime, useData } from '../lib/store';
import { normalize } from '../lib/answer';
import { shuffle } from '../lib/random';
import { formatTime } from '../lib/format';
import type { Card, Side, StudySet } from '../lib/types';
import { useTitle } from '../hooks';
import { playCorrect, playWrong } from '../lib/sound';
import { FocusBar } from '../components/FocusBar';
import { NotFound } from '../components/common';
import './Match.css';

const MAX_PAIRS = 6;
const PENALTY_MS = 1000;

interface Tile {
  id: string;
  cardId: string;
  side: Side;
  text: string;
}

export function Match({ id }: { id: string }) {
  const data = useData();
  const set = data.sets.find((s) => s.id === id);
  if (!set) return <NotFound what="Set" />;
  return <MatchGame set={set} best={data.bestMatch} />;
}

// Karten ohne doppelte Begriffe/Definitionen wählen, sonst wäre die Zuordnung mehrdeutig
function pickCards(cards: Card[], n: number): Card[] {
  const terms = new Set<string>();
  const defs = new Set<string>();
  const out: Card[] = [];
  for (const c of shuffle(cards)) {
    const t = normalize(c.term);
    const d = normalize(c.definition);
    if (terms.has(t) || defs.has(d)) continue;
    terms.add(t);
    defs.add(d);
    out.push(c);
    if (out.length === n) break;
  }
  return out;
}

const tileSize = (t: string) => (t.length > 80 ? 'is-xs' : t.length > 40 ? 'is-s' : t.length > 13 ? 'is-m' : '');

function MatchGame({ set, best }: { set: StudySet; best: Record<string, number> }) {
  useTitle(`Zuordnen – ${set.title}`);
  const cards = useMemo(() => set.cards.filter((c) => c.term.trim() && c.definition.trim()), [set.cards]);
  const pairs = Math.min(MAX_PAIRS, cards.length);
  const bestKey = `${set.id}:${pairs}`;
  const bestTime = best[bestKey];

  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [penalty, setPenalty] = useState(0);
  const [startAt, setStartAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<{ ms: number; record: boolean; previous?: number } | null>(null);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    if (phase !== 'play') return;
    const t = setInterval(() => setElapsed(performance.now() - startAt), 100);
    return () => clearInterval(t);
  }, [phase, startAt]);

  useEffect(() => {
    if (!wrong.length) return;
    const t = setTimeout(() => setWrong([]), 500);
    return () => clearTimeout(t);
  }, [wrong]);

  const start = () => {
    const picked = pickCards(cards, pairs);
    setTiles(
      shuffle(
        picked.flatMap((c) => [
          { id: `${c.id}:t`, cardId: c.id, side: 'term' as const, text: c.term },
          { id: `${c.id}:d`, cardId: c.id, side: 'definition' as const, text: c.definition },
        ]),
      ),
    );
    setSelected(null);
    setMatched(new Set());
    setWrong([]);
    setPenalty(0);
    setElapsed(0);
    setResult(null);
    setAnnounce('');
    setStartAt(performance.now());
    setPhase('play');
  };

  const pick = (tile: Tile) => {
    if (matched.has(tile.cardId)) return;
    if (!selected) return setSelected(tile.id);
    if (selected === tile.id) return setSelected(null);
    const first = tiles.find((t) => t.id === selected);
    if (first && first.side === tile.side) return setSelected(tile.id); // gleiche Seite = umentschieden, keine Strafe
    setSelected(null);
    if (!first) return;
    if (first.cardId === tile.cardId) {
      const next = new Set(matched).add(tile.cardId);
      setMatched(next);
      setAnnounce(`Passt: ${first.text} – ${tile.text}`);
      playCorrect();
      if (next.size === tiles.length / 2) {
        const ms = performance.now() - startAt + penalty;
        const record = submitMatchTime(bestKey, ms);
        setResult({ ms, record, previous: bestTime });
        setPhase('done');
      }
    } else {
      setWrong([first.id, tile.id]);
      setPenalty((p) => p + PENALTY_MS);
      setAnnounce('Passt nicht – plus eine Sekunde.');
      playWrong();
    }
  };

  const back = `#/set/${set.id}`;

  return (
    <div>
      <FocusBar
        back={back}
        mode="Zuordnen"
        title={set.title}
        actions={
          phase === 'play' ? (
            <span className="match__timer mono" aria-label="Zeit">
              <Timer aria-hidden="true" />
              {formatTime(elapsed + penalty)}
            </span>
          ) : undefined
        }
      />
      <div className="match">
        {cards.length < 2 && (
          <div className="match__intro">
            <p>Zum Zuordnen brauchst du mindestens 2 vollständige Karten.</p>
            <a className="btn btn--ink" href={`${back}/bearbeiten`}>
              Karten hinzufügen
            </a>
          </div>
        )}

        {cards.length >= 2 && phase === 'intro' && (
          <section className="match__intro" aria-labelledby="match-title">
            <h1 id="match-title" className="display match__title">
              Zuordnen
            </h1>
            <p className="match__text">
              Tippe einen Begriff und dann die passende Definition – oder umgekehrt. {pairs} Paare, jeder Fehler kostet eine Sekunde.
            </p>
            {bestTime !== undefined && (
              <p className="match__best">
                <Trophy aria-hidden="true" /> Bestzeit: <span className="mono">{formatTime(bestTime)}</span>
              </p>
            )}
            <button type="button" className="btn btn--marker btn--lg" autoFocus onClick={start}>
              Start
            </button>
          </section>
        )}

        {phase === 'play' && (
          <>
            <p className="visually-hidden" aria-live="polite">
              {announce}
            </p>
            <div className="tiles">
              {tiles.map((t) => {
                const gone = matched.has(t.cardId);
                const cls = [
                  'tile',
                  tileSize(t.text),
                  t.side === 'term' ? 'tile--term' : 'tile--def',
                  selected === t.id ? 'is-selected' : '',
                  wrong.includes(t.id) ? 'is-wrong' : '',
                  gone ? 'is-gone' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <button key={t.id} type="button" className={cls} onClick={() => pick(t)} disabled={gone} aria-pressed={selected === t.id} aria-hidden={gone || undefined}>
                    {t.text}
                  </button>
                );
              })}
            </div>
            {penalty > 0 && <p className="match__penalty mono">+{penalty / 1000} s Strafe</p>}
          </>
        )}

        {phase === 'done' && result && (
          <section className="match__intro" aria-labelledby="match-done">
            <p className="eyebrow">Alle Paare gefunden</p>
            <h1 id="match-done" className="display match__title">
              <span className="marker">{formatTime(result.ms)}</span>
            </h1>
            <p className="match__text">
              {result.record
                ? result.previous !== undefined
                  ? `Neuer Rekord! Vorher: ${formatTime(result.previous)}.`
                  : 'Erste Bestzeit gesetzt.'
                : `Bestzeit: ${formatTime(bestTime ?? result.ms)}.`}
              {penalty > 0 && ` Davon ${penalty / 1000} s Strafe.`}
            </p>
            <div className="match__actions">
              <button type="button" className="btn btn--marker btn--lg" autoFocus onClick={start}>
                Nochmal
              </button>
              <a className="btn btn--lg" href={back}>
                Zurück zum Set
              </a>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
