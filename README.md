# Tjorven lernt

Meine eigene Lernkarten-App: Sets anlegen, Karteikarten umdrehen, mit dem **Karteikasten-System** lernen,
Test machen, Paare zuordnen. Läuft komplett im Browser – kein Server, kein Account.

## Was sie kann

- **Lernen** – Runden mit 7 Karten. Jede Karte erst per Auswahl, dann selbst schreiben. Was sitzt, kommt in den
  Karteikasten: Fach 1–5 mit 1 Tag, 3 Tagen, 1 Woche, 2 Wochen, 1 Monat Abstand. Vergessenes fällt zurück auf den Stapel.
- **Tolerante Antwortprüfung** – Groß/klein egal, `(the) exam` akzeptiert auch `exam`, bei `groß, hoch` reicht eins.
  Tippfehler oder fehlende Umlaute → „fast richtig“ mit „Ich hatte recht“. Lange Definitionen: aufdecken, selbst bewerten.
- **Karteikarten** – umdrehen (Leertaste/Tippen), blättern (Pfeile/Wischen), sortieren in gewusst / noch nicht.
- **Test** – Wahr/Falsch, Auswahl, Schreiben. Auswertung im Rotstift-Stil.
- **Zuordnen** – 6 Paare auf Zeit, Bestzeit pro Set.
- **Import** – Liste einfügen (Tab, „ - “, „=“, „:“ …), z. B. ein Export aus einer anderen Lernkarten-App.
- **Backup** – alles als JSON herunterladen und wieder laden (auch zum Umziehen auf ein anderes Gerät).
- Dunkelmodus, Tastaturkürzel, offline nutzbar (nach dem ersten Öffnen, wenn die Seite über https läuft).

## Starten

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

## Veröffentlichen mit GitHub Pages (automatisch)

Jeder Push auf `main` baut die App und stellt sie online (`.github/workflows/deploy.yml`). Einmalig einschalten:
Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Danach unter **Actions →
„Seite veröffentlichen“ → Run workflow** starten. Adresse: `https://tjorvenkrainer-max.github.io/<repo-name>/`

## Auf einen eigenen Webspace

```bash
npm run build
```

Den Inhalt von `dist/` auf den Webspace hochladen – ins Hauptverzeichnis oder in einen Unterordner
(z. B. `deine-seite.at/lernen/`). Keine Server-Konfiguration nötig (Hash-Routing, relative Pfade).
Die App ist auf `noindex` gestellt und taucht nicht bei Google auf.

**Wichtig:** Die Daten liegen im Browser (localStorage) – pro Gerät und pro Adresse. Vor einem Umzug auf eine
neue Adresse in den Einstellungen ein Backup herunterladen und dort wieder laden.

## Aufbau

| Ordner / Datei | Inhalt |
|---|---|
| `src/lib/learn.ts` | Lernrunden (Auswahl → Schreiben, Arbeitsstapel) |
| `src/lib/srs.ts` | Karteikasten: Fächer, Fälligkeit (Lerntag beginnt um 4 Uhr) |
| `src/lib/answer.ts` | Antwortprüfung |
| `src/lib/store.ts` | Daten, Speichern, Aktionen |
| `src/pages/` | Seiten: Übersicht, Set, Editor, Lernen, Karteikarten, Test, Zuordnen, Einstellungen |
| `src/styles/tokens.css` | Farben und Schriften |
| `src/config.ts` | Name der App |
| `capture/plan.md` | Plan und Prüfprotokoll |

Schriften: Shantell Sans, Atkinson Hyperlegible Next und Mono (SIL Open Font License, lokal eingebunden).
Icons: Lucide (ISC-Lizenz).
