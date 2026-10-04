# Benchmarking — como as boas apps de desporto organizam isto

Feito a 30/09/2026, **revisto no mesmo dia** depois de uma crítica justa: a primeira versão
estudou só o **site móvel** destas apps, e são as **apps nativas** que têm as avaliações.

O que fica de cada fonte:

| Fonte | O que dá | Limite |
|---|---|---|
| Site móvel a 375×812, usado diretamente | navegação de topo, agrupamentos, filtros | não é o produto avaliado; é muitas vezes o parente pobre |
| **Capturas oficiais nas lojas** | a interface nativa a sério | material de marketing: mostra ecrãs reais, mas escolhidos, e alguns aparecem cortados em baixo |
| Comparativos independentes | quem vale a pena estudar | secundária |

**Nota de honestidade sobre a primeira versão:** o viewport estava a 375×812 com user-agent e
toque de telemóvel, portanto o que vi *era* o layout móvel — não a versão de computador. Mas o
site móvel e a app nativa são produtos diferentes, e isso invalidava parte das conclusões. A
secção "O que só se vê na app nativa" existe por causa disso.

## Quem estudei, e porquê

Segundo comparativos independentes de 2026, as quatro melhores apps de resultados são
LiveScore, Flashscore, Sofascore e FotMob, destacadas do resto. FotMob (9,2/10) é a mais
elogiada em desenho; Sofascore (9,1/10) em profundidade de estatística; Flashscore (8,9/10)
em velocidade e cobertura multi-desporto.

Estudei em detalhe a **FotMob** e a **Sofascore**, por serem as duas melhor avaliadas em
desenho e em dados — que é o nosso problema.

Não há apps de hóquei em patins que sirvam de referência. Mas o problema estrutural é o mesmo
em qualquer desporto: **muitos jogos, em muitas competições, e um utilizador que só se importa
com duas ou três equipas.**

## O que ambas fazem, e nós não

### 1. O eixo primário é a DATA, não a competição

As duas abrem no mesmo ecrã: **Matches**, com um navegador de datas no topo
(`‹ Today ›`) e os jogos do dia agrupados por competição.

Isto é o oposto do que fizemos. Nós pedimos primeiro a competição e só depois mostramos jogos.
Elas mostram o dia e usam a competição como **agrupamento dentro do dia**.

### 2. Competição é uma secção colapsável, não um filtro

Cada competição aparece como cabeçalho com emblema, nome, país e **um contador de jogos**, com
um chevron para fechar. Na Sofascore: `UEFA Champions League, Women · Europe · 5 ▲`.

O contador é o detalhe esperto: diz-te se vale a pena abrir antes de abrires. Num sábado com 58
jogos, isto é melhor do que o nosso filtro — vês tudo e expandes o que te interessa.

### 3. Fichas de estado, não dois modos

| App | Fichas |
|---|---|
| Sofascore | `All · Live (94) · Finished · Upcoming` |
| FotMob | `Live · On TV · By time` |

A Sofascore põe **o número de jogos ao vivo na própria ficha**. O nosso `Próximos / Resultados`
é mais grosseiro: força uma escolha binária em vez de deixar ver tudo e afunilar.

### 4. Classificações e marcadores NÃO são separadores de topo

Este é o achado mais importante para nós. Em nenhuma das duas existe um separador global de
"Classificação" ou "Marcadores". Vivem **dentro da página de uma competição**.

Na FotMob, a página de uma liga tem: `Overview · Table · Fixtures · Player stats · Team stats ·
Transfers · Seasons`, com selector de temporada. (Fonte secundária: leitura da página.)

Nós temos Classificação e Quadros como separadores globais, dependentes de um seletor no
cabeçalho — e foi exactamente daí que veio o teu bug, porque na Agenda esse seletor não faz nada.

### 5. Favoritos com três granularidades

| Granularidade | FotMob | Sofascore |
|---|---|---|
| Equipa | ✔ | ✔ |
| Competição | ✔ | ✔ |
| **Jogo individual** | ✔ | ✔ (estrela em cada linha) |

