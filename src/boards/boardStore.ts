/**
 * Estado global do editor: board atual, ferramenta/estilo ativos, seleção,
 * rascunhos em andamento e histórico de undo/redo.
 *
 * O histórico é pilha de snapshots do array de elementos — para o volume de um
 * board pessoal, isso é mais simples e mais robusto que operações inversas.
 */
import { createStore, useStore } from './createStore';
import type {
  Board,
  CardElement,
  ChecklistElement,
  Element,
  ElementStyle,
  Point,
  PolylineElement,
  ShapeElement,
  ShapeTool,
  StrokeElement,
  TextElement,
  TextStyle,
  Tool,
  Viewport,
} from '../types/board';
import {
  CARD_CHECKLIST_ITEMS,
  DEFAULT_CARD_WIDTH,
  DEFAULT_CHECKLIST_WIDTH,
  DEFAULT_FONT,
  createId,
} from '../types/board';
import { moveElement } from '../canvas/engine/transform';
import { elementBounds, unionBounds } from '../canvas/engine/bounds';
import { cardHeight } from '../canvas/engine/shapes';
import { isDark } from '../canvas/colors';
import type { SnapPoint } from '../canvas/engine/snapping';
import type { AlignGuide, AlignSnapHold } from '../canvas/engine/alignmentSnap';
import { snapMoveDelta } from '../canvas/engine/alignmentSnap';
import { frameBounds, normalizeMarquee, pickInMarquee } from '../canvas/engine/marquee';
import { clampZoom } from '../canvas/viewport';
import type { ShapeHandle } from '../canvas/engine/resizeHandles';
import { createSheetFrame, SHEET_TEMPLATES, type SheetTemplate } from '../canvas/sheetTemplates';
import { toggleInlineBold, toggleInlineItalic } from '../canvas/textEditorBridge';

const HISTORY_LIMIT = 100;

/** Alvo de edição de texto inline (texto solto, título ou item de checklist). */
export interface EditingTarget {
  elementId: string;
  /**
   * Índice do item da lista, `'title'` para o cabeçalho, `'body'` para o corpo
   * de texto do card; undefined num texto solto.
   */
  field?: number | 'title' | 'body';
}

/** Alvo do botão "+" que aparece ao passar o mouse na base de uma lista. */
export interface AddRowHint {
  elementId: string;
  /** Centro do botão, em coordenadas de canvas. */
  x: number;
  y: number;
}

