/**
 * Atalhos de teclado. Objetivo declarado na spec: trocar de ferramenta sem
 * tirar a mão da caneta.
 */
import { useEffect } from 'react';
import {
  boardStore,
  clearSelection,
  deleteSelection,
  copySelection,
  pasteClipboard,
  cancelPolyline,
  endPolyline,
  redo,
  setTool,
  setViewport,
  undo,
  zoomToFit,
} from '../boards/boardStore';
import type { Tool } from '../types/board';

/**
 * Letras seguem o pedido do usuário: P = pan, L = linha, M = manuscrito.
 * Os números mantêm a ordem visual da toolbar.
 */
const TOOL_SHORTCUTS: Record<string, Tool> = {
  Digit1: 'select',
  KeyV: 'select',
  Digit2: 'pen',
  KeyM: 'pen',
  Digit3: 'eraser',
  KeyE: 'eraser',
  Digit4: 'rectangle',
  KeyR: 'rectangle',
  Digit5: 'ellipse',
  KeyO: 'ellipse',
  Digit6: 'line',
  KeyL: 'line',
  Digit7: 'arrow',
  KeyA: 'arrow',
  Digit8: 'text',
  KeyT: 'text',
  Digit9: 'checklist',
  KeyK: 'checklist',
  KeyC: 'card-text',
  KeyD: 'card-checklist',
  KeyG: 'polyline',
  KeyP: 'hand',
  KeyH: 'hand',
};

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el?.isContentEditable) || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? '');
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Enquanto o usuário digita num texto ou num campo da toolbar, o teclado
      // é dele — nenhum atalho de ferramenta pode roubar a tecla.
      if (isTyping(e.target)) return;
      if (e.altKey) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyC') {
          if (boardStore.getState().selectedIds.length > 0) {
            e.preventDefault();
            copySelection();
          }
          return;
        }
        if (e.code === 'KeyV') {
          e.preventDefault();
          pasteClipboard();
          return;
        }
        if (e.code === 'KeyZ') {
          e.preventDefault();
          e.shiftKey ? redo() : undo();
          return;
        }
        if (e.code === 'KeyY') {
          e.preventDefault();
          redo();
          return;
        }
        if (e.code === 'Digit0') {
          e.preventDefault();
          setViewport({ x: 0, y: 0, zoom: 1 });
        }
        return;
      }

      if (e.code === 'Delete' || e.code === 'Backspace') {
        const { selectedIds, selectedFrameIds } = boardStore.getState();
        if (selectedIds.length > 0 || selectedFrameIds.length > 0) {
          e.preventDefault();
          deleteSelection();
        }
        return;
      }

      if (e.code === 'Escape') {
        if (boardStore.getState().draftPolyline) cancelPolyline();
        else clearSelection();
        return;
      }

      if (e.code === 'Enter' && boardStore.getState().draftPolyline) {
        e.preventDefault();
        endPolyline();
        return;
      }

      // Z sozinho = enquadrar tudo. Não há ferramenta de zoom: o zoom é
      // contínuo (ctrl+scroll / pinça), então a tecla vale pelo comando.
      if (e.code === 'KeyZ') {
        e.preventDefault();
        zoomToFit();
        return;
      }

      // Shift+1 enquadra tudo, Shift+0 volta a 100% — mesma convenção do
      // Figma. Precisa vir antes do mapa de ferramentas, que ignora Shift.
      if (e.shiftKey) {
        if (e.code === 'Digit1') {
          e.preventDefault();
          zoomToFit();
          return;
        }
        if (e.code === 'Digit0') {
          e.preventDefault();
          setViewport({ x: 0, y: 0, zoom: 1 });
          return;
        }
        return;
      }

      const tool = TOOL_SHORTCUTS[e.code];
      if (tool) {
        e.preventDefault();
        setTool(tool);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
