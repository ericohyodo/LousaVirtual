import type { ReactNode } from 'react';
import './AppLayout.css';

interface AppLayoutProps {
  canvas: ReactNode;
  header: ReactNode;
  tools: ReactNode;
  options: ReactNode;
  statusBar?: ReactNode;
}

export function AppLayout({ canvas, header, tools, options, statusBar }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <div className="app-layout__stage">{canvas}</div>
      <header className="app-layout__header">{header}</header>
      <div className="app-layout__rails">
        <div className="app-layout__tools">{tools}</div>
        <div className="app-layout__options">{options}</div>
      </div>
      {statusBar && <div className="app-layout__status">{statusBar}</div>}
    </div>
  );
}
