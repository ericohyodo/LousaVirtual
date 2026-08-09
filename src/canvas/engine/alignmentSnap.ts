import type { Rect } from './shapes';

export interface AlignGuide {
  axis: 'x' | 'y';
  value: number;
}

export interface AlignSnapHold {
  x?: number;
  y?: number;
}

export interface MoveSnapResult {
  dx: number;
  dy: number;
  guides: AlignGuide[];
  hold: AlignSnapHold;
}

function edges(r: Rect) {
  return {
    left: r.x,
    right: r.x + r.width,
    top: r.y,
    bottom: r.y + r.height,
    cx: r.x + r.width / 2,
    cy: r.y + r.height / 2,
  };
}

/** Snap em um eixo com histerese: solta só quando afasta além de `release`. */
function snapAxis(
  movingValues: number[],
  dx: number,
  targetValues: number[],
  enter: number,
  release: number,
  held?: number,
): { dx: number; held?: number; guide?: number } {
  if (held !== undefined) {
    const minDist = Math.min(...movingValues.map((v) => Math.abs(v - held)));
    if (minDist <= release) {
      const closest = movingValues.reduce((best, v) =>
        Math.abs(v - held) < Math.abs(best - held) ? v : best,
      );
      return { dx: dx + (held - closest), held, guide: held };
    }
  }

  let bestDist = enter + 1;
  let bestDx = dx;
  let bestGuide: number | undefined;

  for (const mv of movingValues) {
    for (const target of targetValues) {
      const dist = Math.abs(mv - target);
      if (dist <= enter && dist < bestDist) {
        bestDist = dist;
        bestDx = dx + (target - mv);
        bestGuide = target;
      }
    }
  }

  return { dx: bestDx, held: bestGuide, guide: bestGuide };
}

export function snapMoveDelta(
  moving: Rect,
  others: Rect[],
  dx: number,
  dy: number,
  enter: number,
  release: number,
  hold: AlignSnapHold,
): MoveSnapResult {
  const proposed: Rect = {
    x: moving.x + dx,
    y: moving.y + dy,
    width: moving.width,
    height: moving.height,
  };
  const m = edges(proposed);

  const xTargets: number[] = [];
  const yTargets: number[] = [];
  for (const other of others) {
    const o = edges(other);
    xTargets.push(o.left, o.right, o.cx);
    yTargets.push(o.top, o.bottom, o.cy);
  }

  const sx = snapAxis([m.left, m.right, m.cx], dx, xTargets, enter, release, hold.x);
  const afterX: Rect = {
    x: moving.x + sx.dx,
    y: moving.y + dy,
    width: moving.width,
    height: moving.height,
  };
  const mAfterX = edges(afterX);
  const sy = snapAxis([mAfterX.top, mAfterX.bottom, mAfterX.cy], dy, yTargets, enter, release, hold.y);

  const guides: AlignGuide[] = [];
  if (sx.guide !== undefined) guides.push({ axis: 'x', value: sx.guide });
  if (sy.guide !== undefined) guides.push({ axis: 'y', value: sy.guide });

  return {
    dx: sx.dx,
    dy: sy.dx,
    guides,
    hold: { x: sx.held, y: sy.held },
  };
}
