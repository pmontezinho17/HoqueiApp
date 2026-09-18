# Backlog — App de Hóquei em Patins (Android)

## Como ler este backlog

- **IDs**: `B` = backend/dados, `A` = app Android, `Q` = qualidade, `L` = lançamento.
- **Estimativas** (calibradas para quem está a aprender mobile, não para um sénior):
  `XS` < 1h · `S` 1–3h · `M` ~meio dia · `L` 1–2 dias · `XL` > 2 dias.
- **Cada item tem um critério de aceitação verificável.** Se não se consegue testar, não está pronto.
- As fases estão ordenadas para que **no fim de cada uma haja algo que funciona e se pode ver**.
  Não avançar de fase com itens `must` da fase anterior abertos.
- `must` = a app não faz sentido sem isto · `should` = falta notar-se · `could` = extra.

**Regra de ouro para a primeira app:** a Fase 2 existe para atravessar toda a stack com o mínimo
possível (1 ecrã, 1 lista, dados reais). Só depois se acrescenta largura. Resistir à tentação de
construir 8 ecrãs antes de o primeiro funcionar.

---

## Fase 0 — Preparação (~1 dia)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| B0.1 | Instalar Android Studio + SDK + criar emulador (Pixel, API 34) | must | S | Emulador arranca e mostra o ecrã inicial do Android |
| B0.2 | Correr o template "Empty Compose Activity" no emulador | must | XS | Aparece "Hello Android" no emulador |
| B0.3 | Correr a mesma app no telemóvel Android físico via USB (modo desenvolvedor) | must | S | A app abre no telemóvel real |
| B0.4 | Estrutura do repositório (`/scraper`, `/android`, `/docs`, `/data-samples`) + `.gitignore` | must | XS | `git status` limpo depois do primeiro commit |
| B0.5 | Guardar amostras de HTML da fonte em `/data-samples`: lista de competições, calendário, classificação e **três fichas de jogo** — um jogo de seniores (2 partes), um de formação (4 partes) e um jogo suspenso/sem cronologia | must | M | 6 ficheiros `.html` no repo, usados depois nos testes do parser |
| B0.6 | Descobrir os subdomínios das restantes associações regionais em `*.assyssoftware.es` | could | S | Lista documentada em `docs/01-fonte-de-dados.md` |

> B0.5 é mais importante do que parece: permite testar o parser sem bater no servidor da federação
> e detetar quando o HTML muda (o teste falha contra a amostra nova).

---

## Fase 1 — Backend: scraper + JSON (~3–4 dias)

