/**
 * Ponte entre Pointer Events e o editor.
 *
 * Responsabilidades:
 *  - normalizar pressão e origem do input (caneta, mouse, dedo);
 *  - palm rejection: vista uma caneta, toques passam a valer só para navegar;
 *  - roteamento por ferramenta: caneta, borracha, formas, texto, checklist,
 *    seleção/arraste e pan/pinch.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import {
  addPolylinePoint,
  appendRow,
  applyMarqueeSelection,
  beginHistoryStep,
  beginShape,
  beginStroke,
  boardStore,
  cancelPolyline,
  cancelStroke,
  clearSelection,
  createCard,
  createChecklist,
  createText,
  endPolyline,
  endShape,
  endStroke,
  extendStroke,
  movePolylineVertex,
  moveSelection,
  movePolylineCursor,
  removeElements,
  resizeCard,
  resizeShapeElement,
  resizeShape,
  clearAlignSnapHold,
  setMarquee,
  startPolyline,
  setActiveSnap,
  setAddRowHint,
  setEditing,
  setSelection,
  setViewport,
  toggleCardItem,
  toggleChecklistItem,
  type AddRowHint,
  type CardCorner,
} from '../boards/boardStore';
import { elementBounds } from '../canvas/engine/bounds';
import { elementsAtPoint, topElementAtPoint } from '../canvas/engine/hitTest';
import {
  cardBounds,
  cardHeaderHeight,
  cardPadding,
  cardRowAt,
  cardRowHeight,
  checkboxSize,
  checklistRowAt,
  checklistRowHeight,
} from '../canvas/engine/shapes';
import { collectSnapPoints, findSnap } from '../canvas/engine/snapping';
import { polylineVertexAt, shapeHandleAt, type ShapeHandle } from '../canvas/engine/resizeHandles';
import { topFrameAtPoint } from '../canvas/engine/marquee';
import { orthogonalCursor } from '../canvas/orthogonal';
import { hitPolylineAction } from '../canvas/polylineActions';
import { panBy, screenToCanvas, zoomAtPoint } from '../canvas/viewport';
import { isShapeTool, type Board, type Element } from '../types/board';

/** Raio da borracha em pixels de tela. */
const ERASER_RADIUS = 10;
/** Tolerância de clique da seleção, em pixels de tela. */
const PICK_RADIUS = 6;
/** Distância em pixels de tela para grudar num ponto de conexão. */
const SNAP_RADIUS = 12;
/** Raio do botão "+" de adicionar linha, em pixels de tela. */
const ADD_BUTTON_RADIUS = 11;
/** Área de pega dos vértices de redimensionamento, em pixels de tela. */
export const HANDLE_RADIUS = 9;

/** Distância mínima (px de tela) para distinguir clique de arraste. */
const DRAG_THRESHOLD_PX = 5;

/** Vértice de redimensionamento do card selecionado sob o ponto, se houver. */
export function cardHandleAt(
  elements: Element[],
  selectedIds: string[],
  x: number,
  y: number,
  radius: number,
): { id: string; corner: CardCorner } | null {
  for (const id of selectedIds) {
    const element = elements.find((e) => e.id === id);
    if (element?.type !== 'card') continue;
    if (element.locked) continue;

    const b = cardBounds(element);
    const corners: [CardCorner, number, number][] = [
      ['nw', b.x, b.y],
      ['ne', b.x + b.width, b.y],
      ['se', b.x + b.width, b.y + b.height],
      ['sw', b.x, b.y + b.height],
    ];

    for (const [corner, cx, cy] of corners) {
      if (Math.hypot(cx - x, cy - y) <= radius) return { id, corner };
    }
  }

  return null;
}

/**
 * Botão "+" na base de uma lista, no estilo do Word: aparece quando o cursor
 * chega perto da borda inferior de um check-list ou card de check-list.
 */
function findAddRowHint(elements: Element[], x: number, y: number, zoom: number): AddRowHint | null {
  const reach = 26 / zoom;

  for (let i = elements.length - 1; i >= 0; i--) {
    const element = elements[i]!;
    const isList =
      element.type === 'checklist' || (element.type === 'card' && element.variant === 'checklist');
    if (!isList) continue;

    const b = elementBounds(element);
    const bottom = b.y + b.height;
    if (x < b.x - reach || x > b.x + b.width + reach) continue;
    if (y < bottom - reach || y > bottom + reach) continue;

    return { elementId: element.id, x: b.x + b.width / 2, y: bottom + ADD_BUTTON_RADIUS / zoom };
  }

  return null;
}

