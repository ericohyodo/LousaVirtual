/**
 * Persistência local (IndexedDB). O board inteiro é gravado como um registro
 * só — para uso solo o custo é irrelevante e o formato fica idêntico ao JSON
 * que vai para o Drive na fase 4.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Board, BoardMeta } from '../types/board';
import { normalizeBoard } from '../types/board';

const DB_NAME = 'lousa-virtual';
const DB_VERSION = 1;
const STORE = 'boards';

interface LousaDB extends DBSchema {
  boards: {
    key: string;
    value: Board;
    indexes: { updatedAt: number };
  };
}

let dbPromise: Promise<IDBPDatabase<LousaDB>> | null = null;

function getDB() {
  dbPromise ??= openDB<LousaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    },
  });
  return dbPromise;
}

/** Cabeçalhos dos boards, mais recente primeiro. */
export async function listBoards(): Promise<BoardMeta[]> {
  const db = await getDB();
  const boards = await db.getAll(STORE);

  return boards
    .map(({ id, name, createdAt, updatedAt, background, backgroundGradient, version }) => ({
      id,
      name,
      createdAt,
      updatedAt,
      background,
      backgroundGradient,
      version,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadBoard(id: string): Promise<Board | null> {
  const db = await getDB();
  const board = await db.get(STORE, id);
  return board ? normalizeBoard(board) : null;
}

export async function saveBoard(board: Board): Promise<void> {
  const db = await getDB();
  await db.put(STORE, board);
}

export async function deleteBoard(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, id);
}

/** Contagem de elementos por board — usada no card da HomePage. */
export async function countElements(id: string): Promise<number> {
  const board = await loadBoard(id);
  return board?.elements.length ?? 0;
}
