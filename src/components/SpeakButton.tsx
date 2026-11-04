import { Volume2 } from 'lucide-react';
import { speak, useCanSpeak } from '../lib/speech';

// Lautsprecher-Knopf; erscheint nur, wenn das Set eine Sprache hat und der Browser sie kann
export function SpeakButton({ text, lang, className = '' }: { text: string; lang: string; className?: string }) {
  const can = useCanSpeak(lang);
  if (!can) return null;
  return (
    <button
      type="button"
      className={`btn btn--ghost btn--sm btn--icon speak ${className}`}
      aria-label="Vorlesen"
      title="Vorlesen"
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang);
      }}
    >
      <Volume2 aria-hidden="true" />
    </button>
  );
}
