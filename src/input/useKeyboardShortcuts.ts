/**
 * Atalhos de teclado. Objetivo declarado na spec: trocar de ferramenta sem
 * tirar a mão da caneta.
 */
import { useEffect } from 'react';
import { setTool, setViewport } from '../boards/boardStore';
import type { Tool } from '../types/board';

const TOOL_SHORTCUTS: Record<string, Tool> = {
  Digit1: 'pen',
  KeyP: 'pen',
  Digit2: 'eraser',
  KeyE: 'eraser',
  Digit3: 'hand',
  KeyH: 'hand',
};

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? '')) return;
      if (e.altKey) return;

      if (!e.ctrlKey && !e.metaKey) {
        const tool = TOOL_SHORTCUTS[e.code];
        if (tool) {
          e.preventDefault();
          setTool(tool);
        }
        return;
      }

      // Ctrl/Cmd + 0 volta para 100% na origem.
      if (e.code === 'Digit0') {
        e.preventDefault();
        setViewport({ x: 0, y: 0, zoom: 1 });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
