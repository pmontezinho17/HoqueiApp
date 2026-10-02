# Backlog — hoqueiAPP (PWA)

> **Revisto a 20/09/2026.** O cliente passou de app Android nativa para PWA. Os itens `A*`
> (Android) foram substituídos por `W*` (web). **Todos os `B*` do backend ficam iguais** — é a
> prova de que a Decisão 1 (a app nunca faz scraping) valeu a pena.

## Como ler este backlog

- **IDs**: `B` = backend/dados, `W` = PWA, `Q` = qualidade, `L` = lançamento, `F` = futuro.
- **Estimativas**: `XS` < 1h · `S` 1–3h · `M` ~meio dia · `L` 1–2 dias · `XL` > 2 dias.
- **Cada item tem um critério de aceitação verificável.** Se não se consegue testar, não está pronto.
- `must` = não faz sentido sem isto · `should` = falta notar-se · `could` = extra.
- No fim de cada fase há algo que funciona e se pode ver. Não avançar com `must` da fase anterior aberto.

---

## Fase 0 — Preparação ✅ feito (a parte Android caiu)

| ID | Item | Prio | Est. | Estado |
|---|---|---|---|---|
| ~~B0.1–B0.3~~ | ~~Android Studio, SDK, emulador, telemóvel físico~~ | — | — | ❌ **Já não é preciso** |
| B0.4 | Estrutura do repositório | must | XS | ✅ `scraper/`, `docs/`, `scripts/`, `data-samples/` |
| B0.5 | Amostras de HTML para os testes | must | M | ✅ 6 amostras, incluindo ficha de seniores (2 partes), de escolares (4 partes, anonimizada) e jogo por disputar |
| B0.6 | Descobrir subdomínios das outras associações | could | S | aberto |
| W0.7 | Node LTS + SvelteKit a correr localmente | must | S | ✅ Node 24, `npm run dev` em `localhost:5173` |
| W0.8 | Conta Cloudflare + projeto Pages ligado ao repo GitHub | must | S | Push na `main` publica automaticamente |

> A Fase 0 encolheu de ~1 dia para ~2 horas. É o primeiro dividendo da PWA: não há SDK, emulador,
> keystore nem conta de programador a instalar antes de escrever a primeira linha.

---

## Fase 1 — Backend: scraper + JSON (a maior parte já feita)

**Sem qualquer alteração face ao plano anterior.**

| ID | Item | Prio | Est. | Estado |
|---|---|---|---|---|
| B1.1 | Projeto Python (`uv`, httpx, selectolax, pytest) | must | S | ✅ |
| B1.2 | Cliente HTTP com rate limit, retries, UA identificável | must | S | ✅ 1 req/s, 3 tentativas |
| B1.3 | Encoding por endpoint (UTF-8 vs cp1252) | must | S | ✅ |
| B1.4 | Parser de temporadas | must | S | ✅ lê do `<select>` |
| B1.5 | Parser de competições | must | M | ✅ 37 competições com categoria |
| B1.6 | Parser do calendário | must | L | ✅ 87 jogos com id, data, recinto |
| B1.7 | Parser de equipas | must | S | ✅ 16 equipas com logótipo |
| B1.8 | Parser da classificação (múltiplos grupos) | must | M | ✅ 4 grupos, com invariantes aritméticos testados |
| B1.9 | Parser da ficha de jogo: `#resultado` + `#jugadores` | must | L | ✅ cabeçalho, árbitros, faltas, jogadores e equipa técnica |
| B1.9a | Parser da cronologia `#desarrollo` | must | L | ✅ 11 tipos de evento, 0 por classificar em 9 jogos reais |
| B1.9b | Normalizar o relógio decrescente em minuto absoluto | must | M | ✅ nº e duração das partes lidos da fonte (2×25min, 2×15min, 4×8min confirmados) |
| B1.9c | Parser do boletim oficial `#acta` | could | L | aberto |
| B1.9d | Flag `has_timeline` por jogo | should | XS | ✅ `FichaJogo.tem_cronologia` |
| B1.10 | Modelo normalizado + escrita dos JSON do contrato | must | M | ✅ `publicar` gera competitions, comp/, match/ e meta.json |
| B1.11 | Testes do parser contra amostras | must | M | ✅ 32 testes, sem rede, incluindo cruzamento entre parsers |
| B1.12 | Deteção de mudanças por hash | should | S | aberto |
| B1.13 | Normalização de nomes de clubes + slug estável | should | M | aberto |
| B1.14 | GitHub Action com cron | must | M | ✅ 2h aos fins-de-semana, 6h nos dias úteis — ver nota de cadência |
| B1.15 | Publicação dos JSON **no mesmo domínio da PWA** (Cloudflare Pages) | must | M | aberto — ver nota |
| B1.16 | `meta.json` com `generated_at` e estado | must | XS | ✅ |
| B1.17 | Alerta de quebra do parser | should | S | aberto |
| B1.18 | Backfill de temporadas anteriores | could | M | aberto |
| B1.19 | Crawl incremental das fichas de jogo | must | M | ✅ 2ª execução: 0 buscadas, 80 já actuais |
| B1.20 | Agregação por jogador → `scorers/{comp}.json` | should | L | ✅ soma por (equipa, nome); 93 jogadores na Taça Jesus Correia |
| B1.21 | Filtro RGPD: sem estatística individual abaixo de sub-17 | must | S | ✅ `privacidade.py` — 36 de 80 fichas anonimizadas, escalão desconhecido é restrito por omissão |

> **B1.15 mudou de forma com a PWA.** Antes os JSON iam para um sítio qualquer com CORS aberto.
> Agora vão para o **mesmo projeto Cloudflare Pages que serve a PWA**, debaixo de `/v1/`. Sem CORS,
> cache trivial, e o service worker trata dados e código com o mesmo mecanismo.
>
> **Nota de volume (B1.19):** as fichas de jogo são o único sítio onde o crawl cresce — milhares de
> páginas de ~80 KB por temporada. Em regime normal só se buscam as dos jogos acabados de disputar
> (algumas dezenas por fim de semana). O backfill corre uma vez, de noite.

---

## Fase 2 — Primeira PWA a funcionar de ponta a ponta (~1–2 dias)

