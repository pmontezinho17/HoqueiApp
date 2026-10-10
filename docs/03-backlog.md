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
| W0.8 | Conta Cloudflare + projeto Pages ligado ao repo GitHub | must | S | ✅ ligado; `dados.yml` publica sozinho — 2h aos fins-de-semana, 6h nos dias úteis, e sexta às 21h UTC |

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
| B1.9c | Parser do boletim oficial `#acta` | could | L | ✅ `parsers/boletim.py` + 14 testes. Traz o que a ficha não dá: **resultado parte a parte**, faltas de equipa **por parte** (a ficha só as soma), equipa de arbitragem completa, horas de início e termo, e os capitães. **207 das 216 fichas têm boletim**, em todos os escalões |
| B1.9d | Flag `has_timeline` por jogo | should | XS | ✅ `FichaJogo.tem_cronologia` |
| B1.10 | Modelo normalizado + escrita dos JSON do contrato | must | M | ✅ `publicar` gera competitions, comp/, match/ e meta.json |
| B1.11 | Testes do parser contra amostras | must | M | ✅ 32 testes, sem rede, incluindo cruzamento entre parsers |
| B1.12 | Deteção de mudanças por hash | should | S | aberto |
| B1.13 | Normalização de nomes de clubes + slug estável | should | M | aberto |
| B1.14 | GitHub Action com cron | must | M | ✅ 2h aos fins-de-semana, 6h nos dias úteis — ver nota de cadência |
| B1.15 | Publicação dos JSON **no mesmo domínio da PWA** (Cloudflare Pages) | must | M | ✅ mesmo domínio da PWA, sem CORS |
| B1.16 | `meta.json` com `generated_at` e estado | must | XS | ✅ |
| B1.17 | Alerta de quebra do parser | should | S | ✅ feito pelo B9.6 — a ronda falha e o GitHub manda email, em vez de publicar menos em silêncio |
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
| W2.10 | Publicado em Cloudflare Pages, acessível por URL público | must | S | ✅ https://hoquei.pages.dev |
| W2.11 | Tema claro/escuro seguindo o sistema | should | M | ✅ `prefers-color-scheme`, verificado nos dois temas |

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
| W3.6c | Tab Boletim: arbitragem, resultado por parte, prolongamento | could | M | ✅ tab Boletim no detalhe de jogo, só quando há boletim — oferecer uma tab que abre vazia é pior do que não a ter |
| W3.6d | Esconder tabs vazias | should | XS | ✅ sem cronologia ou sem ficha, a tab não aparece |
| W3.7 | Ecrã Equipa: próximos jogos, últimos resultados, posição, plantel | should | L | ✅ feito pelo W8.1 — `/equipa/[cat]/[nome]` com Resumo · Jogos · Classificação · Plantel |
| W3.8 | Ecrã Quadros | must | L | ✅ top 50 com clube, total e média por jogo |
| W3.9 | Quadros de marcadores, assistências e defesas | should | M | ✅ ecrã `/quadros`, com empates no mesmo lugar e média por jogo |
| W3.10 | Explicação em vez de lista vazia | must | XS | ✅ competição sem fichas publicadas explica-o; a tab Defesas só aparece se houver defesas registadas |
| W3.11 | Ecrã Sobre: atribuição da fonte, última atualização, versão | must | S | ✅ `/mais` — fonte, última actualização, contagens e o aviso de não oficial |
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
| W4.8 | Calendário de qualquer clube, a partir do ecrã Equipa | must | M | ✅ feito pelo W8.6 — o calendário vive dentro da equipa, e chega-se a qualquer uma |
| W4.9 | Distinguir casa/fora visualmente | should | S | ✅ no calendário: fundo escuro e um `F` nos jogos fora |
| W4.10 | Partilhar jogo ou resultado (Web Share API) | should | S | Abre o menu de partilha nativo do telemóvel |
| W4.15 | Vista Agenda, transversal às competições | should | L | ✅ `/agenda` com Próximos e Resultados, agrupado por dia, filtro "só as minhas equipas" ligado por omissão |
| B4.16 | `agenda.json`: índice transversal de jogos para a vista Agenda | should | M | ✅ 791 jogos, 13,7 KB comprimido, num só pedido |
| B4.11 | **Feed ICS por equipa**: `/v1/{tenant}/{season}/team/{id}.ics` | must | M | ✅ `scraper/src/hoquei/ics.py` + 21 testes, 214 feeds e 1582 eventos. **UID e DTSTAMP deterministas** — sem isso o calendário duplicava eventos em vez de os corrigir, e a app republicava a cada corrida do cron. ⚠️ **Na prática a subscrição não chegou a funcionar**: 24h depois, zero eventos no Google Calendar do dono do projecto. O feed está irrepreensível (200, `text/calendar`, sem bloqueio no robots, verificado com o user-agent do importador), por isso o problema é do lado da Google. O caminho fiável é o de um toque por jogo, que já é a acção principal |
| W4.12 | Botão "Adicionar ao meu calendário" com o URL do feed + instruções | must | M | ✅ **validado em Android real a 03/10** — toque num jogo abre o Google Calendar preenchido e o Maps abre no sítio certo. Chegou lá à terceira: `webcal:` não existe no Android, o `.ics` ficava nas Transferências, e a subscrição só dá sinal horas depois |
| W4.13 | Descarregar um jogo isolado como `.ics` | should | S | Ficheiro abre no calendário com data, hora e recinto |
| B4.15 | **Moradas dos recintos** (`scraper/src/hoquei/dados/recintos.json`) | must | M | ✅ **28 de 29 preenchidas pelo dono do projecto a 03/10**, a cobrir 787 de 791 jogos. Falta o `PAV. MUN. ANTONIO DOS ANJOS` (4 jogos) |
| W4.16 | **Um jogo de cada vez, com link de evento do Google** | must | M | ✅ **validado em Android real a 03/10**. Links `render?action=TEMPLATE`, um por jogo |
| B4.17 | **Feed só de hoje em diante** | must | XS | ✅ 1582 → 1204 eventos. Um calendário pessoal diz onde é preciso estar; o histórico vive na app |
| — | ~~Emblema do clube no título do evento~~ | — | — | ❌ **impossível**: o iCalendar não tem campo para imagem e nem o Google nem a Apple mostram imagens num evento. O 🏑 é o mais próximo que existe |
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
| W5.16 | Login com Google (Google Identity Services) | should | M | ❌ **retirado a 03/10.** Dava uma coisa só — favoritos noutro dispositivo — e custava o primeiro estado e o primeiro dado pessoal do projecto. Ver Decisão 3 |
| W5.17 | **Nunca bloquear nada atrás do login** | must | S | ✅ por construção: sem login, nada pode estar atrás dele |
| B5.18 | Sincronizar favoritos na conta | should | L | ❌ retirado com o W5.16. Substituído pelo W5.26, que resolve o mesmo sem conta |
| W5.19 | Conflito entre favoritos locais e da conta no 1º login → união | should | M | ❌ sem login não há conflito a resolver |
| L5.20 | Eliminação de conta e dados dentro da app | must | M | ❌ sem conta não há conta para eliminar. As subscrições de push apagam-se ao desligar as notificações |
| L5.21 | Política de privacidade a cobrir conta e subscrições push | must | M | 🟡 a política existe (L7.4) e já diz que as notificações ainda não existem. Actualizar **antes** de elas funcionarem, com o endpoint de subscrição |
| ~~W5.28~~ | ~~Levar os favoritos num link~~ | — | — | ❌ **retirado a 04/10**, e o número foi corrigido: eu reutilizei o W5.26, que já existia. O dono do projecto não lhe vê sentido, e é ele que conhece os utilizadores. O problema de perder favoritos ao mudar de telefone fica sem solução e sem item |

---

## Fase 6 — Qualidade e desempenho (~2–3 dias)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| Q6.1 | Offline a sério: cache dos dados das equipas seguidas | should | L | Modo avião mostra os jogos do meu clube |
| Q6.2 | Estratégia de cache explícita (stale-while-revalidate nos dados) | must | M | Abre instantâneo e atualiza em segundo plano |
| Q6.3 | Aviso de "nova versão disponível" quando o service worker atualiza | must | S | ✅ `AvisoVersao.svelte`. **E era pior do que o item dizia:** o `registerType: 'prompt'` estava configurado sem ninguém para mostrar o aviso, e no SvelteKit o `registerSW.js` não é injectado sozinho — **o service worker nunca era registado em produção**. Sem offline, sem cache, e o browser não reconhecia a app como instalável |
| Q6.4 | Lighthouse ≥ 90 em Performance, Acessibilidade, Best Practices e PWA | should | M | Relatório no CI |
| Q6.5 | Orçamento de bundle (< 150 KB JS comprimido na 1ª carga) | should | M | Build falha se exceder |
| Q6.6 | Acessibilidade: contraste, focus visível, alvos ≥ 44px, leitor de ecrã | should | M | ✅ `<html lang="pt-PT">` (era `en` — o leitor de ecrã lia tudo com voz inglesa), `<h1>` nas 3 páginas que não tinham, link "saltar para o conteúdo", anel de foco visível (havia um `outline: none` a tirá-lo), alvos de toque a 44px em 9 sítios, e `prefers-reduced-motion`. Contraste e nomes acessíveis já estavam limpos: 0 problemas em 45 textos |
| Q6.7 | Testes unitários do mapeamento de dados e dos componentes (Vitest) | should | M | 🟡 metade: `vitest` instalado e a correr no CI com 15 testes de lógica pura (`formato`, `provas`). Faltam os testes de componente |
| Q6.8 | Teste end-to-end do percurso principal (Playwright) | could | M | Passa no CI |
| Q6.9 | Relatório de erros no cliente (Sentry ou equivalente) | should | S | Erro forçado aparece |
| Q6.10 | CI: build + testes em cada push | should | M | ✅ `.github/workflows/ci.yml` (Lighthouse por fazer) |
| Q6.11 | Testado em Safari iOS e Chrome Android reais, não só no emulador | must | M | 🟡 **primeiro iPhone a 03/10**, e encontrou logo um bug que nenhuma emulação mostrava (Q9.26). Falta instalar no ecrã principal e testar sem rede |

---

## Fase 7 — Lançamento (~1 dia)

Muito mais leve do que o plano Android: sem loja, sem revisão, sem conta de programador.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| L7.1 | Contactar a APL | must | S | ✅ **enviado a 01/10/2026** para `info@aplisboa.pt`. **Fechado a 07/10/2026 por instrução do dono: o assunto não volta a ser levantado por um agente.** A relação com a associação é dele e a decisão de publicar já foi tomada — nada no backlog depende de uma resposta. Se ele quiser retomar, retoma |
| L7.2 | Domínio próprio apontado ao Cloudflare Pages | should | S | Abre em `hoquei.<algo>` com HTTPS |
| L7.3 | Ícones, nome e cor do tema no manifest | must | M | ✅ manifest com nome, cor e três ícones — **e agora ligado**: até 02/10 não havia `<link rel="manifest">` no HTML, logo a app não era instalável apesar de o manifest existir |
| L7.4 | Política de privacidade publicada | must | M | ✅ `/privacidade`, ligada do rodapé de todas as páginas e do /mais. **Escrita a partir de uma auditoria ao código**, não de memória: uma chave em `localStorage`, zero cookies, zero rastreio, zero tipos de letra externos. Diz o que a Cloudflare vê, o que acontece quando se toca nos botões que saem da app, e assume que "já é público" não é o mesmo que "pode ser republicado" — com remoção de um nome sem justificação nem discussão |
| L7.5 | Atribuição visível da fonte em todas as páginas | must | XS | ✅ rodapé em todas as páginas, com ligação à APL e o aviso de não oficial |
| L7.6 | Teste com 5–10 pessoas reais (pais, treinadores, adeptos) | must | M | Feedback recolhido e triado |
| L7.7 | Partilhar o link nos grupos dos clubes | must | XS | Primeiros utilizadores a usar |
| L7.8 | Email de suporte numa conta própria | should | S | ✅ **feito a 05/10/2026** — `info.ok4sticks@gmail.com`. Estava em três sítios no código; passou a uma constante só, em `web/src/lib/contacto.ts` |

### L7.8 — porque é que uma troca de endereço precisou de um ficheiro novo

O endereço estava em **três** sítios, e só um era uma constante partilhada: o
`feedback.ts`, mais duas cópias escritas à mão — uma delas usada em dois `mailto:`
diferentes na página de privacidade. Três cópias de um endereço é o desenho que garante que
uma fica atrás numa troca, por isso foram todas para uma constante antes de o valor mudar.

Não ficou no `feedback.ts` porque esse ficheiro é temporário por desenho: o botão de opinião
sai quando a fase de testes acabar, e está escrito lá em cima que o ficheiro vai com ele. O
endereço a que a política de privacidade promete responder não pode viver dentro de uma
coisa marcada para apagar. Fica em `contacto.ts`, sozinho.

**Onde está agora:** `web/src/lib/contacto.ts` — e é o único sítio. O `Feedback.svelte`, o
`/privacidade` (dois `mailto:`) e o `/mais` importam-no de lá.

**Eu tinha escrito aqui que o endereço antigo precisava de reencaminhamento** por causa das
versões da app em cache nos telemóveis. O Pedro contestou e tinha razão: o antigo é o Gmail
pessoal dele, não vai a lado nenhum, e continua a receber sozinho. Aquele cuidado aplica-se
a *desactivar* um endereço, não a mudar o que a app mostra — e eu escrevi-o sem distinguir
os dois casos.

**O que fica a valer:** o email que saiu à APL a 01/10 ia assinado com o endereço pessoal, e
é para lá que eles respondem se responderem. O rascunho em [06](06-email-apl.md) já traz o
novo, para uma eventual insistência.

> ~~Conta Play Console, keystore, ficha de loja, releases faseadas~~ — **tudo isto desapareceu.**
> A Fase 7 passou de ~2 dias para ~1, e sem custo monetário.

---

## Fase 8 — Futuro

