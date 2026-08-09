import {
  canRedo,
  canUndo,
  compressCanvas,
  countStrokes,
  redo,
  removeStrokes,
  setTool,
  setViewport,
  undo,
  useEditor,
  zoomToFit,
} from '../../boards/boardStore';
import { IconButton } from '../atoms/IconButton';
import {
  EraseStrokesIcon,
  GatherIcon,
  RedoIcon,
  UndoIcon,
  ZoomExtentsIcon,
  ZoomResetIcon,
} from '../atoms/Icons';
import { ToolButtonGroup } from '../molecules/ToolButtonGroup';
import './Toolbar.css';

/** Coluna estreita: só ferramentas e ações rápidas. */
export function Toolbar() {
  const tool = useEditor((s) => s.tool);
  const zoom = useEditor((s) => s.board?.viewport.zoom ?? 1);
  const undoable = useEditor(canUndo);
  const redoable = useEditor(canRedo);
  const elementCount = useEditor((s) => s.board?.elements.length ?? 0);
  const strokeCount = useEditor(countStrokes);

  return (
    <div className="toolbar">
      <ToolButtonGroup value={tool} onChange={setTool} />

      <span className="toolbar__divider" />

      <div className="toolbar__footer">
        <IconButton label="Desfazer" shortcut="Ctrl+Z" disabled={!undoable} onClick={undo}>
          <UndoIcon />
        </IconButton>
        <IconButton label="Refazer" shortcut="Ctrl+Shift+Z" disabled={!redoable} onClick={redo}>
          <RedoIcon />
        </IconButton>
        <IconButton
          label="Aproximar"
          disabled={elementCount < 2}
          onClick={compressCanvas}
        >
          <GatherIcon />
        </IconButton>
        <IconButton
          label="Apagar traços à mão"
          disabled={strokeCount === 0}
          onClick={() => {
            const plural = strokeCount === 1 ? 'traço' : 'traços';
            if (confirm(`Apagar ${strokeCount} ${plural} à mão livre?`)) removeStrokes();
          }}
        >
          <EraseStrokesIcon />
        </IconButton>
        <button
          type="button"
          className="toolbar__zoom"
          title="Zoom — clique para 100%"
          onClick={() => setViewport((vp) => ({ ...vp, zoom: 1 }))}
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label="Enquadrar tudo" shortcut="Z" onClick={zoomToFit}>
          <ZoomExtentsIcon />
        </IconButton>
        <IconButton label="100% na origem" shortcut="Shift+0" onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}>
          <ZoomResetIcon />
        </IconButton>
      </div>
    </div>
  );
}
