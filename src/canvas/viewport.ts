/**
 * Conversões entre espaço de tela (pixels do SVG) e espaço do canvas infinito.
 *
 * Convenção: `viewport.x/y` é o ponto do canvas que aparece no canto superior
 * esquerdo da tela; `zoom` é a escala (1 = 100%).
 */
import type { Viewport } from '../types/board';

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 20;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function screenToCanvas(screenX: number, screenY: number, vp: Viewport) {
  return { x: screenX / vp.zoom + vp.x, y: screenY / vp.zoom + vp.y };
}

export function canvasToScreen(canvasX: number, canvasY: number, vp: Viewport) {
  return { x: (canvasX - vp.x) * vp.zoom, y: (canvasY - vp.y) * vp.zoom };
}

/** Zoom mantendo fixo o ponto de canvas que está sob o cursor. */
export function zoomAtPoint(vp: Viewport, screenX: number, screenY: number, factor: number): Viewport {
  const zoom = clampZoom(vp.zoom * factor);
  if (zoom === vp.zoom) return vp;

  const before = screenToCanvas(screenX, screenY, vp);
  const after = screenToCanvas(screenX, screenY, { ...vp, zoom });

  return { x: vp.x + (before.x - after.x), y: vp.y + (before.y - after.y), zoom };
}

export function panBy(vp: Viewport, screenDx: number, screenDy: number): Viewport {
  return { ...vp, x: vp.x - screenDx / vp.zoom, y: vp.y - screenDy / vp.zoom };
}

/** `viewBox` do SVG correspondente ao viewport, dado o tamanho do container. */
export function toViewBox(vp: Viewport, width: number, height: number): string {
  return `${vp.x} ${vp.y} ${width / vp.zoom} ${height / vp.zoom}`;
}
