# CLAUDE.md

Contexto do projeto para o Claude Code. Ler as specs em `/specs` antes de gerar qualquer código.

## Projeto: Lousa Virtual
Aplicação pessoal de desenho à mão livre (esquemas, fluxogramas, anotações), com suporte a mesa digitalizadora (pressão/inclinação via Pointer Events). Uso solo, multi-dispositivo, sync via Google Drive. Sem backend.

## Specs (ler nesta ordem)
1. `specs/01-overview.md` — objetivo, princípios, por que não usar Excalidraw/tldraw prontos
2. `specs/02-features.md` — MVP vs. diferenciais vs. backlog
3. `specs/03-architecture.md` — estrutura de pastas, motor de desenho, sync
4. `specs/04-data-model.md` — schema TypeScript (Board, Element, Frame, LibraryItem)

## Regras não-negociáveis
- **Leve**: sem Excalidraw, sem tldraw, sem SDK de canvas pronta. Motor de desenho = `perfect-freehand` + SVG nativo.
- **Sem backend**: Layer A (client-side only). Sync = Google Drive API via `fetch`, sem SDK oficial do Google (pesada).
- **Sem libs de UI pesadas**: nada de Material UI / Ant Design. Componentes próprios com CSS.
- Dependências novas só entram se justificadas — priorizar código próprio a pacotes para tarefas pequenas.

## Stack
React + Vite + TypeScript. `perfect-freehand`, `idb`, `zustand` (opcional) como únicas deps de peso relevante.

## Estrutura de código
Domínio (canvas/engine, storage, boards) organizado por responsabilidade técnica.
UI (`src/components/`) segue **Atomic Design**: atoms → molecules → organisms → templates → pages.
Detalhes completos da árvore de pastas em `specs/03-architecture.md`.

## Fluxo de trabalho sugerido
Construir em fases, uma sessão por fase (evita contexto poluído):
1. Scaffold do projeto + motor de desenho básico (freehand + pan/zoom)
2. Formas + seleção/transformação + undo/redo
3. Storage local (IndexedDB) + autosave
4. Sync com Google Drive
5. Diferenciais (shape snapping, library de stencils, frames, busca)

## Fora de escopo (não implementar sem pedido explícito)
Colaboração em tempo real, multi-tenancy, backend próprio, exportação DXF.
