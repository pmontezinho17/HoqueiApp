# Leitura dos ecrãs da Sofascore nativa

Capturas da app instalada, enviadas a 01/10/2026. **É a melhor evidência que este projecto tem
sobre aquela interface** — até aqui eu só vira o site móvel (o parente pobre) e as capturas de
marketing da loja.

Cada secção tem: o que vejo, o que daí se aproveita, e **se os nossos dados chegam para isso**.
Essa última coluna é a que importa: copiar a casca sem ter o recheio dá um ecrã vazio.

---

## 1. Favoritos — quatro tipos de favorito

`Eventos · Equipas · Competições · Atletas`, cada um com a sua lista.

**O que vejo:** o separador Favoritos tem quatro sub-separadores. Em Equipas, os seguidos
aparecem como cartões no topo com estrela cheia, ao lado de um cartão "＋ Adicionar"; abaixo,
"Equipas em altas" com estrela vazia em cada linha. Igual em Competições e Atletas.

**O que aproveitamos:** seguir não é só equipas. Faz sentido para nós seguir **uma competição**
(um treinador quer o escalão todo) e, mais tarde, **um atleta**. E o cartão "＋ Adicionar" é
uma afordância melhor do que o nosso botão de texto.

**Temos dados?** Equipas ✔ já. Competições ✔ trivial. Atletas ✔ os nomes vêm das fichas.

---

## 2. ⭐ Sino por jogo

Em todas as listas de jogos há um **sino à direita de cada linha**: notificar-me *daquele* jogo.

**Porque é o mais relevante de todos para nós:** um pai não quer notificações de todos os jogos
do clube. Quer saber do jogo de sábado do filho. É granularidade mais fina do que seguir a
equipa, e resolve o problema do ruído sem o utilizador ter de configurar nada.

**Temos dados?** ✔ — mas depende da Fase 5 (Web Push), que ainda não existe.

---

## 3. ⭐⭐ Relato: cronologia a dois lados

**O que vejo:** eventos da equipa da casa à esquerda, da visitante à direita, com o minuto na
margem. Os golos são uma **pastilha destacada ao centro com o resultado corrente** (`▶ 2-4`) e
ícone de bola. Substituições com setas verde/vermelha, cartões como quadrado amarelo.
"Tempo de compensação: 4min." como faixa própria.

**O que aproveitamos:** tudo. A nossa cronologia é a um só lado, com a equipa visitante apenas
recuada 1,1rem — lê-se como uma lista, não como um jogo. A deles lê-se como um confronto, e o
resultado corrente ao centro é muito mais legível do que o nosso número à direita.

**Temos dados?** ✔ **Completamente.** Temos equipa, minuto, tipo, resultado corrente, marcador e
assistente. Esta é a melhoria de maior retorno de toda a lista: zero backend, só desenho.

---

## 4. ⭐ Cabeçalho do jogo com os marcadores

**O que vejo:** por baixo do resultado, **os marcadores de cada equipa com o minuto**, em duas
colunas, separados por um ícone de bola. Vê-se quem marcou sem abrir a cronologia.

E um **cartão de migalhas clicável**: `Futebol, UEFA Nations League, League A, Gr. 4, Jornada 3 ›`

**O que aproveitamos:** as duas. O resumo de marcadores poupa um toque. E as migalhas são
exactamente a nossa hierarquia — `SUB-17 · CAMP. REG. 1ª FASE · Série D · 3ª jornada` — e dão
caminho de volta à competição, que hoje não temos no detalhe de jogo.

**Temos dados?** ✔ ambas.

---

## 5. ⭐⭐ Classificação: três colunas e zonas nomeadas

**O que vejo:** a tabela tem **P, Diff, PTS**. Só. E as posições estão agrupadas por **zona
nomeada** — "Liga dos Campeões", "Qualificação para a Liga Europa" — cada uma com um
**parêntesis vertical colorido** à esquerda. A equipa seguida fica com a linha realçada.
Por cima: `Tudo · Em casa · Fora` e um botão "Gráfico".

**O que aproveitamos:** a redução para três colunas (nós temos cinco) e sobretudo o
`Tudo · Em casa · Fora`, que é a vista mais útil que não temos.

**⚠️ Onde discordo de copiar:** as **zonas nomeadas não as podemos inventar.** A fonte da APL
não diz quem sobe, quem desce nem quem se apura — e pintar um parêntesis verde ao lado dos dois
primeiros seria afirmar uma coisa que não sabemos. Isto liga-se ao W6.9, a legenda: só se põe
marcador de cor quando há legenda, e só se põe legenda quando se sabe o que ela quer dizer.

