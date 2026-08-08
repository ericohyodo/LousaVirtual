import type { ReactNode } from 'react';
import './IconButton.css';

interface IconButtonProps {
  label: string;
  active?: boolean;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function IconButton({ label, active, shortcut, disabled, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`icon-button${active ? ' icon-button--active' : ''}`}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