/** Retângulo de seleção por arraste (estilo AutoCAD). */
export interface MarqueeState {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface EditorState {
  board: Board | null;
  tool: Tool;
  style: ElementStyle;
  text: TextStyle;
  selectedIds: string[];
  selectedFrameIds: string[];
  editing: EditingTarget | null;
  draftStroke: StrokeElement | null;
  draftShape: ShapeElement | null;
  draftPolyline: PolylineElement | null;
  /** Ponta "elástica" da poli-linha, seguindo o cursor até o próximo clique. */
  polylineCursor: { x: number; y: number } | null;
  /** Ponto de conexão sob o cursor, para realce durante o desenho. */
  activeSnap: SnapPoint | null;
  /** Botão "+" de adicionar linha, quando o cursor está na base de uma lista. */
  addRowHint: AddRowHint | null;
  marquee: MarqueeState | null;
  alignGuides: AlignGuide[];
  /** Guias de alinhamento “presas” durante o arraste (histerese). */
  alignSnapHold: AlignSnapHold;
  /** Tamanho do palco em pixels — o zoom extents precisa dele. */
  canvasSize: { width: number; height: number };
  past: Element[][];
  future: Element[][];
}

const store = createStore<EditorState>({
  board: null,
  tool: 'pen',
  style: { color: '#1a1a1a', strokeWidth: 6, opacity: 1, fill: 'none' },
  text: { fontFamily: DEFAULT_FONT, fontSize: 20, bold: false, italic: false },
  selectedIds: [],
  selectedFrameIds: [],
  editing: null,
  draftStroke: null,
  draftShape: null,
  draftPolyline: null,
  polylineCursor: null,
  activeSnap: null,
  addRowHint: null,
  marquee: null,
  alignGuides: [],
  alignSnapHold: {},
  canvasSize: { width: 0, height: 0 },
  past: [],
  future: [],
});

export const boardStore = store;

export function useEditor<S>(selector: (state: EditorState) => S): S {
  return useStore(store, selector);
}

/** Board garantido — use só onde a UI já sabe que há um board aberto. */
function requireBoard(): Board | null {
  return store.getState().board;
}

// --- ciclo de vida do board -------------------------------------------------

export function openBoard(board: Board) {
  store.setState({
    board,
    selectedIds: [],
    selectedFrameIds: [],
    editing: null,
    draftStroke: null,
    draftShape: null,
    draftPolyline: null,
    polylineCursor: null,
    past: [],
    future: [],
    marquee: null,
    alignGuides: [],
    alignSnapHold: {},
  });
}

export function closeBoard() {
  store.setState({ board: null, selectedIds: [], selectedFrameIds: [], editing: null });
}

// --- ferramenta e estilo ----------------------------------------------------

export function setTool(tool: Tool) {
  // Trocar de ferramenta fecha a poli-linha em andamento (comita se já tem
  // dois vértices) em vez de deixá-la pendurada.
  if (store.getState().draftPolyline) endPolyline();
  store.setState({ tool, selectedIds: tool === 'select' ? store.getState().selectedIds : [] });
  // Sair para outra ferramenta encerra a edição em andamento (e descarta o
  // elemento se ele tiver ficado vazio).
  setEditing(null);
}

export function setStyle(patch: Partial<ElementStyle>) {
  const { style } = store.getState();
  store.setState({ style: { ...style, ...patch } });
  applyToSelection((element) => ({ ...element, style: { ...element.style, ...patch } }));
}

export function setTextStyle(patch: Partial<TextStyle>) {
  const { text, editing } = store.getState();
  store.setState({ text: { ...text, ...patch } });

  if (editing && patch.bold !== undefined && toggleInlineBold()) return;
  if (editing && patch.italic !== undefined && toggleInlineItalic()) return;

  applyToSelection((element) => {
    if (element.type === 'text' && (patch.bold !== undefined || patch.italic !== undefined)) {
      return element;
    }
    if (element.type === 'text' || element.type === 'checklist' || element.type === 'card') {
      return { ...element, text: { ...element.text, ...patch } };
    }
    return element;
  });
}

export function setBackground(background: string, backgroundGradient?: string) {
  const board = requireBoard();
  if (!board) return;
  if (board.background === background && board.backgroundGradient === backgroundGradient) return;
  commit({ ...board, background, backgroundGradient });
}

export function setCanvasSize(width: number, height: number) {
  const { canvasSize } = store.getState();
  if (canvasSize.width === width && canvasSize.height === height) return;
  store.setState({ canvasSize: { width, height } });
}

export function setActiveSnap(activeSnap: SnapPoint | null) {
  const current = store.getState().activeSnap;
  if (current === activeSnap) return;
  if (current && activeSnap && current.x === activeSnap.x && current.y === activeSnap.y) return;
  store.setState({ activeSnap });
}

/** Margem em pixels de tela ao redor do conteúdo no zoom extents. */
const FIT_PADDING = 64;

/**
 * Enquadra todo o conteúdo do board na tela. Sem elementos, volta à origem
 * em 100% — que é o "lugar conhecido" quando não há nada para enquadrar.
 */
export function zoomToFit() {
  const { board, canvasSize } = store.getState();
  if (!board || canvasSize.width === 0) return;

  const bounds = unionBounds(board.elements);
  if (!bounds || bounds.width + bounds.height === 0) {
    setViewport({ x: 0, y: 0, zoom: 1 });
    return;
  }

  const available = {
    width: Math.max(1, canvasSize.width - FIT_PADDING * 2),
    height: Math.max(1, canvasSize.height - FIT_PADDING * 2),
  };

  // Nunca ampliamos além de 100%: um board com um único traço pequeno ficaria
  // com zoom absurdo e desorientaria mais do que ajudaria.
  const zoom = clampZoom(
    Math.min(available.width / Math.max(bounds.width, 1), available.height / Math.max(bounds.height, 1), 1),
  );

  setViewport({
    x: bounds.x + bounds.width / 2 - canvasSize.width / (2 * zoom),
    y: bounds.y + bounds.height / 2 - canvasSize.height / (2 * zoom),
    zoom,
  });
}

export function setViewport(viewport: Viewport | ((current: Viewport) => Viewport)) {
  const board = requireBoard();
  if (!board) return;
  const next = typeof viewport === 'function' ? viewport(board.viewport) : viewport;
  // Viewport não é edição: não passa pelo commit nem incrementa `version`.
  store.setState({ board: { ...board, viewport: next } });
}

export function renameBoard(name: string) {
  const board = requireBoard();
  if (!board) return;
  commit({ ...board, name });
}

/** Insere uma folha (frame) A4/A3 centrada na área visível. */
export function insertSheetTemplate(templateId: string) {
  const { board, canvasSize } = store.getState();
  const template = SHEET_TEMPLATES.find((t) => t.id === templateId);
  if (!board || !template || canvasSize.width === 0) return;

  const viewW = canvasSize.width / board.viewport.zoom;
  const viewH = canvasSize.height / board.viewport.zoom;
  const x = board.viewport.x + (viewW - template.width) / 2;
  const y = board.viewport.y + (viewH - template.height) / 2;
  const frame = createSheetFrame(template, x, y);
  commit({ ...board, frames: [...board.frames, frame] });
}

export { SHEET_TEMPLATES, type SheetTemplate };

let clipboardElements: Element[] = [];

export function copySelection() {
  const { board, selectedIds } = store.getState();
  if (!board || selectedIds.length === 0) return;
  clipboardElements = selectedIds
    .map((id) => board.elements.find((e) => e.id === id))
    .filter((e): e is Element => Boolean(e));
}

function cloneElement(element: Element): Element {
  const copy = JSON.parse(JSON.stringify(element)) as Element;
  const now = Date.now();
  copy.id = createId();
  copy.createdAt = now;
  copy.updatedAt = now;
  if (copy.type === 'checklist') {
    copy.items = copy.items.map((item) => ({ ...item, id: createId() }));
  }
  if (copy.type === 'card') {
    copy.items = copy.items.map((item) => ({ ...item, id: createId() }));
  }
  return copy;
}

export function pasteClipboard() {
  if (clipboardElements.length === 0) return;
  const offset = 24;
  const clones = clipboardElements.map((element) => moveElement(cloneElement(element), offset, offset));
  const ids = clones.map((e) => e.id);
  mutate((elements) => [...elements, ...clones]);
  store.setState({ selectedIds: ids });
}

const MIN_SHAPE_SIZE = 8;

export function resizeShapeElement(id: string, handle: ShapeHandle, dx: number, dy: number) {
  if (dx === 0 && dy === 0) return;
  mutate((elements) =>
    elements.map((element) => {
      if (element.id !== id || element.type !== 'shape') return element;

      if (element.shapeType === 'line' || element.shapeType === 'arrow') {
        if (handle === 'start') {
          return touchElement({ ...element, x: element.x + dx, y: element.y + dy });
        }
        return touchElement({
          ...element,
          width: element.width + dx,
          height: element.height + dy,
        });
      }

      let { x, y, width, height } = element;
      const west = handle === 'nw' || handle === 'sw';
      const north = handle === 'nw' || handle === 'ne';

      if (west) {
        x += dx;
        width -= dx;
      } else {
        width += dx;
      }
      if (north) {
        y += dy;
        height -= dy;
      } else {
        height += dy;
      }

      if (Math.abs(width) < MIN_SHAPE_SIZE) width = Math.sign(width || 1) * MIN_SHAPE_SIZE;
      if (Math.abs(height) < MIN_SHAPE_SIZE) height = Math.sign(height || 1) * MIN_SHAPE_SIZE;

      return touchElement({ ...element, x, y, width, height });
    }),
  false);
}

// --- traço livre -------------------------------------------------------------

export function beginStroke(point: Point) {
  const { style } = store.getState();
  const now = Date.now();
  store.setState({
    draftStroke: {
      id: createId(),
      type: 'stroke',
      createdAt: now,
      updatedAt: now,
      style: { ...style },
      points: [point],
    },
  });
}

export function extendStroke(point: Point) {
  const { draftStroke } = store.getState();
  if (!draftStroke) return;
  store.setState({ draftStroke: { ...draftStroke, points: [...draftStroke.points, point] } });
}

export function endStroke() {
  const { draftStroke } = store.getState();
  if (!draftStroke) return;
  store.setState({ draftStroke: null });
  addElement({ ...draftStroke, updatedAt: Date.now() });
}

export function cancelStroke() {
  store.setState({ draftStroke: null });
}

// --- formas -------------------------------------------------------------------

export function beginShape(tool: ShapeTool, x: number, y: number) {
  const { style } = store.getState();
  const now = Date.now();
  store.setState({
    draftShape: {
      id: createId(),
      type: 'shape',
      shapeType: tool,
      createdAt: now,
      updatedAt: now,
      style: { ...style },
      x,
      y,
      width: 0,
      height: 0,
      rotation: 0,
    },
  });
}

export function resizeShape(x: number, y: number, keepRatio = false) {
  const { draftShape } = store.getState();
  if (!draftShape) return;

  let width = x - draftShape.x;
  let height = y - draftShape.y;

  // Shift: quadrado/círculo para formas, ângulo de 45° para linhas.
  if (keepRatio) {
    const size = Math.max(Math.abs(width), Math.abs(height));
    width = Math.sign(width) * size;
    height = Math.sign(height) * size;
  }

  store.setState({ draftShape: { ...draftShape, width, height } });
}

export function endShape() {
  const { draftShape } = store.getState();
  if (!draftShape) return;
  store.setState({ draftShape: null });

  // Clique sem arraste não cria forma degenerada.
  if (Math.abs(draftShape.width) < 2 && Math.abs(draftShape.height) < 2) return;
  addElement({ ...draftShape, updatedAt: Date.now() });
}

export function cancelShape() {
  store.setState({ draftShape: null });
}

// --- poli-linha -----------------------------------------------------------------

export function startPolyline(x: number, y: number) {
  const { style } = store.getState();
  const now = Date.now();
  store.setState({
    draftPolyline: {
      id: createId(),
      type: 'polyline',
      createdAt: now,
      updatedAt: now,
      style: { ...style },
      points: [{ x, y }],
      arrow: true,
    },
    polylineCursor: { x, y },
  });
}

export function addPolylinePoint(x: number, y: number) {
  const { draftPolyline } = store.getState();
  if (!draftPolyline) return;

  // Clique repetido no mesmo lugar não vira vértice duplicado.
  const last = draftPolyline.points[draftPolyline.points.length - 1];
  if (last && Math.hypot(last.x - x, last.y - y) < 1) return;

  store.setState({ draftPolyline: { ...draftPolyline, points: [...draftPolyline.points, { x, y }] } });
}

export function movePolylineCursor(x: number, y: number) {
  if (!store.getState().draftPolyline) return;
  store.setState({ polylineCursor: { x, y } });
}

/** Fecha a poli-linha. Menos de dois vértices não vira elemento. */
export function endPolyline() {
  const { draftPolyline } = store.getState();
  store.setState({ draftPolyline: null, polylineCursor: null });
  if (!draftPolyline || draftPolyline.points.length < 2) return;
  addElement({ ...draftPolyline, updatedAt: Date.now() });
}

export function cancelPolyline() {
  store.setState({ draftPolyline: null, polylineCursor: null });
}

// --- redimensionar card ------------------------------------------------------------

export type CardCorner = 'nw' | 'ne' | 'se' | 'sw';

const CARD_MIN_WIDTH = 120;
const CARD_MIN_HEIGHT = 80;

/**
 * Arrasta um vértice do card. A largura e a altura viram *mínimos* — o
 * conteúdo continua podendo empurrar o card para além deles.
 */
export function resizeCard(id: string, corner: CardCorner, dx: number, dy: number) {
  updateElement(id, (element) => {
    if (element.type !== 'card') return element;

    const currentHeight = cardHeight(element);
    const west = corner === 'nw' || corner === 'sw';
    const north = corner === 'nw' || corner === 'ne';

    const width = Math.max(CARD_MIN_WIDTH, element.width + (west ? -dx : dx));
    const minHeight = Math.max(CARD_MIN_HEIGHT, currentHeight + (north ? -dy : dy));

    return {
      ...element,
      width,
      minHeight,
      // Puxar pelo lado oeste/norte move a âncora do card junto.
      x: west ? element.x + (element.width - width) : element.x,
      y: north ? element.y + (currentHeight - minHeight) : element.y,
    };
  });
}

// --- texto e checklist ---------------------------------------------------------

export function createText(x: number, y: number): TextElement {
  const { style, text } = store.getState();
  const now = Date.now();
  const element: TextElement = {
    id: createId(),
    type: 'text',
    createdAt: now,
    updatedAt: now,
    style: { ...style },
    x,
    y,
    content: '',
    text: { ...text },
  };

  addElement(element);
  store.setState({ editing: { elementId: element.id }, selectedIds: [element.id] });
  return element;
}

export function createChecklist(x: number, y: number): ChecklistElement {
  const { style, text } = store.getState();
  const now = Date.now();
  const element: ChecklistElement = {
    id: createId(),
    type: 'checklist',
    createdAt: now,
    updatedAt: now,
    style: { ...style },
    x,
    y,
    width: DEFAULT_CHECKLIST_WIDTH,
    title: '',
    items: [{ id: createId(), text: '', done: false }],
    text: { ...text },
  };

  addElement(element);
  store.setState({ editing: { elementId: element.id, field: 0 }, selectedIds: [element.id] });
  return element;
}

/**
 * Muda (ou encerra) a edição de texto. Ao sair de um elemento que ficou
 * completamente vazio, ele é descartado — senão o board acumularia textos
 * invisíveis a cada clique acidental com a ferramenta de texto.
 */
/**
 * Cria um card (frame com faixa de título + corpo). O check-list nasce com
 * `CARD_CHECKLIST_ITEMS` caixas em branco; o de texto, com o corpo vazio.
 */
export function createCard(variant: 'text' | 'checklist', x: number, y: number): CardElement {
  const { style, text, board } = store.getState();
  const now = Date.now();

  const element: CardElement = {
    id: createId(),
    type: 'card',
    variant,
    createdAt: now,
    updatedAt: now,
    style: { ...style },
    x,
    y,
    width: DEFAULT_CARD_WIDTH,
    title: '',
    content: '',
    items:
      variant === 'checklist'
        ? Array.from({ length: CARD_CHECKLIST_ITEMS }, () => ({
            id: createId(),
            text: '',
            done: false,
          }))
        : [],
    // O corpo acompanha o tema do board para o card não virar um retângulo
    // branco gritante numa lousa escura.
    surface: board && isDark(board.background) ? '#2a2f36' : '#ffffff',
    text: { ...text },
  };

  addElement(element);
  store.setState({ editing: { elementId: element.id, field: 'title' }, selectedIds: [element.id] });
  return element;
}

export function updateCardTitle(id: string, title: string) {
  updateElement(id, (element) => (element.type === 'card' ? { ...element, title } : element));
}

export function updateCardContent(id: string, content: string) {
  updateElement(id, (element) => (element.type === 'card' ? { ...element, content } : element));
}

export function updateCardItem(id: string, index: number, patch: { text?: string; done?: boolean }) {
  updateElement(id, (element) => {
    if (element.type !== 'card') return element;
    return { ...element, items: element.items.map((item, i) => (i === index ? { ...item, ...patch } : item)) };
  });
}

export function setAddRowHint(addRowHint: AddRowHint | null) {
  const current = store.getState().addRowHint;
  if (current === addRowHint) return;
  if (current && addRowHint && current.elementId === addRowHint.elementId) return;
  store.setState({ addRowHint });
}

/** Acrescenta uma linha ao fim da lista (botão "+") e foca nela. */
export function appendRow(id: string) {
  const board = requireBoard();
  const element = board?.elements.find((e) => e.id === id);
  if (!element) return;

  if (element.type === 'checklist') {
    addChecklistItem(id, element.items.length - 1);
    return;
  }

  if (element.type === 'card' && element.variant === 'checklist') {
    const index = element.items.length;
    updateElement(id, (el) =>
      el.type === 'card'
        ? { ...el, items: [...el.items, { id: createId(), text: '', done: false }] }
        : el,
    );
    store.setState({ editing: { elementId: id, field: index } });
  }
}

export function setEditing(editing: EditingTarget | null) {
  const { editing: previous, board } = store.getState();
  store.setState({ editing });

  if (!previous || previous.elementId === editing?.elementId) return;

  const element = board?.elements.find((e) => e.id === previous.elementId);
  if (!element) return;

  const empty =
    (element.type === 'text' && element.content.trim() === '') ||
    (element.type === 'checklist' &&
      element.title.trim() === '' &&
      element.items.every((item) => item.text.trim() === ''));

  if (empty) removeElements(new Set([element.id]));
}

export function updateTextContent(id: string, content: string) {
  updateElement(id, (element) => (element.type === 'text' ? { ...element, content } : element));
}

export function updateChecklistTitle(id: string, title: string) {
  updateElement(id, (element) => (element.type === 'checklist' ? { ...element, title } : element));
}

export function updateChecklistItem(id: string, index: number, patch: { text?: string; done?: boolean }) {
  updateElement(id, (element) => {
    if (element.type !== 'checklist') return element;
    const items = element.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    return { ...element, items };
  });
}

export function toggleChecklistItem(id: string, index: number) {
  const board = requireBoard();
  const element = board?.elements.find((e) => e.id === id);
  if (element?.type !== 'checklist') return;
  const item = element.items[index];
  if (!item) return;
  updateChecklistItem(id, index, { done: !item.done });
}

/** Insere um item após `index` e move a edição para ele (comportamento do Enter). */
export function addChecklistItem(id: string, index: number) {
  let newIndex = index + 1;

  updateElement(id, (element) => {
    if (element.type !== 'checklist') return element;
    newIndex = Math.min(index + 1, element.items.length);
    const items = [...element.items];
    items.splice(newIndex, 0, { id: createId(), text: '', done: false });
    return { ...element, items };
  });

  store.setState({ editing: { elementId: id, field: newIndex } });
}

/**
 * Remove o item e devolve o índice que deve receber o foco (-1 se o elemento
 * inteiro foi apagado por ter ficado vazio).
 */
export function removeChecklistItem(id: string, index: number): number {
  const board = requireBoard();
  const element = board?.elements.find((e) => e.id === id);
  if (element?.type !== 'checklist') return -1;

  if (element.items.length <= 1) {
    removeElements(new Set([id]));
    return -1;
  }

  updateElement(id, (el) =>
    el.type === 'checklist' ? { ...el, items: el.items.filter((_, i) => i !== index) } : el,
  );
  return Math.max(0, index - 1);
}

// --- seleção -------------------------------------------------------------------

export function toggleCardItem(id: string, index: number) {
  const board = requireBoard();
  const element = board?.elements.find((e) => e.id === id);
  if (element?.type !== 'card') return;
  const item = element.items[index];
  if (!item) return;
  updateCardItem(id, index, { done: !item.done });
}

/** Insere um item após `index` num card e move a edição para ele. */
export function addCardItem(id: string, index: number) {
  let newIndex = index + 1;

  updateElement(id, (element) => {
    if (element.type !== 'card') return element;
    newIndex = Math.min(index + 1, element.items.length);
    const items = [...element.items];
    items.splice(newIndex, 0, { id: createId(), text: '', done: false });
    return { ...element, items };
  });

  store.setState({ editing: { elementId: id, field: newIndex } });
}

/**
 * Remove um item do card e devolve o índice a focar. Diferente da checklist
 * solta, o card sobrevive vazio — ele é um quadro, não uma lista.
 */
export function removeCardItem(id: string, index: number): number {
  const board = requireBoard();
  const element = board?.elements.find((e) => e.id === id);
  if (element?.type !== 'card' || element.items.length <= 1) return -1;

  updateElement(id, (el) =>
    el.type === 'card' ? { ...el, items: el.items.filter((_, i) => i !== index) } : el,
  );
  return Math.max(0, index - 1);
}

// --- operações sobre o board inteiro -------------------------------------------

/** Vão vazio mínimo para valer o corte, e o que sobra depois dele. */
const GAP_THRESHOLD = 260;
const GAP_KEEP = 80;

/**
 * Deslocamento acumulado por eixo: para cada faixa vazia maior que
 * `GAP_THRESHOLD`, tudo que estiver depois dela volta `vão - GAP_KEEP`.
 */
function axisShifts(intervals: { start: number; end: number }[]) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);

  // Mescla o que se sobrepõe: um elemento grande que contém outros vira um
  // bloco só, e nenhum corte pode acontecer dentro dele.
  const merged: { start: number; end: number }[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  const cuts: { after: number; shift: number }[] = [];
  let accumulated = 0;

  for (let i = 1; i < merged.length; i++) {
    const gap = merged[i]!.start - merged[i - 1]!.end;
    if (gap > GAP_THRESHOLD) accumulated += gap - GAP_KEEP;
    if (accumulated > 0) cuts.push({ after: merged[i]!.start, shift: accumulated });
  }

  return cuts;
}

