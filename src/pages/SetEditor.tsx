import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { ArrowLeftRight, FileText, Plus, Trash2 } from 'lucide-react';
import { getData, saveSet } from '../lib/store';
import { SET_COLORS, type SetColor, type StudySet } from '../lib/types';
import { uid } from '../lib/random';
import { plural } from '../lib/format';
import type { ImportedCard } from '../lib/importText';
import { DRAFT_PREFIX } from '../config';
import { navigate } from '../router';
import { useTitle } from '../hooks';
import { NotFound } from '../components/common';
import { ImportDialog } from './ImportDialog';
import './Editor.css';

interface Row {
  key: string;
  id?: string;
  term: string;
  definition: string;
}

interface Draft {
  title: string;
  description: string;
  color: SetColor;
  rows: Row[];
}

const emptyRow = (): Row => ({ key: uid(), term: '', definition: '' });

function fromSet(set: StudySet | undefined): Draft {
  if (!set) {
    const color = SET_COLORS[getData().sets.length % SET_COLORS.length].id;
    return { title: '', description: '', color, rows: [emptyRow(), emptyRow(), emptyRow()] };
  }
  return {
    title: set.title,
    description: set.description,
    color: set.color,
    rows: set.cards.map((c) => ({ key: c.id, id: c.id, term: c.term, definition: c.definition })),
  };
}

// Vergleich ohne leere Zeilen und Zeilen-Schlüssel
const fingerprint = (d: Draft) =>
  JSON.stringify([d.title.trim(), d.description.trim(), d.color, d.rows.filter((r) => r.term.trim() || r.definition.trim()).map((r) => [r.id, r.term, r.definition])]);

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return Array.isArray(d.rows) ? d : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, d: Draft | null) {
  try {
    if (d) localStorage.setItem(key, JSON.stringify(d));
    else localStorage.removeItem(key);
  } catch {
    /* kein Speicher – Entwurf geht dann eben verloren */
  }
}

export function SetEditor({ id, openImport = false }: { id?: string; openImport?: boolean }) {
  const existing = id ? getData().sets.find((s) => s.id === id) : undefined;
  if (id && !existing) return <NotFound what="Set" />;
  return <EditorForm key={id ?? 'neu'} existing={existing} openImport={openImport} />;
}