Objetivo: no fim da fase existe um URL público que devolve JSON limpo com os jogos reais.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| B1.1 | Projeto Python (`uv`/`venv`), `httpx`, `selectolax`, `pytest` | must | S | `pytest` corre (sem testes ainda) |
| B1.2 | Cliente HTTP com rate limit (1 req/s), retries, timeout, `User-Agent` identificável | must | S | 20 pedidos sequenciais sem erro e sem exceder 1 req/s |
| B1.3 | Tratamento de encoding por endpoint (UTF-8 vs ISO-8859-1 no `partido.asp`) | must | S | "CD PAÇO ARCOS" lido corretamente das duas origens |
| B1.4 | Parser: temporadas (`<select id="temporada">`) por tenant | must | S | Devolve `[{id:10,label:"2025/2026"}...]` para a FPP e `[{id:4,...}]` para APLisboa |
| B1.5 | Parser: lista de competições (`?seccion=competiciones`) com escalão/categoria | must | M | 46 competições da FPP em 2025/26, com `id_comp` e categoria |
| B1.6 | Parser: calendário (`?seccion=calendario`) — jornadas, data, hora, equipas, resultado, recinto, `id_jogo` | must | L | Todos os jogos do `id_comp=300` extraídos; jogos sem resultado marcados como agendados |
| B1.7 | Parser: equipas de uma competição (`div#equipos`) — id, nome, logo | must | S | 16 equipas da Taça Jesus Correia com `id_equipo` |
| B1.8 | Parser: classificação (`?seccion=clasificacion`), com suporte a múltiplos grupos | must | M | Tabela do `id_comp=300` igual à do site, incluindo GA e GM/GS |
| B1.9 | Parser: ficha de jogo (`partido.asp?id=`), bloco `#resultado` + `#jugadores` — resultado, faltas de equipa, estado, árbitros, estatística por jogador | should | L | Ficha do jogo `6873` reproduzida por completo |
| B1.9a | Parser: cronologia `#desarrollo` — golos com marcador/assistente/resultado corrente, faltas de equipa numeradas, descontos de tempo, livres diretos, início/fim de parte | should | L | Jogo `8627` devolve 12 eventos na ordem correta (a fonte lista do mais recente para o mais antigo — inverter) |
| B1.9b | Normalizar o relógio da cronologia: converter o tempo decrescente por parte em minuto absoluto de jogo, com nº e duração de partes variável por escalão | should | M | Golo aos `6:01` da 1ª parte de um jogo de escolares (4×8min) → minuto 2; num jogo de seniores (2×25min) → minuto 19 |
| B1.9c | Parser: boletim oficial `#acta` — equipa de arbitragem completa, resultado por parte/prolongamento/grandes penalidades, horas reais, posição e presença por parte, suspensões e expulsões | could | L | Boletim do jogo `8627` reproduzido; parciais 4+2=6 conferem com o resultado final |
| B1.9d | Flag `has_timeline` por jogo, para a app saber se vale a pena abrir o ecrã de cronologia | should | XS | Jogos antigos sem cronologia vêm com `false` |
| B1.19 | Crawl incremental das fichas de jogo: só buscar `partido.asp` de jogos novos ou cujo resultado mudou desde a última execução | must | M | 2ª execução seguida faz 0 pedidos a `partido.asp` |
| B1.20 | Agregação de marcadores por competição/equipa/temporada → `scorers.json` (golos, assistências, jogos, média) | should | L | Top 10 do Nacional Placard confere com a soma manual de 3 jornadas |
| B1.21 | Filtro RGPD na agregação: escalões abaixo de sub-17 não geram estatísticas individuais | must | S | `scorers.json` de uma competição de escolares vem vazio com `reason: "age_restricted"` |
| B1.10 | Modelo de dados normalizado (dataclasses/pydantic) + escrita dos JSON de `docs/02` | must | M | Ficheiros gerados validam contra o esquema |
| B1.11 | Testes do parser contra as amostras de B0.5 | must | M | `pytest` verde; alterar 1 byte na amostra faz falhar |
| B1.12 | Deteção de mudanças por hash — só reescrever ficheiro se o conteúdo mudou | should | S | Segunda execução seguida não produz diffs |
| B1.13 | Normalização de nomes de clubes (`SL BENFICA` → `SL Benfica`) + slug estável | should | M | Mesma equipa em competições diferentes tem o mesmo slug |
| B1.14 | GitHub Action com cron (a cada 15 min na época, 1x/dia fora dela) | must | M | Action corre sozinha e comita JSON alterado |
| B1.15 | Publicação dos JSON num URL público (R2/Pages ou raw+CDN) com CORS e cache curto | must | M | `curl` ao URL devolve JSON válido |
| B1.16 | `meta.json` com `generated_at`, versão do parser e estado | must | XS | Campo `generated_at` atualiza a cada execução |
| B1.17 | Alerta de quebra do parser (Action falha → email/notificação) | should | S | Sabotar a amostra faz chegar o alerta |
| B1.18 | Backfill de temporadas anteriores (FPP tem desde 2016/17) | could | M | JSON de 2024/25 gerado e acessível |

> **Nota de volume (importante para B1.19):** as fichas de jogo são o único sítio onde o crawl
> cresce. 46 competições na FPP × dezenas de jornadas dá alguns milhares de páginas de ~80 KB por
> temporada. A 1 req/s isso é horas — inaceitável a cada 15 minutos. Por isso B1.19 é `must` e não
> `should`: em regime normal só há que buscar as fichas dos jogos que acabaram de ser disputados
> (algumas dezenas por fim de semana). O backfill histórico (B1.18) corre uma vez, devagar, à noite.

