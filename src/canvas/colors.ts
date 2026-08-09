/** Utilidades de cor para adaptar a UI do canvas ao fundo escolhido. */

function parseHex(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;

  if (full.length !== 6) return null;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return null;

  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminância relativa (0 = preto, 1 = branco). */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.5;
}

function toHex(n: number): string {
  return Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
}

/** Mistura duas cores. `t = 0` devolve `a`; `t = 1` devolve `b`. */
export function mix(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;

  return `#${ca.map((channel, i) => toHex(channel + (cb[i]! - channel) * t)).join('')}`;
}

/**
 * Cor dos pontos da grade e das guias de seleção: precisa ficar visível tanto
 * sobre fundo claro quanto escuro, sem competir com o desenho.
 */
export function gridColor(background: string): string {
  return isDark(background) ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
}

/** Cor padrão de traço legível sobre o fundo — sugerida ao trocar o fundo. */
export function defaultInkFor(background: string): string {
  return isDark(background) ? '#f5f5f3' : '#1a1a1a';
}