function shiftFor(cuts: { after: number; shift: number }[], position: number): number {
  let shift = 0;
  for (const cut of cuts) {
    if (position >= cut.after) shift = cut.shift;
  }
  return shift;
}

/**
 * Aproxima o conteúdo **cortando o vazio do canvas**, não reposicionando cada
 * elemento: blocos inteiros deslizam juntos, então quem estava dentro ou
 * alinhado com outro continua exatamente onde estava em relação a ele.
 *
 * Cortes só acontecem em faixas onde não há nenhum elemento — por isso as
 * caixas delimitadoras são mescladas antes de procurar os vãos.
 */
export function compressCanvas() {
  const board = requireBoard();
  if (!board || board.elements.length < 2) return;

  const entries = board.elements.map((element) => ({ element, bounds: elementBounds(element) }));

  const cutsX = axisShifts(entries.map((e) => ({ start: e.bounds.x, end: e.bounds.x + e.bounds.width })));
  const cutsY = axisShifts(entries.map((e) => ({ start: e.bounds.y, end: e.bounds.y + e.bounds.height })));

  if (cutsX.length === 0 && cutsY.length === 0) {
    zoomToFit();
    return;
  }

  const moved = new Map<string, Element>();
  for (const { element, bounds } of entries) {
    const dx = -shiftFor(cutsX, bounds.x);
    const dy = -shiftFor(cutsY, bounds.y);
    if (dx !== 0 || dy !== 0) moved.set(element.id, moveElement(element, dx, dy));
  }

  mutate((elements) => elements.map((e) => moved.get(e.id) ?? e));
  zoomToFit();
}

