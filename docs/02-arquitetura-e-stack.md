# Arquitetura e stack

> **Revisto a 20/09/2026:** o cliente passa de app Android nativa (Kotlin/Compose) para **PWA**.
> A Decisão 1 mantém-se intacta — e é por isso que a mudança custa quase nada.

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
│  PWA (SvelteKit)             │   ← só consome JSON, nunca vê HTML
└──────────────────────────────┘
```

**Porquê:** se o parser vivesse no cliente, qualquer mudança no HTML da fonte partiria a app para
todos até haver nova versão. E N utilizadores seriam N pedidos ao servidor da federação, o que é
indefensável; com o backend é 1 pedido por intervalo, independentemente do número de utilizadores.

**Esta decisão acabou de se pagar.** Trocámos o cliente inteiro — de Kotlin nativo para web — e o
backend não muda uma linha. Todo o trabalho já feito (`scraper/`, parsers, testes) continua válido.
Um cliente fino sobre JSON estático é descartável de propósito.

## Decisão 2 — O cliente é uma PWA, não uma app nativa (revisto 20/09/2026)

**SvelteKit** com `adapter-static`, empacotado como PWA com `vite-plugin-pwa`, publicado em
**Cloudflare Pages — no mesmo projeto que serve os JSON**.

### Porque a PWA é a escolha certa para esta app em particular

- **A app é um leitor de dados.** Listas, tabelas, um detalhe de jogo. Não usa câmara, Bluetooth,
  sensores nem nada que force código nativo. O que a plataforma nativa dá a mais, aqui, quase não
  se usa.
- **Um código, todos os telemóveis.** Android e iPhone no mesmo dia, em vez de Android primeiro e
  iOS "talvez um dia". Metade dos utilizadores de um clube está em iPhone.
- **Correção em minutos, não em dias.** Sem revisão de loja, sem esperar que o utilizador atualize.
  Numa app cuja fonte de dados é HTML frágil de terceiros, isto não é conforto — é seguro.
- **Mesma origem que os dados.** Ao servir a PWA e os JSON do mesmo Cloudflare Pages, desaparece o
  CORS, a cache fica trivial e o service worker pode pré-carregar os dados com o mesmo mecanismo com
  que carrega o código.
- **Sem custo de entrada.** Sem conta de programador Play (25 USD), sem keystore para guardar e
  perder, sem assinatura, sem ficha de loja.
- **Distribuição por link.** Esta app vive em grupos de WhatsApp de clubes e pais, não na pesquisa
  da Play Store. Um link partilha-se melhor do que "procura na loja".

### O que se perde, e importa saber já

Estas três não são detalhes — mudam itens concretos do backlog:

| Perda | Consequência real |
|---|---|
| **Sem tópicos de push** | No Android nativo, o telefone subscreve um tópico FCM e **não é preciso servidor nenhum**. O Web Push (VAPID) não tem tópicos: cada browser tem um *endpoint* de subscrição que temos de guardar e a quem temos de enviar um a um. **Isto anula o argumento que dei antes de "notificações sem estado"** — na web, notificar exige mesmo um serviço com estado. Estado, note-se, **não** identidade: ver Decisão 3. |
| **Push no iPhone só depois de instalar** | O Web Push funciona em iOS 16.4+, **mas só se o utilizador adicionar ao ecrã principal**. E o iOS não tem API para sugerir a instalação — tem de ser ensinado na interface (Partilhar → Adicionar ao ecrã principal). |
| **Sem escrita no calendário do telefone** | A web não tem API de calendário. O antigo item "adicionar todos os jogos de uma equipa ao calendário local" é **impossível**. Fica só o feed ICS subscritível — ver Decisão 4. |

Compensações que a web dá de volta: instalação sem loja, atualização instantânea, partilha por URL,
e um ecrã de detalhe de jogo que se abre com link direto (deep link de graça).

### Alternativas consideradas

- **React + Vite** — ecossistema maior e mais exemplos. É a alternativa razoável se preferires
  terreno mais pisado. Optei por SvelteKit por ter menos conceitos (sem hooks, sem `useEffect`) e
  produzir bundles menores, o que conta num pavilhão com 3G.
- **Next.js** — desenhado para SSR e servidores; aqui só queremos ficheiros estáticos.
- **Capacitor / TWA desde já** — desnecessário agora. Fica como ponte para as lojas (ver Decisão 5).
- **Kotlin + Compose** — a escolha anterior. Continua a ser a resposta certa *se e quando* a app
  precisar de execução em segundo plano, widgets ou integração profunda com o sistema.

## Decisão 3 — Não há login. (revisto a 03/10/2026)

**O login com Google sai do plano.** Estava lá desde a primeira lista de funcionalidades, e
quando o dono do projecto perguntou *"qual a mais-valia de ter um login, se a informação é
pública?"* a resposta honesta foi: quase nenhuma.

### O que o login dava, e o que custava

Dava **uma coisa só**: recuperar favoritos noutro dispositivo. Para quem tem um telemóvel —
a maioria dos pais que vão usar isto — vale zero.

Custava: o **primeiro componente com estado** do projecto, o **primeiro dado pessoal** que
passamos a guardar (um email, quando hoje não guardamos nada), ecrãs de eliminação de conta,
uma política de privacidade mais pesada, e a manutenção de um consentimento OAuth que
caduca. Trocar "nada guardado em servidor nenhum" por "sincronizar favoritos" é mau negócio.

### A correcção de uma frase que sustentava o item

A versão anterior desta decisão dizia que *"o argumento de que as notificações não precisam
de identidade deixa de ser verdade"*. **Está errado, e era o que mantinha o login vivo.**

As notificações precisam de **estado**, não de **identidade**. Uma subscrição de Web Push é
um `endpoint` que o browser gera; guarda-se esse endpoint com as equipas que quer seguir, e
envia-se para lá. O endpoint **é** o identificador. Nunca é preciso saber quem é a pessoa, e
desligar as notificações apaga o registo. Confundi "guardar algo" com "ter contas".

### E para o problema real — não perder os favoritos

Quem muda de telefone, ou quer as mesmas equipas no telemóvel do cônjuge, não precisa de
conta: precisa de **levar a lista consigo**. Um link que carrega os favoritos resolve isso
sem servidor e sem dados pessoais:

```
/clube?seguir=sub-13:parede-fc-b,seniores-masculinos:cd-paco-arcos
```

Partilha-se por WhatsApp, que é por onde esta app se espalha, funciona offline depois de
abrir, e não há nada para apagar depois. Fica como **W5.26**.

## Decisão 4 — O calendário é um feed ICS. Não havia escolha, e ainda bem. (nova)

A decisão que estava em aberto desde julho — feed ICS subscritível *vs* escrever eventos no
calendário do telefone — **fica resolvida pela plataforma**: a web não pode escrever no calendário.

O backend gera `/v1/{tenant}/{season}/team/{id}.ics`. O utilizador subscreve uma vez e a partir daí
o calendário dele corrige-se sozinho sempre que a federação adia um jogo — sem a app fazer nada e
mesmo que desinstale a PWA.

**Com que rapidez se corrige — verificado a 02/10, e importa:** o ritmo não é nosso, é de quem
serve o calendário. O **Google Calendar** relê os calendários subscritos a cada **~12 a 24 horas**,
não publica o intervalo e **não tem botão para forçar**. O **Apple Calendar** deixa o utilizador
escolher, e chega a cada 15 minutos.

A consequência desenha a funcionalidade: o ICS resolve bem *"ter a época toda no meu calendário"*
e resolve **mal** *"o jogo de amanhã mudou de hora"* — um adiamento à última hora pode levar meio
dia a chegar a um utilizador de Android. **Não substitui as notificações; torna-as necessárias.**
O ICS trata do que é previsível, o push do que é urgente.

**Consequência para o pedido "alteração após confirmação do utilizador":** como o ICS atualiza
sozinho, não há um evento nosso para "confirmar". A funcionalidade muda de forma, não desaparece:
a app **notifica** a alteração e mostra-a num ecrã de "alterações recentes" com o antes → depois.
O calendário do utilizador já ficou certo; a confirmação passa a ser um acto de leitura, não de
escrita. Ver W5.9–W5.11 no backlog.

## Decisão 5 — Caminho para as lojas, quando houver confiança (nova)

Não é preciso reescrever para chegar às lojas:

1. **Play Store: TWA** (Trusted Web Activity). Um invólucro fino que publica a própria PWA como app
   Android. Dias de trabalho, não semanas, e o código é o mesmo.
2. **App Store: Capacitor.** A Apple não aceita TWA; o Capacitor embrulha a PWA numa app nativa.
   Mais trabalho e a revisão da Apple rejeita invólucros que não acrescentem nada — precisa de
   alguma integração nativa a sério para passar.
3. **Nativo a sério** só se a app vier a precisar de widgets, execução em segundo plano ou
   notificações sem a fricção do iOS.

Só vale a pena decidir isto com utilizadores reais em cima. É exatamente o que a PWA permite: ter
utilizadores antes de escolher.

## Contrato de dados (v1)

Ficheiros estáticos, versionados por caminho para nunca quebrar clientes antigos:

```
/v1/seasons.json                          → temporadas disponíveis, por tenant
/v1/{tenant}/{season}/competitions.json   → lista de competições + escalões
/v1/{tenant}/{season}/teams.json          → equipas (id, nome, slug, associação)
/v1/{tenant}/{season}/comp/{id}.json      → calendário + classificação da competição
                                            (`classificacao` é a da fonte;
                                             `classificacao_calculada` é a nossa, e só existe
                                             onde a fonte não publica nenhuma)
