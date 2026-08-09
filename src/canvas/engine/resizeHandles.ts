import type { Element, ShapeElement } from '../../types/board';
import { cardBounds } from './shapes';
import { normalizeRect, lineEnds } from './shapes';

export type RectCorner = 'nw' | 'ne' | 'se' | 'sw';
export type ShapeHandle = RectCorner | 'start' | 'end';

export function shapeHandles(element: ShapeElement): [ShapeHandle, number, number][] {
  if (element.shapeType === 'line' || element.shapeType === 'arrow') {
    const { x1, y1, x2, y2 } = lineEnds(element);
    return [
      ['start', x1, y1],
      ['end', x2, y2],
    ];
  }

  const r = normalizeRect(element);
  return [
    ['nw', r.x, r.y],
    ['ne', r.x + r.width, r.y],
    ['se', r.x + r.width, r.y + r.height],
    ['sw', r.x, r.y + r.height],
  ];
}

export function shapeHandleAt(
  elements: Element[],
  selectedIds: string[],
  x: number,
  y: number,
  radius: number,
): { id: string; handle: ShapeHandle } | null {
  if (selectedIds.length !== 1) return null;
  const id = selectedIds[0]!;
  const element = elements.find((e) => e.id === id);
  if (element?.type !== 'shape' || element.locked) return null;

  for (const [handle, cx, cy] of shapeHandles(element)) {
    if (Math.hypot(cx - x, cy - y) <= radius) return { id, handle };
  }
  return null;
}

export function polylineVertexAt(
  elements: Element[],
  selectedIds: string[],
  x: number,
  y: number,
  radius: number,
): { id: string; index: number } | null {
  if (selectedIds.length !== 1) return null;
  const id = selectedIds[0]!;
  const element = elements.find((e) => e.id === id);
  if (element?.type !== 'polyline' || element.locked) return null;

  for (let i = 0; i < element.points.length; i++) {
    const p = element.points[i]!;
    if (Math.hypot(p.x - x, p.y - y) <= radius) return { id, index: i };
  }
  return null;
}

export { cardBounds };
