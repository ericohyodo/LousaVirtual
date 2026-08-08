/**
 * O "palco": SVG que renderiza o board inteiro.
 *
 * Não é um bloco reutilizável de UI (por isso fora de components/), é o
 * componente central do editor.
 */
import { memo, useLayoutEffect, useRef, useState } from 'react';
import { useEditor } from './boards/boardStore';
import { getElementPath } from './canvas/engine/freehand';
import { toViewBox } from './canvas/viewport';
import { useCanvasPointer } from './input/usePointer';
import type { Element, StrokeElement } from './types/board';
import './Canvas.css';

/** Espaçamento da grade em unidades de canvas. */
const GRID_SIZE = 40;

const StrokePath = memo(function StrokePath({ element }: { element: StrokeElement }) {
  return (
    <path
      d={getElementPath(element)}
      fill={element.style.color}
      opacity={element.style.opacity}
    />
  );
});

function ElementView({ element }: { element: Element }) {
  switch (element.type) {
    case 'stroke':
      return <StrokePath element={element} />;
    case 'shape':
      // Fase 2.
      return null;
    case 'text':
      return (
        <text
          x={element.x}
          y={element.y}
          fill={element.style.color}
          opacity={element.style.opacity}
          fontSize={element.fontSize}
        >
          {element.content}
        </text>
      );
  }
}

function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Medida síncrona no primeiro layout: o ResizeObserver só entrega o
    // callback no próximo frame de renderização, e em aba oculta pode nem
    // entregar — sem isso o SVG não sairia do tamanho zero.
    const measure = (width: number, height: number) => {
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };

    const rect = el.getBoundingClientRect();
    measure(rect.width, rect.height);

    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) measure(box.width, box.height);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useElementSize(containerRef);
  const { cursorPanning, handlers } = useCanvasPointer(containerRef);

  const viewport = useEditor((s) => s.board.viewport);
  const elements = useEditor((s) => s.board.elements);
  const draft = useEditor((s) => s.draft);
  const tool = useEditor((s) => s.tool);

  const cursor = cursorPanning || tool === 'hand' ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair';

  return (
    <div ref={containerRef} className="canvas" style={{ cursor }} {...handlers}>
      {width > 0 && (
        <svg
          className="canvas__svg"
          width={width}
          height={height}
          viewBox={toViewBox(viewport, width, height)}
        >
          <defs>
            <pattern
              id="grid"
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
              x={0}
              y={0}
            >
              <circle cx={0} cy={0} r={1 / viewport.zoom} className="canvas__grid-dot" />
            </pattern>
          </defs>

          <rect
            x={viewport.x}
            y={viewport.y}
            width={width / viewport.zoom}
            height={height / viewport.zoom}
            fill="url(#grid)"
          />

          {elements.map((element) => (
            <ElementView key={element.id} element={element} />
          ))}

          {draft && <StrokePath element={draft} />}
        </svg>
      )}
    </div>
  );
}
