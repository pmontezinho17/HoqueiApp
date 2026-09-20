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
| W0.7 | Node LTS + `npm create svelte@latest` a correr localmente | must | S | Página em branco no browser em `localhost:5173` |
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
| B1.8 | Parser da classificação (múltiplos grupos) | must | M | aberto (amostra gravada) |
| B1.9 | Parser da ficha de jogo: `#resultado` + `#jugadores` | must | L | ✅ cabeçalho, árbitros, faltas, jogadores e equipa técnica |
| B1.9a | Parser da cronologia `#desarrollo` | must | L | ✅ 11 tipos de evento, 0 por classificar em 9 jogos reais |
| B1.9b | Normalizar o relógio decrescente em minuto absoluto | must | M | ✅ nº e duração das partes lidos da fonte (2×25min, 2×15min, 4×8min confirmados) |
| B1.9c | Parser do boletim oficial `#acta` | could | L | aberto |
| B1.9d | Flag `has_timeline` por jogo | should | XS | ✅ `FichaJogo.tem_cronologia` |
| B1.10 | Modelo normalizado + escrita dos JSON do contrato | must | M | parcial (falta jogo/classificação) |
| B1.11 | Testes do parser contra amostras | must | M | ✅ 24 testes, sem rede |
| B1.12 | Deteção de mudanças por hash | should | S | aberto |
| B1.13 | Normalização de nomes de clubes + slug estável | should | M | aberto |
| B1.14 | GitHub Action com cron (15 min na época, 1x/dia fora) | must | M | aberto |
| B1.15 | Publicação dos JSON **no mesmo domínio da PWA** (Cloudflare Pages) | must | M | aberto — ver nota |
| B1.16 | `meta.json` com `generated_at` e estado | must | XS | aberto |
| B1.17 | Alerta de quebra do parser | should | S | aberto |
| B1.18 | Backfill de temporadas anteriores | could | M | aberto |
| B1.19 | Crawl incremental das fichas de jogo | must | M | aberto |
| B1.20 | Agregação de marcadores → `scorers.json` | should | L | aberto |
| B1.21 | Filtro RGPD: sem estatística individual abaixo de sub-17 | must | S | aberto |

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
| W2.1 | Projeto SvelteKit + `adapter-static` + TypeScript | must | S | `npm run build` produz estáticos |
| W2.2 | Tipos TS espelhando o contrato de dados | must | S | Um JSON de amostra tipa sem erros |
| W2.3 | Carregar `comp/{id}.json` num `load` e listar os jogos | must | M | Lista real no browser |
| W2.4 | Os 3 estados: a carregar / erro / conteúdo | must | M | Desligar a rede mostra o erro, não um ecrã em branco |
| W2.5 | Componente `JogoLinha` (equipas, resultado, data/hora, recinto) | must | M | Jogo agendado mostra hora; disputado mostra resultado |
| W2.6 | Agrupamento por jornada, com a jornada atual em foco ao abrir | must | M | Abre posicionado na jornada em curso |
| W2.7 | **Mobile-first**: legível e utilizável a 360px sem scroll horizontal | must | M | DevTools em 360×640 sem overflow |
| W2.8 | `manifest.webmanifest` + ícones + `vite-plugin-pwa` | must | M | Chrome oferece "Instalar"; abre sem barra de endereço |
| W2.9 | Service worker a pré-carregar o shell (offline básico) | must | M | Modo avião: abre e mostra o último estado |
| W2.10 | Publicado em Cloudflare Pages, acessível por URL público | must | S | Abre no teu telemóvel pelo link |
| W2.11 | Tema claro/escuro seguindo o sistema | should | M | Alternar o tema não deixa texto ilegível |

> Ao contrário do plano Android, **no fim da Fase 2 já há um link para partilhar**. Não é preciso
> esperar pela Fase 7 para alguém ver aquilo.

---

