# Features

## MVP — Básico (essencial para uso diário)
- [x] Canvas infinito com pan (arrastar) e zoom (scroll/pinch)
- [x] Ferramenta caneta (freehand) com espessura variável por pressão (mesa digitalizadora)
- [x] Borracha
- [x] Formas básicas: retângulo, elipse, linha, seta
- [x] Ferramenta texto
- [x] Seleção e mover elementos  
- [ ] Redimensionar e rotacionar elementos (handles na caixa de seleção)
- [x] Paleta de cores + espessura de traço configurável
- [x] Undo / redo
- [x] Múltiplos boards (projetos separados, não só um canvas único pra sempre)
- [x] Salvar local (IndexedDB) automático, sem precisar clicar em "salvar"
- [ ] Exportar board como PNG e SVG
- [x] Cor de fundo configurável por board
- [x] Check-lists (itens marcáveis, Enter cria o próximo)
- [x] Formatação de texto: fonte, tamanho, cor, negrito, itálico
- [x] Cards (frames com faixa de título + corpo de texto ou check-list)
- [x] Pontos de conexão em retângulos/elipses, com snap ao desenhar
- [x] Zoom extents e "aproximar" (reagrupa elementos espalhados)
- [x] Apagar só os traços à mão, preservando formas/textos/cards
- [x] Poli-linha (caminho de vértices clicados, para contornar elementos)
- [x] Redimensionar cards pelos vértices

## Diferenciais — Produtividade (o que separa de um "sketch descartável")
Uma crítica recorrente a ferramentas tipo Excalidraw é que o board "é feito pra ser jogado fora" — vira rascunho que ninguém revisita. Estas features atacam isso diretamente:

- [ ] **Sync via Google Drive**: autosave periódico como JSON no Drive; ao abrir em outro dispositivo, puxa a versão mais recente. Resolve seu caso de uso principal (anotar no trabalho, continuar em casa).
- [ ] **Reconhecimento de forma (shape snapping)**: desenhar um retângulo/círculo "torto" à mão e o app reconhece e endireita a forma — ganho real de produtividade em fluxogramas, sem perder a leveza do traço à mão em anotações livres.
- [ ] **Biblioteca de elementos reutilizáveis (stencils)**: salvar formas/símbolos usados com frequência (ex: símbolos de GD&T, blocos de fluxograma padrão) e reaproveitar entre boards — dado seu contexto de engenharia, isso tem valor direto.
- [ ] **Frames/seções nomeadas**: dividir o canvas infinito em áreas nomeadas (ex: "Ideias", "Ação", "Dúvidas") sem precisar de boards separados — ajuda a organizar sem perder o "infinito".
- [ ] **Busca por texto entre boards**: já que vai acumular vários boards ao longo do tempo, buscar por conteúdo de texto/anotação evita que boards antigos fiquem "perdidos".
- [x] **Atalhos de teclado para troca de ferramenta**: trocar entre caneta/borracha/seleção sem tirar a mão da caneta (tecla numérica ou letra), fluxo compatível com uso intenso de mesa digitalizadora.
- [x] **Detecção de palma (palm rejection)**: usando `pointerType`, ignorar toques acidentais da mão enquanto desenha com a caneta (relevante se a mesa digitalizadora tiver superfície touch).
- [ ] **Versionamento leve**: manter últimas N versões do board (aproveitando o próprio versionamento de arquivo do Google Drive) para poder reverter uma edição ruim.

## Backlog (v2+, fora do MVP)
- Templates de fluxograma/diagrama pré-montados
- Modo apresentação (fullscreen, sem UI)
- Exportação PDF
- Tags/categorias por board
- Atalho para inserir símbolos de GD&T (aproveitando seu domínio técnico)
