# Modelo de Dados

## Board (arquivo JSON no Drive / registro no IndexedDB)
```typescript
interface Board {
  id: string;              // uuid
  name: string;
  createdAt: number;       // timestamp
  updatedAt: number;
  background: string;      // cor de fundo do canvas, por board
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  elements: Element[];
  frames: Frame[];          // seções nomeadas do canvas
  version: number;          // incrementa a cada save, usado para detectar conflito
}

/** Cabeçalho sem os elementos — o que a HomePage precisa para listar. */
type BoardMeta = Omit<Board, 'elements' | 'frames' | 'viewport'>;
```

## Element (união de todos os tipos desenháveis)
```typescript
type Element =
  | StrokeElement | ShapeElement | TextElement
  | ChecklistElement | CardElement | PolylineElement;

interface BaseElement {
  id: string;
  type: 'stroke' | 'shape' | 'text' | 'checklist' | 'card' | 'polyline';
  createdAt: number;
  updatedAt: number;
  frameId?: string;         // se pertence a um frame
  style: {
    color: string;
    strokeWidth: number;
    opacity: number;
    fill?: string;          // preenchimento de formas fechadas ('none' = só contorno)
  };
}

/** Formatação tipográfica, compartilhada por texto e checklist. */
interface TextStyle {
  fontFamily: string;
  fontSize: number;
  bold?: boolean;
  italic?: boolean;
}

interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: { x: number; y: number; pressure: number }[];
}

interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'line' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface TextElement extends BaseElement {
  type: 'text';
  x: number;
  y: number;              // topo do primeiro glifo, não a baseline
  content: string;        // '\n' separa linhas
  text: TextStyle;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface ChecklistElement extends BaseElement {
  type: 'checklist';
  x: number;
  y: number;
  width: number;          // mínimo; a largura real acompanha o conteúdo
  title: string;          // vazio = lista sem cabeçalho
  items: ChecklistItem[];
  text: TextStyle;
}

/** Bloco pronto: faixa de título em cima, corpo (texto ou lista) embaixo. */
interface CardElement extends BaseElement {
  type: 'card';
  variant: 'text' | 'checklist';
  x: number;
  y: number;
  width: number;          // mínimo; a real acompanha o conteúdo
  minHeight?: number;     // definido ao arrastar os vértices
  title: string;
  content: string;        // corpo do card de texto
  items: ChecklistItem[]; // corpo do card de check-list
  surface: string;        // cor do corpo, guardada no elemento
  text: TextStyle;
}

/** Caminho de vértices clicados — ligação de fluxograma que contorna objetos. */
interface PolylineElement extends BaseElement {
  type: 'polyline';
  points: { x: number; y: number }[];
  arrow: boolean;         // ponta de seta no último segmento
}
```

## Frame (seção nomeada do canvas infinito)
```typescript
interface Frame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}
```

## Library Item (elemento reutilizável / stencil)
```typescript
interface LibraryItem {
  id: string;
  name: string;
  category: string;          // ex: "GD&T", "Fluxograma"
  elements: Element[];       // elementos relativos a uma origem (0,0)
  thumbnail?: string;        // base64 pequeno pra preview
}
```

## Notas de design
- Todo `Element` é independente e serializável — isso é o que sustenta undo/redo (pilha de snapshots ou pilha de operações inversas) e permite sync incremental futuro (sincronizar só elementos alterados, não o board inteiro).
- `version` no Board serve para detecção simples de conflito: se a versão local diverge da versão no Drive ao tentar sincronizar, o app avisa em vez de sobrescrever.
- Coordenadas são sempre no espaço do canvas infinito (não da tela) — a `viewport` do Board é só o "onde a câmera estava", recalculada na renderização.
- Campos novos entram sempre opcionais ou com default aplicado na leitura (`normalizeBoard`): boards gravados por uma versão anterior do app precisam continuar abrindo, já que não há servidor para migrar dado antigo.
