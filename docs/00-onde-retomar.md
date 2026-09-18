# Onde retomar

**Última sessão:** 18/09/2026 (noite) · **Estado:** scraper a funcionar (competições + calendário), testado e validado contra a fonte real. App por começar.

## O que já está feito

Investigação da fonte de dados concluída e validada com pedidos reais ao servidor, mais três
documentos de planeamento:

- [01-fonte-de-dados.md](01-fonte-de-dados.md) — onde estão os dados e como se lá chega
- [02-arquitetura-e-stack.md](02-arquitetura-e-stack.md) — 3 decisões de arquitetura e o porquê
- [03-backlog.md](03-backlog.md) — 114 itens em 9 fases, ~4 semanas de trabalho

## As 3 coisas que precisas de saber para retomar

1. **A fonte é `{tenant}.assyssoftware.es/intranet/web/`** — HTML, sem API. Tenants confirmados:
   `fpp` (nacional), `aplisboa`, `apsetubal`. Um parser serve todos.
2. **A app nunca faz scraping.** Scraper Python → JSON estático em CDN → app Kotlin/Compose só lê.
3. **Cada jogo tem ~80KB de detalhe** em `partido.asp?id=N`: cronologia com marcador e assistente
   de cada golo, faltas de equipa, descontos de tempo e boletim oficial completo.

## 2 decisões em aberto (a tua vez)

| # | Decisão | Recomendação minha |
|---|---|---|
| 1 | Adicionar jogos ao calendário: **feed ICS subscritível** (atualiza-se sozinho, sem confirmação) ou **escrita no calendário local** (permite pedir confirmação a cada alteração)? | Ambos, com o ICS como principal. Ver a nota em B4.11 |
| 2 | Confirmar a interpretação de *"notificações de alterações de jogos, com alteração após confirmação do utilizador"* — assumi: avisar da alteração e só mexer no calendário do utilizador depois de ele confirmar (A5.11–A5.13) | Manter a interpretação assumida |

## Feito na sessão de 18/09 (noite)

Fases 0 e parte da 1 concluídas. `scraper/` é um projeto `uv` a funcionar:

| Item | Estado |
|---|---|
| B0.4 estrutura do repo | ✅ `scraper/`, `data-samples/`, `docs/`, `scripts/` |
| B0.5 amostras de HTML | ✅ `data-samples/paginas/` (competições, calendário, classificação) |
| B1.1 projeto Python | ✅ `uv` + httpx + selectolax + pytest |
| B1.2 cliente com rate limit | ✅ `src/hoquei/fonte.py` — 1 req/s, 3 tentativas com backoff, UA identificável |
| B1.3 encoding por endpoint | ✅ `?seccion=` em UTF-8, `partido.asp` em cp1252 |
| B1.4 parser de temporadas | ✅ lê do `<select>`, sem hardcode |
| B1.5 parser de competições | ✅ 37 competições da APL com categoria correta |
| B1.6 parser do calendário | ✅ 87 jogos, todos com id, data e recinto |
| B1.7 parser de equipas | ✅ 16 equipas com logótipo |
| B1.11 testes contra amostras | ✅ `uv run pytest` → 9 testes, sem rede |

Prova de ponta a ponta: `uv run python -m hoquei.cli despejar --tenant aplisboa --destino ../data-samples/json`
→ 37 competições e 87 jogos (63 já disputados) em 39 s, 172 KB de JSON.

**Uma regressão que os testes guardam:** um seletor CSS com vírgula no selectolax
(`css("div.a, div.b")`) devolve os nós **agrupados por seletor**, não por ordem no documento.
A primeira versão do parser de competições caminhava por irmãos e punha todas as provas na última
categoria. A ligação correta é explícita: `onclick="verComp(N)"` → `div#cN`.

## Próximo passo concreto

```
B1.9   Parser da ficha de jogo (#resultado + #jugadores)
B1.9a  Parser da cronologia (#desarrollo)  ← o bloco que dá mais valor à app
B1.9b  Normalizar o relógio decrescente em minuto absoluto
B1.8   Parser da classificação (amostra já gravada)
```

Depois `A2.1 → A2.5` põe isto no telemóvel.

## A época já começou — a janela de validação está aberta (18/09/2026)

Verificado na fonte a 18/09: a **APLisboa já joga desde 05/09** (torneios de abertura e jogos
treino, com boletins completos). O **campeonato nacional sénior só arranca a 07/11/2026** — tem os
182 jogos já publicados e nenhum disputado. Para observar jogos a decorrer, é a APL que serve.

As duas perguntas em suspenso continuam sem resposta, mas agora são **observáveis**:

1. **Com que rapidez a fonte atualiza durante e depois de um jogo?** (decide F8.1, live scores)
2. **A cronologia é preenchida durante o jogo ou só no fim?** (decide notificações de golo)

Indício novo a favor: uma ficha de jogo *por disputar* já devolve a cronologia montada com o
relógio no início (`20:00 Jogo não iniciado`). A plataforma tem estado por jogo e a vista pública
reflete-o. Falta a prova com um jogo a decorrer.

**A janela é sábado 19/09.** A 1ª jornada da Taça Jesus Correia (seniores masculinos) tem 7 jogos,
identificados com o scraper novo:

| Hora | Jogo | id |
|---|---|---|
| 10:00 | AE FISICA D — SPORTING CP | 9289 |
| 17:00 | CD PAÇO ARCOS — S ALENQUER B | 9295 |
| 17:00 | APAC TOJAL — SL BENFICA | 9301 |
| 18:00 | HC SINTRA — GDS CASCAIS | 9290 |
| 18:00 | FSE/AJ SALESIANA — GRF MURCHES | 9308 |
| 18:30 | UD VILAFRANQUENSE — SC TORRES | 9296 |
| 19:30 | A STUART HCM — PAREDE FC | 9302 |

Correr a sonda a partir das ~09:50 de sábado (a 60 s para medir a latência com precisão):

```bash
./scripts/sondar_atualizacao.py --tenant aplisboa --ids 9289 9295 9301 9290 9308 9296 9302 --intervalo 60 --ate 21:30
```

**Linha de base já registada** (18/09, 22:59): os 7 jogos foram sondados por começar, com hash
guardado. A sonda lê os diários anteriores ao arrancar, por isso o `*` de amanhã marca mudança
real face a esta noite — e não o simples facto de ser a primeira ronda.

Duas defesas acrescentadas à sonda depois de a primeira tentativa sair em silêncio:

- `--ate` com hora já passada é **erro** (saída 2), em vez de fazer uma ronda e imprimir
  "fim da janela de sondagem" como se tivesse corrido o dia todo;
- `--rondas N` para leituras pontuais assumidas, e `--esquecer` para ignorar a linha de base.

Se falhar o sábado, a próxima jornada é a 26/09 — repetir com
`uv run python -m hoquei.cli jogos --de 2026-09-26 --ate 2026-09-27` para obter os ids.

**Correções à documentação, já aplicadas em 01-fonte-de-dados.md:** os `id_temp` mudaram (FPP `11`,
APL `5` = 2026/27); a `seccion=agenda` está partida e não serve para próximos jogos; há jogos com
equipas por definir (`-`) que o parser tem de aceitar.

## Duas coisas a não esquecer antes de publicar

- **L7.1 — falar com a FPP/APL** antes de pôr na Play Store. É o risco mais provável do projeto e
  resolve-se com um email.
- **Sem estatísticas individuais de escalões de formação na v1.** A fonte expõe nomes completos de
  crianças com golos associados; agregar e tornar isso pesquisável numa app pública é um problema
  diferente do site de uma federação.
