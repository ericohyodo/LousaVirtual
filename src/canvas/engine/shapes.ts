/**
 * Geometria das formas nativas (retângulo, elipse, linha, seta) e medição de
 * texto. Formas são SVG nativo — não passam pelo perfect-freehand.
 */
import type {
  CardElement,
  ChecklistElement,
  ShapeElement,
  TextElement,
  TextStyle,
} from '../../types/board';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Converte largura/altura negativas (arraste para trás) em um retângulo válido. */
export function normalizeRect(shape: Rect): Rect {
  return {
    x: shape.width < 0 ? shape.x + shape.width : shape.x,
    y: shape.height < 0 ? shape.y + shape.height : shape.y,
    width: Math.abs(shape.width),
    height: Math.abs(shape.height),
  };
}

/** Pontos inicial e final de linhas/setas (usam o retângulo como diagonal). */
export function lineEnds(shape: ShapeElement) {
  return { x1: shape.x, y1: shape.y, x2: shape.x + shape.width, y2: shape.y + shape.height };
}

const ARROW_SPREAD = Math.PI / 7;

function arrowSize(strokeWidth: number): number {
  return Math.max(8, strokeWidth * 3.2);
}

/**
 * Ponta da seta como polígono, em coordenadas de canvas.
 * Desenhamos à mão em vez de usar `<marker>`: marker herda escala do
 * stroke-width de um jeito difícil de controlar sob zoom.
 */
export function arrowHead(shape: ShapeElement, strokeWidth: number): string {
  const { x1, y1, x2, y2 } = lineEnds(shape);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = arrowSize(strokeWidth);

  const ax = x2 - size * Math.cos(angle - ARROW_SPREAD);
  const ay = y2 - size * Math.sin(angle - ARROW_SPREAD);
  const bx = x2 - size * Math.cos(angle + ARROW_SPREAD);
  const by = y2 - size * Math.sin(angle + ARROW_SPREAD);

  return `${x2},${y2} ${ax},${ay} ${bx},${by}`;
}

/**
 * Onde a haste da seta deve terminar: na base do triângulo, não na ponta.
 *
 * Se a haste for até (x2,y2), a tampa arredondada do traço avança
 * `strokeWidth/2` além do bico e aparece como uma sobra atrás da ponta —
 * quanto mais grossa a seta, mais visível.
 */
export function arrowLineEnd(shape: ShapeElement, strokeWidth: number) {
  const { x1, y1, x2, y2 } = lineEnds(shape);
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length === 0) return { x: x2, y: y2 };

  // 0.9 = cos(spread): distância da ponta até a base do triângulo.
  // Recuamos um pouco menos para não abrir fresta entre haste e ponta.
  const back = Math.min(arrowSize(strokeWidth) * 0.82, length);
  return { x: x2 - (back * (x2 - x1)) / length, y: y2 - (back * (y2 - y1)) / length };
}

// --- poli-linha --------------------------------------------------------------

/** Ponta de seta do último segmento de uma poli-linha. */
export function polylineArrowHead(
  points: { x: number; y: number }[],
  strokeWidth: number,
): { head: string; end: { x: number; y: number } } | null {
  const tip = points[points.length - 1];
  const previous = points[points.length - 2];
  if (!tip || !previous) return null;

  const fake = {
    x: previous.x,
    y: previous.y,
    width: tip.x - previous.x,
    height: tip.y - previous.y,
  } as ShapeElement;

  return { head: arrowHead(fake, strokeWidth), end: arrowLineEnd(fake, strokeWidth) };
}

export function polylinePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

// --- medição de texto ------------------------------------------------------

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}

export function cssFont(style: TextStyle): string {
  const weight = style.bold ? '700' : '400';
  const italic = style.italic ? 'italic ' : '';
  return `${italic}${weight} ${style.fontSize}px ${style.fontFamily}`;
}

/** Entrelinha usada tanto na renderização quanto no cálculo de bounds. */
export function lineHeight(style: TextStyle): number {
  return Math.round(style.fontSize * 1.35);
}

export function measureTextWidth(text: string, style: TextStyle): number {
  const ctx = getMeasureContext();
  if (!ctx) return text.length * style.fontSize * 0.6;
  ctx.font = cssFont(style);
  return ctx.measureText(text).width;
}

export function textLines(element: TextElement): string[] {
  return element.content.split('\n');
}

export function textBounds(element: TextElement): Rect {
  const lines = textLines(element);
  const width = Math.max(...lines.map((line) => measureTextWidth(line, element.text)), 0);
  return {
    x: element.x,
    y: element.y,
    width: Math.max(width, element.text.fontSize * 0.5),
    height: lines.length * lineHeight(element.text),
  };
}

