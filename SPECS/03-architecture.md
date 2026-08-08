# Arquitetura

## Camada de segurança (modelo próprio Érico)
**Layer A** — client-side only, sem servidor próprio. Superfície de ataque real: praticamente nenhuma. A única "rede" envolvida é a comunicação direta do navegador com a API do Google Drive, usando OAuth do próprio usuário (você autentica com sua conta Google, o app nunca vê nem guarda sua senha).

## Estrutura do projeto (proposta)
A lógica de domínio (motor de desenho, storage, sync) é organizada por responsabilidade técnica. A camada de **UI segue Atomic Design** — átomos → moléculas → organismos → templates → páginas — porque a toolbar e os painéis de controle têm bastante reuso de elementos pequenos (botões, swatches de cor, sliders) que se combinam em blocos maiores.

```
lousa-virtual/
├── src/
│   ├── canvas/
│   │   └── engine/          # lógica de desenho: strokes, shapes, transform
│   │       ├── freehand.ts  # wrapper perfect-freehand
│   │       ├── shapes.ts    # retângulo, elipse, linha, seta
│   │       └── snapping.ts  # reconhecimento de forma
│   ├── input/
│   │   └── usePointer.ts    # hook Pointer Events (pressure, tilt, pointerType)
│   ├── storage/
│   │   ├── local.ts         # IndexedDB (estado local, autosave)
│   │   └── drive-sync.ts    # integração Google Drive API
│   ├── boards/
│   │   └── boardStore.ts    # estado global (zustand ou context simples)
│   ├── components/          # Atomic Design — camada de UI
│   │   ├── atoms/
│   │   │   ├── IconButton.tsx
│   │   │   ├── ColorSwatch.tsx
│   │   │   ├── Slider.tsx       # espessura de traço, opacidade
│   │   │   └── Tooltip.tsx
│   │   ├── molecules/
│   │   │   ├── ColorPalette.tsx     # grupo de ColorSwatch
│   │   │   ├── ToolButtonGroup.tsx  # grupo de IconButton (caneta/borracha/formas)
│   │   │   └── BoardCard.tsx        # item da lista de boards (thumbnail + nome)
│   │   ├── organisms/
│   │   │   ├── Toolbar.tsx          # barra de ferramentas completa
│   │   │   ├── BoardList.tsx        # grade/lista de BoardCard
│   │   │   └── LibraryPanel.tsx     # painel de stencils reutilizáveis
│   │   ├── templates/
│   │   │   └── AppLayout.tsx        # esqueleto: toolbar + canvas + painéis
│   │   └── pages/
│   │       ├── HomePage.tsx         # tela de lista de boards
│   │       └── BoardPage.tsx        # tela de edição (canvas + toolbar)
│   ├── Canvas.tsx            # componente SVG principal (fica fora de atoms/molecules — é o "palco", não um bloco de UI reutilizável)
│   └── App.tsx
├── package.json
└── vite.config.ts
```

**Regra prática de onde algo entra:** se o componente não sabe nada sobre "boards" ou "desenho" e só recebe props genéricas (cor, ícone, valor) → átomo. Se combina 2-3 átomos num bloco com um propósito único (paleta de cores, card de board) → molécula. Se já representa uma seção inteira e reconhecível da tela (a toolbar toda, a lista de boards toda) → organismo. Layout que arruma organismos na tela → template. Tela conectada ao estado/roteamento → página.

## Motor de desenho
- Cada traço de caneta é capturado como uma sequência de pontos `{x, y, pressure}` via Pointer Events.
- `perfect-freehand` converte a sequência de pontos em um path SVG suavizado, considerando a pressão.
- Formas (retângulo, elipse, seta) são elementos SVG nativos (`<rect>`, `<ellipse>`, `<line>` com marker), não freehand — mais leve e permite edição precisa (redimensionar com handles).
- Cada elemento do board (stroke ou shape) é um objeto serializável independente — isso é o que possibilita undo/redo simples (pilha de operações) e sync incremental no futuro.

## Formato de dados (board como JSON)
Ver `04-data-model.md` para o schema completo. Resumo: um board é um objeto JSON com metadata + lista de elementos (strokes, shapes, texto), cada um com posição, estilo e timestamp.

## Sync com Google Drive
1. App cria/usa uma pasta dedicada no Drive do usuário (ex: `Lousa Virtual/`).
2. Cada board é um arquivo `.json` nessa pasta.
3. **Autosave local**: toda alteração salva imediatamente no IndexedDB (nunca perde trabalho, mesmo offline).
4. **Sync para o Drive**: debounce de alguns segundos após parar de editar, sobe a versão mais recente. Ao abrir um board, compara timestamp local vs. Drive e usa o mais recente (last-write-wins simples — sem necessidade de merge complexo para uso solo).
5. Conflito real (editou offline em dois dispositivos antes de sincronizar) é raro no seu uso, mas o app deve pelo menos **avisar** e nunca sobrescrever silenciosamente — oferecer "manter local" ou "usar do Drive" quando detectar essa situação.

## Dependências (mantendo leve)
| Pacote | Motivo | Peso aproximado |
|---|---|---|
| `perfect-freehand` | traço suavizado com pressão | ~5kb |
| `idb` | wrapper leve pra IndexedDB | ~3kb |
| `zustand` (opcional) | estado global simples, sem boilerplate de Redux | ~1kb |
| Google Drive API | via `fetch` direto na API REST, **sem** SDK oficial do Google (que é pesado) | 0kb (fetch nativo) |

Nada de rough.js, nada de editor SDK completo, nada de biblioteca de UI pesada (Material UI etc.) — componentes de toolbar/UI construídos à mão com CSS.

## Autenticação com Google Drive
Usar OAuth 2.0 implicit/PKCE flow direto no client (é um app pessoal, não precisa de backend para trocar tokens). Escopo mínimo: `drive.file` (acesso só aos arquivos criados pelo próprio app, não ao Drive inteiro do usuário — mais seguro e mais fácil de aprovar no consent screen).