---

## Fase 2 — Primeira app a funcionar de ponta a ponta (~2–3 dias)

Objetivo: **um único ecrã** com jogos reais vindos do backend. É aqui que se aprende Compose.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| A2.1 | Projeto Android: Kotlin, Compose, min SDK 26, Gradle KTS | must | S | Compila e corre |
| A2.2 | Retrofit/Ktor + `kotlinx.serialization` + modelos de dados espelhando o JSON | must | M | Teste unitário desserializa um JSON de amostra |
| A2.3 | Permissão de INTERNET + primeiro GET real ao backend, resultado num log | must | S | Logcat mostra o número de jogos recebidos |
| A2.4 | `ViewModel` + `StateFlow` com os 3 estados: loading / erro / conteúdo | must | M | Os 3 estados são atingíveis (desligar o Wi-Fi mostra o erro) |
| A2.5 | Ecrã "Resultados": `LazyColumn` de jogos agrupados por jornada | must | L | Lista real no emulador, com scroll fluido |
| A2.6 | Componente `MatchRow` (equipas, resultado, data/hora, recinto) | must | M | Jogo agendado mostra hora; jogo terminado mostra resultado |
| A2.7 | Pull-to-refresh | should | S | Gesto recarrega e o indicador desaparece no fim |
| A2.8 | Estado vazio ("sem jogos nesta jornada") e mensagem de erro com botão "tentar de novo" | must | S | Ambos visíveis sem crashar |
| A2.9 | Tema base (cores, tipografia, Material 3) + modo escuro | should | M | Alternar o tema do sistema não deixa texto ilegível |

---

## Fase 3 — Núcleo de consulta (~4–5 dias)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| A3.1 | Navegação (Navigation Compose) + bottom bar: Jogos · Classificações · Golos · O Meu Clube · Mais | must | M | Navegar entre os 5 e voltar atrás mantém o estado |
| A3.2 | Seletor de competição (nacional 1ª/2ª/3ª, taças, escalões, regional) | must | L | Escolher competição atualiza jogos e classificação |
| A3.3 | Seletor de temporada | should | S | Mudar para 2024/25 mostra dados históricos |
| A3.4 | Ecrã Classificação com tabela ordenável e destaque do clube favorito | must | L | Tabela igual à do site; scroll horizontal se não couber |
| A3.5 | Ecrã Detalhe de Jogo com tabs: **Resumo · Cronologia · Ficha · Boletim** | must | XL | Abrir um jogo terminado mostra as 4 tabs com dados reais |
| A3.5a | Tab Cronologia: timeline vertical de eventos com ícones (golo, falta, desconto de tempo), separadores de parte e resultado corrente | must | L | Jogo `8627` mostra os 6 golos em ordem cronológica, com marcador e assistente |
| A3.5b | Tab Ficha: tabela de jogadores por equipa (G/AG/D/Pe/LD), equipa técnica, faltas de equipa | must | L | Totais por equipa coincidem com o resultado |
| A3.5c | Tab Boletim: arbitragem, resultado por parte, prolongamento/grandes penalidades | could | M | Mostra os 4 parciais e a equipa de arbitragem |
| A3.5d | Esconder a tab Cronologia quando `has_timeline = false`, em vez de mostrar um ecrã vazio | should | XS | Jogo sem cronologia não mostra a tab |
| A3.6 | Ecrã Equipa: próximos jogos, últimos resultados, posição, plantel | should | L | Chegar lá clicando no nome da equipa em qualquer sítio |
| A3.7 | Navegação por jornada (anterior/seguinte) com scroll automático para a jornada atual | should | M | Ao abrir, a app posiciona-se na jornada em curso |
| A3.8 | Ecrã "Sobre": atribuição da fonte, última atualização, versão | must | S | Mostra `generated_at` do `meta.json` |
| A3.9 | Indicador visível de "dados de há X min" quando os dados estão velhos (> 1h) | should | S | Simular backend parado mostra o aviso |
| A3.10 | **Ecrã Golos** — quadro de melhores marcadores da competição (golos, assistências, jogos, média), com filtro por competição e equipa | must | L | Top 10 do Nacional Placard com foto/iniciais, clube e nº de golos |
| A3.11 | Golos: alternar entre "melhores marcadores" e "melhores assistências" | should | S | Toggle reordena a lista |
| A3.12 | Golos: mensagem clara em competições de formação ("não disponível em escalões de formação") em vez de lista vazia | must | XS | Escolher uma competição de sub-13 mostra a explicação |

