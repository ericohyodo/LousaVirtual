/**
 * Folhas de desenho (frames) em tamanhos de papel — 96 DPI, 1 px ≈ 1/96".
 * A4: 210×297 mm → 794×1123 px.
 */
import type { Frame } from '../types/board';
import { createId } from '../types/board';

export interface SheetTemplate {
  id: string;
  label: string;
  width: number;
  height: number;
}

export const SHEET_TEMPLATES: SheetTemplate[] = [
  { id: 'a4-portrait', label: 'A4 vertical', width: 794, height: 1123 },
  { id: 'a4-landscape', label: 'A4 horizontal', width: 1123, height: 794 },
  { id: 'a3-portrait', label: 'A3 vertical', width: 1123, height: 1587 },
  { id: 'a3-landscape', label: 'A3 horizontal', width: 1587, height: 1123 },
];

export function createSheetFrame(template: SheetTemplate, x: number, y: number): Frame {
  return {
    id: createId(),
    name: template.label,
    x,
    y,
    width: template.width,
    height: template.height,
    color: 'rgba(255,255,255,0.92)',
  };
}
