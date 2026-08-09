/**
 * Roteamento por hash, em ~30 linhas. Duas rotas só (home e board) não
 * justificam react-router.
 */
import { useEffect, useState } from 'react';

export type Route = { name: 'home' } | { name: 'board'; id: string };

function parse(hash: string): Route {
  const match = /^#\/board\/([^/?]+)/.exec(hash);
  return match?.[1] ? { name: 'board', id: decodeURIComponent(match[1]) } : { name: 'home' };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parse(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function goHome() {
  location.hash = '#/';
}

export function goToBoard(id: string) {
  location.hash = `#/board/${encodeURIComponent(id)}`;
}