| ID | Item | Nota |
|---|---|---|
| F8.1 | Live scores (refresh ~1 min) | ✅ **validado a 02/10** — a fonte actualiza durante o jogo, latência < 3 min (a nossa resolução). Ver [08](08-sonda-resultado.md) |
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
| Entrar com conta Google | ❌ **retirado a 03/10** — a pedido de quem o pediu, e com razão: a informação é pública e o login só dava sincronizar favoritos. Substituído pelo W5.26 | — |
| Escolher equipas favoritas | W4.1, W4.3 (clube **e** escalão), W4.4, W4.6 | 4 |
| Quadro com golos gerais | B1.19–B1.21, W3.8–W3.10 | 1 + 3 |
| Informação das fichas de jogo | B1.9–B1.9d, W3.6–W3.6d | 1 + 3 |
| Calendário de cada clube e do meu clube | W4.7, W4.8, W4.5 | 4 |
| Notificações de alterações, com confirmação | B5.1–B5.3, B5.8, W5.9–W5.11 — **muda de forma**, ver Decisão 4 | 5 |
| Adicionar ao calendário jogos de um clube/escalão | ✅ **feito a 02/10** — B4.11 + W4.12 (feed ICS) | 4 |

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
| W8.4 | Nomes de equipa clicáveis também na agenda, no calendário e no detalhe de jogo | should | M | 🟡 **feito no detalhe de jogo; impossível nos outros dois**. Na agenda e no calendário a linha inteira já é um link para o jogo, e um `<a>` dentro de outro `<a>` é HTML inválido — além de tornar o toque ambíguo num telemóvel. A hierarquia fica: linha → jogo → equipa |
| W8.5 | Agrupar o plantel por posição (GR/JC) | could | M | ❌ **impossível, verificado a 03/10** — a posição (GR/JC) **não existe no boletim**: zero ocorrências de GR, JC ou "guarda-redes" no bloco. A coluna `5I` é o cinco inicial (`X` titular, `J` suplente), que já temos. O backlog assumia que o B1.9c desbloqueava isto; não desbloqueia, porque a fonte não publica a posição em lado nenhum |
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
| W7.7 | Classificação: reduzir de 5 para **3 colunas** (J, DG, P) | could | XS | ❌ **anulado a 02/10** — o pedido foi o contrário: mais colunas, não menos (GM, GS, A, e a vista Completa com V/E/D e rácio). Ver W6.2 |
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
| W6.2 | Classificação sem scroll horizontal | should | M | ✅ **fechado a 02/10** com `Simples · Completa`. Simples = #, equipa, J, GM, GS, DG, A, P (cabe a 375px); Completa acrescenta V/E/D e o rácio, e rola com o lugar e o nome fixos |
| W6.2b | `TabelaClassificacao.svelte` — uma tabela só para as duas páginas | should | S | ✅ a de equipa e a de competição tinham-se separado e já divergiam em colunas, em links e no encosto |
| W6.2c | **Regressão corrigida**: nomes de equipa outra vez clicáveis na classificação da competição | must | XS | ✅ o W8.3 estava marcado feito mas perdeu-se num refactor — o `caminhoEquipa` ficou importado e por usar, sem erro nenhum |
| W6.2d | **Defeito corrigido**: coluna fixa do nome assentava por cima da dos jogos | must | XS | ✅ eram duas medidas independentes (`1.4rem` de largura, `1.7rem` de encosto) e a coluna media 17px: 11px de sobreposição. Agora saem da mesma variável |
| W6.3 | Secções colapsáveis com contador | should | M | ✅ sábado 3/10 com 41 jogos abre em 6 secções fechadas, tudo num ecrã |
| W6.4 | Seguir uma **competição** inteira, com notificações próprias | could | M | Seguir o regional de sub-15 traz todos os jogos do escalão |
| W6.5 | Seguir um **jogo** individual | could | S | Estrela em cada linha de jogo |
| W6.6 | Selector de temporada no cabeçalho da competição | could | S | Passar para 2025/26 na própria página |
| W6.7 | Destino Mais | should | M | ✅ `/mais` com dados, fonte, aviso de não-oficial e contacto para remoção de nome |
| W6.8 | Interruptor `Todas as séries · Só a minha` | should | M | ✅ aparece quando se segue uma equipa do grupo; nunca funde tabelas |
| W6.9 | **Legenda** das cores e marcadores da classificação | should | XS | ✅ legenda das colunas em `<details>`, nas duas páginas de classificação. O `title` de um `<abbr>` **não serve de nada num telemóvel**: só aparece ao passar o rato, e num telefone não há rato. Dez abreviaturas com a explicação escondida atrás de um gesto que não existe. **Reportado pelo utilizador**: "tem colunas que eu não entendo" |
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
| B9.2 | **`ronda`** — uma linha por execução do scraper, com contagens por tabela | must | S | ✅ `scraper/src/hoquei/rondas.py` — 10 contagens por ronda em `data-samples/rondas/<tenant>.jsonl`, **fora** de `web/static/v1`: lá dentro, uma linha nova por ronda fazia a Action publicar de 2 em 2 horas para sempre. Só grava quando os números mudam |
| B9.3 | Carregar a BD a partir do que o scraper já produz, sem tocar nos parsers | must | M | os parsers estão testados e não se mexem; isto é uma camada de persistência |
| B9.4 | **Escrita versionada**: cada ronda insere, não substitui, com `visto_em`/`valido_ate` | must | M | é a decisão que cria o histórico. Sem ela, uma BD é um JSON mais caro |
| B9.5 | Gerar o JSON de `/v1/` **a partir da BD** | must | M | mantém o contrato e a PWA inalterados |
| B9.6 | **Guarda de qualidade**: a ronda falha se as contagens caírem acima de um limiar | must | S | ✅ a ronda sai com **código 2** se uma contagem cair >5%, e os passos de comitar e publicar não correm. Verificado a simular a avaria de Setembro: `jogos: 4800 → 801 (83% a menos)` e saída 2. Válvula `--sem-guarda` para quando a queda é real |
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
| B9.14 | Publicar classificação calculada para ESCOLARES e BENJAMINS | should | S | ✅ **feito a 07/10/2026.** 8 séries, 43 equipas, **43 linhas** de tabela. Decisão do dono, com o travão acima à frente e **sem** resposta da APL ao email de 01/10. Os **Torneios Particulares** e as Supertaças ficaram de fora, contra a formulação original deste item: são jogos-treino e eliminatórias, e ali uma tabela punha o vencedor de uma meia-final à frente do vencedor da final — ver `vale_calcular` |
| B9.15 | Rótulo "calculada por nós, não oficial" nessas tabelas | must | XS | ✅ **feito a 07/10/2026**, num componente só (`RotuloCalculada.svelte`) usado nos três ecrãs que mostram tabelas: competição, equipa e ficha de jogo. Três cópias do texto divergiam na primeira vez que uma mudasse |
| B9.16 | Ronda de **fecho do dia** às 00:30, que sela o dia e recalcula | must | S | o `cron` actual de 2h fica para frescura |
| B9.17 | Ronda **ao vivo** sobre os jogos a decorrer, sem saber favoritos | could | M | ✅ **feito e validado em jogo real a 03/10** — `cli aovivo`. Parte da agenda publicada, escolhe só os jogos a decorrer e vai buscar esses: 12 jogos = 12 pedidos, ronda completa em ~15 s. Mede-se com o utilizador na bancada: ~20 s da mesa + ~15 s nossos, **menos de um minuto de ponta a ponta** |
| B9.18 | **Normalizar grafias de clube** | should | S | a fonte tem `A STRUART HCM` vs `A STUART HCM` e `HC LOURINHA` vs `HC LOURINHÃ`. É literalmente a "limpeza" do pedido, e hoje parte emblemas e junções por nome |
| W3.6e | **Correcção**: marcadores com chave duplicada deixavam a página em branco | must | XS | ✅ dois golos do mesmo jogador no mesmo minuto davam a mesma chave no `{#each}`, o Svelte lançava e o ecrã do jogo **não renderizava de todo**. Apareceu ao republicar com dados novos |
| W9.20 | **Secção "A decorrer agora"** no topo, com marca pulsante e o escalão | must | S | ✅ todos os escalões de uma vez, ignorando o dia da fita. A marca `ao_vivo` só vale dentro de 3h da hora do jogo, para expirar sozinha se a ronda parar |
| W9.21 | Escalão nas listas que misturam escalões | should | XS | ✅ "a decorrer" e "as minhas equipas" misturam escalões e sem isto não se sabe se o 11-5 é de benjamins ou de seniores. **Reportado pelo utilizador no jogo** |
| Q9.27 | **Ficha: a coluna do número tapava a dos golos** | must | S | ✅ reportado em iPhone **e** Android. Numa tabela, `width` é uma sugestão: a coluna do número renderizava 38px numa equipa e 29px noutra, consoante as camisolas tivessem um ou dois dígitos, e o nome continuava pregado a 2,4rem — tapava 9px. **Terceira vez que esta classe de bug aparece**, por isso levou um teste ao código: um encosto de coluna fixa é `0` ou vem de variável, nunca um número solto |
| Q9.26 | **iPhone: a app aparecia cortada à direita** | must | S | ✅ não era overflow — o Safari do iPhone **amplia a página inteira** quando se foca um campo com letra abaixo de 16px. Medi larguras durante dez minutos antes de perceber que o conteúdo cabia. Todos os campos a 16px, mais um teste ao código que falha se algum descer. **Reportado com o primeiro screenshot de iPhone do projecto** |
| Q9.22 | **Cache: duas camadas desenhadas para um mundo sem live scores** | must | S | ✅ o CDN tinha 5 min de `max-age` e o service worker servia `StaleWhileRevalidate` — o utilizador ficava **sempre um recarregamento atrasado**. Agora 20 s no CDN, e `NetworkFirst` com 3 s de espera no que muda durante um jogo |
| B9.23 | A ronda ao vivo refresca também a **classificação** das provas que tocou | must | XS | ✅ sem isto o ficheiro da competição dizia duas coisas: jogos com resultado e uma tabela que não os contava. **Apanhado pelo B9.13** |
| B9.24 | A ronda ao vivo como **GitHub Action** | must | M | ✅ **validada em jogo real a 04/10**: a Action construiu a app, sondou e publicou `CRIAR-T GD 1-0` sem ninguém tocar nos dados. Mas o cron **não disparou à hora** — às 09:03 UTC a corrida das 09:00 ainda não existia, e tive de a lançar à mão. As janelas passaram a começar **meia hora antes** do primeiro jogo, porque o agendador da GitHub atrasa-se (18 min medidos na sonda) |
| W9.25 | A app refrescar-se sozinha enquanto há jogos a decorrer | should | M | ✅ `AutoRefrescar.svelte`. 30 s com jogo a decorrer, 5 min em dia de jogos, e **nada com o ecrã apagado** — um telemóvel no bolso a pedir dados de 30 em 30 s gasta bateria para nada, e numa bancada a bateria é o recurso escasso. Actualiza logo ao voltar à app |
| B9.25 | **Convocados antes do jogo** | should | M | ❌ **a fonte não os publica antes.** Medido a 04/10: das 6 fichas de jogos "sem começar" que fui ver, **todas** tinham zero jogadores — e a única com plantel era a do jogo a decorrer. A mesa só lança a convocatória à hora do jogo. Ir buscar 16 fichas por corrida para publicar ficheiros vazios era desperdício |
| B9.26 | A ronda ao vivo começa a seguir um jogo **25 min antes** da hora marcada | should | XS | ✅ é a única janela em que a convocatória pode existir, e usa a máquina que já está a correr em vez de pedidos novos. A app já sabe mostrar "Convocados" em vez de "Ficha" e esconder as colunas a zero |
| B9.19 | **Impressão estrutural por ronda**: nº de colunas por tipo de tabela, com aviso quando muda | should | S | ideia emprestada do Scrapling (ver [07](07-avaliacao-scrapling.md)), sem a dependência nem a relocalização silenciosa |
| Q4.7 | **A sonda pára quando já não há nada a observar** | must | XS | ✅ corria as 4 horas inteiras depois do apito final — ~57 pedidos inúteis a um servidor pequeno de uma federação, contra a nossa própria postura, e o diário só era comitado no fim. Agora sai `--apos-fim` rondas (5) depois de todos os jogos terminarem, e essas rondas medem quanto tempo o boletim ainda mexe |

### Firebase e GCP — avaliado a 06/10/2026, a pedido do dono

Um colega recomendou-lhe o Firebase, com o argumento de que "tem serviços capazes de ser mais
fidedignos". Avaliado com números, porque é com eles que a resposta muda.

**O alojamento não é o elo fraco, e trocá-lo não corrige nada do que nos falhou.** O que falha
neste projecto está registado: o agendador da GitHub — medido a 04/10/2026, das 8 corridas
previstas saíram 2, e é por isso que existe o `worker/relogio/` —, uma avaria declarada da
Actions, e defeitos nossos (o ciclo ao vivo a escrever dados de arranque por cima de
resultados, o `stale-while-revalidate` a servir uma lista de dez minutos, a corrida de
`git push` do P11.12). O Cloudflare Pages não tem um incidente registado.

**Os números da transferência, medidos a 06/10/2026:**

| | |
|---|---|
| `agenda.json` | 290 KB, **15,9 KB** com gzip |
| uma carga fria da app | **5,3 MB** (113 entradas no precache) |
| uma ronda ao vivo, por cliente aberto | agenda + meta a cada 30 s ≈ **1,9 MB/hora** |

O Firebase Hosting no plano Spark dá 10 GB de armazenamento e **360 MB/dia** de transferência:
~68 cargas frias por dia, ou ~22 horas-cliente de ciclo ao vivo. Uma jornada de sábado com 20
telemóveis abertos duas horas gasta 76 MB só no *polling*, mais quem entra pela primeira vez.
O plano gratuito estoura numa tarde de muitos jogos — exactamente à hora que interessa — e a
saída é o Blaze, com cartão e preço por GB. O Pages gratuito não tem tecto de tráfego nem de
pedidos, e o custo desta app é largura de banda em picos curtos.

**Onde o Google ganha de verdade, e não é o alojamento:**

1. **O raspador num agendador com compromisso de serviço.** O Cloud Run corre o contentor
   Python como ele está — sem porte — e dá 240 000 vCPU-s/mês grátis; a raspagem leva ~90–120 s
   e corre 12 vezes/dia no pior caso, ~43 000 vCPU-s/mês. O Cloud Scheduler dá 3 tarefas
   grátis por conta de facturação e precisávamos de 2. Isto troca o cron que mede 2 em 8 por um
   com SLA, e é o único ganho de fiabilidade real da proposta.
2. **A base de dados desta fase.** O Firestore é candidato ao lado do SQLite em ficheiro e do
   D1 — a decidir com os números daqui, não por afinidade.

**O que não precisa do Firebase:** as notificações da Fase 5. O Web Push com chaves VAPID
funciona no Chrome/Android e no iOS 16.4+ para apps instaladas no ecrã principal, e um Worker
envia-as. O FCM é *uma* forma de o fazer, não a única.

**Dois travões antes de decidir:**

- **O SDK do Firebase no cliente quebra a `/privacidade`.** A página promete zero cookies, zero
  rastreio e zero código de terceiros, e foi escrita a partir de uma auditoria ao código. Pôr o
  Firestore ou o Analytics a falar do telemóvel de quem usa para a Google deixa-a falsa no
  mesmo instante. Se formos por aí, o Firebase fica do lado do servidor, no nosso código.
- **Mudar de origem apaga os favoritos de todos.** O `localStorage` e o *service worker* são por
  origem. De `hoquei.pages.dev` para um `*.web.app`, quem já instalou fica preso à origem
  antiga e quem migrar à mão encontra o ecrã de escolha vazio.

**Daí sai a recomendação, e ela não é sobre o Firebase: pôr um domínio próprio à frente disto,
agora**, enquanto a app tem cinco utilizadores e não quinhentos. Custa 10 a 15 € por ano e
transforma a escolha de alojamento numa mudança de DNS em vez de uma porta de sentido único.
Sem ele, cada mudança custa os favoritos de todas as pessoas.

| ID | Item | Prio | Est. | Nota |
|---|---|---|---|---|
| B9.27 | Domínio próprio apontado ao Pages, antes de haver utilizadores a perder | **must** | XS | **Adiado por decisão do dono a 06/10/2026.** A preparação que não depende do nome está feita (`aac29bd`): o endereço vive em `web/src/lib/sitio.ts` e o `DOMINIO_UID` dos calendários foi separado e preso por um teste. Falta comprar o domínio e apontá-lo, e isso é dele. **O custo de esperar cresce**: o `localStorage` é por origem, logo cada pessoa que instale a app até lá perde as equipas que escolheu no dia em que a origem mudar — hoje são um ou dois telemóveis |
| B9.28 | Decidir a BD desta fase com números: SQLite em ficheiro vs D1 vs Firestore | should | S | |
| B9.29 | Avaliar Cloud Run + Cloud Scheduler para o raspador, contra o cron da GitHub | should | M | |
| B9.30 | Ponte dos favoritos entre origens, pelo fragmento do endereço | could | S | **Recusado a 06/10/2026**, e com razão: com dois telemóveis instalados, escolher as equipas outra vez leva 20 segundos e isto era código a manter para sempre. Fica escrito porque a ideia tem uma propriedade que não é óbvia — o fragmento (`#…`) nunca é enviado ao servidor, logo os favoritos passariam de origem para origem sem passar por lado nenhum, e a `/privacidade` continuava verdade |

Nota sobre credenciais: a "API key" do Firebase para web é **pública por desenho** — vai dentro
do pacote que o browser descarrega e não protege nada; quem protege são as regras de segurança.
O que faria falta era uma conta de serviço para a CI, e essa fica como segredo do dono, ao lado
do token da GitHub: não passa pelo repositório nem por um agente.

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
| HTML da fonte muda e o parser quebra | Alto | Parser no backend, testes com amostras, alerta automático (B1.11, B1.17). **Avaliado e rejeitado o Scrapling para isto** — as duas avarias que tivemos de facto não seriam evitadas pelo *adaptive tracking*; ver [07](07-avaliacao-scrapling.md) |
| Federação pede para parar | Alto | Contacto antecipado (L7.1), atribuição visível, scraping educado |
| Logótipos de clubes | Médio | Não usar sem autorização; iniciais na v1 |
| Dados de menores nas fichas de formação | **Alto** | Sem estatística individual abaixo de sub-17 (B1.21) |
| **Push no iPhone exige instalação manual** | **Médio** | W5.13/W5.14: explicar, e não oferecer o que não funciona |
| **Web Push obriga a guardar subscrições** | Médio | Isolado na Fase 5; tudo antes disso é estático |
| Utilizadores não perceberem que se instala | Médio | Convite a instalar em bom momento, e instruções próprias para iOS |
| **Desenhar para a plataforma errada** | Médio | O W4.12 saiu com um botão que não funciona no Android — o sistema mais usado pelos utilizadores-alvo — porque foi pensado a partir do que o `webcal:` faz no Mac. Antes de dar por feito algo que depende do sistema operativo, verificar em qual deles corre quem vai usar |
| Âmbito a crescer antes da v1 | Alto | Fase 8 existe para isso |
| Crawl das fichas a crescer | Médio | Crawl incremental obrigatório (B1.19) |
| ~~Mudança silenciosa na fonte: o parser não falha, só devolve menos~~ | ~~Alto~~ | ✅ **mitigado a 03/10** pelo B9.2 + B9.6: a ronda compara-se com a anterior e falha se uma contagem cair >5%. Era o risco mais provável do projecto e o único que já se tinha concretizado |
| **Escrever por cima a cada ronda: não há passado** | Médio | Fase 9 (B9.4). Sem histórico não há notificações nem auditoria |

