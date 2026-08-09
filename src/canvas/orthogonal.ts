/** Segmento ortogonal (só horizontal ou vertical) a partir do último vértice. */

export function orthogonalCursor(
  last: { x: number; y: number },
  cursor: { x: number; y: number },
): { x: number; y: number } {
  const dx = Math.abs(cursor.x - last.x);
  const dy = Math.abs(cursor.y - last.y);
  if (dx >= dy) return { x: cursor.x, y: last.y };
  return { x: last.x, y: cursor.y };
}
