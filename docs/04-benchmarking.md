# Benchmarking — como as boas apps de desporto organizam isto

Feito a 30/09/2026. **Evidência primária**: abri as apps em largura de telemóvel (375×812) e
usei-as, em vez de ler artigos sobre elas. Onde uso fonte secundária, digo-o.

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
- Contador de jogos por secção
- Selector de temporada na página da competição
- Sincronizar com o calendário a partir da página da competição

## Fontes

- [FotMob](https://www.fotmob.com) e [Sofascore](https://www.sofascore.com) — usadas diretamente a 375×812
- [Página de liga da FotMob](https://www.fotmob.com/leagues/61/overview/premier-league) — estrutura de separadores
- [Best Football Live Score Apps UK](https://www.thepunterspage.com/best-live-score-apps/) e
  [FotMob vs SofaScore vs Flashscore](https://www.tikitaka.gg/articles/fotmob-vs-sofascore-vs-flashscore-vs-tiki-taka-best-football) — classificações e avaliações
