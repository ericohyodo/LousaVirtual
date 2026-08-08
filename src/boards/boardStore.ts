/**
 * Estado global do editor: board atual + ferramenta/estilo ativos + viewport.
 *
 * Fase 1: tudo em memória. Fase 3 pluga a persistência (IndexedDB) escutando
 * `subscribe` e chamando o autosave com debounce.
 */
import { createStore, useStore } from './createStore';
import type { Board, Element, Point, StrokeElement, Tool, Viewport } from '../types/board';
import { createBoard, createId } from '../types/board';

export interface EditorState {
  board: Board;
  tool: Tool;
  color: string;
  strokeWidth: number;
  opacity: number;
  /** Traço em andamento — fica fora de `board.elements` até o pointerup. */
  draft: StrokeElement | null;
}

const store = createStore<EditorState>({
  board: createBoard('Meu primeiro board'),
  tool: 'pen',
  color: '#1a1a1a',
  strokeWidth: 6,
  opacity: 1,
  draft: null,
});

export const boardStore = store;

export function useEditor<S>(selector: (state: EditorState) => S): S {
  return useStore(store, selector);
}

// --- ações -----------------------------------------------------------------

export function setTool(tool: Tool) {
  store.setState({ tool });
}

export function setColor(color: string) {
  store.setState({ color });
}

export function setStrokeWidth(strokeWidth: number) {
  store.setState({ strokeWidth });
}

export function setViewport(viewport: Viewport | ((current: Viewport) => Viewport)) {
  const { board } = store.getState();
  const next = typeof viewport === 'function' ? viewport(board.viewport) : viewport;
  store.setState({ board: { ...board, viewport: next } });
}

export function beginStroke(point: Point) {
  const { color, strokeWidth, opacity } = store.getState();
  const now = Date.now();
  store.setState({
    draft: {
      id: createId(),
      type: 'stroke',
      createdAt: now,
      updatedAt: now,
      style: { color, strokeWidth, opacity },
      points: [point],
    },
  });
}

export function extendStroke(point: Point) {
  const { draft } = store.getState();
  if (!draft) return;
  store.setState({ draft: { ...draft, points: [...draft.points, point] } });
}

export function endStroke() {
  const { draft, board } = store.getState();
  if (!draft) return;

  // Traço com um único ponto ainda vale (é um "ponto" desenhado), mas
  // descartamos cliques sem movimento em que nem pressão houve.
  const finished: StrokeElement = { ...draft, updatedAt: Date.now() };
  store.setState({
    draft: null,
    board: touch({ ...board, elements: [...board.elements, finished] }),
  });
}

export function cancelStroke() {
  store.setState({ draft: null });
}

export function removeElements(ids: Set<string>) {
  if (ids.size === 0) return;
  const { board } = store.getState();
  const elements = board.elements.filter((e) => !ids.has(e.id));
  if (elements.length === board.elements.length) return;
  store.setState({ board: touch({ ...board, elements }) });
}

export function addElement(element: Element) {
  const { board } = store.getState();
  store.setState({ board: touch({ ...board, elements: [...board.elements, element] }) });
}

export function clearBoard() {
  const { board } = store.getState();
  store.setState({ board: touch({ ...board, elements: [] }) });
}

export function renameBoard(name: string) {
  const { board } = store.getState();
  store.setState({ board: touch({ ...board, name }) });
}

/** Marca o board como alterado — `version` é o que detecta conflito no sync (fase 4). */
function touch(board: Board): Board {
  return { ...board, updatedAt: Date.now(), version: board.version + 1 };
}
