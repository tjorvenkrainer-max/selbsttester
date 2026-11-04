import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { getData, useData } from '../lib/store';
import { TEST_KIND_LABEL, buildTest, gradeTest, type TestAnswer, type TestKind, type TestQuestion } from '../lib/testMode';
import { plural } from '../lib/format';
import type { AnswerWith, StudySet } from '../lib/types';
import { OWNER_NAME } from '../config';
import { useTitle } from '../hooks';
import { FocusBar } from '../components/FocusBar';
import { NotFound, Segmented } from '../components/common';
import './TestMode.css';

const KIND_TITLE: Record<TestKind, string> = {
  tf: 'Wahr oder falsch?',
  mc: 'Wähle die richtige Antwort',
  written: 'Schreib die Antwort',
};

const sideName = (q: TestQuestion) => (q.promptSide === 'term' ? 'Definition' : 'Begriff');

export function TestMode({ id }: { id: string }) {
  const data = useData();
  const set = data.sets.find((s) => s.id === id);
  if (!set) return <NotFound what="Set" />;
  return <TestRun set={set} />;
}

function TestRun({ set }: { set: StudySet }) {
  useTitle(`Test – ${set.title}`);
  const cards = useMemo(() => set.cards.filter((c) => c.term.trim() && c.definition.trim()), [set.cards]);
  const n = cards.length;
  const [phase, setPhase] = useState<'setup' | 'taking' | 'results'>('setup');
  const [count, setCount] = useState(Math.min(20, n));
  const [kinds, setKinds] = useState<TestKind[]>(n >= 2 ? ['tf', 'mc', 'written'] : ['written']);
  const [answerWith, setAnswerWith] = useState<AnswerWith>(() => getData().settings.answerWith);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, TestAnswer>>({});
  const [overrides, setOverrides] = useState<Set<string>>(new Set());

  const back = `#/set/${set.id}`;
  const toTop = () => window.scrollTo({ top: 0 });

  const start = () => {
    setQuestions(buildTest(cards, { count, kinds, answerWith }));
    setAnswers({});
    setOverrides(new Set());
    setPhase('taking');
    toTop();
  };

  const submit = () => {
    const open = questions.filter((q) => answers[q.id] === undefined || answers[q.id] === '').length;
    if (open && !confirm(`${plural(open, 'Frage ist', 'Fragen sind')} noch offen. Trotzdem abgeben?`)) return;
    setPhase('results');
    toTop();
  };

  const setAnswer = (id: string, v: TestAnswer) => setAnswers((a) => ({ ...a, [id]: v }));

  if (n === 0) {
    return (
      <div>
        <FocusBar back={back} mode="Test" title={set.title} />
        <div className="test">
          <p>Dieses Set hat noch keine vollständigen Karten.</p>
          <a className="btn btn--ink" href={`${back}/bearbeiten`}>
            Karten hinzufügen
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <FocusBar back={back} mode="Test" title={set.title} />
      <div className="test">
        {phase === 'setup' && (
          <form
            className="panel test__setup"
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <h1 className="display test__title">Test vorbereiten</h1>
            <div>
              <label className="label" htmlFor="t-count">
                Fragen: <span className="mono">{count}</span> von {n}
              </label>
              <input id="t-count" className="test__range" type="range" min={1} max={n} value={count} onChange={(e) => setCount(Number(e.target.value))} />
            </div>
            <fieldset className="fieldset">
              <legend className="label">Fragetypen</legend>
              {(['tf', 'mc', 'written'] as TestKind[]).map((k) => (
                <label key={k} className="check">
                  <input
                    type="checkbox"
                    checked={kinds.includes(k)}
                    disabled={k !== 'written' && n < 2}
                    onChange={(e) => setKinds((ks) => (e.target.checked ? [...ks, k] : ks.filter((x) => x !== k)))}
                  />
                  {TEST_KIND_LABEL[k]}
                </label>
              ))}
              {kinds.length === 0 && <p className="field-error">Wähl mindestens einen Fragetyp.</p>}
            </fieldset>
            <Segmented
              name="t-aw"
              label="Antworten mit"
              value={answerWith}
              onChange={setAnswerWith}
              options={[
                { value: 'term', label: 'Begriff' },
                { value: 'definition', label: 'Definition' },
                { value: 'mixed', label: 'Gemischt' },
              ]}
            />
            <button type="submit" className="btn btn--marker btn--lg" disabled={kinds.length === 0}>
              Test starten
            </button>
          </form>
        )}

        {phase === 'taking' && (
          <form
            className="paper"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <PaperHead title={set.title} />
            {(['tf', 'mc', 'written'] as TestKind[]).map((kind) => {
              const group = questions.filter((q) => q.kind === kind);
              if (!group.length) return null;
              return (
                <section key={kind} className="paper__section">
                  <h2 className="paper__sectiontitle">{KIND_TITLE[kind]}</h2>
                  <ol className="paper__list">
                    {group.map((q) => (
                      <li key={q.id} className="tq">
                        <span className="tq__nr mono">{questions.indexOf(q) + 1}.</span>
                        <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
            <div className="paper__foot">
              <span className="muted">
                {Object.values(answers).filter((a) => a !== undefined && a !== '').length} von {questions.length} beantwortet
              </span>
              <button type="submit" className="btn btn--ink btn--lg">
                Abgeben
              </button>
            </div>
          </form>
        )}

        {phase === 'results' && (
          <Results
            set={set}
            questions={questions}
            answers={answers}
            overrides={overrides}
            onToggle={(id) =>
              setOverrides((o) => {
                const next = new Set(o);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onAgain={start}
            onSetup={() => setPhase('setup')}
          />
        )}
      </div>
    </div>
  );
}

function PaperHead({ title }: { title: string }) {
  const [date] = useState(() => new Date().toLocaleDateString('de-AT'));
  return (
    <header className="paper__head">
      <span>
        Name: <span className="paper__hand">{OWNER_NAME}</span>
      </span>
      <span>
        Datum: <span className="paper__hand">{date}</span>
      </span>
      <span className="paper__subject">{title}</span>
    </header>
  );
}

function QuestionInput({ q, value, onChange }: { q: TestQuestion; value: TestAnswer; onChange: (v: TestAnswer) => void }) {
  if (q.kind === 'tf') {
    return (
      <fieldset className="fieldset tq__body">
        <legend className="tq__prompt">
          <span className="tq__pair">
            <span>{q.prompt}</span>
            <span className="tq__arrow" aria-label="gehört zu">
              →
            </span>
            <span>{q.shown}</span>
          </span>
        </legend>
        <div className="seg">
          {[
            { v: true, l: 'Wahr' },
            { v: false, l: 'Falsch' },
          ].map((o) => (
            <label key={o.l} className="seg__opt">
              <input type="radio" name={q.id} checked={value === o.v} onChange={() => onChange(o.v)} />
              <span>{o.l}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  if (q.kind === 'mc') {
    return (
      <fieldset className="fieldset tq__body">
        <legend className="tq__prompt">{q.prompt}</legend>
        <div className="tq__options">
          {q.options?.map((o, i) => (
            <label key={i} className="tq__option">
              <input type="radio" name={q.id} checked={value === o} onChange={() => onChange(o)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return (
    <div className="tq__body">
      <label className="tq__prompt" htmlFor={`w-${q.id}`}>
        {q.prompt}
      </label>
      <input
        id={`w-${q.id}`}
        className="input"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={sideName(q)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  );
}

function Results({
  set,
  questions,
  answers,
  overrides,
  onToggle,
  onAgain,
  onSetup,
}: {
  set: StudySet;
  questions: TestQuestion[];
  answers: Record<string, TestAnswer>;
  overrides: Set<string>;
  onToggle: (id: string) => void;
  onAgain: () => void;
  onSetup: () => void;
}) {
  const { graded, score } = gradeTest(questions, answers, overrides);
  const pct = Math.round((100 * score) / questions.length);
  const verdict =
    pct >= 90 ? 'Stark!' : pct >= 70 ? 'Gut – ein paar Lücken.' : pct >= 50 ? 'Halbe-halbe. Üb die falschen nochmal.' : 'Da geht noch was. Ab in den Lernmodus.';
  const empty = (a: TestAnswer) => a === undefined || a === '';
  const shown = (a: TestAnswer) => (a === true ? 'Wahr' : a === false ? 'Falsch' : String(a));

  return (
    <div className="paper">
      <PaperHead title={set.title} />
      <section className="grade" aria-live="polite">
        <div className="grade__mark display" aria-label={`${score} von ${questions.length} richtig`}>
          {score}
          <span>/{questions.length}</span>
        </div>
        <div>
          <p className="grade__pct mono">{pct} %</p>
          <p className="grade__verdict">{verdict}</p>
        </div>
      </section>
      <div className="grade__actions">
        <button type="button" className="btn btn--ink" onClick={onAgain}>
          Neuer Test
        </button>
        <button type="button" className="btn" onClick={onSetup}>
          Test anpassen
        </button>
        <a className="btn" href={`#/set/${set.id}/lernen`}>
          Lernmodus
        </a>
      </div>
      <ol className="paper__list paper__list--results">
        {graded.map((g, i) => (
          <li key={g.q.id} className={`tr ${g.ok ? 'is-ok' : 'is-bad'}`}>
            <span className="tr__icon">{g.ok ? <Check aria-label="richtig" /> : <X aria-label="falsch" />}</span>
            <div className="tr__body">
              <p className="tr__prompt">
                <span className="mono tq__nr">{i + 1}.</span> {g.q.kind === 'tf' ? `${g.q.prompt} → ${g.q.shown}` : g.q.prompt}
              </p>
              <p className="tr__given">
                Deine Antwort:{' '}
                {empty(g.given) ? <em>keine</em> : g.ok ? <strong>{shown(g.given)}</strong> : <s>{shown(g.given)}</s>}
                {g.overridden && ' (selbst als richtig gewertet)'}
              </p>
              {(!g.ok || g.q.kind === 'tf') && (
                <p className="tr__fix">
                  {g.q.kind === 'tf' ? (g.q.isTrue ? 'Wahr – das gehört zusammen.' : `Falsch – dazu gehört: ${g.q.answer}`) : g.q.answer}
                </p>
              )}
              {g.verdict?.hint && !g.ok && <p className="tr__hint">{g.verdict.hint}</p>}
              {g.q.kind === 'written' && (g.verdict?.result !== 'correct' || g.overridden) && typeof g.given === 'string' && g.given.trim() && (
                <button type="button" className="linkbtn" onClick={() => onToggle(g.q.id)}>
                  {g.overridden ? 'Doch als falsch werten' : 'Doch richtig'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
