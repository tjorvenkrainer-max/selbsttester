import { useState, type RefObject } from 'react';
import './AccentBar.css';

// Tasten für Sonderzeichen unter dem Eingabefeld; fügt an der Cursorposition ein, Fokus bleibt im Feld
export function AccentBar({
  chars,
  inputRef,
  value,
  onChange,
  disabled,
}: {
  chars: string[];
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [upper, setUpper] = useState(false);
  if (!chars.length) return null;
  const keep = (e: { preventDefault: () => void }) => e.preventDefault(); // Fokus nicht verlieren (Handy-Tastatur bleibt offen)

  const insert = (ch: string) => {
    const el = inputRef.current;
    const c = upper ? ch.toLocaleUpperCase('fr') : ch;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + c + value.slice(end));
    setUpper(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + c.length, start + c.length);
    });
  };

  return (
    <div className="accents" role="group" aria-label="Sonderzeichen einfügen">
      <button
        type="button"
        className="accents__key accents__shift"
        aria-pressed={upper}
        aria-label="Großbuchstabe"
        disabled={disabled}
        onPointerDown={keep}
        onMouseDown={keep}
        onClick={() => setUpper((u) => !u)}
      >
        ⇧
      </button>
      {chars.map((ch) => (
        <button key={ch} type="button" className="accents__key" disabled={disabled} onPointerDown={keep} onMouseDown={keep} onClick={() => insert(ch)}>
          {upper ? ch.toLocaleUpperCase('fr') : ch}
        </button>
      ))}
    </div>
  );
}
