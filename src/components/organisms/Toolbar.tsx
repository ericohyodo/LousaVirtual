import {
  clearBoard,
  setColor,
  setStrokeWidth,
  setTool,
  setViewport,
  useEditor,
} from '../../boards/boardStore';
import { IconButton } from '../atoms/IconButton';
import { TrashIcon, ZoomResetIcon } from '../atoms/Icons';
import { Slider } from '../atoms/Slider';
import { ColorPalette } from '../molecules/ColorPalette';
import { ToolButtonGroup } from '../molecules/ToolButtonGroup';
import './Toolbar.css';

export function Toolbar() {
  const tool = useEditor((s) => s.tool);
  const color = useEditor((s) => s.color);
  const strokeWidth = useEditor((s) => s.strokeWidth);
  const zoom = useEditor((s) => s.board.viewport.zoom);
  const elementCount = useEditor((s) => s.board.elements.length);

  return (
    <div className="toolbar">
      <ToolButtonGroup value={tool} onChange={setTool} />

      <span className="toolbar__divider" />

      <ColorPalette value={color} onChange={setColor} />

      <span className="toolbar__divider" />

      <Slider label="Espessura" value={strokeWidth} min={1} max={40} onChange={setStrokeWidth} />

      <span className="toolbar__divider" />

      <button
        type="button"
        className="toolbar__zoom"
        title="Zoom — clique para voltar a 100%"
        onClick={() => setViewport((vp) => ({ ...vp, zoom: 1 }))}
      >
        {Math.round(zoom * 100)}%
      </button>

      <IconButton label="Enquadrar na origem" shortcut="Ctrl+0" onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}>
        <ZoomResetIcon />
      </IconButton>

      <IconButton
        label="Limpar board"
        disabled={elementCount === 0}
        onClick={() => {
          if (confirm('Apagar todos os elementos deste board?')) clearBoard();
        }}
      >
        <TrashIcon />
      </IconButton>
    </div>
  );
}
