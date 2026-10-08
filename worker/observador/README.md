# observador

Mede uma janela de jogos pelo lado de quem usa a app. Lê só o nosso CDN — nunca a APL.

```bash
npx wrangler deploy                 # publicar
curl "$URL/"                        # o relatório de hoje
curl "$URL/?dia=2026-10-11"         # o de outro dia
curl "$URL/observar"                # força uma leitura agora, sem esperar o cron
```

Existe porque um observador no portátil do dono morre quando o Mac adormece, e aí ficamos sem
medição e sem saber que a perdemos.

**É um Worker à parte do `relogio` de propósito.** O relógio é o que mantém a app viva ao fim
de semana; um defeito aqui não pode parar aquele.

O que mede e o que **não** mede está no topo do `src/index.js`. O resumo: mede a cadência de
publicação, as mudanças de resultado, as marcas de "ao vivo" e os erros do CDN. Não mede
quanto tempo um golo leva desde que foi marcado — isso exige alguém no pavilhão com um
cronómetro, como a 03/10/2026.


## A consola

`GET /` é uma página HTML com cinco blocos: a saúde agora, os pedidos que saem para a APL, as
entradas de quem usa a app, a cadência de publicação, os golos do dia com a hora a que
apareceram, e as últimas corridas das Actions. Recarrega sozinha a cada 60 s. `GET /api` dá o
mesmo em JSON.

Lê de quatro sítios e não escreve em nenhum deles a não ser no seu próprio KV:

| de onde | o que |
|---|---|
| KV `observacao` | o que este Worker viu |
| KV `hoquei-contagens` | as entradas, escritas pela Function do site — **só leitura** aqui |
| API da GitHub | as corridas, sem token, porque o repositório é público |
| `raw.githubusercontent.com` | o diário de rondas |

A cache das respostas da GitHub vive na **Cache API** e não no KV: guardar uma resposta de dois
em dois minutos eram ~720 escritas/dia, contra as 1 000 que o plano dá.

## O aviso

Quando a saúde passa a vermelha, o Worker **abre uma issue** no repositório — e a GitHub manda
o email. O envio de email da Cloudflare exigia um domínio registado no serviço, e o domínio
próprio está adiado (B9.27); este caminho usa um canal que o dono já lê.

Só avisa na transição, e fecha a issue quando voltar a verde.

**Falta o segredo, e é um passo do dono:**

```bash
cd worker/observador
npx wrangler secret put GITHUB_TOKEN     # o mesmo token do relógio, com `issues: write`
```

Sem o segredo, o Worker continua a medir e a consola continua a funcionar — só não avisa. O
`/observar` devolve `sem token: aviso não enviado`, que é a forma de confirmar.
