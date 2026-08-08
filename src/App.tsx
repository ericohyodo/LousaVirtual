import { BoardPage } from './components/pages/BoardPage';

export default function App() {
  // Fase 1 tem um board único em memória. A HomePage com lista de boards
  // entra junto com o IndexedDB (fase 3).
  return <BoardPage />;
}
