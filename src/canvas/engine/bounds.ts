/** Bounding box unificada — base de seleção, hit-test e enquadramento. */
import type { Element } from '../../types/board';
import { getStrokeBounds } from './freehand';
import { cardBounds, checklistBounds, normalizeRect, textBounds, type Rect } from './shapes';

export function elementBounds(element: Element): Rect {
  switch (element.type) {
    case 'stroke': {
      const b = getStrokeBounds(element.points);
      const pad = element.style.strokeWidth / 2;
      return {
        x: b.minX - pad,
        y: b.minY - pad,
        width: b.maxX - b.minX + pad * 2,
        height: b.maxY - b.minY + pad * 2,
      };
    }
    case 'shape':
      return normalizeRect(element);
    case 'text':
      return textBounds(element);
    case 'checklist':
      return checklistBounds(element);
    case 'card':
      return cardBounds(element);
    case 'polyline': {
      const xs = element.points.map((p) => p.x);
      const ys = element.points.map((p) => p.y);
      const pad = element.style.strokeWidth / 2;
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX - pad,
        y: minY - pad,
        width: Math.max(...xs) - minX + pad * 2,
        height: Math.max(...ys) - minY + pad * 2,
      };
    }
  }
}

/** União das bounds de vários elementos (null se a lista estiver vazia). */
export function unionBounds(elements: Element[]): Rect | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    const b = elementBounds(element);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
