# Avaliação: Scrapling

**Pedido:** avaliar como juntar o [Scrapling](https://github.com/D4Vinci/Scrapling) à aplicação.
**Data:** 02/10/2026 · **Veredicto: não adoptar.** Uma das funcionalidades de cabeça seria
activamente má para este projecto, e as outras resolvem problemas que não temos.

Isto não é um juízo sobre a biblioteca, que é boa e está bem feita. É sobre o encaixe.

## O que é, factualmente

| | |
|---|---|
| Versão | 0.4.15 |
| Licença | BSD-3-Clause (compatível connosco) |
| Python | ≥ 3.10 (corremos 3.12 — sem problema) |
| Dependências base | **6** — `lxml`, `cssselect`, `orjson`, `tld`, `w3lib`, `typing_extensions` |
| Browser | **não vem por defeito** — Playwright só no extra `[fetchers]` |

Funcionalidades anunciadas: *spiders* com concorrência e checkpoints; fetchers com browser e
**modo stealth** (impersonação de TLS, spoofing de cabeçalhos, contorno de Cloudflare
Turnstile); **adaptive element tracking**, que relocaliza elementos depois de o site mudar,
por algoritmos de semelhança; sessões com rotação de proxies; servidor MCP e conversão para
markdown para LLMs.

## O que temos hoje

`httpx` + `selectolax`, 3 dependências, 78 testes contra HTML gravado. A fonte é Classic
ASP/IIS: HTML servido pelo servidor, **sem JavaScript**, sem anti-bot, sem CORS.

## Funcionalidade a funcionalidade

| Funcionalidade | Serve-nos? |
|---|---|
| Fetcher com browser (Playwright) | **Não.** A fonte não tem uma linha de JS — os dados vêm no HTML. Já está provado: os nossos testes correm contra HTML gravado e extraem tudo |
| Spiders, concorrência, throttling | **Não.** Fazemos 1 pedido por segundo *de propósito*, contra um servidor pequeno de uma federação. O nosso gargalo é a boa educação, não o paralelismo |
| Rotação de proxies | **Não.** Fazemos 1 scrape central a cada 2h, de um IP só, identificado |
| Servidor MCP, markdown para LLM | **Não.** O nosso destino é JSON estruturado, não prosa para um modelo |
| **Modo stealth / contorno de anti-bot** | **Não — e ver a secção abaixo** |
| **Adaptive element tracking** | É a única candidata séria. Ver o teste a seguir |

## O teste que decide: teria evitado as avarias que tivemos de facto?

Tivemos duas avarias reais de parsing neste projecto. Corri as duas contra a promessa do
*adaptive tracking*, que é relocalizar um elemento quando o site muda de desenho.

**1. As 9 vs 10 colunas do calendário** — 256 de 307 linhas deitadas fora em silêncio,
durante 11 dias, até o utilizador reparar. O código era:

```python
if len(celulas) == 10:  ...
elif len(celulas) == 9: ...
else: return None        # ← 256 linhas desapareciam aqui
```

O `css("tr")` continuou a encontrar as linhas. O `css("td")` continuou a encontrar as células.
**O seletor nunca falhou** — mudou o *formato* da linha, não a sua localização. O adaptive
tracking não tem nada a relocalizar, e portanto não ajuda.

**2. O seletor com vírgula do selectolax** — `css("div.a, div.b")` devolve os nós agrupados
por seletor e não por ordem no documento, e as 37 competições foram todas para a última
categoria. Foi um erro de lógica nosso, com o seletor a funcionar na perfeição. Também aqui
não há nada a relocalizar.

**Duas em duas das nossas avarias reais não seriam evitadas pela funcionalidade principal.**
Não é coincidência: os nossos parsers são **posicionais**, não dependem de seletores frágeis.
Dos nossos 28 seletores, 14 são `td`/`tr` genéricos e só 10 usam id ou classe.

## A objecção que não é técnica, e é a mais importante

O **modo stealth** é, para este projecto em particular, um risco e não uma funcionalidade.

A nossa postura está escrita e é deliberada: 1 pedido por segundo, User-Agent identificável,
1 scrape central em vez de N pedidos por utilizador, e **um email enviado à APL a 01/10 a
perguntar se vêem inconveniente** — ainda sem resposta. O maior risco registado no backlog é
*"federação pede para parar"*, e a mitigação é *"contacto antecipado, atribuição visível,
scraping educado"*.

Impersonar fingerprints de TLS e contornar protecções anti-bot é o oposto exacto disso. Numa
app que vai ser divulgada a pais e clubes, e cujo autor já se identificou por email à
federação, trazer ferramentas de evasão para o repositório transformaria uma conversa fácil
numa difícil. Não vale a pena — sobretudo para contornar protecções que **esta fonte não tem**.

## E se adoptássemos só o adaptive tracking nos 10 seletores que têm id/classe?

Vale a pena pensar, mas eu continuo contra, por uma razão que é fácil de inverter:

**Nós queremos *saber* que a fonte mudou.** Uma mudança no HTML da Assys é informação — diz-nos
que a plataforma foi actualizada e que há coisas para reverificar. Um seletor que se
relocaliza sozinho **apaga esse sinal** e continua a servir dados que ninguém reviu. Para um
scraper comercial que só quer os dados, é o comportamento certo. Para nós, que publicamos
números a pais que confiam neles, prefiro partir alto e cedo.

E o custo de partir é baixo: o parser vive no backend, não no telemóvel de ninguém, e
corrige-se com um deploy de minutos (Decisão 1 da arquitetura).

## O que eu faria em vez disto, para o mesmo problema

O risco real — *"a fonte muda e o parser devolve menos sem dar erro"* — resolve-se com o que
já está proposto na Fase 9:

* **B9.2** — uma linha por ronda do scraper, com contagens por tabela;
* **B9.6** — a ronda falha se as contagens caírem acima de um limiar.

Isto apanhava as 9-vs-10 colunas na ronda seguinte, em vez de 11 dias depois, e apanha também
as avarias que um adaptive tracker não vê. Meio dia de trabalho, zero dependências novas.

## Quando é que eu mudaria de opinião

Esta avaliação depende de factos que podem mudar. Reabrir se:

1. **A fonte passar a renderizar por JavaScript.** Aí o fetcher com browser deixa de ser
   supérfluo e passa a ser obrigatório — e o Scrapling é dos melhores sítios para o ir buscar.
2. **A fonte passar a ter protecção anti-bot.** Aí a pergunta deixa de ser técnica: é se
   temos autorização. Com autorização, esta biblioteca é uma boa ferramenta; sem ela, a
   resposta é não scrapar, e não é contornar.
3. **Precisarmos de scrapar fontes fora da Assys** — outra federação, outra plataforma, com
   dezenas de domínios. Os `spiders` e a gestão de sessões passariam a pagar-se. Hoje os três
   inquilinos confirmados (`fpp`, `aplisboa`, `apsetubal`) são a *mesma* plataforma e um só
   parser serve os três.

## Nota de empréstimo

Há uma ideia do Scrapling que vale a pena roubar sem a dependência: ele guarda uma
**impressão do elemento** para o reconhecer depois. A mesma ideia, aplicada à estrutura em vez
do elemento — guardar por ronda o número de colunas por tipo de tabela e avisar quando muda —
é barata e dá-nos o aviso sem nos dar a relocalização silenciosa. Fica como **B9.19**.