---

## Adopção do padrão Agentic Project — e o que dela ficou (05/10/2026)

A skill `create-agentic-project` foi aplicada a 05/10 e **o vault foi abandonado no mesmo
dia**, por decisão do dono. Ficou só o que pagava: um `AGENTS.md` canónico no topo do
repositório e um `CLAUDE.md` que aponta para ele.

Era o que faltava mesmo. Até aqui cada sessão começava com o agente a redescobrir as
convenções deste projecto a partir do código e dos dez documentos — e algumas delas não são
adivinháveis: que a app não faz *scraping* nunca, que um `git push` não publica, que há dois
publicadores durante uma janela de jogos.

### Porque é que o vault foi abandonado

O andaime criou um `hoqueiapp-vault/` com `00 - Meta` a `06 - Archive` — vazio — ao lado de
um `docs/` com dez documentos e um backlog de 723 linhas. E uma pasta `hoqueiapp-source-code/`
vazia ao lado do `scraper/`, do `web/`, do `scripts/` e do `worker/`, que é onde o código
está de facto.

Migrar o `docs/` para dentro do vault parte todas as referências `docs/NN-...` que vivem
**dentro dos comentários do código**, e essas referências são metade do valor delas: é assim
que se chega ao raciocínio a partir do sítio onde ele importa. Manter os dois era pior: um
vault vazio ao lado de um `docs/` cheio faz o próximo agente concluir que este projecto não
tem conhecimento registado.

Ficou o bloco gerido no `.gitignore` (`.secrets/`, `.scratch/`, `.tmp/`, ficheiros de
ambiente, *virtualenvs*), que é útil independentemente do padrão.

| ID | Item | Estado |
|---|---|---|
| P10.1 | Decidir entre migrar o `docs/` ou abandonar o vault | ✅ **abandonar**, 05/10/2026 |
| P10.2 | Apagar `hoqueiapp-vault/` e `hoqueiapp-source-code/` | ✅ feito. Nunca foram commitados |
| P10.3 | Os ponteiros do `AGENTS.md` para a suite central em `../../AgenticSuite/` só resolvem na máquina do dono, e este repositório é **público** | aberto, XS |

### Cinco regras do andaime que foram substituídas, e porquê

O `AGENTS.md` gerado trazia cinco regras que contradizem este projecto. Ficam aqui, porque é
o único registo que sobrevive ao vault:

| Regra gerada | Porque foi substituída |
|---|---|
| "be extremely concise and sacrifice grammar for the sake of concision" | O dono pede raciocínio e evidência, e várias vezes esteve certo contra a primeira conclusão do agente. Cortar o porquê destrói o valor. **Em reavaliação a 05/10** — ver nota abaixo |
| "Use EN-GB for project knowledge" | O projecto é todo em português de propósito: código, comentários, dez documentos, mensagens de commit |
| "Engineered source lives under `hoqueiapp-source-code/`" | Falso. O código está em `scraper/`, `web/`, `scripts/`, `worker/` |
| "Never use the em dash or en dash" | Incompatível, e verificado: 113 travessões só neste ficheiro, e o traço de meia risca é o traço dos resultados na interface (`1 – 0`), em quatro componentes |
| "Workspace global rules in `../../AGENTS.md`" | Não existe. Esta máquina não tem workspace Agentic OS: sem `projects.yml`, sem `WORKSPACE.md` |

**Uma delas a ferramenta desfaz sozinha.** Correr o andaime outra vez repõe a regra de
reporte — está verificado, não suposto: o `--dry-run` de confirmação diz
`AGENTS.md [append reporting rule]`. Quem voltar a correr a skill tem de a tirar outra vez,
ou de decidir que a quer.

---

## Pedidos de 08/10/2026 — à noite

| ID | Item | Prio | Est. | Nota |
|---|---|---|---|---|
| P12.1 | Filtro "só o que está a decorrer" em Competições | **must** | S | Medido a 08/10: das **20 entradas do menu, 9 já acabaram** — quase metade é lixo para quem procura o escalão do filho. Ver abaixo |
| P12.2 | Os crachás de escalão no menu Competições | should | S | ✅ **feito a 09/10/2026**, no mesmo commit do P12.1: os cabeçalhos de escalão levam o crachá a 14 px. Os 11 SVG estavam em `web/static/escaloes/` desde 05/10 sem uso fora da ficha de jogo |
| P12.3 | Transmissões dos clubes no YouTube, dentro da app | could | M | **Esbarra na política de privacidade.** Ver abaixo |

### P12.1 — metade do menu é passado · ✅ feito a 09/10/2026

**Como ficou:** por omissão só as provas a decorrer, com um interruptor que diz quantas estão
escondidas — "mostrar também as 9 que já acabaram" — e cada linha terminada com a palavra
`TERMINADA` ao lado. A lógica vive em `web/src/lib/provas.ts`, ao lado do `provaActual`, com
oito testes; o componente só desenha.

Três coisas que valeram a pena pensar:

* **um grupo está vivo se qualquer série sua estiver viva.** Uma prova a três séries em que
  duas acabaram ainda está a decorrer, e marcá-la como terminada escondia a série que joga;
* **o filtro desliga-se sozinho se nada estiver a decorrer** — fim de época, ou uma agenda que
  não se leu. Um menu filtrado ficaria vazio, e um ecrã vazio não é uma resposta;
* **o `agruparProvas` nunca devolve menos do que recebeu.** Devolve tudo, marcado, e diz
  quantas acabaram. É quem desenha que esconde, e com o número na mão para escrever no
  interruptor. O teste que fixa isto tem o erro de 06/10 escrito por dentro.

Verificado a 375×812 nos dois temas, com os dados reais: 11 entradas com o filtro, 20 sem ele,
e as 9 terminadas são exactamente as que estavam medidas em baixo.

Medido a 08/10/2026: o menu tem 20 entradas e **9 não têm um único jogo por disputar**.

```
SUB-13   SUPERTAÇA APL SUB-13        SUB-17   SUPERTAÇA APL SUB-17
SUB-13   TORNEIO ABERTURA APL        SUB-17   TORNEIO ABERTURA APL
SUB-15   SUPERTAÇA APL SUB-15        SUB-19   SUPERTAÇA APL SUB-19
SUB-15   TORNEIO ABERTURA APL        SUB-19   TORNEIO ABERTURA APL
TORNEIOS PARTICULARES  ZECA PINTO
```

São as Supertaças e os torneios de abertura de setembro. Quem entra à procura do escalão do
filho tem de os saltar todos.

**A função já existe:** `competicoesVivas()` em `web/src/lib/clubes.ts` decide isto sem pedido
nenhum — uma prova está viva enquanto tiver jogos por disputar.

**E há uma lição de 06/10 a respeitar aqui.** No ecrã de escolha de equipas eu escondi os
escalões sem prova a decorrer e o dono apanhou-me: o HC SINTRA só joga Taças já terminadas, e
as duas equipas seniores desapareciam. **Esconder não é filtrar.** Aqui o mesmo risco existe
ao contrário — quem queira ver a classificação final da Supertaça tem direito a chegar lá. O
desenho certo é o que já fizemos no painel do clube: **por omissão mostra o que está a
decorrer, com um interruptor para ver tudo**, e cada linha diz se a prova acabou.

### P12.3 — transmissões dos clubes, e o travão que elas trazem

Há clubes com câmaras a transmitir para o YouTube. A ideia é perguntar-lhes se aceitam que o
jogo apareça na app — e é boa: é a diferença entre "o resultado vai em 3-1" e ver o jogo.

**Mas um `iframe` do YouTube é código de terceiros a correr no telemóvel de quem usa.** A
`/privacidade` promete hoje que não carregamos código de fora, e o `youtube-nocookie` reduz
mas não elimina — continua a ser uma ligação à Google feita pelo nosso ecrã. Três caminhos,
por ordem do que custam à promessa:

1. **Link para fora.** Um botão "ver em direto no YouTube" que abre o browser. Custo à
   promessa: zero — é o mesmo que já fazemos com a plataforma da associação. Perde-se o jogo
   dentro da app.
2. **Embeber só depois de um toque.** Nada da Google carrega até a pessoa carregar em "ver".
   A página de privacidade passa a dizê-lo, e quem não carregar não é exposto a nada.
3. **Embeber sempre.** Mais confortável, e torna falsa a frase que está escrita na página.

A recomendação é a 2, que é o padrão do "facade" — uma imagem nossa com um botão, e o
`iframe` só nasce ao toque.

**O que isto precisa, além da decisão:** um campo por jogo no contrato `/v1` com o endereço da
transmissão — acrescentar um campo é seguro —, e os clubes a dar os endereços. Essa parte é
humana e é do dono.

## O email do aviso não chegava: três causas seguidas (09/10/2026)

O token entrou, e o `GET /verificar-aviso` provou o que tinha de provar: **HTTP 201** a abrir
a issue e **HTTP 200** a fechá-la. O token escreve nas issues.

**O que eu disse a seguir estava errado:** disse ao dono que devia ter o email na caixa. Fui
confirmar quem é o autor da issue:

```
GET /repos/pmontezinho17/HoqueiApp/issues/1  →  autor: pmontezinho17
```

O token é pessoal, logo a issue é aberta **pelo próprio dono**. E a GitHub não notifica
ninguém das suas próprias acções. Ou seja: toda a cadeia funciona excepto a última perna, que
é a única que ele vê. Um aviso que chega a um sítio onde ninguém olha não é um aviso.

Isto não se apanha a ler o código — o código faz um `POST /issues` e recebe 201, que é
sucesso. Apanha-se a perguntar quem é o autor.

### As saídas, e qual recomendo

| | como | custo |
|---|---|---|
| **1. a issue é aberta pelo robô das Actions** | o observador dispara um workflow — máquina que o relógio já usa — e o workflow abre a issue com o `GITHUB_TOKEN` embutido, cujo actor é o `github-actions[bot]`. Outro actor, logo há notificação | um workflow novo, ~20 s de atraso no aviso |
| **2. email directo de um serviço de envio** | uma chave de API num segredo, e o Worker manda o email ele próprio | um terceiro no caminho, e o aviso deixa de passar por um canal que já é lido |
| **3. Cloudflare Email Routing** | — | não serve: exige um domínio na conta, e o domínio próprio está adiado (B9.27) |

**Feita a 1**, a pedido do dono, no mesmo dia. O `.github/workflows/aviso.yml` abre, comenta e
fecha; o observador compõe o texto e despacha. A divisão é deliberada: o texto fica onde está o
diagnóstico, a entrega fica onde há um actor que notifica.

### E mesmo assim não chegou. A segunda causa.

Com o `github-actions[bot]` por autor, o email continuou a não aparecer. Medido antes de
afirmar seja o que for, desta vez:

```
GET /repos/pmontezinho17/HoqueiApp/subscription  →  404
GET /repos/pmontezinho17/HoqueiApp               →  subscribers_count: 0
```

**O dono não segue o próprio repositório.** Sem subscrição não se gera notificação nenhuma —
nem email nem sininho. A primeira correcção era necessária e não era suficiente: tirou o
obstáculo de "são as tuas próprias acções" e deixou intacto o de "não segues isto".

A saída **não** foi pedir-lhe que carregasse em *Watch*. Uma definição dessas ninguém a relê, e
desaparece um dia sem avisar — que é precisamente o modo de falha que se está a fechar. A issue
passou a ser-lhe **atribuída**, e uma atribuição notifica sempre, siga-se ou não o repositório.
Fica no código, que é um sítio onde se vê.

**Confirmado por ele a 09/10/2026:** o email da issue #4 chegou. A cadeia está fechada de ponta
a ponta e é repetível com `curl .../verificar-aviso` — nomeadamente a cada rotação do token.

### O que isto ensina, e é maior do que o aviso

Foram **três** modos de falha seguidos, todos silenciosos, todos a devolverem sucesso: faltava
o segredo; a issue nascia com o autor errado; o repositório não era seguido. Nenhum deles se
apanha a ler o código — o `POST` devolve 201 e o despacho devolve 204 em todos os três.

É por isso que o `/verificar-aviso` ficou como rota permanente e percorre o caminho real em vez
de o imitar. **Um aviso que não se consegue experimentar não é um aviso, é uma intenção.**

O aviso dentro da app — que o dono também pediu — é outro item e é maior: precisa de
subscrições guardadas, o que é o B5.5.

## As medições saíram do KV para o D1 (09/10/2026)

A Cloudflare mandou um aviso de **50% do limite diário de escritas** do KV. O dono perguntou
se o D1 resolvia, e se o problema eram as leituras da ficha de jogo no site da APL.

**Não eram, e as duas contas confundem-se com facilidade.** São números de coisas diferentes:

| | 08/10/2026 | o que é |
|---|---|---|
| pedidos ao servidor da APL | 468 | feitos pelo raspador, numa máquina da GitHub |
| escritas no KV da Cloudflare | ~950 | feitas pelo observador e pelos contadores do site |

O aviso era sobre a segunda linha. O limite é **1 000 escritas por dia** no plano gratuito, e
uma noite de quatro jogos gastou ~800 só no observador — que escrevia o registo do dia e o
estado **a cada minuto**, cada escrita a reescrever o objecto inteiro. Sábado tem 36 jogos das
10:00 às 21:00 e pedia ~1 560. Rebentava a meio da tarde.

### Porque é que D1 e não um plano pago

O D1 dá **100 000 linhas escritas por dia** — cem vezes a margem —, mas o número não é a razão
principal. São duas outras:

1. **Isto são tabelas.** Um registo de observações tem hora, jogo, antes e depois; um contador
   por dia e por ecrã é uma linha com um número. Num chave-valor, somar um obrigava a
   **ler-somar-escrever, que não é atómico**, e já nos custou uma contagem — medido a 06/10,
   três pedidos deram dois. Em SQL é `ON CONFLICT (dia, ecra) DO UPDATE SET n = n + 1`, e o
   SQLite resolve a corrida sozinho.
2. **O KV tem um tecto que o plano pago não levanta:** uma escrita por segundo na mesma chave.
   Num sábado com trinta pessoas a abrir a app ao mesmo tempo, perder contas era o desenho.

### O que ficou

`dados/esquema.sql`, com o raciocínio todo dentro, e cinco tabelas: `observacao` (append-only,
uma linha por acontecimento), `visita` (dia + ecrã), `aparelho` (dia), `pedido_fonte` (dia +
hora + tipo) e `estado` (um registo só, para a consola saber "agora" sem varrer nada).

Do lado do código, três mudanças que valem mais do que a troca de armazém:

* **o estado deixou de ser reescrito a cada minuto.** Os pedidos por hora eram um objecto de
  baldes acumulado dentro do estado; agora são uma linha por hora e por tipo, somada com
  `ON CONFLICT`. A função pura que restava — `deltas` — só calcula o que cresceu, e tem 5
  asserções;
* **a consola faz duas consultas onde fazia 30 leituras.** O `entradas` pedia 3 chaves × 7
  dias + 9 ecrãs; agora é `WHERE dia IN (…)`, duas idas, independentemente de quantos dias se
  peçam. Isto mata de raiz o `Error 1102` que apanhámos a 08/10 — ver a secção seguinte;
* **os pedidos à fonte caem na hora da ronda e não na hora em que reparámos neles.** O balde
  vinha da hora da observação, e por isso numa sexta-feira os 80 pedidos da ronda das 00:30
  apareciam às 17h, que é quando o `cron` acorda nos dias úteis. Agora o balde vem do
  `generated_at` do `meta.json`, que diz quando a ronda publicou.

**Retenção:** o D1 não tem expiração e o KV tinha. Quem limpa é o observador, na primeira
leitura de cada dia novo — `DELETE FROM observacao WHERE dia < date(?, '-90 days')`, um comando
por dia em vez de um a cada uma das ~1 400 invocações. As outras tabelas não se apagam: são uma
linha por dia e são o histórico que se quer ver crescer.

**O que foi migrado à mão:** as 20 chaves de contagens dos dias 07, 08 e 09/10, os 415 eventos
da noite de 08/10, os baldes de pedidos dessa noite e o último estado. Conferido depois:
`/api?dia=2026-10-08` devolve os mesmos 415 eventos, 141 publicações, mediana de 60 s, zero
buracos e 5 intervalos longos sem jogos — os mesmos números que o KV dava.

