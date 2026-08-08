/**
 * Teste de acerto em coordenadas de canvas. Usado pela borracha (fase 1) e,
 * mais adiante, pela ferramenta de seleção.
 */
import type { Element, Point } from '../../types/board';

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const cx = ax + t * dx;
  const cy = ay + t * dy;

  return Math.hypot(px - cx, py - cy);
}

function hitsStroke(points: Point[], x: number, y: number, radius: number): boolean {
  if (points.length === 1) {
    const p = points[0]!;
    return Math.hypot(p.x - x, p.y - y) <= radius;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (distanceToSegment(x, y, a.x, a.y, b.x, b.y) <= radius) return true;
  }

  return false;
}

/**
 * Ids dos elementos atingidos por um círculo de raio `radius` em (x, y).
 * `radius` já vem em unidades de canvas (o chamador divide pelo zoom).
 */
export function elementsAtPoint(elements: Element[], x: number, y: number, radius: number): string[] {
  const hits: string[] = [];

  for (const element of elements) {
    switch (element.type) {
      case 'stroke': {
        const tolerance = radius + element.style.strokeWidth / 2;
        if (hitsStroke(element.points, x, y, tolerance)) hits.push(element.id);
        break;
      }
      case 'shape': {
        const { x: ex, y: ey, width, height } = element;
        const left = Math.min(ex, ex + width) - radius;
        const right = Math.max(ex, ex + width) + radius;
        const top = Math.min(ey, ey + height) - radius;
        const bottom = Math.max(ey, ey + height) + radius;
        if (x >= left && x <= right && y >= top && y <= bottom) hits.push(element.id);
        break;
      }
      case 'text': {
        const width = element.content.length * element.fontSize * 0.6;
        if (
          x >= element.x - radius &&
          x <= element.x + width + radius &&
          y >= element.y - element.fontSize - radius &&
          y <= element.y + radius
        ) {
          hits.push(element.id);
        }
        break;
      }
    }
  }

  return hits;
}