---

## Fase 4 — Equipas favoritas e calendário (~4 dias)

Tudo local-first: funciona sem conta e sem rede depois da 1ª sincronização.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| A4.1 | Onboarding: escolher **equipas favoritas** na 1ª abertura, com pesquisa por nome de clube | must | M | Escolha persiste depois de fechar a app |
| A4.2 | Persistência local de preferências (DataStore) | must | S | Reinstalar limpa; reabrir mantém |
| A4.3 | **Favoritos por clube+escalão**, não só por clube (ex. só os sub-15 do Paço de Arcos) | must | M | Seguir "Paço de Arcos sub-15" não traz os jogos dos seniores |
| A4.4 | Seguir várias equipas ao mesmo tempo | must | M | Três equipas seguidas aparecem todas no ecrã inicial, ordenadas por data do próximo jogo |
| A4.5 | Ecrã inicial "O Meu Clube": próximo jogo em destaque, último resultado, posição na tabela | must | L | Abre direto neste ecrã se já houver favoritos |
| A4.6 | Gerir favoritos nas definições (adicionar/remover/reordenar) | must | S | Alteração reflete-se imediatamente |
| A4.7 | **Ecrã Calendário**: vista mensal com os jogos das equipas seguidas, e vista de lista com "próximos" / "anteriores" | must | L | Mês de outubro mostra os jogos nos dias certos; tocar num dia abre a lista |
| A4.8 | Calendário de qualquer clube (não só dos favoritos), a partir do ecrã Equipa | must | M | Chegar ao calendário do Benfica sem o seguir |
| A4.9 | Destaque visual de jogos em casa vs fora, e do recinto | should | S | Jogo em casa distingue-se num relance |
| A4.10 | Partilhar resultado ou jogo (texto + link) | could | S | Sheet de partilha nativa abre com texto correto |

### Exportar para o calendário do telefone

Duas abordagens, e **recomendo fazer as duas** — resolvem problemas diferentes:

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| B4.11 | **Feed ICS por equipa** gerado pelo backend: `/v1/{tenant}/{season}/team/{id}.ics` | must | M | Subscrever o URL no Google Calendar mostra todos os jogos da equipa |
| A4.12 | Botão "Subscrever no Google Calendar" que abre o feed ICS da equipa | must | S | Um toque e os jogos aparecem no calendário do utilizador |
| A4.13 | Adicionar **um** jogo ao calendário via Intent do Android (sem permissões) | should | S | Evento criado com data, hora, equipas e recinto |
| A4.14 | Adicionar **todos** os jogos de uma equipa/escalão ao calendário local, num calendário próprio da app | should | L | Cria um calendário "Hóquei — Paço Arcos sub-15" com N eventos, sem duplicar em execuções repetidas |

> **Porque é que o feed ICS é a melhor peça deste bloco:** um feed subscrito atualiza-se **sozinho
> para sempre**. Quando a federação adia um jogo, o Google Calendar do utilizador corrige-se no
> próximo refresh, sem a app fazer nada, sem permissões de calendário, e mesmo que o utilizador
> desinstale a app. O custo é ~meio dia de trabalho no backend. A escrita direta no calendário
> (A4.14) só vale para quem quer os jogos offline no calendário local, e traz permissões,
> deduplicação e sincronização de alterações — muito mais trabalho por menos benefício.
>
> ⚠️ Nota: o ICS auto-atualiza **sem** pedir confirmação ao utilizador, o que colide com o pedido
> de "alteração após confirmação". Ver a nota na Fase 5 — as duas coisas coexistem, mas em canais
> diferentes.

