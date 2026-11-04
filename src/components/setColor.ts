import type { CSSProperties } from 'react';

// Fachfarbe eines Sets als CSS-Variable --set
export const setColorStyle = (color: string) => ({ '--set': `var(--c-${color})` }) as CSSProperties;
