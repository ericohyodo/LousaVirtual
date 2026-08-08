import { ColorSwatch } from '../atoms/ColorSwatch';
import './ColorPalette.css';

/** Paleta fixa — cores escolhidas para legibilidade sobre fundo claro. */
export const PALETTE = ['#1a1a1a', '#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5'];

interface ColorPaletteProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPalette({ value, onChange }: ColorPaletteProps) {
  return (
    <div className="color-palette" role="group" aria-label="Cor do traço">
      {PALETTE.map((color) => (
        <ColorSwatch key={color} color={color} active={color === value} onSelect={onChange} />
      ))}
    </div>
  );
}
