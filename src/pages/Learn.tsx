import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import { getData, recordProgress, updateSettings, useData } from '../lib/store';
import {
  answerCurrent,
  buildItems,
  nextRound,
  sessionStats,
  startSession,
  type LearnCard,
  type LearnContext,
  type LearnScope,
  type LearnState,
  type McQuestion,
  type Question,
  type WrittenQuestion,
} from '../lib/learn';
import { checkAnswer, type Verdict } from '../lib/answer';
import { boxStats } from '../lib/srs';
import { plural, relativeDay } from '../lib/format';
import type { AnswerWith, QuestionTypes, Side } from '../lib/types';
import { useKeys, useNow, useTitle } from '../hooks';
import { playCorrect, playWrong } from '../lib/sound';
import { FocusBar } from '../components/FocusBar';
import { Karteikasten } from '../components/Karteikasten';
import { NotFound, Segmented, Sheet } from '../components/common';
import './Learn.css';

const PRAISE = ['Richtig!', 'Genau!', 'Passt!', 'Sehr gut!', 'Stimmt!'];
const sideLabel = (s: Side) => (s === 'term' ? 'Begriff' : 'Definition');

function createSession(setId: string | undefined, scope: LearnScope) {
  const d = getData();
  const sets = setId ? d.sets.filter((s) => s.id === setId) : d.sets;
  const valid = (c: { term: string; definition: string }) => c.term.trim() && c.definition.trim();
  const cards: LearnCard[] = sets.flatMap((s) => s.cards.filter(valid).map((card) => ({ setId: s.id, card })));
  const config = { questionTypes: d.settings.questionTypes, answerWith: d.settings.answerWith, roundSize: d.settings.roundSize };
  const ctx: LearnContext = {
    cards: new Map(cards.map((lc) => [lc.card.id, lc])),
    pools: new Map(sets.map((s) => [s.id, s.cards.filter(valid)])),
    config,
    rng: Math.random,
  };
  const items = buildItems(cards, d.progress, config, scope, Date.now(), ctx.rng);
  return { ctx, state: startSession(items, ctx) };
}

export function Learn({ setId, scope }: { setId?: string; scope: LearnScope }) {
  const data = useData();
  const [run, setRun] = useState(0);
  const set = setId ? data.sets.find((s) => s.id === setId) : undefined;
  if (setId && !set) return <NotFound what="Set" />;
  return <LearnSession key={run} setId={setId} scope={scope} title={set?.title ?? 'Alle Sets'} onRestart={() => setRun((r) => r + 1)} />;
}

function LearnSession({ setId, scope, title, onRestart }: { setId?: string; scope: LearnScope; title: string; onRestart: () => void }) {
  const mode = scope === 'due' ? 'Wiederholen' : scope === 'practice' ? 'Alles üben' : 'Lernen';
  useTitle(`${mode} – ${title}`);
  const [boot] = useState(() => createSession(setId, scope));
  const ctx = boot.ctx;
  const [state, setState] = useState<LearnState>(boot.state);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const committed = useRef<Question | null>(null);
  const back = setId ? `#/set/${setId}` : '#/';
  const stats = sessionStats(state);

  const commit = useCallback(
    (ok: boolean) => {
      const q = state.question;
      if (!q || committed.current === q) return; // jede Frage nur einmal werten
      committed.current = q;
      const out = answerCurrent(state, ok, getData().progress[q.itemId], ctx, Date.now());
      recordProgress(out.cardId, out.progress);
      setState(out.state);
    },
    [state, ctx],
  );

  const q = state.question;
  const entry = q ? ctx.cards.get(q.itemId) : undefined;
  const tag = !setId && entry ? getData().sets.find((s) => s.id === entry.setId)?.title : undefined;

  return (
    <div className="learn">
      <FocusBar
        back={back}
        mode={mode}
        title={title}
        actions={
          <button type="button" className="btn btn--ghost btn--icon" aria-label="Lernen einstellen" onClick={() => setSettingsOpen(true)}>
            <SlidersHorizontal aria-hidden="true" />
          </button>
        }
      >
        {stats.total > 0 && <LearnProgress done={stats.done} half={stats.half} total={stats.total} />}
      </FocusBar>

      <div className="learn__main">
        {state.phase === 'question' && q?.kind === 'mc' && <McView key={`${state.round}-${state.pos}`} q={q} tag={tag} onAnswer={commit} />}
        {state.phase === 'question' && q?.kind === 'written' && !q.selfCheck && (
          <WrittenView key={`${state.round}-${state.pos}`} q={q} tag={tag} onAnswer={commit} />
        )}
        {state.phase === 'question' && q?.kind === 'written' && q.selfCheck && (
          <SelfCheckView key={`${state.round}-${state.pos}`} q={q} tag={tag} onAnswer={commit} />
        )}
        {state.phase === 'summary' && <RoundSummary state={state} ctx={ctx} onNext={() => setState(nextRound(state, ctx))} />}
        {state.phase === 'done' && stats.total > 0 && <DoneView state={state} ctx={ctx} setId={setId} scope={scope} />}
        {state.phase === 'done' && stats.total === 0 && <NothingToLearn ctx={ctx} setId={setId} scope={scope} />}
      </div>

      {settingsOpen && <LearnSettings onClose={() => setSettingsOpen(false)} onApply={onRestart} />}
    </div>
  );
}

