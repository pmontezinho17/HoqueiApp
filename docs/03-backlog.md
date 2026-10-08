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

### P11.11 — um FAQ antes de haver perguntas

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
