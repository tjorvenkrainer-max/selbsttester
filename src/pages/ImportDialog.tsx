import { useMemo, useState } from 'react';
import { Sheet } from '../components/common';
import { CARD_SEPS, TERM_SEPS, detectSeparators, parseImport, type CardSep, type ImportedCard, type TermSep } from '../lib/importText';
import { plural } from '../lib/format';

export function ImportDialog({
  initialText,
  onClose,
  onImport,
}: {
  initialText: string;
  onClose: () => void;
  onImport: (cards: ImportedCard[]) => void;
}) {
  const [text, setText] = useState(initialText);
  const [termSep, setTermSep] = useState<TermSep | 'auto'>('auto');
  const [cardSep, setCardSep] = useState<CardSep | 'auto'>('auto');
  const [customTerm, setCustomTerm] = useState('');
  const [customCard, setCustomCard] = useState('');

  const detected = useMemo(() => detectSeparators(text), [text]);
  const effTerm = termSep === 'auto' ? detected.term : termSep;
  const effCard = cardSep === 'auto' ? detected.card : cardSep;
  const cards = useMemo(
    () => parseImport(text, effTerm, effCard, { term: customTerm, card: customCard }),
    [text, effTerm, effCard, customTerm, customCard],
  );
  const incomplete = cards.filter((c) => !c.term || !c.definition).length;
  const labelOf = (id: string, list: { id: string; label: string }[]) => list.find((x) => x.id === id)?.label ?? id;

  return (
    <Sheet
      open
      title="Text importieren"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="btn btn--ink" disabled={!cards.length} onClick={() => onImport(cards)}>
            {cards.length ? `${plural(cards.length, 'Karte', 'Karten')} hinzufügen` : 'Karten hinzufügen'}
          </button>
        </>
      }
    >
      <div>
        <label className="label" htmlFor="imp-text">
          Deine Liste
        </label>
        <textarea
          id="imp-text"
          className="textarea imp__text"
          rows={8}
          value={text}
          autoFocus
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          placeholder={'house - das Haus\nto run - laufen'}
        />
        <p className="field-hint">
          Pro Zeile eine Karte. Begriff und Definition getrennt durch Tab, „ - “, „=“ oder „:“. Exporte aus Quizlet oder Anki
          (Tab-getrennt) gehen direkt.
        </p>
      </div>

      <div className="imp__seps">
        <div>
          <label className="label" htmlFor="imp-term">
            Zwischen Begriff und Definition
          </label>
          <select id="imp-term" className="select" value={termSep} onChange={(e) => setTermSep(e.target.value as TermSep | 'auto')}>
            <option value="auto">Automatisch ({labelOf(detected.term, TERM_SEPS)})</option>
            {TERM_SEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {termSep === 'custom' && (
            <input className="input imp__custom" aria-label="Eigenes Trennzeichen zwischen Begriff und Definition" value={customTerm} onChange={(e) => setCustomTerm(e.target.value)} placeholder="z. B. |" />
          )}
        </div>
        <div>
          <label className="label" htmlFor="imp-card">
            Zwischen Karten
          </label>
          <select id="imp-card" className="select" value={cardSep} onChange={(e) => setCardSep(e.target.value as CardSep | 'auto')}>
            <option value="auto">Automatisch ({labelOf(detected.card, CARD_SEPS)})</option>
            {CARD_SEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {cardSep === 'custom' && (
            <input className="input imp__custom" aria-label="Eigenes Trennzeichen zwischen Karten" value={customCard} onChange={(e) => setCustomCard(e.target.value)} placeholder="z. B. ##" />
          )}
        </div>
      </div>

      <div aria-live="polite">
        <p className="label">Vorschau {cards.length > 0 && <span className="muted">({plural(cards.length, 'Karte', 'Karten')})</span>}</p>
        {cards.length === 0 ? (
          <p className="muted">Noch nichts erkannt.</p>
        ) : (
          <ol className="imp__preview">
            {cards.slice(0, 6).map((c, i) => (
              <li key={i}>
                <span className={c.term ? '' : 'imp__missing'}>{c.term || 'Begriff fehlt'}</span>
                <span className={c.definition ? 'muted' : 'imp__missing'}>{c.definition || 'Definition fehlt'}</span>
              </li>
            ))}
            {cards.length > 6 && <li className="muted">… und {cards.length - 6} weitere</li>}
          </ol>
        )}
        {incomplete > 0 && (
          <p className="field-hint">
            {plural(incomplete, 'Karte ist', 'Karten sind')} unvollständig – du kannst sie danach im Editor ergänzen.
          </p>
        )}
      </div>
    </Sheet>
  );
}
