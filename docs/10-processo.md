# O processo: do pedido ao ar

Como é que uma ideia chega à app, quem decide o quê em cada passo, e onde é que isso está
escrito em código em vez de na memória de alguém.

> Escrito a 17/10/2026, a pedido do dono, depois de ele dizer *"eu acho que neste momento este
> processo não está a ser bem feito"*. Tinha razão, e a secção
> "O que estava mal" diz exactamente onde.

## O que já existe, medido e não suposto

| | |
|---|---|
| Repositório | `pmontezinho17/HoqueiApp`, público |
| Ambientes | **produção** `hoquei.pages.dev` · **testes** `testes.hoquei.pages.dev` |
| O que separa os dois | **tudo.** O site de testes tem base de dados própria desde 15/10 e dados seus desde 30/10, lidos pelo raspador do `dev` quando se carrega no botão do `ramo.yml` |
| Testes automáticos | 316 no raspador, 388 no `web/` — bloqueantes no CI, excepto os marcados `fonte` |
| Depois de publicar | `scripts/verificar_producao.py` pergunta ao site 7 coisas, nos dois publicadores |
| Vigia | o relógio da Cloudflare sonda produção de 10 em 10 minutos, 24 h por dia |
| Protecção do `main` | ruleset `main protegido`, quatro regras activas desde 18/10: PR obrigatório, `scraper` e `web` verdes, sem apagar nem reescrever. O robô dos dados entra por chave de implantação |
| Backlog | `docs/03-backlog.md` · `python3 scripts/estado.py --tudo` |
| Sugestões de fora | repositório privado `ok4sticks-sugestoes`, alimentado sozinho pela caixa "O que está mal" |

## O que estava mal, a 17/10/2026

Três coisas, e as três se viram nesse dia.

**1 · A validação acontecia depois da entrega, e não antes.** Desde 16/10 um `push` no `main`
publica em produção. Juntar um PR era entregar — e o dono só via a alteração depois de ela já
estar no ar. Na noite de 16 para 17 saíram **três versões em duas horas**, todas aprovadas por
ele a ler uma descrição, nenhuma validada a usar.

**2 · O `main` não estava protegido.** Medido: dos últimos 30 commits de primeiro pai, **6 eram
pushes directos meus**, sem PR e sem CI a bloquear. Um deles mudou a data de uma versão a
caminho de produção.

**3 · As actualizações de segurança das dependências estavam desligadas.** O `secret scanning`
e a protecção de push estão ligados; o Dependabot não.

## O fluxo, tal como o dono o quer

> ideia → backlog (prioridade e esforço) → desenvolvimento e testes → deploy em DEV → UAT com o
> stakeholder → correcções ou validação → PR para produção → **entrega à segunda-feira**

**Sem interruptores em produção.** O dono recusou-os como mecanismo de entrega, a 17/10/2026, e a
razão é boa: *"não quero que esteja deployed em produtivo mas com o tal switch de ativo ou
inativo, pois isso pode ter algum impacto ou comprometer o resto da aplicação"*. Um interruptor
desligado continua a ser código que foi para lá, que pode partir a construção e que ninguém está a
exercitar. Ficam só onde já estavam, para coisas como os nomes de atletas.

## Dois ramos, e o que cada um significa

```
  feature/x ──PR──►  dev  ─────────────────►  testes.hoquei.pages.dev   (a cada merge)
                      │                        ↑ é aqui que se faz UAT
                      │
                      └──PR à segunda────►  main  ──►  hoquei.pages.dev
                                             ▲
        robô dos dados ──────────────────────┘   (2 a 14× por dia, só dados)
```

**`dev` é onde as funcionalidades se acumulam.** Publica no site de testes a cada merge, por isso
o pacote da semana vai sendo validado ao longo dela em vez de tudo na segunda — que é o que torna
um lançamento semanal aceitável em vez de temerário.

**`main` é produção, e só lá chegam duas coisas:** os dados do robô, todos os dias, e **um PR por
semana** vindo do `dev`. Mais as duas excepções do passo 6, e só essas.

### Porque é que os dados não podem esperar pela segunda

