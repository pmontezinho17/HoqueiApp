# As ligas nacionais — o plano (09/11/2026)

O dono pediu a 09/11/2026 que se começasse a planear **com cuidado** a entrada das competições
nacionais — o Campeonato Placard, a 2.ª e a 3.ª divisão e os femininos —, por fases e não tudo
de uma vez. Trouxe três sites que conhecia. Este documento é o plano: o que se mediu, a fonte
escolhida, o custo de cada fase em pedidos e o que fica por decidir. É o item **S10** do
[03-backlog.md](03-backlog.md).

**Nada disto está construído.** O que aqui está foi medido com 29 pedidos, um por segundo e com
o `User-Agent` do raspador: 20 à plataforma da FPP, 7 ao `hp.fpp.pt` e 2 ao `hoqueipatins.pt`.

## As três fontes, e a que se usa

| Fonte | O que é | Uso |
|---|---|---|
| `fpp.assyssoftware.es` | A plataforma da FPP. É **o mesmo programa** da APL ([01-fonte-de-dados.md](01-fonte-de-dados.md)), as mesmas páginas e o mesmo HTML | **a fonte** |
| `hp.fpp.pt` | O site público da própria FPP: outro servidor, outros identificadores (`/Competicao/493`, `/jogo/18727`), os nomes dos clubes com patrocinador (*"J. Pacense / Des Compagnons"*) | só para o ao vivo, a partir da fase 2 |
| `hoqueipatins.pt` | Um site de notícias privado: WordPress com SportsPress, publicidade e *"Copyright © 2026"* | **não se usa** |

**O `hoqueipatins.pt` fica de fora por princípio, e não por dificuldade.** É trabalho editorial
de outra pessoa, que publica os mesmos dados da FPP. Ler a cópia quando o original está à
mesma distância só acrescentava um intermediário e um dono a quem não pedimos nada.

**A plataforma da FPP lê-se com o raspador que já temos, sem mudar uma linha.** Medido a
09/11/2026:

- a lista de competições da época 2026/27 (`id_temp=11`) dá **18**, e o `competicoes()` lê-as
  todas, com a categoria;
- os 18 calendários dão **1 566 jogos e 154 equipas** no `calendario()`;
- a ficha do J. PACENSE/DES COMPAGNONS 5–3 AJ VIANA (`partido.asp?id=18262`, Placard, 08/11)
  tem 84 KB e o `ficha()` lê-a inteira: 33 eventos na cronologia — os 8 golos com parte e
  relógio, 8 faltas de equipa, 6 descontos de tempo, 5 cartões, 2 penáltis falhados —, o
  boletim com os parciais e os seis oficiais, e as faltas de cada equipa;
- as zonas vêm no nome da competição (*"CAMPEONATO NACIONAL 2ª DIVISAO - ZONA NORTE"*), que é
  a forma que o agrupamento em séries já reconhece.

| Competição | Jogos | Equipas | Época |
|---|---|---|---|
| Campeonato Placard (1.ª) | 182 | 14 | 08/11 → 22/05 |
| 2.ª divisão, Norte e Sul | 182 + 182 | 14 + 14 | 24/10 → 22/05 |
| 3.ª divisão, Norte A, Norte B, Sul A, Sul B | 182 + 182 + 156 + 182 | 14 + 14 + 13 + 14 | 24/10 → 30/05 |
| Feminino, Norte, Centro e Sul | 30 + 30 + 30 | 6 + 6 + 6 | 07/11 → 07/02 |
| Sub-23, Norte, Centro e Sul | 56 + 56 + 90 | 8 + 8 + 10 | 06/11 → 09/04 |
| Taça de Portugal, Elite Cup (M e F), Supertaças (M e F) | 14 + 7 + 3 + 1 + 1 | — | até 29/11 |

Um jogo da 3.ª Sul A tem a data de **06/02/2007**: é um erro da fonte, e o parser aceita-o
sem rebentar. Os Sub-19 a Sub-13 nacionais ainda não aparecem: são fases finais que se
publicam mais tarde na época.

## O que muda as contas: o servidor é o mesmo da APL

