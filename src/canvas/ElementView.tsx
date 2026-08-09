/** Renderização SVG de cada tipo de elemento. */
import { Fragment, memo } from 'react';
import type {
  CardElement,
  ChecklistElement,
  ChecklistItem,
  Element,
  PolylineElement,
  ShapeElement,
  StrokeElement,
  TextElement,
  TextStyle,
} from '../types/board';
import { isDark, mix } from './colors';
import { getElementPath } from './engine/freehand';
import {
  arrowHead,
  arrowLineEnd,
  cardHeaderHeight,
  cardHeight,
  cardPadding,
  cardRowHeight,
  cardTextLines,
  cardWidth,
  checkboxSize,
  checklistRowHeight,
  cssFont,
  lineEnds,
  lineHeight,
  normalizeRect,
  polylineArrowHead,
  polylinePath,
  textLines,
} from './engine/shapes';
import { parseRichLine, runFont, type TextRun } from './richText';

/**
 * Campo que está sendo editado por um campo HTML sobreposto e portanto não
 * deve ser desenhado no SVG (senão o glifo apareceria dobrado).
 * `'all'` esconde o elemento inteiro; número/`'title'` escondem uma linha.
 */
export type HiddenField = number | 'title' | 'body' | 'all';

const StrokeView = memo(function StrokeView({ element }: { element: StrokeElement }) {
  return <path d={getElementPath(element)} fill={element.style.color} opacity={element.style.opacity} />;
});

const ShapeView = memo(function ShapeView({ element }: { element: ShapeElement }) {
  const { color, strokeWidth, opacity, fill } = element.style;
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: fill && fill !== 'none' ? fill : 'none',
    opacity,
  };

  if (element.shapeType === 'line' || element.shapeType === 'arrow') {
    const { x1, y1, x2, y2 } = lineEnds(element);

    if (element.shapeType === 'line') {
      return (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={opacity}
        />
      );
    }

    // A haste para na base do triângulo — ver `arrowLineEnd`.
    const stem = arrowLineEnd(element, strokeWidth);
    return (
      <g opacity={opacity}>
        <line
          x1={x1}
          y1={y1}
          x2={stem.x}
          y2={stem.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <polygon points={arrowHead(element, strokeWidth)} fill={color} stroke={color} strokeWidth={strokeWidth * 0.35} strokeLinejoin="round" />
      </g>
    );
  }

  const r = normalizeRect(element);

  if (element.shapeType === 'ellipse') {
    return (
      <ellipse
        cx={r.x + r.width / 2}
        cy={r.y + r.height / 2}
        rx={r.width / 2}
        ry={r.height / 2}
        {...common}
      />
    );
  }

  return <rect x={r.x} y={r.y} width={r.width} height={r.height} rx={Math.min(4, r.width / 10)} {...common} />;
});

const TextView = memo(function TextView({ element }: { element: TextElement }) {
  const lines = textLines(element);
  const lh = lineHeight(element.text);
  const baseY = element.y + element.text.fontSize * 0.82;

  return (
    <text x={element.x} fill={element.style.color} opacity={element.style.opacity} style={{ whiteSpace: 'pre' }}>
      {lines.map((line, lineIndex) => {
        const runs = parseRichLine(line, { ...element.text, bold: false, italic: false });
        const y = baseY + lineIndex * lh;
        let x = element.x;

        return (
          <Fragment key={lineIndex}>
            {runs.map((run, runIndex) => {
              const key = `${lineIndex}-${runIndex}`;
              const chunk = run.text || (runIndex === 0 && lineIndex === 0 ? ' ' : '');
              const node = (
                <tspan key={key} x={x} y={y} style={{ font: runFont(element.text, run) }}>
                  {chunk}
                </tspan>
              );
              x += measureRunWidth(chunk, element.text, run);
              return node;
            })}
          </Fragment>
        );
      })}
    </text>
  );
});

function measureRunWidth(text: string, base: TextStyle, run: TextRun): number {
  if (typeof document === 'undefined') return text.length * base.fontSize * 0.55;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * base.fontSize * 0.55;
  ctx.font = runFont(base, run);
  return ctx.measureText(text).width;
}

const ChecklistView = memo(function ChecklistView({
  element,
  hidden,
}: {
  element: ChecklistElement;
  hidden?: HiddenField;
}) {
  const row = checklistRowHeight(element.text);
  const { color, opacity } = element.style;
  const titleOffset = element.title ? row : 0;

  return (
    <g opacity={opacity}>
      {element.title && hidden !== 'title' && (
        <text
          x={element.x}
          y={element.y + element.text.fontSize * 0.95}
          fill={color}
          style={{ font: cssFont({ ...element.text, bold: true }), whiteSpace: 'pre' }}
        >
          {element.title}
        </text>
      )}

      {element.items.map((item, i) => (
        <CheckRow
          key={item.id}
          x={element.x}
          top={element.y + titleOffset + i * row}
          row={row}
          style={element.text}
          color={color}
          item={item}
          hidden={hidden === i}
        />
      ))}
    </g>
  );
});

