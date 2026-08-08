import { Canvas } from '../../Canvas';
import { useEditor } from '../../boards/boardStore';
import { useKeyboardShortcuts } from '../../input/useKeyboardShortcuts';
import { AppLayout } from '../templates/AppLayout';
import { Toolbar } from '../organisms/Toolbar';

export function BoardPage() {
  useKeyboardShortcuts();

  const name = useEditor((s) => s.board.name);
  const count = useEditor((s) => s.board.elements.length);

  return (
    <AppLayout
      canvas={<Canvas />}
      toolbar={<Toolbar />}
      statusBar={
        <span>
          {name} · {count} {count === 1 ? 'elemento' : 'elementos'}
        </span>
      }
    />
  );
}