Medido a 17/10, nos oito dias anteriores: o publicador correu com sucesso **entre 2 e 14 vezes por
dia**. O que ele leva não é código — é o resultado do jogo das 21:00 a chegar ao telemóvel de quem
está na bancada. Uma janela semanal de publicação congelava os resultados durante uma semana.

E isto não é uma escolha nossa: no Cloudflare Pages uma publicação é **atómica e inteira**. Não há
forma de actualizar um ficheiro de dados sem reenviar o site todo, e com ele o código que estiver
na árvore. É por isso que os dados e o código **têm** de viver em ramos diferentes — foi a
plataforma que o impôs, não o processo.

O publicador, depois de comitar os dados no `main`, leva-os também ao `dev`. Conflito não há em
condições normais, porque só ele escreve em `web/static/v1` e o `dev` nunca lá toca; se houver,
**aborta e avisa** em vez de resolver sozinho. Essa cópia serve os testes do CI; o site de testes
tem a sua, no R2, desde 30/10/2026 — ver o passo 4.

### Como é que o `main` ficou fechado, e porque é que demorou duas tentativas

O ruleset chama-se **`main protegido`** e tem quatro regras, **as quatro activas desde
18/10/2026**: não se apaga o ramo, não se reescreve o histórico, **exige-se um PR**, e exigem-se os
checks **`scraper`** e **`web`** verdes.

Verificado no próprio dia, com uma tentativa de push directo ao `main`:

```
GH013: Repository rule violations found for refs/heads/main
 - Changes must be made through a pull request.
 - 2 of 2 required status checks are expected.
```

As duas primeiras entraram primeiro, sozinhas, porque não bloqueiam pushes normais. A razão de
serem dois tempos é que as duas últimas bloqueiam, e bloqueariam o robô
dos dados ao mesmo tempo que a mim. Ele escreve no
`main` 2 a 14 vezes por dia e os commits dele levam `[skip ci]`, portanto nunca teriam os checks:
seriam recusados pelas duas regras de uma vez.

A saída parecia óbvia — pôr o `github-actions[bot]` na lista de excepções — **e não existe**. A API
do GitHub recusa-a num repositório pessoal:

> `Actor GitHub Actions integration must be part of the ruleset source or owner organization`

É uma opção só de organizações. O que ela aceita é **`DeployKey`**, e foi esse o caminho: uma chave
de implantação com escrita, presa a este repositório e sem poderes de utilizador nenhum, guardada
como segredo `CHAVE_ESCRITA`. O `dados.yml` e o `sonda.yml` fazem o checkout com ela e é por ela
que empurram.

O que isto compra: **o robô tem uma porta e eu não tenho nenhuma**. Até aqui a diferença entre "uma
ronda de dados" e "alguém a publicar à pressa sem revisão" era a boa-fé de quem estava ao teclado,
e a 09/10/2026 essa boa-fé não chegou — eu tinha escrito o risco por palavras minhas e publiquei
sete vezes na mesma.

**O que ainda não está provado, e porquê não podia estar.** A chave lê — o `checkout` do publicador
autenticou-se com ela a 18/10. O que falta ver é a **excepção** a funcionar num push verdadeiro, e
isso não se consegue testar com as regras desligadas: sem regras não há nada a furar. A sequência
"provar primeiro, ligar depois" era impossível por construção, e foi assim que ficou planeada
durante uma manhã inteira.

O que torna o risco aceitável é outra coisa: durante os jogos quem leva os resultados ao telemóvel
é o **ciclo ao vivo**, e esse publica no CDN **sem comitar**. Se o push do publicador for recusado,
perde-se o registo daquela ronda no repositório, não o resultado na bancada — e a ronda seguinte,
duas horas depois, traz tudo. A reversão é uma chamada à API.

Quem vir uma ronda a falhar no `git push` com `GH013` sabe o que aconteceu: a excepção da chave não
está a ser respeitada, e a decisão é tirar as duas últimas regras enquanto se percebe porquê — não
tirar a chave.

### O rótulo e o ramo são coisas diferentes