/** Caixinha + rótulo de um item marcável — compartilhado por checklist e card. */
function CheckRow({
  x,
  top,
  row,
  style,
  color,
  item,
  hidden,
}: {
  x: number;
  top: number;
  row: number;
  style: TextStyle;
  color: string;
  item: ChecklistItem;
  hidden: boolean;
}) {
  const box = checkboxSize(style);
  const boxY = top + (row - box) / 2;
  const gap = row * 0.4;

  return (
    <g>
      <rect
        x={x}
        y={boxY}
        width={box}
        height={box}
        rx={box * 0.22}
        fill={item.done ? color : 'none'}
        stroke={color}
        strokeWidth={Math.max(1, style.fontSize * 0.08)}
        opacity={item.done ? 1 : 0.65}
      />
      {item.done && (
        <path
          d={`M ${x + box * 0.24} ${boxY + box * 0.52} l ${box * 0.2} ${box * 0.2} l ${box * 0.36} ${-box * 0.42}`}
          fill="none"
          stroke="#ffffff"
          strokeWidth={Math.max(1.2, box * 0.14)}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {!hidden && (
        <text
          x={x + box + gap}
          y={top + row / 2 + style.fontSize * 0.35}
          fill={color}
          opacity={item.done ? 0.45 : 1}
          textDecoration={item.done ? 'line-through' : undefined}
          style={{ font: cssFont(style), whiteSpace: 'pre' }}
        >
          {item.text}
        </text>
      )}
    </g>
  );
}

const CardView = memo(function CardView({
  element,
  hidden,
}: {
  element: CardElement;
  hidden?: HiddenField;
}) {
  const width = cardWidth(element);
  const height = cardHeight(element);
  const header = cardHeaderHeight(element.text);
  const padding = cardPadding(element.text);
  const radius = Math.min(10, element.text.fontSize * 0.5);

  // Paleta "clean" inspirada em caderno de resumo: papel branco, faixa em
  // tinta muito diluída e título na cor cheia — o oposto de um bloco chapado.
  const accent = element.style.color;
  const surface = element.surface;
  const bandFill = mix(surface, accent, 0.12);
  const borderColor = mix(surface, accent, 0.3);
  const titleColor = isDark(surface) ? mix(accent, '#ffffff', 0.5) : accent;
  const bodyColor = isDark(surface) ? '#ededeb' : '#2b2b2b';
  const bodyTop = element.y + header + padding;

  return (
    <g opacity={element.style.opacity}>
      {/* corpo */}
      <rect
        x={element.x}
        y={element.y}
        width={width}
        height={height}
        rx={radius}
        fill={surface}
        stroke={borderColor}
        strokeWidth={1.25}
      />

      {/* faixa de título: só os cantos de cima arredondados */}
      <path
        d={`M ${element.x} ${element.y + radius}
            a ${radius} ${radius} 0 0 1 ${radius} ${-radius}
            h ${width - radius * 2}
            a ${radius} ${radius} 0 0 1 ${radius} ${radius}
            v ${header - radius}
            h ${-width}
            Z`}
        fill={bandFill}
      />

      {/* fio da cor cheia separando faixa e corpo — é o que dá o ar de caderno */}
      <path
        d={`M ${element.x} ${element.y + header} h ${width}`}
        stroke={accent}
        strokeWidth={1.5}
        opacity={0.55}
      />

      {hidden !== 'title' && (
        <text
          x={element.x + padding}
          y={element.y + header / 2 + element.text.fontSize * 0.36}
          fill={titleColor}
          style={{ font: cssFont({ ...element.text, bold: true }), whiteSpace: 'pre' }}
        >
          {element.title}
        </text>
      )}

      {element.variant === 'checklist'
        ? element.items.map((item, i) => (
            <CheckRow
              key={item.id}
              x={element.x + padding}
              top={bodyTop + i * cardRowHeight(element.text)}
              row={cardRowHeight(element.text)}
              style={element.text}
              color={bodyColor}
              item={item}
              hidden={hidden === i}
            />
          ))
        : hidden !== 'body' &&
          cardTextLines(element).map((line, i) => (
            <text
              key={i}
              x={element.x + padding}
              y={bodyTop + i * lineHeight(element.text) + element.text.fontSize * 0.82}
              fill={bodyColor}
              style={{ font: cssFont(element.text), whiteSpace: 'pre' }}
            >
              {line}
            </text>
          ))}
    </g>
  );
});

const PolylineView = memo(function PolylineView({ element }: { element: PolylineElement }) {
  const { color, strokeWidth, opacity } = element.style;
  const head = element.arrow ? polylineArrowHead(element.points, strokeWidth) : null;

  // Com seta, o último vértice recua para a base do triângulo (mesma correção
  // da ferramenta de seta).
  const points = head
    ? [...element.points.slice(0, -1), head.end]
    : element.points;

  return (
    <g opacity={opacity}>
      <path
        d={polylinePath(points)}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {head && <polygon points={head.head} fill={color} />}
    </g>
  );
});

export function ElementView({ element, hidden }: { element: Element; hidden?: HiddenField }) {
  switch (element.type) {
    case 'stroke':
      return <StrokeView element={element} />;
    case 'shape':
      return <ShapeView element={element} />;
    case 'text':
      return hidden === 'all' ? null : <TextView element={element} />;
    case 'checklist':
      return <ChecklistView element={element} hidden={hidden} />;
    case 'card':
      return <CardView element={element} hidden={hidden} />;
    case 'polyline':
      return <PolylineView element={element} />;
  }
}
