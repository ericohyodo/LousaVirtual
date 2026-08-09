/**
 * Fundos do board.
 *
 * O gradiente é guardado como a própria string CSS (não um id de preset): o
 * board é um JSON que vai para o Drive e precisa se descrever sozinho, sem
 * depender de uma tabela que pode mudar entre versões do app.
 *
 * `base` é a cor sólida equivalente — usada para decidir contraste da grade e
 * como fundo do card na HomePage.
 */
export interface BackgroundPreset {
  id: string;
  label: string;
  /** `undefined` = fundo sólido puro. */
  css?: string;
  base: string;
}

export const GRADIENT_PRESETS: BackgroundPreset[] = [
  {
    id: 'aurora',
    label: 'Aurora',
    css: 'linear-gradient(160deg, #eef3ff 0%, #f6efff 52%, #fff2f4 100%)',
    base: '#f3f1fa',
  },
  {
    id: 'papel',
    label: 'Papel quente',
    css: 'linear-gradient(180deg, #fdfaf3 0%, #f6efe1 100%)',
    base: '#f9f4ea',
  },
  {
    id: 'menta',
    label: 'Menta',
    css: 'linear-gradient(165deg, #f0fbf5 0%, #e6f3ef 55%, #e9f0f7 100%)',
    base: '#ebf5f1',
  },
  {
    id: 'areia',
    label: 'Areia',
    css: 'radial-gradient(120% 90% at 20% 0%, #fdf6ec 0%, #f2e7d6 100%)',
    base: '#f6eddf',
  },
  {
    id: 'ardosia',
    label: 'Ardósia',
    css: 'linear-gradient(165deg, #2b3038 0%, #22262d 55%, #1b1f25 100%)',
    base: '#242930',
  },
  {
    id: 'noite',
    label: 'Noite',
    css: 'radial-gradient(120% 100% at 30% 0%, #23304a 0%, #161d2b 60%, #10141d 100%)',
    base: '#1a2130',
  },
];

/** CSS de `background` a aplicar no palco. */
export function backgroundStyle(base: string, gradient?: string): string {
  return gradient ?? base;
}
