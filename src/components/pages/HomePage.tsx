import { useCallback, useEffect, useRef, useState } from 'react';
import { goToBoard } from '../../app/useRoute';
import {
  createFileDb,
  downloadFileDb,
  getLinkedFileName,
  importFileDbFromFile,
  isFileDbLinked,
  onFileDbStatus,
  openFileDb,
  restoreFileDbLink,
  scheduleFileDbFlush,
  supportsFileSystemAccess,
  unlinkFileDb,
  type FileDbStatus,
} from '../../storage/fileDb';
import { deleteBoard, listBoards, loadBoard, saveBoard } from '../../storage/local';
import { createBoard, type BoardMeta } from '../../types/board';
import { PlusIcon } from '../atoms/Icons';
import { BoardList } from '../organisms/BoardList';
import './HomePage.css';

export function HomePage() {
  const [boards, setBoards] = useState<BoardMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbName, setDbName] = useState<string | null>(getLinkedFileName());
  const [dbStatus, setDbStatus] = useState<FileDbStatus>('unlinked');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasFsAccess = supportsFileSystemAccess();

  const refresh = useCallback(async () => {
    setBoards(await listBoards());
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await restoreFileDbLink();
      await refresh();
    })();
    return onFileDbStatus((status, name) => {
      setDbStatus(status);
      setDbName(name);
    });
  }, [refresh]);

  const handleCreate = useCallback(async () => {
    const board = createBoard(`Lousa ${new Date().toLocaleDateString('pt-BR')}`);
    await saveBoard(board);
    scheduleFileDbFlush(0);
    goToBoard(board.id);
  }, []);

  const handleRename = useCallback(async (id: string, name: string) => {
    setBoards((current) => current.map((b) => (b.id === id ? { ...b, name } : b)));
    const board = await loadBoard(id);
    if (board) {
      await saveBoard({ ...board, name, updatedAt: Date.now(), version: board.version + 1 });
      scheduleFileDbFlush();
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const board = boards.find((b) => b.id === id);
      if (!confirm(`Excluir "${board?.name ?? 'esta lousa'}"? Isso não pode ser desfeito.`)) return;
      await deleteBoard(id);
      scheduleFileDbFlush(0);
      await refresh();
    },
    [boards, refresh],
  );

  const run = useCallback(async (action: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      await refresh();
      setMessage(okMsg);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : 'Falha ao acessar o arquivo .db');
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return (
    <div className="home">
      <header className="home__header">
        <div>
          <h1 className="home__title">Lousa Virtual</h1>
          <p className="home__subtitle">
            {loading
              ? 'Carregando suas lousas…'
              : `${boards.length} ${boards.length === 1 ? 'lousa salva' : 'lousas salvas'} neste dispositivo`}
          </p>
          <p className="home__db-line">
            {isFileDbLinked() || dbName
              ? `Arquivo: ${dbName ?? 'lousas.db'}${dbStatus === 'saving' ? ' (gravando…)' : ''}${dbStatus === 'error' ? ' (erro ao gravar)' : ''}`
              : 'Nenhum arquivo .db ligado — as lousas ficam só neste navegador'}
          </p>
          {message && <p className="home__drive-msg">{message}</p>}
          <p className="home__drive-msg">
            Dica: salve o <code>lousas.db</code> dentro da pasta do Google Drive no PC. No outro
            computador, abra o mesmo arquivo.
          </p>
        </div>

        <div className="home__actions">
          {hasFsAccess ? (
            <>
              <button
                type="button"
                className="home__drive"
                disabled={busy}
                onClick={() =>
                  void run(openFileDb, 'Arquivo .db aberto — lousas carregadas do arquivo')
                }
              >
                Abrir .db
              </button>
              <button
                type="button"
                className="home__drive"
                disabled={busy}
                onClick={() =>
                  void run(createFileDb, 'Arquivo .db criado — autosave vai gravar nele')
                }
              >
                {isFileDbLinked() ? 'Salvar .db como…' : 'Criar .db'}
              </button>
              {isFileDbLinked() && (
                <button
                  type="button"
                  className="home__drive home__drive--ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(unlinkFileDb, 'Arquivo desligado (lousas continuam neste navegador)')
                  }
                >
                  Desligar arquivo
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                className="home__drive"
                disabled={busy}
                onClick={() => void run(downloadFileDb, 'Download do .db iniciado')}
              >
                Baixar .db
              </button>
              <button
                type="button"
                className="home__drive"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                Importar .db
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".db,application/json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (!file) return;
                  void run(
                    () => importFileDbFromFile(file),
                    `Importado ${file.name} — use "Baixar .db" para salvar de novo`,
                  );
                }}
              />
            </>
          )}
          <button type="button" className="home__new" onClick={() => void handleCreate()}>
            <PlusIcon />
            Nova lousa
          </button>
        </div>
      </header>

      <BoardList
        boards={boards}
        loading={loading}
        onOpen={goToBoard}
        onRename={(id, name) => void handleRename(id, name)}
        onDelete={(id) => void handleDelete(id)}
      />
    </div>
  );
}
