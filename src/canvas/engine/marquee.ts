import type { Frame } from '../../types/board';
import type { Element } from '../../types/board';
import { elementBounds } from './bounds';
import type { Rect } from './shapes';

export type MarqueeMode = 'window' | 'crossing';

export function normalizeMarquee(x1: number, y1: number, x2: number, y2: number): Rect & { mode: MarqueeMode } {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const mode: MarqueeMode = x2 >= x1 ? 'window' : 'crossing';
  return { x: left, y: top, width, height, mode };
}

function rectContains(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

export function frameBounds(frame: Frame): Rect {
  return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
}

export function topFrameAtPoint(frames: Frame[], x: number, y: number): Frame | null {
  for (let i = frames.length - 1; i >= 0; i--) {
    const frame = frames[i]!;
    if (x >= frame.x && x <= frame.x + frame.width && y >= frame.y && y <= frame.y + frame.height) {
      return frame;
    }
  }
  return null;
}

export function pickInMarquee(
  elements: Element[],
  frames: Frame[],
  box: Rect,
  mode: MarqueeMode,
): { elementIds: string[]; frameIds: string[] } {
  const test = mode === 'window' ? rectContains : rectsIntersect;

  const elementIds = elements
    .filter((element) => test(elementBounds(element), box))
    .map((element) => element.id);

  const frameIds = frames.filter((frame) => test(frameBounds(frame), box)).map((frame) => frame.id);

  return { elementIds, frameIds };
}
