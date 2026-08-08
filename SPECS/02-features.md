# Features

## MVP — Básico (essencial para uso diário)
- [ ] Canvas infinito com pan (arrastar) e zoom (scroll/pinch)
- [ ] Ferramenta caneta (freehand) com espessura variável por pressão (mesa digitalizadora)
- [ ] Borracha
- [ ] Formas básicas: retângulo, elipse, linha, seta
- [ ] Ferramenta texto
- [ ] Seleção, mover, redimensionar, rotacionar elementos
- [ ] Paleta de cores + espessura de traço configurável
- [ ] Undo / redo
- [ ] Múltiplos boards (projetos separados, não só um canvas único pra sempre)
- [ ] Salvar local (IndexedDB) automático, sem precisar clicar em "salvar"
- [ ] Exportar board como PNG e SVG

## Diferenciais — Produtividade (o que separa de um "sketch descartável")
Uma crítica recorrente a ferramentas tipo Excalidraw é que o board "é feito pra ser jogado fora" — vira rascunho que ninguém revisita. Estas features atacam isso diretamente:

- [ ] **Sync via Google Drive**: autosave periódico como JSON no Drive; ao abrir em outro dispositivo, puxa a versão mais recente. Resolve seu caso de uso principal (anotar no trabalho, continuar em casa).
- [ ] **Reconhecimento de forma (shape snapping)**: desenhar um retângulo/círculo "torto" à mão e o app reconhece e endireita a forma — ganho real de produtividade em fluxogramas, sem perder a leveza do traço à mão em anotações livres.
- [ ] **Biblioteca de elementos reutilizáveis (stencils)**: salvar formas/símbolos usados com frequência (ex: símbolos de GD&T, blocos de fluxograma padrão) e reaproveitar entre boards — dado seu contexto de engenharia, isso tem valor direto.
- [ ] **Frames/seções nomeadas**: dividir o canvas infinito em áreas nomeadas (ex: "Ideias", "Ação", "Dúvidas") sem precisar de boards separados — ajuda a organizar sem perder o "infinito".
- [ ] **Busca por texto entre boards**: já que vai acumular vários boards ao longo do tempo, buscar por conteúdo de texto/anotação evita que boards antigos fiquem "perdidos".
- [ ] **Atalhos de teclado para troca de ferramenta**: trocar entre caneta/borracha/seleção sem tirar a mão da caneta (tecla numérica ou letra), fluxo compatível com uso intenso de mesa digitalizadora.
- [ ] **Detecção de palma (palm rejection)**: usando `pointerType`, ignorar toques acidentais da mão enquanto desenha com a caneta (relevante se a mesa digitalizadora tiver superfície touch).
- [ ] **Versionamento leve**: manter últimas N versões do board (aproveitando o próprio versionamento de arquivo do Google Drive) para poder reverter uma edição ruim.

## Backlog (v2+, fora do MVP)
- Templates de fluxograma/diagrama pré-montados
- Modo apresentação (fullscreen, sem UI)
- Exportação PDF
- Tags/categorias por board
- Atalho para inserir símbolos de GD&T (aproveitando seu domínio técnico)
