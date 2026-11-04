// Kurze Töne für richtig/falsch – im Browser erzeugt (Web Audio), keine Sounddateien
import { getData } from './store';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!getData().settings.sound) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume(); // Handy: erst nach Antippen erlaubt
    return ctx;
  } catch {
    return null;
  }
}

// ein Ton mit weichem Ein- und Ausklingen (kein Knacksen)
function tone(a: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, volume: number) {
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = a.currentTime + at;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Richtig: zwei helle Töne aufwärts */
export function playCorrect() {
  const a = audio();
  if (!a) return;
  tone(a, 880, 0, 0.14, 'triangle', 0.18);
  tone(a, 1318.5, 0.09, 0.22, 'triangle', 0.16);
}

/** Falsch: zwei tiefe Töne abwärts, kurz und leise */
export function playWrong() {
  const a = audio();
  if (!a) return;
  tone(a, 233, 0, 0.16, 'sine', 0.22);
  tone(a, 175, 0.13, 0.24, 'sine', 0.2);
}
