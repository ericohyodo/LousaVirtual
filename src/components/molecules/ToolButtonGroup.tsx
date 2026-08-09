import { IconButton } from '../atoms/IconButton';
import {
  ArrowIcon,
  CardChecklistIcon,
  CardTextIcon,
  ChecklistIcon,
  EllipseIcon,
  EraserIcon,
  HandIcon,
  LineIcon,
  PenIcon,
  PolylineIcon,
  RectangleIcon,
  SelectIcon,
  TextIcon,
} from '../atoms/Icons';
import type { Tool } from '../../types/board';
import './ToolButtonGroup.css';

interface ToolButtonGroupProps {
  value: Tool;
  onChange: (tool: Tool) => void;
}

/** Atalhos batem com `TOOL_SHORTCUTS` em useKeyboardShortcuts. */
const TOOLS: { tool: Tool; label: string; shortcut: string; Icon: () => React.JSX.Element }[] = [
  { tool: 'select', label: 'Selecionar', shortcut: '1 / V', Icon: SelectIcon },
  { tool: 'pen', label: 'Manuscrito', shortcut: '2 / M', Icon: PenIcon },
  { tool: 'eraser', label: 'Borracha', shortcut: '3 / E', Icon: EraserIcon },
  { tool: 'rectangle', label: 'Retângulo', shortcut: '4 / R', Icon: RectangleIcon },
  { tool: 'ellipse', label: 'Círculo', shortcut: '5 / O', Icon: EllipseIcon },
  { tool: 'line', label: 'Linha', shortcut: '6 / L', Icon: LineIcon },
  { tool: 'arrow', label: 'Seta', shortcut: '7 / A', Icon: ArrowIcon },
  { tool: 'polyline', label: 'Poli-linha', shortcut: 'G', Icon: PolylineIcon },
  { tool: 'text', label: 'Texto', shortcut: '8 / T', Icon: TextIcon },
  { tool: 'checklist', label: 'Check-list', shortcut: '9 / K', Icon: ChecklistIcon },
  { tool: 'card-text', label: 'Card de texto', shortcut: 'C', Icon: CardTextIcon },
  { tool: 'card-checklist', label: 'Card de check-list', shortcut: 'D', Icon: CardChecklistIcon },
  { tool: 'hand', label: 'Mover tela (pan)', shortcut: 'P / espaço', Icon: HandIcon },
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