O que diz à Cloudflare se uma publicação é de produção ou de testes é a flag `--branch` do comando,
não o ramo do git. O `dados.yml` publica sempre com `--branch main` e o `ramo.yml` com
`--branch testes`, corram de onde correrem. Foi assim que o ramo pôde mudar de nome sem o endereço
do site de testes mudar — e esse endereço está partilhado, está na política de privacidade e está
nos documentos.

## O processo, então

### 1 · Entrada

Uma ideia entra por um de três sítios, e nenhum deles é uma conversa que se perde:

| de onde vem | onde aterra |
|---|---|
| a caixa "O que está mal" na app | `ok4sticks-sugestoes`, sozinha, todos os dias às 07:20 UTC |
| o email `info.ok4sticks@gmail.com` | o mesmo arquivo, à mão, com a etiqueta `por-email` |
| o dono, ou eu, a meio de uma conversa | **a tabela do `docs/03-backlog.md`, no mesmo dia** |

A terceira linha é a que falhava. A 17/10 havia **oito** coisas por fazer que só existiam nas
nossas mensagens — ficaram `C1` a `C8`. A regra passa a ser: *o que não está na tabela não
existe*.

### 2 · Triagem

Cada item leva **prioridade** (`must`/`should`/`could`) e **tamanho** (`XS`/`S`/`M`/`L`), como
os 241 que já lá estão. As palavras das pessoas ficam no arquivo privado; quando um pedido vira
trabalho, **entra no backlog pelas nossas palavras** — o registo público descreve a alteração,
não cita quem a pediu.

### 3 · Desenvolvimento

Ramo curto a partir do **`dev`**: `feat/…`, `fix/…`, `docs/…`, `test/…`. Os dois conjuntos de
testes correm antes de o trabalho se dar por feito, e o que é visível confirma-se **no browser a
375×812, nos dois temas**, com dados reais.

### 4 · DEV — o site de testes

PR para o `dev`, CI verde, merge. O `ramo.yml` publica em `testes.hoquei.pages.dev`, que lê os
**seus próprios dados**: ficam no R2 e só mudam quando se carrega no botão do `ramo.yml`, com o
raspador do `dev`. Um ecrã que precisa de um campo novo testa-se sem nada ir ao `main`.

### 5 · UAT

O dono usa e responde uma de três coisas: **validado**, **corrige isto**, ou **repensa**. Nada sai
do `dev` sem a primeira — e é esta a inversão face ao que se fazia até 17/10, quando juntar um PR
era publicar e ele só via a alteração depois de estar no ar.

### 6 · Entrega — à segunda-feira

Um PR do `dev` para o `main`, com a lista do que vai dentro. O dono funde, e sai **uma** publicação
com o pacote todo. A versão sobe e as novidades ganham as linhas da semana.

**A excepção, e tem de haver uma:** uma correcção de uma coisa partida em produção vai por um ramo
**directo ao `main`**, em qualquer dia, e é depois levada ao `dev`. A 17/10 a app dizia que sábado
era sexta, e isso corrigiu-se e publicou-se na mesma noite. A regra é: *o que repara, a qualquer
dia; o que acrescenta, à segunda*.

