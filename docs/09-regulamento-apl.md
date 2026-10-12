# Os artigos do regulamento da APL que o código aplica

> **Fonte**: *Regulamento Geral de Hóquei em Patins — APLisboa, Final V11, 2026*, publicado
> pela Associação de Patinagem de Lisboa em `aplisboa.pt`. Lido na íntegra a 10/10/2026.
>
> **Isto é um resumo de trabalho, não uma cópia.** Estão aqui os pontos que o código aplica,
> com o número do artigo ao lado, para quem lê o `tabela.py` ou o `merito.py` não ter de abrir
> um PDF de 100 páginas para confirmar uma linha. Onde houver dúvida, o que vale é o
> regulamento, não este ficheiro — e o regulamento muda de época para época.

## Artigo 7.º — pontos e desempate classificativo

Pontuação (ponto 2): **vitória 3, empate 1, derrota 0**. É o que o `tabela.py` já usava, e que
já estava medido contra 151 linhas publicadas.

Desempate. O ponto 4 trata do empate entre **duas** equipas e o ponto 5 do empate entre
**três ou mais**, e abrem os dois com a mesma condição: o desempate faz-se "no final de
qualquer fase" da prova, e só contam os resultados dessa fase.

| Ordem | Duas equipas | Três ou mais | O que é |
|---|---|---|---|
| 1.º | 4.1 | 5.1 | pontos nos jogos realizados **entre as empatadas** |
| 2.º | 4.2 | 5.2 | diferença de golos nesses mesmos jogos |
| 3.º | 4.3 | 5.3 | diferença de golos em toda a fase da prova |
| 4.º | — | 5.4 | quociente (marcados/sofridos) entre as que ainda estão empatadas |
| 5.º | 4.4 | 5.5 | quociente geral na fase da prova |

Subsistindo o empate, o ponto 6 manda **jogar um jogo de desempate** em recinto neutro. Não
há critério administrativo final — e é por isso que a nossa ordem acaba no nome da equipa,
que não é regra nenhuma, é só determinismo.

**Golos marcados não é critério.** Era o nosso terceiro critério antes de 10/10/2026, por
palpite, e não existe no artigo.

**O critério 4 é vazio num par**, e é por isso que uma só chave de ordenação serve os pontos 4
e 5: se duas equipas empatam no confronto directo em pontos e em diferença, a diferença entre
ambas é zero dos dois lados, logo marcaram o mesmo e o quociente entre elas é 1 para as duas.

## Artigo 87.º ponto 7 — o Regulamento Técnico-Pedagógico dos Escolares e Benjamins

É o que explica a forma do boletim destes escalões, e sem ele a grelha `5I` não se lê.

- **7.1** — o jogo é duas partes de 16 minutos de tempo útil, cada uma subdividida em **dois
  períodos de 8 minutos**. São as quatro "meias partes" das colunas `1ª 2ª 3ª 4ª`.
- **7.3** — não há pedidos de interrupção de tempo.
- **7.4** — é **obrigatório** que, em cada parte do jogo, todos os atletas da equipa
  participem integralmente numa das suas meias partes. Daí o desenho: 10 atletas × 2 meias
  partes = 20 = 4 meias partes × 5 em pista.
- **7.4.1** — nenhum atleta pode participar nas quatro meias partes, **excepto** o
  guarda-redes de uma equipa que só apresente um. É a excepção que o Artigo 92.º 4.1.6 cita.
- **7.4.2** — todas as equipas devem apresentar dez atletas, dois deles guarda-redes.
- **7.4.2.1** — com menos de dez, nenhum deles deve fazer três partes consecutivas.
- **7.4.3** — só é considerado como tendo feito uma meia parte quem a jogou **na sua
  totalidade**, excepto em caso de lesão ou doença súbita comprovada pelo árbitro e referida
  no boletim e na folha de controlo de jogo.
- **7.6** — quem substitui temporariamente outro conta como tendo feito a meia parte inteira.
- **7.7** — quem participa em 3 meias partes seguidas ou nas 4 conta como tendo participado na
  totalidade, mesmo que não o tenha feito.

