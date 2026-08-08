/**
 * Schema do domínio — espelha `specs/04-data-model.md`.
 * Todas as coordenadas são no espaço do canvas infinito (não da tela).
 */

export interface Point {
  x: number;
  y: number;
  pressure: number;
}

export interface ElementStyle {
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface BaseElement {
  id: string;
  type: 'stroke' | 'shape' | 'text';
  createdAt: number;
  updatedAt: number;
  frameId?: string;
  style: ElementStyle;
}

export interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: Point[];
}

export type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'arrow';

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

export type Element = StrokeElement | ShapeElement | TextElement;

export interface Frame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Board {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  viewport: Viewport;
  elements: Element[];
  frames: Frame[];
  version: number;
}

export interface LibraryItem {
  id: string;
  name: string;
  category: string;
  elements: Element[];
  thumbnail?: string;
}

/** Ferramentas disponíveis na toolbar. Fase 1 usa apenas pen/eraser/hand. */
export type Tool = 'pen' | 'eraser' | 'hand' | 'select';

export function createId(): string {
  return crypto.randomUUID();
}

export function createBoard(name = 'Board sem título'): Board {
  const now = Date.now();
  return {
    id: createId(),
    name,
    createdAt: now,
    updatedAt: now,
    viewport: { x: 0, y: 0, zoom: 1 },
    elements: [],
    frames: [],
    version: 1,
  };
}