function LearnProgress({ done, half, total }: { done: number; half: number; total: number }) {
  return (
    <div className="lprog">
      <div
        className="lprog__bar"
        role="progressbar"
        aria-label="Fortschritt"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} von ${total} sitzen`}
      >
        <span className="lprog__done" style={{ width: `${(100 * done) / total}%` }} />
        <span className="lprog__half" style={{ width: `${(100 * half) / total}%` }} />
      </div>
      <span className="lprog__text mono">
        {done}/{total}
      </span>
    </div>
  );
}

const textSize = (t: string) => (t.length > 160 ? 'is-xs' : t.length > 90 ? 'is-s' : t.length > 32 ? 'is-m' : 'is-l');

function PromptCard({ side, text, tag }: { side: Side; text: string; tag?: string }) {
  return (
    <div className="pcard">
      <div className="pcard__head">
        <span className="pcard__label">{sideLabel(side)}</span>
        {tag && <span className="pcard__tag">{tag}</span>}
      </div>
      <p className={`pcard__text ${textSize(text)}`}>{text}</p>
    </div>
  );
}

function usePraise() {
  const [word] = useState(() => PRAISE[Math.floor(Math.random() * PRAISE.length)]);
  return word;
}

/** Nach `ms` automatisch weiter – der Timer startet nicht neu, wenn sich der Callback ändert */
function useAutoAdvance(active: boolean, ms: number, fn: () => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => ref.current(), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
}

// ---------- Auswahl ----------
function McView({ q, tag, onAnswer }: { q: McQuestion; tag?: string; onAnswer: (ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const praise = usePraise();
  const answered = picked !== null;
  const ok = picked === q.correct;

  useAutoAdvance(answered && ok, 900, () => onAnswer(true));

  const choose = (i: number) => {
    setPicked(i);
    if (i === q.correct) playCorrect();
    else playWrong();
  };

  useKeys((e) => {
    if (!answered) {
      const n = Number(e.key);
      if (n >= 1 && n <= q.options.length) {
        e.preventDefault();
        choose(n - 1);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAnswer(ok);
    }
  });

  const answerSide: Side = q.promptSide === 'term' ? 'definition' : 'term';

  return (
    <div className="q">
      <PromptCard side={q.promptSide} text={q.prompt} tag={tag} />
      <p className="q__instr">Wähle {answerSide === 'term' ? 'den passenden Begriff' : 'die passende Definition'}</p>
      <div className="options">
        {q.options.map((o, i) => {
          const cls = !answered ? '' : i === q.correct ? ' is-correct' : i === picked ? ' is-wrong' : ' is-dim';
          return (
            <button key={i} type="button" className={`option${cls}`} disabled={answered} onClick={() => choose(i)} aria-keyshortcuts={String(i + 1)}>
              <span className="option__key kbd" aria-hidden="true">
                {i + 1}
              </span>
              <span className="option__text">{o}</span>
              {answered && i === q.correct && <Check className="option__mark" aria-label="richtig" />}
              {answered && i === picked && !ok && <X className="option__mark" aria-label="deine Wahl, falsch" />}
            </button>
          );
        })}
      </div>

      <div className="feedback-slot" aria-live="polite">
        {!answered && (
          <button type="button" className="linkbtn" onClick={() => choose(-1)}>
            Weiß ich nicht
          </button>
        )}
        {answered && ok && (
          <div className="feedback feedback--ok">
            <Check aria-hidden="true" /> <strong>{praise}</strong>
            <button type="button" className="btn btn--sm feedback__next" onClick={() => onAnswer(true)}>
              Weiter
            </button>
          </div>
        )}
        {answered && !ok && (
          <div className="feedback feedback--bad">
            <div className="feedback__text">
              <strong>{picked === -1 ? 'Kein Problem – merk dir:' : 'Nicht ganz. Richtig ist:'}</strong>
              <span className="feedback__answer">{q.answer}</span>
            </div>
            <button type="button" className="btn btn--ink feedback__next" autoFocus onClick={() => onAnswer(false)}>
              Weiter <span className="kbd">Enter</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Schreiben ----------
function WrittenView({ q, tag, onAnswer }: { q: WrittenQuestion; tag?: string; onAnswer: (ok: boolean) => void }) {
  const [value, setValue] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [skipped, setSkipped] = useState(false);
  const praise = usePraise();
  const answered = verdict !== null || skipped;
  const ok = verdict?.result === 'correct';
  const autoNext = ok && !verdict?.hint;

  useAutoAdvance(autoNext, 1100, () => onAnswer(true));
  useAutoAdvance(skipped, 1800, () => onAnswer(false)); // übersprungen: richtige Antwort kurz zeigen, dann weiter

  const skip = () => {
    setSkipped(true);
    playWrong();
  };

  const answerSide: Side = q.promptSide === 'term' ? 'definition' : 'term';

  return (
    <div className="q">
      <PromptCard side={q.promptSide} text={q.prompt} tag={tag} />
      <form
        className="write"
        onSubmit={(e) => {
          e.preventDefault();
          if (answered) onAnswer(ok);
          else if (!value.trim()) skip(); // Enter ohne Eingabe = weiß ich nicht
          else {
            const v = checkAnswer(value, q.answer);
            setVerdict(v);
            if (v.result === 'correct') playCorrect();
            else playWrong();
          }
        }}
      >
        <label className="q__instr" htmlFor="answer-input">
          Schreib {answerSide === 'term' ? 'den Begriff' : 'die Definition'}
        </label>
        <div className={`write__row${verdict ? ` is-${verdict.result}` : ''}`}>
          <input
            id="answer-input"
            className="input write__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={answered}
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint={answered ? 'next' : 'done'}
            placeholder="Antwort – oder leer lassen und Enter"
          />
          {!answered && (
            <button type="submit" className="btn btn--ink">
              Antworten
            </button>
          )}
        </div>

        <div className="feedback-slot" aria-live="polite">
          {!answered && (
            <button type="button" className="linkbtn" onClick={skip}>
              Weiß ich nicht
            </button>
          )}
          {answered && ok && (
            <div className="feedback feedback--ok">
              <div className="feedback__text">
                <strong>
                  <Check aria-hidden="true" /> {praise}
                </strong>
                {verdict?.hint && <span>{verdict.hint}</span>}
              </div>
              <button type="submit" className="btn btn--sm feedback__next" autoFocus={!!verdict?.hint}>
                Weiter
              </button>
            </div>
          )}
          {answered && !ok && (
            <div className={`feedback ${verdict?.result === 'almost' ? 'feedback--almost' : 'feedback--bad'}`}>
              <div className="feedback__text">
                <strong>{skipped ? 'Kein Problem – merk dir:' : verdict?.result === 'almost' ? verdict.hint : 'Nicht ganz. Richtig ist:'}</strong>
                <span className="feedback__answer">{q.answer}</span>
                {!skipped && (
                  <span className="feedback__yours">
                    Deine Antwort: <s>{value}</s>
                  </span>
                )}
              </div>
              <div className="feedback__actions">
                {!skipped && (
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => {
                      playCorrect();
                      onAnswer(true);
                    }}
                  >
                    Ich hatte recht
                  </button>
                )}
                <button type="submit" className="btn btn--ink feedback__next" autoFocus>
                  Weiter <span className="kbd">Enter</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

// ---------- Selbst prüfen (lange Antworten) ----------
function SelfCheckView({ q, tag, onAnswer }: { q: WrittenQuestion; tag?: string; onAnswer: (ok: boolean) => void }) {
  const [revealed, setRevealed] = useState(false);
  const answerSide: Side = q.promptSide === 'term' ? 'definition' : 'term';

  useKeys((e) => {
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      setRevealed(true);
    } else if (revealed && (e.key === '1' || e.key === 'ArrowLeft')) {
      e.preventDefault();
      onAnswer(false);
    } else if (revealed && (e.key === '2' || e.key === 'ArrowRight')) {
      e.preventDefault();
      playCorrect();
      onAnswer(true);
    }
  });

  return (
    <div className="q">
      <PromptCard side={q.promptSide} text={q.prompt} tag={tag} />
      <p className="q__instr">
        {revealed ? 'Hast du es gewusst?' : `Sag dir ${answerSide === 'term' ? 'den Begriff' : 'die Definition'} im Kopf, dann deck auf.`}
      </p>
      {!revealed ? (
        <button type="button" className="btn btn--ink btn--lg selfcheck__reveal" autoFocus onClick={() => setRevealed(true)}>
          Antwort zeigen <span className="kbd">Leertaste</span>
        </button>
      ) : (
        <>
          <div className="pcard pcard--answer" aria-live="polite">
            <div className="pcard__head">
              <span className="pcard__label">{sideLabel(answerSide)}</span>
            </div>
            <p className={`pcard__text ${textSize(q.answer)}`}>{q.answer}</p>
          </div>
          <div className="selfcheck">
            <button type="button" className="btn btn--lg selfcheck__no" onClick={() => onAnswer(false)}>
              <X aria-hidden="true" /> Nicht gewusst <span className="kbd">1</span>
            </button>
            <button
              type="button"
              className="btn btn--lg selfcheck__yes"
              autoFocus
              onClick={() => {
                playCorrect();
                onAnswer(true);
              }}
            >
              <Check aria-hidden="true" /> Gewusst <span className="kbd">2</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------- Rundenende ----------
function RoundSummary({ state, ctx, onNext }: { state: LearnState; ctx: LearnContext; onNext: () => void }) {
  const stats = sessionStats(state);
  const okCount = state.roundResults.filter((r) => r.ok).length;
  useKeys((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNext();
    }
  });
  return (
    <section className="summary" aria-labelledby="sum-title">
      <p className="eyebrow">Runde {state.round} geschafft</p>
      <h1 id="sum-title" className="display summary__title">
        <span className="marker">
          {okCount} von {state.roundResults.length}
        </span>{' '}
        richtig
      </h1>
      <p className="muted">
        Insgesamt sitzen {stats.done} von {stats.total}
        {stats.half > 0 && `, bei ${stats.half} fehlt nur noch das Schreiben`}.
      </p>
      <ul className="summary__list">
        {state.roundResults.map((r) => {
          const card = ctx.cards.get(r.id)?.card;
          const item = state.items.find((i) => i.id === r.id);
          if (!card || !item) return null;
          const label = !item.needs.length ? 'sitzt' : item.needs.length < item.steps ? 'Auswahl geschafft' : 'kommt wieder';
          return (
            <li key={r.id} className={r.ok ? 'is-ok' : 'is-bad'}>
              <span className="summary__icon">{r.ok ? <Check aria-label="richtig" /> : <X aria-label="falsch" />}</span>
              <span className="summary__card">
                <span className="summary__term">{card.term}</span>
                <span className="summary__def">{card.definition}</span>
              </span>
              <span className="summary__state">{label}</span>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn--ink btn--lg" autoFocus onClick={onNext}>
        Weiter zu Runde {state.round + 1}
      </button>
    </section>
  );
}

// ---------- Fertig ----------
function DoneView({ state, ctx, setId, scope }: { state: LearnState; ctx: LearnContext; setId?: string; scope: LearnScope }) {
  const data = useData();
  const now = useNow();
  const cards = useMemo(() => [...ctx.cards.values()].map((x) => x.card), [ctx]);
  const stats = boxStats(cards, data.progress, now);
  const s = sessionStats(state);
  return (
    <section className="done" aria-labelledby="done-title">
      <p className="eyebrow">{plural(s.total, 'Karte', 'Karten')}</p>
      <h1 id="done-title" className="display done__title">
        {scope === 'due' ? 'Alles wiederholt!' : <>Geschafft – <span className="marker">alles sitzt</span></>}
      </h1>
      <p className="done__text">
        {s.mistakes === 0 ? 'Ohne einen Fehler.' : `${plural(s.mistakes, 'Fehler', 'Fehler')} unterwegs – die Karten sitzen trotzdem.`}{' '}
        {stats.nextDue && `Nächste Wiederholung ${relativeDay(stats.nextDue, now)}.`}
      </p>
      <div className="done__kasten panel">
        <Karteikasten stats={stats} compact />
      </div>
      <div className="done__actions">
        <a className="btn btn--ink btn--lg" href={setId ? `#/set/${setId}` : '#/'}>
          {setId ? 'Zurück zum Set' : 'Zu deinen Sets'}
        </a>
        {setId && (
          <a className="btn btn--lg" href={`#/set/${setId}/test`}>
            Test machen
          </a>
        )}
      </div>
    </section>
  );
}

