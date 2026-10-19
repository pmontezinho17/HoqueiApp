# Catálogo de componentes, para o designer

Faz o que o pedido de 10/10/2026 (issue #4 do `ok4sticks-sugestoes`) pediu: *"catalogar
todos os componentes existentes na aplicação e criar um documento que eu possa consultar"*,
e junta-lhe o que ele não pedia mas de que precisa — o que é fixo, o que é livre, e em que
formato é que o trabalho volta para entrar na app sem passar por uma segunda mão.

## A primeira versão estava errada, e o designer disse-o

A 18/10/2026 isto entregava os 25 ecrãs fotografados inteiros. O retorno dele, no dia
seguinte: *"é mais uma overview das páginas (…) eu assim não desenho páginas, desenho
apenas components, que depois irão formar as páginas"*, e *"era bom o Claude dar os nomes a
isto e separar primeiro, para que depois seja fácil pedir-lhe para substituir"*.

Tinha razão nas duas coisas, e a segunda é a que manda neste código: **o que faz um
catálogo servir não são as imagens, é a lista de nomes**. Cada componente tem um
identificador que não muda — `C09` é sempre a linha de jogo —, e é por ele que se pede, se
devolve e se substitui. O `componentes.mjs` é essa lista; tudo o resto são ferramentas à
volta dela.

## Uma ronda, cinco comandos

```sh
npm install                                  # só da primeira vez
npx playwright install chromium              # só da primeira vez (~100 MB)
npm --prefix ../../web run dev               # noutro terminal
node capturar_componentes.mjs                # 104 recortes, 43 componentes × estados × 2 temas
node capturar.mjs                            # 50 capturas de ecrã inteiro, para contexto
node exportar_icones.mjs                     # 26 SVG, tirados do Icone.svelte
node gerar_pagina.mjs                        # capturas/catalogo.html
./empacotar.sh                               # entrega/*.zip
```

Com `BASE=https://hoquei.pages.dev node capturar.mjs` fotografa produção em vez do local.

Nada do que estes comandos produzem é commitado — `capturas/`, `icones/` e `entrega/` estão
no `.gitignore` desta pasta. **É de propósito.** Um catálogo commitado é uma segunda cópia
da interface a envelhecer ao lado do código que a descreve, e seriam 19 MB de PNG por ronda
no histórico de um repositório público. Refaz-se em quatro comandos.

## Porque é que o Playwright não está no `web/`

Tem `package.json` próprio para o `npm ci` do CI não o descarregar. O CI não corre nada
disto: não há nada aqui para verificar automaticamente, e a captura precisa de um servidor
a correr.

## Onde é que o trabalho entra quando o designer o devolver

| o que ele devolve | onde assenta |
|---|---|
| um componente, pelo identificador (`C09`) | o ficheiro que o `componentes.mjs` nomeia |
| ícones (`.svg`, grelha 20×20) | `web/src/lib/Icone.svelte`, um ramo cada |
| crachás de escalão (`.svg`) | `web/static/escaloes/` |
| ícone da aplicação | `scripts/gerar_icones.py` → `web/static/icones/` |
| valores de cor, aos pares claro/escuro | o bloco `:root` do `web/src/routes/+layout.svelte` e `web/src/lib/cor.svelte.ts` |
| ecrãs redesenhados | os componentes em `web/src/lib/` e as páginas em `web/src/routes/` |

## O que **não** se repete à mão

As cores, as medidas, a lista de ícones e a de crachás **são lidas do código** pelo
`tokens.mjs` de cada vez que a página se gera, e o script rebenta se não as encontrar. Uma
segunda lista escrita à mão num documento fica errada no dia em que alguém mexe numa — e um
catálogo que mente sobre a cor é pior do que não haver catálogo.

O que é escrito à mão é só o texto: está todo no `conteudo.mjs`, à parte da marcação, para
se poder reler.

## Três armadilhas que já custaram uma ronda cada

1. **`page.screenshot({ clip })` não fala a mesma língua que `boundingBox()`.** Um conta a
   partir do canto do ecrã e o outro a partir do canto do documento. Enquanto o alvo estava
   no topo coincidiam e parecia bem; mal era preciso rolar para lá chegar, o recorte subia o
   tanto que a página tinha rolado. Usa-se `locator.screenshot()`, que recorta o elemento e
   ainda espera que ele pare de se mexer.
2. **A faixa dos dias monta três dias ao mesmo tempo.** Um selector solto no ecrã de Jogos
   apanha o vizinho que está fora do ecrã, e o `locator.screenshot()` vai buscá-lo onde ele
   está — a captura do bloco de escalão saiu com o cabeçalho da aplicação lá dentro. Daí a
   constante `DIA` no `componentes.mjs`. Isto já tinha enganado um teste e o guia.
3. **Um estado distingue-se pelo que tem dentro, não pela posição.** `.linha:has(.golos)` é
   um jogo jogado e `.linha:has(.vivo)` é um a decorrer. Com `:first` ou `:last-of-type`, a
   captura mudava de estado de cada vez que a jornada andasse.

## Os estados que os dados não têm

Um jogo a decorrer e uma classificação calculada por nós são estados reais do produto que
podem não existir no dia da captura. Para esses, o `capturar_componentes.mjs` **reescreve a
resposta do servidor** antes de a página a ler (`forjar`, no `componentes.mjs`) — e a
captura sai marcada como *forçado* no catálogo, com a razão. Um catálogo que não distingue o
real do encenado não serve para medir nada.