Objetivo: **um ecrã** com jogos reais, no telemóvel, instalável. É aqui que se aprende SvelteKit.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W2.1 | Projeto SvelteKit + `adapter-static` + TypeScript | must | S | ✅ build estático em `web/build` |
| W2.2 | Tipos TS espelhando o contrato de dados | must | S | ✅ `src/lib/tipos.ts` |
| W2.3 | Carregar `comp/{id}.json` num `load` e listar os jogos | must | M | ✅ com seletor de competição |
| W2.4 | Os 3 estados: a carregar / erro / conteúdo | must | M | ✅ barra de progresso + `+error.svelte` com botão de repetir |
| W2.5 | Componente `JogoLinha` (equipas, resultado, data/hora, recinto) | must | M | ✅ vencedor a negrito, por disputar com `–` |
| W2.6 | Agrupamento por jornada, com a jornada atual em foco ao abrir | must | M | ✅ badge "em curso" + scroll automático |
| W2.7 | **Mobile-first**: legível e utilizável a 360px sem scroll horizontal | must | M | ✅ verificado a 375×812, sem scroll horizontal |
| W2.8 | `manifest.webmanifest` + ícones + `vite-plugin-pwa` | must | M | ✅ manifest + ícones 192/512/maskable (provisórios, ver L7.3) |
| W2.9 | Service worker a pré-carregar o shell (offline básico) | must | M | ✅ 19 entradas (122 KiB) + stale-while-revalidate em `/v1/` |
| W2.10 | Publicado em Cloudflare Pages, acessível por URL público | must | S | Abre no teu telemóvel pelo link |
| W2.11 | Tema claro/escuro seguindo o sistema | should | M | Alternar o tema não deixa texto ilegível |

> Ao contrário do plano Android, **no fim da Fase 2 já há um link para partilhar**. Não é preciso
> esperar pela Fase 7 para alguém ver aquilo.

---

## Fase 3 — Núcleo de consulta (~4 dias)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W3.1 | Navegação e rotas | must | M | ✅ `/`, `/classificacoes`, `/jogo/[id]` — cada ecrã com URL partilhável |
| W3.2 | Navegação entre secções | must | M | ✅ cabeçalho fixo com Jogos · Classificação e a competição partilhada |
| W3.3 | Seletor de competição | must | L | ✅ no `+layout`, aplica-se às duas secções via `?comp=` |
| W3.4 | Seletor de temporada | should | S | Mudar para 2025/26 mostra dados históricos |
| W3.5 | Ecrã Classificação | must | L | ✅ vários grupos, coluna de equipa fixa, só a tabela rola (destaque do favorito fica para a Fase 4) |
| W3.6 | Ecrã Detalhe de Jogo | must | XL | ✅ cabeçalho + tabs Cronologia e Ficha (Boletim depende de B1.9c) |
| W3.6a | Tab Cronologia | must | L | ✅ timeline com minuto absoluto, ícones, partes, resultado corrente, marcador e assistente |
| W3.6b | Tab Ficha | must | L | ✅ jogadores com G/A/D e equipa técnica |
| W3.6c | Tab Boletim: arbitragem, resultado por parte, prolongamento | could | M | Mostra os parciais e a equipa de arbitragem |
| W3.6d | Esconder tabs vazias | should | XS | ✅ sem cronologia ou sem ficha, a tab não aparece |
| W3.7 | Ecrã Equipa: próximos jogos, últimos resultados, posição, plantel | should | L | Chega-se lá clicando no nome da equipa em qualquer sítio |
| W3.8 | Ecrã Quadros | must | L | ✅ top 50 com clube, total e média por jogo |
| W3.9 | Quadros de marcadores, assistências e defesas | should | M | ✅ ecrã `/quadros`, com empates no mesmo lugar e média por jogo |
| W3.10 | Explicação em vez de lista vazia | must | XS | ✅ competição sem fichas publicadas explica-o; a tab Defesas só aparece se houver defesas registadas |
| W3.11 | Ecrã Sobre: atribuição da fonte, última atualização, versão | must | S | Mostra o `generated_at` do `meta.json` |
| W3.12 | Aviso de dados velhos | should | S | ✅ idade no cabeçalho, destacada acima de 24h |
| W3.13 | Pré-visualização em partilhas (Open Graph por jogo) | could | M | Colar o link de um jogo no WhatsApp mostra as equipas e o resultado |
| W3.6e | Tab Ficha: colunas **Pe** e **LD** | should | S | ✅ a cinzento quando `0/0`, destacadas quando houve remate |
| W3.14 | **Ícone de golo**: bola de hóquei em patins em vez do ⚽ | should | S | ✅ SVG próprio (`Bola.svelte`), com aro claro para não desaparecer no tema escuro |
| ~~W3.15~~ | ~~Seletor em folha inferior~~ | — | — | ❌ **Removido.** A reestruturação tornou-o desnecessário: as competições passaram a ser um destino de navegação, não um controlo de cabeçalho |

> W3.13 não existia no plano Android e é das coisas mais valiosas da web aqui: o link de um jogo
> partilhado num grupo de WhatsApp mostra logo o resultado, mesmo a quem não abrir.

---

## Fase 4 — Favoritos e calendário (~3 dias)

Local-first: funciona sem conta e sem rede depois da primeira visita.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W4.1 | Escolher equipas favoritas | must | M | ✅ folha de pesquisa sobre o índice de 216 pares equipa+escalão |
| W4.2 | Persistência em `localStorage` | must | S | ✅ com try/catch — armazenamento bloqueado não parte a app |
| W4.3 | Favoritos por clube + escalão | must | M | ✅ "Parede FC A" sub-13 não traz os seniores |
| W4.4 | Seguir várias equipas | must | M | ✅ |
| W4.5 | Ecrã "O Meu Clube" | must | L | ✅ próximo jogo, último resultado e posição em cada prova do escalão; é o `start_url` da app instalada |
| W4.6 | Gerir favoritos | must | S | ✅ seguir/deixar de seguir no próprio ecrã |
| ~~W4.7~~ | ~~Ecrã Calendário próprio~~ | — | — | ❌ **Substituído pelo W7.5**, que vive em O Meu Clube e é melhor: casa/fora codificado na célula |
| W4.8 | Calendário de qualquer clube, a partir do ecrã Equipa | must | M | Chega-se ao calendário do Benfica sem o seguir |
| W4.9 | Distinguir casa/fora visualmente | should | S | Nota-se num relance |
| W4.10 | Partilhar jogo ou resultado (Web Share API) | should | S | Abre o menu de partilha nativo do telemóvel |
| W4.15 | Vista Agenda, transversal às competições | should | L | ✅ `/agenda` com Próximos e Resultados, agrupado por dia, filtro "só as minhas equipas" ligado por omissão |
| B4.16 | `agenda.json`: índice transversal de jogos para a vista Agenda | should | M | ✅ 791 jogos, 13,7 KB comprimido, num só pedido |
| B4.11 | **Feed ICS por equipa**: `/v1/{tenant}/{season}/team/{id}.ics` | must | M | Subscrever o URL no Google Calendar mostra todos os jogos |
| W4.12 | Botão "Adicionar ao meu calendário" com o URL do feed + instruções | must | M | Um toque e os jogos entram no calendário do utilizador |
| W4.13 | Descarregar um jogo isolado como `.ics` | should | S | Ficheiro abre no calendário com data, hora e recinto |
| W4.17 | Emblemas dos clubes | could | M | ✅ em jogos, agenda, classificação e O Meu Clube |
| B4.18 | Emblemas servidos da nossa origem, encolhidos e normalizados | should | S | ✅ 31 WebP de 64px, 2,3 KB em média (eram 22,8 KB PNG) — 89,8% menos |
| W4.19 | Recuo de iniciais | should | S | ✅ círculo com cor estável derivada do nome; também cobre um emblema que falhe a carregar |
| ~~A4.14~~ | ~~Escrever todos os jogos no calendário local da app~~ | — | — | ❌ **Impossível na web.** Substituído por B4.11 + W4.12 |

