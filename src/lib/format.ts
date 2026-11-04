import { learningDaysBetween } from './srs';

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const dateFmt = new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long' });
const longDateFmt = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });

const safe = (fmt: Intl.DateTimeFormat, ts: number) => (Number.isFinite(new Date(ts).getTime()) ? fmt.format(ts) : '–');
export const formatDate = (ts: number) => safe(dateFmt, ts);
export const formatLongDate = (ts: number) => safe(longDateFmt, ts);

/** „heute“, „morgen“, „übermorgen“, „in 5 Tagen“, „am 12. Dezember“ (nach Lerntagen ab 4 Uhr) */
export function relativeDay(ts: number, now = Date.now()): string {
  const diff = learningDaysBetween(now, ts);
  if (diff <= 0) return 'heute';
  if (diff === 1) return 'morgen';
  if (diff === 2) return 'übermorgen';
  if (diff < 7) return `in ${diff} Tagen`;
  return `am ${formatDate(ts)}`;
}

/** 12,3 s oder 1:05,2 min */
export function formatTime(ms: number): string {
  const tenths = Math.floor(ms / 100);
  const s = Math.floor(tenths / 10);
  const t = tenths % 10;
  if (s < 60) return `${s},${t} s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')},${t} min`;
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'set'
  );
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