---

## Fase 5 — Notificações e conta Google (~5–6 dias)

> **É aqui que a arquitetura muda.** Até à Fase 4 tudo é JSON estático num CDN: nada com estado,
> zero custo, nada para manter. Notificações e contas obrigam a guardar tokens e preferências de
> utilizadores — passa a haver um serviço com estado, uma base de dados, e obrigações de RGPD e de
> política da Play Store. É trabalho real e recorrente, por isso está isolado numa fase própria e
> depois de a app já ser útil sem isto.

### Deteção de alterações no backend (a base de tudo)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| B5.1 | **Diff entre execuções do scraper**: detetar jogo novo, resultado final, data/hora alterada, recinto alterado, jogo adiado ou suspenso | must | L | Adiar um jogo na amostra produz um evento `match_rescheduled` com valor antigo e novo |
| B5.2 | Histórico de eventos persistido (`events.json` ou tabela), com `event_id` idempotente por `match_id` + tipo + valores | must | M | Reexecutar o scraper 3× produz o mesmo `event_id`, não 3 eventos |
| B5.3 | Não notificar em avalanche no primeiro arranque nem depois de um backfill | must | S | Backfill de uma temporada inteira não dispara nenhuma notificação |

### Notificações push

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| A5.4 | Firebase Cloud Messaging na app + pedido de permissão de notificações (Android 13+) | must | M | Notificação de teste da consola Firebase chega ao telefone |
| A5.5 | Subscrição de tópicos FCM por equipa seguida (`/topics/team-{id}-{escalao}`) — sem servidor de tokens | must | M | Deixar de seguir uma equipa cancela a subscrição |
| B5.6 | Envio das notificações a partir do próprio job do scraper (FCM HTTP v1 por tópico) | must | M | Evento novo → notificação no telefone em < 2 min |
| B5.7 | Notificação de **resultado final** do jogo de uma equipa seguida | must | S | Chega uma vez, com o resultado certo |
| B5.8 | Notificação de **alteração de jogo** (data, hora, recinto, adiamento) — ver bloco seguinte | must | M | Alterar a hora na amostra produz "Jogo adiado: nova data 12/10 às 18h00" |
| B5.9 | Notificação "o teu jogo começa em 1h" | should | M | Chega no timing certo e não chega para jogos já terminados |
| A5.10 | Definições de notificações: ligar/desligar por tipo (resultado, alteração, pré-jogo) | must | S | Desligar impede a receção |

### "Alteração após confirmação do utilizador"

> **Interpretação assumida** (confirma-me se não é isto): quando a federação altera a data, hora ou
> recinto de um jogo que já está no calendário do utilizador, a app **notifica e pede confirmação
> antes de mexer no calendário dele** — não altera o evento silenciosamente.

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| A5.11 | Notificação de alteração com ações "Atualizar no calendário" / "Ignorar" | must | M | Tocar em "Atualizar" muda o evento local; "Ignorar" não mexe em nada |
| A5.12 | Ecrã "Alterações pendentes": lista de mudanças ainda não confirmadas, com antes → depois | should | M | Duas alterações pendentes aparecem as duas; confirmar remove da lista |
| A5.13 | Registo do que a app criou no calendário, para poder atualizar o evento certo | must | M | Atualizar não cria duplicado nem mexe em eventos que não foram criados pela app |

> ⚠️ **Isto só se aplica a A4.14** (eventos escritos no calendário local pela app). O feed ICS
> (B4.11) por definição atualiza-se sozinho sem confirmação — é o compromisso de quem o subscreve.
> Se quiseres confirmação sempre, então A4.14 é o caminho principal e o ICS é a alternativa
> "põe-e-esquece" para quem preferir. Vale a pena dizer isto claramente na UI.