---

## Fase 5 — Notificações e conta (~4–5 dias)

> **É aqui que a arquitetura muda.** Até ao fim da Fase 4 é tudo estático: nada com estado, custo
> zero. As notificações obrigam a guardar subscrições de browsers, e isso traz base de dados, RGPD
> e manutenção permanente.
>
> ⚠️ **Correção ao plano anterior.** Com FCM nativo bastavam tópicos e não era preciso servidor.
> **O Web Push não tem tópicos** — cada browser dá um endpoint de subscrição que temos de guardar e
> a quem temos de enviar individualmente. Na web, notificar exige mesmo um componente com estado.

### Deteção de alterações (backend, sem mudanças)

> **Dependência, identificada a 02/10:** isto assume um `events.json` que ninguém construiu, e
> que não se pode construir sem guardar o estado da ronda anterior. Ver **Fase 9** — o B9.7 é
> esta deteção, e depende do B9.4.


| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| B5.1 | Diff entre execuções: jogo novo, resultado final, data/hora/recinto alterados, adiamento | must | L | Adiar um jogo na amostra produz `match_rescheduled` com antes e depois |
| B5.2 | Histórico de eventos com `event_id` idempotente | must | M | Reexecutar 3× produz o mesmo `event_id` |
| B5.3 | Não notificar em avalanche no 1º arranque nem em backfill | must | S | Backfill de uma época não dispara nada |

### Web Push

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W5.4 | Subscrição Web Push (VAPID) no service worker + pedido de permissão em bom momento | must | L | Notificação de teste chega ao Android |
| B5.5 | Armazenamento das subscrições (Cloudflare D1 ou KV) com equipas seguidas | must | L | Remover favorito deixa de receber |
| B5.6 | Envio a partir do job do scraper, com limpeza de subscrições expiradas (410/404) | must | L | Evento novo → notificação em < 2 min; endpoints mortos são apagados |
| B5.7 | Notificação de resultado final de equipa seguida | must | S | Chega uma vez, com o resultado certo |
| B5.8 | Notificação de alteração de jogo (data, hora, recinto, adiamento) | must | M | "Jogo adiado: nova data 12/10 às 18h00" |
| W5.9 | Ecrã "Alterações recentes" com antes → depois | must | M | Duas alterações aparecem as duas |
| W5.10 | Marcar alteração como vista | should | S | Sai da lista de não vistas |
| W5.11 | Explicar na UI que o calendário subscrito já se corrigiu sozinho | must | XS | Texto claro junto da alteração |
| W5.12 | Definições de notificações por tipo | must | S | Desligar impede a receção |
| W5.13 | **Ecrã de instalação para iOS**: explicar Partilhar → Adicionar ao ecrã principal | must | M | Num iPhone, quem tenta ativar notificações vê as instruções |
| W5.14 | Detetar iOS não instalado e não oferecer push (evita erro sem explicação) | must | S | Safari sem instalar não mostra o botão, mostra o motivo |
| B5.15 | Notificação "o teu jogo começa em 1h" | should | M | Chega no timing certo e não para jogos terminados |

### Conta Google (opcional, nunca obrigatória)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W5.16 | Login com Google (Google Identity Services) | should | M | Login e logout funcionam; o site continua utilizável sem |
| W5.17 | **Nunca bloquear nada atrás do login** | must | S | Visita nova chega a todos os ecrãs sem autenticar |
| B5.18 | Sincronizar favoritos na conta | should | L | Abrir noutro dispositivo e entrar recupera os favoritos |
| W5.19 | Conflito entre favoritos locais e da conta no 1º login → união | should | M | Não perde escolhas locais |
| L5.20 | Eliminação de conta e dados dentro da app | must | M | Apaga conta, subscrições e preferências |
| L5.21 | Política de privacidade a cobrir conta e subscrições push | must | M | Coerente com o que o site faz |

---

## Fase 6 — Qualidade e desempenho (~2–3 dias)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| Q6.1 | Offline a sério: cache dos dados das equipas seguidas | should | L | Modo avião mostra os jogos do meu clube |
| Q6.2 | Estratégia de cache explícita (stale-while-revalidate nos dados) | must | M | Abre instantâneo e atualiza em segundo plano |
| Q6.3 | Aviso de "nova versão disponível" quando o service worker atualiza | must | S | Publicar nova versão oferece recarregar |
| Q6.4 | Lighthouse ≥ 90 em Performance, Acessibilidade, Best Practices e PWA | should | M | Relatório no CI |
| Q6.5 | Orçamento de bundle (< 150 KB JS comprimido na 1ª carga) | should | M | Build falha se exceder |
| Q6.6 | Acessibilidade: contraste, focus visível, alvos ≥ 44px, leitor de ecrã | should | M | VoiceOver lê a lista de jogos de forma compreensível |
| Q6.7 | Testes unitários do mapeamento de dados e dos componentes (Vitest) | should | M | `npm test` verde |
| Q6.8 | Teste end-to-end do percurso principal (Playwright) | could | M | Passa no CI |
| Q6.9 | Relatório de erros no cliente (Sentry ou equivalente) | should | S | Erro forçado aparece |
| Q6.10 | CI: build + testes em cada push | should | M | ✅ `.github/workflows/ci.yml` (Lighthouse por fazer) |
| Q6.11 | Testado em Safari iOS e Chrome Android reais, não só no emulador | must | M | Sem bug de layout em nenhum |

---

## Fase 7 — Lançamento (~1 dia)

Muito mais leve do que o plano Android: sem loja, sem revisão, sem conta de programador.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| L7.1 | Contactar a APL | must | S | ✅ **enviado a 01/10/2026** para `info@aplisboa.pt`. Se não houver resposta até ~22/10, telefonar: 213 931 710 |
| L7.2 | Domínio próprio apontado ao Cloudflare Pages | should | S | Abre em `hoquei.<algo>` com HTTPS |
| L7.3 | Ícones, nome e cor do tema no manifest | must | M | Ícone correto no ecrã principal em Android e iOS |
| L7.4 | Política de privacidade publicada | must | M | URL acessível a partir do rodapé |
| L7.5 | Atribuição visível da fonte em todas as páginas | must | XS | "Dados: Federação de Patinagem de Portugal" no rodapé |
| L7.6 | Teste com 5–10 pessoas reais (pais, treinadores, adeptos) | must | M | Feedback recolhido e triado |
| L7.7 | Partilhar o link nos grupos dos clubes | must | XS | Primeiros utilizadores a usar |

