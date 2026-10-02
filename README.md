# hoqueiAPP

PWA para acompanhar hóquei em patins em Portugal — resultados, calendários, classificações
e fichas de jogo das competições nacionais (FPP) e regionais.

## Estado

🟢 **Ao vivo em [hoquei.pages.dev](https://hoquei.pages.dev).** Três ecrãs — jogos, classificação
e detalhe de jogo com cronologia jogada a jogada. Instalável no telemóvel (a sério desde 02/10 — ver abaixo). Os dados são
regenerados e publicados sozinhos por GitHub Action.

O cliente é uma **PWA** (SvelteKit + Cloudflare Pages), decidido a 20/09 em vez de app Android
nativa: chega a Android e iPhone ao mesmo tempo e publica-se por link. As lojas ficam para depois,
via TWA/Capacitor, se houver confiança para isso. Ver [docs/00-onde-retomar.md](docs/00-onde-retomar.md).

```bash
cd scraper && uv sync && uv run pytest          # 39 testes, sem rede
uv run python -m hoquei.cli jogo --id 9308      # ficha e cronologia de um jogo
cd ../web && npm install && npm run dev         # a PWA em localhost:5173
```

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

## Resumo em 30 segundos

- A fonte dos dados é a plataforma **Assys Software** (`fpp.assyssoftware.es`,
  `aplisboa.assyssoftware.es`, `apsetubal.assyssoftware.es`) — HTML, sem API.
- Cada jogo tem ~80 KB de detalhe: cronologia com marcador e assistente de cada golo, faltas de
  equipa, descontos de tempo e o boletim oficial completo.
- Um **scraper em Python** (GitHub Actions, cron) normaliza tudo para **JSON estático em CDN**.
- A **PWA (SvelteKit)** só consome JSON, servida do mesmo domínio — sem CORS. Nunca faz scraping.
- Primeiro incremento: um link partilhável com resultados reais, instalável no telemóvel.

## Estrutura prevista

```
/scraper       Python — parser + normalização + geração dos JSON  ✅ em curso
  src/hoquei/fonte.py        cliente HTTP (rate limit, encoding por endpoint)
  src/hoquei/modelos.py      modelo normalizado
  src/hoquei/parsers/        competições, calendário  (ficha de jogo por fazer)
  src/hoquei/cli.py          `jogos` e `despejar`
  tests/                     testes contra HTML gravado
/web           PWA (SvelteKit, adapter-static, vite-plugin-pwa)      por começar
/data-samples  HTML gravado da fonte + JSON gerado
  paginas/                   amostras usadas nos testes
  sondagem/                  sondas da fonte durante jogos a decorrer
/scripts       sondar_atualizacao.py — validação de live scores
/docs          Planeamento e decisões
```
