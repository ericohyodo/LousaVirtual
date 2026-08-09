/**
 * Teste de acerto em coordenadas de canvas. Usado pela borracha e pela
 * ferramenta de seleção.
 */
import type { Element, Point, ShapeElement } from '../../types/board';
import { elementBounds } from './bounds';
import { lineEnds, normalizeRect } from './shapes';

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

function hitsShape(shape: ShapeElement, x: number, y: number, radius: number): boolean {
  const tolerance = radius + shape.style.strokeWidth / 2;

  if (shape.shapeType === 'line' || shape.shapeType === 'arrow') {
    const { x1, y1, x2, y2 } = lineEnds(shape);
    return distanceToSegment(x, y, x1, y1, x2, y2) <= tolerance;
  }

  const r = normalizeRect(shape);
  const filled = shape.style.fill && shape.style.fill !== 'none';

  if (filled) {
    // Com preenchimento, o interior também é clicável.
    if (shape.shapeType === 'ellipse') {
      const rx = r.width / 2 + tolerance;
      const ry = r.height / 2 + tolerance;
      if (rx <= 0 || ry <= 0) return false;
      const nx = (x - (r.x + r.width / 2)) / rx;
      const ny = (y - (r.y + r.height / 2)) / ry;
      return nx * nx + ny * ny <= 1;
    }
    return (
      x >= r.x - tolerance &&
      x <= r.x + r.width + tolerance &&
      y >= r.y - tolerance &&
      y <= r.y + r.height + tolerance
    );
  }

  // Só contorno: precisa estar perto da borda, não em qualquer ponto interno.
  if (shape.shapeType === 'ellipse') {
    const rx = r.width / 2;
    const ry = r.height / 2;
    if (rx <= 0 || ry <= 0) return false;
    const nx = (x - (r.x + rx)) / rx;
    const ny = (y - (r.y + ry)) / ry;
    const d = Math.sqrt(nx * nx + ny * ny);
    const band = tolerance / Math.min(rx, ry);
    return Math.abs(d - 1) <= band;
  }

  const edges: [number, number, number, number][] = [
    [r.x, r.y, r.x + r.width, r.y],
    [r.x + r.width, r.y, r.x + r.width, r.y + r.height],
    [r.x + r.width, r.y + r.height, r.x, r.y + r.height],
    [r.x, r.y + r.height, r.x, r.y],
  ];
  return edges.some(([ax, ay, bx, by]) => distanceToSegment(x, y, ax, ay, bx, by) <= tolerance);
}

function hits(element: Element, x: number, y: number, radius: number): boolean {
  switch (element.type) {
    case 'stroke':
      return hitsStroke(element.points, x, y, radius + element.style.strokeWidth / 2);
    case 'polyline':
      return hitsStroke(
        element.points.map((p) => ({ ...p, pressure: 1 })),
        x,
        y,
        radius + element.style.strokeWidth / 2,
      );
    case 'shape':
      return hitsShape(element, x, y, radius);
    case 'text':
    case 'checklist':
    case 'card': {
      const b = elementBounds(element);
      return (
        x >= b.x - radius &&
        x <= b.x + b.width + radius &&
        y >= b.y - radius &&
        y <= b.y + b.height + radius
      );
    }
  }
}

/** Ids dos elementos atingidos por um círculo de raio `radius` em (x, y). */
export function elementsAtPoint(elements: Element[], x: number, y: number, radius: number): string[] {
  return elements.filter((element) => hits(element, x, y, radius)).map((element) => element.id);
}

/**
 * Elemento mais "acima" sob o ponto (o último da lista é o topo visual),
 * ou null. É o que a ferramenta de seleção usa.
 */
export function topElementAtPoint(elements: Element[], x: number, y: number, radius: number): Element | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i]!;
    if (hits(element, x, y, radius)) return element;
  }
  return null;
}