**A segunda excepção, e é provisória: um campo novo nos dados, que produção não mostra.** Existe
só enquanto o site de testes depender dos dados de produção, e o dono não a quer: a 30/10/2026
pediu que cada ambiente seja autónomo — é o C9 do backlog. Até lá: o site de testes lê os
dados de produção, por isso um ecrã novo que precisa de um campo novo só se valida em testes
depois de o raspador o escrever no `main`. Foi assim com o resumo do Mérito na agenda (#118) e com
as letras da grelha (#125). Vale só quando a app de produção fica **igual**, e o PR tem de dizer
porquê. Se o mesmo PR mudar números que produção já mostra, como a releitura de uma semana do
#125, essa parte é uma alteração e espera pela segunda. A 30/10/2026, o dono perguntou se não
devia ir tudo pelo PR semanal, e tinha razão sobre o #125: a releitura foi com o campo novo, sem
ninguém o assinalar.

**O PR da semana abre-se em rascunho com o primeiro merge no `dev` depois de uma entrega**, do
`dev` para o `main`. Cada merge seguinte entra nele sozinho, por isso o pacote está sempre à vista
no GitHub e não depende de ninguém se lembrar. Na segunda passa a pronto, com a lista revista, e o
dono funde. A 30/10/2026 o dono perguntou se o pacote não ficava só no meu conhecimento; ficava, e
não devia.

* **O nome começa pela versão que vai para produção**, e só depois o dia: `Versão 1.10 — entrega
  de 2/11/2026`. Pedido do dono a 30/10/2026: é a versão que se vê no telemóvel, e é por ela que
  se procura uma entrega.
* **Uma semana sem nada no `dev` não tem PR nem entrega.** Os dados que o robô leva ao `dev` não
  contam, porque não são uma alteração ao site de testes. Uma semana só com coisas sem anúncio
  (dependências, consola) entrega na mesma, e a versão não sobe — ver o `versao.ts`.

Os PRs de segurança do Dependabot apontam sempre ao `main`, e isso não se configura: o
`target-branch` só vale para as subidas de versão. Os que corrigem alertas críticos vão directos,
como correcção. Os outros juntam-se num PR para o `dev` e entram no pacote, como o #127.

### 7 · Depois de publicar

A verificação corre sozinha e pergunta ao site sete coisas. O relógio da Cloudflare sonda produção
de 10 em 10 minutos, 24 h por dia. E a consola diz quantas pessoas abriram a app — o único número
que é exacto.

## O preço disto, dito à frente

Um pacote semanal é mais coisas a chegar de uma vez, e se alguma correr mal há mais sítios onde
procurar. É o custo conhecido de entregar por lotes, e o que o compensa aqui é o site de testes
correr o `dev` continuamente: no dia do lançamento, nada daquilo é novidade para quem validou.

## O que vem do playbook, e o que fica de fora

O documento que o dono trouxe é um *playbook* de organização grande. O que se adopta:

| do playbook | aqui |
|---|---|
| **Definition of Ready** antes de desenvolver | a triagem do passo 2: sem prioridade e tamanho, não entra |
| **Verification gate** / **Validation gate** | o CI é a verificação; o UAT no site de testes é a validação. **Eram a mesma coisa até 17/10, e esse era o erro** |
| **Entrega por lotes, numa janela combinada** | o PR semanal do `dev` para o `main`, à segunda |
| Ramos curtos com nome normalizado | já é prática; fica escrito |
| Proteger o ramo principal | **feito a 18/10/2026** — ruleset `main protegido`; ver abaixo |
| SCA / dependências | **feito a 17/10/2026** — Dependabot ligado pelo dono |
| Monitorização pós-publicação | já existe, e é mais apertada do que o playbook pede |
| Registo de decisões técnicas | já existe, noutra forma: o *porquê* vive nos comentários e no backlog, com a data e a medição |

E o que **não** se adopta, com a razão:

* **MADR/ADR como ficheiros à parte.** Este projecto escreve o porquê onde o código está, e
  isso tem funcionado melhor do que um directório de decisões que ninguém reabre. Duas casas
  para a mesma verdade é o que o `AGENTS.md` já proíbe.
* **A estrutura de pastas por camadas** (`/presentation`, `/domain`, `/infrastructure`). É de um
  monólito Java; aqui o desacoplamento é outro e mais forte — um raspador em Python, um contrato
  de JSON estático, e um cliente que só lê.
* **Staging a imitar produção, blue-green, canary.** O Cloudflare Pages publica atomicamente e
  o site de testes tem os seus dados. Uma terceira cópia seria mais uma a envelhecer.
* **SAST, testes de carga, soak, penetração.** Não há servidor nosso a atacar nem sessões a
  roubar: o cliente é estático e não há conta nenhuma. O risco real deste projecto é outro — a
  quota das Functions, a fonte a mentir, e um deploy que serve ficheiros a menos. É contra esses
  que há verificações.
* **RUM e agregadores de logs.** A política de privacidade promete zero ferramentas de terceiros,
  e isso vale mais do que a telemetria que elas dariam.

## Em uma frase

**O `dev` acumula, o site de testes valida, e à segunda-feira um PR leva o pacote a produção.**
Os dados não esperam por ninguém.