### O `GITHUB_TOKEN` que falta custa mais do que se pensava

Que o observador não tem o segredo já estava escrito no `README` dele, e a consequência
conhecida era uma: **o aviso nunca disparou**. O registo de 08/10 tem, literalmente, `aviso
não enviado` — `sem token`. A cadeia que o dono pediu (issue na GitHub → email) está
construída e testada e nunca correu.

**O que é novo é a segunda consequência, medida a 09/10:** o painel "a cadeia" da consola
responde `HTTP 403`. O comentário do código dizia "o repositório é público, logo não precisa
de token", e da minha máquina é verdade — a partir do Worker não é. A GitHub dá 60 pedidos por
hora e **por IP** sem autenticação, e os IPs de saída da Cloudflare são partilhados por muita
gente, logo o balde já vem gasto. Com token são 5 000 por hora e a conta é nossa.

Ou seja: num sábado de 36 jogos, nem o aviso chega nem o painel das corridas se lê. Um só
comando resolve os dois, e é do dono, que é quem tem o token:

```
cd worker/observador && npx wrangler secret put GITHUB_TOKEN
```

Enquanto não existir, a consola di-lo em vez de dizer só "não foi possível".

## O aviso de actualização aparecia por nada: o build não era determinista (10/10/2026)

O dono: *"cada vez que é feito um deploy em produção, aparece sempre a tal notificação a dizer
que há uma atualização. Até eu mesmo sinto-me saturado"*. E uma hipótese dele: que fosse por a
consola viver no mesmo endereço da app.

**A hipótese estava errada e o problema era maior.** Medido:

```
duas construções do MESMO código, sem uma linha de diferença
  → 17 revisões diferentes no manifesto do service worker
```

Uma revisão diferente é exactamente o que faz aparecer o aviso. Logo **cada publicação
avisava toda a gente, qualquer que fosse a alteração** — incluindo as que só tocavam no
raspador ou num workflow.

**A causa:** o SvelteKit injecta uma `version` no pacote do cliente e, por omissão, essa versão
é `Date.now()`. Com ela fixa, duas construções do mesmo código são **iguais byte a byte** —
verificado.

**E a hipótese dele, medida com a interferência removida:** uma alteração só na consola muda
**zero** entradas do manifesto. A consola nunca entrou no pacote do cliente — ela é compilada
para dentro da Pages Function e mais nada. Não é preciso mudá-la de endereço.

### O que se construiu em cima disso

* **`web/src/lib/versao.ts`** — a versão em maior.menor, a lista do que mudou, e a regra
  escrita: maior quando muda a forma de usar a app, menor para correcções, **e nada quando a
  publicação não toca no que o utilizador vê**. É essa última que impede o aviso de voltar a
  aparecer por nada;
* a versão **visível no menu do ⋮**, em letra pequena e sem rótulo — quem a procura sabe o que
  é, quem não a procura não precisa de saber que existe;
* a **nota do "o que mudou"**, uma vez por versão. Nunca a quem abre a app pela primeira vez:
  uma lista de alterações a quem nunca a usou é uma interrupção sem conteúdo, e é a forma mais
  rápida de ensinar alguém a fechar caixas sem ler. Em baixo e não ao centro, porque é uma nota
  e não um pedido de decisão. Seis testes, e a versão guarda-se **ao mostrar** e não ao fechar,
  senão quem fechasse a app a meio voltava a ver a mesma lista.

### Os ramos como ambiente de testes — já existia

A pergunta era se era preciso configurar CI/CD. Não é: o Cloudflare Pages dá um
*preview deployment* por ramo, e o `testes.yml` já o usava — só estava amarrado a um ramo
chamado `testes`.

Passou a `ramo.yml` e publica **qualquer ramo menos o `main`**, cada um em
`https://<ramo>.hoquei.pages.dev`. Um ramo novo ganha endereço sem ninguém configurar nada;
verificado com o `versoes`.

A regra entrou no `AGENTS.md` com o erro que a motivou escrito por extenso: **o `main` é
produção**, e enquanto algo não aprovado lá estiver, qualquer publicação o leva.

## Quem vigia o vigia, e a terceira falha da cadeia de aviso (10/10/2026)

O dono fez a pergunta que fecha isto: *"há alguma forma de colocar uma acção nesta consola
para tentar ultrapassar e corrigir este tipo de situações? Não quero estar sempre dependente de
ti para tirar screenshots e enviar-te"*.

Tem razão, e a resposta tem duas metades. A segunda são botões; a primeira é mais importante.

### Porque é que o relógio não chegava: um Worker não chama outro por `workers.dev`

O relógio **disparou** às 07:20 — vê-se no `wrangler tail`, com o `cron */10 6-22` e
`outcome ok`. O que falhou foi o ping: **HTTP 404**.

Medido para excluir as hipóteses fáceis: o mesmo endereço responde **200** a um `curl` de
fora, a variável estava no Worker, e o próprio `/observar` do relógio responde 200 — logo não
era um ciclo nem um endereço errado. É a Cloudflare a não encaminhar pedidos de um Worker para
outro por essa via.

Passou a **ligação de serviço**, que é o caminho suportado e o que a boa prática manda. Mais
barato, além de funcionar: o pedido não sai para a internet e não depende de o subdomínio
público existir — o que importa, porque está em aberto desligá-lo (B9.27). Verificado: o pulso
mexeu de `07:21:20` para `07:30:43` sozinho.

### A vigia: corrige primeiro, avisa depois

`.github/workflows/vigia.yml`, de quinze em quinze minutos nas horas de jogos. Lê o
`actualizado` do `/api`; se tiver mais de 20 minutos, **toca no `/observar` para corrigir** e
só depois de isso não chegar é que abre a issue.

**Vive fora da Cloudflare de propósito.** Os `cron` dos Workers foram precisamente o que
falhou, e o agendador da GitHub é o que se vê a disparar neste repositório há dias. Se os dois
caírem ao mesmo tempo não há nada a fazer — mas deixam de ser a mesma falha.

O limiar de 20 minutos são duas firadas perdidas do relógio, e dá folga ao atraso de cinco
minutos do agendador da GitHub.

### A terceira falha da cadeia de aviso, e é a mais instrutiva

Ao ensaiar a vigia: **`could not add label: 'vigia' not found`**. O `gh issue create --label`
não cria a etiqueta — recusa, e a corrida falha por inteiro.

E o mesmo defeito estava escondido no `aviso.yml` **desde ontem**. O ensaio que eu dei por
provado usou a etiqueta `teste`, que já existia de uma chamada anterior à API; o aviso a sério
usa `cadeia`, e essa **não existia no repositório**. O primeiro vermelho a sério teria falhado
— e eu tinha escrito aqui, com números, que a cadeia estava fechada de ponta a ponta.

São **três pontos diferentes em dois dias**, todos invisíveis até alguém percorrer o caminho
até ao fim:

| | o que faltava | como se descobriu |
|---|---|---|
| 1 | o `GITHUB_TOKEN` no Worker | a ler o registo e encontrar `sem token` |
| 2 | o autor não podia ser o dono | a perguntar quem era o autor da issue |
| 3 | a etiqueta `cadeia` não existia | a ensaiar **outra** coisa |

**A lição não é a etiqueta.** É que um ensaio que não é idêntico ao caminho real não prova o
caminho real — o meu usou outra etiqueta e por isso passou por cima do defeito. A vigia ganhou
um modo de ensaio que percorre tudo e só muda o título, e os dois workflows criam agora as
etiquetas de que precisam antes de as usarem.

### E os botões

Dois, na barra da consola, atrás da mesma chave:

* **ler agora** — resolve a avaria que já aconteceu duas vezes. Depois de ler, a página
  recarrega-se para mostrar os números novos;
* **ensaiar o aviso** — percorre a cadeia inteira até ao email.

A Function serve de ponte para o Worker, para o endereço dele não aparecer no browser. E o que
se mostra é a frase do próprio observador e não uma inventada na página: se ele disser que
falta uma permissão, é isso que se lê.

### O que fica em aberto

A causa dos `cron` do observador continua desconhecida. O candidato é o limite de **5 cron
triggers por conta** no plano gratuito; o `wrangler` não lista os Workers da conta e isso
vê-se no painel. Com a vigia e os três relógios — relógio, ciclo ao vivo e a própria vigia —
deixou de ser urgente, mas continua a ser uma coisa que não se entende.

## À meia-noite, o contador somava o dia de ontem ao de hoje (10/10/2026)

O dono abriu a consola às 06:50 e perguntou porque é que o gráfico dizia **310 pedidos hoje**,
um número muito acima do que ele contava. Tinha razão em desconfiar: o `meta.json` publicado
dizia **77**.

### A aritmética fecha exactamente

| | ontem (09/10) | hoje (10/10) | soma | a consola |
|---|---|---|---|---|
| calendário de uma prova | 111 | 37 | 148 | 148 |
| classificação de uma prova | 111 | 37 | 148 | 148 |
| lista de competições | 6 | 2 | 8 | 8 |
| ficha de um jogo | 5 | 1 | 6 | 6 |
| | **233** | **77** | **310** | **310** |

Não era um factor de quatro nem um erro de arredondamento: era **o acumulado de ontem inteiro,
contado outra vez como se fosse de hoje**.

### A causa: a pergunta errada sobre o dia

O `deltas()` decide se subtrai o total anterior ou se conta o novo por inteiro, e essa decisão
vinha de `(estado.pedidos_dia?.dia ?? estado.dia) === dia`, com o `dia` do **relógio do
observador**.

À meia-noite de Lisboa isso mente. O `meta.json` publicado ainda traz o contador de ontem — a
última ronda a publicar foi às 22:13 —, o relógio do observador já diz hoje, os dois não
coincidem, e o código conclui "dia novo, logo este total é todo novo". Os 233 de ontem entraram
como novos em hoje.

**A pergunta certa não é "é hoje?" — é "é o mesmo dia do contador de antes?".** O
`pedidos_dia.dia` do raspador é a verdade sobre a que dia os pedidos pertencem, e é com ele que
se compara. É também nele que a linha se grava: uma ronda das 23:50 observada às 00:02 é de
ontem e tem de ir para ontem.

Duas asserções novas no observador, uma para cada lado da meia-noite.

### Os números gravados foram corrigidos à mão

Para os autênticos, que o `meta.json` de cada ronda conhece: **08/10 → 468, 09/10 → 233,
10/10 → 77**. A distribuição por hora de 09/10 é aproximada — reconstruí-a das horas a que as
rondas publicaram, e as rondas que não publicam não deixam rasto (é o B9.31).

### E a resposta à outra pergunta dele, que é mais incómoda

*"Como é que temos tantos pedidos para apenas um jogo?"* — porque **não foram do jogo**. Um
jogo ao vivo custa uma ficha por ronda; as cinco fichas de ontem são o jogo todo. Os 228
restantes são **rondas completas**: 37 calendários mais 37 classificações mais a lista, ~75 por
ronda, três rondas.

E a maior parte dessas rondas fui eu. Ontem disparei o `dados.yml` com `publicar_sempre` cinco
vezes para levar código ao site, antes de existir o `so_publicar` — e cada uma dessas raspou a
fonte inteira sem precisar. **O `so_publicar` nasceu dessa lição às 18:15Z**, e a partir daí as
publicações passaram a custar zero pedidos.

É a mesma regra do projecto outra vez, e a mesma de que falhei duas vezes no mesmo dia: contar
o custo **antes** de acrescentar pedidos.

## O observador esteve morto catorze horas e a consola disse "tudo em ordem" (09–10/10/2026)

A pior falha que este projecto teve, e não é a do cron: é a de um sistema de vigilância que
**dá confiança sem a merecer**.

### O que aconteceu

Durante o jogo das 22:00 de 09/10 — o ensaio geral para o fim de semana — o Worker observador
não correu uma única vez. A última escrita dele foi às **09:58** desse dia, catorze horas
antes, e foi um `/observar` que eu disparei à mão. Entretanto a consola mostrava **"tudo em
ordem"**, porque o último estado conhecido era verde e ninguém perguntava de quando era.

O que se perdeu: a cadência do jogo, os golos à hora a que apareceram, e o aviso. O que **não**
se perdeu: nada do que as pessoas vêem. A app serve ficheiros estáticos e o ciclo ao vivo
publicou a noite toda — isso mediu-se por fora, com o `scripts/observar.py`.

### O cron é aceite e não é executado

Medido nessa noite:

* a expressão era `* 17-22 * * 1-5` e `* 8-22 * * SAT,SUN`, e o `wrangler` confirma os dois
  `schedule` no fim de **cada** deploy;
* **dez minutos de `wrangler tail`: zero invocações agendadas**, só os pedidos que eu próprio
  fiz;
* mudar para `*/2`, que é a forma que o relógio usa e que funciona, não mudou nada;
* um disparo temporário na hora corrente — `*/2 23 * * *`, publicado e confirmado — também não
  disparou em cinco minutos.

O `*/1` é recusado à cara, com `invalid cron string`. O `*` é pior do que recusado: **é aceite
e ignorado**, que é a falha que não dá sinal nenhum.

**A causa não está encontrada.** O candidato mais forte é o limite de **5 cron triggers por
conta** no plano gratuito — confirmado nos limites da Cloudflare — e esta conta tem outra
aplicação do dono, o `torneiopa`, que pode ter os seus. Não se confirmou: o `wrangler` não
lista os Workers da conta, e isso vê-se no painel.

### O que ficou a funcionar

**O relógio passou a ser também o relógio do observador.** O cron dele dispara — vê-se nas
corridas da GitHub, de dez em dez minutos — e passa a pedir `/observar` a cada firada, num
`waitUntil` separado e à frente do resto: se o `decidir` falhar, o observador tem de ser
avisado à mesma, porque é precisamente aí que há alguma coisa para observar.

O observador ficou **sem `cron` nenhum**, o que também liberta três lugares na conta.

**A resolução passa de um minuto para dez.** Chega para dar pelo silêncio, que é o que o aviso
precisa; não chega para medir a cadência de um ciclo que publica de 60 em 60 segundos. É o
preço de um relógio emprestado, e fica em aberto.

### A correcção que vale mais do que o cron: o pulso

O observador passou a escrever **sempre** que corre, mesmo quando nada mudou. Antes saía sem
escrever quando não havia novidade — uma poupança bem intencionada que tornou a morte dele
indistinguível do sossego.

E a consola passou a julgar esse pulso: acima de **15 minutos** sem leitura, o farol fica
vermelho e o texto passa a **"o observador está calado — última leitura há N min"**. Três
testes, incluindo o das catorze horas.

**A regra que fica:** um medidor tem de publicar que está vivo, e quem o lê tem de recusar
chamar saudável a um silêncio. "Tudo em ordem" com uma leitura de catorze horas é a frase mais
perigosa que aquela página podia escrever.

## O contador estava a contar-se a si mesmo (09/10/2026)

Encontrado ao preparar a vigia do jogo das 22:00, e é um erro de medição com a forma mais
traiçoeira que há: **o instrumento a medir-se a si mesmo**.

O Worker observador lê o `meta.json` **de minuto a minuto** durante as janelas de jogos, e o
`scripts/observar.py` lê-o de 20 em 20 segundos quando corre. Ambos atravessam o
`_middleware.js` e caíam na amostragem como se fossem telemóveis.

Medido às 18:50, com o cron do observador a correr desde as 18:00 — ~50 invocações, uma
leitura do `meta.json` cada: **das 150 aberturas estimadas do dia, cerca de 50 eram nossas.**
Um terço. E o número crescia quanto mais olhássemos para ele, que é o contrário do que um
contador serve para fazer.

**A correcção:** o `oQueContar` ignora qualquer pedido cujo `User-Agent` comece por
`hoqueiAPP`. O prefixo é comum a todos os nossos agentes — `hoqueiAPP/0.1` no raspador,
`hoqueiAPP-ci` no `vale_pedir`, `hoqueiAPP-observador/1.0` no observador e no script,
`hoqueiAPP-research/0.1` na sonda — e isso não é coincidência: o `User-Agent` identificável
existe desde o início para a fonte saber quem a visita. Serve agora para o contador saber quem
**não** contar. Cinco testes novos, incluindo os dois casos que fixam o desenho: um agente novo
com o mesmo prefixo já fica de fora, e um agente de fora que mencione o nome no fim continua a
contar.

**O número de 09/10 fica inflacionado e não se corrige.** Subtrair uma estimativa de um
contador amostrado é trocar um erro conhecido por um erro invisível. O que fica escrito é isto:
nesse dia, ~150 aberturas incluem ~50 nossas; a partir de 10/10 o número é só de gente.

