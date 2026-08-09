/**
 * Banco portátil: um arquivo `.db` (JSON versionado) com todas as lousas.
 *
 * Fluxo pensado para pasta do Google Drive / OneDrive no disco:
 * 1. "Criar/Abrir arquivo .db" escolhe o caminho (File System Access API).
 * 2. Autosave grava o arquivo inteiro após edições.
 * 3. No outro PC: abra o mesmo arquivo → mesmas lousas.
 *
 * IndexedDB continua como cache de trabalho; o `.db` é a cópia que você leva.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Board } from '../types/board';
import { normalizeBoard } from '../types/board';
import { replaceAllBoards, listAllBoards } from './local';

const FORMAT_ID = 'lousa-virtual-db';
const FORMAT_VERSION = 1;
const DEFAULT_NAME = 'lousas.db';

const HANDLE_DB = 'lousa-virtual-handles';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'fileDb';

export interface LousaFileDb {
  format: typeof FORMAT_ID;
  version: typeof FORMAT_VERSION;
  exportedAt: number;
  boards: Board[];
}

export type FileDbStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unlinked';

interface HandleDB extends DBSchema {
  handles: {
    key: string;
    value: FileSystemFileHandle;
  };
}

type FilePickerAccept = {
  suggestedName?: string;
  types: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
};

const PICKER_TYPES: FilePickerAccept['types'] = [
  {
    description: 'Banco Lousa Virtual',
    accept: { 'application/json': ['.db', '.json'], 'application/octet-stream': ['.db'] },
  },
];

let fileHandle: FileSystemFileHandle | null = null;
let fileName: string | null = null;
let handleDbPromise: Promise<IDBPDatabase<HandleDB>> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const statusListeners = new Set<(status: FileDbStatus, name: string | null) => void>();

function emit(status: FileDbStatus) {
  statusListeners.forEach((l) => l(status, fileName));
}

export function onFileDbStatus(
  listener: (status: FileDbStatus, name: string | null) => void,
): () => void {
  statusListeners.add(listener);
  listener(fileHandle ? 'saved' : 'unlinked', fileName);
  return () => statusListeners.delete(listener);
}

export function getLinkedFileName(): string | null {
  return fileName;
}

export function isFileDbLinked(): boolean {
  return fileHandle !== null;
}

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window;
}

function getHandleDB() {
  handleDbPromise ??= openDB<HandleDB>(HANDLE_DB, 1, {
    upgrade(db) {
      db.createObjectStore(HANDLE_STORE);
    },
  });
  return handleDbPromise;
}

async function persistHandle(handle: FileSystemFileHandle | null) {
  const db = await getHandleDB();
  if (!handle) await db.delete(HANDLE_STORE, HANDLE_KEY);
  else await db.put(HANDLE_STORE, handle, HANDLE_KEY);
}

async function ensurePermission(
  handle: FileSystemFileHandle,
  mode: 'read' | 'readwrite',
): Promise<boolean> {
  const opts = { mode } as const;
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

function serialize(boards: Board[]): string {
  const payload: LousaFileDb = {
    format: FORMAT_ID,
    version: FORMAT_VERSION,
    exportedAt: Date.now(),
    boards,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function parseDbText(text: string): Board[] {
  const data = JSON.parse(text) as Partial<LousaFileDb>;
  if (data.format !== FORMAT_ID) {
    throw new Error('Arquivo não é um banco da Lousa Virtual');
  }
  if (!Array.isArray(data.boards)) {
    throw new Error('Banco .db inválido (sem lista de lousas)');
  }
  return data.boards.map((b) => normalizeBoard(b as Board));
}

async function readHandle(handle: FileSystemFileHandle): Promise<Board[]> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return [];
  return parseDbText(text);
}

async function writeHandle(handle: FileSystemFileHandle, boards: Board[]) {
  const writable = await handle.createWritable();
  await writable.write(serialize(boards));
  await writable.close();
}

async function linkHandle(handle: FileSystemFileHandle, loadContents: boolean) {
  const ok = await ensurePermission(handle, 'readwrite');
  if (!ok) throw new Error('Permissão negada para o arquivo .db');

  fileHandle = handle;
  fileName = handle.name;
  await persistHandle(handle);

  if (loadContents) {
    const boards = await readHandle(handle);
    await replaceAllBoards(boards);
  } else {
    await writeHandle(handle, await listAllBoards());
  }
  emit('saved');
}

/** Tenta religar o arquivo da sessão anterior (Chrome/Edge guardam o handle). */
export async function restoreFileDbLink(): Promise<boolean> {
  if (!supportsFileSystemAccess()) return false;
  try {
    const db = await getHandleDB();
    const handle = await db.get(HANDLE_STORE, HANDLE_KEY);
    if (!handle) return false;
    const ok = await ensurePermission(handle, 'readwrite');
    if (!ok) return false;
    fileHandle = handle;
    fileName = handle.name;
    emit('saved');
    return true;
  } catch {
    return false;
  }
}

