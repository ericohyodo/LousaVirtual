/**
 * Ícones inline como componentes SVG — evita uma dependência de icon pack
 * para meia dúzia de glifos. `currentColor` herda do IconButton.
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const PenIcon = () => (
  <svg {...base}>
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    <path d="m15 5 4 4" />
  </svg>
);

export const EraserIcon = () => (
  <svg {...base}>
    <path d="M4 16.5 12.5 8a2 2 0 0 1 2.8 0l3.7 3.7a2 2 0 0 1 0 2.8L14 20H7Z" />
    <path d="M20 20h-9" />
  </svg>
);

export const HandIcon = () => (
  <svg {...base}>
    <path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M12 11V3.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M15 11.5V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7h-1a6 6 0 0 1-4.6-2.2L4 16.4a1.5 1.5 0 0 1 2.4-1.8L9 17" />
  </svg>
);

export const TrashIcon = () => (
  <svg {...base}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export const ZoomResetIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.4-4.4M9 11h4" />
  </svg>
);