### Conta Google (opcional, nunca obrigatória)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| A5.14 | Login com Google (Credential Manager + Firebase Auth) | should | L | Login e logout funcionam; a app continua utilizável sem login |
| A5.15 | **Nunca bloquear a app atrás do login** — entrar é sempre opcional, com "continuar sem conta" | must | S | Instalação nova permite chegar a todos os ecrãs sem autenticar |
| A5.16 | Sincronizar equipas favoritas e preferências na conta (Firestore) | should | L | Instalar noutro telefone e entrar recupera os favoritos |
| A5.17 | Resolução de conflitos entre favoritos locais e da conta no 1º login | should | M | União dos dois conjuntos, sem perder escolhas locais |
| L5.18 | **Eliminação de conta dentro da app** (exigência da Play Store para apps com login) | must | M | Botão apaga conta e dados; confirmado por email/diálogo |
| L5.19 | Política de privacidade atualizada: que dados da conta são guardados, onde e por quanto tempo | must | M | Coerente com o formulário `Data safety` (L7.3) |

---

## Fase 6 — Robustez e qualidade (~3 dias)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| Q6.1 | Cache offline com Room — a app abre com os últimos dados sem rede | should | L | Modo avião: a app mostra dados e um aviso de "offline" |
| Q6.2 | Testes unitários dos ViewModels e do mapeamento de dados | should | M | `./gradlew test` verde |
| Q6.3 | Teste de UI (Compose) do ecrã principal | could | M | Teste instrumentado passa em CI |
| Q6.4 | Crash reporting (Firebase Crashlytics) | should | S | Crash forçado aparece na consola |
| Q6.5 | Acessibilidade: `contentDescription`, tamanhos de toque ≥ 48dp, escala de fonte 200% | should | M | TalkBack lê a lista de jogos de forma compreensível |
| Q6.6 | Rotação de ecrã e mudança de configuração sem perder estado | must | S | Rodar não recarrega nem crasha |
| Q6.7 | Ecrãs testados em 3 tamanhos (telefone pequeno, grande, tablet) | should | M | Sem overflow nem texto cortado |
| Q6.8 | CI: build + testes em cada push | should | S | PR mostra o resultado do build |

---

## Fase 7 — Lançamento (~2 dias)

| ID | Item | Prio | Est. | Critério de aceitação |
|---|---|---|---|---|
| L7.1 | Contactar FPP/APL: informar, pedir autorização de uso dos dados e dos logótipos | must | S | Resposta escrita arquivada |
| L7.2 | Ícone, splash e nome da app | must | M | Ícone adaptativo correto no launcher |
| L7.3 | Política de privacidade publicada (URL) + `Data safety` da Play Store | must | M | Formulário submetido e coerente com o que a app faz |
| L7.4 | Conta Play Console (25 USD, uma vez) + assinatura da app (keystore guardada em segurança!) | must | M | Build assinado gerado |
| L7.5 | Teste interno com 5–10 pessoas reais (pais, treinadores, adeptos) | must | M | Feedback recolhido e triado no backlog |
| L7.6 | Ficha da loja: descrição, screenshots, feature graphic | must | M | Rascunho aprovado na Play Console |
| L7.7 | Release fechada → aberta → produção | must | M | Instalável a partir da Play Store |

> ⚠️ L7.1 antes de L7.7. Publicar uma app que raspa dados de uma federação sem falar com ela é o
> risco não-técnico mais provável deste projeto. Um email de 10 linhas resolve quase sempre.

---

## Fase 8 — Futuro / ideias

