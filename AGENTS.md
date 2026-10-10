# Project Agent Guide

Este repositório é o **hoqueiAPP**: uma PWA que acompanha hóquei em patins em Portugal —
resultados, calendários, classificações e fichas de jogo jogada a jogada. Está no ar em
`hoquei.pages.dev` e é um repositório **público**.

Este ficheiro é a única fonte canónica de instruções do repositório. O `CLAUDE.md` é só um
ponteiro para aqui.

> **Este ficheiro foi gerado pela skill `create-agentic-project` a 05/10/2026, reescrito à
> mão, e o vault que a acompanhava foi abandonado no mesmo dia.** Cinco regras do andaime
> contradiziam o projecto como ele existe; ficam em tabela, com o motivo, na secção
> "Adopção do padrão Agentic Project" de `docs/03-backlog.md`. Correr o andaime outra vez
> repõe uma delas — verificado: o `--dry-run` diz `AGENTS.md [append reporting rule]`.

## First Read

1. Este ficheiro.
2. `docs/00-onde-retomar.md` — o estado do projecto e por onde continuar.
3. `docs/02-arquitetura-e-stack.md` — as cinco decisões de arquitectura e o contrato de dados.
4. `docs/03-backlog.md` — itens com ID, critério de aceitação e a secção "Próximo incremento".
5. Só depois o resto, e só o que a tarefa pedir.

**O conhecimento deste projecto vive em `docs/`.** São dez documentos numerados e são a
fonte, sem segunda casa: o vault do andaime foi abandonado a 05/10/2026 precisamente para não
haver duas. Os comentários do código citam estes documentos por caminho (`docs/04-...`), e é
assim que se chega ao raciocínio a partir do sítio onde ele importa — quem mover ou renomear
um documento tem de corrigir quem o cita.

## Source Hierarchy

1. O pedido do utilizador na conversa em curso.
2. As regras locais deste ficheiro.
3. Os documentos em `docs/`.

Não existe `AGENTS.md` de workspace acima deste: esta máquina não tem workspace Agentic OS
(sem `projects.yml`, sem `WORKSPACE.md`). O andaime gerado apontava para `../../AGENTS.md`,
que não existe.

## SDLC method (central)

This project adopts the central Agentic SDLC method. Source of truth for the
method (profiles, phases, G0 Intake ready to G8 Learning captured gates,
operational patterns):
`../../AgenticSuite/dvt-agentic-suite/` (start with `00 - Map/Vault map.md`).
Adapt, do not copy: the central method governs the form; this project governs
the local instantiation (stack, commands, thresholds).

- adopted agentic_sdlc_version: 2026-09-24
- Deltas since then: `../../AgenticSuite/dvt-agentic-suite/CHANGELOG.md` (focus on the
  "Downstream impact" section).
- Knowledge navigation scale: medium.
- Adoption contract: `../../AgenticSuite/dvt-agentic-suite/ADOPTION.md`.
- Agent entry rule: for delivery or coding work, use the `agentic-sdlc` gateway
  before acting. If the runtime does not load skills automatically, read
  `../../AgenticSuite/dvt-agentic-suite/skills/agentic-sdlc/SKILL.md` and follow it.

> Estes caminhos são relativos e só resolvem na máquina do dono, onde a suite está em
> `Documents/Devoteam/AgenticSuite/`. Num clone deste repositório público não existem. Quem
> clonar isto de fora ignora esta secção.

<!-- agentic-project:runtime-profile:start -->
## Agentic Project runtime defaults

- Selected by default when available: `rtk-ai-cli`. Compress noisy development command output before it enters agent context.
- These are project runtime preferences, not Agentic SDLC dependencies or gate
  criteria. The user can opt out of a default for a task.
- Explicit operator modes such as `modo-compacto` remain opt-in only.
- EU AI Act layer: off. The layer runs on request only, so a WorkItem runs it when a named human asks for it.

<!-- agentic-project:runtime-profile:end -->

## A regra que manda em tudo

**A app não faz scraping. Nunca.** É a Decisão 1 em `docs/02-arquitetura-e-stack.md` e não
está em discussão. O caminho é: raspador em Python → JSON estático no CDN → cliente fino que
só lê. Qualquer proposta que ponha o telemóvel a falar com a fonte está errada por desenho.

## A postura com a fonte

Os dados vêm do servidor de uma associação desportiva sem fins lucrativos, com o
conhecimento dela. Isso impõe regras que não são negociáveis por conveniência:

- Um pedido por segundo, no máximo. Uma raspagem central, nunca uma por utilizador.
- `User-Agent` identificável, com contacto. Zero ferramentas de evasão ou de disfarce.
- **Contar o custo antes de acrescentar pedidos.** Toda a ronda nova diz, em comentário,
  quantos pedidos faz no pico da época e porquê vale a pena. O ciclo ao vivo existe porque
  foi medido: 15 jogos à mesma hora, 15 pedidos por ronda de 30 s.
