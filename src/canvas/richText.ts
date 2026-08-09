/**
 * Texto inline com marcadores leves (`**negrito**`, `*itálico*`) — serializa
 * num único string, renderiza em tspans SVG e edita por seleção no textarea.
 */
import type { TextStyle } from '../types/board';
import { cssFont } from './engine/shapes';

export interface TextRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

const BOLD = '**';
const ITALIC = '*';

/** Quebra uma linha em trechos com estilo. */
export function parseRichLine(line: string, base: TextStyle): TextRun[] {
  const runs: TextRun[] = [];
  let i = 0;
  let bold = Boolean(base.bold);
  let italic = Boolean(base.italic);
  let buffer = '';

  const flush = () => {
    if (buffer.length === 0) return;
    runs.push({ text: buffer, bold, italic });
    buffer = '';
  };

  while (i < line.length) {
    if (line.startsWith(BOLD, i)) {
      flush();
      bold = !bold;
      i += BOLD.length;
      continue;
    }
    if (line[i] === ITALIC && !line.startsWith(BOLD, i)) {
      flush();
      italic = !italic;
      i += 1;
      continue;
    }
    buffer += line[i]!;
    i += 1;
  }

  flush();
  return runs.length > 0 ? runs : [{ text: '', bold, italic }];
}

export function runFont(base: TextStyle, run: TextRun): string {
  return cssFont({
    ...base,
    bold: run.bold,
    italic: run.italic,
  });
}

/** Envolve ou remove marcadores em torno da seleção. */
export function toggleMarker(content: string, start: number, end: number, marker: string): {
  text: string;
  selectionStart: number;
  selectionEnd: number;
} {
  const a = Math.min(start, end);
  const b = Math.max(start, end);
  const selected = content.slice(a, b);

  if (selected.length === 0) {
    const inserted = `${marker}${marker}`;
    const text = content.slice(0, a) + inserted + content.slice(b);
    const cursor = a + marker.length;
    return { text, selectionStart: cursor, selectionEnd: cursor };
  }

  const wrapped =
    selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2;
  if (wrapped) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    const text = content.slice(0, a) + inner + content.slice(b);
    return { text, selectionStart: a, selectionEnd: a + inner.length };
  }

  const next = `${marker}${selected}${marker}`;
  const text = content.slice(0, a) + next + content.slice(b);
  return { text, selectionStart: a, selectionEnd: a + next.length };
}
