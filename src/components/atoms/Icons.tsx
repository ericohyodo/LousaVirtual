/**
 * Ícones inline como componentes SVG — evita uma dependência de icon pack
 * para uma dúzia de glifos. `currentColor` herda do IconButton.
 */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export const SelectIcon = () => (
  <svg {...base}>
    <path d="m5 3 14 8-6 1.6L10.4 19Z" />
  </svg>
);

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

export const RectangleIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
  </svg>
);

export const EllipseIcon = () => (
  <svg {...base}>
    <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />
  </svg>
);

export const LineIcon = () => (
  <svg {...base}>
    <path d="M4 19 20 5" />
  </svg>
);

export const ArrowIcon = () => (
  <svg {...base}>
    <path d="M4 19 19 6" />
    <path d="M12 5.5h7.5V13" />
  </svg>
);

export const TextIcon = () => (
  <svg {...base}>
    <path d="M5 6.5V5h14v1.5M12 5v14M9 19h6" />
  </svg>
);

export const ChecklistIcon = () => (
  <svg {...base}>
    <path d="m3.5 7 1.8 1.8L8.5 5.5M3.5 17l1.8 1.8 3.2-3.3" />
    <path d="M12 7h8.5M12 17h8.5" />
  </svg>
);

export const UndoIcon = () => (
  <svg {...base}>
    <path d="M4 9h10a5 5 0 0 1 0 10h-6" />
    <path d="m4 9 4-4M4 9l4 4" />
  </svg>
);

export const RedoIcon = () => (
  <svg {...base}>
    <path d="M20 9H10a5 5 0 0 0 0 10h6" />
    <path d="m20 9-4-4M20 9l-4 4" />
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

export const PolylineIcon = () => (
  <svg {...base}>
    <path d="M4 19v-6h8V6h5" />
    <circle cx="4" cy="19" r="1.6" />
    <circle cx="12" cy="13" r="1.6" />
    <path d="M15.5 4.5 19 6l-3.5 1.5Z" fill="currentColor" />
  </svg>
);

export const CardTextIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 9h17" fill="currentColor" />
    <path d="M3.5 9h17M7 12.5h10M7 16h6" />
  </svg>
);

export const CardChecklistIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M3.5 9h17" />
    <rect x="6" y="11.2" width="2.6" height="2.6" rx="0.6" />
    <rect x="6" y="15.2" width="2.6" height="2.6" rx="0.6" />
    <path d="M11 12.5h6M11 16.5h6" />
  </svg>
);

export const GatherIcon = () => (
  <svg {...base}>
    <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    <path d="M3 3l4 4M21 3l-4 4M3 21l4-4M21 21l-4-4" />
  </svg>
);

export const EraseStrokesIcon = () => (
  <svg {...base}>
    <path d="M3 17c3-6 6 4 9-2s5 1 9-3" />
    <path d="m14 19 6-6M20 19l-6-6" />
  </svg>
);

export const ZoomExtentsIcon = () => (
  <svg {...base}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    <rect x="9" y="9.5" width="6" height="5" rx="1" />
  </svg>
);

export const BackgroundIcon = () => (
  <svg {...base}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
    <path d="m3.5 15 5-5 5 5M14 12.5l2.5-2.5 4 4" />
  </svg>
);

export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const HomeIcon = () => (
  <svg {...base}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1Z" />
  </svg>
);

export const LockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const UnlockIcon = () => (
  <svg {...base}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 7.5-1" />
  </svg>
);

