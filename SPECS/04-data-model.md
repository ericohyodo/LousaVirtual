# Modelo de Dados

## Board (arquivo JSON no Drive / registro no IndexedDB)
```typescript
interface Board {
  id: string;              // uuid
  name: string;
  createdAt: number;       // timestamp
  updatedAt: number;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  elements: Element[];
  frames: Frame[];          // seções nomeadas do canvas
  version: number;          // incrementa a cada save, usado para detectar conflito
}
```

## Element (união de todos os tipos desenháveis)
```typescript
type Element = StrokeElement | ShapeElement | TextElement;

interface BaseElement {
  id: string;
  type: 'stroke' | 'shape' | 'text';
  createdAt: number;
  updatedAt: number;
  frameId?: string;         // se pertence a um frame
  style: {
    color: string;
    strokeWidth: number;
    opacity: number;
  };
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
  y: number;
  content: string;
  fontSize: number;
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