**Temos dados?** Colunas ✔. `Em casa/Fora` ✔ (calcula-se do calendário). Zonas ✖.

---

## 6. ⭐ Forma recente

**O que vejo:** no ecrã da equipa, os **5 últimos jogos** como emblema do adversário, com a data
por cima e o resultado por baixo numa pastilha **verde (vitória) ou vermelha (derrota)**.

**O que aproveitamos:** tudo. É compacto, lê-se de relance e responde à pergunta "como é que
eles têm andado", que uma tabela não responde.

**Temos dados?** ✔ trivial.

---

## 7. ⭐⭐ Calendário mensal com casa/fora pela cor

**O que vejo:** `LISTA · CALENDÁRIO`. Na vista de calendário, uma grelha do mês com o **emblema
do adversário e a hora dentro da célula do dia**. **Célula escura = fora, clara = casa**, com
legenda em baixo. O dia de hoje com contorno.

**O que aproveitamos:** tudo, e é melhor do que o W4.7 que eu tinha planeado. Codificar casa/fora
na cor da célula poupa um rótulo e lê-se num instante — para um pai que precisa de saber se tem
de conduzir, é *a* informação.

**Temos dados?** ✔ — temos data, adversário, recinto e emblemas.

---

## 8. Estatísticas da equipa

**O que vejo:** dois blocos úteis e dois que não podemos ter. "Visão geral" (Jogos, Golos
marcados, Golos sofridos, Assistências) e "Ataque" (Golos por jogo). Mas também "Desempenho de
corrida" (distância, sprints) e xG, xGOT, percentagem de golos.

**O que aproveitamos:** só o primeiro bloco. **Nada de xG nem distância percorrida** — isso vem
de rastreio óptico que a APL não tem e nós não vamos inventar.

**Temos dados?** Visão geral ✔. Avançadas ✖, e é bom que se diga.

---

## 9. Melhores jogadores: top-3 com "Ver tudo"

**O que vejo:** blocos de **três** jogadores com foto, posição e número, cada bloco com um
"Ver tudo" à direita. Filtros de competição, época, **"50%"** (mínimo de minutos jogados) e
pesquisa rápida.

**O que aproveitamos:** o padrão top-3 + "Ver tudo" é melhor que a nossa lista de 50 corrida —
dá a provar sem obrigar a percorrer. O filtro de minutos mínimos é esperto (evita que um jogador
com um jogo lidere médias), mas só faz sentido quando houver médias.

**Temos dados?** ✔ golos, assistências, defesas. Fotos ✖, e já agora é bom que seja ✖ — fotos de
atletas de formação é exactamente o que não queremos.

---

## 10. Plantel por posição

**O que vejo:** treinador primeiro, depois agrupado por **Avançados / Médios / Defesas**, com
número, posição, país e estrela para seguir. Chips `Geral · Idade · Altura · Valor de mercado ·
Contrato` trocam o atributo mostrado.

**O que aproveitamos:** o agrupamento por posição e a equipa técnica em primeiro. Os chips não:
não temos idade, altura nem valor de mercado — nem queremos, em escalões de formação.

**Temos dados?** Posição ✔ (`GR`/`JC` do boletim), equipa técnica ✔ (D/T/T2/MAS). Resto ✖.

---

## 11. ⭐ Barra de progresso da época

**O que vejo:** no ecrã da competição, uma barra `07/08 ▬▬▬———————— 28/05` com a parte decorrida
preenchida.

**O que aproveitamos:** barato e informativo. Diz "estamos no início" sem o utilizador fazer
contas.

**Temos dados?** ✔ — primeira e última data de jogo da prova.

---

## 12. O que deliberadamente NÃO copiamos

| Elemento | Porquê não |
|---|---|
| Odds de apostas (bwin, Solverde) | é a monetização deles; numa app com dados de menores seria indefensável |
| Pontuação Sofascore por jogador | é um modelo proprietário sobre dados que não temos |
| xG, xGOT, distância, sprints | vêm de rastreio óptico; a APL não tem |
| Match Momentum | idem |
| Insights de IA | não há dados para sustentar e é fácil parecer inteligente sem o ser |
| Chat | moderação de um chat público com menores envolvidos — não |
| Valor de mercado, transferências | não existe em formação |
| "850k Seguidores" | prova social que não temos e que mentir seria ridículo |
| Fotos de jogadores | **sobretudo em formação** |

Vale a pena dizer isto em voz alta: **grande parte do que faz a Sofascore parecer rica é dados
que nós não temos.** Copiar a casca sem o recheio dá um ecrã com três blocos vazios e um aviso.
O que temos — cronologia completa, ficha por jogador, boletim oficial — é profundo de outra
maneira, e é aí que devemos carregar.