- **Num dia sem jogos não se pede nada.** A agenda publicada responde a "há jogos hoje?" sem
  custar um pedido, e a ronda das 00:30 — que corre sempre — é quem a estabelece. Esta regra
  nasceu de uma pergunta do dono a 08/10/2026 e de a medir: as rondas de dias sem jogos eram
  **28% de tudo** o que pediríamos à APL até dezembro. A excepção é a dúvida: se a agenda não
  se ler, corre-se.
- Um jogo sem resultado não se pergunta para sempre: há limites de tempo e de cadência, e
  eles estão lá de propósito.

## Onde vive o quê

| | |
|---|---|
| `scraper/` | o raspador em Python (`uv`, `httpx`, `selectolax`), os *parsers* e 157 testes |
| `web/` | a PWA (SvelteKit 2, runes, `adapter-static`, `@vite-pwa/sveltekit`) e 40 testes |
| `web/static/v1/` | os JSON publicados — o contrato de dados |
| `scripts/` | o ciclo ao vivo (`aovivo.sh`) e utilitários |
| `worker/relogio/` | o Cloudflare Worker que serve de relógio e cão de guarda às Actions |
| `.github/workflows/` | `ci.yml`, `dados.yml`, `aovivo.yml`, `sonda.yml` |
| `docs/` | o conhecimento: dez documentos numerados |
| `data-samples/` | HTML real da fonte, para os testes correrem sem rede |

## Rules

- **Nunca publicar sem o dono pedir.** E saber o que publicar significa: o `git push` só
  corre testes. Quem leva código novo ao site é o `dados.yml`, com o disparo
  `publicar_sempre` ou `so_publicar`. Um push não publica.
- **O `main` é produção. Trabalho não aprovado vive no `testes`.** Há **um** site de testes,
  `https://testes.hoquei.pages.dev`, e é só nesse que as funcionalidades novas aparecem. Um
  ramo novo não ganha endereço nenhum — o `ramo.yml` só dispara no `testes`, e isso está no
  ficheiro e não na memória de quem trabalha.

  A 10/10/2026 criei um sítio por funcionalidade e o dono parou-me: *"se temos o site de
  testes, é SÓ neste que eu quero ter as novas funcionalidades"*. Quatro sítios de testes são
  quatro sítios para alguém se enganar a partilhar — que foi exactamente o que aconteceu
  nessa manhã — e quatro cópias de dados a envelhecer em ritmos diferentes.

  **Uma experiência que não pode ir a produção fecha-se no código, não no calendário.** O
  `directos.ts` é o exemplo: só devolve alguma coisa num site de ramo, e por isso o dia em
  que o `testes` for fundido no `main` não a leva consigo. Confiar em que alguém se lembre
  é confiar de mais.

  **E o site de testes lê os dados de produção, não uma cópia sua.** Desde 10/10/2026 — ver
  `base()` no `dados.ts`. Uma cópia commitada envelhece em horas e mente: nesse sábado o site
  de testes dizia que um jogo ainda não tinha começado enquanto ele ia 2-0 ao intervalo.
  Custa zero pedidos à APL, porque é o nosso próprio CDN, e deixa o site de testes a diferir
  de produção **só no código** — que é o que um ambiente de testes devia ser. O contador de
  produção ignora esses pedidos pelo `Origin`, senão o tráfego de testes entrava nos números
  reais.

  Isto não é arrumação: a 09/10/2026 comitei para `main` um redesenho que ele queria ver em
  testes primeiro, e as **sete** publicações seguintes — todas para outras coisas — levaram-no
  ao ar sem aprovação. Eu tinha-lhe escrito esse risco por palavras minhas e segui a publicar
  na mesma. Enquanto algo não aprovado estiver em `main`, **qualquer** publicação o leva.
- **Subir a versão em `web/src/lib/versao.ts` quando a alteração se nota a usar a app**, e
  escrever uma linha em `NOVIDADES` para quem a vai ver. Uma publicação que só mexe na
  consola, no raspador ou num workflow **não sobe a versão** — e é isso que impede o aviso de
  actualização de aparecer a toda a gente por nada.
- **Durante uma janela de jogos há dois publicadores.** Nunca fazer `wrangler pages deploy`
  a partir de uma cópia local: a árvore local é a do último commit e o CDN tem o que o ciclo
  ao vivo escreveu entretanto. Já apagou resultados reais duas vezes.
- **O contrato de dados `/v1/...` é público e há builds antigos em cache nos telemóveis.**
  Renomear um campo ou um caminho deixa esses telefones com uma app vazia e sem explicação.
  Texto mostrado ao utilizador não tem este problema; a forma dos dados tem.
- **Tudo em português**: identificadores, comentários, documentos, mensagens de commit. Um
  `const ganhouCasa` ao lado de um `const homeWin` é uma base de código em duas línguas.