**E isto põe uma questão para o B9.31**, que é o item sobre o que o gráfico não vê: há dois
tipos de distorção a medir, e não um. Pedidos nossos a contar como utilização era um; rondas que
não publicam e por isso não aparecem no gráfico é o outro. O segundo continua aberto.

## A ronda de fecho pede 80 e precisa de 37 — decidido a 09/10/2026, a construir depois do fim de semana

O dono olhou para o gráfico da consola e perguntou a pergunta certa: *"à meia-noite fomos ao
site da APL quase 80 vezes?? eu imagino isto a ir UMA vez, mas diz-me se estou completamente
errado"*.

Não está errado na intuição — está a assumir que a fonte publica tudo num sítio, e ela não
publica. Não há API: cada prova tem a sua página de calendário e a sua de classificação. Os 80
são 80 páginas diferentes, e a conta bate exactamente:

| o que | pedidos |
|---|---|
| lista de temporadas e lista de provas | 2 |
| calendário, um por prova | 37 |
| classificação, uma por prova | 37 |
| ficha, uma por jogo com resultado novo | 4 |
| | **80** |

### Dois filtros, e o segundo é dele

**O meu:** pedir a classificação só das provas onde se jogou desde a última ronda. Se ninguém
jogou numa prova, a tabela dela não pode ter mudado. Medido a 09/10: jogaram-se 4 jogos em 3
provas, logo **34 das 37 classificações eram de tabelas intactas**.

**O dele, e é mais forte:** *"apenas ir ler de provas que ainda estão a decorrer, pois essas os
números já não vão mudar e nós já os temos"*. Isto congela também os **calendários**, que eu
tinha dado como irredutíveis — e não são, para uma prova acabada.

Medido, com os dois:

| | hoje | com os filtros |
|---|---|---|
| listas | 2 | 2 |
| calendários | 37 | **28** (as 9 terminadas ficam de fora) |
| classificações | 37 | **3** (só as vivas onde se jogou) |
| fichas | 4 | 4 |
| | **80** | **37** |

**Menos 54%.** E as 9 terminadas são exactamente as mesmas 9 que o P12.1 esconde no menu de
Competições — o número bate dos dois lados, que é a mesma verdade vista do raspador e da
interface.

### O risco, e a rede de segurança que o fecha

Os dois filtros decidem com base nos **nossos** dados. Uma prova que nós achamos terminada e à
qual a fonte acrescente um jogo depois — uma eliminatória com mais uma ronda, um adiado
remarcado para fora da janela — deixa de ser olhada **para sempre**. O filtro que poupa pedidos
é o mesmo que nos pode cegar, e um erro destes não dá sinal nenhum: a prova simplesmente para
de actualizar e ninguém repara.

**Por isso a varredura completa semanal não é um detalhe, é a condição.** Uma vez por semana
pedem-se as 37, terminadas incluídas. Custa uma ronda de 80 em sete, e a média semanal da ronda
de fecho passa de 560 para ~302.

### Como construir, quando chegar a hora

* a decisão numa função pura no raspador, com testes, ao lado do `vale_pedir` — **não** dentro
  do `cli.py` a meio do ciclo, pela mesma razão de sempre;
* "terminada" é *todos os jogos da prova têm resultado*, lido da nossa própria agenda, que não
  custa um pedido. A função irmã no cliente já existe e chama-se `competicoesVivas`;
* a varredura semanal escolhe-se por um dia fixo — o domingo da ronda de fecho, que é quando a
  jornada acabou — e não por um contador de dias, que se perde quando uma corrida falha;
* o `meta.json` tem de registar **quantas provas foram saltadas e porquê**, senão o gráfico da
  consola passa a mostrar menos pedidos sem ninguém saber se foi poupança ou avaria. É o mesmo
  defeito do B9.31 e não vale a pena criar outro igual.

**Combinado para depois do fim de semana de 10–11/10**, a pedido meu: não se mexe no raspador a
dezasseis horas de 36 jogos.

## Todos os 76 jogos do fim de semana davam erro antes de começar (09/10/2026)

Encontrado a verificar a publicação, horas antes do fim de semana que o dono não quer que
falhe. **Era o defeito mais grave que este projecto teve até hoje**, e não era visível em
sítio nenhum onde se costuma olhar.

### O que acontecia

A fonte só publica a ficha de um jogo **quando ele começa**. Medido:

```
2026-10-09:  1 jogo,  0 com ficha
2026-10-10: 36 jogos, 0 com ficha
2026-10-11: 39 jogos, 0 com ficha
```

Tocar em qualquer um deles dava, no telemóvel, **"Não foi possível carregar os jogos —
verifica a ligação à internet e tenta de novo"**. Numa manhã de sábado com 36 jogos, isso é a
app a dizer a quem a abre que o problema é dele.

### Porque é que nada o apanhou

A cadeia tem quatro passos e cada um deles parecia correcto:

1. o `adapter-static` serve o `index.html` como *fallback* para qualquer caminho sem rota, e
   **com estado 200**;
2. o `json()` via `r.ok` verdadeiro e tentava interpretar HTML como JSON;
3. o `+page.ts` apanhava o erro de sintaxe e atirava um 404;
4. a página de erro dizia sempre "verifica a ligação à internet".

Não é erro de compilação. Não falha teste nenhum. E **no `curl` funciona** — `curl -o /dev/null
-w %{http_code}` devolvia 200 e eu dei isso por bom. Só se vê a abrir a página no browser e a
olhar para ela, que é a regra que este projecto tem escrita e que eu não cumpri ao publicar.

### A correcção

**A app já sabia tudo o que precisava.** A agenda traz as equipas, a hora, o recinto, a prova,
o escalão e o `comp` — logo a classificação também. Não faltava informação: faltava usá-la.

* `lib/fichaDaAgenda.ts` monta uma ficha a partir da entrada da agenda, com seis testes. Não
  inventa período nem relógio: um jogo marcado fica "Por começar" e um jogo com resultado mas
  sem ficha fica "Jogo Terminado" com o resultado da lista;
* o `json()` deixa de aceitar o *fallback* como dados: um corpo que começa por `<` é a página
  da app, não um ficheiro nosso. Lança `NaoPublicado`, que é uma coisa diferente de "sem rede";
* o `+page.ts` só dá 404 quando o jogo **não existe na agenda**. Qualquer outra falha a buscar
  a ficha cai na da agenda — inclusive estar sem rede com a agenda em cache, onde mais vale a
  página com o que se sabe do que um erro;
* a página diz numa linha porque é que não há onze nem cronologia. Nota e não aviso, sem
  amarelo nem ícone de alerta: é a lição da caixa das classificações calculadas, que o dono
  apanhou a 07/10 — o aviso afastava a atenção do que ele tinha ido ver;
* o `+error.svelte` deixa de culpar a internet num 404. Um 404 diz que não encontrou e dá o
  caminho de volta; os outros estados continuam com a dica da rede e o botão de tentar de novo.

**O `tem_ficha` da agenda não serve para decidir isto** e foi verificado: está ausente mesmo
em jogos que têm ficha (o 9657 tem ficha e `tem_ficha` vem `None`). A regra que ficou não
depende de sinalizador nenhum — tenta-se buscar, e se não estiver publicada monta-se a da
agenda.

Verificado a 375×812 nos dois temas, com os três casos: o jogo de hoje às 22:00 (sem ficha,
mostra escalão, equipas, "Por começar", a classificação da Série C e o recinto), um jogo de
ontem com ficha (quatro separadores, sem nota) e um id inventado (404 com o caminho de volta).

## A consola passou para `hoquei.pages.dev/consola` — feito a 09/10/2026

Estava combinado para "depois dos jogos" e o dono antecipou: *"temos tempo suficiente para
construir, testar e ainda testar no próprio jogo"*. Os sete passos ficaram feitos, com duas
diferenças em relação ao plano.

**O motivo, recordado:** o endereço da consola era `hoquei-observador.torneiopa.workers.dev`, e
o `torneiopa` é o subdomínio de uma aplicação anterior do dono. A Cloudflare dá **um**
subdomínio `workers.dev` por conta, não um por projecto. As saídas eram uma segunda conta — que
partia as ligações, porque elas são por conta — ou um domínio próprio, adiado (B9.27).

### Como ficou dividido, e porquê

| onde | o que |
|---|---|
| `worker/observador` | tudo o que é **medir**: o cron, as escritas, e um `/api` que devolve a consola inteira em JSON |
| `web/src/lib/consola.js` | só o **desenho**. Recebe os dados prontos e não sabe de onde vieram |
| `web/functions/consola.js` | serve a página: valida a chave, busca o `/api`, desenha |

A Function **não** fala com a base de dados nem com a GitHub, e isso foi uma escolha. A
alternativa era ela ler o D1 por si — o `DADOS` está ligado ao projecto de Pages — e aí
passavam a existir dois sítios a saber como se lêem as medições, mais um segredo da GitHub
guardado no projecto do site. Um salto a mais dentro da Cloudflare é mais barato do que duas
verdades sobre os mesmos números.

### Duas diferenças em relação ao plano

**1. O `workers_dev = false` não foi feito.** O plano dizia para fechar o endereço do Worker.
Fechá-lo mataria o `/observar` e o `/verificar-aviso`, que são a porta de manutenção e a única
forma de provar a cadeia de aviso. O incómodo do dono era o endereço **que ele abre**, e esse
passou a ser o do site. O do Worker fica, sem página para humanos.

**2. A consola passou a ter chave.** No Worker era pública: o endereço não se adivinhava e o
que ela mostra são resultados de jogos, que são públicos. Em `hoquei.pages.dev/consola`
adivinha-se à primeira — e ali já se vê quantas pessoas usam a app, que é outra coisa. Fica
atrás da mesma `CHAVE_CONTAGENS` que fecha o `/contagens`.

### E a chave cola-se uma vez, não a cada visita

A primeira versão exigia `?chave=…` sempre. O dono perguntou se tinha de a pôr no endereço
todas as vezes, eu respondi que um favorito resolvia, e ele **perguntou outra vez**. Tinha
razão e eu estava a defender o desenho em vez de o ouvir: um favorito resolve *reescrever*, não
resolve **abrir a consola de cabeça**, que é o que se faz com o telemóvel na mão num pavilhão.

Agora `/consola` sem chave devolve uma caixa; cola-se uma vez, fica no `localStorage` desse
browser, e a partir daí o endereço simples basta. Verificado: escrever `/consola` sem nada abre
a consola com os seis painéis.

**O que isto custou, e foi dito antes de se fazer:** sem chave, isto respondia 404 e escondia
que existia; agora quem adivinhar o caminho sabe que há aqui uma consola. Entrar continua a
exigir a chave — a diferença é entre uma porta sem campainha e uma porta com fechadura, e a
fechadura é a mesma.

**Sem cookie**, de propósito: a `/privacidade` promete zero cookies e essa promessa não se
gasta nisto. A chave nova ficou enumerada nessa página no mesmo commit, com a nota de que só
existe em quem abra a consola.

**Uma chave mudada no painel não deixa o browser preso.** A caixa apaga a guardada antes de
voltar a pedir — testado a simular exactamente isso: diz "essa chave não serve", limpa, e
pede. Sem ciclo.

### E a página de privacidade deixou de poder derivar sozinha

Era a segunda vez que ia acontecer. A primeira foi minha, a 06/10: a página dizia uma chave em
`localStorage` e havia duas, porque o `guia-visto` nasceu sem passar por lá. Hoje ia ser a
chave da consola.

O `AGENTS.md` diz "código e documento no mesmo commit quando o documento afirma algo sobre o
código", e dá **esta página** como exemplo. Passou a teste: varre o código da app e das
Functions à procura de chaves `hoquei:` e `ok4sticks:` e exige que cada uma esteja escrita na
página; e confirma que nada no código faz `document.cookie =`. Varre o código e não uma lista
escrita no teste, pela razão de sempre — uma lista copiada para um teste tem o problema que o
teste tenta resolver. Verificado a tirar a chave da página e a vê-lo falhar.

Pelo mesmo motivo, o FAQ deixou de dizer **"são cinco coisas"**: um número escrito à mão sobre
uma lista que cresce é a definição de resposta que apodrece, e eu já tinha posto um teste a
recusar isso na resposta da cadência.

O link que o aviso põe na issue é `/consola` **sem a chave**, de propósito: as issues deste
repositório são públicas, e uma chave numa issue pública é uma chave queimada.

## Cinco melhorias na consola, pedidas a 09/10/2026 com ela ainda em construção

O dono abriu-a a meio e trouxe cinco coisas. Todas feitas no mesmo dia.

**1. "Os gráficos e indicadores estão todos à esquerda e não adaptados à janela."** A grelha
estava travada em 1280 px, e num monitor de 1900 ficava meio ecrã vazio. Agora vai até 1760 px
e centra-se. O tecto existe à mesma: uma tabela de 2500 px obriga a varrer a cabeça de um lado
ao outro para ler uma linha.

**2. "Outro KPI com o total de entradas de utilizadores distintos desde sempre."** Feito, e com
o nome mudado — porque o número que ele pediu **não é calculável com este desenho, de
propósito**. O que há é `SUM(total)` da tabela `aparelho`: a soma de aparelhos distintos *por
dia*. Quem abre a app em cinco dias conta cinco. Saber que é a mesma pessoa exigiria um
identificador que não existe, e não existir foi uma decisão (ver `lib/presenca.ts` e a
`/privacidade`). O painel chama-se **"entradas desde sempre"** e traz ao lado as "primeiras
vezes", que é o mais próximo de uma resposta honesta à pergunta dele.

**3. O "pela primeira vez" maior e à direita.** Era nota de pé em letra miúda, e ele tem razão
no desenho: são duas medidas da mesma coisa, não uma medida e um rodapé. Painel novo com dois
números, alinhados pela **base** — é isso que os faz ler como uma linha só apesar de um ter
1,9 rem e o outro 1,25.

**4. "O gráfico de barras não tem eixo vertical."** A frase dele que resolve a questão:
*"tenho sempre de passar o rato por cima para perceber qual o número"*. Um gráfico que só se lê
com o rato não se lê num telefone nem numa impressão. Tem agora eixo com quatro marcas e guias
horizontais **atrás** das barras — à frente, uma linha a cortar uma coluna lê-se como uma
divisão dela.

E uma mudança que o eixo obrigou e que vale por si: as barras passaram a ser medidas contra um
**tecto redondo** (80 → 100) e não contra o máximo do dia. Com a escala no máximo, uma hora de
3 pedidos num dia de 3 enchia o gráfico e lia-se como um pico.

**5. "Consigo ver no mesmo gráfico os dias anteriores?"** No mesmo não, e a razão é que um
gráfico de 24 horas e um de 7 dias são duas perguntas. Ficaram **lado a lado**: "por hora" à
esquerda, "e nos dias anteriores" à direita, e **cada dia é um link** que troca o gráfico das
horas. São os mesmos dados vistos de duas distâncias, e nenhuma custa um pedido à fonte.

### Um defeito que só apareceu por causa do ponto 5

Com os links a funcionar, abri o dia 08/10 e os painéis diziam **"aparelhos hoje: 14"** — com
os 14 a serem de ontem. Uma mentira pequena que faz tirar a conclusão errada depressa.

Os rótulos passam a dizer "nesse dia", o cabeçalho diz o que está a ver e dá a volta, e os dois
números que são genuinamente de agora — o farol e os pedidos da última ronda — passaram a
dizê-lo: **"pedidos à APL, agora"**. Isto não se vê a ler o código: vê-se a abrir a página num
dia que não é hoje.

## A consola em baixo: 50 sub-pedidos por invocação (08/10/2026)

O dono abriu a consola e levou um `Error 1102 — Worker exceeded resource limits`. A causa era
minha e é instrutiva: a página pedia **11 chaves do KV para cada um dos 7 dias**, 77 leituras,
e o plano gratuito dos Workers corta aos **50 sub-pedidos por invocação** — cada leitura do KV
conta como um. Não era CPU nem memória: era o número de idas ao armazém.

Passou a ler o mínimo: três chaves por dia para o gráfico de sete dias — aparelhos, novos,
aberturas — e o detalhe por ecrã só do dia que se está a ver. São 30 leituras no pior caso,
mais três para o resto da página, e vão em `Promise.all` porque em série a página demorava a
aparecer.

Verificado: dez carregamentos seguidos, dez 200, e o `/api` e o `/observar` também. A página
continua com as 24 colunas, as 7 barras, as 4 cores da legenda e os ecrãs do dia.

