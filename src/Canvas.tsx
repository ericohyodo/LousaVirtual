/**
 * O "palco": SVG que renderiza o board inteiro, mais o overlay de edição
 * de texto. Não é um bloco reutilizável de UI (por isso fora de components/).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { setCanvasSize, useEditor } from './boards/boardStore';
import { ElementView } from './canvas/ElementView';
import { InlineEditor } from './canvas/InlineEditor';
import { backgroundStyle } from './canvas/backgrounds';
import { gridColor } from './canvas/colors';
import { unionBounds } from './canvas/engine/bounds';
import { normalizeMarquee } from './canvas/engine/marquee';
import { cardBounds } from './canvas/engine/shapes';
import { shapeHandles } from './canvas/engine/resizeHandles';
import { polylineActionButtons } from './canvas/polylineActions';
import { collectSnapPoints } from './canvas/engine/snapping';
import { toViewBox } from './canvas/viewport';
import { useCanvasPointer } from './input/usePointer';
import { isShapeTool, type CardElement } from './types/board';
import './Canvas.css';

/** Espaçamento da grade em unidades de canvas. */
const GRID_SIZE = 40;

/** Cantos do card, na mesma ordem que `cardHandleAt` testa. */
function cardCorners(card: CardElement): [string, number, number][] {
  const b = cardBounds(card);
  return [
    ['nw', b.x, b.y],
    ['ne', b.x + b.width, b.y],
    ['se', b.x + b.width, b.y + b.height],
    ['sw', b.x, b.y + b.height],
  ];
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

  const board = useEditor((s) => s.board);
  const draftStroke = useEditor((s) => s.draftStroke);
  const draftShape = useEditor((s) => s.draftShape);
  const draftPolyline = useEditor((s) => s.draftPolyline);
  const polylineCursor = useEditor((s) => s.polylineCursor);
  const selectedIds = useEditor((s) => s.selectedIds);
  const selectedFrameIds = useEditor((s) => s.selectedFrameIds);
  const marquee = useEditor((s) => s.marquee);
  const alignGuides = useEditor((s) => s.alignGuides);
  const tool = useEditor((s) => s.tool);
  const editing = useEditor((s) => s.editing);
  const activeSnap = useEditor((s) => s.activeSnap);
  const addRowHint = useEditor((s) => s.addRowHint);

  // O zoom extents precisa saber o tamanho do palco.
  useEffect(() => {
    setCanvasSize(width, height);
  }, [width, height]);

  if (!board) return <div className="canvas" ref={containerRef} />;

  const { viewport, background } = board;
  const selected = board.elements.filter((e) => selectedIds.includes(e.id));
  const selectionBox = unionBounds(selected);
  const onlySelected = selected.length === 1 ? selected[0] : undefined;
  const selectedCard = onlySelected?.type === 'card' ? onlySelected : undefined;
  const selectedShape = onlySelected?.type === 'shape' ? onlySelected : undefined;
  const selectedPolyline =
    onlySelected?.type === 'polyline' && !onlySelected.locked ? onlySelected : undefined;
  const dots = gridColor(background);
  const snapTargets = isShapeTool(tool) ? collectSnapPoints(board.elements) : [];

  const cursor =
    cursorPanning || tool === 'hand'
      ? 'grab'
      : tool === 'select'
        ? 'default'
        : tool === 'eraser'
          ? 'cell'
          : tool === 'text' || tool === 'checklist'
            ? 'text'
            : isShapeTool(tool)
              ? 'crosshair'
              : 'crosshair';

  return (
    <div
      ref={containerRef}
      className="canvas"
      style={{ cursor, background: backgroundStyle(background, board.backgroundGradient) }}
      {...handlers}
    >
      {width > 0 && (
        <svg className="canvas__svg" width={width} height={height} viewBox={toViewBox(viewport, width, height)}>
          <defs>
            <pattern id="grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <circle cx={0} cy={0} r={1 / viewport.zoom} fill={dots} />
            </pattern>
          </defs>

          <rect
            x={viewport.x}
            y={viewport.y}
            width={width / viewport.zoom}
            height={height / viewport.zoom}
            fill="url(#grid)"
          />

          {board.frames.map((frame) => {
            const selected = selectedFrameIds.includes(frame.id);
            return (
              <g key={frame.id} className="canvas__frame">
                <rect
                  x={frame.x}
                  y={frame.y}
                  width={frame.width}
                  height={frame.height}
                  fill={frame.color}
                  stroke={selected ? 'var(--accent)' : 'rgba(0,0,0,0.12)'}
                  strokeWidth={(selected ? 2 : 1) / viewport.zoom}
                />
                <text
                  x={frame.x + 8 / viewport.zoom}
                  y={frame.y + 16 / viewport.zoom}
                  fill="rgba(0,0,0,0.45)"
                  style={{ font: `${12 / viewport.zoom}px Inter, system-ui, sans-serif` }}
                >
                  {frame.name}
                </text>
              </g>
            );
          })}

          {board.elements.map((element) => (
            <ElementView
              key={element.id}
              element={element}
              hidden={
                editing?.elementId === element.id
                  ? element.type === 'text'
                    ? 'all'
                    : (editing.field ?? 'title')
                  : undefined
              }
            />
          ))}

          {draftStroke && <ElementView element={draftStroke} />}
          {draftShape && <ElementView element={draftShape} />}

          {/* Poli-linha em construção: vértices fixos + trecho elástico. */}
          {draftPolyline && (
            <>
              <ElementView
                element={
                  polylineCursor
                    ? { ...draftPolyline, points: [...draftPolyline.points, polylineCursor] }
                    : draftPolyline
                }
              />
              {draftPolyline.points.map((p, i) => (
                <circle
                  key={i}
                  className="canvas__vertex"
                  cx={p.x}
                  cy={p.y}
                  r={3 / viewport.zoom}
                  strokeWidth={1.5 / viewport.zoom}
                />
              ))}
              {draftPolyline.points.length >= 2 && polylineCursor &&
                polylineActionButtons(polylineCursor.x, polylineCursor.y, viewport.zoom).map((btn) => (
                  <g key={btn.action} className={`canvas__poly-action canvas__poly-action--${btn.action}`}>
                    <circle cx={btn.cx} cy={btn.cy} r={btn.r} />
                    {btn.action === 'confirm' ? (
                      <path
                        d={`M ${btn.cx - btn.r * 0.35} ${btn.cy}
                            l ${btn.r * 0.25} ${btn.r * 0.25}
                            l ${btn.r * 0.45} ${-btn.r * 0.45}`}
                        fill="none"
                        strokeWidth={2.2 / viewport.zoom}
                      />
                    ) : (
                      <path
                        d={`M ${btn.cx - btn.r * 0.3} ${btn.cy - btn.r * 0.3}
                            l ${btn.r * 0.6} ${btn.r * 0.6}
                            M ${btn.cx + btn.r * 0.3} ${btn.cy - btn.r * 0.3}
                            l ${-btn.r * 0.6} ${btn.r * 0.6}`}
                        fill="none"
                        strokeWidth={2.2 / viewport.zoom}
                      />
                    )}
                  </g>
                ))}
            </>
          )}

          {alignGuides.map((guide, i) =>
            guide.axis === 'x' ? (
              <line
                key={`g-${i}`}
                className="canvas__align-guide"
                x1={guide.value}
                y1={viewport.y}
                x2={guide.value}
                y2={viewport.y + height / viewport.zoom}
                strokeWidth={1 / viewport.zoom}
              />
            ) : (
              <line
                key={`g-${i}`}
                className="canvas__align-guide"
                x1={viewport.x}
                y1={guide.value}
                x2={viewport.x + width / viewport.zoom}
                y2={guide.value}
                strokeWidth={1 / viewport.zoom}
              />
            ),
          )}

          {marquee && (() => {
            const box = normalizeMarquee(marquee.x1, marquee.y1, marquee.x2, marquee.y2);
            return (
              <rect
                className={`canvas__marquee canvas__marquee--${box.mode}`}
                x={box.x}
                y={box.y}
                width={box.width}
                height={box.height}
                strokeWidth={1 / viewport.zoom}
              />
            );
          })()}

          {/* Vértices de redimensionamento do card selecionado. */}
          {selectedCard &&
            cardCorners(selectedCard).map(([corner, cx, cy]) => (
              <rect
                key={corner}
                className="canvas__handle"
                x={cx - 4 / viewport.zoom}
                y={cy - 4 / viewport.zoom}
                width={8 / viewport.zoom}
                height={8 / viewport.zoom}
                strokeWidth={1.5 / viewport.zoom}
              />
            ))}

          {selectedShape &&
            shapeHandles(selectedShape).map(([handle, cx, cy]) => (
              <rect
                key={handle}
                className="canvas__handle"
                x={cx - 4 / viewport.zoom}
                y={cy - 4 / viewport.zoom}
                width={8 / viewport.zoom}
                height={8 / viewport.zoom}
                strokeWidth={1.5 / viewport.zoom}
              />
            ))}

          {selectedPolyline &&
            selectedPolyline.points.map((p, i) => (
              <circle
                key={`${selectedPolyline.id}-${i}`}
                className="canvas__handle canvas__handle--vertex"
                cx={p.x}
                cy={p.y}
                r={5 / viewport.zoom}
                strokeWidth={1.5 / viewport.zoom}
              />
            ))}

          {snapTargets.map((point, i) => (
            <circle
              key={`${point.elementId}-${i}`}
              className="canvas__snap"
              cx={point.x}
              cy={point.y}
              r={2.5 / viewport.zoom}
              strokeWidth={1 / viewport.zoom}
            />
          ))}

          {addRowHint && (
            <g className="canvas__add-row">
              <circle cx={addRowHint.x} cy={addRowHint.y} r={11 / viewport.zoom} />
              <path
                d={`M ${addRowHint.x - 5 / viewport.zoom} ${addRowHint.y}
                    h ${10 / viewport.zoom}
                    M ${addRowHint.x} ${addRowHint.y - 5 / viewport.zoom}
                    v ${10 / viewport.zoom}`}
                strokeWidth={1.8 / viewport.zoom}
              />
            </g>
          )}

          {activeSnap && (
            <circle
              className="canvas__snap canvas__snap--active"
              cx={activeSnap.x}
              cy={activeSnap.y}
              r={5 / viewport.zoom}
              strokeWidth={2 / viewport.zoom}
            />
          )}

          {selectionBox && (
            <rect
              className={`canvas__selection${selected.some((e) => e.locked) ? ' canvas__selection--locked' : ''}`}
              x={selectionBox.x - 4 / viewport.zoom}
              y={selectionBox.y - 4 / viewport.zoom}
              width={selectionBox.width + 8 / viewport.zoom}
              height={selectionBox.height + 8 / viewport.zoom}
              strokeWidth={1.5 / viewport.zoom}
              strokeDasharray={`${6 / viewport.zoom} ${4 / viewport.zoom}`}
            />
          )}
        </svg>
      )}

      <InlineEditor />
    </div>
  );
}
