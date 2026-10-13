# Onde retomar

**Estado a 13/10/2026** · produção 🟢 [hoquei.pages.dev](https://hoquei.pages.dev) na versão
**1.1** · testes 🟢 [testes.hoquei.pages.dev](https://testes.hoquei.pages.dev) na **1.2**.

Este documento diz **em que pé está o projecto e por onde continuar**. O histórico vive nos
commits e no [03-backlog.md](03-backlog.md), que tem o estado item a item — e uma regra que se
aprendeu a pagar: *um backlog que mente é pior do que não ter nenhum*. Este ficheiro tinha nove
dias de atraso quando foi reescrito, e metade do que dizia já era falso.

## O que existe

| Ecrã | O que faz |
|---|---|
| `/` **Jogos** | fita de datas que se arrasta, equipas seguidas no topo, competições como secções colapsáveis, séries como sub-cabeçalho, minuto do jogo a decorrer |
| `/clube` **O Meu Clube** | favoritos por clube+escalão, próximo jogo, último resultado, posições |
| `/competicoes` | 20 grupos (de 37 competições), por escalão, só as que decorrem por omissão |
| `/competicoes/[grupo]` | Classificação · Calendário · Marcadores, séries empilhadas — e **Mérito** nos Encontros Distritais, onde o Artigo 92.º se aplica ([09-regulamento-apl.md](09-regulamento-apl.md)) |
| `/jogo/[id]` | cronologia, ficha, boletim, equipa técnica, barra compacta colada ao topo |
| `/equipa/[escalao]/[clube]` | a equipa: resumo, jogos, plantel |
| `/privacidade`, `/ajuda`, `/procurar`, `/mais` | o menu do ☰ e os ícones do cabeçalho |

Porque três separadores e não cinco: [04-benchmarking.md](04-benchmarking.md). Nem a FotMob nem
a Sofascore põem classificações no topo — vivem dentro da competição —, e esconder navegação
primária num menu corta a descoberta a metade.

Nos dados publicados: **37 competições, 803 jogos, 335 fichas, 213 feeds ICS**.

Testes: **315 no `scraper/`** (cinco deles marcados `fonte`, informativos no CI) e **297 no
`web/`**. Correr os dois antes de dar trabalho por feito:

```bash
cd scraper && uv run pytest
```

```bash
cd web && npm run check && npx vitest run
```

## Como isto chega ao ar

**Um `git push` não publica.** Quem leva código novo ao site é o `dados.yml`, com o disparo
`publicar_sempre` ou `so_publicar`. A excepção aprendida a 13/10: uma alteração ao **raspador**
entra na ronda agendada seguinte por si só, porque as corridas agendadas usam o ramo por omissão.

**O `main` é produção.** Trabalho não aprovado vive no `testes`, que é **um** site e só um — o
`ramo.yml` só dispara nesse ramo, e um ramo novo não ganha endereço nenhum. O site de testes lê
os **dados de produção** e difere só no código; desde 13/10 tem **base de dados própria**
(`ok4sticks-dados-testes`, ligada ao ambiente de *Preview*), para os dois ambientes serem iguais.

**Uma funcionalidade que não pode aparecer ainda vai a produção desligada.** O registo está em
`web/src/lib/bandeiras.ts`, cada entrada com o que esconde, o que apagar quando sair, e uma data
até à qual tem de estar resolvida — com um teste que falha quando a data passa.

**Publicar não é ter publicado.** O `scripts/verificar_producao.py` corre depois de cada
publicação nos dois publicadores e pergunta ao site se ele está a servir o que lhe mandámos.
Correr à mão contra qualquer dos dois:

```bash
python3 scripts/verificar_producao.py --base https://testes.hoquei.pages.dev
```

## As rondas de recolha

O problema nunca foi a cadência, foi **ninguém acordar o processo**: medido num sábado inteiro,
das 8 corridas agendadas do `dados.yml` saíram 2 e das 3 do `aovivo.yml` saíram **zero**. Três
camadas, que se cobrem umas às outras:

1. **Rede de `cron`** de 30 em 30 minutos nas horas de jogo, em vez de três disparos;
2. **ciclo longo** (5 h, rondas de 30 s), que sai quando não há nada a decorrer e o próximo jogo
   está a mais de 40 minutos;
3. **`concurrency` como revezamento**: uma corrida que dispare com outra a correr espera e
   arranca a seguir. É a única forma de auto-encadeamento sem um token pessoal.

E por cima, o **relógio** (`worker/relogio/`): um Worker que de 10 em 10 minutos lê a nossa
própria agenda e lança a ronda ao vivo se houver jogo a decorrer ou a começar dentro de 45
minutos. Existe porque os `cron` da Cloudflare disparam e os da GitHub não — está medido. Traz
também um cão de guarda que corrige, em vez de avisar, quando há jogos que já deviam ter acabado
e continuam sem resultado.

**E está a trabalhar**, não é teoria: das últimas 60 corridas do `aovivo.yml`, **32 foram
lançadas por ele** (`workflow_dispatch`) e 28 pelo agendador da GitHub — contado a 13/10/2026.
Num dia sem jogos ele não lança nada, de propósito, e por isso um dia desses dá só agendadas.

**Fecho do dia às 00:30**: o dia que acabou fecha-se e a mesma corrida republica a agenda, que é
o que estabelece os jogos de hoje — é por aqui que entra um jogo antecipado ou adiado. Essa ronda
corre sempre, e é ela que permite a regra de **num dia sem jogos não se pedir nada** (medido:
eram 28% de tudo o que pediríamos à APL até dezembro).

## O que está em curso (13/10/2026)

Quatro PRs abertos contra o `main`, nenhum junto — o dono junta-os num pacote ao fim da semana.
Todos já estão no `testes`.

| PR | O quê |
|---|---|
| #26 | a caixa "O que está mal" grava na D1 e vira registo sozinha |
| #27 | os avisos passam a saber fechar-se |
| #28 | B1.13 fecha-se sem código — as grafias de clube já não estão erradas |
| #29 | o sinal de "app aberta" volta, pelo lado do cliente |

O `sugestoes.yml` **nunca correu** e não pode correr: a GitHub só conhece workflows do ramo por
omissão, e ele ainda está num ramo. Faltam-lhe também o repositório privado `ok4sticks-sugestoes`
e o segredo `TOKEN_SUGESTOES`.

## O que falta, por valor

A lista a sério está no [03-backlog.md](03-backlog.md), secção *Próximo incremento*. Em resumo:

1. **pôr isto na mão de 5–10 pessoas** (L7.6/L7.7) — é o que muda o que vale a pena fazer a
   seguir; tudo o resto é adivinhar;
2. **movimento quando o resultado muda** — hoje um 2–1 passa a 3–1 e não se nota;
3. **Fase 9, a base de dados** — jogos antecipados, histórico, `events.json`;
4. **Fase 5, notificações** — o maior bloco que resta, e depende da 3.

## As coisas que mordem

Cinco, todas pagas com dinheiro real — tempo e dados errados no ar:

* **Durante uma janela de jogos há dois publicadores.** Nunca fazer `wrangler pages deploy` de
  uma cópia local: a árvore local é a do último commit e o CDN tem o que o ciclo ao vivo escreveu
  entretanto. Já apagou resultados reais duas vezes.
* **As Pages Functions têm quota.** No plano grátis cada invocação conta para os 100 000 pedidos
  diários da conta, e esgotá-los faz a Cloudflare **ignorar as Functions** e servir só os
  ficheiros estáticos — sem consola, sem contador, links directos a dar 404. Aconteceu duas vezes
  a 13/10, porque o `_routes.json` mandava lá **todos** os pedidos, incluindo cada sondagem de
  dados de cada telemóvel. Quem acrescentar um caminho muito pedido põe-no no `exclude`.
* **Produção degrada-se sozinha.** Com produção em baixo, o alias da **mesma** publicação servia
  tudo bem, do mesmo cliente e no mesmo minuto — logo é a configuração do anfitrião que se perde,
  e nada no repositório controla isso. Uma publicação nova repõe. É o que o `saude.yml` vigia de
  quinze em quinze minutos.
* **O contrato `/v1/...` é público e há builds antigos em cache nos telemóveis.** Renomear um
  campo ou um caminho deixa esses telefones com uma app vazia e sem explicação.
* **A faixa de dias tem três dias montados ao mesmo tempo**, por isso um `querySelector` apanha o
  vizinho fora do ecrã. Já enganou um teste e o tour guiado.

## Como ler um vídeo que o dono envia

Esta máquina não tem `ffmpeg` nem skill de vídeo. O caminho é Swift compilado na hora:
`AVAssetReader` para os fotogramas — **não** `AVAssetImageGenerator`, que encosta ao keyframe e
devolve o mesmo fotograma várias vezes — e `SpeechTranscriber` do macOS 26 para o áudio, em
`pt-PT`, tudo no aparelho. 65 s de vídeo = ~14 s. **O pedido real estava no áudio das duas
vezes**; pelos fotogramas sozinhos classifiquei mal a prioridade.

## Três coisas para quem chega agora

1. **A fonte é `{tenant}.assyssoftware.es/intranet/web/`** — HTML, sem API. Tenants confirmados:
   `fpp` (nacional), `aplisboa`, `apsetubal`; um parser serve todos. Cada jogo tem ~80 KB de
   detalhe em `partido.asp?id=N`.
2. **A app nunca faz scraping.** Raspador em Python → JSON estático no CDN → cliente fino que só
   lê. É a Decisão 1 em [02-arquitetura-e-stack.md](02-arquitetura-e-stack.md) e não está em
   discussão.
3. **Um `css("div.a, div.b")` no selectolax devolve os nós agrupados por selector**, não por
   ordem no documento. A primeira versão do parser de competições caminhava por irmãos e punha
   todas as provas na última categoria. A ligação certa é explícita: `onclick="verComp(N)"` →
   `div#cN`. Há um teste a guardar isto.
