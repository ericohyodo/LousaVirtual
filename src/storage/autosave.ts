/**
 * Autosave: escuta o store e grava no IndexedDB com debounce.
 * Se houver um arquivo `.db` ligado, espelha todas as lousas nele.
 *
 * Grava só quando `board.version` muda — mexer no viewport (pan/zoom) não
 * conta como edição e não deve reordenar a lista de boards por "mais recente".
 */
import { boardStore } from '../boards/boardStore';
import { cancelScheduledFileDbFlush, flushFileDb, isFileDbLinked, scheduleFileDbFlush } from './fileDb';
import { saveBoard } from './local';

const DEBOUNCE_MS = 600;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

let timer: ReturnType<typeof setTimeout> | null = null;
let lastSavedVersion = -1;
let lastSavedBoardId: string | null = null;
const statusListeners = new Set<(status: SaveStatus) => void>();

function emit(status: SaveStatus) {
  statusListeners.forEach((l) => l(status));
}

export function onSaveStatus(listener: (status: SaveStatus) => void) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

async function flush() {
  const { board } = boardStore.getState();
  if (!board) return;

  emit('saving');
  try {
    await saveBoard(board);
    lastSavedVersion = board.version;
    lastSavedBoardId = board.id;
    emit('saved');
    scheduleFileDbFlush();
  } catch (error) {
    console.error('Falha ao salvar o board localmente', error);
    emit('error');
  }
}

/** Liga o autosave. Retorna a função de desligar. */
export function startAutosave(): () => void {
  const unsubscribe = boardStore.subscribe(() => {
    const { board } = boardStore.getState();
    if (!board) return;
    if (board.id === lastSavedBoardId && board.version === lastSavedVersion) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });

  const onHide = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      void flush();
    }
    cancelScheduledFileDbFlush();
    if (isFileDbLinked()) void flushFileDb();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onHide);

  return () => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', onHide);
    if (timer) clearTimeout(timer);
    cancelScheduledFileDbFlush();
  };
}

/** Marca um board recém-carregado como já persistido (evita save redundante). */
export function markSaved(boardId: string, version: number) {
  lastSavedBoardId = boardId;
  lastSavedVersion = version;
}
