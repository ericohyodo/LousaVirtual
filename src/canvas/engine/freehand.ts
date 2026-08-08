/**
 * Wrapper fino sobre perfect-freehand: converte a sequência de pontos
 * capturada pelos Pointer Events em um path SVG preenchido (`d`).
 *
 * O traço é um *outline* preenchido, não uma linha com stroke-width —
 * é isso que permite variar a espessura ponto a ponto conforme a pressão.
 */
import getStroke from 'perfect-freehand';
import type { Point, StrokeElement } from '../../types/board';

export interface StrokeOptions {
  /** Espessura base em unidades de canvas. */
  size: number;
  /** true quando o dispositivo não reporta pressão real (mouse/touch). */
  simulatePressure: boolean;
}

function freehandOptions({ size, simulatePressure }: StrokeOptions) {
  return {
    size,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    simulatePressure,
    easing: (t: number) => t,
    last: true,
    start: { taper: 0, cap: true },
    end: { taper: 0, cap: true },
  };
}

/** Converte pontos do polígono do traço em um `d` de SVG com curvas quadráticas. */
function outlineToPath(outline: number[][]): string {
  if (outline.length === 0) return '';

  const d: (string | number)[] = ['M'];
  const first = outline[0]!;
  d.push(round(first[0]!), round(first[1]!), 'Q');

  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!;
    const b = outline[(i + 1) % outline.length]!;
    d.push(round(a[0]!), round(a[1]!), round((a[0]! + b[0]!) / 2), round((a[1]! + b[1]!) / 2));
  }

  d.push('Z');
  return d.join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Gera o path SVG de um conjunto de pontos crus. */
export function getStrokePath(points: Point[], options: StrokeOptions): string {
  const input = points.map((p) => [p.x, p.y, p.pressure]);
  return outlineToPath(getStroke(input, freehandOptions(options)) as number[][]);
}

/** Gera o path SVG de um StrokeElement já persistido. */
export function getElementPath(element: StrokeElement, simulatePressure = false): string {
  return getStrokePath(element.points, {
    size: element.style.strokeWidth,
    simulatePressure,
  });
}

/** Bounding box de um traço, em coordenadas de canvas (sem considerar espessura). */
export function getStrokeBounds(points: Point[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return { minX, minY, maxX, maxY };
}