`fpp.assyssoftware.es` e `aplisboa.assyssoftware.es` resolvem para o mesmo endereço,
**85.152.58.11** (medido a 09/11/2026). O limite de **um pedido por segundo é do servidor, e
passa a ser um só para as duas**, não um para cada. Cada pedido nacional é um pedido a menos
para a APL no mesmo segundo.

O ciclo ao vivo, como existe hoje, lê a ficha de cada jogo a decorrer de 30 em 30 segundos.
Medido nos calendários de 09/11/2026, contando 1h45 por jogo nacional e 1h15 por jogo da APL:

| | jogos ao mesmo tempo |
|---|---|
| nacional, num sábado (mediana de 31 sábados) | 12 |
| nacional, o pior dia (09/02/2027) | 30 |
| **APL e nacional juntos**, em 8/11, 15/11 e 22/11 | **24 a 25** |

Vinte e cinco fichas de 30 em 30 segundos são **0,83 pedidos por segundo**, encostados ao
limite; num dia como o 09/02 passa-se. **Pôr o nacional no ciclo ao vivo tal como ele é não
cabe na postura.**

### A saída: a página "Jogos do Dia" do `hp.fpp.pt`

`hp.fpp.pt/Direto` traz numa resposta de **11 KB todos os jogos nacionais do dia**, com
resultado e estado — à hora da medição, um jogo da 3.ª Norte A ao intervalo, 1–0. Está noutro
servidor (quatro endereços, com uma cache à frente: `x-cache: HIT`), e não é o da APL.

O ao vivo nacional passa a custar **um pedido de 30 em 30 segundos, haja os jogos que houver**,
e zero pedidos ao servidor partilhado enquanto o jogo decorre. A ficha completa — a cronologia,
o boletim — pede-se à plataforma uma vez, quando o jogo acaba, como hoje.

Há três coisas a medir antes de construir em cima disto:

1. **Se a página se atrasa** em relação à ficha da plataforma. Mede-se num fim de semana,
   lendo as duas para os mesmos jogos.
2. **Como se ligam os jogos dos dois sites.** Os identificadores são outros (o Pacense–Viana é
   o `18262` na plataforma e o `18727` no `hp.fpp.pt`) e os nomes também. A ligação faz-se pela
   data, pela hora e pelas equipas, com uma tabela de grafias — a mesma ideia das grafias de
   clubes que já existe.
3. **O que a página tem fora de época e num dia sem jogos**, para a regra de não pedir nada.

O `hp.fpp.pt` também actualiza a cronologia de cada jogo de 15 em 15 segundos, por um pedido a
`/Views/ajax_jogo.php` com um `token`. **Não se usa**: é a página a falar consigo própria, com
uma chave que não é para nós.

## As fases

Cada fase é uma entrega de segunda-feira, como as outras ([10-processo.md](10-processo.md)), e
só começa depois de a anterior estar validada pelo dono. A primeira versão deste plano tinha o
ao vivo numa fase 2 à parte; o dono juntou-o à fase 1 a 09/11/2026, e a numeração das outras
fica como estava para não partir as referências.