**A lição a guardar:** num Worker, o KV não é uma variável — é uma ida à rede, e há um tecto
por invocação. Um laço de leituras aninhado passa de 50 sem ninguém reparar.

## Pedidos à APL por hora e por tipo — e o que o gráfico não vê (08/10/2026)

O dono pediu um gráfico de 24 colunas com os pedidos do dia, cores por tipo de chamada. Está
feito, e a parte difícil não foi o desenho.

**Por tipo** conta-se no `_obter` do `fonte.py`, por onde passam todos: são quatro páginas —
`competiciones`, `calendario`, `clasificacion` e a ficha (`partido.asp`). **Por hora** é mais
subtil: o total do dia acumula-se dentro do próprio `meta.json`, porque cada ronda ao vivo é
um processo novo e um contador em memória morria com ele; o observador lê esse total de minuto
a minuto e atribui a diferença à hora em que a viu. Uma descida do total trata-se como
recomeço — uma corrida nova parte do ficheiro commitado, que pode ser de horas antes.

### O que o gráfico não vê, e porquê

**As rondas que não publicam não aparecem.** Quando uma ronda não encontra dados novos, o
passo "Comitar se houver novidade" faz `git checkout -- web/static/v1` e descarta tudo o que
foi regenerado — incluindo o `meta.json` com a contagem. Nos dias úteis são até quatro rondas
de ~75 pedidos cada que ficam invisíveis no gráfico.

Está dito na própria página, por baixo do gráfico, e não escondido. As saídas, para quando
valer a pena:

| | custo |
|---|---|
| **B9.31** — uma linha por ronda em `data-samples/rondas/pedidos.jsonl`, sempre comitada, lida pelo observador do `raw.githubusercontent` como já lê o diário | S, mas mexe no publicador |
| manter assim | 0, e o gráfico conta só o que publicou |

**Não mexi no publicador hoje**, de propósito: é a peça que leva dados ao site, parti-a duas
vezes esta semana, e amanhã é véspera de um fim de semana com 75 jogos. Uma contagem
incompleta e honesta vale mais do que um publicador arriscado.

## Aparelhos distintos por dia, sem identificador (08/10/2026)

O dono perguntou se dá para medir utilizadores distintos. **Pessoas, não** — isso exige um
identificador e não existe nenhum, de propósito. E os números que tínhamos não respondem nem
por aproximação: uma app aberta pede o `meta.json` de 5 em 5 minutos, e de 30 em 30 segundos
durante um jogo, por isso as ~120 aberturas de 08/10 tanto podiam ser **duas pessoas numa
bancada** como **sessenta a espreitar dez segundos**. Trinta vezes de diferença.

**O que dá, e foi o que se construiu: aparelhos distintos por dia.** É o próprio aparelho que
decide se já foi contado hoje, guardando uma data — `2026-10-08` — e só na primeira abertura
do dia avisa o `/contar`. O servidor recebe um toque e **não tem como o ligar ao de ontem**:
não vai número nenhum, não há cookie, e o que fica guardado é uma data, que não identifica
ninguém. Um segundo sinalizador, um bit, diz se o aparelho já conhecia a app — daí o "quantos
são novos hoje".

| | |
|---|---|
| chaves no KV | `d:<dia>` aparelhos, `n:<dia>` dos quais novos |
| escritas | uma ou duas **por aparelho e por dia** — quem abre a app vinte vezes escreve uma |
| onde se vê | consola, `/contagens?chave=…` e `/api` |

O que **não** é, e está escrito na `/privacidade` e na consola: são aparelhos e não pessoas —
telemóvel e PC da mesma pessoa contam dois —, quem limpar os dados do site conta outra vez, e
não há coortes nem "quantos voltaram na semana seguinte", porque isso é precisamente o que se
evitou poder fazer.

Caminhos recusados, por ordem do que custavam à promessa: um id por aparelho (dá pessoas e
coortes, e torna falsa a frase "sem rastreio"), hash do IP com sal diário (é o que o Plausible
faz, mas o IP é dado pessoal e passaríamos a tratá-lo), e a Web Analytics da Cloudflare
(script de terceiros no telemóvel de quem usa).

Verificado com `wrangler pages dev` e um KV local: nove chamadas, três delas com `novo=1`,
deram `aparelhos: 9, novos: 3`. E um teste apanhou-me uma garantia que eu tinha escrito e não
cumprido — "nada disto pode partir a app" — num `fetch` que atira antes de devolver promessa:
o `.catch` não existia para apanhar nada.

## Observar uma janela de jogos, com números (08/10/2026)

**Isto corre na nuvem, em `worker/observador/`.** Começou como `scripts/observar.py`, no
portátil, e o dono cortou-o pela raiz: *"não quero isto a correr localmente, quero fazer um
teste a sério"*. E tinha razão — se o Mac adormece, a medição morre e nós nem ficamos a saber.

    https://hoquei-observador.torneiopa.workers.dev/              → o relatório de hoje
    https://hoquei-observador.torneiopa.workers.dev/?dia=2026-10-11
    https://hoquei-observador.torneiopa.workers.dev/observar      → força uma leitura agora

**Worker à parte do `relogio`, e de propósito.** O relógio é a peça que mantém a app viva ao
fim de semana; um defeito no observador não pode parar aquele.

De minuto a minuto, e só nas horas de jogos: `* 17-22 * * 1-5` e `* 8-22 * * SAT,SUN`. De
minuto e não de dez em dez como o relógio porque o que se mede é a cadência de um ciclo que
publica de 30 em 30 segundos — com dez minutos de intervalo, um buraco de nove passava
invisível.

Duas coisas aprendidas ao publicar:

* a Cloudflare recusa `* 8-22 * * 6,0` **e** `0,6` com `invalid cron string`, e recusa `*/1`
  no campo dos minutos. `SAT,SUN` passa;
* o KV gratuito dá 1 000 escritas/dia, partilhadas com o contador de utilização, por isso só
  se escreve quando **algo mudou**. Verificado: primeira leitura 5 eventos, segunda leitura
  5 segundos depois **0 eventos e 0 escritas**.

O `scripts/observar.py` fica, para quem quiser medir à mão de um portátil:

`scripts/observar.py`, feito para a janela de sub-17 de 08/10 — quatro jogos das 20:00 às
21:15, uma noite em que quase ninguém está a olhar, que é a noite certa para medir.

    uv run --with httpx python scripts/observar.py --ate 22:30
    uv run --with httpx python scripts/observar.py --analisar <registo>.jsonl

**Lê só o nosso CDN, de 20 em 20 segundos, e não toca na fonte.** Uma segunda coisa a raspar
seria exactamente o que a Decisão 1 proíbe. A consequência honesta: **não** mede quanto tempo
um golo demora a chegar desde que foi marcado — isso exige alguém no pavilhão com um
cronómetro, como se fez a 03/10 (~20 s da mesa + ~15 s nossos).

Mede o que apanha as falhas que já nos morderam:

| | a falha que apanha |
|---|---|
| cadência de publicação | o ciclo ao vivo parado a meio de um jogo |
| lista contra ficha do mesmo jogo | o bug de 05/10: lista a 0-0 e ficha a 1-0 |
| marcas de "ao vivo" | a marca presa horas depois do apito |
| cada mudança de resultado, com hora | se os golos aparecem, e de quanto em quanto tempo |
| jogos com resultado e sem ficha | a ficha que não chega |

Nota para quem o usar ao fim de semana: a noite de 08/10 é toda de sub-17, que **tem** tabela
publicada pela fonte. O caminho da tabela calculada — Escolares e Benjamins — só é exercido a
10 e 11/10.

## Auditoria antes do fim de semana de 10–11/10 (08/10/2026)

O dono disse o que importa, e é a régua certa: *"se começam a ver que está a falhar, voltam
para o site da APL — está horrível, mas não falha"*. O layout pode esperar; os golos, as
classificações e os jogos passados não.

**O fim de semana que vem é o maior até agora:** 36 jogos no sábado das 10:00 às 21:00, em
cinco escalões, e 39 no domingo das 10:00 às 20:00, em sete.

**Medido nos dados que estão no ar, a 08/10/2026:**

| o que se mediu | resultado |
|---|---|
| jogos já disputados sem resultado | **0** de 799 |
| marcas de "ao vivo" presas | **0** |
| agenda contra ficheiro da competição (o bug de 05/10) | **0** desacordos em 799 jogos |
| linhas de classificação nossas contra as da fonte | **176 de 176 iguais**, em 23 provas |

**E encontrei um defeito que ia morder exactamente neste fim de semana.** Na ronda ao vivo, se
o pedido da tabela à fonte falhasse, um `continue` saltava a competição inteira — e nos
Escolares e Benjamins a tabela calculada é a **única** que existe. Os jogos mostrariam 7-1 e a
tabela ficaria na jornada anterior, que é precisamente o género de falha que manda uma pessoa
de volta ao site da associação.

Duas correcções, com teste cada uma:

1. **A tabela da fonte falhar já não salta a competição.** A nossa não depende dela, e a
   tabela publicada que já tínhamos também não se perde — ficar sem tabela é pior do que
   ficar com a da ronda anterior.
2. **Onde a fonte não publica tabela, não se lhe pede uma.** Era um pedido inútil ao servidor
   da federação por cada jogo que fecha. Medido para este fim de semana: **9 pedidos poupados
   no sábado (25% dos jogos) e 12 no domingo (30%)**. Se a fonte começar a publicar a meio da
   época, é a ronda completa do `dados.yml` que o nota e a condição passa a ser falsa sozinha.

**A cobertura ao vivo do fim de semana, verificada no agendamento:** o `aovivo.yml` tenta de
30 em 30 minutos das 08:00 às 22:30 WEST, cada ciclo dura até 5 h e a `concurrency` transforma
os disparos seguintes em revezamento; o `worker/relogio` dispara de 10 em 10 minutos das 07:00
às 23:50 WEST; e o `dados.yml` faz a ronda completa de 2 em 2 horas ao fim de semana, que é a
rede que apanha o que o ciclo ao vivo deixe passar.

## Os emails de falha das 00:39 — e não era o agendador (08/10/2026)

O dono recebeu emails de falha três noites seguidas, sempre minutos depois da ronda das
00:30, e levantou outra vez — com razão para perguntar — se não devíamos sair da GitHub
Actions. **Medido antes de responder, e a resposta é outra: o agendador disparou tudo. O que
falhou foi um teste nosso.**

```
Mon 05/10   5 agendadas   5 arrancaram   4 passaram   falhou a das 23:30
Tue 06/10   5 agendadas   5 arrancaram   3 passaram   falharam a das 00:00 e a das 23:30
Wed 07/10   5 agendadas   5 arrancaram   3 passaram   falharam a das 00:00 e a das 23:30
```

As que falham são **exactamente** as que correm entre as 23:00 e as 01:00 UTC. O
`test_aovivo` constrói "um jogo de há quatro horas" com a **data de hoje** e a hora de
`agora - 4h`: depois da meia-noite em Lisboa isso dá um jogo marcado para hoje às 20:38, que
está vinte horas no futuro e não quatro no passado. O `em_atraso` ignorava-o — com razão — e
era a expectativa do teste que estava errada.

**A consequência não era cosmética.** O passo dos testes corre **antes** de regenerar o
`/v1`, logo a ronda que sela o dia não fez nada em três noites seguidas: os resultados dos
jogos da noite só apareciam na ronda das 06:00, seis horas depois.

Corrigido com o relógio injectável — `cli._agora()` — e com a hora fixa nos testes. Mais um
teste que fixa 00:38 em Lisboa e guarda as duas metades da verdade: um jogo de **ontem** sem
resultado não é perseguido por este ciclo (quem fecha o dia é a ronda das 00:30 do
`dados.yml`), e um jogo de **hoje** que já começou continua a ser apanhado. É a terceira vez
que a família "data local contra data UTC" custa tempo aqui, e a primeira em que o relógio
deixa de ser lido directamente.

### Duas correcções ao que eu próprio disse

1. **O agendador da GitHub falhou a sério, mas foi no fim de semana de 3–4/10**: desse fim de
   semana perdeu 14 das 18 rondas. Foi isso que motivou o `worker/relogio` (commit de
   04/10). Desde que ele existe, **15 de 15** rondas agendadas arrancaram. A impressão de
   "falha sempre" vinha dos emails, e os emails eram do nosso teste.
2. **As noites de 30/09 a 03/10 aparecem sem ronda nocturna, e não é falha de ninguém**: o
   `cron` das 23:30 só nasceu a 04/10, no commit 406ef65. Contá-las como perdidas, que foi o
   que a minha primeira medição fez, inflacionava a taxa de falha.

### Então vale a pena sair da GitHub Actions?

O que a Cloudflare dá e nós já usamos é **o disparo**: o `worker/relogio` tem `crons` da
Cloudflare e dispara o `aovivo.yml` e, como cão de guarda, o `dados.yml`. Dos últimos 56
arranques do `dados.yml`, 21 vieram por `workflow_dispatch` — isto é, do relógio ou de mim.

O que a Cloudflare **não** dá hoje é correr o raspador: é Python com `httpx` e `selectolax`,
e os Workers são JavaScript ou Python sobre Pyodide. As saídas reais são três, e estão em
B9.29:

| | o que muda | custo |
|---|---|---|
| ficar assim | nada; o relógio já cobre o agendador | 0 |
| Cloudflare Containers | tudo num fornecedor | exige o plano pago dos Workers |
| Cloud Run Jobs + Cloud Scheduler | corre o contentor como está, com SLA | dentro do nível gratuito — medido: ~43 000 vCPU-s/mês contra 240 000 |

**Recomendação: ficar assim por agora**, porque a falha medida depois do relógio é zero e o
que doía era o nosso teste. Se o objectivo passar a ser tirar a GitHub do caminho crítico, a
saída que não exige plano pago e que corre o Python como ele está é o Cloud Run — e isso é o
B9.29, já escrito.

## Nome e ícone (07/10/2026)

A app passou a chamar-se **OK4Sticks.DEV**, por escolha do dono — alinhado com o endereço de
suporte, `info.ok4sticks@gmail.com`. Antes era "Hóquei em Patins", que descrevia o desporto e
não identificava nada.

| onde | o que ficou |
|---|---|
| `web/src/lib/sitio.ts` | `APP_NOME` e `APP_NOME_CURTO`, e é daqui que os oito `<title>` o leem |
| manifesto | `name: OK4Sticks.DEV`, `short_name: OK4Sticks` — o ecrã principal corta aos ~12 caracteres e o nome completo tem 13 |
| `app.html` | `apple-mobile-web-app-title: OK4Sticks` |
| cabeçalho | `OK4Sticks` a cheio e `.DEV` em voz baixa. Medido a 375×812: 107 px de marca e 73 px de folga até aos ícones, numa linha |
| ícone | amarelo torrado `#c8860d`, gerado pelo `scripts/gerar_icones.py` |

**O descritor "em patins" saiu do cabeçalho.** O nome novo é mais largo e naquele espaço cabem
a marca, a frescura dos dados e dois ícones. Continua no manifesto e na página "Sobre a app e
os dados" — e é lá que um estranho descobre do que se trata.

**Só o ícone mudou de cor, e foi decisão com número à frente.** O `theme_color` do manifesto
acompanhou-o, porque é a cor com que o Android tinge o arranque e o alternador de aplicações.
Os dois `<meta name="theme-color">` do `app.html` **não** mudaram: aqueles são a cor do fundo
da página e um amarelo ali punha uma barra torrada em cima de uma página cinzenta. O acento da
interface continua verde — medido a 07/10/2026, nenhum amarelo passa os 4,5:1 exigidos a texto
nos dois temas com um valor só: o torrado dá 3,06 no claro e a mostarda clara 2,38. Para o
ícone serve, que aí o mínimo é 3:1 e o stick é branco sobre a cor.

Fica em aberto, por escolha do dono: experimentar a interface inteira em torrado, com dois
valores por tema — ocre `#8a5a00` no claro (5,93) e `#e0a92a` no escuro —, como já se faz com
a estrela dos favoritos.

## Pedidos de 06/10/2026

