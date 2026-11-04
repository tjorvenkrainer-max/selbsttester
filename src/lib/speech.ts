// Vorlesen über die eingebaute Sprachausgabe des Browsers (kein fremder Server)
import { useEffect, useState } from 'react';

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = synth()?.getVoices() ?? [];
  const exact = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
  return exact ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
}

export function speak(text: string, lang: string) {
  const s = synth();
  if (!s || !lang) return;
  s.cancel(); // laufende Ausgabe abbrechen
  const clean = text.replace(/\s*\/\s*/g, ', ').replace(/\.{3}|…/g, ' ').replace(/[()]/g, '');
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = lang;
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.rate = 0.9;
  s.speak(u);
}

/** true, wenn der Browser die Sprache vorlesen kann (Stimmen laden teils verzögert) */
export function useCanSpeak(lang: string): boolean {
  const [voices, setVoices] = useState(() => synth()?.getVoices().length ?? 0);
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const on = () => setVoices(s.getVoices().length);
    s.addEventListener('voiceschanged', on);
    return () => s.removeEventListener('voiceschanged', on);
  }, []);
  if (!lang || !synth()) return false;
  if (voices === 0) return true; // Liste noch leer → einfach versuchen
  return !!pickVoice(lang);
}
