import type { ReactNode } from 'react';
import './AppLayout.css';

interface AppLayoutProps {
  /** O canvas ocupa a tela inteira; a toolbar flutua por cima. */
  canvas: ReactNode;
  toolbar: ReactNode;
  statusBar?: ReactNode;
}

export function AppLayout({ canvas, toolbar, statusBar }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <div className="app-layout__stage">{canvas}</div>
      <div className="app-layout__toolbar">{toolbar}</div>
      {statusBar && <div className="app-layout__status">{statusBar}</div>}
    </div>
  );
}