- **Os comentários registam o *porquê*, não o *quê*.** E quando houve medição, registam o
  número e a data: "medido a 04/10: das 8 corridas saíram 2". É isso que impede o próximo a
  passar por aqui de repetir um erro já pago. Um comentário que descreve o código é ruído.
- **Código e documento no mesmo commit** quando o documento afirma algo sobre o código. A
  página de privacidade tem isto escrito dentro dela: ela enumera uma chave em
  `localStorage`, zero cookies e zero tipos de letra externos, e se alguma dessas coisas
  mudar a página deixa de ser verdade no mesmo instante.
- **Correr os dois conjuntos de testes antes de dar trabalho por feito:**
  `cd scraper && uv run pytest` e `cd web && npm run check && npx vitest run`.
- **Medir em vez de afirmar.** Este projecto tem um historial de conclusões erradas tiradas
  a olho e corrigidas por medição — a altura de um cabeçalho, a fiabilidade de um cron, o
  número de grafias de clube erradas. Quando há forma de medir, mede-se primeiro.
- **Verificar no browser o que é visível no browser.** As correcções de interface confirmam-se
  a 375×812, nos dois temas, e com os dados reais — não por leitura do código.
- **Cuidado com a faixa que se arrasta.** Estão três dias montados ao mesmo tempo, por isso
  um `querySelector` apanha o vizinho fora do ecrã. Já enganou um teste e o tour guiado.
- Nomes de atletas são publicados em todos os escalões, por decisão do dono a 30/09/2026. O
  filtro que os omite abaixo de sub-17 continua implementado e testado
  (`--anonimizar-formacao`). Não o remover.
- A política de privacidade promete remover um nome a pedido, sem justificação. O endereço de
  suporte vive num só sítio: `web/src/lib/contacto.ts`.
- Repeatability rule: when a task, or a stable part of it, is reasonably
  expected to run more than once, the work is not complete until it leaves the
  smallest suitable deterministic path under version control. Reuse an existing
  path first. Otherwise add a script or task, hook or CI check, scheduled job,
  skill or pipeline, or a loop only when iteration and a verifiable done-rule
  are required.
  Size the mechanism against its payback before building it: state the
  expected number of runs over a named horizon, the cost of one manual run,
  and the cost of building and owning the path. When the build does not pay
  back inside that horizon, keep the task manual and record that decision
  where the next operator will look. Frequency alone does not justify
  automation, and neither does a paid subscription.
  Document the trigger and verification. Keep irreducible judgement as an
  explicit human checkpoint; do not automate an unstable process or oracle.
- Não reverter nem sobrepor alterações de outro agente. Inspeccionar o estado sujo antes de
  editar.
- Não guardar credenciais nem segredos no repositório. O token da GitHub vive como segredo
  do Cloudflare Worker e o dono nunca o passa a ninguém.

## Confidencialidade

**O conteúdo deste projecto não sai deste contexto.** Por instrução do dono a 06/10/2026:
nada do que aqui está ou aqui se cria — código, dados, decisões, documentos, medições,
números — é reutilizado em propostas, apresentações, conversas com clientes ou qualquer outro
trabalho. Não é material de exemplo, não é caso de estudo, e não alimenta nenhuma skill de
pré-venda ou de arquitectura.

O limite honesto desta regra: ela vale onde este ficheiro é lido, isto é, ao trabalhar neste
repositório. Uma sessão aberta noutra pasta não o lê — e nessa sessão também não há acesso a
este projecto, a não ser que alguém lho entregue. Se isso acontecer, a regra é esta.

## Writing Conventions

- **Reportar: telegráfico por omissão, prosa quando a conclusão muda.** Estado, progresso e
  confirmações em poucas linhas — "corri, passou, publiquei" não precisa de parágrafos.
  Prosa com a evidência em três casos: quando uma medição muda a conclusão, quando discordo
  do dono, e quando me corrijo. Aí dizer o que se mediu, onde, e porque é que a conclusão
  anterior estava errada — foi assim que se apanharam os quatro jogos sem resultado e a lista
  com dez minutos de atraso, e foi assim que o dono me corrigiu duas vezes com razão.
- **Nunca sacrificar a gramática pela concisão.** É o que transforma notas curtas em notas
  que ninguém relê. Cortar palavras, não cortar o porquê.
- O travessão (`—`) usa-se à vontade: está em 113 sítios só no backlog. E o traço de meia
  risca (`–`) é o traço dos resultados na interface, `1 – 0`, em quatro componentes. A regra
  do andaime que proibia os dois era incompatível com o projecto.
- Identificadores curtos aparecem sempre com o nome legível ao lado.
- Mensagens de commit: uma linha de assunto que diz o que mudou para o utilizador, e um
  corpo que diz o que estava errado, como se soube, e o que se mediu.
