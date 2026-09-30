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
  horizontal, e as séries como **secções empilhadas** dentro da Classificação
- **⚙ (Mais)** — sobre, fonte, feeds de calendário, notificações, privacidade
- **procurar** — equipas e, mais tarde, jogadores

Cinco separadores que não cabiam passam a três que cabem. E nada do que o utilizador usa fica
escondido atrás de um ícone.

## Fontes

- [FotMob](https://www.fotmob.com) e [Sofascore](https://www.sofascore.com) — usadas diretamente a 375×812
- [Página de liga da FotMob](https://www.fotmob.com/leagues/61/overview/premier-league) — estrutura de separadores
- [Best Football Live Score Apps UK](https://www.thepunterspage.com/best-live-score-apps/) e
  [FotMob vs SofaScore vs Flashscore](https://www.tikitaka.gg/articles/fotmob-vs-sofascore-vs-flashscore-vs-tiki-taka-best-football) — classificações e avaliações
- [Página de equipa da FotMob](https://www.fotmob.com/teams/9772/overview/sl-benfica) — separadores de uma página de clube
- [Hamburger Menu vs Tab Bar](https://www.onething.design/post/hamburger-menu-vs-tab-bar) e
  [The End of Hamburger Menus?](https://www.simantaparida.com/blog/end-of-hamburger-menus-mobile-navigation) — medições de descoberta e o caso da Spotify
