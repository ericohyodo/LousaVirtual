/**
 * Pontos de conexão de formas fechadas: 4 cantos, 4 meios de aresta e o
 * centro. É o que permite ligar caixas de fluxograma com setas encostando
 * exatamente na aresta, em vez de "quase lá".
 *
 * (O reconhecimento de forma à mão livre previsto na spec também mora aqui
 * quando chegar a fase 5 — é o mesmo assunto: corrigir imprecisão do traço.)
 */
import type { Element } from '../../types/board';
import type { ShapeElement } from '../../types/board';
import { cardBounds, normalizeRect } from './shapes';

export type SnapKind = 'corner' | 'edge' | 'center';

export interface SnapPoint {
  x: number;
  y: number;
  kind: SnapKind;
  elementId: string;
}

export function snapPointsFor(element: Element): SnapPoint[] {
  // Cards são caixas de fluxograma tanto quanto um retângulo: mesmos pontos.
  const isCard = element.type === 'card';
  const isClosedShape =
    element.type === 'shape' && (element.shapeType === 'rectangle' || element.shapeType === 'ellipse');

  if (!isCard && !isClosedShape) return [];

  const r = isCard ? cardBounds(element) : normalizeRect(element as ShapeElement);
  if (r.width < 1 && r.height < 1) return [];

  const left = r.x;
  const right = r.x + r.width;
  const top = r.y;
  const bottom = r.y + r.height;
  const midX = r.x + r.width / 2;
  const midY = r.y + r.height / 2;
  const id = element.id;

  const edges: SnapPoint[] = [
    { x: midX, y: top, kind: 'edge', elementId: id },
    { x: right, y: midY, kind: 'edge', elementId: id },
    { x: midX, y: bottom, kind: 'edge', elementId: id },
    { x: left, y: midY, kind: 'edge', elementId: id },
    { x: midX, y: midY, kind: 'center', elementId: id },
  ];

  // Na elipse só as arestas médias tocam o contorno; no retângulo e no card
  // os cantos também valem.
  if (element.type === 'shape' && element.shapeType === 'ellipse') return edges;

  return [
    ...edges,
    { x: left, y: top, kind: 'corner', elementId: id },
    { x: right, y: top, kind: 'corner', elementId: id },
    { x: right, y: bottom, kind: 'corner', elementId: id },
    { x: left, y: bottom, kind: 'corner', elementId: id },
  ];
}

export function collectSnapPoints(elements: Element[], excludeId?: string): SnapPoint[] {
  return elements.filter((e) => e.id !== excludeId).flatMap(snapPointsFor);
}

/** Ponto de conexão mais próximo dentro de `threshold` (unidades de canvas). */
export function findSnap(points: SnapPoint[], x: number, y: number, threshold: number): SnapPoint | null {
  let best: SnapPoint | null = null;
  let bestDistance = threshold;

  for (const point of points) {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance <= bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }

  return best;
}
