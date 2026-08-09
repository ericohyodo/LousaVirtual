import { ColorInput } from '../atoms/ColorInput';
import { ColorSwatch } from '../atoms/ColorSwatch';
import './ColorPalette.css';

/** Paleta de tinta — cores escolhidas para legibilidade em fundo claro e escuro. */
export const INK_PALETTE = ['#1a1a1a', '#ffffff', '#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5'];

/** Paleta de fundo — tons neutros, papel milimetrado e quadro-negro. */
export const BACKGROUND_PALETTE = ['#fbfbfa', '#ffffff', '#f5efe0', '#e8f0e4', '#e6eef7', '#22262b', '#12241c'];

interface ColorPaletteProps {
  label: string;
  value: string;
  colors?: string[];
  onChange: (color: string) => void;
}

export function ColorPalette({ label, value, colors = INK_PALETTE, onChange }: ColorPaletteProps) {
  return (
    <div className="color-palette" role="group" aria-label={label}>
      {colors.map((color) => (
        <ColorSwatch key={color} color={color} active={color === value} onSelect={onChange} />
      ))}
      <ColorInput label={`${label} — cor livre`} value={value} onChange={onChange} />
    </div>
  );
}