> ~~Conta Play Console, keystore, ficha de loja, releases faseadas~~ — **tudo isto desapareceu.**
> A Fase 7 passou de ~2 dias para ~1, e sem custo monetário.

---

## Fase 8 — Futuro

| ID | Item | Nota |
|---|---|---|
| F8.1 | Live scores (refresh ~1 min) | **Ainda por validar** — sonda de 26/09. A fonte tem cronologia com relógio, mas o auto-refresh dela é um stub morto |
| F8.2 | Perfil de jogador: golos por jornada, evolução | Só sub-17 para cima |
| F8.3 | Histórico e head-to-head entre clubes | O histórico dos JSON em git já dá a base |
| F8.4 | Suporte às restantes associações regionais e outras modalidades (`id_modal`) | O parser já é multi-tenant |
| F8.5 | **Play Store via TWA** | Invólucro fino sobre a PWA. Dias, não semanas |
| F8.6 | **App Store via Capacitor** | A Apple rejeita invólucros vazios — precisa de integração nativa a sério |
| F8.7 | App nativa a sério (Kotlin / Swift) | Só se forem precisos widgets, background ou push sem fricção no iOS |
| F8.8 | Competições internacionais (World Skate) | Fonte diferente, nova investigação |

---

## Rastreabilidade — funcionalidades pedidas → backlog

| Funcionalidade pedida | Onde está | Fase |
|---|---|---|
| Entrar com conta Google | W5.16–W5.19, L5.20–L5.21 (opcional) | 5 |
| Escolher equipas favoritas | W4.1, W4.3 (clube **e** escalão), W4.4, W4.6 | 4 |
| Quadro com golos gerais | B1.19–B1.21, W3.8–W3.10 | 1 + 3 |
| Informação das fichas de jogo | B1.9–B1.9d, W3.6–W3.6d | 1 + 3 |
| Calendário de cada clube e do meu clube | W4.7, W4.8, W4.5 | 4 |
| Notificações de alterações, com confirmação | B5.1–B5.3, B5.8, W5.9–W5.11 — **muda de forma**, ver Decisão 4 | 5 |
| Adicionar ao calendário jogos de um clube/escalão | B4.11 + W4.12 (feed ICS) | 4 |

---

## Séries de um campeonato regional — vista agregada (W5.22)

Pedido a 30/09/2026, com um pedido explícito de avaliação crítica. Aqui vai.

### O problema não é de vista, é de modelo de dados

A fonte **não tem o conceito** de "o campeonato regional de sub-17". Tem seis competições
irmãs — `CAMP. REG. SUB-17 - 1ª FASE - SERIE A` até `- SERIE F` — sem nenhum campo que as
ligue. O único sinal de que pertencem ao mesmo campeonato é o **prefixo do nome**.

Logo, agrupar exige inferir a partir do nome. E aqui aplico a lição do bug dos dois layouts:
**inventariar os padrões antes de escrever o regex**, não adivinhar pelo primeiro que aparece.
Os que já vi na APL e na FPP: `- SERIE X`, `- NIVEL I/II` (escolares), `- ZONA NORTE/SUL`
(nacional) e `- 1ª FASE` / `- FASE FINAL`. Um nome que não encaixe fica **sem grupo**, nunca
agrupado por palpite.

### Onde eu discordo do desenho proposto

**Agregar classificações numa tabela única é impossível, e acho que já o sabes** — disseste
"ver todas as tabelas das respetivas séries", que é a leitura correcta. Fica registado porque é
o ponto onde isto se estraga facilmente: as equipas de séries diferentes **não jogam entre si**,
e podem ter feito números diferentes de jogos. Somá-las numa tabela produziria uma ordenação
sem significado. "Ver todas" em classificação = **todas as tabelas empilhadas**, nunca fundidas.

**Agregar os quadros de marcadores é possível mas enganador.** Um melhor marcador da SERIE F
com 12 golos não é comparável a um da SERIE A com 10: adversários diferentes, níveis
possivelmente muito diferentes. O quadro agregado parece autoritativo e não é. Se se fizer:
mostrar a série ao lado de cada jogador, e chamar-lhe "todas as séries" e não "campeonato".

