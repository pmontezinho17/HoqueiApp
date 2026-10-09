# O relógio externo

Um Worker da Cloudflare que acorda a ronda ao vivo quando há jogos, porque **o agendador da
GitHub não o faz**.

Medido a 4 de outubro de 2026, um sábado inteiro de jogos: das 8 corridas agendadas de
`dados.yml` saíram 2, das 3 de `aovivo.yml` saíram **zero**, e as quatro que correram foram
todas lançadas à mão. E não é atraso de fila — o tempo entre a criação e o arranque de cada
corrida agendada era de 0 segundos. A GitHub não atrasa as corridas agendadas; não as cria.
Os `cron` da Cloudflare criam.

Isto **não substitui** a rede de `cron` que está na `aovivo.yml`. São duas camadas sobre a
mesma falha, de propósito: se o Worker morrer, a rede cobre o caso normal; se a rede falhar
como falhou, o Worker acorda na mesma.

## Isto é preciso fazer todos os dias?

**Não.** É uma instalação única, de uns 10 minutos. Depois disto não há nada a fazer — nem
diário, nem semanal.

A única coisa que volta a precisar de ti é a validade do *token*, e isso só se lhe puseres
prazo. O passo 1 explica a escolha.

## O que o Worker faz, de 10 em 10 minutos

1. Lê a `agenda.json` e o `meta.json` que nós próprios publicamos — não toca na APL.
2. Se hoje não tem jogos, não faz mais nada (e nem sequer paga o custo de interpretar o
   ficheiro: faz uma procura de texto primeiro).
3. Se há um jogo a decorrer, ou um que comece dentro de 45 minutos, pede à GitHub para
   lançar a `aovivo.yml`.
4. **Cão de guarda:** se há jogos que já deviam ter acabado e continuam sem resultado, e os
   nossos dados também já estão velhos, lança a ronda completa.

Se já houver uma corrida a decorrer, a `concurrency` do workflow põe a nova **em espera** e
ela arranca mal a primeira acabe. É esse revezamento que dá cobertura contínua.

### O cão de guarda não avisa: corrige

O pior modo de falha desta cadeia não é falhar — é **falhar em silêncio**. A 4 de outubro as
rondas pararam às 16:28 e a aplicação ficou a mostrar "por começar" em jogos que já tinham
acabado 15–0. Só se soube porque o dono do projecto reparou. Um alarme por email não resolve
isso, porque o modo de falha é precisamente não haver ninguém a olhar.

A regra tem três condições, e são as três que evitam martelar a fonte:

| | Condição | Porquê |
|---|---|---|
| 1 | um jogo de hoje começou há **90 min** ou mais e continua sem resultado nem marca de ao vivo | em hóquei em patins o jogo mais longo decorre em 70–80 minutos |
| 2 | o nosso `meta.json` tem **40 min** ou mais | se publicámos há cinco minutos e continua sem resultado, o atraso é da fonte e correr outra vez não traz nada |
| 3 | a última ronda completa foi há **45 min** ou mais | uma ronda custa ~75 pedidos à APL |

O limiar dos 90 minutos saiu de uma medição e não de um palpite. Com 120, reproduzi o cão de
guarda contra a agenda real de 4/10 às 18:14 — a cadeia partida, cinco jogos sem resultado —
e ele **não disparava**: o mais antigo tinha 104 minutos. Com 90, dispara às **18:00**,
catorze minutos antes de o problema ter sido notado por uma pessoa.

Para ver o que ele pensa agora, sem disparar nada, o endereço do Worker responde com um
campo `guarda`.

## Instalação

Todos os comandos abaixo começam por saltar para a pasta do Worker a partir da raiz do
repositório, seja qual for a pasta onde estás. Se usasses `cd worker/relogio` à bruta, o
comando corria à primeira e falhava à segunda — a partir de dentro da pasta já não há
`worker/relogio` para onde entrar.


### 1. Criar o token

O Worker precisa de permissão para lançar um workflow, e só isso.

1. Vai a **github.com → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Token name**: `hoquei-relogio`
3. **Expiration**: aqui tens de escolher.
   - **Sem prazo** (*No expiration*): nunca mais pensas nisto. É o que eu escolheria para
     um token que só pode carregar num botão num repositório público.
   - **1 ano**: mais prudente, mas daqui a um ano o relógio pára em silêncio num sábado de
     jogos e vais demorar a perceber porquê. Se escolheres isto, mete já um lembrete no
     calendário.
4. **Repository access** → *Only select repositories* → **HoqueiApp**.
5. **Permissions** → *Repository permissions* → **Actions: Read and write**. Mais nenhuma.
6. Gera e **copia o token**. A GitHub só o mostra uma vez.