/**
 * Apaga só os traços à mão livre, preservando formas, textos e cards — o caso
 * de uso é limpar rabiscos feitos por cima do conteúdo que deve ficar.
 */
export function removeStrokes() {
  mutate((elements) => {
    const kept = elements.filter((e) => e.type !== 'stroke');
    return kept.length === elements.length ? elements : kept;
  });
  store.setState({ selectedIds: [] });
}

export function countStrokes(state: EditorState): number {
  return state.board?.elements.filter((e) => e.type === 'stroke').length ?? 0;
}

export function setMarquee(marquee: MarqueeState | null) {
  store.setState({ marquee });
}

export function clearAlignSnapHold() {
  store.setState({ alignSnapHold: {}, alignGuides: [] });
}

export function setAlignGuides(alignGuides: AlignGuide[]) {
  const current = store.getState().alignGuides;
  if (
    current.length === alignGuides.length &&
    current.every((g, i) => g.axis === alignGuides[i]?.axis && g.value === alignGuides[i]?.value)
  ) {
    return;
  }
  store.setState({ alignGuides });
}

export function applyMarqueeSelection(x1: number, y1: number, x2: number, y2: number, additive: boolean) {
  const board = requireBoard();
  if (!board) return;
  const box = normalizeMarquee(x1, y1, x2, y2);
  if (box.width < 2 && box.height < 2) return;

  const { elementIds, frameIds } = pickInMarquee(board.elements, board.frames, box, box.mode);
  setSelection(elementIds, { frameIds, additive });
}

