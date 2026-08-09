/** Alinha um ponto ao eixo horizontal ou vertical a partir de uma origem. */
export function orthogonalPoint(from: { x: number; y: number }, to: { x: number; y: number }): {
  x: number;
  y: number;
} {
  if (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)) {
    return { x: to.x, y: from.y };
  }
  return { x: from.x, y: to.y };
}