function EditorForm({ existing, openImport }: { existing?: StudySet; openImport: boolean }) {
  useTitle(existing ? `${existing.title} bearbeiten` : 'Neues Set');
  const draftKey = DRAFT_PREFIX + (existing?.id ?? 'neu');
  const initial = useMemo(() => fromSet(existing), [existing]);

  const [boot] = useState(() => {
    const saved = readDraft(draftKey);
    return saved && fingerprint(saved) !== fingerprint(initial) ? { draft: saved, restored: true } : { draft: initial, restored: false };
  });
  const [draft, setDraft] = useState<Draft>(boot.draft);
  const [restored, setRestored] = useState(boot.restored);
  const [importText, setImportText] = useState<string | null>(openImport ? '' : null);
  const [errors, setErrors] = useState<{ title?: string; row?: { key: string; side: 'term' | 'definition'; message: string } }>({});
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const focusTarget = useRef<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const dirty = fingerprint(draft) !== fingerprint(initial);

  // Entwurf mitschreiben, damit nichts verloren geht
  useEffect(() => {
    writeDraft(draftKey, dirty ? draft : null);
  }, [draft, dirty, draftKey]);

  // nach dem Anlegen einer Zeile deren Begriff-Feld fokussieren
  useEffect(() => {
    if (!focusTarget.current) return;
    fields.current.get(focusTarget.current)?.focus();
    focusTarget.current = null;
  }, [draft.rows]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const setRow = (key: string, p: Partial<Row>) => {
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...p } : r)) }));
    if (errors.row?.key === key) setErrors((e) => ({ ...e, row: undefined }));
  };
  const addRow = (focus = false) => {
    const row = emptyRow();
    setDraft((d) => ({ ...d, rows: [...d.rows, row] }));
    if (focus) focusTarget.current = `${row.key}:term`;
  };
  const removeRow = (key: string) => setDraft((d) => ({ ...d, rows: d.rows.filter((r) => r.key !== key) }));
  const swapAll = () => setDraft((d) => ({ ...d, rows: d.rows.map((r) => ({ ...r, term: r.definition, definition: r.term })) }));

  const addImported = (cards: ImportedCard[]) => {
    setDraft((d) => {
      const filled = d.rows.filter((r) => r.term.trim() || r.definition.trim());
      return { ...d, rows: [...filled, ...cards.map((c) => ({ key: uid(), term: c.term, definition: c.definition }))] };
    });
    setImportText(null);
  };

  const save = () => {
    const title = draft.title.trim();
    const rows = draft.rows.filter((r) => r.term.trim() || r.definition.trim());
    const next: typeof errors = {};
    if (!title) next.title = 'Gib dem Set einen Titel.';
    const bad = rows.find((r) => !r.term.trim() || !r.definition.trim());
    if (bad) {
      const side = bad.term.trim() ? 'definition' : 'term';
      const nr = draft.rows.indexOf(bad) + 1;
      next.row = { key: bad.key, side, message: `Bei Karte ${nr} fehlt ${side === 'term' ? 'der Begriff' : 'die Definition'}.` };
    }
    setErrors(next);
    if (next.title) return titleRef.current?.focus();
    if (next.row) return fields.current.get(`${next.row.key}:${next.row.side}`)?.focus();

    const id = saveSet({
      id: existing?.id,
      title,
      description: draft.description,
      color: draft.color,
      cards: rows.map((r) => ({ id: r.id, term: r.term, definition: r.definition })),
    });
    writeDraft(draftKey, null);
    navigate(`/set/${id}`, true);
  };

  const cancel = () => {
    if (dirty && !confirm('Änderungen verwerfen?')) return;
    writeDraft(draftKey, null);
    navigate(existing ? `/set/${existing.id}` : '/', true);
  };

  const discardDraft = () => {
    writeDraft(draftKey, null);
    setDraft(initial);
    setRestored(false);
  };

  const onDefinitionKey = (e: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.key === 'Tab' && !e.shiftKey && index === draft.rows.length - 1) {
      e.preventDefault(); // Tab in der letzten Zeile → neue Karte
      addRow(true);
    }
  };

  // Liste in ein Feld eingefügt → Import anbieten
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (text.includes('\n') && /\t|\s[-–=:]\s/.test(text)) {
      e.preventDefault();
      setImportText(text);
    }
  };

  const filledCount = draft.rows.filter((r) => r.term.trim() && r.definition.trim()).length;

  return (
    <form
      className="wrap editor"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          save();
        }
      }}
    >
      <header className="editor__head">
        <h1 className="display editor__title">{existing ? 'Set bearbeiten' : 'Neues Set'}</h1>
        <p className="muted editor__hint">
          <span className="kbd">Tab</span> in der letzten Zeile legt die nächste Karte an. <span className="kbd">Strg</span> +{' '}
          <span className="kbd">Enter</span> speichert.
        </p>
      </header>

      {restored && (
        <div className="editor__restored" role="status">
          <span>Ungespeicherten Entwurf wiederhergestellt.</span>
          <button type="button" className="linkbtn" onClick={discardDraft}>
            Entwurf verwerfen
          </button>
        </div>
      )}

      <section className="panel editor__meta">
        <div>
          <label className="label" htmlFor="set-title">
            Titel
          </label>
          <input
            id="set-title"
            ref={titleRef}
            className="input editor__titleinput"
            value={draft.title}
            onChange={(e) => {
              patch({ title: e.target.value });
              if (errors.title) setErrors((x) => ({ ...x, title: undefined }));
            }}
            placeholder="z. B. Englisch Unit 4"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? 'title-error' : undefined}
            autoFocus={!existing && !openImport}
          />
          {errors.title && (
            <p id="title-error" className="field-error">
              {errors.title}
            </p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="set-desc">
            Beschreibung <span className="muted">(optional)</span>
          </label>
          <input id="set-desc" className="input" value={draft.description} onChange={(e) => patch({ description: e.target.value })} placeholder="z. B. Schularbeit am Freitag" />
        </div>
        <fieldset className="fieldset">
          <legend className="label">Farbe</legend>
          <div className="swatches">
            {SET_COLORS.map((c) => (
              <label key={c.id} className="swatch" style={{ background: `var(--c-${c.id})` }}>
                <input type="radio" name="set-color" value={c.id} checked={draft.color === c.id} onChange={() => patch({ color: c.id })} />
                <span className="visually-hidden">{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="editor__cards" aria-labelledby="cards-head">
        <div className="editor__toolbar">
          <h2 id="cards-head" className="editor__cardstitle">
            Karten <span className="muted mono">{filledCount}</span>
          </h2>
          <div className="editor__tools">
            <button type="button" className="btn btn--sm" onClick={() => setImportText('')}>
              <FileText aria-hidden="true" /> Text importieren
            </button>
            <button type="button" className="btn btn--sm" onClick={swapAll} disabled={!draft.rows.length}>
              <ArrowLeftRight aria-hidden="true" /> Seiten tauschen
            </button>
          </div>
        </div>

        <ol className="rows">
          {draft.rows.map((r, i) => {
            const err = errors.row?.key === r.key ? errors.row : undefined;
            return (
              <li key={r.key} className="row">
                <span className="row__nr mono" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="row__fields">
                  <AutoTextarea
                    label={`Begriff ${i + 1}`}
                    value={r.term}
                    placeholder="Begriff"
                    invalid={err?.side === 'term'}
                    inputRef={(el) => (el ? fields.current.set(`${r.key}:term`, el) : fields.current.delete(`${r.key}:term`))}
                    onChange={(v) => setRow(r.key, { term: v })}
                    onPaste={onPaste}
                  />
                  <AutoTextarea
                    label={`Definition ${i + 1}`}
                    value={r.definition}
                    placeholder="Definition"
                    invalid={err?.side === 'definition'}
                    inputRef={(el) => (el ? fields.current.set(`${r.key}:definition`, el) : fields.current.delete(`${r.key}:definition`))}
                    onChange={(v) => setRow(r.key, { definition: v })}
                    onKeyDown={(e) => onDefinitionKey(e, i)}
                  />
                  {err && <p className="field-error row__error">{err.message}</p>}
                </div>
                <button type="button" className="btn btn--ghost btn--icon row__del" onClick={() => removeRow(r.key)} aria-label={`Karte ${i + 1} löschen`}>
                  <Trash2 aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ol>

        <button type="button" className="btn btn--block editor__add" onClick={() => addRow(true)}>
          <Plus aria-hidden="true" /> Karte hinzufügen
        </button>
      </section>

      <div className="editor__bar">
        <div className="wrap editor__barinner">
          <span className="muted editor__count">{plural(filledCount, 'Karte', 'Karten')}</span>
          <button type="button" className="btn" onClick={cancel}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn--ink">
            Speichern
          </button>
        </div>
      </div>

      {importText !== null && <ImportDialog initialText={importText} onClose={() => setImportText(null)} onImport={addImported} />}
    </form>
  );
}

function AutoTextarea({
  label,
  value,
  placeholder,
  invalid,
  inputRef,
  onChange,
  onKeyDown,
  onPaste,
}: {
  label: string;
  value: string;
  placeholder: string;
  invalid?: boolean;
  inputRef: (el: HTMLTextAreaElement | null) => void;
  onChange: (v: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 3}px`;
  }, [value]);
  return (
    <label className="row__field">
      <span className="row__label">{label.replace(/ \d+$/, '')}</span>
      <textarea
        ref={(el) => {
          ref.current = el;
          inputRef(el);
        }}
        className="textarea row__input"
        rows={1}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />
    </label>
  );
}
