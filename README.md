# hoqueiAPP

PWA para acompanhar hóquei em patins em Portugal — resultados, calendários, classificações
e fichas de jogo das competições nacionais (FPP) e regionais.

> ⚖️ **Público para ser lido, não para ser usado.** Isto não é software de código aberto:
> **todos os direitos reservados, nenhuma licença concedida** — ver [LICENSE](LICENSE), que
> também diz o que *é* permitido, o que se passa com o nome **OK4Sticks** e porque é que os
> dados desportivos ficam de fora. A app em si é de acesso livre e gratuito.

## Estado

🟢 **Ao vivo em [hoquei.pages.dev](https://hoquei.pages.dev).** Dez ecrãs — jogos do dia, o meu
clube, competições, a prova com a classificação, a equipa, a ficha de jogo com cronologia jogada
a jogada, procurar, sobre, perguntas frequentes e privacidade. Instalável no telemóvel
desde 02/10. Os dados são regenerados e publicados sozinhos por GitHub Action, e durante
uma janela de jogos uma ronda ao vivo actualiza os resultados de 30 em 30 segundos.

O cliente é uma **PWA** (SvelteKit + Cloudflare Pages), decidido a 20/09 em vez de app Android
nativa: chega a Android e iPhone ao mesmo tempo e publica-se por link. As lojas ficam para depois,
via TWA/Capacitor, se houver confiança para isso. Ver [docs/00-onde-retomar.md](docs/00-onde-retomar.md).

```bash
cd scraper && uv sync && uv run pytest -q -m "not fonte"   # 317 testes, sem rede
uv run python -m hoquei.cli jogo --id 9308                 # ficha e cronologia de um jogo
cd ../web && npm install && npx vitest run                 # 387 testes
npm run dev                                                # a PWA em localhost:5173
```

A marca `fonte` separa os cinco testes que comparam o nosso cálculo da classificação com a
tabela que a fonte publica **naquele momento**: também correm sem rede — lêem o JSON já
publicado em `web/static/v1` — mas avisam sem bloquear, porque uma incoerência passageira da
fonte não é um defeito nosso. São 322 ao todo. Porquê, em `scraper/tests/conftest.py`.

**Dados pessoais.** Desde 30/09/2026, por decisão do dono do projecto, os nomes de atletas são
publicados em todos os escalões, incluindo os de formação, por a fonte já os expor publicamente.

O filtro que os omite abaixo de sub-17 continua implementado e testado: activa-se com
`uv run python -m hoquei.cli publicar --anonimizar-formacao ...`, sem alterar código. Existe
para poder ser reposto depressa — por exemplo se a federação o pedir (ver L7.1 no backlog).

Nota factual, para ficar registada: "já é público na fonte" não transfere a base legal do RGPD.
Republicar é um tratamento novo, com finalidade própria, e o argumento é mais fraco justamente
onde há agregação e pesquisa. Dados de menores têm protecção reforçada (art. 8.º).

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/00-onde-retomar.md](docs/00-onde-retomar.md) | **Começa aqui** — estado atual, decisões em aberto e próximo passo concreto |
| [docs/01-fonte-de-dados.md](docs/01-fonte-de-dados.md) | Investigação da fonte de dados: onde `aplisboa.pt/resultados` vai buscar informação, endpoints, formatos, riscos |
| [docs/02-arquitetura-e-stack.md](docs/02-arquitetura-e-stack.md) | Decisões de arquitetura e stack, com as alternativas rejeitadas e o porquê |
| [docs/03-backlog.md](docs/03-backlog.md) | Backlog faseado, com critérios de aceitação e estimativas |
| [docs/04-benchmarking.md](docs/04-benchmarking.md) | Como a FotMob e a Sofascore organizam este tipo de dados, e o que adaptamos |
| [docs/05-sofascore-ecras.md](docs/05-sofascore-ecras.md) | Leitura ecrã a ecrã da app nativa da Sofascore, com o que os nossos dados sustentam e o que não |
| [docs/06-email-apl.md](docs/06-email-apl.md) | Rascunho do email à APL (L7.1) e as razões de cada escolha |
| [docs/07-avaliacao-scrapling.md](docs/07-avaliacao-scrapling.md) | Porque não adoptámos o Scrapling, e o que faríamos mudar de ideias |
| [docs/08-sonda-resultado.md](docs/08-sonda-resultado.md) | A sonda de 02/10: a fonte actualiza durante o jogo — e o que isso desbloqueia |
| [docs/09-regulamento-apl.md](docs/09-regulamento-apl.md) | Os artigos do regulamento da APL que o código aplica — desempates, Mérito, pontuação |
| [docs/10-processo.md](docs/10-processo.md) | Do pedido ao ar: o `dev` acumula, o `main` é produção, e quem valida o quê |

## Resumo em 30 segundos

- A fonte dos dados é a plataforma **Assys Software** (`fpp.assyssoftware.es`,
  `aplisboa.assyssoftware.es`, `apsetubal.assyssoftware.es`) — HTML, sem API.
- Cada jogo tem ~80 KB de detalhe: cronologia com marcador e assistente de cada golo, faltas de
  equipa, descontos de tempo e o boletim oficial completo.
- Um **scraper em Python** (GitHub Actions, cron) normaliza tudo para **JSON estático em CDN**.
- A **PWA (SvelteKit)** só consome JSON, servida do mesmo domínio — sem CORS. Nunca faz scraping.
- O agendador da GitHub não é de confiança para horas marcadas, por isso quem acorda a ronda ao
  vivo é um **Worker da Cloudflare** — ver `worker/relogio/README.md`.

## Estrutura

```
/scraper       Python — parser + normalização + geração dos JSON
  src/hoquei/fonte.py        cliente HTTP (rate limit, encoding por endpoint)
  src/hoquei/modelos.py      modelo normalizado
  src/hoquei/parsers/        competições, calendário, classificação, ficha de jogo,
                             boletim, participação
  src/hoquei/tabela.py       classificação calculada, pelo regulamento da APL
  src/hoquei/merito.py       o Mérito dos escalões sem tabela de pontos
  src/hoquei/cli.py          `jogos`, `jogo`, `publicar`, `aovivo`, `despejar`
  tests/                     testes contra HTML gravado
/web           PWA (SvelteKit 2 + runes, adapter-static, @vite-pwa/sveltekit)
  src/routes/                os dez ecrãs
  src/lib/                   componentes e a lógica testável fora dos `.svelte`
  static/v1/                 os JSON publicados — o contrato de dados
  functions/                 Pages Functions: consola, contador, caixa de sugestões
/worker
  relogio/                   Worker que acorda a ronda ao vivo e vigia as Actions
  observador/                mede uma janela de jogos pelo lado de quem usa a app
/data-samples  HTML gravado da fonte + JSON gerado
  paginas/                   amostras usadas nos testes
  rondas/                    contagens de cada ronda — a guarda contra uma perda silenciosa
  sondagem/                  sondas da fonte durante jogos a decorrer
/scripts       aovivo.sh (ciclo ao vivo), verificar_producao.py (pedir ao site
               depois de publicar), estado.py, sondar_atualizacao.py
/.github/workflows
  ci.yml                     os dois conjuntos de testes, em cada PR
  dados.yml                  raspar, publicar e verificar produção
  aovivo.yml                 a ronda de 30 s durante uma janela de jogos
  ramo.yml                   o site de testes, a cada merge no `dev`
  relogio.yml                publica o Worker do relógio a partir do `main`
  sonda.yml, saude.yml, vigia.yml, aviso.yml, sugestoes.yml
/docs          Onze documentos numerados — o conhecimento do projecto
```
