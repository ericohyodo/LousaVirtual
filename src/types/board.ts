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
  /** Preenchimento de formas fechadas. `'none'` = só contorno. */
  fill?: string;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
}

export interface BaseElement {
  id: string;
  type: 'stroke' | 'shape' | 'text' | 'checklist' | 'card' | 'polyline';
  createdAt: number;
  updatedAt: number;
  frameId?: string;
  style: ElementStyle;
  /** Impede mover, redimensionar e editar vértices enquanto travado. */
  locked?: boolean;
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
  /** Pode ser negativo enquanto o usuário arrasta; normalizado ao soltar. */
  width: number;
  height: number;
  rotation: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  /** `y` é o topo do primeiro glifo (não a baseline) — simplifica bounds. */
  y: number;
  content: string;
  text: TextStyle;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistElement extends BaseElement {
  type: 'checklist';
  x: number;
  y: number;
  width: number;
  title: string;
  items: ChecklistItem[];
  text: TextStyle;
}

/**
 * Card: um bloco pronto com faixa de título em cima e corpo embaixo —
 * texto corrido ou lista de itens marcáveis. É o "post-it estruturado"
 * para quem monta resumo, não rascunho descartável.
 */
export interface CardElement extends BaseElement {
  type: 'card';
  variant: 'text' | 'checklist';
  x: number;
  y: number;
  /** Largura mínima; a real acompanha o conteúdo. */
  width: number;
  /** Altura mínima, definida ao arrastar os vértices. */
  minHeight?: number;
  title: string;
  /** Corpo do card de texto ('\n' separa linhas). */
  content: string;
  /** Itens do card de check-list. */
  items: ChecklistItem[];
  /** Cor do corpo do card — guardada no elemento para ele se bastar. */
  surface: string;
  text: TextStyle;
}

/**
 * Poli-linha: caminho de vértices clicados um a um, para contornar elementos
 * já posicionados — a ligação típica de fluxograma.
 */
export interface PolylineElement extends BaseElement {
  type: 'polyline';
  points: { x: number; y: number }[];
  /** Ponta de seta no último segmento. */
  arrow: boolean;
}

export type Element =
  | StrokeElement
  | ShapeElement
  | TextElement
  | ChecklistElement
  | CardElement
  | PolylineElement;

export interface Frame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  locked?: boolean;
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
  /** Cor de fundo do canvas (configurável por board). */
  background: string;
  /** Gradiente CSS opcional; `background` continua sendo a cor sólida base. */
  backgroundGradient?: string;
  viewport: Viewport;
  elements: Element[];
  frames: Frame[];
  version: number;
}

/** Cabeçalho do board, sem os elementos — o que a HomePage precisa listar. */
export type BoardMeta = Omit<Board, 'elements' | 'frames' | 'viewport'>;

export interface LibraryItem {
  id: string;
  name: string;
  category: string;
  elements: Element[];
  thumbnail?: string;
}

export type ShapeTool = ShapeType;

export type Tool =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'hand'
  | 'text'
  | 'checklist'
  | 'card-text'
  | 'card-checklist'
  | 'polyline'
  | ShapeTool;

export const SHAPE_TOOLS: ShapeTool[] = ['rectangle', 'ellipse', 'line', 'arrow'];

export function isShapeTool(tool: Tool): tool is ShapeTool {
  return (SHAPE_TOOLS as Tool[]).includes(tool);
}

// --- padrões ---------------------------------------------------------------

export const DEFAULT_BACKGROUND = '#fbfbfa';
export const DEFAULT_FONT = 'Inter, system-ui, sans-serif';
/** Largura *mínima* da checklist — a real acompanha o conteúdo. */
export const DEFAULT_CHECKLIST_WIDTH = 150;
/** Largura mínima do card. */
export const DEFAULT_CARD_WIDTH = 280;
/** Quantidade de caixas em branco de um card de check-list novo. */
export const CARD_CHECKLIST_ITEMS = 7;

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
    background: DEFAULT_BACKGROUND,
    viewport: { x: 0, y: 0, zoom: 1 },
    elements: [],
    frames: [],
    version: 1,
  };
}

/**
 * Boards salvos antes de um campo existir continuam abrindo — o app é
 * local-first e não tem migração de servidor para consertar dado antigo.
 */
export function normalizeBoard(board: Board): Board {
  return {
    ...board,
    background: board.background ?? DEFAULT_BACKGROUND,
    frames: (board.frames ?? []).map((frame) => ({ ...frame, locked: frame.locked ?? false })),
    elements: (board.elements ?? []).map((element) => ({ ...element, locked: element.locked ?? false })),
  };
}
