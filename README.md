# hoqueiAPP

PWA para acompanhar hóquei em patins em Portugal — resultados, calendários, classificações
e fichas de jogo das competições nacionais (FPP) e regionais.

## Estado

🛠️ **Scraper a funcionar.** Competições, equipas e calendários já saem em JSON, com testes.
Ficha de jogo e cliente por fazer.

O cliente é uma **PWA** (SvelteKit + Cloudflare Pages), decidido a 20/09 em vez de app Android
nativa: chega a Android e iPhone ao mesmo tempo e publica-se por link. As lojas ficam para depois,
via TWA/Capacitor, se houver confiança para isso. Ver [docs/00-onde-retomar.md](docs/00-onde-retomar.md).

```bash
cd scraper && uv sync && uv run pytest              # 9 testes, sem rede
uv run python -m hoquei.cli jogos --de 2026-09-19 --ate 2026-09-20
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/00-onde-retomar.md](docs/00-onde-retomar.md) | **Começa aqui** — estado atual, decisões em aberto e próximo passo concreto |
| [docs/01-fonte-de-dados.md](docs/01-fonte-de-dados.md) | Investigação da fonte de dados: onde `aplisboa.pt/resultados` vai buscar informação, endpoints, formatos, riscos |
| [docs/02-arquitetura-e-stack.md](docs/02-arquitetura-e-stack.md) | Decisões de arquitetura e stack, com as alternativas rejeitadas e o porquê |
| [docs/03-backlog.md](docs/03-backlog.md) | Backlog faseado, com critérios de aceitação e estimativas |

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