| ID | Item | Prio | Est. | Nota |
|---|---|---|---|---|
| P11.1 | Caixa de email a alimentar o backlog sozinha | should | M | **Não há acesso ao Gmail nesta sessão** — não há conector de email. O caminho que não precisa de um: Cloudflare Email Routing → Worker → API da GitHub a abrir uma *issue*. Já temos Worker e a skill `cloudflare-email-service`. O token precisaria de permissão de *issues* |
| P11.2 | Email → *issue*, **não** → Pull Request | must | XS | Separação deliberada, ver abaixo |
| P11.3 | Logs com níveis | should | M | Hoje são 30 `print()` no `cli.py`, sem `logging` e sem `--verbose`. Saem para os logs da corrida na GitHub, que expiram e morrem com ela |
| P11.4 | Interruptor manual de tema | should | S | ✅ **feito a 06/10/2026**, dentro do menu do ⋮ (P11.9). Três opções — Sistema, Claro, Escuro — e a escolha contraria o sistema nos dois sentidos, verificado. `sistema` **não se guarda**: a ausência da chave é a omissão |
| P11.5 | Saber que menus as pessoas usam | should | M | ✅ **construído a 06/10/2026**, e **falta um passo que é do dono** — criar o KV e ligá-lo ao projecto, ver abaixo. Contagem do lado do servidor, sem script no cliente, sem cookie, sem terceiros, e a `/privacidade` mudou no mesmo commit |
| P11.6 | O texto do comentário fica escrito depois de enviar | must | XS | ✅ **feito a 06/10/2026.** Limpa ao enviar, e **só** ao enviar: fechar pelo × ou pelo véu mantém o rascunho, verificado nos três caminhos |
| P11.8 | Um favorito com a forma antiga parte o `/clube` em silêncio | must | S | ✅ **feito a 07/10/2026.** O `ler()` passou a validar a forma de cada favorito e a descartar o que não a tenha — e a **gravar a lista limpa**, senão o inválido ficava no aparelho a ser descartado em cada abertura. Quem tinha um favorito antigo vê o ecrã de escolha em vez de um ecrã vazio, verificado no browser. 6 testes novos. Descoberto a 06/10 ao testar o tour: o `ler()` em `favoritos.svelte.ts` aceita o que está no `localStorage` sem validar a forma. Um favorito sem `competicoes` — guardado por uma versão anterior — faz o `resumir()` rebentar no `flatMap`, e a página fica **sem cartões, sem convite e sem erro à vista**. Validar a forma ao ler e descartar o que não a tiver |
| P11.9 | O ⋮ passa de página a menu | must | S | ✅ **feito a 06/10/2026.** Ver abaixo |
| P11.10 | A política de privacidade tinha ficado desactualizada | must | XS | ✅ **corrigido a 06/10/2026**, no mesmo commit do tema. Ver abaixo |
| P11.11 | Perguntas frequentes | should | S | Pedido a 06/10/2026. **Ainda não há perguntas reais** — as primeiras somos nós a inventar, e isso tem consequências no desenho. Ver abaixo |
| P11.12 | O `dados.yml` aborta se alguém commitar durante a corrida | should | XS | ✅ **feito a 07/10/2026.** `push` com três tentativas e `pull --rebase` entre elas, mais `fetch-depth: 0` no checkout — sem a história, um rebase sobre um clone raso não encontra antepassado comum. O rebase é seguro porque estes ficheiros são gerados e não editados à mão. Medido: o repositório são 2,64 MiB e 137 commits, logo trazer a história toda não custa nada | Apanhado a 06/10/2026, na corrida 37537581781: ela raspou, comitou os dados e o `git push` foi rejeitado porque eu tinha empurrado uma correcção nesse minuto. Abortou **antes** de publicar — falhou do lado seguro, e a ronda seguinte regenerou tudo —, mas perdeu a corrida e os 150 ficheiros daquela ronda. Um `git pull --rebase` antes do `git push`, ou um laço de duas tentativas, resolve-o. O `aovivo.sh` já lida com isto; o `dados.yml` não |
| P11.7 | Segundo site para testes | should | S | ✅ **feito a 07/10/2026**: `.github/workflows/testes.yml`, ramo `testes` → `https://testes.hoquei.pages.dev`. **Não raspa** — publica os dados commitados, porque a raspagem é central e o servidor da associação não paga o nosso ambiente de testes. O contador de utilização fica calado lá, por a ligação ao KV viver no ambiente de *Production*: o tráfego de testes não entra nas contagens reais |

### P11.2 — porque é que um email não deve virar Pull Request

Um Pull Request é código. Um email é um pedido. Abrir um PR a partir de um email seria
implementar, sem revisão, o que um remetente não autenticado escreveu — e o endereço de
suporte está publicado numa página legal, aberto a qualquer pessoa. Email → *issue* é
automatizável e seguro; *issue* → PR é trabalho com um humano a decidir no meio.

### P11.5 — a análise de utilização contra o que prometemos

A `/privacidade` diz, hoje, "sem conta, sem cookies, sem rastreio" e "zero tipos de letra
externos" — foi escrita a partir de uma auditoria ao código, e é verdadeira. Qualquer
contador de cliques por menu quebra isso, e a página teria de mudar **no mesmo commit**.

Três saídas, por ordem do que custa à promessa:

1. **Logs do lado do servidor, agregados por caminho.** O Cloudflare já vê os pedidos; contar
   quantos chegam a `/clube` e a `/competicoes` não acrescenta código no cliente, nem cookie,
   nem terceiro. Não distingue pessoas — e para "que menus se usam" não é preciso.
2. **Cloudflare Web Analytics.** Sem cookies, mas injecta um script de `cloudflareinsights.com`:
   é código de terceiros, e a frase da página deixa de ser verdade.
3. **Contador próprio por evento.** Máximo detalhe, exige servidor e passa a guardar
   comportamento de outras pessoas — o que obriga a reescrever a política a sério.

A recomendação é a 1. Dá a resposta à pergunta que fizeste sem tocar na promessa.

**Correcção de 06/10/2026, e ela muda a conclusão.** Eu disse-lhe que a contagem honesta exigia
um domínio próprio, porque a analítica de tráfego da Cloudflare vive ao nível da zona. Estava
incompleto: **não é preciso domínio nenhum.** Um `functions/_middleware.ts` no projecto Pages
corre **no servidor da Cloudflare** a cada pedido, portanto a contagem pode ser nossa, sem
script no cliente, sem cookie e sem terceiros. Verificado na documentação a 06/10/2026: o plano
gratuito dá 100 000 pedidos/dia partilhados com os Workers, e **os ficheiros estáticos são
grátis e ilimitados** enquanto não invocarem uma Function.

Três coisas a acertar no desenho, e a terceira é a que obriga a trabalho:

1. **Limitar o middleware às navegações.** Nos 548 ficheiros do `/v1` e nos 31 emblemas, uma
   carga fria gastava ~113 invocações em vez de 1.
2. **Onde guardar.** KV no plano gratuito dá 1 000 **escritas**/dia, e é esse o tecto real:
   uma escrita por navegação significa ~1 000 navegações/dia. Para um grupo de testes sobra;
   para os grupos dos clubes, não — aí agrega-se em memória ou passa-se a Durable Objects, que
   é plano pago.
3. **A `/privacidade` muda no mesmo commit.** Hoje ela diz que o alojamento vê o IP e guarda
   registos técnicos, e que *nós* não vemos nada. Passar a contar nós, mesmo só caminhos
   agregados e sem IP nem identificador, faz de nós uma parte que guarda algo sobre as visitas —
   e a página só vale porque é exacta. A frase "sem rastreio" continua verdade: contagens por
   caminho não distinguem pessoas.

Para comparar: a analítica da zona, com domínio próprio, é mais rica e não gasta invocações,
mas no plano gratuito vem com **24 horas de atraso** (documentação da Cloudflare). E a Web
Analytics continua fora: é um *beacon* servido de `static.cloudflareinsights.com`, logo código
de terceiros no telemóvel de quem usa.

### Como ficou, e o que falta fazer à mão (06/10/2026)

**Construído:** `web/functions/_middleware.js` conta no servidor, `web/functions/contagens.js`
lê, `web/static/_routes.json` decide o que invoca a Function e o que é servido direto do CDN.
A `/privacidade` ganhou a secção "A única contagem que fazemos" no mesmo commit, e a linha que
dizia "nem qualquer outra ferramenta de medição ou rastreio" foi reescrita — era a frase que
deixava de ser verdade.

**Contam-se duas coisas, e a razão da segunda foi medida:** contar navegações não chegava. O
nosso *service worker* registra um `NavigationRoute` ligado a `/`, por isso a navegação de
quem já visitou **nunca chega ao servidor**, e dentro da app a navegação é toda do lado do
cliente. Um contador de navegações media visitantes novos, não utilização. O que atravessa
sempre é o `meta.json`, que é `NetworkFirst` e é pedido a cada abertura e a cada ronda — e é
esse o sinal de "há alguém com a app aberta". Conta-se **1 em 10** porque o KV gratuito dá
1 000 escritas/dia e uma janela de jogos com 20 telemóveis abertos duas horas faz ~4 800
pedidos de `meta.json`.

**Verificado localmente** com `wrangler pages dev build --kv CONTAGENS`: 100 pedidos de
`meta.json` deram 9 contados → estimativa 90; as navegações de `/`, `/clube`, `/equipa/…` e
`/jogo/…` foram para as chaves certas; o `/contagens` sem chave e com chave errada responde
404; e — o que mais importava — o *fallback* do SPA continua a servir os links directos
(`/equipa/sub-13/parede-fc-a` devolve HTML) com a Function a correr à frente.

**Um alinhamento obrigatório:** as Functions são lidas da pasta `functions/` relativa ao sítio
de onde o `wrangler` corre. O `dados.yml` corria da raiz e o `scripts/aovivo.sh` corre de
`web/`: sem alinhar os dois, um publicava com contador e o outro sem, e quem publica mais
durante uma janela de jogos é o ciclo ao vivo. O passo do workflow passou a
`workingDirectory: web`.

**O que falta, e é do dono** (dois minutos no painel da Cloudflare, e nada chega aos meus
olhos):

1. Criar um *namespace* KV chamado, por exemplo, `hoquei-contagens`.
2. No projecto Pages `hoquei` → *Settings* → *Bindings*, ligar esse namespace com o nome
   **`CONTAGENS`**, em *Production*.
3. Na mesma página, adicionar a variável **`CHAVE_CONTAGENS`** com uma palavra-passe
   inventada. É ela que abre o `/contagens?chave=…&dias=7`; sem ela, o endereço responde 404
   e não admite que existe.

Enquanto isso não existir, o middleware é um `next()` e mais nada — foi escrito assim de
propósito, para poder ser publicado antes do KV e não partir o site se o KV desaparecer.

Domínios grátis, a propósito da pergunta: a Cloudflare **não dá** domínios. Vende-os ao preço
de custo, sem margem — um `.com` ronda os 10,50 USD/ano. Os `.tk`/`.ml` do Freenom deixaram de
ser registados; grátis a sério só restam subdomínios de terceiros como `eu.org`, com aprovação
lenta e um nome que ninguém diz ao telefone num pavilhão.

### P11.9 — o que estava no ⋮, e onde ficou

O ⋮ era um link directo para `/mais`, e `/mais` tinha cinco blocos: ficha técnica dos dados,
aviso de site não oficial, guia, resumo de privacidade e nomes de atletas. Três naturezas
diferentes — uma preferência, uma ficha técnica e duas páginas legais — num ecrã só, porque
tudo o que não tinha casa acabava ali.

Agora o ⋮ abre um menu de cinco linhas em três grupos, escolhidas pelo dono a 06/10/2026:

| Linha | Onde vive |
|---|---|
| Ver o guia outra vez | acção — navega para `/` e arranca o `guia` |
| Dar uma opinião | acção — abre o painel de crítica, agora com o estado em `critica.svelte.ts` |
| Aparência | **dentro do menu**, três botões, sem ecrã próprio |
| Sobre a app e os dados | `/mais`, reduzido a duas secções: os números e o aviso de site não oficial |
| Política de privacidade | `/privacidade` |

Duas coisas que ficaram **de fora** e porquê:

- **Termos de utilização.** A linha existia na proposta e o dono não a escolheu. Fica sem
  página até haver texto — e o texto é decisão dele, não minha.
- **Nomes de atletas.** Tinha linha própria na proposta e não ficou: a `/privacidade` já diz
  o mesmo por extenso, com o compromisso e o endereço. Dois textos a dizer a mesma coisa
  divergem no dia em que um deles mudar, e o resumo em `/mais` foi apagado.

A **lupa não entra no menu**: esconder navegação primária atrás de um menu corta a descoberta
a metade (`docs/04-benchmarking.md`).

Uma consequência a registar: a atribuição à APL passou de um toque para dois — ⋮ → *Sobre a
app e os dados*. O que foi dito à associação é que a aplicação a identifica como fonte, e
continua a identificá-la; o "em todas as páginas" era regra nossa, não promessa.

### P11.10 — a política de privacidade tinha deixado de ser verdade

Ela enumerava **uma** chave em `localStorage`, `hoquei:favoritos:v1`, e o comentário no topo
do ficheiro dizia "uma única chave". Medido a 06/10/2026: eram **duas**. O guia guarda
`guia-visto` desde 06/10 e eu não corrigi a página no mesmo commit — que é exactamente o que
a regra "código e documento no mesmo commit" existe para impedir. O interruptor de tema
trouxe a terceira.

Estão as três na página, cada uma com o que guarda. Fica também anotada a inconsistência que
não corrigi: a chave do guia é `guia-visto` e as outras duas são `hoquei:…:v1`. Renomeá-la
reporia o guia a toda a gente que já o viu — e isso é uma decisão sobre o produto, não uma
arrumação de nomes.

### P11.11 — um FAQ antes de haver perguntas · ✅ feito a 09/10/2026

**Como ficou:** `/ajuda`, treze perguntas em acordeão, e a sexta linha no menu do ⋮ acima de
"Sobre a app e os dados". As perguntas vivem em `web/src/lib/ajuda.ts` — **em dados e não
dentro do componente, para poderem ser testadas.**

O critério de aceitação dizia "as que dependem de coisas que vão mudar dizem onde vive a
verdade — senão o FAQ apodrece sem ninguém notar". Isso passou de intenção a teste, e são
cinco:

* **cada caminho interno de cada resposta é uma rota que existe.** As rotas são lidas do disco
  e não escritas no teste: uma lista copiada para um teste tem o mesmo problema que o teste
  tenta resolver;
* **a resposta da cadência não escreve números.** Diz *como* funciona — "durante um jogo, de
  meio em meio minuto" é a única excepção, e é a frase que um humano precisa — e manda quem a
  lê à hora a sério em `/mais`. O teste recusa um `\d+ segundos` ali;
* o endereço de contacto vem do `contacto.ts` e não escrito à mão;
* dez a quinze perguntas: o limite de cima é a regra do pedido, o de baixo é para não se
  esvaziar sem se dar conta;
* nenhuma repetida, e todas acabam em interrogação.

A resposta nova que não estava na tabela de candidatas: **"num dia sem jogos não vamos buscar
nada"**, que é a regra de 08/10. E a pergunta "o que é que a app sabe sobre mim" fecha a lista
a apontar para a `/privacidade`, em vez de repetir em resumo o que ela diz por extenso — dois
textos a dizer o mesmo divergem no dia em que um deles mudar.

Verificado a 375×812 nos dois temas, com todas as respostas abertas e os quatro destinos de
link confirmados: `/mais`, `/clube`, `/privacidade` e o `mailto:`.

#### O pedido original

O pedido veio com a ressalva certa: não há perguntas feitas, inventamos as primeiras. Vale a
pena, e o risco é conhecido — um FAQ escrito do lado de dentro responde ao que **nós** achamos
que se pergunta, e o sinal de que acertámos ou não só chega das pessoas. Duas regras que saem
daí:

1. **Começar curto.** Dez perguntas, não trinta. Uma lista comprida de perguntas que ninguém
   fez é trabalho a mais e, pior, esconde as três que importam.
2. **Revisitar depois do primeiro grupo de testes** (L7.6/L7.7) e do que chegar pelo botão de
   opinião. O que lá estiver a 06/10/2026 é um ponto de partida, não a versão final.

**Onde vive:** página própria, `/ajuda`, e uma sexta linha no menu do ⋮ (P11.9) — "Perguntas
frequentes", acima de "Sobre a app e os dados". É texto mostrado ao utilizador, logo não toca
no contrato de dados `/v1/...`.

**Critério de aceitação:** a página existe, abre do menu, cada resposta é verdadeira à data e
as que dependem de coisas que vão mudar dizem onde vive a verdade — senão o FAQ apodrece sem
ninguém notar.

As candidatas, com a fonte da resposta já identificada (é o que torna a escrita rápida e
honesta):