| Fase | O que entra | Pedidos a mais | Critério de aceitação |
|---|---|---|---|
| **1** | **O Placard, com ao vivo**: resultados, calendário, classificação, fichas e marcadores, e o placar a mexer pela "Jogos do Dia" | +1 a 2 por ronda (o calendário do Placard) e ~7 fichas por jornada, cada uma lida uma vez; durante os jogos, 1 a cada 30 s ao `hp.fpp.pt` e zero ao servidor partilhado | as 14 equipas e os 182 jogos no site de testes, com a classificação a bater com a da FPP; um jogo acompanhado do princípio ao fim com o atraso medido, e a ficha pedida uma só vez no fim |
| **2** | *juntou-se à 1, por decisão do dono a 09/11* | — | — |
| **3** | 2.ª e 3.ª divisão e o Feminino | até +9 calendários por ronda — só os das competições com jogos nesse dia — e ~40 fichas por semana | as zonas mostradas como séries, e o ao vivo das três a custar o mesmo pedido da fase 2 |
| **4** | Sub-23 e as taças | +8 calendários (3 zonas dos Sub-23 e 5 taças), e as taças têm poucos jogos | — |
| depois | Outras associações regionais (o Norte, sugestão #41 do arquivo privado) | por medir | — |

As regras da postura valem para todas, como valem para a APL ([AGENTS.md](../AGENTS.md)):

- **Num dia sem jogos nacionais não se pede nada** à FPP, e quem o diz é a agenda publicada
  dela, como na APL.
- **Cada ronda nova diz em comentário quanto pede no pico** e porque vale a pena.
- **A FPP entra no registo da consola** como mais uma origem das idas ao servidor, porque é o
  mesmo servidor: o gráfico das idas tem de mostrar as duas juntas para se ver o total.

## O contrato de dados

Os dados nacionais ficam numa árvore nova, **`/v1/fpp/2026-27/…`**, com a mesma forma da
`/v1/aplisboa/2026-27/…`. **Nada do que existe muda de nome nem de sítio**: as apps antigas em
cache nos telemóveis continuam a ler o que sempre leram, e simplesmente não sabem da árvore
nova.

No web, o caminho da APL está num só sítio — `web/src/lib/dados.ts`, mais o
`AdicionarCalendario.svelte` —, e o raspador já recebe o `--tenant`. O trabalho grande não é
ler a fonte: é a app saber que há duas.

**O número de ficheiros publicados vai triplicar.** Hoje são 1 627 em `web/static/v1`. No fim da
época, com a APL inteira e as competições nacionais, serão ~5 500, porque cada jogo tem a ficha
e o pré-jogo. Antes da fase 3 tem de se confirmar o limite de ficheiros por publicação do
Cloudflare Pages no plano grátis, porque uma publicação do Pages é inteira e atómica.

**O site de testes precisa da sua cópia** dos dados nacionais no R2, como tem os da APL, e o
botão do "DEV · Site de testes" de uma finalidade nova, com o custo escrito.

## Como se mostra

São 13 competições de liga, 154 equipas e, num fim de semana, até 30 jogos da APL e 38
nacionais. O que se propõe, para validar no site de testes a cada fase:

- **Competições** — um primeiro nível *Nacional · Lisboa*. Dentro do Nacional, uma linha por
  divisão, e as zonas como as séries aparecem hoje. Não há ecrã novo: o modelo das séries
  serve.
- **Jogos do dia** — agrupar por âmbito e depois por competição, com os jogos do teu clube
  primeiro, como já acontece com os seguidos. A fase 1 só junta os 7 do Placard, por isso a
  forma vê-se pequena antes de crescer.
- **O Meu Clube** — é onde está o maior valor: o mesmo clube com os seniores no Placard e a
  formação na APL. Para isso é preciso saber que é o mesmo clube nas duas fontes, e a
  proporção de clubes em que os nomes batem ainda não está medida.

## As decisões do dono (09/11/2026)

1. **A fonte** — a plataforma da FPP para os calendários, as classificações e as fichas, e a
   "Jogos do Dia" do `hp.fpp.pt` para o ao vivo. A recomendação deste documento.
2. **A FPP fica a saber antes.** Um email semelhante ao da APL, enviado pelo dono, e **a fase 1
   só vai a produção depois de ele ter saído**. Pode construir-se e validar-se no site de testes
   antes disso. O rascunho está em [`email-fpp.txt`](email-fpp.txt).
3. **A fase 1 é o Placard com ao vivo**, e não só os resultados. Isso põe a medição do atraso da
   "Jogos do Dia" antes da construção, e não depois.

## O email à FPP

O rascunho para copiar e colar é o [`email-fpp.txt`](email-fpp.txt), em texto simples pela mesma
razão do da APL: copiado de markdown, cola mal. Tem o mesmo esqueleto do
[06-email-apl.md](06-email-apl.md), com três diferenças de propósito:

- **Diz a cadência de hoje**, e não a de 01/10. O email da APL dizia "algumas vezes por dia",
  que era verdade nessa data e deixou de ser com o ciclo ao vivo. Aqui o ao vivo está escrito:
  um pedido de 30 em 30 segundos à "Jogos do Dia", para todos os jogos ao mesmo tempo.
- **Não pergunta pelos nomes dos atletas.** A fase 1 é só o Placard, que é sénior. A pergunta
  volta quando entrarem os Sub-23, que podem ter atletas menores.
- **Começa pelo Placard**, e diz-o. Pedir parecer sobre as 18 competições de uma vez era
  pedir sobre uma coisa que ainda não existe.

Escolhas do dono, marcadas no texto: o `[CLUBE]`, o `[telefone]`, e a frase `[OPCIONAL]` sobre
o conhecimento da APL — se a quer dizer à FPP é decisão dele. Os destinatários saíram da página
de contactos da FPP (`fpp.pt/contactos/`, lida a 09/11/2026): `hoquei@fpp.pt` é o do
departamento da modalidade, e o `comunicacao@fpp.pt` vai em cópia porque é quem publica o
`hp.fpp.pt`. Se preferir um só, o `hoquei@` chega.

## A medição antes de construir: o atraso da "Jogos do Dia"

O ao vivo da fase 1 assenta numa página que ainda não vimos num jogo do princípio ao fim. Antes
de escrever o ciclo, mede-se num sábado com jornada do Placard: a "Jogos do Dia" de 30 em 30
segundos durante a janela dos jogos, e a ficha da plataforma de **um** desses jogos, com a mesma
cadência, como referência — é a ficha que diz quando um golo entrou na base de dados.

**Aprovada pelo dono a 09/11/2026, para sábado 21/11**, a 3.ª jornada. A primeira proposta era
14/11, mas a GitHub só corre workflows agendados a partir do `main`, e o workflow só lá chega com
a entrega de 16/11; o dono escolheu esperar uma semana a abrir uma excepção ao processo. Ganha-se
com isso que os pedidos da medição apareçam na consola, porque o observador aprende a origem
`medicao` na mesma entrega.

| | pedidos | a quem |
|---|---|---|
| "Jogos do Dia", das 17:25 às 23:00 de 21/11/2026 | ~670 | `hp.fpp.pt` |
| a ficha do SPORTING CP–SL BENFICA das 19:30 (`partido.asp?id=18279`), das 19:20 até 10 minutos depois do fim | ~250 | o servidor partilhado com a APL |

A ficha de referência é **uma só** de propósito: num sábado à noite o ciclo ao vivo da APL pode
estar a correr, e um jogo a mais por ronda cabe no limite, cinco não. A janela apanha os jogos
das 18:00, 18:30, 19:30 e 21:30 inteiros, e o das 17:00 a partir da segunda parte.

**Como corre:** o workflow "MEDIÇÃO · Atraso da Jogos do Dia da FPP"
(`.github/workflows/medir-direto.yml`) arranca às 17:25 e corre o
`scraper/src/hoquei/medir_direto.py` num job só, que faz o próprio compasso. **A trava está no
código:** fora de 21/11/2026 o script sai sem pedir nada. O diário — uma linha por mudança, só
resultados, estados e contagens, sem nomes de atletas — fica em
`data-samples/medicao-direto/2026-11-21.jsonl`, e o resumo da corrida dá o atraso de cada golo.
O resultado entra aqui, e depois o workflow e o script saem.

## Como reproduzir

As competições e um calendário (UTF-8):

```bash
curl -s -A "hoqueiAPP/0.1 (+https://github.com/pmontezinho17/HoqueiApp)" \
  "https://fpp.assyssoftware.es/intranet/web/?seccion=competiciones&id_temp=11&id_modal=1"
curl -s -A "hoqueiAPP/0.1 (+https://github.com/pmontezinho17/HoqueiApp)" \
  "https://fpp.assyssoftware.es/intranet/web/?seccion=calendario&grupo=&id_comp=348&id_temp=11&id_modal=1"
```

O servidor partilhado:

```bash
dig +short fpp.assyssoftware.es aplisboa.assyssoftware.es
```

Os jogos do dia no site da FPP:

```bash
curl -s -A "hoqueiAPP/0.1 (+https://github.com/pmontezinho17/HoqueiApp)" https://hp.fpp.pt/Direto
```

Os calendários lêem-se com o `calendario()` de `scraper/src/hoquei/parsers/calendario.py`, e as
fichas com o `ficha()` de `parsers/jogo.py`, tal como os da APL.
