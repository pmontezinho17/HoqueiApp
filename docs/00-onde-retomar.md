# Onde retomar

**Última sessão:** 01/10/2026 · **Estado:** 🟢 https://hoquei.pages.dev — **reestruturado em três
separadores** com base no benchmarking, e com as séries dos campeonatos regionais agrupadas.

## A estrutura actual

```
┌──────────────────────────────────────┐
│ Hóquei            [procurar]  [⋮]   │
├──────────────────────────────────────┤
│  Jogos   │ O Meu Clube │ Competições │
└──────────────────────────────────────┘
```

| Ecrã | O que faz |
|---|---|
| `/` **Jogos** | fita de datas, equipas seguidas fixadas no topo, competições como secções colapsáveis com contador, séries como sub-cabeçalho |
| `/clube` **O Meu Clube** | favoritos por clube+escalão, próximo jogo, último resultado, posições |
| `/competicoes` | 20 grupos (eram 37 competições), por escalão |
| `/competicoes/[grupo]` | Classificação · Calendário · Marcadores, com as séries empilhadas |
| `/jogo/[id]` | cronologia, ficha, boletim |
| `/procurar`, `/mais` | ícones do cabeçalho |

**Porque três e não cinco:** ver [04-benchmarking.md](04-benchmarking.md). Nem a FotMob nem a
Sofascore têm classificações ou marcadores como separadores de topo — vivem dentro da competição.
E esconder navegação primária num menu corta a descoberta a metade (medido).

## O que este ficheiro já não precisa de dizer

O histórico das sessões anteriores está nos commits e no backlog, que tem o estado item a item.
Este documento fica só com o essencial para reentrar.

## Decisão à tua espera (02/10/2026)

O **motor de classificação está feito e validado** (B9.12/B9.13): reproduz as 42 tabelas que a
APL publica, linha a linha, e produz **93 linhas de classificação para os 14 torneios que não
têm tabela nenhuma** — Escolares, Benjamins e Torneios Particulares.

**Nada disso está publicado**, de propósito. Uma classificação de Benjamins não existe na fonte:
seria informação nova, criada por nós, e a ausência é provavelmente uma escolha pedagógica da
federação. Está no email à APL por responder. Ver o travão na Fase 9 do backlog.

## Próximo passo

Das sete funcionalidades que pediste no Keep, **quatro estão feitas**, uma está a meio e
**duas faltam**:

| Pedido original | Estado |
|---|---|
| Escolher equipas favoritas | ✅ |
| Quadro com golos gerais | ✅ |
| Calendário de cada clube e do meu clube | ✅ |
| Informação das fichas de jogo | 🟡 falta o boletim oficial (B1.9c) |
| Adicionar ao calendário os jogos de um clube/escalão | ✅ **03/10, testado em Android real** — um toque por jogo, mais feed subscritível |
| Notificações de alterações de jogos | ❌ Fase 5, a maior |
| Entrar com conta Google | ❌ Fase 5 |

**Por acabar, e precisa de ti:** faltam **18 moradas de recintos** em
`scraper/src/hoquei/dados/recintos.json` (11 preenchidas cobrem 68% dos jogos). Três das
preenchidas podem não ser encontradas pelo Maps — ver o commit de 03/10.

```
1.  B1.9c           boletim oficial → 3ª tab (atenção: só existe depois do apito)
2.  L7.4            política de privacidade
3.  Q6.11           testar em iPhone e Android reais   ← precisa de ti
4.  Fase 9 (B9.2 + B9.6)  contagens por ronda — protege o que já existe
5.  Fase 5          notificações — já desbloqueada pela sonda
```

Das sete do Keep ficam **duas por fazer**, as duas da Fase 5: notificações e login Google.

Bloqueados, não esquecidos: **B9.14** (tabelas calculadas) espera a APL; **F8.1** (live scores)
espera o diário da sonda de hoje.

~~W6.2~~ fechado a 02/10: a classificação tem `Simples · Completa` nas duas páginas, servidas
pelo mesmo componente.

## ⚠️ Por fechar

**~~A sonda de live scores~~ — correu a 02/10 e respondeu.** A fonte **actualiza durante o jogo**:
o marcador subiu degrau a degrau e a cronologia acompanhou, com latência abaixo dos 3 minutos da
nossa medida. Desbloqueia o F8.1, o B9.17 e as notificações de golo. Ver
[08-sonda-resultado.md](08-sonda-resultado.md).

**~~O email à APL~~ — enviado a 01/10/2026.** Perguntou quatro coisas: se vêem inconveniente,
nomes de atletas de formação, emblemas dos clubes, e acesso estruturado aos dados. **Se não
houver resposta até cerca de 22/10, telefonar — 213 931 710.** Uma conversa de dois minutos
resolve mais do que três emails.

A resposta condiciona três coisas: divulgar a app a outros pais e clubes, manter ou não os nomes
de formação (é uma flag, `--anonimizar-formacao`), e manter ou não os emblemas.

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

## Decisões — as duas que estavam em aberto ficaram resolvidas

| # | Decisão | Resolução |
|---|---|---|
| 1 | Feed ICS *vs* escrita no calendário do telefone | ✅ **Resolvida pela plataforma.** A web não pode escrever no calendário → só há feed ICS (B4.11 + W4.12) |
| 2 | "Alteração após confirmação do utilizador" | ⚠️ **Muda de forma.** O ICS corrige-se sozinho, logo não há evento nosso para confirmar. Passa a: notificar + ecrã de "alterações recentes" com antes → depois (W5.9–W5.11). **Confirma se te serve assim** |

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
B1.8            parser da classificação (amostra já gravada)
W0.7  + W2.1    esqueleto SvelteKit a correr localmente
W2.3  + W2.5    primeira lista de jogos reais no browser
W2.8  + W2.10   instalável e publicada num URL
```

Ao fim disto há **um link para partilhar**, que qualquer pessoa abre no telemóvel e instala.
Estimativa até um lançamento útil: **~2,5 semanas** (eram ~4 no plano Android).

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

**A janela de 19/09 falhou — a sonda não chegou a correr.** A próxima é sábado 26/09.

Os 7 jogos de 19/09 terminaram todos, com cronologias de 26 a 51 eventos (confirmado a 20/09),
pelo que os dados pós-jogo estão ricos. O que continua por medir é a **latência**: quanto tempo
demora a fonte a refletir um golo enquanto o jogo decorre.

A jornada de 19/09 era esta: A 1ª jornada da Taça Jesus Correia (seniores masculinos) tem 7 jogos,
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

Para 26/09, obter os ids novos e correr a sonda a partir de ~09:50:

```bash
cd scraper && uv run python -m hoquei.cli jogos --de 2026-09-26 --ate 2026-09-27
```

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
