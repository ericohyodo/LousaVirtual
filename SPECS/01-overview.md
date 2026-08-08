# Lousa Virtual — Visão Geral

## Objetivo
Aplicação de desenho à mão livre / whiteboard infinita para esquemas, fluxogramas e anotações, sem as limitações de produtos SaaS fechados (paywall de features, dados fora do seu controle). Uso pessoal, multi-dispositivo (trabalho ↔ casa), com suporte nativo a mesa digitalizadora (pressão e inclinação da caneta).

## Princípios do projeto
- **Leve**: sem dependências pesadas. Motor de desenho construído sobre `perfect-freehand` (MIT, ~poucos KB) + SVG nativo, não uma SDK de canvas completa (Excalidraw/tldraw embutidos trazem bagagem — fontes, rough.js, sistemas de colaboração — que não usaremos).
- **Client-side only (Layer A)**: sem backend, sem servidor rodando. Sync via Google Drive API. Isso elimina toda a superfície de ataque de rede pública e o custo de infra.
- **Local-first**: o app funciona 100% offline. Sync é uma camada por cima, não uma dependência para uso básico.
- **Dados seus**: o board é um arquivo JSON legível, armazenado no seu próprio Google Drive — não em servidor de terceiro.
- **Evolutivo**: arquitetura pensada para permitir migração futura para Layer B (backend próprio) ou Layer C (SaaS) sem reescrever o motor de desenho.

## Por que não usar Excalidraw/tldraw prontos
- **tldraw**: mudou para licença source-available com custo comercial para uso em produção do SDK — não serve para um projeto que pode virar produto seu no futuro sem essa dependência de licenciamento.
- **Excalidraw**: MIT e leve comparado a tldraw, mas ainda traz motor de renderização "hand-drawn" (rough.js), sistema de colaboração e código que não usaremos — mais peso do que o necessário para o nosso caso de uso.
- Construir o motor próprio com `perfect-freehand` + SVG dá controle total sobre o bundle, sobre o formato de dados, e sobre a UX voltada à mesa digitalizadora.

## Stack proposta
| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript |
| Desenho | `perfect-freehand` (traço com pressão) + SVG nativo |
| Input | Pointer Events API (pressure, tilt, pointerType) |
| Estado local | IndexedDB (via `idb` ou similar, leve) |
| Sync | Google Drive API (`Google Drive` já conectado nas suas integrações) |
| Empacotamento | Vite, build único, sem framework de UI pesado (Tailwind ok, componentes próprios) |

## Fora de escopo (v1)
- Colaboração em tempo real (multiplayer)
- Multi-tenancy / múltiplos usuários
- Backend próprio
- Exportação para formatos de engenharia (DXF, etc.) — pode virar v2 dado seu contexto de GD&T
