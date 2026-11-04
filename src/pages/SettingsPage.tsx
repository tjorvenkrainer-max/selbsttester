import { useRef, useState } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { clearAll, replaceAll, updateSettings, useData } from '../lib/store';
import { backupJson, sanitize } from '../lib/storage';
import { downloadText, plural } from '../lib/format';
import { BOX_LABELS } from '../lib/srs';
import type { AnswerWith, QuestionTypes, Theme } from '../lib/types';
import { APP_NAME } from '../config';
import { useTitle } from '../hooks';
import { Segmented } from '../components/common';
import './SettingsPage.css';

export function SettingsPage() {
  useTitle('Einstellungen');
  const data = useData();
  const s = data.settings;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const cardCount = data.sets.reduce((n, set) => n + set.cards.length, 0);

  const loadBackup = async (file: File) => {
    try {
      const next = sanitize(JSON.parse(await file.text()));
      if (!next) throw new Error('kein Backup');
      const cards = next.sets.reduce((n, set) => n + set.cards.length, 0);
      const ok = confirm(
        `Backup mit ${plural(next.sets.length, 'Set', 'Sets')} (${plural(cards, 'Karte', 'Karten')}) laden? Deine aktuellen ${plural(data.sets.length, 'Set wird', 'Sets werden')} ersetzt.`,
      );
      if (!ok) return;
      replaceAll(next);
      setMsg({ ok: true, text: `Backup geladen: ${plural(next.sets.length, 'Set', 'Sets')}.` });
    } catch {
      setMsg({ ok: false, text: `Diese Datei ist kein Backup von ${APP_NAME}.` });
    }
  };

  return (
    <div className="wrap settings">
      <h1 className="display settings__title">Einstellungen</h1>

      <section className="panel settings__section" aria-labelledby="s-look">
        <h2 id="s-look" className="panel__title">
          Darstellung
        </h2>
        <Segmented<Theme>
          name="theme"
          label="Farbschema"
          value={s.theme}
          onChange={(theme) => updateSettings({ theme })}
          options={[
            { value: 'system', label: 'Wie das Gerät' },
            { value: 'light', label: 'Hell' },
            { value: 'dark', label: 'Dunkel' },
          ]}
        />
      </section>

      <section className="panel settings__section" aria-labelledby="s-learn">
        <h2 id="s-learn" className="panel__title">
          Lernen
        </h2>
        <Segmented<QuestionTypes>
          name="qt"
          label="Fragen"
          value={s.questionTypes}
          onChange={(questionTypes) => updateSettings({ questionTypes })}
          options={[
            { value: 'both', label: 'Auswahl, dann Schreiben' },
            { value: 'mc', label: 'Nur Auswahl' },
            { value: 'written', label: 'Nur Schreiben' },
          ]}
        />
        <Segmented<AnswerWith>
          name="aw"
          label="Antworten mit"
          value={s.answerWith}
          onChange={(answerWith) => updateSettings({ answerWith })}
          options={[
            { value: 'term', label: 'Begriff' },
            { value: 'definition', label: 'Definition' },
            { value: 'mixed', label: 'Gemischt' },
          ]}
        />
        <Segmented
          name="rs"
          label="Karten pro Runde"
          value={String(s.roundSize)}
          onChange={(v) => updateSettings({ roundSize: Number(v) })}
          options={['5', '7', '10', '15'].map((v) => ({ value: v, label: v }))}
        />
      </section>

      <section className="panel settings__section" aria-labelledby="s-data">
        <h2 id="s-data" className="panel__title">
          Deine Daten
        </h2>
        <p>
          {plural(data.sets.length, 'Set', 'Sets')} mit {plural(cardCount, 'Karte', 'Karten')} – gespeichert nur in diesem Browser auf diesem
          Gerät. Löschst du die Browserdaten, sind sie weg. Lad ab und zu ein Backup herunter. So bringst du deine Sets auch auf ein anderes
          Gerät: dort öffnen und „Backup laden“.
        </p>
        <div className="settings__row">
          <button
            type="button"
            className="btn"
            onClick={() => downloadText(`tjorven-lernt-backup-${new Date().toISOString().slice(0, 10)}.json`, backupJson(data), 'application/json')}
          >
            <Download aria-hidden="true" /> Backup herunterladen
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            <Upload aria-hidden="true" /> Backup laden
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void loadBackup(f);
            }}
          />
        </div>
        {msg && (
          <p className={msg.ok ? 'settings__ok' : 'field-error'} role="status">
            {msg.text}
          </p>
        )}
        <div className="settings__danger">
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              if (confirm(`Alle ${plural(data.sets.length, 'Set', 'Sets')} und deinen Lernstand löschen? Das lässt sich nicht rückgängig machen.`)) {
                clearAll();
                setMsg({ ok: true, text: 'Alles gelöscht.' });
              }
            }}
          >
            <Trash2 aria-hidden="true" /> Alles löschen
          </button>
        </div>
      </section>

      <section className="panel settings__section" aria-labelledby="s-how">
        <h2 id="s-how" className="panel__title">
          So funktioniert der Karteikasten
        </h2>
        <ol className="settings__steps">
          <li>Neue Karten liegen auf dem Stapel. Im Lernmodus wählst du die Antwort zuerst aus, danach schreibst du sie selbst.</li>
          <li>Hast du beides geschafft, kommt die Karte in Fach 1 und ist am nächsten Tag wieder dran.</li>
          <li>
            Richtig wiederholt heißt ein Fach weiter. Die Abstände: {BOX_LABELS.slice(1).join(', ')}.
          </li>
          <li>Vergessen heißt zurück auf den Stapel – und dann wieder von vorne.</li>
          <li>Ein neuer Lerntag beginnt um 4 Uhr früh. Wer um Mitternacht lernt, zählt noch zum Vortag.</li>
        </ol>
        <p className="muted">
          Am Handy: im Browser-Menü „Zum Startbildschirm hinzufügen“. Dann startet {APP_NAME} wie eine App und läuft nach dem ersten Öffnen auch ohne
          Internet (wenn die Seite über https läuft).
        </p>
      </section>
    </div>
  );
}