| ID | Item | Nota |
|---|---|---|
| F8.1 | Live scores (refresh ~1 min) migrando o scraper para Cloudflare Workers + Cron Triggers | A fonte tem a cronologia com relógio, mas o auto-refresh dela é um stub morto (`actualizar()` não faz nada) — **falta validar se a cronologia é preenchida durante o jogo ou só no fim**. Testar em setembro num jogo a decorrer antes de prometer live scores |
| F8.2 | ~~Quadro de marcadores~~ | **Promovido para a v1** — ver B1.20 e A3.10 |
| F8.2a | Perfil de jogador: golos por jornada, jogos, cartões, evolução ao longo da época | Extensão natural de A3.10. Só sub-17 para cima |
| F8.2b | Melhores guarda-redes (defesas por jogo) | A coluna `D` da ficha de jogo já traz isto |
| F8.3 | Histórico e head-to-head entre clubes | O histórico dos JSON no git já dá a base |
| F8.4 | Widget de ecrã inicial com o próximo jogo | Glance API |
| F8.5 | Suporte às outras associações regionais e a outras modalidades (`id_modal`) | Parser já é multi-tenant |
| F8.6 | Notificações de golo em tempo real | Depende de F8.1 |
| F8.7 | iOS (KMP ou SwiftUI a consumir o mesmo backend) | Backend já está pronto para isso |
| F8.8 | Competições internacionais (World Skate / Euroliga) | Fonte diferente, nova investigação |

---

## Rastreabilidade — funcionalidades pedidas → itens do backlog

| Funcionalidade pedida | Onde está | Fase |
|---|---|---|
| Opção de entrar com conta Google | A5.14–A5.17, L5.18–L5.19 (opcional, nunca obrigatória) | 5 |
| Possibilidade de escolher equipas favoritas | A4.1, A4.3 (por clube **e** escalão), A4.4, A4.6 | 4 |
| Quadro com golos gerais | B1.19–B1.21 (backend), A3.10–A3.12 (ecrã) | 1 + 3 |
| Informação disponível das fichas de jogo | B1.9–B1.9d (parser), A3.5–A3.5d (4 tabs) | 1 + 3 |
| Calendário com os jogos de cada clube e do meu clube | A4.7 (vista mensal), A4.8 (qualquer clube), A4.5 (o meu clube) | 4 |
| Notificações de alterações de jogos, com alteração após confirmação | B5.1–B5.3 (deteção), B5.8 (notificação), A5.11–A5.13 (confirmação) | 5 |
| Adicionar ao calendário os jogos de um clube e escalão | B4.11 + A4.12 (feed ICS), A4.14 (escrita no calendário local) | 4 |

## Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| HTML da fonte muda e o parser quebra | Alto | Parser no backend, testes com amostras, alerta automático (B1.11, B1.17) |
| Federação pede para parar | Alto | Contacto antecipado (L7.1), atribuição visível, scraping educado |
| Uso de logótipos de clubes | Médio | Não usar até haver autorização; placeholders na v1 |
| Dados de menores nas fichas e cronologias de formação | **Alto** | A fonte expõe nomes completos de crianças com golos/assistências associados. Uma app pública que agregue e torne isto pesquisável é um problema diferente do site da federação. Decisão explícita antes da v1: sem estatísticas individuais abaixo de sub-17 |
| Âmbito a crescer (multi-modalidade, iOS, live) antes da v1 | Alto | Fase 8 existe para isso: nada de lá sai antes do lançamento |
| Contas de utilizador arrastam RGPD, base de dados sempre de pé e eliminação de conta obrigatória na Play Store | Médio | Login opcional e só na Fase 5; favoritos local-first; notificações por tópicos FCM, que não precisam de identidade |
| Notificações em avalanche (backfill, 1º arranque, parser a re-detetar tudo) | Médio | Idempotência por `event_id` (B5.2) e supressão explícita em backfill (B5.3) |
| Crawl das fichas de jogo a crescer para milhares de páginas | Médio | Crawl incremental obrigatório (B1.19); backfill só uma vez, de noite |
| Fonte só atualiza no dia seguinte ao jogo | Médio | Validar cedo (durante a época) antes de prometer "live scores" |

## Primeiro incremento sugerido

`B0.1 → B0.5 → B1.1 → B1.6 → A2.1 → A2.5`

Uma semana de trabalho e já há um telemóvel a mostrar os resultados verdadeiros do Campeonato
Nacional. Tudo o resto é largura sobre essa base.
