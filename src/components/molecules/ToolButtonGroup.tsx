import { IconButton } from '../atoms/IconButton';
import { EraserIcon, HandIcon, PenIcon } from '../atoms/Icons';
import type { Tool } from '../../types/board';
import './ToolButtonGroup.css';

interface ToolButtonGroupProps {
  value: Tool;
  onChange: (tool: Tool) => void;
}

/** Atalhos batem com `TOOL_SHORTCUTS` em useKeyboardShortcuts. */
const TOOLS = [
  { tool: 'pen' as const, label: 'Caneta', shortcut: '1', Icon: PenIcon },
  { tool: 'eraser' as const, label: 'Borracha', shortcut: '2', Icon: EraserIcon },
  { tool: 'hand' as const, label: 'Mover', shortcut: '3', Icon: HandIcon },
];

export function ToolButtonGroup({ value, onChange }: ToolButtonGroupProps) {
  return (
    <div className="tool-group" role="group" aria-label="Ferramentas">
      {TOOLS.map(({ tool, label, shortcut, Icon }) => (
        <IconButton
          key={tool}
          label={label}
          shortcut={shortcut}
          active={value === tool}
          onClick={() => onChange(tool)}
        >
          <Icon />
        </IconButton>
      ))}
    </div>
  );
}