Não me mandes o token nem o ponhas num ficheiro do repositório. O passo 3 entrega-o
directamente à Cloudflare.

### 2. Entrar na Cloudflare

```bash
cd "$(git rev-parse --show-toplevel)/worker/relogio" && npx wrangler login
```

Abre o browser e autoriza. É a mesma conta onde está o `hoquei` do Pages.

### 3. Guardar o token como segredo

```bash
cd "$(git rev-parse --show-toplevel)/worker/relogio" && npx wrangler secret put GITHUB_TOKEN
```

Cola o token quando ele pedir. Fica guardado na Cloudflare, encriptado, e **não aparece no
repositório nem nos registos**.

### 4. Publicar

```bash
cd "$(git rev-parse --show-toplevel)/worker/relogio" && npx wrangler deploy
```

No fim ele diz o endereço do Worker e os `cron` que registou.

## Verificar que ficou bem

Abre o endereço do Worker no browser. Ele responde com o que **faria** agora, sem disparar
nada:

```json
{
  "agora": "2026-10-04 19:30 Europe/Lisbon",
  "dispararia": true,
  "jogos": ["18:00 CRIAR-T GD–HC SINTRA a decorrer"]
}
```

Para provar que o token tem permissão para lançar workflows, **sem lançar nenhum**:

```bash
curl -s "https://hoquei-relogio.torneiopa.workers.dev/?verificar" | python3 -m json.tool
```

Pede o disparo sobre um ramo que não existe. Sem permissão, a GitHub responde 403 antes de
olhar para o ramo; com permissão, chega a olhar e responde 422 *No ref found*. **Aqui o 422 é
a boa notícia** e a resposta di-lo por palavras.

Serve porque a prova a sério — um disparo verdadeiro — só aparece quando há jogos, e isso
pode ser no dia seguinte.

Para ver os disparos a acontecer em tempo real:

```bash
cd "$(git rev-parse --show-toplevel)/worker/relogio" && npx wrangler tail
```

Num dia sem jogos deves ver `nada a cobrir (sem jogos hoje)` de 10 em 10 minutos. Num dia de
jogos, `1 jogo(s) — disparo aceite`.

## Se alguma coisa correr mal

| O que vês no `wrangler tail` | O que é |
|---|---|
| `disparo falhou 401` | o token está errado ou expirou — repete os passos 1 e 3 |
| `disparo falhou 403 {"message":"Resource not accessible by personal access token"}` | o token autentica, mas falta-lhe a permissão. Ver abaixo — **não é preciso criar um token novo** |
| `disparo falhou 404` | o nome do repositório ou do workflow está errado no `wrangler.toml` |
| `agenda: HTTP 404` | o endereço da agenda mudou — está no `wrangler.toml` |

### O 403 "Resource not accessible by personal access token"

Aconteceu à primeira, e é fácil de deixar passar: a permissão **Actions** não vem no ecrã
principal de criação do token — está dentro de *Repository permissions*, que começa fechado e
tem três dezenas de linhas.

**Arranja-se no token que já existe, sem criar outro** — o valor do token não muda, por isso
o segredo na Cloudflare continua bom e não é preciso repetir o `wrangler secret put`:

1. github.com → **Settings → Developer settings → Personal access tokens → Fine-grained
   tokens** → clica no `hoquei-relogio`.
2. Em **Repository access**, confirma que está *Only select repositories* **com o HoqueiApp
   na lista**.
3. Abre **Permissions → Repository permissions**, procura **Actions** e põe
   **Read and write**.
4. Botão **Update token** no fundo da página.

Fica a valer dentro de segundos. O próximo tique do cron (de 10 em 10 minutos) já deve dizer
`disparo aceite` no `wrangler tail`.

Se mesmo assim der 403, acrescenta **Contents: Read-only** — a documentação da GitHub diz que
`Actions: write` chega, mas é a única outra permissão que alguma vez é precisa aqui.

Para desligar o relógio sem apagar nada: `npx wrangler deployments` e depois
`npx wrangler delete`, ou tira os `crons` do `wrangler.toml` e volta a publicar.

## Testes

A lógica de decisão — fusos, janelas, que jogos contam — corre em Node, sem Cloudflare:

```bash
cd "$(git rev-parse --show-toplevel)/worker/relogio" && node teste.mjs
```

## Tipos

```bash
npx wrangler types     # gera o worker-configuration.d.ts a partir do wrangler.toml
```

Não vai para o repositório — são ~16 000 linhas de tipos do runtime, úteis no editor e ruído
aqui. O que manda é o `wrangler.toml`, e os tipos são derivados dele: uma interface `Env`
escrita à mão divergiria das ligações a sério sem ninguém dar por isso.