O 7.4.3 e o 7.6 juntos são a razão de a grelha do cinco inicial servir de registo de
participação neste escalão: quem entra numa meia parte fá-la toda, por definição.

## Artigo 92.º — pontuação para o Mérito da Formação

Aplica-se (ponto 1) aos Encontros Distritais/Regionais de Escolares e de Benjamins e às Taças
APL de Escolares, Benjamins e Bambis. Em 2026/27 só existem as oito provas de Encontros.

O ponto 2.1 diz como se escalona: a pontuação é atribuída **no final de cada jogo**, e no
final da prova faz-se o **somatório de todos os jogos**.

### Bonificações (ponto 3), por jogo e por equipa

| 3.1 | por cada atleta participante no jogo | +1 |
| 3.2 | equipa que marque mais golos | +3 |
| 3.3 | ambas com o mesmo número de golos | +1 |
| 3.4 | equipas completas (2 GR e 8 JC) | +1 |

### Penalizações aos atletas e à equipa (ponto 4.1)

| 4.1.1 | equipa que apresente menos de 8 atletas | -1 |
| 4.1.2 | equipas só com um guarda-redes | -1 |
| 4.1.3 | **até** 8 atletas, por cada um que jogue 3 períodos consecutivos | -1 |
| 4.1.4 | **mais de** 8 atletas, por cada um que jogue 3 períodos | -1 |
| 4.1.5 | **mais de** 8 atletas, por cada um que jogue 3 períodos consecutivos | -2 |
| 4.1.6 | por cada atleta que jogue as quatro meias partes (excepto o GR, pelo 87.º 7.4.1) | -4 |
| 4.1.7 | atleta que participe num só período na sua totalidade | -6, sem bonificações, e multa |
| 4.1.8 | falta de comparência | -10 |

O 4.1.7 traz uma excepção: não se aplica "em caso de lesão ou situação impeditiva que deve ser
comprovada pelo árbitro e referido no Boletim de Jogo Oficial e Folha de Controlo de Jogo".

### Penalizações aos não atletas (ponto 4.2)

Cartão azul a um não atleta -2; vermelho por acumulação -4; vermelho directo -6.

## O que o código faz com isto, e o que não faz

| Artigo | Onde | Estado |
|---|---|---|
| 7.º 2 | `tabela.py` `_Acumulador.pontos` | aplicado, e medido contra 151 linhas publicadas |
| 7.º 4 e 5 | `tabela.py` `_ordenar` | aplicado, com a mini-tabela só quando todos os pares já jogaram |
| 87.º 7.1 | `parsers/participacao.py` | é a leitura das quatro colunas |
| 87.º 7.4.1 | `merito.py`, excepção do 4.1.6 | aplicado |
| 92.º 3 e 4.1.1–4.1.6 | `merito.py` | aplicados |
| 92.º 4.1.7 | `merito.py` | **detectado e não descontado** — a excepção de lesão não é legível |
| 92.º 4.1.8 | — | não aplicável: um jogo sem comparência não tem boletim para ler |
| 92.º 4.2 | — | **não aplicado**: a grelha do boletim não tem as colunas do banco |

Duas leituras literais que o `merito.py` toma e que valem a pena saber:

1. **O 4.1.4 e o 4.1.5 somam-se** numa equipa com mais de 8 atletas — três meias partes
   seguidas são também três meias partes, -1 e -2. O regulamento não diz que uma substitui a
   outra.
2. **Quem faz as quatro fica fora do 4.1.3/4.1.5**: tem regra própria, mais pesada, no 4.1.6.
   Somar as duas castigava duas vezes a mesma falha.

## Artigo 93.º ponto 4.1 — porque é que a nossa tabela nunca é oficial

A pontuação que conta é preenchida pelos delegados das equipas na Folha de Controlo de Jogo,
em triplicado e em papel, "para posteriormente ser validada pelo Comité Técnico para o Hóquei
em Patins da APL". A nossa é lida do boletim que a associação publica. Onde as duas
discordarem, a oficial é a que manda — e a app di-lo em cada tabela.