function NothingToLearn({ ctx, setId, scope }: { ctx: LearnContext; setId?: string; scope: LearnScope }) {
  const data = useData();
  const now = useNow();
  const cards = [...ctx.cards.values()].map((x) => x.card);
  const stats = boxStats(cards, data.progress, now);
  const back = setId ? `#/set/${setId}` : '#/';

  if (cards.length === 0) {
    return (
      <section className="done">
        <h1 className="display done__title">Keine Karten</h1>
        <p className="done__text">Füg zuerst Karten mit Begriff und Definition hinzu.</p>
        <div className="done__actions">
          <a className="btn btn--ink btn--lg" href={setId ? `#/set/${setId}/bearbeiten` : '#/neu'}>
            Karten hinzufügen
          </a>
        </div>
      </section>
    );
  }
  return (
    <section className="done">
      <h1 className="display done__title">{scope === 'due' ? 'Heute ist nichts fällig' : <>Alles <span className="marker">sitzt</span></>}</h1>
      <p className="done__text">
        {stats.nextDue ? `Die nächsten Karten sind ${relativeDay(stats.nextDue, now)} dran.` : 'Gerade gibt es nichts zu wiederholen.'}
        {scope === 'set' && ' Du kannst trotzdem alles üben – Karten, die du dabei vergisst, kommen zurück auf den Stapel.'}
      </p>
      <div className="done__kasten panel">
        <Karteikasten stats={stats} compact />
      </div>
      <div className="done__actions">
        {scope === 'set' && setId && (
          <a className="btn btn--marker btn--lg" href={`#/set/${setId}/lernen/alles`}>
            Trotzdem alles üben
          </a>
        )}
        <a className="btn btn--lg" href={back}>
          {setId ? 'Zurück zum Set' : 'Zu deinen Sets'}
        </a>
      </div>
    </section>
  );
}

