/** Botões de confirmar/cancelar poli-linha (coordenadas de canvas). */

export type PolylineAction = 'confirm' | 'cancel';

const BUTTON_RADIUS = 14;

export function polylineActionButtons(
  x: number,
  y: number,
  zoom: number,
): { action: PolylineAction; cx: number; cy: number; r: number }[] {
  const gap = 36 / zoom;
  const r = BUTTON_RADIUS / zoom;
  return [
    { action: 'confirm', cx: x - gap / 2, cy: y - gap, r },
    { action: 'cancel', cx: x + gap / 2, cy: y - gap, r },
  ];
}

export function hitPolylineAction(
  x: number,
  y: number,
  cursorX: number,
  cursorY: number,
  zoom: number,
): PolylineAction | null {
  for (const btn of polylineActionButtons(cursorX, cursorY, zoom)) {
    if (Math.hypot(x - btn.cx, y - btn.cy) <= btn.r * 1.15) return btn.action;
  }
  return null;
}
