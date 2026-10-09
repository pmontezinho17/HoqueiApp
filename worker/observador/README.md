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

**A página saiu daqui a 09/10/2026.** Vive em `hoquei.pages.dev/consola`, servida pelo site,
porque o endereço deste Worker carrega o `torneiopa` de uma aplicação anterior do dono e a
Cloudflare dá um subdomínio `workers.dev` por conta, não um por projecto. O desenho está em
`web/src/lib/consola.js` e quem o serve é `web/functions/consola.js`.

O que ficou aqui são três rotas, e nenhuma é para um humano abrir todos os dias:

| rota | o que faz |
|---|---|
| `GET /api` | a consola inteira em JSON: estado, relatório do dia, pedidos por hora e por dia, entradas, corridas e rondas. Aceita `?dia=AAAA-MM-DD` |
| `GET /observar` | força uma leitura agora, sem esperar o cron |
| `GET /verificar-aviso` | prova a cadeia de aviso de ponta a ponta — ver abaixo |

Lê de três sítios e escreve num só:

| de onde | o que |
|---|---|
| D1 `ok4sticks-dados` | o que este Worker viu, e as entradas que a Function do site escreve. **O único sítio onde escreve.** Era KV até 09/10/2026 — ver `dados/esquema.sql` |
| API da GitHub | as corridas. **Precisa de token:** sem ele a GitHub responde 403 a partir de um Worker, porque o limite sem autenticação é por IP e os IPs da Cloudflare são partilhados |
| `raw.githubusercontent.com` | o diário de rondas |

A cache das respostas da GitHub vive na **Cache API** e não na base de dados: guardar uma
resposta de dois em dois minutos eram ~720 escritas/dia, e a Cache API é grátis.

## O aviso

Quando a saúde passa a vermelha sai uma issue no repositório, e a GitHub manda o email. O
envio de email da Cloudflare exigia um domínio registado no serviço, e o domínio próprio está
adiado (B9.27); este caminho usa um canal que o dono já lê.

Só avisa na transição, e fecha a issue quando voltar a verde.

**Quem escreve a issue é o `aviso.yml`, não este Worker.** O Worker compõe o texto — é aqui
que está o diagnóstico — e despacha o workflow. A razão é a única que importa: enquanto a
issue era aberta com o token pessoal, nascia com o dono por autor, e **a GitHub não notifica
ninguém das suas próprias acções**. Funcionava tudo menos a perna que ele vê. Pelo `aviso.yml`
o autor é o `github-actions[bot]`, que é outro actor, e a notificação existe. Custa ~20 s de
atraso, irrelevantes num aviso que diz "isto está assim há mais de duas horas".

Experimentar sem esperar que algo corra mal:

```bash
curl -s https://hoquei-observador.torneiopa.workers.dev/verificar-aviso
```

Abre uma issue com etiqueta `teste` e fecha-a logo, pelo mesmo caminho do aviso a sério.

**O segredo é um passo do dono.** A 09/10/2026 foi criado um token `hoquei-observador` com
`Issues: Read and write` e `Actions: Read-only` — e depois de o aviso passar pelo `aviso.yml`
as permissões certas mudaram: basta `Actions: Read and write`. **Editar as permissões de um
token não muda o seu valor**, logo isso faz-se na página do token, sem voltar a colá-lo aqui.

Se for preciso um token de novo — o valor não se recupera na GitHub depois de criado, mostra-se
uma vez —, é assim:

1. **github.com → Settings → Developer settings → Personal access tokens → Fine-grained
   tokens → Generate new token**.
2. **Token name**: `hoquei-observador`.
3. **Expiration**: sem prazo, pela mesma razão do relógio — um prazo faz o aviso emudecer
   num sábado de jogos sem ninguém perceber porquê. Com prazo, lembrete no calendário.
4. **Repository access** → *Only select repositories* → **HoqueiApp**.
5. **Permissions** → *Repository permissions* → **Actions: Read and write**, e mais nenhuma.
   É uma permissão e serve as duas coisas que este Worker faz na GitHub:
   * **ler** as corridas, para o painel "a cadeia" da consola. Sem token a GitHub responde
     403 mesmo a um repositório público, porque o limite sem autenticação é por IP e os IPs
     de saída da Cloudflare vêm com o balde gasto;
   * **escrever** para despachar o `aviso.yml`. Já não é preciso `Issues` aqui: quem escreve
     a issue é o workflow, com o token embutido das Actions.
6. Gera e **copia o token**. A GitHub só o mostra uma vez.

```bash
cd worker/observador && npx wrangler secret put GITHUB_TOKEN
```

Cola quando ele pedir. Fica encriptado na Cloudflare e não passa pelo repositório nem pelos
registos. Não o mandes a ninguém nem o metas num ficheiro.

Sem o segredo, o Worker continua a medir e a consola continua a funcionar — só não avisa. O
`/observar` devolve `sem token: aviso não enviado`, que é a forma de confirmar.

**O mesmo segredo resolve uma segunda coisa**, percebida a 09/10/2026: o painel "a cadeia"
dizia `HTTP 403`. É a GitHub a recusar o pedido sem autenticação — 60 por hora e por IP, e os
IPs de saída da Cloudflare vêm com o balde gasto. Com token são 5 000 por hora na nossa conta.

## Tipos

```bash
npx wrangler types     # gera o worker-configuration.d.ts a partir do wrangler.toml
```

O ficheiro não vai para o repositório — são ~16 000 linhas de tipos do runtime, úteis no editor
e ruído aqui. O que manda é o `wrangler.toml`; os tipos são derivados dele, nunca escritos à
mão, para não haver uma interface `Env` a divergir das ligações a sério.