/** Abre um .db existente e substitui as lousas locais pelo conteúdo do arquivo. */
export async function openFileDb(): Promise<void> {
  if (!supportsFileSystemAccess()) {
    throw new Error('Este navegador não suporta escolher arquivo (use Chrome ou Edge)');
  }
  const local = await listAllBoards();
  if (local.length > 0) {
    const ok = confirm(
      `Abrir um .db substitui as ${local.length} lousa(s) deste navegador pelo conteúdo do arquivo. Continuar?`,
    );
    if (!ok) throw new Error('Abertura cancelada');
  }
  const handles = await window.showOpenFilePicker({
    multiple: false,
    types: PICKER_TYPES,
  });
  const handle = handles[0];
  if (!handle) throw new Error('Nenhum arquivo selecionado');
  await linkHandle(handle, true);
}

/** Cria/escolhe onde salvar o .db e grava as lousas atuais. */
export async function createFileDb(): Promise<void> {
  if (!supportsFileSystemAccess()) {
    throw new Error('Este navegador não suporta salvar arquivo (use Chrome ou Edge)');
  }
  const handle = await window.showSaveFilePicker({
    suggestedName: DEFAULT_NAME,
    types: PICKER_TYPES,
  });
  await linkHandle(handle, false);
}

export async function unlinkFileDb(): Promise<void> {
  fileHandle = null;
  fileName = null;
  await persistHandle(null);
  emit('unlinked');
}

/** Grava agora todas as lousas no .db ligado (se houver). */
export async function flushFileDb(): Promise<void> {
  if (!fileHandle) return;
  emit('saving');
  try {
    const ok = await ensurePermission(fileHandle, 'readwrite');
    if (!ok) throw new Error('Permissão perdida para o arquivo .db');
    await writeHandle(fileHandle, await listAllBoards());
    emit('saved');
  } catch (error) {
    console.error('Falha ao gravar .db', error);
    emit('error');
    throw error;
  }
}

/** Debounce para o autosave não martelar o disco a cada traço. */
export function scheduleFileDbFlush(delayMs = 800): void {
  if (!fileHandle) return;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushFileDb();
  }, delayMs);
}

export function cancelScheduledFileDbFlush(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

/** Fallback sem File System Access: baixa o .db. */
export async function downloadFileDb(): Promise<void> {
  const boards = await listAllBoards();
  const blob = new Blob([serialize(boards)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName ?? DEFAULT_NAME;
  a.click();
  URL.revokeObjectURL(url);
}

/** Fallback: importa um .db escolhido via input de arquivo. */
export async function importFileDbFromFile(file: File): Promise<void> {
  const local = await listAllBoards();
  if (local.length > 0) {
    const ok = confirm(
      `Importar substitui as ${local.length} lousa(s) deste navegador pelo conteúdo do arquivo. Continuar?`,
    );
    if (!ok) throw new Error('Importação cancelada');
  }
  const text = await file.text();
  const boards = parseDbText(text);
  await replaceAllBoards(boards);
  fileName = file.name;
  // Sem handle permanente — próximo save precisa de "Salvar .db" / createFileDb.
  fileHandle = null;
  await persistHandle(null);
  emit('unlinked');
}
