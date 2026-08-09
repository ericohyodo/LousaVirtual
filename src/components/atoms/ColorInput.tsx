import './ColorInput.css';

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

/** Seletor de cor livre — complementa a paleta fixa de swatches. */
export function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <label className="color-input" title={label}>
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
