/** Translação de elementos — usada pelo arraste da ferramenta de seleção. */
import type { Element } from '../../types/board';

export function moveElement(element: Element, dx: number, dy: number): Element {
  switch (element.type) {
    case 'stroke':
    case 'polyline':
      return {
        ...element,
        points: element.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
      } as Element;
    case 'shape':
    case 'text':
    case 'checklist':
    case 'card':
      return { ...element, x: element.x + dx, y: element.y + dy };
  }
}
