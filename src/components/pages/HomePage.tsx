import { useCallback, useEffect, useState } from 'react';
import { goToBoard } from '../../app/useRoute';
import { deleteBoard, listBoards, loadBoard, saveBoard } from '../../storage/local';
import { createBoard, type BoardMeta } from '../../types/board';
import { PlusIcon } from '../atoms/Icons';
import { BoardList } from '../organisms/BoardList';
import './HomePage.css';

export function HomePage() {
  const [boards, setBoards] = useState<BoardMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setBoards(await listBoards());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = useCallback(async () => {
    const board = createBoard(`Lousa ${new Date().toLocaleDateString('pt-BR')}`);
    await saveBoard(board);
    goToBoard(board.id);
  }, []);

  const handleRename = useCallback(async (id: string, name: string) => {
    // Otimista: o campo responde na hora e a gravação vai atrás.
    setBoards((current) => current.map((b) => (b.id === id ? { ...b, name } : b)));
    const board = await loadBoard(id);
    if (board) await saveBoard({ ...board, name, updatedAt: Date.now(), version: board.version + 1 });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const board = boards.find((b) => b.id === id);
      if (!confirm(`Excluir "${board?.name ?? 'esta lousa'}"? Isso não pode ser desfeito.`)) return;
      await deleteBoard(id);
      await refresh();
    },
    [boards, refresh],
  );

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
        </div>

        <button type="button" className="home__new" onClick={() => void handleCreate()}>
          <PlusIcon />
          Nova lousa
        </button>
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