/v1/{tenant}/{season}/match/{id}.json     → ficha de jogo: cabeçalho, estatística por
                                            jogador, cronologia e boletim oficial
/v1/{tenant}/{season}/scorers/{comp}.json → quadro de marcadores agregado
/v1/{tenant}/{season}/team/{id}.ics       → feed de calendário subscritível
/v1/events.json                           → alterações detetadas (base das notificações)
/v1/meta.json                             → última atualização, versão do parser, estado
```

Nota de dimensionamento: um `match/{id}.json` completo sai de ~80 KB de HTML para 5–15 KB de JSON.
Vale a pena separar o boletim (`match/{id}-acta.json`), por ser o bloco maior e menos consultado.

Regras:
- Todos os ficheiros com `generated_at` (ISO 8601, UTC) e `source_url`.
- IDs mantêm os IDs da fonte (`id_comp`, `id_equipo`, `id` do jogo) para permitir re-verificação manual.
- Nunca remover campos de `/v1/`. Campos novos são sempre opcionais. Quebras vão para `/v2/`.
- **Nem reutilizar um campo para dizer outra coisa.** É o mesmo problema visto do outro lado, e
  custou uma decisão de desenho a 07/10/2026: as tabelas que calculamos para os Escolares e os
  Benjamins (B9.14/B9.15) não entraram na `classificacao` vazia que já existia, porque um
  telemóvel com um *build* antigo em cache mostrá-las-ia **sem o rótulo de "não oficial"** — o
  rótulo é interface nova. Foram para uma chave nova, `classificacao_calculada`, que o código
  antigo ignora. Acrescentar é seguro; mudar o significado do que já está em cache não é.
- `meta.json` é o primeiro pedido do cliente: permite mostrar "dados de há X minutos" e detetar
  backend em falha.
- **Servir tudo do mesmo domínio da PWA** — sem CORS, e o service worker trata dados e código da
  mesma maneira.