**O switch é o controlo errado se o padrão vier errado.** Proponho o inverso do que sugeriste:
o **agrupado como vista primária**, porque é esse o modelo mental de quem usa ("o regional de
sub-17"), com as séries como secções. E para quem quer só a sua série, o atalho não é um switch
— são os **favoritos**: quem segue uma equipa quer a série dela, e isso já se sabe.

### O argumento mais forte a favor, que não está no pedido

Agrupar séries **encolhe o seletor de competições de 37 para cerca de 15**. Ou seja, isto não é
só uma vista nova: é a correcção de raiz do problema que o W3.15 tapou com um seletor melhor.
Por isso subo-lhe a prioridade acima de outras coisas da Fase 5.

### Complexidade real

Achas que talvez seja complexo; acho que é **moderado** e o risco está todo no inventário dos
padrões de nome, não no código. O agrupamento é um regex mais um campo novo no JSON; a UI são
secções. Estimo `M` no backend e `L` na app.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| B5.22 | Inventário dos padrões de série | must | S | ✅ na APL só existe `- SERIE X` (25 de 37); `NIVEL I/II` **não** é série, é nome base — verificado e documentado em `grupos.py` |
| B5.23 | `grupo_id`, `grupo_nome` e `serie` no JSON | should | M | ✅ 37 competições → 20 grupos; 638 de 791 jogos com série |
| W5.24 | `/competicoes` lista grupos | should | M | ✅ 20 entradas em vez de 37, agrupadas por escalão |
| W5.25 | Classificação com séries empilhadas | should | L | ✅ as 6 séries de sub-17 numa vista, nunca fundidas |
| W5.26 | Marcadores agregados com a série indicada | should | M | ✅ com aviso de que as séries não se enfrentam |
| W5.27 | Calendário do grupo | could | M | ✅ por série e por jornada, com a jornada em curso marcada |

## Página de equipa (01/10/2026)

Observação do dono: na Sofascore os favoritos são um **lançador**, não um painel — escolhe-se
uma equipa e vê-se a página dela. Nós empilhávamos resumos de todas as equipas no mesmo ecrã.

A observação apontava para uma lacuna real: **nunca tínhamos construído a página de equipa**,
pedida há duas sessões. O `/clube` era um resumo fino, não uma página.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W8.1 | **Página de equipa** `/equipa/[escalao]/[clube]` com Resumo · Jogos · Classificação · Plantel | must | L | ✅ feita |
| W8.2 | `/clube` passa a **lançador**: cartão por equipa seguida com o próximo jogo, que liga à página | must | M | ✅ escala com várias equipas, ao contrário do painel empilhado |
| W8.3 | Nomes de equipa **clicáveis** na classificação da competição | should | S | ✅ |
| W8.4 | Nomes de equipa clicáveis também na agenda, no calendário e no detalhe de jogo | should | M | aberto |
| W8.5 | Agrupar o plantel por posição (GR/JC) | could | M | aberto — a posição vem do boletim oficial, que ainda não é parseado (B1.9c) |
| W8.6 | **Calendário dentro da equipa**, não no lançador | must | M | ✅ `Lista · Calendário` na aba Jogos da equipa. Agregado, dois jogos no mesmo dia ficavam escondidos atrás de um `+1` que não se podia abrir |
| W8.7 | Data nas listas corridas de jogos | should | S | ✅ uma lista de 15 jogos só com horas não diz de que dia é cada um |
| B8.8 | **Parsear as colunas de cartões** da ficha (amarelo, azul, vermelho) | should | S | ✅ colunas 9–11, identificadas na fonte só pelos ícones `tamarilla`/`tazul`/`troja`; teste cruza o total com os eventos da cronologia |
| W8.9 | Plantel como **tabela com cabeçalho**, com cartões e sem o número da camisola | should | S | ✅ o número saía de uma ficha qualquer e os atletas mudam de camisola entre jogos |

## Capturas da Sofascore nativa → itens (01/10/2026)

Ver [05-sofascore-ecras.md](05-sofascore-ecras.md) para a leitura ecrã a ecrã. Ordenados por
retorno: os três primeiros não precisam de backend nenhum.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W7.1 | Cronologia a dois lados | should | M | ✅ casa à esquerda, visitante à direita, golo com faixa destacada e pastilha de resultado ao centro |
| W7.2 | Marcadores no cabeçalho | should | S | ✅ com minuto, por equipa, mais emblemas no placar |
| W7.3 | Migalhas clicáveis | should | S | ✅ escalão › prova › série › jornada, com ligação à competição |
| W7.4 | Forma recente | should | M | ✅ 5 últimos com emblema do adversário, data e resultado em pastilha verde/vermelha/cinzenta |
| W7.5 | Calendário mensal | should | L | ✅ emblema e hora na célula, casa/fora por cor **e marca `F`** — a cor sozinha inverte-se entre temas e exclui quem não a distingue |
| W7.6 | Classificação: chips `Tudo · Em casa · Fora` | should | M | Os mesmos dados recalculados a partir do calendário |
| W7.7 | Classificação: reduzir de 5 para **3 colunas** (J, DG, P) | could | XS | Ainda mais espaço para o nome do clube a 375px |
| W8.10 | Cartões no detalhe de jogo (tab Ficha) | could | XS | ✅ mais nome e número fixos ao rolar — com dez colunas, perdia-se de vista de quem era a linha |
| W8.11 | **Classificação da equipa: tabela completa + selector de competição sem "todas"** | must | M | ✅ mostrava só a linha da própria equipa. Tabelas de séries diferentes não se fundem — equipas que nunca se defrontaram não se comparam — por isso o selector obriga a escolher uma |
| W8.12 | **Selector de competição na lista de jogos, com "todas as competições"** | should | S | ✅ ao contrário da classificação, jogos de provas diferentes somam-se bem numa lista cronológica. O **calendário fica sem filtro**: o mês é do clube, não da prova |
| W8.13 | Copiar `grupo_id/grupo_nome/serie` do índice para as provas da página de equipa | should | XS | ✅ `comp/{id}.json` traz estes campos a `null`; sem isto os rótulos mostravam `- SERIE C` em cru e o link ia à série solta em vez do grupo |
| W8.14 | **A prova a decorrer é o defeito** da classificação e do plantel | must | S | ✅ `$lib/provas.ts` + 7 testes. A primeira da lista costuma ser um torneio de abertura já fechado. O plantel tem defeito próprio — a prova mais actual **com fichas** — senão abria vazio num campeonato ainda sem jogos |
| W8.15 | Colunas GM, GS e A na classificação da equipa | should | S | ✅ oito colunas não cabem em 375px: rola na horizontal com o lugar e o nome fixos. **As assistências não são oficiais** — somadas das fichas, e `–` quando a equipa não tem fichas, para a ausência não se ler como zero |
| W8.16 | **Selector de competição no plantel**, com "todas" | must | M | ✅ 103 atletas da APL jogaram por duas equipas do mesmo clube e escalão (ex.: AD OEIRAS A no torneio, B no campeonato). Somar as provas dava um plantel que nunca existiu |
| W8.17 | Nomes de atletas em caixa de título, por ordem alfabética | should | S | ✅ `nomeProprio()` + 8 testes, aplicado nos cinco ecrãs onde há nomes. A fonte publica tudo em maiúsculas; partículas em minúscula (`Vasco de Sousa`), maiúscula depois de hífen e apóstrofo (`D'Ávila`) |
| Q4.6 | **vitest no lado web** | should | S | ✅ 15 testes. O scraper tinha pytest desde o início e a web não tinha nada; estas duas funções são lógica pura com casos de fronteira a sério |
| W7.8 | Visão geral da equipa | should | M | ✅ jogos, GM, GS, assistências e recinto onde joga em casa |
| W7.9 | Plantel na página de equipa | should | M | ✅ ordenado por golos, com nº, G/A/D e jogos. Agrupar por posição fica pendente — a posição só vem do boletim (B1.9c) |
| W7.10 | Quadros: **top-3 por categoria com "Ver tudo"** em vez de lista corrida de 50 | could | S | Dá a provar sem obrigar a percorrer |
| W7.11 | **Barra de progresso da época** no cabeçalho da competição | could | XS | Primeira e última data de jogo da prova |
| W7.12 | Cartão **"＋ Adicionar"** em vez de botão de texto, nas listas de favoritos | could | XS | Afordância mais clara |
| W7.13 | Seguir uma **competição** (já era o W6.4) e, mais tarde, um **atleta** | could | M | Quatro tipos de favorito, como a referência |

**Não fazemos, e fica dito porquê:** odds de apostas, pontuação proprietária por jogador, xG,
match momentum, insights de IA, chat, valor de mercado, contagem de seguidores e **fotos de
jogadores** — ver a tabela no fim de [05-sofascore-ecras.md](05-sofascore-ecras.md).

**⚠️ Uma coisa que parece copiável e não é:** as **zonas de classificação nomeadas** ("Liga dos
Campeões", "Descida") com parêntesis coloridos. A fonte da APL não diz quem sobe, desce ou se
apura. Pintar um parêntesis verde ao lado dos dois primeiros seria afirmar o que não sabemos.
Liga-se ao W6.9: marcador de cor só com legenda, e legenda só quando se sabe o que diz.

## Achados do benchmarking a converter em itens (30/09/2026)

Ver [04-benchmarking.md](04-benchmarking.md). Os três primeiros vêm das apps nativas e não
apareciam no site móvel.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W6.1 | Fita de datas deslizável | should | M | ✅ janela de −10 a +35 dias, centrada no dia escolhido |
| W6.2 | Classificação sem scroll horizontal | should | M | ✅ 5 colunas (#, equipa, J, DG, P) cabem a 375px; as restantes ficam para uma vista Completa a fazer |
| W6.3 | Secções colapsáveis com contador | should | M | ✅ sábado 3/10 com 41 jogos abre em 6 secções fechadas, tudo num ecrã |
| W6.4 | Seguir uma **competição** inteira, com notificações próprias | could | M | Seguir o regional de sub-15 traz todos os jogos do escalão |
| W6.5 | Seguir um **jogo** individual | could | S | Estrela em cada linha de jogo |
| W6.6 | Selector de temporada no cabeçalho da competição | could | S | Passar para 2025/26 na própria página |
| W6.7 | Destino Mais | should | M | ✅ `/mais` com dados, fonte, aviso de não-oficial e contacto para remoção de nome |
| W6.8 | Interruptor `Todas as séries · Só a minha` | should | M | ✅ aparece quando se segue uma equipa do grupo; nunca funde tabelas |
| W6.9 | **Legenda** das cores e marcadores da classificação | should | XS | Nenhum marcador de cor sem explicação, como a NHL faz |
| W6.10 | Declaração de frescura mais explícita que o indicador actual de idade | could | XS | "Actualizado após cada jogo; dados de 1 out, 00:00" em vez de só "há 3 dias" |
| W6.11 | Linha de jogo plana | should | S | ✅ separador de 1px, sem raio nem margem |
| W6.12 | Competição no cabeçalho da secção | should | M | ✅ deixou de ser repetida em cada linha |
| W6.13 | Tipo a ~12px, hierarquia por peso e cor | should | M | ✅ |
| W6.14 | Cromado reduzido | should | M | ✅ cabeçalho compacto, seletor de competição removido (passou a navegação) |
| W6.15 | Sub-cabeçalho de série | should | M | ✅ `Série D` dentro da secção da competição, na lista de jogos |
| W6.16 | Cabeçalho de secção discreto | could | XS | ✅ |

## Nota sobre os logótipos dos clubes (W4.17)

Registada a 30/09/2026. A ideia é boa e os dados já lá estão — o `logo` de cada equipa vem
no JSON desde o início. Mas há três coisas a resolver antes, e a última não é técnica.

**Onde carregá-los de.** Apontar diretamente para `aplisboa.assyssoftware.es` põe o servidor
da associação a servir tráfego de imagens por cada visita da app, o que é exactamente o que a
Decisão 1 evita para os dados. Copiá-los para o nosso lado resolve isso, mas passa a ser
redistribuição.

**Consistência.** O calendário devolve URLs absolutos e a classificação relativos — B4.18.

**Propriedade.** Os emblemas são marcas dos clubes, não da federação. O site da APL mostrá-los
é uma coisa; uma app de terceiros usá-los é outra. Isto não impede nada, mas emparelha com o
**L7.1**: se o email à APL/FPP for feito, pergunta-se as duas coisas de uma vez. Enquanto não
houver resposta, o recuo de iniciais (W4.19) dá 90% do efeito visual com 0% do risco — e é
preciso de qualquer forma, porque nem todas as equipas têm emblema na fonte.

## Nota de desenho — a navegação está organizada no eixo errado

Registado a 30/09/2026, a propósito do seletor de competição ser difícil de usar.

Hoje a app pede **primeiro a competição** e só depois mostra jogos. Mas as três coisas que
alguém vem cá fazer não começam por aí:

| O que a pessoa quer | Por onde ela começa |
|---|---|
| "Como é que o meu clube correu?" | pelo **clube** |
| "O que há este fim-de-semana?" | pela **data** |
| "Em que lugar está o meu clube?" | pelo **clube**, e a competição é consequência |

Nos três casos a competição é o *resultado* da escolha, não o ponto de partida. Um `<select>`
com 37 entradas é mau, mas trocá-lo por um melhor seletor resolve o sintoma e não a causa.

**Ordem recomendada:**

1. **W3.15** — folha inferior com escalões e pesquisa. Barato, resolve a dor imediata.
2. **W4.1–W4.5 (favoritos)** — o verdadeiro remédio. Quem segue "Paço de Arcos sub-15" abre a
   app já lá e quase nunca volta a abrir o seletor.
3. **W4.15 — "Este fim-de-semana"** — a vista que a fonte não tem e que provavelmente se torna
   o ecrã inicial de facto: todos os jogos das próximas 72h, de todas as competições. Para um
   pai ou um adepto, é isto que responde à pergunta real.

Depois disto o seletor de competição passa a ser o caminho de *exploração*, usado raramente,
e não a porta de entrada obrigatória.

## Fase 9 — Base de dados com histórico (proposta de 02/10/2026)

> **Pedido:** *"ao invés de estar sempre a ler informação no formato JSON diretamente do site
> da APL, montarmos um processo de ingestão de dados, tratamento com limpeza, e storage numa
> BD, para que a nossa aplicação ficar mais robusta."*

### Primeiro, uma correção de premissa

**A app já não lê nada do site da APL.** É a Decisão 1 da arquitetura, de 18/09, e a cadeia
actual é esta:

```
aplisboa.assyssoftware.es (HTML)
   │   1 pedido por ronda, GitHub Action a cada 2h — nunca o telemóvel do utilizador
   ▼
scraper/ (Python)        ← a ingestão e a limpeza que o pedido descreve: já existem,
   │                       com 61 testes contra HTML gravado
   ▼
web/static/v1/... (JSON) ← servido do NOSSO domínio em Cloudflare, não do da APL
   ▼
PWA
```

O `BASE` que a app consulta é `/v1/aplisboa/2026-27` — o nosso próprio origin. O que falta
nesta cadeia não é a ingestão nem a limpeza: é **memória**.

### E onde eu discordo: a BD não torna isto mais robusto. Torna-o menos.

Para uma carga só de leitura, um ficheiro estático em CDN é a coisa mais robusta que existe:
não tem processo a correr, não tem ligações a esgotar, não tem query a expirar, não tem
factura, e o service worker guarda-o para funcionar no pavilhão sem rede. Uma BD **acrescenta**
um modo de falha onde hoje não há nenhum. Se o argumento for robustez, a resposta honesta é
que já estamos no ponto bom.

Dimensão actual, medida a 02/10: **4,6 MB**, 801 jogos, 188 fichas, 5170 eventos de cronologia,
4563 linhas de jogador — um inquilino, uma época. Não há aqui problema de escala a resolver.

### Mas o item é para fazer, por outra razão: não temos passado

Cada ronda **escreve por cima**. Daí resulta que não sabemos responder a nada disto:

| Pergunta | Hoje |
|---|---|
| Qual era a classificação a 15 de outubro? | perdida |
| Como evoluiu a forma deste atleta ao longo da época? | perdida |
| O que mudou entre a ronda das 8h e a das 10h? | perdida |
| Este jogo foi adiado ou mudou de recinto? | perdida |
| A ronda de hoje trouxe menos linhas do que a de ontem? | **perdida — e é exactamente o bug de 89% de perda de dados que só apanhámos por o utilizador reparar** |

Os 14 commits do Action de dados preservam alguma coisa por acidente, mas um histórico em
git não se consulta: não se faz `SELECT` a um diff.

### O desenho: a BD entra **atrás** da publicação, não em vez dela

Isto é o ponto que decide se o trabalho vale ou se estraga o que está bom:

```
scraper → BD (sistema de registo, com histórico) → gera o JSON estático → CDN → PWA
```

A PWA **continua a não falar com a BD**. Ganha-se o histórico, a deteção de alterações e as
perguntas novas; não se perde o offline, o custo zero, o contrato `/v1/` nem a ausência de
servidor no caminho do utilizador. Trocar o JSON por chamadas a uma BD em tempo real seria
pagar robustez para comprar conveniência — é o erro a evitar.

### Tecnologia: SQLite num ficheiro, não um serviço

A 10 mil linhas, um serviço gerido é overhead a sério. Um `hoquei.db` SQLite é um artefacto
único que o Action lê, escreve e volta a guardar, com `datasette` para olhar para ele quando
apetecer. **Cloudflare D1** (que é SQLite com API) só quando a app precisar mesmo de consultar
ao vivo — pesquisa entre épocas, ou as subscrições de push.

### A razão a sério para fazer isto agora: é o pré-requisito da Fase 5

As notificações precisam de saber **o que mudou desde a última vez**, e isso é precisamente o
estado que não guardamos. A Fase 5 está hoje a assumir um `events.json` que ninguém construiu.
Esta fase não é um refactor — é a peça que falta antes das notificações.

| # | Item | Prioridade | Esforço | Notas |
|---|---|---|---|---|
| B9.1 | Esquema SQLite: `competicao`, `equipa`, `jogo`, `ficha`, `evento`, `jogador_jogo`, `classificacao_linha` | must | M | chaves naturais da fonte (`id_comp`, `id` do jogo), como já fazemos no JSON |
| B9.2 | **`ronda`** — uma linha por execução do scraper, com contagens por tabela | must | S | é o que permite comparar rondas; sem isto não há histórico, há só um instantâneo |
| B9.3 | Carregar a BD a partir do que o scraper já produz, sem tocar nos parsers | must | M | os parsers estão testados e não se mexem; isto é uma camada de persistência |
| B9.4 | **Escrita versionada**: cada ronda insere, não substitui, com `visto_em`/`valido_ate` | must | M | é a decisão que cria o histórico. Sem ela, uma BD é um JSON mais caro |
| B9.5 | Gerar o JSON de `/v1/` **a partir da BD** | must | M | mantém o contrato e a PWA inalterados |
| B9.6 | **Guarda de qualidade**: a ronda falha se as contagens caírem acima de um limiar | must | S | apanhava o bug das 9-vs-10 colunas (256 de 307 linhas) na ronda seguinte, em vez de 11 dias depois |
| B9.7 | `events.json` gerado por diff entre rondas (adiamentos, mudanças de recinto, golos) | should | M | **desbloqueia a Fase 5**; substitui o `events.json` que o plano assumia |
| B9.8 | Guardar a BD entre execuções do Action (artefacto ou R2) | must | S | um Action é efémero; sem isto o histórico morre a cada ronda |
| B9.9 | Histórico de classificação na app — "era 3º, subiu a 1º" | could | M | o primeiro ganho visível para o utilizador, e só possível com B9.4 |
| B9.10 | Várias épocas e vários inquilinos na mesma BD | could | M | o nacional (FPP) arranca a 07/11; hoje cada inquilino é uma árvore de ficheiros à parte |
| B9.11 | `datasette` sobre a BD, para inspeção manual | could | XS | vale mais do que parece quando a fonte faz algo estranho |

**Esforço total: ~3–4 dias.** Não entra antes do lançamento: o que está publicado funciona, e
a Fase 9 não acrescenta uma única coisa que o utilizador veja (menos o B9.9). Entra **antes da
Fase 5**, que depende dela.

### Reforço de 02/10: os escalões sem tabela são o argumento mais forte

> *"se tiveres em consideração todos os escalões abaixo dos Sub-13, como os Escolares,
> Benjamins e Bambis, estes não têm tabelas de classificação nem tabelas de golos. Um pai que
> não tenha acesso a esta aplicação tem de andar sempre a fazer contas."*

Confirmado na fonte, e é mais extremo do que o pedido sugere:

| Escalão | Provas | Com tabela | **Sem tabela** | Jogos |
|---|---|---|---|---|
| ESCOLARES | 5 | 0 | **5** | 92 |
| BENJAMINS | 3 | 0 | **3** | 106 |
| TORNEIOS PARTICULARES | 2 | 0 | **2** | 20 |

**198 jogos sem uma única tabela de classificação.** Isto muda a natureza do projecto: até aqui
a app é uma vista melhor de informação que a fonte já publica. Isto seria a primeira coisa que
**produzimos** e que não existe em lado nenhum. É o argumento mais forte que já apareceu para
a Fase 9, e melhor do que o da robustez.

**Duas correções de facto, para o âmbito ficar certo:**

1. **A tabela de golos já existe** — e para estes escalões também. O `scorers/{comp}.json` não
   vem da fonte: é agregado por nós a partir das fichas de jogo (`quadros.py`). Os Escolares já
   têm 129 linhas de jogador, os Benjamins 72. Metade do pedido já está feita e publicada; o
   que falta mesmo é **a classificação**.
2. **Não existe escalão BAMBIS na APL.** Os escalões na fonte são BENJAMINS, ESCOLARES,
   SUB-13/15/17/19, SENIORES M/F e TORNEIOS PARTICULARES. Se os Bambis jogam, não é em prova
   publicada aqui — vale a pena perguntar à APL, já que o contacto está aberto.

### Já validei que conseguimos calcular — e com que regras

Não vale a pena propor isto sem provar que o cálculo bate certo. Corri o nosso cálculo contra
**todas** as tabelas que a fonte publica:

```
linhas: 176 iguais, 0 diferentes
ordem:   42 tabelas certas, 0 por explicar
```

As regras que saíram daí, medidas e não assumidas:

| Regra | Como foi apurada |
|---|---|
| **3 pontos por vitória, 1 por empate** | ajuste contra 151 linhas publicadas: `3V+1E` acerta 151/151, `2V+1E` só 65/151 |
| **Ordem: pontos → diferença de golos → golos marcados** | reproduz a ordem exacta das 42 tabelas |
| **A tabela conta só a fase de grupos** | os jogos a eliminar (quartos, meias, final) vêm com a coluna de grupo vazia e **não** entram. Era a causa de 25 das 29 divergências iniciais |
| **Prova de série única deixa a coluna de grupo vazia** | aí contam todos os jogos. Eram as 4 divergências restantes |

Isto quer dizer que podemos gerar as tabelas em falta **com o mesmo motor que reproduz as
existentes** — e manter essa reprodução como teste permanente. Se a APL mudar a regra de
pontos, o teste parte no dia a seguir, em vez de publicarmos silenciosamente tabelas erradas.

### O travão que te quero pôr à frente, e é diferente do dos nomes

Quando decidiste publicar nomes de atletas de formação, o argumento foi *"se já está visível no
site onde vamos consultar os jogos, não há problema"*. **Esse argumento não se aplica aqui**,
porque uma classificação de Benjamins não está visível em lado nenhum: seria informação nova,
criada por nós.

E a ausência é quase de certeza deliberada. Não publicar classificações nos escalões mais novos
é prática corrente nas federações — é uma escolha pedagógica, não um esquecimento: não se faz
um ranking competitivo de miúdos de 8 anos. A tabela de **golos por atleta** que já publicamos
está no mesmo terreno.

Não é razão para não fazer. É razão para:
- **perguntar à APL** antes de publicar — o email já está aberto e isto cabe numa frase;
- rotular como **"classificação calculada por nós, não oficial"**, que é verdade e evita que
  alguém a cite como oficial;
- considerar mostrá-la **por defeito só a quem a procura** nos escalões mais novos.

A decisão é tua. O que não quero é que vá para o ar sem teres isto à frente.

### Os dois momentos de extração — com duas correções

| Momento | Proposta | O que eu corrigiria |
|---|---|---|
| **Diária, à meia-noite** | recolher os jogos do dia | À meia-noite os jogos **desse** dia ainda não se jogaram. Uma ronda às 00:30 fecha **o dia que acabou** — que é o que se quer. Fica a ronda canónica que sela o dia na BD |
| **Near-real-time** | só os jogos de equipas favoritas | **Não precisamos de saber quais são as favoritas** — e ainda bem, porque elas vivem no `localStorage` de cada telemóvel e o backend não lhes chega sem a Fase 5. Medido: no pico há **15 jogos à mesma hora** (21/11, 16:30) e 41 num dia inteiro. Sondar *todos* os que estão a decorrer custa ~15 pedidos por ronda, 15 s ao nosso ritmo de 1/s. Mais simples **e** serve toda a gente |

Daí saem três cadências, e não duas:

| Cadência | Quando | Para quê |
|---|---|---|
| **ao vivo** | de N em N minutos, só com jogos a decorrer | resultado ao minuto; **depende da sonda de hoje** (F8.1) |
| **regular** | de 2 em 2 horas (já existe) | frescura geral |
| **fecho do dia** | 00:30 | sela o dia na BD: é esta que cria o histórico e dispara o recálculo das tabelas |

| # | Item | Prioridade | Esforço | Notas |
|---|---|---|---|---|
| B9.12 | **Motor de classificação**: 3V+1E, ordem pontos → DG → GM → nome, só fase de grupos | must | M | ✅ `scraper/src/hoquei/tabela.py`. Regras apuradas dos dados, não assumidas |
| B9.13 | **Teste de reprodução**: recalcular as 42 tabelas publicadas e exigir igualdade | must | S | ✅ `tests/test_tabela.py`, 17 testes. Compara 10 campos por linha, baralha a entrada antes de ordenar, e falha se a amostra encolher |
| B9.14 | Publicar classificação calculada para ESCOLARES, BENJAMINS e TORNEIOS PARTICULARES | should | S | o motor já as produz: **93 linhas** em 14 provas sem tabela. **Não publicado** — depende da resposta da APL, ver travão acima |
| B9.15 | Rótulo "calculada por nós, não oficial" nessas tabelas | must | XS | se o B9.14 avançar, este não é opcional |
| B9.16 | Ronda de **fecho do dia** às 00:30, que sela o dia e recalcula | must | S | o `cron` actual de 2h fica para frescura |
| B9.17 | Ronda **ao vivo** sobre os jogos a decorrer, sem saber favoritos | could | M | ≤15 jogos em simultâneo no pico. Bloqueado pelo resultado da sonda |
| B9.18 | **Normalizar grafias de clube** | should | S | a fonte tem `A STRUART HCM` vs `A STUART HCM` e `HC LOURINHA` vs `HC LOURINHÃ`. É literalmente a "limpeza" do pedido, e hoje parte emblemas e junções por nome |

### O que eu faria primeiro, se quisesses só uma coisa desta lista

Com o argumento dos Escolares em cima da mesa, mudo de resposta: o **B9.12 + B9.13** — o motor
de classificação e o teste que o obriga a reproduzir as 42 tabelas existentes. Não precisa da
BD para nada, cabe num dia, e é a única coisa desta lista que produz valor que não existe em
lado nenhum. A BD entra a seguir, para lhe dar memória.

(A resposta anterior era o **B9.2 + B9.6**, registo de rondas com contagens. Continua a ser o
que melhor protege o que já temos, e são meio dia de trabalho.)

---

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| HTML da fonte muda e o parser quebra | Alto | Parser no backend, testes com amostras, alerta automático (B1.11, B1.17) |
| Federação pede para parar | Alto | Contacto antecipado (L7.1), atribuição visível, scraping educado |
| Logótipos de clubes | Médio | Não usar sem autorização; iniciais na v1 |
| Dados de menores nas fichas de formação | **Alto** | Sem estatística individual abaixo de sub-17 (B1.21) |
| **Push no iPhone exige instalação manual** | **Médio** | W5.13/W5.14: explicar, e não oferecer o que não funciona |
| **Web Push obriga a guardar subscrições** | Médio | Isolado na Fase 5; tudo antes disso é estático |
| Utilizadores não perceberem que se instala | Médio | Convite a instalar em bom momento, e instruções próprias para iOS |
| Âmbito a crescer antes da v1 | Alto | Fase 8 existe para isso |
| Crawl das fichas a crescer | Médio | Crawl incremental obrigatório (B1.19) |
| **Mudança silenciosa na fonte: o parser não falha, só devolve menos** | **Alto** | Aconteceu (9-vs-10 colunas, 83% das linhas perdidas, 11 dias sem ninguém dar por isso). Mitigação real é a guarda de contagens entre rondas — B9.2 + B9.6 |
| **Escrever por cima a cada ronda: não há passado** | Médio | Fase 9 (B9.4). Sem histórico não há notificações nem auditoria |

---

## Próximo incremento

```
W2.10 + B1.15   publicar em Cloudflare Pages  ← precisa de ti (ligar a conta ao repo)
W3.7            ecrã de Equipa
W3.8            quadro de melhores marcadores (B1.20 no backend)
B1.9c           boletim oficial → 3ª tab no detalhe de jogo
```

A Fase 3 está quase fechada. Falta o ecrã de Equipa, o quadro de golos e o boletim.

Ao fim disto existe **um link para partilhar** com jogos reais, que qualquer pessoa abre no
telemóvel e instala. No plano Android isso só acontecia na Fase 7.

**Estimativa total até um lançamento útil: ~2,5 semanas** (era ~4 no plano nativo), e as Fases 0–4
(~1,5 semanas) já dão um site completo sem nada com estado.