// ---------- Einstellungen ----------
function LearnSettings({ onClose, onApply }: { onClose: () => void; onApply: () => void }) {
  const s = getData().settings;
  const [questionTypes, setQuestionTypes] = useState<QuestionTypes>(s.questionTypes);
  const [answerWith, setAnswerWith] = useState<AnswerWith>(s.answerWith);
  const [roundSize, setRoundSize] = useState(String(s.roundSize));
  const [sound, setSound] = useState(s.sound);
  return (
    <Sheet
      open
      title="Lernen einstellen"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="btn btn--ink"
            onClick={() => {
              updateSettings({ questionTypes, answerWith, roundSize: Number(roundSize), sound });
              onClose();
              onApply();
            }}
          >
            Übernehmen
          </button>
        </>
      }
    >
      <Segmented
        name="qt"
        label="Fragen"
        value={questionTypes}
        onChange={setQuestionTypes}
        options={[
          { value: 'both', label: 'Auswahl, dann Schreiben' },
          { value: 'mc', label: 'Nur Auswahl' },
          { value: 'written', label: 'Nur Schreiben' },
        ]}
      />
      <Segmented
        name="aw"
        label="Antworten mit"
        value={answerWith}
        onChange={setAnswerWith}
        options={[
          { value: 'term', label: 'Begriff' },
          { value: 'definition', label: 'Definition' },
          { value: 'mixed', label: 'Gemischt' },
        ]}
      />
      <Segmented
        name="rs"
        label="Karten pro Runde"
        value={roundSize}
        onChange={setRoundSize}
        options={['5', '7', '10', '15'].map((v) => ({ value: v, label: v }))}
      />
      <label className="check">
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />
        Töne bei richtig und falsch
      </label>
      <p className="field-hint">Übernehmen startet die Sitzung neu. Was du schon gelernt hast, bleibt gespeichert.</p>
    </Sheet>
  );
}