type Gesture =
  | { kind: 'none' }
  | { kind: 'draw'; pointerId: number }
  | { kind: 'erase'; pointerId: number }
  | { kind: 'shape'; pointerId: number }
  | { kind: 'move'; pointerId: number; lastX: number; lastY: number }
  | { kind: 'resize-card'; pointerId: number; id: string; corner: CardCorner; lastX: number; lastY: number }
  | { kind: 'resize-shape'; pointerId: number; id: string; handle: ShapeHandle; lastX: number; lastY: number }
  | {
      kind: 'drag-polyline-vertex';
      pointerId: number;
      id: string;
      index: number;
      lastX: number;
      lastY: number;
    }
  | {
      kind: 'pending-select';
      pointerId: number;
      screenX: number;
      screenY: number;
      canvasX: number;
      canvasY: number;
      hitElementId: string | null;
      hitFrameId: string | null;
      additive: boolean;
    }
  | {
      kind: 'marquee';
      pointerId: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      additive: boolean;
    }
  /** Pan/pinch: um ou dois ponteiros simultâneos. */
  | { kind: 'pan' };

interface PointerInfo {
  x: number;
  y: number;
  pressure: number;
}

function readPointer(e: ReactPointerEvent, el: HTMLElement): PointerInfo {
  const rect = el.getBoundingClientRect();
  const isPen = e.pointerType === 'pen';
  // Mouse reporta 0.5 fixo enquanto pressionado; caneta sem contato reporta 0.
  const pressure = isPen ? (e.pressure > 0 ? e.pressure : 0.5) : 0.5;

  return { x: e.clientX - rect.left, y: e.clientY - rect.top, pressure };
}

/** Centro e distância entre os ponteiros ativos de pan (1 = só centro). */
function pinchState(pointers: Map<number, { x: number; y: number }>) {
  const pts = [...pointers.values()];
  const a = pts[0]!;
  const b = pts[1];
  if (!b) return { cx: a.x, cy: a.y, dist: 0 };
  return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, dist: Math.hypot(b.x - a.x, b.y - a.y) };
}

