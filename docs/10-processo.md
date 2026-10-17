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
| O que separa os dois | **só o código.** O site de testes lê os dados de produção desde 10/10, e tem base de dados própria desde 15/10 |
| Testes automáticos | 316 no raspador, 388 no `web/` — bloqueantes no CI, excepto os marcados `fonte` |
| Depois de publicar | `scripts/verificar_producao.py` pergunta ao site 7 coisas, nos dois publicadores |
| Vigia | o relógio da Cloudflare sonda produção de 10 em 10 minutos, 24 h por dia |
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

## O fluxo que o dono propôs, e o que lhe falta

> ideia → backlog (prioridade e esforço) → desenvolvimento e testes → deploy em DEV → UAT com o
> stakeholder → correcções ou validação → PR para produção → **deploy à segunda-feira**

Está certo em tudo menos num ponto, e esse ponto é específico deste projecto:

**Não se pode agendar os *deploys* para segunda, porque os nossos deploys levam dados.** Medido
nos últimos oito dias: o publicador correu com sucesso **entre 2 e 14 vezes por dia**. Não é
código a ser entregue — é o resultado do jogo das 21:00 a chegar ao telemóvel de quem está na
bancada. Uma janela semanal de publicação congelaria os resultados durante uma semana, que é
exactamente o contrário do que a app existe para fazer.

**O que se agenda é a *libertação*, não a publicação.** E isso já existe aqui, em duas peças que
foram construídas antes de haver processo:

* **as bandeiras** (`web/src/lib/bandeiras.ts`): uma funcionalidade vai a produção **desligada**,
  com data de validade e um teste que falha quando a data passa;
* **a versão** (`web/src/lib/versao.ts`): é ela que decide se a app interrompe alguém. Subir o
  número é o acto de libertar; publicar sem o subir não interrompe ninguém, por desenho.

Ou seja: **o código entra todos os dias, a funcionalidade aparece à segunda.**

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

Ramo curto a partir do `main`: `feat/…`, `fix/…`, `docs/…`, `test/…`. Os dois conjuntos de
testes correm antes de o trabalho se dar por feito, e o que é visível confirma-se **no browser
a 375×812, nos dois temas**, com dados reais.

**Nada visível entra sem bandeira enquanto não estiver validado.**

### 4 · DEV — o site de testes

O ramo funde-se em `testes` e o `ramo.yml` publica. É aqui que o dono vê a coisa a funcionar,
com os dados de produção.

### 5 · UAT

O dono usa e responde uma de três coisas: **validado**, **corrige isto**, ou **repensa**. Enquanto
não disser *validado*, não há PR para `main` — e é esta a inversão face ao que se fazia até 17/10.

### 6 · Entrega

PR para `main`, CI verde, e o dono funde. O código vai a produção na publicação seguinte,
**desligado** se for visível e ainda não for para mostrar.

### 7 · Libertação — à segunda-feira

À segunda sobe-se a **versão** e escreve-se a linha das **novidades**, e é aí que as pessoas
vêem o que mudou. Uma bandeira que esteja pronta liga-se no mesmo dia.

**Excepção, e tem de haver uma:** uma correcção de uma coisa partida em produção não espera pela
segunda. A 17/10 a app dizia que sábado era sexta, e isso corrigiu-se e publicou-se na mesma
noite. A regra é: *o que repara, a qualquer dia; o que acrescenta, à segunda*.

### 8 · Depois de publicar

A verificação corre sozinha e pergunta ao site. O relógio sonda de 10 em 10 minutos. E a
consola diz quantas pessoas abriram a app — o único número que é exacto.

## O que vem do playbook, e o que fica de fora

O documento que o dono trouxe é um *playbook* de organização grande. O que se adopta:

| do playbook | aqui |
|---|---|
| **Definition of Ready** antes de desenvolver | a triagem do passo 2: sem prioridade e tamanho, não entra |
| **Verification gate** / **Validation gate** | o CI é a verificação; o UAT no site de testes é a validação. **Eram a mesma coisa até 17/10, e esse era o erro** |
| Ramos curtos com nome normalizado | já é prática; fica escrito |
| Proteger o ramo principal | **a adoptar** — sem pushes directos, com o CI obrigatório |
| SCA / dependências | **a adoptar** — ligar as actualizações de segurança do Dependabot |
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
  o site de testes já lê os dados de produção. Uma terceira cópia seria mais uma a envelhecer.
* **SAST, testes de carga, soak, penetração.** Não há servidor nosso a atacar nem sessões a
  roubar: o cliente é estático e não há conta nenhuma. O risco real deste projecto é outro — a
  quota das Functions, a fonte a mentir, e um deploy que serve ficheiros a menos. É contra esses
  que há verificações.
* **RUM e agregadores de logs.** A política de privacidade promete zero ferramentas de terceiros,
  e isso vale mais do que a telemetria que elas dariam.

## Em uma frase

**O CI verifica, o site de testes valida, o `main` entrega, e a segunda-feira liberta.**
