import { Select } from '../atoms/Select';
import { Slider } from '../atoms/Slider';
import { IconButton } from '../atoms/IconButton';
import type { TextStyle } from '../../types/board';
import { toggleInlineBold, toggleInlineItalic } from '../../canvas/textEditorBridge';
import './FontControls.css';

/**
 * Fontes disponíveis. Todas são pilhas de fontes do sistema — nenhuma webfont
 * é baixada, mantendo o bundle e o primeiro carregamento leves.
 */
export const FONTS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Sans (sistema)' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
  { value: '"Cascadia Mono", Consolas, "Courier New", monospace', label: 'Monoespaçada' },
  { value: '"Segoe Print", "Bradley Hand", cursive', label: 'Manuscrita' },
];

interface FontControlsProps {
  value: TextStyle;
  onChange: (patch: Partial<TextStyle>) => void;
}

export function FontControls({ value, onChange }: FontControlsProps) {
  return (
    <div className="font-controls" role="group" aria-label="Formatação de texto">
      <Select
        label="Fonte"
        value={value.fontFamily}
        options={FONTS.map((f) => ({ ...f, style: { fontFamily: f.value } }))}
        onChange={(fontFamily) => onChange({ fontFamily })}
      />

      <Slider
        label="Tamanho"
        value={value.fontSize}
        min={8}
        max={96}
        onChange={(fontSize) => onChange({ fontSize })}
      />
      <span className="font-controls__value">{value.fontSize}px</span>

      <IconButton
        label="Negrito"
        shortcut="B"
        active={value.bold}
        onClick={() => {
          if (toggleInlineBold()) return;
          onChange({ bold: !value.bold });
        }}
      >
        <span className="font-controls__glyph font-controls__glyph--bold">B</span>
      </IconButton>

      <IconButton
        label="Itálico"
        shortcut="I"
        active={value.italic}
        onClick={() => {
          if (toggleInlineItalic()) return;
          onChange({ italic: !value.italic });
        }}
      >
        <span className="font-controls__glyph font-controls__glyph--italic">I</span>
      </IconButton>
    </div>
  );
}
