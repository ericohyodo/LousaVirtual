/**
 * Ponte entre Pointer Events e o editor.
 *
 * Responsabilidades:
 *  - normalizar pressão/tilt e origem do input (caneta, mouse, dedo);
 *  - palm rejection: se uma caneta já foi vista, toques passam a ser ignorados
 *    para desenho (continuam válidos para pan/pinch);
 *  - roteamento por ferramenta: pen → traço, eraser → apagar, hand/espaço/
 *    botão do meio → pan.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import {
  beginStroke,
  boardStore,
  cancelStroke,
  endStroke,
  extendStroke,
  removeElements,
  setViewport,
} from '../boards/boardStore';
import { elementsAtPoint } from '../canvas/engine/hitTest';
import { panBy, screenToCanvas, zoomAtPoint } from '../canvas/viewport';

/** Raio da borracha em pixels de tela. */
const ERASER_RADIUS = 10;

type Gesture =
  | { kind: 'none' }
  | { kind: 'draw'; pointerId: number }
  | { kind: 'erase'; pointerId: number }
  /** Pan/pinch: um ou dois ponteiros simultâneos (dedos, mouse, botão do meio). */
  | { kind: 'pan' };

interface PointerInfo {
  x: number;
  y: number;
  pressure: number;
}

/** Extrai posição relativa ao elemento e pressão normalizada. */
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
  /** Ponteiros participando do pan/pinch, em coordenadas de cliente. */
  const panPointers = useRef(new Map<number, { x: number; y: number }>());
  const lastPinch = useRef<{ cx: number; cy: number; dist: number } | null>(null);
  const penSeen = useRef(false);
  const spaceDown = useRef(false);
  const [cursorPanning, setCursorPanning] = useState(false);

  // Espaço segurado = pan temporário, como em qualquer editor gráfico.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
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

  const eraseAt = useCallback((screenX: number, screenY: number) => {
    const { board } = boardStore.getState();
    const { zoom } = board.viewport;
    const p = screenToCanvas(screenX, screenY, board.viewport);
    const hits = elementsAtPoint(board.elements, p.x, p.y, ERASER_RADIUS / zoom);
    if (hits.length > 0) removeElements(new Set(hits));
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      const el = containerRef.current;
      if (!el) return;

      if (e.pointerType === 'pen') penSeen.current = true;
      const isPalm = e.pointerType === 'touch' && penSeen.current;

      const { x, y, pressure } = readPointer(e, el);
      const { tool } = boardStore.getState();
      const wantsPan =
        tool === 'hand' || spaceDown.current || e.button === 1 || isPalm || e.pointerType === 'touch';

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

      if (tool === 'eraser') {
        gesture.current = { kind: 'erase', pointerId: e.pointerId };
        eraseAt(x, y);
        return;
      }

      if (tool === 'pen') {
        gesture.current = { kind: 'draw', pointerId: e.pointerId };
        const { board } = boardStore.getState();
        const p = screenToCanvas(x, y, board.viewport);
        beginStroke({ x: p.x, y: p.y, pressure });
      }
    },
    [containerRef, eraseAt],
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

      if (g.kind === 'none' || g.pointerId !== e.pointerId) return;

      const { x, y, pressure } = readPointer(e, el);

      if (g.kind === 'erase') {
        eraseAt(x, y);
        return;
      }

      // Coalesced events preservam a resolução real da mesa digitalizadora,
      // que amostra bem mais rápido que a taxa de quadros do navegador.
      const events = typeof e.nativeEvent.getCoalescedEvents === 'function'
        ? e.nativeEvent.getCoalescedEvents()
        : [];
      const { board } = boardStore.getState();

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
    [containerRef, eraseAt],
  );

  const finish = useCallback((e: ReactPointerEvent) => {
    const el = containerRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

    const g = gesture.current;

    if (g.kind === 'pan') {
      panPointers.current.delete(e.pointerId);
      // Ao soltar um dedo do pinch, o outro continua o pan sem "pular".
      lastPinch.current = panPointers.current.size > 0 ? pinchState(panPointers.current) : null;
      if (panPointers.current.size === 0) gesture.current = { kind: 'none' };
      return;
    }

    if (g.kind === 'none' || g.pointerId !== e.pointerId) return;

    if (g.kind === 'draw') endStroke();
    gesture.current = { kind: 'none' };
  }, [containerRef]);

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
    },
  };
}
