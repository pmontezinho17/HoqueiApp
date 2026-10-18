# Catálogo de componentes, para o designer

Faz o que o pedido de 10/10/2026 (issue #4 do `ok4sticks-sugestoes`) pediu: *"catalogar
todos os componentes existentes na aplicação e criar um documento que eu possa consultar"*,
e junta-lhe o que ele não pedia mas de que precisa — o que é fixo, o que é livre, e em que
formato é que o trabalho volta para entrar na app sem passar por uma segunda mão.

## Uma ronda, quatro comandos

```sh
npm install                                  # só da primeira vez
npx playwright install chromium              # só da primeira vez (~100 MB)
npm --prefix ../../web run dev               # noutro terminal
node capturar.mjs                            # 50 capturas, 25 ecrãs × 2 temas
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