export function setSelection(ids: string[], opts?: { frameIds?: string[]; additive?: boolean }) {
  const { selectedIds, selectedFrameIds } = store.getState();
  const additive = opts?.additive ?? false;
  const frameIds = opts?.frameIds;

  const nextIds = additive ? [...new Set([...selectedIds, ...ids])] : ids;
  let nextFrames: string[];
  if (frameIds !== undefined) {
    nextFrames = additive ? [...new Set([...selectedFrameIds, ...frameIds])] : frameIds;
  } else if (additive) {
    nextFrames = selectedFrameIds;
  } else {
    nextFrames = ids.length > 0 ? [] : selectedFrameIds;
  }

  store.setState({ selectedIds: nextIds, selectedFrameIds: nextFrames });

  const board = requireBoard();
  const first = nextIds.length === 1 ? board?.elements.find((e) => e.id === nextIds[0]) : undefined;
  if (!first) return;

  const patch: Partial<EditorState> = { style: { ...first.style } };
  if (first.type === 'text' || first.type === 'checklist' || first.type === 'card') patch.text = { ...first.text };
  store.setState(patch);
}

export function clearSelection() {
  store.setState({ selectedIds: [], selectedFrameIds: [] });
  setEditing(null);
}

export function moveSelection(dx: number, dy: number) {
  if (dx === 0 && dy === 0) return;
  const { board, selectedIds, selectedFrameIds } = store.getState();
  if (!board) return;

  const movableIds = selectedIds.filter((id) => {
    const element = board.elements.find((e) => e.id === id);
    return element && !element.locked;
  });
  const movableFrameIds = selectedFrameIds.filter((id) => {
    const frame = board.frames.find((f) => f.id === id);
    return frame && !frame.locked;
  });

  if (movableIds.length === 0 && movableFrameIds.length === 0) return;

  const ids = new Set(movableIds);
  const frameIds = new Set(movableFrameIds);

  const movingRects = [
    ...board.elements.filter((e) => ids.has(e.id)).map((e) => elementBounds(e)),
    ...board.frames.filter((f) => frameIds.has(f.id)).map((f) => frameBounds(f)),
  ];

  let union = movingRects[0];
  if (!union) return;
  for (let i = 1; i < movingRects.length; i++) {
    const r = movingRects[i]!;
    const minX = Math.min(union.x, r.x);
    const minY = Math.min(union.y, r.y);
    const maxX = Math.max(union.x + union.width, r.x + r.width);
    const maxY = Math.max(union.y + union.height, r.y + r.height);
    union = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  const staticRects = [
    ...board.elements.filter((e) => !ids.has(e.id)).map((e) => elementBounds(e)),
    ...board.frames.filter((f) => !frameIds.has(f.id)).map((f) => frameBounds(f)),
  ];

  const threshold = 5 / board.viewport.zoom;
  const release = 14 / board.viewport.zoom;
  const { alignSnapHold } = store.getState();
  const { dx: snapDx, dy: snapDy, guides, hold } = snapMoveDelta(
    union,
    staticRects,
    dx,
    dy,
    threshold,
    release,
    alignSnapHold,
  );
  setAlignGuides(guides);
  store.setState({ alignSnapHold: hold });

  mutate((elements) => elements.map((e) => (ids.has(e.id) ? moveElement(e, snapDx, snapDy) : e)), false);

  const latest = store.getState().board;
  if (latest && frameIds.size > 0) {
    store.setState({
      board: {
        ...latest,
        frames: latest.frames.map((frame) =>
          frameIds.has(frame.id) ? { ...frame, x: frame.x + snapDx, y: frame.y + snapDy } : frame,
        ),
      },
    });
  }
}

/** Alterna travamento da seleção (elementos + folhas). */
export function toggleLockSelection() {
  const { board, selectedIds, selectedFrameIds } = store.getState();
  if (!board || (selectedIds.length === 0 && selectedFrameIds.length === 0)) return;

  const idSet = new Set(selectedIds);
  const frameSet = new Set(selectedFrameIds);

  const targets = [
    ...board.elements.filter((e) => idSet.has(e.id)),
    ...board.frames.filter((f) => frameSet.has(f.id)),
  ];
  const lock = targets.some((t) => !t.locked);

  if (idSet.size > 0) {
    mutate((elements) =>
      elements.map((element) =>
        idSet.has(element.id) ? touchElement({ ...element, locked: lock }) : element,
      ),
    );
  }

  const latest = store.getState().board;
  if (latest && frameSet.size > 0) {
    commit({
      ...latest,
      frames: latest.frames.map((frame) => (frameSet.has(frame.id) ? { ...frame, locked: lock } : frame)),
    });
  }
}

export function movePolylineVertex(id: string, index: number, x: number, y: number) {
  mutate((elements) =>
    elements.map((element) => {
      if (element.id !== id || element.type !== 'polyline' || element.locked) return element;
      const points = element.points.map((p, i) => (i === index ? { x, y } : p));
      return touchElement({ ...element, points });
    }),
  false);
}

export function deleteSelection() {
  const { selectedIds, selectedFrameIds } = store.getState();
  const frameSet = new Set(selectedFrameIds);
  removeElements(new Set(selectedIds));
  const board = store.getState().board;
  if (board && frameSet.size > 0) {
    commit({ ...board, frames: board.frames.filter((f) => !frameSet.has(f.id)) });
  }
  store.setState({ selectedIds: [], selectedFrameIds: [], editing: null });
}

function applyToSelection(fn: (element: Element) => Element) {
  const { selectedIds } = store.getState();
  if (selectedIds.length === 0) return;
  const ids = new Set(selectedIds);
  mutate((elements) => elements.map((e) => (ids.has(e.id) ? touchElement(fn(e)) : e)));
}

// --- elementos -----------------------------------------------------------------

export function addElement(element: Element) {
  mutate((elements) => [...elements, element]);
}

export function updateElement(id: string, fn: (element: Element) => Element) {
  mutate((elements) => elements.map((e) => (e.id === id ? touchElement(fn(e)) : e)));
}

export function removeElements(ids: Set<string>) {
  if (ids.size === 0) return;
  mutate((elements) => elements.filter((e) => !ids.has(e.id)));
}

export function clearBoard() {
  mutate(() => []);
}

// --- histórico -------------------------------------------------------------------

export function undo() {
  const { board, past, future } = store.getState();
  if (!board || past.length === 0) return;

  const previous = past[past.length - 1]!;
  store.setState({
    past: past.slice(0, -1),
    future: [...future, board.elements],
    board: bump({ ...board, elements: previous }),
    selectedIds: [],
    selectedFrameIds: [],
    editing: null,
    alignGuides: [],
    alignSnapHold: {},
  });
}

export function redo() {
  const { board, past, future } = store.getState();
  if (!board || future.length === 0) return;

  const next = future[future.length - 1]!;
  store.setState({
    future: future.slice(0, -1),
    past: [...past, board.elements],
    board: bump({ ...board, elements: next }),
    selectedIds: [],
    selectedFrameIds: [],
    editing: null,
    alignGuides: [],
  });
}

// --- internos ----------------------------------------------------------------------

function touchElement(element: Element): Element {
  return { ...element, updatedAt: Date.now() };
}

/** Marca o board como alterado — `version` detecta conflito no sync (fase 4). */
function bump(board: Board): Board {
  return { ...board, updatedAt: Date.now(), version: board.version + 1 };
}

function commit(board: Board) {
  store.setState({ board: bump(board) });
}

/**
 * Aplica uma transformação no array de elementos.
 *
 * `recordHistory: false` é usado no arraste, em que dezenas de atualizações
 * por segundo devem virar um único passo de undo (o snapshot já foi tirado no
 * pointerdown por `beginHistoryStep`).
 */
function mutate(fn: (elements: Element[]) => Element[], recordHistory = true) {
  const { board, past } = store.getState();
  if (!board) return;

  const elements = fn(board.elements);
  if (elements === board.elements) return;

  store.setState({
    board: bump({ ...board, elements }),
    ...(recordHistory
      ? { past: [...past, board.elements].slice(-HISTORY_LIMIT), future: [] }
      : {}),
  });
}

/** Abre um passo de histórico antes de uma sequência de mutações contínuas. */
export function beginHistoryStep() {
  const { board, past } = store.getState();
  if (!board) return;
  store.setState({ past: [...past, board.elements].slice(-HISTORY_LIMIT), future: [] });
}

export function canUndo(state: EditorState) {
  return state.past.length > 0;
}

export function canRedo(state: EditorState) {
  return state.future.length > 0;
}
