import type { BoardMeta } from '../../types/board';
import { BoardCard } from '../molecules/BoardCard';
import './BoardList.css';

interface BoardListProps {
  boards: BoardMeta[];
  loading: boolean;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function BoardList({ boards, loading, onOpen, onRename, onDelete }: BoardListProps) {
  if (loading) return <p className="board-list__empty">Carregando…</p>;

  if (boards.length === 0) {
    return (
      <p className="board-list__empty">
        Nenhuma lousa ainda. Crie a primeira — ela fica salva neste dispositivo.
      </p>
    );
  }

  return (
    <div className="board-list">
      {boards.map((board) => (
        <BoardCard key={board.id} board={board} onOpen={onOpen} onRename={onRename} onDelete={onDelete} />
      ))}
    </div>
  );
}
