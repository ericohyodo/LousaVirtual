import { useRoute } from './app/useRoute';
import { BoardPage } from './components/pages/BoardPage';
import { HomePage } from './components/pages/HomePage';

export default function App() {
  const route = useRoute();

  // `key` força remontagem ao trocar de board — o BoardPage carrega e
  // descarrega o board no ciclo de vida dele.
  return route.name === 'board' ? <BoardPage key={route.id} boardId={route.id} /> : <HomePage />;
}
