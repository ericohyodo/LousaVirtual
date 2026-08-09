import { useEffect, useState } from 'react';
import { Canvas } from '../../Canvas';
import { closeBoard, openBoard, useEditor } from '../../boards/boardStore';
import { goHome } from '../../app/useRoute';
import { markSaved, onSaveStatus, startAutosave, type SaveStatus } from '../../storage/autosave';
import { getLinkedFileName, isFileDbLinked } from '../../storage/fileDb';
import { loadBoard } from '../../storage/local';
import { useKeyboardShortcuts } from '../../input/useKeyboardShortcuts';
import { AppLayout } from '../templates/AppLayout';
import { BoardHeader } from '../organisms/BoardHeader';
import { StylePanel } from '../organisms/StylePanel';
import { Toolbar } from '../organisms/Toolbar';
import './BoardPage.css';

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'salvando…',
  saved: 'salvo',
  error: 'erro ao salvar',
};

export function BoardPage({ boardId }: { boardId: string }) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [missing, setMissing] = useState(false);

  useKeyboardShortcuts();

  const board = useEditor((s) => s.board);
  const count = board?.elements.length ?? 0;

  useEffect(() => {
    let cancelled = false;

    void loadBoard(boardId).then((loaded) => {
      if (cancelled) return;
      if (!loaded) {
        setMissing(true);
        return;
      }
      openBoard(loaded);
      markSaved(loaded.id, loaded.version);
    });

    const stopAutosave = startAutosave();
    const stopStatus = onSaveStatus(setStatus);

    return () => {
      cancelled = true;
      stopStatus();
      stopAutosave();
      closeBoard();
    };
  }, [boardId]);

  if (missing) {
    return (
      <div className="board-page__missing">
        <p>Esta lousa não existe mais neste dispositivo.</p>
        <button type="button" onClick={goHome}>
          Voltar para as lousas
        </button>
      </div>
    );
  }

  const fileHint = isFileDbLinked() ? ` · ${getLinkedFileName()}` : '';

  return (
    <AppLayout
      canvas={<Canvas />}
      header={<BoardHeader />}
      tools={<Toolbar />}
      options={<StylePanel />}
      statusBar={
        <span>
          {count} {count === 1 ? 'elemento' : 'elementos'}
          {status !== 'idle' && ` · ${STATUS_LABEL[status]}`}
          {fileHint}
        </span>
      }
    />
  );
}
