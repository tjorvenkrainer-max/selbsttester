# Plan: Tjorven lernt

**Lane: Reference build.** quizlet.com gehört Quizlet Inc., nicht dem User. Übernommen wird nur das Muster
(Set-Übersicht, Lernmodi Karteikarten / Lernen / Test / Zuordnen). Name, Logo, Texte, Farben, Schriften und Bilder
sind eigene. Antwort des Users (04.11.2026): „Eigene Lern App für mich … App die wirklich funktioniert, vor allem die
Lernfunktion … gespeichert auf GitHub, damit ich es eventuell auf meine eigene Webseite tun kann.“

**Capture:** nicht möglich. quizlet.com wird von der Netzwerk-Policy dieser Umgebung blockiert (CONNECT 403).
Kein Workaround. Der Muster-Brief stützt sich auf den allgemein bekannten Aufbau von Lernkarten-Apps.

## Muster-Brief (was übernommen wird)

- Startseite mit den eigenen Sets als Kacheln (Titel, Anzahl Karten, Lernstand).
- Set-Seite: Titel, vier Lernmodi als große Buttons, darunter die Kartenliste (Begriff | Definition).
- Karteikarten: eine große Karte, Klick/Leertaste dreht um, Pfeile blättern, optional sortieren (gewusst / noch nicht).
- Lernen: Runden mit ~7 Karten. Jede Karte erst per Auswahl (4 Optionen), dann schriftlich. Falsche kommen wieder.
- Test: gemischte Fragen (Wahr/Falsch, Auswahl, Schreiben), am Ende Auswertung.
- Zuordnen: Kacheln mit Begriffen und Definitionen, Paare finden, auf Zeit.
- Editor: Zeilen Begriff | Definition, Tab springt zur nächsten Karte, Import aus eingefügtem Text.

## Eigenes (nicht von Quizlet)

- Name „Tjorven lernt“, eigenes Logo (Karteikarten-Stapel), eigene Texte.
- Look „Schulheft“: Karopapier-Hintergrund, Karteikarten mit roter Kopflinie und blauen Linien,
  Textmarker-Gelb als Hauptaktion. Schriften: Shantell Sans (Display, sparsam), Atkinson Hyperlegible Next
  (Fließtext, gut unterscheidbare Buchstaben), Atkinson Hyperlegible Mono (Zahlen, Timer). Alle OFL.
- Signatur: der **Karteikasten** (Leitner-System) – Stapel + 5 Fächer, fällige Karten gelb markiert.
  Richtig gewusst → ein Fach weiter (1 Tag, 3 Tage, 1 Woche, 2 Wochen, 1 Monat). Vergessen → zurück auf den Stapel.
- Lernen kombiniert Runden (Auswahl → Schreiben) mit Wiederholung nach Fächern über Tage hinweg.

## Technik

- Stack: Vite 8 + React 19 + TypeScript, plain CSS mit Custom Properties, lucide-react Icons, Vitest.
- Hash-Routing und `base: './'`: läuft in jedem Unterordner jedes statischen Hostings ohne Server-Konfiguration.
- Daten: localStorage (pro Browser) + JSON-Backup zum Herunterladen/Laden. Keine Accounts, kein Server.
- Breiten für Checks: 390, 768, 1440.

## Reihenfolge

1. Tokens, Schriften, App-Shell, Router, Store
2. Lernlogik (Antwortprüfung, Fächer, Runden) mit Unit-Tests
3. Startseite, Set-Seite, Editor + Import
4. Lernen, Karteikarten, Test, Zuordnen
5. Einstellungen, Backup, Offline (Service Worker), Manifest
6. Prüfen: Screenshots 390/768/1440, Tastatur, Fokus, Kontrast (WCAG 2.2 AA), Konsole leer, keine fremden Requests

## Abnahme (Reference build)

Kein Pixelvergleich mit Quizlet. Abnahme durch den User. Side-by-side-Check: Name, Logo, Palette, Schriften,
Texte und Bilder sind eigene.

## Prüfprotokoll (04.11.2026)

- 33 Unit-Tests grün: Antwortprüfung, Fächer/Fälligkeit, Lernrunden, Import, Test.
- Alle Modi bei 390, 768 und 1440 px durchgeklickt, plus Dunkelmodus: keine Konsolenfehler,
  keine Requests an fremde Domains (Schriften liegen im Build).
- Tastatur: Tab-Reihenfolge logisch, Fokusring 3 px sichtbar, Lernsitzung komplett ohne Maus.
- Kontrast (WCAG 2.2 AA): alle Text-Paare ≥ 4,5:1 hell und dunkel, Rahmen von Eingabefeldern ≥ 3:1.
  Einzige Abweichung: Fokusring direkt neben Gelb im Dunkelmodus 1,6:1 – unkritisch, weil der Ring
  2 px Abstand hat und auf dem Hintergrund liegt (≥ 7,5:1).
- Offline: Service Worker übernimmt, App lädt ohne Netz. Unterordner: läuft unter `/lernen/`.
- Side-by-side: Name, Logo, Palette, Schriften, Texte und Bilder sind eigene. Kein Material von quizlet.com
  verwendet (die Seite war in dieser Umgebung gar nicht erreichbar).

## Bewusst weggelassen

- Login, Sync zwischen Geräten (bräuchte einen Server) – Backup-Datei als Brücke.
- Bilder auf Karten, Vorlesen – mögliche nächste Schritte.