export function useCanvasPointer(containerRef: RefObject<HTMLElement | null>) {
  const gesture = useRef<Gesture>({ kind: 'none' });
  const panPointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinch = useRef<{ cx: number; cy: number; dist: number } | null>(null);
  const penSeen = useRef(false);
  const spaceDown = useRef(false);
  const [cursorPanning, setCursorPanning] = useState(false);

  // Espaço segurado = pan temporário, como em qualquer editor gráfico.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target?.tagName ?? '');
      if (e.code === 'Space' && !e.repeat && !typing) {
        spaceDown.current = true;
        setCursorPanning(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        setCursorPanning(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  /**
   * Gruda o ponto num ponto de conexão próximo, se houver, e atualiza o
   * realce visual. Devolve a coordenada final a usar.
   */
  const applySnap = useCallback((board: Board, x: number, y: number) => {
    const points = collectSnapPoints(board.elements);
    const snap = findSnap(points, x, y, SNAP_RADIUS / board.viewport.zoom);
    setActiveSnap(snap);
    return snap ? { x: snap.x, y: snap.y } : { x, y };
  }, []);

  const polylinePoint = useCallback(
    (board: Board, x: number, y: number) => {
      const snapped = applySnap(board, x, y);
      const { draftPolyline } = boardStore.getState();
      const last = draftPolyline?.points[draftPolyline.points.length - 1];
      if (!last) return snapped;
      return orthogonalCursor(last, snapped);
    },
    [applySnap],
  );

  const eraseAt = useCallback((screenX: number, screenY: number) => {
    const { board } = boardStore.getState();
    if (!board) return;
    const p = screenToCanvas(screenX, screenY, board.viewport);
    const hits = elementsAtPoint(board.elements, p.x, p.y, ERASER_RADIUS / board.viewport.zoom);
    if (hits.length > 0) removeElements(new Set(hits));
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const el = containerRef.current;
      const { board, tool } = boardStore.getState();
      if (!el || !board) return;

      if (e.pointerType === 'pen') penSeen.current = true;

      const { x, y, pressure } = readPointer(e, el);
      const wantsPan =
        tool === 'hand' || spaceDown.current || e.button === 1 || e.pointerType === 'touch';

      // Capture pode falhar (ponteiro já liberado, evento sintético) — não é
      // motivo para abortar o gesto.
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* segue sem captura */
      }

      if (wantsPan) {
        // Um segundo dedo entrando no meio de um traço cancela o traço:
        // é gesto de navegação, não desenho.
        if (gesture.current.kind === 'draw') cancelStroke();
        panPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        lastPinch.current = pinchState(panPointers.current);
        gesture.current = { kind: 'pan' };
        return;
      }

      const canvasPoint = screenToCanvas(x, y, board.viewport);

      if (tool === 'eraser') {
        gesture.current = { kind: 'erase', pointerId: e.pointerId };
        beginHistoryStep();
        eraseAt(x, y);
        return;
      }

      if (tool === 'pen') {
        gesture.current = { kind: 'draw', pointerId: e.pointerId };
        beginStroke({ x: canvasPoint.x, y: canvasPoint.y, pressure });
        return;
      }

      if (isShapeTool(tool)) {
        gesture.current = { kind: 'shape', pointerId: e.pointerId };
        const start = applySnap(board, canvasPoint.x, canvasPoint.y);
        beginShape(tool, start.x, start.y);
        return;
      }

      if (tool === 'polyline') {
        const p = polylinePoint(board, canvasPoint.x, canvasPoint.y);
        const { draftPolyline, polylineCursor } = boardStore.getState();
        const cursor = polylineCursor ?? draftPolyline?.points[draftPolyline.points.length - 1];

        if (draftPolyline && draftPolyline.points.length >= 2 && cursor) {
          const action = hitPolylineAction(
            canvasPoint.x,
            canvasPoint.y,
            cursor.x,
            cursor.y,
            board.viewport.zoom,
          );
          if (action === 'confirm') {
            endPolyline();
            return;
          }
          if (action === 'cancel') {
            cancelPolyline();
            return;
          }
        }

        if (draftPolyline) addPolylinePoint(p.x, p.y);
        else {
          beginHistoryStep();
          startPolyline(p.x, p.y);
        }
        return;
      }

      if (tool === 'text' || tool === 'checklist' || tool === 'card-text' || tool === 'card-checklist') {
        e.preventDefault();
        const pick = PICK_RADIUS / board.viewport.zoom;
        if (tool === 'text') {
          const hit = topElementAtPoint(board.elements, canvasPoint.x, canvasPoint.y, pick);
          if (hit?.type === 'text') {
            setSelection([hit.id]);
            setEditing({ elementId: hit.id });
            return;
          }
          createText(canvasPoint.x, canvasPoint.y);
          return;
        }
        if (tool === 'checklist') createChecklist(canvasPoint.x, canvasPoint.y);
        else createCard(tool === 'card-text' ? 'text' : 'checklist', canvasPoint.x, canvasPoint.y);
        return;
      }

      // --- seleção ---
      const pick = PICK_RADIUS / board.viewport.zoom;

      // Vértices do card selecionado ganham do resto: ficam sobre a borda e
      // seriam interpretados como clique no próprio card.
      const handle = cardHandleAt(
        board.elements,
        boardStore.getState().selectedIds,
        canvasPoint.x,
        canvasPoint.y,
        HANDLE_RADIUS / board.viewport.zoom,
      );
      if (handle) {
        beginHistoryStep();
        gesture.current = {
          kind: 'resize-card',
          pointerId: e.pointerId,
          id: handle.id,
          corner: handle.corner,
          lastX: e.clientX,
          lastY: e.clientY,
        };
        return;
      }

      const polyVertex = polylineVertexAt(
        board.elements,
        boardStore.getState().selectedIds,
        canvasPoint.x,
        canvasPoint.y,
        HANDLE_RADIUS / board.viewport.zoom,
      );
      if (polyVertex) {
        beginHistoryStep();
        gesture.current = {
          kind: 'drag-polyline-vertex',
          pointerId: e.pointerId,
          id: polyVertex.id,
          index: polyVertex.index,
          lastX: e.clientX,
          lastY: e.clientY,
        };
        return;
      }

      const shapeHandle = shapeHandleAt(
        board.elements,
        boardStore.getState().selectedIds,
        canvasPoint.x,
        canvasPoint.y,
        HANDLE_RADIUS / board.viewport.zoom,
      );
      if (shapeHandle) {
        beginHistoryStep();
        gesture.current = {
          kind: 'resize-shape',
          pointerId: e.pointerId,
          id: shapeHandle.id,
          handle: shapeHandle.handle,
          lastX: e.clientX,
          lastY: e.clientY,
        };
        return;
      }

      // O botão "+" fica fora da caixa do elemento, então é testado antes.
      const hint = boardStore.getState().addRowHint;
      if (hint && Math.hypot(hint.x - canvasPoint.x, hint.y - canvasPoint.y) <= ADD_BUTTON_RADIUS / board.viewport.zoom) {
        e.preventDefault();
        appendRow(hint.elementId);
        setAddRowHint(null);
        return;
      }

      const hit = topElementAtPoint(board.elements, canvasPoint.x, canvasPoint.y, pick);

      if (hit?.type === 'checklist') {
        const row = checklistRowAt(hit, canvasPoint.y);
        const box = checkboxSize(hit.text);
        const inCheckbox =
          row >= 0 &&
          canvasPoint.x >= hit.x &&
          canvasPoint.x <= hit.x + box + checklistRowHeight(hit.text) * 0.4;

        if (inCheckbox) {
          setSelection([hit.id]);
          toggleChecklistItem(hit.id, row);
          return;
        }
      }

      if (hit?.type === 'card' && hit.variant === 'checklist') {
        const row = cardRowAt(hit, canvasPoint.y);
        const left = hit.x + cardPadding(hit.text);
        const inCheckbox =
          row >= 0 &&
          canvasPoint.x >= left &&
          canvasPoint.x <= left + checkboxSize(hit.text) + cardRowHeight(hit.text) * 0.4;

        if (inCheckbox) {
          setSelection([hit.id]);
          toggleCardItem(hit.id, row);
          return;
        }
      }

      const frame =
        hit === null ? topFrameAtPoint(board.frames, canvasPoint.x, canvasPoint.y) : null;

      gesture.current = {
        kind: 'pending-select',
        pointerId: e.pointerId,
        screenX: e.clientX,
        screenY: e.clientY,
        canvasX: canvasPoint.x,
        canvasY: canvasPoint.y,
        hitElementId: hit?.id ?? null,
        hitFrameId: frame?.id ?? null,
        additive: e.shiftKey,
      };
    },
    [containerRef, eraseAt, applySnap, polylinePoint],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const el = containerRef.current;
      const g = gesture.current;
      if (!el) return;

      if (g.kind === 'pan') {
        if (!panPointers.current.has(e.pointerId)) return;
        panPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        const now = pinchState(panPointers.current);
        const prev = lastPinch.current;
        lastPinch.current = now;
        if (!prev) return;

        setViewport((vp) => {
          let next = panBy(vp, now.cx - prev.cx, now.cy - prev.cy);
          if (prev.dist > 0 && now.dist > 0) {
            const rect = el.getBoundingClientRect();
            next = zoomAtPoint(next, now.cx - rect.left, now.cy - rect.top, now.dist / prev.dist);
          }
          return next;
        });
        return;
      }

      const { board, tool } = boardStore.getState();
      if (!board) return;

      // Sem gesto em andamento, o movimento serve só para dar feedback do que
      // aconteceria num clique: ponto de conexão sob o cursor e botão "+".
      if (g.kind === 'none') {
        const rect = el.getBoundingClientRect();
        const p = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, board.viewport);

        if (isShapeTool(tool) || tool === 'polyline') {
          const snap = findSnap(
            collectSnapPoints(board.elements),
            p.x,
            p.y,
            SNAP_RADIUS / board.viewport.zoom,
          );
          setActiveSnap(snap);
          if (tool === 'polyline') {
            const next = polylinePoint(board, p.x, p.y);
            movePolylineCursor(next.x, next.y);
          }
        } else if (tool === 'select') {
          setAddRowHint(findAddRowHint(board.elements, p.x, p.y, board.viewport.zoom));
        }
        return;
      }

      if (g.pointerId !== e.pointerId) return;

      if (g.kind === 'pending-select') {
        const dist = Math.hypot(e.clientX - g.screenX, e.clientY - g.screenY);
        if (dist < DRAG_THRESHOLD_PX) return;

        const { board: b } = boardStore.getState();
        const lockedElement =
          g.hitElementId && b?.elements.find((el) => el.id === g.hitElementId)?.locked;
        const lockedFrame =
          g.hitFrameId && b?.frames.find((fr) => fr.id === g.hitFrameId)?.locked;

        if (g.hitElementId || g.hitFrameId) {
          if (lockedElement || lockedFrame) return;

          if (g.hitElementId) setSelection([g.hitElementId], { additive: g.additive });
          else setSelection([], { frameIds: [g.hitFrameId!], additive: g.additive });
          beginHistoryStep();
          gesture.current = {
            kind: 'move',
            pointerId: g.pointerId,
            lastX: e.clientX,
            lastY: e.clientY,
          };
        } else {
          const rect = el.getBoundingClientRect();
          const p = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, board.viewport);
          gesture.current = {
            kind: 'marquee',
            pointerId: g.pointerId,
            x1: g.canvasX,
            y1: g.canvasY,
            x2: p.x,
            y2: p.y,
            additive: g.additive,
          };
          setMarquee({ x1: g.canvasX, y1: g.canvasY, x2: p.x, y2: p.y });
        }
        return;
      }

      if (g.kind === 'marquee') {
        const rect = el.getBoundingClientRect();
        const p = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, board.viewport);
        gesture.current = { ...g, x2: p.x, y2: p.y };
        setMarquee({ x1: g.x1, y1: g.y1, x2: p.x, y2: p.y });
        return;
      }

      if (g.kind === 'move') {
        const dx = (e.clientX - g.lastX) / board.viewport.zoom;
        const dy = (e.clientY - g.lastY) / board.viewport.zoom;
        gesture.current = { ...g, lastX: e.clientX, lastY: e.clientY };
        moveSelection(dx, dy);
        return;
      }

      if (g.kind === 'resize-card') {
        const dx = (e.clientX - g.lastX) / board.viewport.zoom;
        const dy = (e.clientY - g.lastY) / board.viewport.zoom;
        gesture.current = { ...g, lastX: e.clientX, lastY: e.clientY };
        resizeCard(g.id, g.corner, dx, dy);
        return;
      }

      if (g.kind === 'resize-shape') {
        const dx = (e.clientX - g.lastX) / board.viewport.zoom;
        const dy = (e.clientY - g.lastY) / board.viewport.zoom;
        gesture.current = { ...g, lastX: e.clientX, lastY: e.clientY };
        resizeShapeElement(g.id, g.handle, dx, dy);
        return;
      }

      if (g.kind === 'drag-polyline-vertex') {
        const rect = el.getBoundingClientRect();
        const p = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, board.viewport);
        const snapped = applySnap(board, p.x, p.y);
        const poly = board.elements.find((el) => el.id === g.id);
        const prev = poly?.type === 'polyline' ? poly.points[g.index - 1] : undefined;
        const next = prev ? orthogonalCursor(prev, snapped) : snapped;
        movePolylineVertex(g.id, g.index, next.x, next.y);
        return;
      }

      const { x, y, pressure } = readPointer(e, el);

      if (g.kind === 'erase') {
        eraseAt(x, y);
        return;
      }

      if (g.kind === 'shape') {
        const p = screenToCanvas(x, y, board.viewport);
        // Shift (proporção travada) e snap são excludentes: se o usuário pede
        // ângulo exato, respeitamos o ângulo.
        const target = e.shiftKey ? p : applySnap(board, p.x, p.y);
        resizeShape(target.x, target.y, e.shiftKey);
        return;
      }

      // Coalesced events preservam a resolução real da mesa digitalizadora,
      // que amostra bem mais rápido que a taxa de quadros do navegador.
      const events =
        typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];

      if (events.length > 0) {
        const rect = el.getBoundingClientRect();
        for (const ce of events) {
          const p = screenToCanvas(ce.clientX - rect.left, ce.clientY - rect.top, board.viewport);
          const cp = e.pointerType === 'pen' ? (ce.pressure > 0 ? ce.pressure : 0.5) : 0.5;
          extendStroke({ x: p.x, y: p.y, pressure: cp });
        }
      } else {
        const p = screenToCanvas(x, y, board.viewport);
        extendStroke({ x: p.x, y: p.y, pressure });
      }
    },
    [containerRef, eraseAt, polylinePoint],
  );

  const finish = useCallback(
    (e: ReactPointerEvent) => {
      const el = containerRef.current;
      if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

      const g = gesture.current;

      if (g.kind === 'pan') {
        panPointers.current.delete(e.pointerId);
        lastPinch.current = panPointers.current.size > 0 ? pinchState(panPointers.current) : null;
        if (panPointers.current.size === 0) gesture.current = { kind: 'none' };
        return;
      }

      if (g.kind === 'none' || g.pointerId !== e.pointerId) return;

      if (g.kind === 'pending-select') {
        const dist = Math.hypot(e.clientX - g.screenX, e.clientY - g.screenY);
        if (dist < DRAG_THRESHOLD_PX) {
          if (g.hitElementId) setSelection([g.hitElementId], { additive: g.additive });
          else if (g.hitFrameId) setSelection([], { frameIds: [g.hitFrameId], additive: g.additive });
          else clearSelection();
        }
        gesture.current = { kind: 'none' };
        return;
      }

      if (g.kind === 'marquee') {
        applyMarqueeSelection(g.x1, g.y1, g.x2, g.y2, g.additive);
        setMarquee(null);
        gesture.current = { kind: 'none' };
        return;
      }

      if (g.kind === 'move' || g.kind === 'resize-card' || g.kind === 'resize-shape' || g.kind === 'drag-polyline-vertex') {
        clearAlignSnapHold();
      }

      if (g.kind === 'draw') endStroke();
      if (g.kind === 'shape') {
        endShape();
        setActiveSnap(null);
      }
      gesture.current = { kind: 'none' };
    },
    [containerRef],
  );

  /** Duplo clique num texto/checklist entra em edição. */
  const onDoubleClick = useCallback(
    (e: ReactMouseEvent) => {
      const el = containerRef.current;
      const { board, draftPolyline } = boardStore.getState();
      if (!el || !board) return;

      // Duplo clique fecha a poli-linha em andamento.
      if (draftPolyline) {
        endPolyline();
        return;
      }

      const rect = el.getBoundingClientRect();
      const p = screenToCanvas(e.clientX - rect.left, e.clientY - rect.top, board.viewport);
      const hit = topElementAtPoint(board.elements, p.x, p.y, PICK_RADIUS / board.viewport.zoom);
      if (!hit || hit.locked) return;

      setSelection([hit.id]);

      if (hit.type === 'text') {
        setEditing({ elementId: hit.id });
      } else if (hit.type === 'checklist') {
        const row = checklistRowAt(hit, p.y);
        setEditing({ elementId: hit.id, field: row >= 0 ? row : 'title' });
      } else if (hit.type === 'card') {
        // Acima da faixa de título → título; abaixo → a linha clicada
        // (ou o corpo inteiro, no card de texto).
        const inHeader = p.y < hit.y + cardHeaderHeight(hit.text);
        if (inHeader) {
          setEditing({ elementId: hit.id, field: 'title' });
        } else if (hit.variant === 'text') {
          setEditing({ elementId: hit.id, field: 'body' });
        } else {
          const row = cardRowAt(hit, p.y);
          setEditing({ elementId: hit.id, field: row >= 0 ? row : 0 });
        }
      }
    },
    [containerRef],
  );

  // Wheel precisa de listener não-passivo para permitir preventDefault
  // (senão o navegador dá zoom na página inteira com ctrl+scroll).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Divisor alto: um "notch" de roda (deltaY ≈ 100) dá ~1.28x, e o
        // pinch de trackpad (deltas pequenos e frequentes) fica suave.
        setViewport((vp) => zoomAtPoint(vp, x, y, Math.exp(-e.deltaY / 400)));
      } else if (e.shiftKey) {
        setViewport((vp) => panBy(vp, -e.deltaY, 0));
      } else {
        setViewport((vp) => panBy(vp, -e.deltaX, -e.deltaY));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef]);

  return {
    cursorPanning,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onDoubleClick,
    },
  };
}