| Pergunta | A resposta vem de | Apodrece? |
|---|---|---|
| De quanto em quanto tempo actualiza? | `dados.yml` e o ciclo ao vivo: 30 s durante os jogos, duas horas aos fins de semana, seis nos dias úteis | sim, se a cadência mudar |
| Isto é oficial? | não — `/mais`, secção "Este site não é oficial" | não |
| Porque é que falta um jogo, ou um resultado está errado? | republicamos o que a fonte publica, tal como lá está; o caminho é escrever-nos | não |
| Porque é que a classificação dos Escolares e Benjamins diz "não oficial"? | a fonte não a publica; calculamo-la nós desde 07/10/2026, com o rótulo (B9.14/B9.15) | não |
| Como sigo as minhas equipas, e como as mudo depois? | `O Meu Clube` — o ecrã de escolha de emblemas | não |
| Dá para instalar no telemóvel? | é uma PWA: "Adicionar ao ecrã principal" | não |
| Funciona sem rede? | sim, com o que já foi lido — `/privacidade` descreve a cópia local | não |
| Há notificações? | ainda não; é a Fase 5 e depende da base de dados | **sim** |
| Porque é que aparecem nomes de atletas de formação, e como peço a remoção de um? | `/privacidade`, secção "Nomes de atletas — a parte séria" | não |
| O que são as séries de um campeonato regional? | W5.22 e a vista agregada | não |
| Porque é que o meu clube aparece com o nome estranho ou repetido? | grafias erradas na fonte: medido a 05/10, 3 em 86 (B1.13) | **sim**, quando B1.13 for feito |
| Tem custos ou publicidade? | não tem, nem conta | não |

Ficam **de fora** por agora, e de propósito: qualquer pergunta sobre notificações por clube,
histórico de épocas anteriores ou exportação de dados. Não existem, e um FAQ que explica o
que não há parece um roteiro de promessas.

---

## O regulamento da APL, lido de uma ponta à outra (10/10/2026)

O dono recebeu de um amigo treinador o *Regulamento Geral de Hóquei em Patins da APL, V11
2026*, e pediu que fosse lido na íntegra com atenção à página 93. Duas coisas saíram de lá
que o código fazia de outra maneira — uma porque adivinhávamos, e outra porque eu tinha
avaliado mal o que a fonte publica.

### 1. O desempate das classificações estava errado, e nós sabíamos

O `tabela.py` ordenava por `pontos → diferença de golos → golos marcados → nome`, e o próprio
comentário do módulo dizia, por escrito, que o regulamento "quase de certeza manda ver o
confronto directo primeiro" mas que não havia caso que distinguisse as duas regras. O
Artigo 7.º responde:

| 7.4.1 / 7.5.1 | pontos nos jogos realizados entre as equipas empatadas |
| 7.4.2 / 7.5.2 | diferença de golos nesses mesmos jogos |
| 7.4.3 / 7.5.3 | diferença de golos em toda a fase da prova |
| 7.5.4 | quociente entre as que ainda estão empatadas |
| 7.4.4 / 7.5.5 | quociente geral na fase |

**Golos marcados não é critério nenhum.** Era nosso.

Os pontos 4 (duas equipas) e 5 (três ou mais) parecem regras diferentes e dão a mesma chave
de ordenação: num par, se o confronto directo empata em pontos *e* em diferença, então a
diferença é zero dos dois lados, logo marcaram o mesmo e o quociente entre ambas é 1. O 7.5.4
é vazio num par, e por isso há uma função e não duas.

**A fonte não aplica o Artigo 7.º — medido.** Das 42 tabelas que a APL publica, duas ordenam
ao contrário do regulamento, e as duas pelo mesmo motivo:

* Torneio de Abertura sub-17, série C: AD OEIRAS B (12-6, racio 2.00) à frente de CD PAÇO
  ARCOS B (10-4, racio 2.50). Empatam em pontos, o confronto directo foi 4-4 e a diferença é
  +6 para ambas; pelo 7.4.4 decide o quociente, e o melhor é o do Paço de Arcos.
* Campeonato regional sub-17, série F: HC PORTIMÃO (4-3, 1.33) à frente de HC VASCO GAMA
  (3-2, 1.50).

Nos dois casos a fonte põe primeiro quem marcou mais golos — e publica, na coluna ao lado, o
rácio que a contradiz. Por isso o módulo tem duas ordens: a do regulamento, para as tabelas
que **nós** publicamos (onde a APL não publica nenhuma, e a regra que vale é a escrita), e
`_como_a_fonte`, que só o teste de reprodução usa, para continuar a provar que a nossa
**contagem** bate certo com as 42 tabelas dela.

### A armadilha: o confronto directo é um critério de fim de fase

O Artigo 7.º 4 abre com "no caso de empate pontual entre duas equipas **no final de qualquer
fase**". Ignorei essa frase na primeira implementação e os dados apanharam-me logo: com a
época em duas jornadas, aplicar a mini-tabela a meio da fase **tirava o CD BOLIQUEIME do 1.º
para o 3.º lugar da série F com 12-0 de diferença**, só porque ainda não tinha jogado com os
outros três empatados, enquanto o HC VASCO GAMA subia a 1.º por ter ganho a um deles. Três
das quatro divergências que a primeira versão produzia eram isto, e não o regulamento.

A regra ficou: a mini-tabela só conta quando **todos os pares** do grupo empatado já jogaram
entre si. Enquanto faltar um jogo, o critério não é determinável e a ordem cai para a
diferença de golos na fase — que é também o que a fonte mostra. Com a condição, as
divergências passaram de quatro para duas, e as duas que ficaram são a diferença real entre
golos marcados e quociente.

### 2. O Mérito da Formação é computável — eu disse que não era, e enganei-me

O Artigo 92.º (páginas 92 e 93) pontua os clubes dos Encontros Distritais de Escolares e
Benjamins por coisas que não são o resultado: +1 por cada atleta que participa, +3 a quem
marca mais golos, +1 pela equipa completa (2 GR e 8 JC); e tira pontos por apresentar menos
de 8 atletas, por levar um só guarda-redes, e por pôr um atleta a fazer três meias partes
(-1, ou -3 numa equipa com mais de 8) ou as quatro (-4).

**Eu disse ao dono que isto não era calculável**, porque a participação por período vivia na
"Folha de Controlo de Jogo" em papel. Ele corrigiu-me, apontando a tab do boletim na própria
ficha de jogo. Tinha razão, e a avaliação estava errada em dois sítios ao mesmo tempo:

* a grelha `5I` do `#acta` marca com um `X` as meias partes em que cada atleta entrou;
* esse `#acta` vem **dentro do HTML que já descarregamos** em cada ficha — o `partido.asp`
  redirecciona para o `partido2.asp` e o cliente segue redireccionamentos. São 47 KB por
  jogo que estávamos a deitar fora.

**Custo de passar a usá-lo: zero pedidos novos.** A única despesa foi única e medida: 27
pedidos, um por cada jogo já disputado nas oito provas, para preencher a chave `merito` nas
fichas que já estavam em cache. Pedir o campo em todas as provas custaria 260 — o Artigo 92.º
não se aplica aos outros escalões, e o `vale_merito` é quem evita isso.

Das 27 fichas, 26 tinham boletim. A que falta (FSE/AJ SALESIANA B–CACO B) aparece contada no
ficheiro da prova como `jogos_sem_boletim`, e a app di-lo por extenso em vez de calar.

### Porque é que a grelha por criança nunca é publicada

Ela diz que período é que o filho de alguém jogou. O `parsers/participacao.py` lê-a, o
`merito.py` agrega-a ao nível da equipa, e **mais nada sai**. Três testes guardam a linha: dois
no `test_privacidade.py` do raspador e um no `merito.test.ts` da app, que percorre os
ficheiros publicados e falha se algum trouxer `periodos`, `numero` ou `licenca`.

A amostra de testes obrigou a mudar o `anonimizar_ficha.py`: ele **removia** o `#acta` por ser
o bloco com mais dados pessoais, e agora anonimiza-o em vez de o cortar. Cortar protegia os
dados e apagava a estrutura; trocar os trinta nomes por pseudónimos protege os dados e guarda
a estrutura, que é o que um parser precisa de ter debaixo dos pés. Ganhou também um
`--de-ficheiro`, para regerar uma amostra **sem** ir outra vez ao servidor da associação.

### As duas aproximações, ditas à vista

1. **O 4.1.7 não é aplicado.** São -6 pontos e a perda das bonificações por um atleta fazer um
   só período, "excepto em caso de lesão ou situação impeditiva comprovada pelo árbitro" — e
   essa comprovação é texto escrito no boletim em papel. Detectamos o caso, marcamo-lo como
   por confirmar, e **não descontamos**: penalizar uma equipa que levou um miúdo ao hospital
   seria pior do que uma tabela incompleta. Nos 26 jogos lidos não houve nenhum caso.
2. **Os cartões a não atletas (4.2) ficam de fora.** As colunas de disciplina do boletim são
   dos atletas; as do banco não existem na grelha.

E duas leituras literais que podem vir a ser discutidas: o 4.1.4 e o 4.1.5 **somam-se** numa
equipa com mais de 8 atletas (três seguidas são também três, -1 e -2, -3 ao todo), e quem faz
as quatro meias partes fica de fora do 4.1.3/4.1.5 por ter regra própria, mais pesada, no
4.1.6.

### O que as tabelas mostram, e a pergunta que fica para o dono

A conta funciona e os números são coerentes — um jogo bem corrido dá 11 a quem perde e 14 a
quem ganha, e a diferença entre as duas é exactamente os 3 pontos dos golos. Mas há equipas a
aparecer com pontuação negativa: o SPORTING CP dos Benjamins fez -11 num jogo por ter levado
6 atletas, quatro dos quais tiveram de fazer as quatro meias partes (-16). Não é um erro de
cálculo: é o Artigo 92.º a funcionar exactamente como foi escrito, porque com 6 atletas e 5
em pista é aritmeticamente impossível cumprir o rodízio.

**Isto é uma tabela pública, não oficial, que pode expor clubes.** A decisão de a mostrar é do
dono, e o interruptor é a aba: sem ela, tudo o resto fica igual.

### Onde ficou

| | |
|---|---|
| `scraper/src/hoquei/parsers/participacao.py` | lê a grelha `5I`; nada do que sai daqui é publicado |
| `scraper/src/hoquei/merito.py` | o Artigo 92.º, com as regras citadas artigo a artigo |
| `scraper/src/hoquei/tabela.py` | `_ordenar` (Artigo 7.º) e `_como_a_fonte` (só para o teste) |
| `web/static/v1/.../merito/<id>.json` | ficheiro novo, um por prova — não uma chave no `comp/` |
| `web/src/lib/TabelaMerito.svelte` | a tabela; o chapéu e a legenda são componentes à parte |
| `docs/09-regulamento-apl.md` | os artigos que o código cita, para não ser preciso abrir o PDF |

Testes: 243 no raspador (eram 188) e 172 na app (eram 161).
## O endereço de testes partilhado por engano (10/10/2026)

O dono partilhou `testes.hoquei.pages.dev` em vez de `hoquei.pages.dev` e ficou com pessoas a
usar o site errado. A primeira reacção — a minha e a dele — foi tratar isto como um problema
de endereço. Não é.

**Um site de ramo serve os dados do último commit, e nunca os do ciclo ao vivo.** Medido nesse
dia, às 13:40, com 36 jogos a decorrer e mais 39 no dia seguinte:

| site | dados de | atraso |
|---|---|---|
| `hoquei.pages.dev` | 10/10 12:37, `ao_vivo: true` | — |
| `versoes` e `regulamento` | 09/10 23:40 | 13 h |
| `testes` | 09/10 10:49 | **26 h** |

Quem seguiu aquele link não via **nenhum** dos 36 jogos do dia. Não era o endereço errado: era
a app a mentir a quem tinha um filho em campo.

### Porque é que a tranca é nossa e não o Cloudflare Access

A pergunta do dono foi se dava para ligar ao IAM da Google e escolher os contactos. Dá: o
Cloudflare Access faz isso, o plano gratuito do Zero Trust cobre 50 pessoas, o Google é um dos
métodos de entrada, e o Pages tem um `Enable access policy` que protege só as publicações de
pré-visualização. Confirmado na documentação, e continua a ser a escolha certa **se** um dia o
que se quiser for identidade a sério em vez de uma chave partilhada.

Para isto não serve, e por uma razão que não é técnica: o Access mostra a página de "acesso
negado" **dele**. Quem aqui chega por engano é precisamente a pessoa que mais precisa de uma
indicação, e essa página não lhe diz para onde ir. A nossa porta é a mesma coisa que o aviso:

* em letras grandes, que os resultados ali estão parados, e um botão para o site a sério com
  **o mesmo caminho** em que a pessoa estava — quem abriu um link para uma ficha quer aquela
  ficha, não a página inicial;
* a morada a guardar, escrita por extenso;
* e, pequena e dobrada em baixo, a caixa da chave.

### As duas decisões que não se adivinham a ler o código

**Só as navegações são travadas.** Um pedido que não é navegação — o `sw.js`, o manifesto, um
ficheiro de dados — passa. Parece um buraco e é a parte mais importante do desenho: quem
**instalou** o site de um ramo no telemóvel tem a app servida pela cache do *service worker*,
e os pedidos dessa pessoa nunca chegam à Cloudflare. A única forma de a alcançar é deixar o
service worker actualizar-se, apanhar a versão que traz o `SaidaDoRamo`, desinstalar-se e
mandá-la embora. Travar tudo selava essas pessoas no site errado para sempre, que é
exactamente o que se está a tentar desfazer. E não há secretismo a perder: os dados são os
mesmos que o site a sério publica a quem quiser.

**A porta falha fechada.** Sem `CHAVE_TESTES` definida no ambiente `Preview` não entra
ninguém, nem com cookie forjado. A alternativa — deixar passar quando falta configuração —
transformava um esquecimento no painel numa porta aberta sem aviso nenhum.

### O cookie, e a promessa da página de privacidade

Este é o único cookie do projecto. Nunca é posto em produção — a guarda é o `ehSiteDeRamo`, e
há um teste só para isso — e, mesmo num ramo, só aparece a quem escreveu a chave. A
`/privacidade` continua verdadeira onde é lida: no site que as pessoas usam.

### O teste que interessa

O pior defeito possível aqui não é a porta falhar: é ela apanhar **produção** e fechar a app a
toda a gente. Três testes cobrem esse caso, e foram verificados a sério — pondo o
`ehSiteDeRamo` a devolver `true` para tudo, os três falham e os outros 23 passam.

---

## Próximo incremento (revisto a 05/10/2026)

A lista que estava aqui — publicar no Cloudflare, ecrã de equipa, quadro de marcadores,
boletim — está **toda feita** há semanas. Ficou por actualizar, e um backlog que mente é pior
do que não ter nenhum.

O que falta, por ordem de valor e não de esforço:

| | O quê | Porquê agora | Bloqueio |
|---|---|---|---|
| 1 | **L7.6 + L7.7** — pôr isto na mão de 5–10 pessoas e partilhar nos grupos dos clubes | Dois dias inteiros de polimento numa app que, fora o dono, ninguém usa. O próximo erro a sério vem de um telemóvel que não é o nosso | é contigo |
| 2 | ~~**B9.14/B9.15** — publicar as classificações calculadas~~ | ✅ **feito a 07/10/2026**, por decisão do dono, com o travão à frente e sem resposta da APL. 8 séries, 43 equipas, rótulo de "não oficial" em três ecrãs. Os Torneios Particulares e as Supertaças ficaram **de fora**: são jogos-treino e eliminatórias, e ali uma tabela não quer dizer nada | — |
| 3 | **Movimento quando o resultado muda** | hoje um 2–1 passa a 3–1 e não se nota; é o que falta para o "ao vivo" parecer ao vivo | nenhum |
| 4 | **Fase 9 — a base de dados** (B9.1, B9.3–B9.5, B9.7–B9.11) | memória: jogos antecipados, histórico, e o `events.json` que a Fase 5 assume | nenhum, ~3–4 dias |
| 5 | **Fase 5 — notificações** (~20 itens) | o maior bloco que resta | depende do 4 |
| 6 | **B1.13** — normalizar grafias de clube | medido a 05/10: de 86 nomes, só **3** estão mal — `AE FISICA D (B)`/`AE FISICA D B`, `HC LOURINHA`/`HC LOURINHÃ`, `A STRUART HCM`/`A STUART HCM`. Parte emblemas e junções por nome, mas é pequeno | nenhum, XS |
| 7 | Qualidade: Q6.4 Lighthouse, Q6.5 orçamento de bundle, Q6.9 relatório de erros | nada disto se nota até haver utilizadores | depende do 1 |

**A ordem importa mais do que a lista.** O 1 muda o que vale a pena fazer a seguir; tudo o
resto é adivinhar o que as pessoas vão precisar.
