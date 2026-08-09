import { renameBoard, useEditor } from '../../boards/boardStore';
import { goHome } from '../../app/useRoute';
import { HomeIcon } from '../atoms/Icons';
import './BoardHeader.css';

export function BoardHeader() {
  const name = useEditor((s) => s.board?.name ?? '');

  return (
    <div className="board-header">
      <button type="button" className="board-header__home" title="Voltar para a página inicial" onClick={goHome}>
        <HomeIcon />
        <span>Lousas</span>
      </button>
      <input
        className="board-header__name"
        value={name}
        aria-label="Nome da lousa"
        placeholder="Nome do projeto"
        onChange={(e) => renameBoard(e.target.value)}
      />
    </div>
  );
}