// --- checklist -------------------------------------------------------------

/** Altura de uma linha de checklist (maior que a de texto: cabe a caixa). */
export function checklistRowHeight(style: TextStyle): number {
  return Math.round(style.fontSize * 1.7);
}

export function checkboxSize(style: TextStyle): number {
  return Math.round(style.fontSize * 0.95);
}

/** Recuo do texto do item em relação à borda esquerda (caixinha + respiro). */
export function checklistTextOffset(element: ChecklistElement): number {
  return checkboxSize(element.text) + checklistRowHeight(element.text) * 0.4;
}

/**
 * Largura real da lista: acompanha o conteúdo, com `element.width` servindo
 * apenas de mínimo. Sem isso a caixa teria uma capacidade fixa de caracteres
 * e o texto seria cortado ao passar dela.
 */
export function checklistWidth(element: ChecklistElement): number {
  const offset = checklistTextOffset(element);
  const padding = element.text.fontSize * 0.8;

  let content = element.title
    ? measureTextWidth(element.title, { ...element.text, bold: true }) + offset
    : 0;

  for (const item of element.items) {
    content = Math.max(content, measureTextWidth(item.text, element.text) + offset);
  }

  return Math.max(element.width, content + padding);
}

export function checklistBounds(element: ChecklistElement): Rect {
  const row = checklistRowHeight(element.text);
  const titleHeight = element.title ? row : 0;
  return {
    x: element.x,
    y: element.y,
    width: checklistWidth(element),
    height: titleHeight + Math.max(element.items.length, 1) * row,
  };
}

/** Índice da linha de item sob uma coordenada de canvas (-1 = fora/título). */
export function checklistRowAt(element: ChecklistElement, y: number): number {
  const row = checklistRowHeight(element.text);
  const top = element.y + (element.title ? row : 0);
  const index = Math.floor((y - top) / row);
  return index >= 0 && index < element.items.length ? index : -1;
}

// --- card ------------------------------------------------------------------

/** Altura da faixa de título. */
export function cardHeaderHeight(style: TextStyle): number {
  return Math.round(style.fontSize * 2.1);
}

/** Respiro interno entre a borda do card e o conteúdo. */
export function cardPadding(style: TextStyle): number {
  return Math.round(style.fontSize * 0.7);
}

export function cardRowHeight(style: TextStyle): number {
  return checklistRowHeight(style);
}

/** Linhas do corpo de um card de texto (mínimo 3, para o card não nascer raso). */
export function cardTextLines(card: CardElement): string[] {
  const lines = card.content.split('\n');
  while (lines.length < 3) lines.push('');
  return lines;
}

export function cardWidth(card: CardElement): number {
  const padding = cardPadding(card.text);
  const offset = checkboxSize(card.text) + cardRowHeight(card.text) * 0.4;

  let content = measureTextWidth(card.title, { ...card.text, bold: true });

  if (card.variant === 'checklist') {
    for (const item of card.items) {
      content = Math.max(content, measureTextWidth(item.text, card.text) + offset);
    }
  } else {
    for (const line of cardTextLines(card)) {
      content = Math.max(content, measureTextWidth(line, card.text));
    }
  }

  return Math.max(card.width, content + padding * 2);
}

export function cardHeight(card: CardElement): number {
  const padding = cardPadding(card.text);
  const rows =
    card.variant === 'checklist'
      ? Math.max(card.items.length, 1) * cardRowHeight(card.text)
      : cardTextLines(card).length * lineHeight(card.text);

  return Math.max(card.minHeight ?? 0, cardHeaderHeight(card.text) + padding * 2 + rows);
}

export function cardBounds(card: CardElement): Rect {
  return { x: card.x, y: card.y, width: cardWidth(card), height: cardHeight(card) };
}

/** Topo do corpo (logo abaixo da faixa de título, já com respiro). */
export function cardBodyTop(card: CardElement): number {
  return card.y + cardHeaderHeight(card.text) + cardPadding(card.text);
}

/** Índice da linha do corpo sob uma coordenada de canvas (-1 = fora). */
export function cardRowAt(card: CardElement, y: number): number {
  const row = card.variant === 'checklist' ? cardRowHeight(card.text) : lineHeight(card.text);
  const count = card.variant === 'checklist' ? card.items.length : cardTextLines(card).length;
  const index = Math.floor((y - cardBodyTop(card)) / row);
  return index >= 0 && index < count ? index : -1;
}
