import type { BoardMeta } from '../../types/board';
import { backgroundStyle } from '../../canvas/backgrounds';
import { isDark } from '../../canvas/colors';
import { TrashIcon } from '../atoms/Icons';
import './BoardCard.css';

interface BoardCardProps {
  board: BoardMeta;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BoardCard({ board, onOpen, onRename, onDelete }: BoardCardProps) {
  return (
    <article className="board-card">
      <button
        type="button"
        className="board-card__preview"
        style={{ background: backgroundStyle(board.background, board.backgroundGradient) }}
        onClick={() => onOpen(board.id)}
        aria-label={`Abrir ${board.name}`}
      >
        {/* Prévia real do conteúdo entra quando houver thumbnail salva
            (o board completo não é carregado só para listar). */}
        <span
          className="board-card__initial"
          style={{ color: isDark(board.background) ? '#ffffff' : '#1a1a1a' }}
        >
          {board.name.trim().charAt(0).toUpperCase() || '?'}
        </span>
      </button>

      <div className="board-card__body">
        <input
          className="board-card__name"
          value={board.name}
          aria-label="Nome da lousa"
          onChange={(e) => onRename(board.id, e.target.value)}
        />
        <time className="board-card__date" dateTime={new Date(board.updatedAt).toISOString()}>
          {formatDate(board.updatedAt)}
        </time>
      </div>

      <button
        type="button"
        className="board-card__delete"
        title={`Excluir ${board.name}`}
        aria-label={`Excluir ${board.name}`}
        onClick={() => onDelete(board.id)}
      >
        <TrashIcon />
      </button>
    </article>
  );
}
