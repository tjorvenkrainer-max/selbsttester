import { useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Shuffle, X } from 'lucide-react';
import { updateSettings, useData } from '../lib/store';
import { shuffle } from '../lib/random';
import { plural } from '../lib/format';
import type { Side, StudySet } from '../lib/types';
import { useKeys, useTitle } from '../hooks';
import { FocusBar } from '../components/FocusBar';
import { NotFound } from '../components/common';
import './Flashcards.css';

export function Flashcards({ id }: { id: string }) {
  const data = useData();
  const set = data.sets.find((s) => s.id === id);
  if (!set) return <NotFound what="Set" />;
  return <Deck set={set} front={data.settings.cardFront} />;
}

const sizeOf = (t: string) => (t.length > 160 ? 'is-xs' : t.length > 80 ? 'is-s' : t.length > 28 ? 'is-m' : 'is-l');

function Deck({ set, front }: { set: StudySet; front: Side }) {
  useTitle(`Karteikarten – ${set.title}`);
  const cards = useMemo(() => set.cards.filter((c) => c.term.trim() && c.definition.trim()), [set.cards]);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const [order, setOrder] = useState(() => cards.map((c) => c.id));
  const [mixed, setMixed] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const back: Side = front === 'term' ? 'definition' : 'term';
  const card = byId.get(order[index]);

  const go = (delta: number) => {
    const next = index + delta;
    if (next < 0) return;
    if (next >= order.length) {
      setFinished(true);
      return;
    }
    setIndex(next);
    setFlipped(false);
  };

  const mark = (knew: boolean) => {
    if (!card) return;
    setKnown((k) => (knew ? [...k.filter((x) => x !== card.id), card.id] : k.filter((x) => x !== card.id)));
    setUnknown((u) => (knew ? u.filter((x) => x !== card.id) : [...u.filter((x) => x !== card.id), card.id]));
    go(1);
  };

  const restart = (ids: string[], shuffleIt = mixed) => {
    setOrder(shuffleIt ? shuffle(ids) : ids);
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setUnknown([]);
    setFinished(false);
  };

  useKeys((e) => {
    if (finished) return;
    const onControl = (e.target as HTMLElement | null)?.closest?.('button, a, input, select, textarea');
    if ((e.key === ' ' || e.key === 'Enter') && !onControl) {
      e.preventDefault();
      setFlipped((f) => !f);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setFlipped((f) => !f);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (sorting) mark(true);
      else go(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (sorting) mark(false);
      else go(-1);
    }
  });

  if (cards.length === 0) {
    return (
      <div>
        <FocusBar back={`#/set/${set.id}`} mode="Karteikarten" title={set.title} />
        <div className="deck">
          <p>Dieses Set hat noch keine vollständigen Karten.</p>
          <a className="btn btn--ink" href={`#/set/${set.id}/bearbeiten`}>
            Karten hinzufügen
          </a>
        </div>
      </div>
    );
  }

  const all = cards.map((c) => c.id);

  return (
    <div>
      <FocusBar back={`#/set/${set.id}`} mode="Karteikarten" title={set.title}>
        <div className="deck__progress" aria-hidden="true">
          <span style={{ width: `${(100 * (finished ? order.length : index)) / order.length}%` }} />
        </div>
      </FocusBar>

      <div className="deck">
        {finished ? (
          <section className="deck__done" aria-labelledby="deck-done">
            <h1 id="deck-done" className="display deck__donetitle">
              {sorting ? (
                <>
                  <span className="marker">{known.length} gewusst</span>, {unknown.length} noch nicht
                </>
              ) : (
                <>Durch – {plural(order.length, 'Karte', 'Karten')} angeschaut</>
              )}
            </h1>
            <div className="deck__doneactions">
              {sorting && unknown.length > 0 && (
                <button type="button" className="btn btn--marker btn--lg" autoFocus onClick={() => restart(unknown)}>
                  Die {unknown.length} nochmal
                </button>
              )}
              <button type="button" className="btn btn--lg" autoFocus={!sorting || unknown.length === 0} onClick={() => restart(all)}>
                Alle nochmal
              </button>
              <a className="btn btn--ink btn--lg" href={`#/set/${set.id}/lernen`}>
                Lernmodus starten
              </a>
            </div>
          </section>
        ) : (
          card && (
            <>
              <button
                type="button"
                className={`fc${flipped ? ' is-flipped' : ''}`}
                onPointerDown={(e) => {
                  pointer.current = { x: e.clientX, y: e.clientY };
                  swiped.current = false;
                }}
                onPointerUp={(e) => {
                  const start = pointer.current;
                  pointer.current = null;
                  if (!start) return;
                  const dx = e.clientX - start.x;
                  const dy = e.clientY - start.y;
                  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    swiped.current = true; // Wischen statt Tippen
                    if (sorting) mark(dx > 0);
                    else go(dx < 0 ? 1 : -1);
                  }
                }}
                onClick={() => {
                  if (swiped.current) {
                    swiped.current = false;
                    return;
                  }
                  setFlipped((f) => !f);
                }}
              >
                <span className="fc__inner">
                  <span className="fc__face fc__face--front" aria-hidden={flipped}>
                    <span className="fc__label">{front === 'term' ? 'Begriff' : 'Definition'}</span>
                    <span className={`fc__front ${sizeOf(card[front])}`}>{card[front]}</span>
                  </span>
                  <span className="fc__face fc__face--back" aria-hidden={!flipped}>
                    <span className="fc__head">
                      <span className="fc__label">{back === 'term' ? 'Begriff' : 'Definition'}</span>
                      <span className="fc__mini">{card[front]}</span>
                    </span>
                    <span className={`fc__ruled ${sizeOf(card[back])}`}>{card[back]}</span>
                  </span>
                </span>
                <span className="visually-hidden">{flipped ? '' : ' – zum Umdrehen tippen'}</span>
              </button>
              <p className="visually-hidden" aria-live="polite">
                {flipped ? `Rückseite: ${card[back]}` : ''}
              </p>

              {sorting ? (
                <div className="deck__nav deck__nav--sort">
                  <span className="deck__count mono" aria-live="polite">
                    {index + 1} / {order.length}
                  </span>
                  <button type="button" className="btn btn--lg deck__no" onClick={() => mark(false)}>
                    <X aria-hidden="true" /> Noch nicht
                  </button>
                  <button type="button" className="btn btn--lg deck__yes" onClick={() => mark(true)}>
                    <Check aria-hidden="true" /> Gewusst
                  </button>
                </div>
              ) : (
                <div className="deck__nav">
                  <button type="button" className="btn btn--icon btn--lg" onClick={() => go(-1)} disabled={index === 0} aria-label="Vorherige Karte">
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span className="deck__count mono" aria-live="polite">
                    {index + 1} / {order.length}
                  </span>
                  <button type="button" className="btn btn--icon btn--lg" onClick={() => go(1)} aria-label="Nächste Karte">
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              )}

              <div className="deck__opts">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={mixed}
                    onChange={(e) => {
                      setMixed(e.target.checked);
                      restart(all, e.target.checked);
                    }}
                  />
                  <Shuffle aria-hidden="true" className="deck__optico" /> Mischen
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={sorting}
                    onChange={(e) => {
                      setSorting(e.target.checked);
                      restart(order, false);
                    }}
                  />
                  Sortieren (gewusst / noch nicht)
                </label>
                <label className="check">
                  <input type="checkbox" checked={front === 'definition'} onChange={(e) => updateSettings({ cardFront: e.target.checked ? 'definition' : 'term' })} />
                  Definition vorne
                </label>
              </div>
              <p className="deck__hint">
                <span className="kbd">Leertaste</span> oder tippen: umdrehen · <span className="kbd">←</span> <span className="kbd">→</span> oder wischen:{' '}
                {sorting ? 'noch nicht / gewusst' : 'blättern'}
              </p>
            </>
          )
        )}
      </div>
    </div>
  );
}