## Fase 3 — Núcleo de consulta (~4 dias)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W3.1 | Navegação e rotas: `/jogos`, `/classificacoes`, `/golos`, `/equipa/[id]`, `/jogo/[id]` | must | M | Cada ecrã tem URL próprio e partilhável |
| W3.2 | Barra de navegação inferior (Jogos · Classificações · Golos · O Meu Clube · Mais) | must | M | Navegar e voltar atrás mantém o estado |
| W3.3 | Seletor de competição (nacional, taças, escalões, regional) | must | L | Escolher competição atualiza jogos e classificação |
| W3.4 | Seletor de temporada | should | S | Mudar para 2025/26 mostra dados históricos |
| W3.5 | Ecrã Classificação, com o clube favorito em destaque | must | L | Tabela igual à da fonte; scroll horizontal se não couber |
| W3.6 | Ecrã Detalhe de Jogo com tabs: Resumo · Cronologia · Ficha · Boletim | must | XL | As 4 tabs com dados reais |
| W3.6a | Tab Cronologia: timeline vertical com ícones, separadores de parte, resultado corrente | must | L | Um jogo real mostra os golos em ordem cronológica, com marcador e assistente |
| W3.6b | Tab Ficha: jogadores por equipa (G/AG/D/Pe/LD), equipa técnica, faltas | must | L | Totais coincidem com o resultado |
| W3.6c | Tab Boletim: arbitragem, resultado por parte, prolongamento | could | M | Mostra os parciais e a equipa de arbitragem |
| W3.6d | Esconder a tab Cronologia quando `has_timeline = false` | should | XS | Jogo sem cronologia não mostra a tab |
| W3.7 | Ecrã Equipa: próximos jogos, últimos resultados, posição, plantel | should | L | Chega-se lá clicando no nome da equipa em qualquer sítio |
| W3.8 | Ecrã Golos: melhores marcadores, com filtro por competição | must | L | Top 10 com clube e nº de golos |
| W3.9 | Golos: alternar marcadores / assistências | should | S | Toggle reordena |
| W3.10 | Golos: explicação clara em competições de formação, em vez de lista vazia | must | XS | Sub-13 mostra o motivo |
| W3.11 | Ecrã Sobre: atribuição da fonte, última atualização, versão | must | S | Mostra o `generated_at` do `meta.json` |
| W3.12 | Aviso de dados velhos (> 1h) | should | S | Backend parado mostra o aviso |
| W3.13 | Pré-visualização em partilhas (Open Graph por jogo) | could | M | Colar o link de um jogo no WhatsApp mostra as equipas e o resultado |

> W3.13 não existia no plano Android e é das coisas mais valiosas da web aqui: o link de um jogo
> partilhado num grupo de WhatsApp mostra logo o resultado, mesmo a quem não abrir.

---

## Fase 4 — Favoritos e calendário (~3 dias)

Local-first: funciona sem conta e sem rede depois da primeira visita.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| W4.1 | Escolher **equipas favoritas** na 1ª visita, com pesquisa | must | M | Escolha persiste depois de fechar o browser |
| W4.2 | Persistência em `localStorage` | must | S | Recarregar mantém |
| W4.3 | Favoritos por **clube + escalão**, não só por clube | must | M | Seguir "Paço de Arcos sub-15" não traz os seniores |
| W4.4 | Seguir várias equipas | must | M | Três equipas aparecem todas, ordenadas pelo próximo jogo |
| W4.5 | Ecrã inicial "O Meu Clube": próximo jogo, último resultado, posição | must | L | Abre aqui se já houver favoritos |
| W4.6 | Gerir favoritos nas definições | must | S | Alteração reflete-se de imediato |
| W4.7 | Ecrã Calendário: vista mensal + lista de próximos/anteriores | must | L | Tocar num dia abre os jogos desse dia |
| W4.8 | Calendário de qualquer clube, a partir do ecrã Equipa | must | M | Chega-se ao calendário do Benfica sem o seguir |
| W4.9 | Distinguir casa/fora visualmente | should | S | Nota-se num relance |
| W4.10 | Partilhar jogo ou resultado (Web Share API) | should | S | Abre o menu de partilha nativo do telemóvel |
| B4.11 | **Feed ICS por equipa**: `/v1/{tenant}/{season}/team/{id}.ics` | must | M | Subscrever o URL no Google Calendar mostra todos os jogos |
| W4.12 | Botão "Adicionar ao meu calendário" com o URL do feed + instruções | must | M | Um toque e os jogos entram no calendário do utilizador |
| W4.13 | Descarregar um jogo isolado como `.ics` | should | S | Ficheiro abre no calendário com data, hora e recinto |
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
| Q6.10 | CI: build + testes + Lighthouse em cada push | should | M | PR mostra o resultado |
| Q6.11 | Testado em Safari iOS e Chrome Android reais, não só no emulador | must | M | Sem bug de layout em nenhum |

---

## Fase 7 — Lançamento (~1 dia)

Muito mais leve do que o plano Android: sem loja, sem revisão, sem conta de programador.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| L7.1 | **Contactar FPP/APL**: informar, pedir autorização dos dados e dos logótipos | must | S | Resposta escrita arquivada |
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

---

## Próximo incremento

```
B1.8            parser da classificação (amostra gravada)
W0.7  + W2.1    esqueleto SvelteKit a correr localmente
W2.3  + W2.5    primeira lista de jogos reais no browser
W2.8  + W2.10   instalável e publicada num URL
```

Ao fim disto existe **um link para partilhar** com jogos reais, que qualquer pessoa abre no
telemóvel e instala. No plano Android isso só acontecia na Fase 7.

**Estimativa total até um lançamento útil: ~2,5 semanas** (era ~4 no plano nativo), e as Fases 0–4
(~1,5 semanas) já dão um site completo sem nada com estado.
