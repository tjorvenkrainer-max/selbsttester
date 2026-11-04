// Logo: zwei Karteikarten, die vordere mit roter Kopflinie
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="logomark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="6.5" width="22" height="15.5" rx="2.5" transform="rotate(-9 16 14)" fill="var(--marker)" stroke="var(--ink)" strokeWidth="2" />
      <rect x="4.5" y="10" width="23" height="16" rx="2.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="2" />
      <line x1="8" y1="15" x2="24" y2="15" stroke="var(--rule-red)" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="19" x2="21" y2="19" stroke="var(--rule-blue)" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="22.5" x2="17" y2="22.5" stroke="var(--rule-blue)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark__text">
      Tjorven <span className="marker">lernt</span>
    </span>
  );
}