Seguir **um jogo** é algo que não temos e que faz muito sentido no nosso caso: um pai quer ser
avisado daquele jogo de sábado, não de todos os jogos do clube.

### 6. Procurar é separador de topo (Sofascore)

`Matches · Search · Fantasy · Favourites · Profile`. Com 216 pares equipa+escalão e mais de mil
jogadores nos nossos dados, procurar é provavelmente a navegação mais valiosa que não temos.

### 7. Sincronizar jogos com o calendário

A FotMob oferece isto na página da liga — valida o nosso feed ICS (B4.11), que ainda não fizemos.

## O que só se vê na app nativa

Evidência: capturas oficiais no Google Play. A **FotMob tem 4,9★ com 751 mil reviews e 50M+
instalações**; a **Sofascore 4,1★ com 1,15M reviews e 100M+**. A diferença de nota é grande e
aponta a FotMob como a referência de desenho.

### 1. Fita de datas horizontal, não setas

O site usa `‹ Today ›`. A app nativa usa uma **fita deslizável** com os dias adjacentes à vista:

```
…Aug │ Thu 20 Aug │ Yesterday │ [Today] │ Tomorrow │ Mon 24 Aug
```

Melhor num telemóvel: vê-se o contexto, navega-se por arrasto em vez de toques repetidos, e
não é preciso abrir um calendário para saltar dois dias.

### 2. ⭐ Densidade da tabela: `Short · Full · Form`

**O achado mais útil de todo o estudo.** Na página de competição, a tabela de classificação tem
três fichas que mudam quantas colunas aparecem:

- `Short` — só o essencial (J, Pts)
- `Full` — todas as colunas (Pl W D L +/- GD Pts)
- `Form` — os últimos resultados

Nós resolvemos o problema das 10 colunas num ecrã de 375px com **scroll horizontal**. A FotMob
resolve-o deixando o utilizador escolher a densidade. **A solução deles é melhor**: ninguém
descobre que uma tabela rola para o lado, mas todos vêem três fichas.

### 3. ⭐ Grupos como secções dentro da mesma tabela

A tabela da MLS tem um cabeçalho **"Eastern"** — a conferência — dentro do separador `Table`.
As conferências **não são competições separadas**: são secções da mesma vista.

Isto é exatamente o nosso problema das séries, resolvido por uma app com 4,9★, e da forma que
eu tinha proposto: **tabelas empilhadas, nunca fundidas**. Já não é opinião minha; é o padrão de
quem tem 50 milhões de instalações.

### 4. Seguir uma competição, com campainha

O cabeçalho da competição tem `← | 2026 ▾ | 🔔 | [Follow]`: selector de temporada, notificações
**daquela competição** e um botão de seguir. A Sofascore mostra até o nº de seguidores.

Nós só deixamos seguir equipas. Seguir uma competição inteira faz sentido para quem acompanha
um escalão todo — um treinador, um dirigente.

### 5. Sub-separadores horizontais com scroll

`Table · Fixtures · News · Player stats · Team stats · …` — mais do que caberia, e rolam. A
Sofascore igual: `Details · Matches · Standings · Knockout · Stats`.

Valida os sub-separadores da página de competição, e mostra que **rolar sub-separadores é
aceitável** quando os primários estão fixos. O erro era rolar os primários, como nós fazíamos.

### 6. `⋮` no canto superior direito

A FotMob nativa tem um menu de excesso no cabeçalho, ao lado de calendário e procurar. Ou seja:
a tua intuição do menu **está certa para o secundário** — é só não ser a navegação principal.

### O que NÃO consigo afirmar com esta evidência

As capturas da loja cortam o rodapé em alguns ecrãs, por isso **não confirmo a barra de
separadores inferior da app nativa**. O que vi no site móvel foi `Matches · Leagues · News`
(FotMob) e `Matches · Search · Fantasy · Favourites · Profile` (Sofascore). Fica como provável,
não como verificado.

## Fora do futebol: desportos dos EUA e desporto juvenil

Acrescentado a 30/09 depois de outra crítica justa — só tinha olhado para futebol.

