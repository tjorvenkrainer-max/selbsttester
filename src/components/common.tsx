// Kleine wiederverwendbare Bausteine
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { CardStatus } from '../lib/srs';

export function StatusBar({ counts }: { counts: Record<CardStatus, number> }) {
  const order: CardStatus[] = ['known', 'due', 'learning', 'new'];
  return (
    <div className="statusbar" aria-hidden="true">
      {order.map((s) =>
        counts[s] > 0 ? <span key={s} className={`statusbar__seg statusbar__seg--${s}`} style={{ flexGrow: counts[s] }} /> : null,
      )}
    </div>
  );
}

/** Radiogruppe als Segment-Schalter */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  label,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <fieldset className="fieldset">
      <legend className="label">{label}</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.value} className="seg__opt">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Modaler Dialog auf Basis von <dialog> (Fokusfalle und Esc gibt's gratis) */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const downOnBackdrop = useRef(false);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // nur schließen, wenn Klick auf dem Hintergrund begann und endete (nicht beim Markieren von Text)
      onMouseDown={(e) => (downOnBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => e.target === e.currentTarget && downOnBackdrop.current && onClose()}
    >
      {open && (
        <>
          <div className="sheet__head">
            <h2 id="sheet-title" className="sheet__title">
              {title}
            </h2>
            <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Schließen">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="sheet__body">{children}</div>
          {footer && <div className="sheet__foot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export function NotFound({ what = 'Seite' }: { what?: string }) {
  return (
    <div className="wrap notfound">
      <h1 className="display">{what} nicht gefunden</h1>
      <p className="muted">Vielleicht wurde es gelöscht oder der Link ist falsch.</p>
      <a className="btn btn--ink" href="#/">
        Zu deinen Sets
      </a>
    </div>
  );
}
