# Arquitetura e stack

## Decisão 1 — A app não faz scraping. Nunca.

```
┌──────────────────────────────┐
│  fpp.assyssoftware.es (HTML) │   ← fonte, servidor pequeno, HTML frágil
└──────────────┬───────────────┘
               │  1 scrape central, a cada N minutos
┌──────────────▼───────────────┐
│  Scraper (Python)            │   ← parsing, normalização, deteção de mudanças
│  + JSON normalizado          │
└──────────────┬───────────────┘
               │  HTTPS, JSON estático em CDN
┌──────────────▼───────────────┐
│  App Android (Kotlin/Compose)│   ← só consome JSON, nunca vê HTML
└──────────────────────────────┘
```

**Porquê:** se o parser vivesse na app, qualquer mudança no HTML da fonte obrigaria a publicar
uma nova versão na Play Store e a esperar que os utilizadores atualizassem — a app ficaria
quebrada durante dias. Com o parser no backend, corrige-se em minutos e todos os utilizadores
ficam bons sem fazer nada. Além disso, N utilizadores = N pedidos ao servidor da federação, o que
é indefensável; com o backend é 1 pedido por intervalo, independentemente do número de utilizadores.

Efeito secundário útil: a app fica trivial de construir (ler JSON e desenhar listas), que é
exatamente o que se quer quando é a primeira app mobile.

## Decisão 2 — Stack

| Camada | Escolha | Porquê |
|---|---|---|
| Scraper | **Python 3.12** + `httpx` + `selectolax` (ou BeautifulSoup) | Terreno conhecido. Parsing de HTML em Python é muito mais rápido de escrever e depurar do que em Kotlin/TS. |
| Execução do scraper | **GitHub Actions** (cron) na v1 | Custo zero, sem servidor para manter, logs e histórico grátis, e o próprio repo guarda o histórico dos JSON (bónus: dá séries temporais de graça). |
| Distribuição do JSON | **Cloudflare R2 + Pages/CDN** (ou GitHub raw via jsDelivr no arranque) | Custo zero, cache global, a app só faz GET a ficheiros estáticos. |
| App | **Kotlin + Jetpack Compose** | Android-first, é o caminho oficial e melhor documentado da Google hoje; a IA e o Android Studio ajudam mais em Compose do que em qualquer alternativa. |
| Rede na app | Retrofit **ou** Ktor Client + `kotlinx.serialization` | Padrão. Retrofit é o mais documentado. |
| Estado | `ViewModel` + `StateFlow` | Mínimo viável, sem frameworks extra. |
| Offline | **Room** (Fase 5, não antes) | Só quando houver ecrãs a valer a pena guardar. |
| Imagens | Coil | Integra-se nativamente com Compose. |
| Injeção de dependências | Nenhuma até à Fase 4, depois **Hilt** | Não introduzir Hilt no primeiro ecrã — só confunde. |

### Alternativas consideradas e rejeitadas

- **Flutter / React Native** — fariam sentido se iOS fosse requisito no dia 1. Como é
  Android-first e é a primeira app, Compose evita uma camada inteira de toolchain (Dart/Node,
  bridges, plugins desatualizados) e todos os tutoriais/erros que vais pesquisar estarão em Kotlin.
- **Scraping em Cloudflare Workers (TypeScript, HTMLRewriter)** — é a melhor opção *se e quando*
  quisermos resultados ao minuto (live scores). O GitHub Actions tem latência de arranque de
  ~30-60s e granularidade prática de ~5 min. Caminho de migração previsto na Fase 6.
- **Backend com API própria (FastAPI + Postgres)** — desnecessário. Os dados são pequenos
  (dezenas de competições, milhares de jogos), lidos por todos e escritos por ninguém. JSON
  estático em CDN é mais rápido, mais barato e não parte.

### Caminho para iOS (se algum dia)

Não reescrever. A arquitetura já ajuda: o backend é partilhado e a app é fina. Opções na altura:
Kotlin Multiplatform (partilhar o data layer) ou uma app SwiftUI separada a consumir o mesmo JSON.

## Decisão 3 — Conta é opcional. Preferências são local-first.

As equipas favoritas vivem no telefone (DataStore) e a app é 100% funcional sem nunca autenticar.
O login com Google entra depois (Fase 5) e serve **uma coisa só**: recuperar os favoritos noutro
telemóvel.

**Porquê não fazer login primeiro (ou obrigatório):**

- Custo escondido. Assim que existem contas, existe uma base de dados de utilizadores, e com ela
  RGPD (responsável pelo tratamento, base legal, retenção, direito ao apagamento) e a exigência da
  Play Store de ter **eliminação de conta dentro da app**. Passa de "um scraper e ficheiros JSON"
  para "um serviço com estado que tem de estar sempre de pé".
- Conversão. Uma app de resultados que pede login antes de mostrar o resultado perde utilizadores.
- Não é preciso para notificações. As notificações por **tópicos FCM** (`/topics/team-1290`)
  funcionam sem qualquer identidade nem servidor de tokens — o telefone subscreve o tópico e o job
  do scraper publica nele.

Consequência arquitetural: até ao fim da Fase 4 não existe nada com estado. O primeiro componente
com estado é o Firestore das preferências sincronizadas, e é opcional por construção — se falhar,
a app continua a funcionar com as preferências locais.

## Contrato de dados (v1)

Ficheiros estáticos, versionados por caminho para nunca quebrar apps antigas:

```
/v1/seasons.json                        → temporadas disponíveis, por tenant
/v1/{tenant}/{season}/competitions.json → lista de competições + escalões
/v1/{tenant}/{season}/teams.json        → equipas (id, nome, slug, associação)
/v1/{tenant}/{season}/comp/{id}.json    → calendário + classificação da competição
/v1/{tenant}/{season}/match/{id}.json   → ficha de jogo completa: cabeçalho, estatística
                                          por jogador, cronologia de eventos e boletim oficial
/v1/{tenant}/{season}/team/{id}.json    → calendário e posição de uma equipa
/v1/{tenant}/{season}/scorers/{comp}.json → quadro de marcadores agregado da competição
/v1/{tenant}/{season}/team/{id}.ics       → feed de calendário subscritível da equipa
/v1/events.json                           → alterações detetadas (base das notificações)
/v1/meta.json                             → última atualização, versão do parser, estado
```

Nota de dimensionamento: um `match/{id}.json` completo (cabeçalho + jogadores + cronologia +
boletim) sai de ~80 KB de HTML para provavelmente 5–15 KB de JSON. Vale a pena separar o boletim
oficial (`match/{id}-acta.json`) por ser o bloco maior e o menos consultado.

Regras:
- Todos os ficheiros com `generated_at` (ISO 8601, UTC) e `source_url`.
- IDs mantêm os IDs da fonte (`id_comp`, `id_equipo`, `id` do jogo) para permitir re-verificação manual.
- Nunca remover campos de `/v1/`. Campos novos são sempre opcionais. Quebras vão para `/v2/`.
- `meta.json` é o primeiro pedido da app: permite mostrar "dados de há X minutos" e detetar backend em falha.