| App | Nota | Reviews | Porquê interessa |
|---|---|---|---|
| theScore | **4,8★** iOS / 4,2★ Android | 854K / 202K | a mais bem avaliada; multi-desporto |
| NHL | 4,7★ iOS / 4,5★ Android | 135K / 103K | **hóquei**; classificações com divisões |
| ESPN | 4,6★ | 4,1M | a maior de todas |
| TeamSnap / SportsEngine | 4,2★ | ~200 cada | desporto **juvenil**, utilizador = pai |

### ⭐ A NHL resolve o nosso problema das séries — com um interruptor de vistas

Verificado em nhl.com/standings a 375px. O URL revela-o: `/standings/2026-09-30/**wildcard**`.

A classificação tem **quatro modos**, escolhidos pelo utilizador, sobre os mesmos dados:

```
[ Wild Card ]  [ Conference ]  [ Division ]  [ League ]
```

No modo `Wild Card` vê-se `Eastern → Atlantic`, `Eastern → Metropolitan`, `Eastern → Wild Card`,
e o mesmo a oeste. Ou seja: **as mesmas equipas, reagrupadas de quatro formas diferentes**, sem
sair da página.

É exactamente o interruptor que o dono do projecto pediu, em produção, numa app de 4,5–4,7★ e
no desporto mais próximo do nosso.

### Mas corrijo-me num ponto, e a NHL é que me obriga a isso

Eu disse que **agregar séries numa tabela única é impossível**. A NHL oferece precisamente isso
no modo `League`. Tinha de explicar a diferença, e ela existe:

| | NHL | Nós |
|---|---|---|
| Calendário | 82 jogos, cada equipa joga contra **todas** as divisões | cada série é um **grupo fechado** |
| Divisões servem para | apuramento e seeding | definir **com quem se joga** |
| Tabela única faz sentido? | **Sim** — registos comparáveis | **Não** — adversários disjuntos |

Ou seja: a NHL pode fundir porque **partilham calendário**. A SERIE A de sub-17 nunca joga
contra a SERIE F, logo uma tabela fundida compararia registos contra conjuntos de adversários
que não se tocam.

A conclusão mantém-se, mas agora sei **porquê** — e isso vale mais do que a afirmação original.
Os nossos modos legítimos são dois, não quatro:

- **`Série`** — só a série do meu clube (por omissão)
- **`Escalão`** — todas as séries empilhadas

E **não** um "Regional" fundido.

### Outros achados dos desportos americanos

**A NHL mostra 17 colunas numa tabela** (GP W L OT PTS P% RW ROW GF GA DIFF HOME AWAY S/O L10
STRK) e resolve-o com scroll horizontal — ao contrário das fichas de densidade da FotMob. Os
dois padrões coexistem em produção; a FotMob tem nota mais alta e a solução dela é melhor, mas
fica registado que não há consenso.

**A NHL tem uma legenda** (`X - Clinched Playoff spot`, `Y - Clinched Division`…) a explicar os
marcadores da tabela. Nós não temos legenda nenhuma para as cores e não deveríamos ter marcadores
sem uma.

**Declaração explícita de frescura:** *"Standings update after each game ends and are current as
of Oct 1, 12:00 AM"*. Valida o nosso indicador de idade dos dados, e é mais claro do que o nosso.

**nhl.com no telemóvel usa `SCORES · STATS ⌄ · STANDINGS · ☰`** — três itens visíveis mais
hamburger para o secundário. Terceiro exemplo do mesmo padrão: primário visível, secundário
escondido.

### ⭐ O desporto juvenil: a app que devíamos ser não existe

A descoberta mais interessante desta parte é de **categoria**, não de interface.

A TeamSnap e a SportsEngine, que servem desporto juvenil e têm o pai como utilizador, **não são
apps de resultados** — são plataformas de **gestão**: convocatórias, presenças, pagamentos,
comunicação do treinador com os pais. Não mostram classificações nem marcadores de uma
competição regional.

E as apps de resultados — FotMob, theScore, ESPN — só cobrem competições profissionais.

