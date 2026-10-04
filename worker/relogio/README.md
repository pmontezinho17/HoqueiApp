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

1. Lê a `agenda.json` que nós próprios publicamos — não toca na APL.
2. Se hoje não tem jogos, não faz mais nada (e nem sequer paga o custo de interpretar o
   ficheiro: faz uma procura de texto primeiro).
3. Se há um jogo a decorrer, ou um que comece dentro de 45 minutos, pede à GitHub para
   lançar a `aovivo.yml`.

Se já houver uma corrida a decorrer, a `concurrency` do workflow põe a nova **em espera** e
ela arranca mal a primeira acabe. É esse revezamento que dá cobertura contínua.

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
| `disparo falhou 403` | o token não tem *Actions: Read and write*, ou não tem acesso ao repositório |
| `disparo falhou 404` | o nome do repositório ou do workflow está errado no `wrangler.toml` |
| `agenda: HTTP 404` | o endereço da agenda mudou — está no `wrangler.toml` |

Para desligar o relógio sem apagar nada: `npx wrangler deployments` e depois
`npx wrangler delete`, ou tira os `crons` do `wrangler.toml` e volta a publicar.

## Testes

A lógica de decisão — fusos, janelas, que jogos contam — corre em Node, sem Cloudflare:

```bash
cd "$(git rev-parse --show-toplevel)/worker/relogio" && node teste.mjs
```
