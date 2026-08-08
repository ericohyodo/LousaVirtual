import './ColorSwatch.css';

interface ColorSwatchProps {
  color: string;
  active?: boolean;
  onSelect: (color: string) => void;
}

export function ColorSwatch({ color, active, onSelect }: ColorSwatchProps) {
  return (
    <button
      type="button"
      className={`color-swatch${active ? ' color-swatch--active' : ''}`}
      style={{ '--swatch': color } as React.CSSProperties}
      title={color}
      aria-label={`Cor ${color}`}
      aria-pressed={active}
      onClick={() => onSelect(color)}
    />
  );
}