**Ficamos num espaço vazio:** resultados, classificações e estatísticas a sério, para escalões de
formação. Nenhuma das duas famílias faz isto. Não há referência directa a copiar, o que explica
por que a organização não era óbvia — e também por que é que a app tem valor.

Duas consequências práticas:

1. Copiamos a **interface** das apps de resultados (são elas que resolvem "muitos jogos em muitas
   competições") e o **utilizador-alvo** das de gestão (um pai, uma equipa, uma pergunta).
2. Se algum dia isto crescer, o caminho de expansão natural não é mais estatística — é a parte de
   gestão que a TeamSnap faz e que a APL não tem.

## Onde a nossa realidade é diferente

Copiar sem pensar seria um erro. Três diferenças que importam:

**O escalão é uma dimensão que elas não têm.** A Sofascore separa por desporto no topo
(`Trending · Football · Tennis · Basketball`); a FotMob por país dentro do dia. Nós temos um
desporto, uma região, e **nove escalões** — que funcionam como o "desporto" delas: sub-13 e
seniores são universos distintos que não se cruzam.

**O nosso utilizador segue uma equipa, não cinco clubes grandes.** Elas servem quem acompanha
Premier League e Champions. Nós servimos um pai cujo filho joga nos sub-13 do Parede. Os
favoritos deviam pesar **mais** na nossa app do que nas delas, não menos.

**Séries.** Elas não têm 6 séries do mesmo campeonato como competições separadas. Este problema
é nosso e a resposta não vem do benchmarking — vem do agrupamento (ver W5.22 no backlog).

## Layout gráfico — medido, não visto

Acrescentado a 01/10 depois de uma pergunta directa: *"validaste a estrutura ou também o layout
gráfico?"*. A resposta honesta era **só a estrutura**. Isto corrige-o, com `getComputedStyle`
sobre a FotMob e sobre a nossa app, a 375×812.

Limite da medição: os números vêm do **site móvel**, o único que consigo instrumentar. A
linguagem visual das nativas vem das capturas das lojas.

### Os números

| | FotMob | hoquei.pages.dev |
|---|---|---|
| Altura de uma linha de jogo | **56 px** | **81,6 px** (76 + 5,6 de margem) |
| Linhas por 812 px, em teoria | 14,5 | 10 |
| Jogos visíveis no 1º ecrã, na prática | 5 | 7 |
| Caixa | plana: `border-bottom: 1px`, sem raio, sem margem | cartão: `raio 10px`, `borda 1px`, `margem 5,6px`, `padding 8,8/11,2` |
| Nome de equipa | 12 px / 400 | 13,8 px / 400 |
| Hora | 12 px / 500, cinzento | 12,2 px / 400, cinzento |
| Cabeçalho de secção | 14 px / 400 | 12 px / 600 maiúsculas |
| Altura do cromado antes do conteúdo | 81 px | **178 px** (85 cabeçalho + 93 controlos) |

### Onde a minha suposição estava meio errada

Eu tinha dito que os nossos cartões custam densidade. **As linhas sim — são 46% mais altas.**
Mas no primeiro ecrã mostramos *mais* jogos que a FotMob (7 contra 5), porque o cromado deles
naquela vista é mais alto: cartão de datas, fichas de filtro e **dois níveis** de cabeçalho de
secção.

Ou seja, a conta não é "cartões = pior". É mais interessante do que isso.

### ⭐ A causa real: o layout está a pagar o preço da estrutura

As nossas linhas têm **três linhas de texto**, a terceira sendo
`SUB-13 · CAMP. REG. SUB-13 - 1ª FASE - SERIE D` a 10,9 px.

A FotMob não tem essa linha — porque **agrupa por competição**, e a competição aparece **uma
vez** no cabeçalho da secção em vez de se repetir em cada jogo.

Tirando essa terceira linha, as nossas linhas caem para ~58 px: praticamente as delas.

**A densidade não se ganha a apertar píxeis, ganha-se a agrupar.** É o mesmo problema estrutural
outra vez, agora medido em píxeis: 25 px por jogo desperdiçados a repetir o que devia ser um
cabeçalho.

### Dois níveis de agrupamento, com séries incluídas

Na lista de jogos da FotMob vê-se:

```
🏆 UEFA Nations League A                    ▲
   ┌ Group 2
   │   Germany  🇩🇪  19:45  🇷🇸  Serbia
   │   Greece   🇬🇷  19:45  🇳🇱  Netherlands
   ┌ Group 4
   │   Denmark  🇩🇰  19:45  🇵🇹  Portugal
🏆 UEFA Nations League B                    ▲
```

Competição como secção colapsável, **grupo como sub-cabeçalho dentro dela**, jogos dentro do
grupo. É a nossa hierarquia escalão → competição → série, já resolvida, na própria lista de jogos
e não só na classificação.

### Outras decisões visuais que elas tomam e nós não

**Tipo mais pequeno, não maior.** 12 px contra os nossos 13,8. Contra-intuitivo, mas numa lista
densa a hierarquia faz-se com peso e cor, não com tamanho. Nós aumentámos o tamanho e perdemos
densidade sem ganhar clareza.

**Linha simétrica, com a hora ao centro:** `Germany 🇩🇪 19:45 🇷🇸 Serbia`. Lê-se como um
confronto. A nossa põe a hora numa coluna à esquerda e as equipas empilhadas — lê-se como um
horário. Para um ecrã de "próximos jogos" o nosso talvez sirva melhor; para resultados, o deles
é mais claro.

**Cabeçalho de secção discreto:** 14 px, peso normal, sem maiúsculas. O nosso é 12 px, peso 600
e maiúsculas — grita mais e diz menos.

**Ícones de estado à direita** (auscultadores = áudio, TV = transmissão), pequenos e alinhados.
Nós não temos nada equivalente, mas o padrão serve para "tem ficha de jogo", "tem cronologia".

### O que isto acrescenta ao plano

| ID | Item | Prio | Est. |
|---|---|---|---|
| W6.11 | Linha de jogo **plana** com separador de 1px, em vez de cartão com raio e margem | should | S |
| W6.12 | Tirar a linha da competição de cada jogo e pô-la no **cabeçalho da secção** (−25 px por jogo) | should | M |
| W6.13 | Reduzir o tipo da lista para ~12 px e refazer a hierarquia com **peso e cor** | should | M |
| W6.14 | Reduzir o cromado: 178 px antes do primeiro jogo é 22% do ecrã | should | M |
| W6.15 | **Sub-cabeçalho de série** dentro da secção de competição, ao estilo `Group 2` | should | M |
| W6.16 | Cabeçalho de secção discreto (peso normal, sem maiúsculas) | could | XS |

## Proposta revista, com base nisto

A minha proposta anterior (Início · Jogos · Competições) estava perto, mas com um erro: separava
"O Meu Clube" dos jogos. As duas apps de referência **não separam** — integram os favoritos no
ecrã de jogos.

### Três separadores

**1. Jogos** — o ecrã por omissão.
- Navegador de datas no topo, com hoje por omissão
- Fichas de estado: `Todos · Por jogar · Terminados`
- **As minhas equipas fixadas no topo**, antes de tudo o resto
- Depois, as competições como secções colapsáveis com contador de jogos
- Fichas de escalão para afunilar quando são 58 jogos

Isto funde os nossos três ecrãs actuais — Agenda, Calendário e O Meu Clube — num só, no eixo
certo. E resolve a confusão de nomes entre "Agenda" e "Calendário", que eram sinónimos.

**2. Competições** — a lista (já agrupada por séries, W5.22), e dentro de cada uma:
`Classificação · Calendário · Marcadores`. É aqui que o seletor deixa de ser um controlo de
cabeçalho fantasma e passa a ser navegação a sério.

**3. Procurar** — equipas, e mais tarde jogadores. Com 216 equipas é o caminho mais curto para
quem sabe o que quer.

### O que isto arruma

| Problema actual | Como se resolve |
|---|---|
| 5 separadores que não cabem no ecrã | passam a 3 |
| "Agenda" e "Calendário" são sinónimos | fundem-se num só ecrã |
| Seletor que aparece e desaparece | deixa de existir; é navegação |
| Favoritos subaproveitados | passam a fixar no ecrã principal |
| 37 competições no seletor | agrupamento de séries (~15) |

### O que fica para depois, mas anotado

- Seguir um **jogo** individual, não só uma equipa
- **Seguir uma competição**, com notificações próprias
- Contador de jogos por secção
- Selector de temporada na página da competição
- Sincronizar com o calendário a partir da página da competição

## Menu hamburger: a evidência diz o contrário do objectivo

Pedido a 30/09 como forma de "apresentar o que é possível fazer na aplicação". O objectivo é
válido; o instrumento faz o oposto.

**Observação directa:** nem a FotMob nem a Sofascore têm hamburger. As duas põem os itens
secundários como **ícones no canto superior direito** (FotMob: TV, procurar, engrenagem;
Sofascore: engrenagem) e a navegação principal em separadores visíveis.

**Medições publicadas:**

- utilizadores são **2 a 3× menos prováveis** de descobrir funcionalidades escondidas num
  hamburger do que em navegação visível;
- a Spotify trocou o hamburger por separadores inferiores: **+9% de cliques no geral e +30% nos
  próprios itens de menu**;
- a recomendação corrente é separadores para **3–5 destinos primários** e hamburger apenas para
  navegação secundária ou pouco usada.

Ou seja: pôr as vistas num hamburger para as tornar descobertas reduz a descoberta a metade.

**O que fazer em vez disso.** O problema real — dar a entender o que a app faz — resolve-se com:

1. os 3 destinos primários **sempre visíveis** em separadores;
2. procurar e definições como **ícones no cabeçalho**, como as duas referências fazem;
3. um destino "Mais" para o secundário: sobre, fonte dos dados, feeds de calendário,
   notificações, privacidade. Aqui um menu escondido é adequado, porque são coisas que se
   configuram uma vez.

## Página do clube: aqui o pedido melhora o plano

Pedido a 30/09: "o meu clube, onde podíamos ver todas as informações e estatísticas do meu clube".

Isto **corrige a minha proposta anterior**, que dissolvia O Meu Clube dentro dos Jogos. A
FotMob tem exactamente uma página de equipa, com separadores próprios:

`Overview · Table · Fixtures · Squad · Player stats · Team stats · Transfers · History`

E mostra, para aquela equipa: posição na tabela, últimos resultados, próximos jogos **de todas
as competições**, plantel por posição, melhores marcadores e assistentes **do clube**, treinador
e recinto.

Quase tudo isto já temos nos dados. Traduzido para a nossa realidade:

| Separador | O que mostra | Dados |
|---|---|---|
| Resumo | próximo jogo, últimos resultados, posição em cada prova do escalão | ✔ já temos |
| Calendário | todos os jogos da equipa, de todas as provas do escalão | ✔ já temos |
| Plantel | jogadores que alinharam, com jogos, golos e assistências | ✔ das fichas |
| Marcadores | quadro do clube: golos, assistências, defesas | ✔ agregação por equipa |
| Recinto | pavilhão onde joga em casa | ✔ do campo recinto |

**Decisão de desenho importante:** fazer disto a página **de qualquer clube**, não só dos
favoritos. Chega-se a ela tocando no nome de uma equipa em qualquer lista, e "O Meu Clube" passa
a ser um atalho para a tua. Mesmo código, muito mais utilidade — e é assim que as duas
referências funcionam.

## Estrutura final proposta

Juntando tudo: **3 separadores visíveis, 2 ícones no cabeçalho.**

```
┌──────────────────────────────────────┐
│ Hóquei            [procurar] [⚙]    │   ícones: secundário
├──────────────────────────────────────┤
│  Jogos   │  O Meu Clube  │ Competições│   3 destinos primários
└──────────────────────────────────────┘
```

- **Jogos** (por omissão) — **fita de datas deslizável** no topo, as minhas equipas fixadas,
  competições como secções colapsáveis com contador, fichas de escalão
- **O Meu Clube** — a página do clube, com os 5 separadores acima; é a página genérica de clube
  com a tua equipa por omissão
- **Competições** — lista agrupada por séries → sub-separadores `Classificação · Calendário ·
  Marcadores`, com **fichas de densidade `Simples · Completa`** na tabela em vez de scroll
  horizontal, e um **interruptor de vistas `Série · Escalão`** ao estilo NHL, com as séries
  empilhadas e nunca fundidas
- **⚙ (Mais)** — sobre, fonte, feeds de calendário, notificações, privacidade
- **procurar** — equipas e, mais tarde, jogadores

Cinco separadores que não cabiam passam a três que cabem. E nada do que o utilizador usa fica
escondido atrás de um ícone.

## theScore — o menu dos jogos (4/10/2026)

Gravação de 65 s da app **theScore**, enviada pelo Pedro, sobre o menu dos jogos e a forma de
interagir com eles. Lida de duas maneiras: 17 ecrãs distintos extraídos do vídeo, e o áudio
transcrito no aparelho — e foi no áudio que estava o pedido real, que as imagens sozinhas não
davam.

O que ele pediu, nas suas palavras: *"se andar com o dedo para a esquerda, para a direita, ele
vai mexendo nos dias e vai-me trocando lá em cima, com suavidade"*, e chips *"onde tínhamos os
escalões e depois por baixo apareciam todos os jogos desses escalões em que eu carregar"*.

**Adoptado**

- **Arrastar o dedo muda de dia** (`FaixaDias.svelte`). Feito à mão, com *pointer events* e
  `touch-action: pan-y`, e não com `scroll-snap`: um contentor com scroll horizontal rouba
  também o scroll vertical, e um sábado com 41 jogos é precisamente uma página alta. Os dias
  vizinhos ficam montados em posição absoluta — não entram no fluxo, logo não mudam a altura —
  e `overflow-x: clip` corta-os. O recuo de 0.9rem do `main` vive dentro de cada página, para o
  passo do arrasto ser exactamente a largura do ecrã; com o recuo na faixa ficava uma fenda de
  0.9rem de conteúdo vizinho visível nos bordos.
- **Chips de escalão preenchidos quando activos**, iguais ao dia escolhido na fita, e presentes
  mesmo quando o dia tem um só escalão. A função já existia desde o início; o que faltava era
  peso visual — o Pedro pediu-a como se não existisse.
- Um arrasto horizontal **engole o clique** que lhe segue, senão mudar de dia abria o jogo que
  estava sob o dedo.

**Rejeitado**

- **A nota de contexto sob cada linha** (`ALDS | White Sox lead series 1-0`). É a terceira linha
  de texto que medimos e cortámos acima, a 25px por jogo: num sábado de 41 jogos é um ecrã
  inteiro.
- **Odds de apostas**, que ocupam metade da linha nos jogos por começar.
- **Não ter secção de jogos ao vivo.** Na theScore um jogo a decorrer fica no grupo da liga; a
  nossa `A decorrer agora` atravessa escalões e ignora o dia, que é o que serve um pai a querer
  o jogo do filho. Fica fora da faixa que se arrasta, por não pertencer a nenhum dia.

**Onde já estávamos melhor:** a fita diz *Hoje / Amanhã / Ontem* e recentra-se sozinha (a deles
diz `TODAY OCT 4`); as secções por competição colapsam com contador, que eles não precisam de
ter; e a linha simétrica aguenta `SPORT LISBOA E BENFICA`, enquanto a deles empilha emblema e
nome em duas linhas.

## Sofascore — o ecrã de jogo (4/10/2026)

Segunda gravação do Pedro, de 78 s, sobre o ecrã de um jogo a decorrer (Farense–Chaves da
Liga 2). Lida como a outra: 2006 fotogramas descodificados → 63 ecrãs distintos, mais o
áudio transcrito no aparelho.

Antes de responder fui ver o que já tínhamos, porque na avaliação da theScore afirmei coisas
sem o fazer. **Quase tudo o que ele descreve já existia**: resultado grande com casa à
esquerda e fora à direita, relógio junto ao resultado, marcadores por equipa logo abaixo,
cronologia do mais recente para o mais antigo com os acontecimentos de cada lado, marcas de
parte, e a ficha do resultado em cada golo. Três coisas não existiam.

**Adoptado**

- **Barra compacta colada ao topo** (`.barra` em `jogo/[id]`), com emblemas, resultado e
  relógio, a partir do momento em que o cabeçalho sai do ecrã. Foi o pormenor que ele
  destacou — *"esta barra superior vai-se colapsando, é engraçado"* — e é a resposta
  definitiva à queixa de que o relógio desaparecia: num jogo a decorrer passa-se o tempo na
  cronologia, que é exactamente onde o cabeçalho já não se vê. É `fixed` e não `sticky`
  (em `sticky`, aparecer e desaparecer empurrava o conteúdo), e o gatilho é uma sentinela no
  fim do cabeçalho, não um número de píxeis: o cabeçalho muda de altura com a faixa de "ao
  vivo" e com nomes compridos. A altura do cabeçalho do layout é publicada em `--topo`,
  medida com `bind:clientHeight`.
- **Caixa de informação do jogo**, um ícone por linha: competição e jornada (que continua a
  ser o caminho de volta), data e hora, pavilhão, **morada com ligação ao mapa**, arbitragem
  e faltas de equipa. A informação já existia toda, arrumada em dois sítios — um cartão de
  migalhas e três linhas de 0,74rem soltas dentro do cabeçalho, a competir com o resultado.
  A morada é a única linha nova: temos as dos 29 recintos e só serviam o botão do calendário.
- **Minuto do jogo na lista**, debaixo da hora, como eles fazem. A lista dizia só "AO VIVO" e
  não dizia se o jogo ia no início ou no fim — que é o que decide se se entra. A ronda ao
  vivo já tinha o período e o relógio na mão e não os escrevia na `agenda.json`: **zero
  pedidos extra**. `faseCurta()` encurta `"2ª Parte"` para `"2ª p"` e `"Intervalo"` para
  `"Interv."`, porque a coluna tem 3.1rem.
- **Resultado com que cada parte começou** na marca da cronologia (`2ª parte 4–5`), o `HT 2-0`
  deles. Lida do mais recente para o mais antigo, essa marca é a linha que separa as duas
  partes, e ali o número que faz sentido é o resultado de entrada.

**Rejeitado**

- **Classificação dentro do ecrã de jogo** — o próprio Pedro disse backlog.
- **Caixas (cartões) por competição na lista do dia.** Um cartão custa ~16px por secção em
  borda e margem; um sábado tem dez secções, meio ecrã de telefone. As secções planas com
  contador aguentam 41 jogos, problema que o Sofascore não tem.
- **O resto do ecrã deles**: três espaços de publicidade (banner, odds da bwin e um vídeo com
  "Skip Ad") e um bloco de prognósticos. Não ter isso não é uma lacuna.

## Fontes

- [FotMob](https://www.fotmob.com) e [Sofascore](https://www.sofascore.com) — usadas diretamente a 375×812
- [Página de liga da FotMob](https://www.fotmob.com/leagues/61/overview/premier-league) — estrutura de separadores
- [Best Football Live Score Apps UK](https://www.thepunterspage.com/best-live-score-apps/) e
  [FotMob vs SofaScore vs Flashscore](https://www.tikitaka.gg/articles/fotmob-vs-sofascore-vs-flashscore-vs-tiki-taka-best-football) — classificações e avaliações
- [Página de equipa da FotMob](https://www.fotmob.com/teams/9772/overview/sl-benfica) — separadores de uma página de clube
- [Hamburger Menu vs Tab Bar](https://www.onething.design/post/hamburger-menu-vs-tab-bar) e
  [The End of Hamburger Menus?](https://www.simantaparida.com/blog/end-of-hamburger-menus-mobile-navigation) — medições de descoberta e o caso da Spotify
- [theScore](https://www.thescore.com) — vídeo de 65 s gravado pelo Pedro a 4/10/2026, lido por
  fotogramas e por transcrição do áudio no próprio aparelho
- [Sofascore](https://www.sofascore.com) — vídeo de 78 s gravado pelo Pedro a 4/10/2026 sobre
  o ecrã de um jogo a decorrer
