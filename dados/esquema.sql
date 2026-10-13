-- Esquema do `ok4sticks-dados` (D1), criado a 09/10/2026.
--
-- ## Este ficheiro é o comando que constrói uma base, e não só a sua descrição
--
--     npx wrangler d1 execute ok4sticks-dados --remote --file dados/esquema.sql
--
-- Tudo aqui é `CREATE TABLE IF NOT EXISTS`, logo correr isto numa base cheia não faz nada e
-- correr numa base vazia constrói-a inteira. É assim que se criou a base **de testes** igual à
-- de produção, trocando o nome:
--
--     npx wrangler d1 execute ok4sticks-dados-testes --remote --file dados/esquema.sql
--
-- ## São duas bases, e isso foi decisão do dono a 13/10/2026
--
-- *"eu quero garantir que os dois ambientes estão iguais. mas para isso temos de criar uma
-- nova BD D1 que seja só para testes"*. Criada nesse dia, em WEUR, com este ficheiro:
--
--   `ok4sticks-dados`          ligada como `DADOS` no ambiente **Production** do Pages;
--   `ok4sticks-dados-testes`   ligada como `DADOS` no ambiente **Preview**.
--
-- O site de testes passa a ter a app inteira a funcionar — consola, contadores, caixa de
-- sugestões — **com os seus próprios números**, que é o que faltava para ele diferir de
-- produção só no código. Antes não havia ligação nenhuma em Preview, e metade das Functions
-- respondia 503 lá.
--
-- Isto é configuração de painel: não há nada no repositório que a controle, e por isso não há
-- teste que a confirme. Quem quiser saber qual está ligada pergunta ao site —
-- `scripts/verificar_producao.py` dá 503 na caixa de sugestões quando não há base nenhuma.
--
-- **O que isto não faz é migrar.** Acrescentar uma coluna a uma tabela que já existe exige um
-- `ALTER TABLE`, e o `IF NOT EXISTS` passa por ela em silêncio — apanhado a 13/10/2026, no
-- `functions/sugerir.js`, onde custou um 503 e uma sugestão perdida no ensaio local. Quem
-- acrescentar uma coluna a uma tabela viva trata disso à parte.
--
-- ## Porque é que isto saiu do KV
--
-- Estava tudo em dois armazéns chave-valor, e a Cloudflare mandou um aviso de 50% do limite
-- diário: **1 000 escritas por dia** no plano gratuito. Medido a 08/10, uma noite com quatro
-- jogos: ~800 escritas do observador e ~150 dos contadores do site. Sábado tem 36 jogos das
-- 10:00 às 21:00 e precisaria de ~1 560 só do observador.
--
-- O D1 dá **100 000 linhas escritas por dia** — cem vezes a margem. Mas a razão a sério não
-- é o número: é que **isto são tabelas**. Um registo de observações tem hora, jogo, antes e
-- depois; um contador por ecrã e por dia é uma linha com um número. Pôr isso num chave-valor
-- obrigava a ler-somar-escrever, que **não é atómico e já nos custou uma contagem perdida**
-- — medida a 06/10, três pedidos deram dois. Aqui é um `ON CONFLICT ... DO UPDATE`, que o
-- SQLite resolve sem corrida.
--
-- O KV tem ainda um tecto que o plano pago **não** levanta: uma escrita por segundo na mesma
-- chave. Num sábado com trinta pessoas a abrir a app ao mesmo tempo, isso é perder contas
-- por desenho.

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- O que o observador vê: uma linha por acontecimento.
--
-- Append-only de propósito. Nunca se actualiza uma linha destas — o que aconteceu às 20:03
-- aconteceu, e se o quisermos reinterpretar fazemo-lo na consulta.
CREATE TABLE IF NOT EXISTS observacao (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  dia        TEXT NOT NULL,              -- data de Lisboa, 'AAAA-MM-DD'
  hora       TEXT NOT NULL,              -- 'HH:MM:SS' de Lisboa
  tipo       TEXT NOT NULL,              -- publicacao | resultado | ao_vivo | situacao | jogo | saude | erro | aviso
  jogo       INTEGER,                    -- id do jogo, quando o evento é de um jogo
  de         TEXT,                       -- '0-0'
  para       TEXT,                       -- '0-1'
  situacao   TEXT,                       -- '1ª Parte (18:23)'
  a_decorrer INTEGER,                    -- jogos em campo no momento — distingue silêncio de paragem
  detalhe    TEXT                        -- o resto, em JSON, para não inventar colunas a cada evento novo
);
CREATE INDEX IF NOT EXISTS idx_observacao_dia ON observacao (dia, hora);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- Quem usa a app. Uma linha por dia e por ecrã, somada com `ON CONFLICT`.
--
-- `aberturas` é amostrado 1 em 10 — ver `web/functions/_middleware.js` — e por isso guarda-se
-- a amostra e multiplica-se na leitura. Dizer "12" quando se contaram 12 de ~120 seria mentir
-- por omissão.
CREATE TABLE IF NOT EXISTS visita (
  dia  TEXT NOT NULL,
  ecra TEXT NOT NULL,                    -- '/', '/clube', ..., 'outro', 'aberturas'
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, ecra)
);

-- Aparelhos distintos por dia, e quantos deles eram novos. Contagem **exacta**: é o próprio
-- aparelho que decide se já foi contado hoje, guardando uma data — ver `lib/presenca.ts`.
-- Não há identificador nenhum, logo não se sabe se o aparelho de hoje é o mesmo de ontem.
CREATE TABLE IF NOT EXISTS aparelho (
  dia   TEXT PRIMARY KEY,
  total INTEGER NOT NULL DEFAULT 0,
  novos INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- O que pedimos à APL, por hora e por tipo de página.
--
-- **Nada disto conta operações da Cloudflare** — são pedidos ao servidor da associação, feitos
-- pelo raspador numa máquina da GitHub. As duas contas confundem-se com facilidade e é por
-- isso que esta tabela diz `fonte` no nome.
CREATE TABLE IF NOT EXISTS pedido_fonte (
  dia  TEXT NOT NULL,
  hora INTEGER NOT NULL,                 -- 0–23, hora de Lisboa
  tipo TEXT NOT NULL,                    -- competiciones | calendario | clasificacion | ficha
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, hora, tipo)
);

-- O estado mais recente do observador: um registo só, para a consola saber "agora" sem
-- varrer a tabela de observações.
CREATE TABLE IF NOT EXISTS estado (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  actualizado TEXT NOT NULL,
  json        TEXT NOT NULL
);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- ## Retenção
--
-- **O D1 não tem expiração.** O KV tinha um TTL — 120 dias nos ecrãs, 400 nos aparelhos — e
-- limpava-se sozinho; aqui as linhas ficam até alguém as apagar. Quem apaga é o observador,
-- na primeira leitura de cada dia novo: `DELETE FROM observacao WHERE dia < date(?, '-90
-- days')`, um comando por dia em vez de um a cada uma das ~1 400 invocações.
--
-- Só a `observacao` é apagada. Um dia de jogos dá ~2 000 linhas, logo 90 dias são ~180 000
-- linhas e uns 20 MB contra os 5 GB do plano. As outras três tabelas são uma linha por dia
-- (ou por dia e hora) e são precisamente o histórico que se quer ver crescer — apagá-las era
-- perder a resposta a "o uso está a crescer?".

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- Entradas por hora, separando quem é novo de quem já cá tinha vindo. Pedido pelo dono a
-- 09/10/2026: *"um gráfico de quando as pessoas entravam na aplicação por hora... em cada
-- barra podia estar a distinção entre o que é novo e o que não é"*.
--
-- **É a mesma escrita da tabela `aparelho`, com a hora.** Não é uma segunda contagem nem um
-- segundo toque: o `/contar` escreve nas duas na mesma `batch`, e a soma das horas de um dia
-- é, por construção, o total desse dia. Se alguma vez divergirem, é sinal de que uma das
-- escritas falhou — e isso é informação, não ruído.
--
-- Porque é que não se acrescentou a hora à tabela `aparelho` em vez disto: porque a chave
-- dela é o dia, e é essa chave que faz o `ON CONFLICT` somar o total diário sem corrida.
-- Partir a chave para incluir a hora obrigava a somar 24 linhas para responder à pergunta
-- mais frequente, que é "quantos aparelhos hoje".
CREATE TABLE IF NOT EXISTS entrada_hora (
  dia   TEXT NOT NULL,
  hora  INTEGER NOT NULL,                 -- 0–23, hora de Lisboa
  novos INTEGER NOT NULL DEFAULT 0,       -- primeira vez que este aparelho abre a app
  volta INTEGER NOT NULL DEFAULT 0,       -- já cá tinha vindo noutro dia
  PRIMARY KEY (dia, hora)
);

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- As sugestões da caixa "O que está mal". Pedido do dono a 13/10/2026: que a sugestão virasse
-- registo no GitHub sozinha, em vez de ficar num email à espera de alguém a copiar.
--
-- **É a primeira tabela deste projecto com texto de outras pessoas**, e isso tem três
-- consequências que não são opcionais:
--
--   1. a política de privacidade enumera-a, diz o que fica e por quanto tempo;
--   2. a caixa avisa **antes** de a pessoa escrever;
--   3. apaga-se a pedido, como já prometemos para os nomes de atletas.
--
-- O que **não** está aqui, de propósito: nem IP, nem identificador, nem cabeçalhos. É a mesma
-- promessa que a tabela `aparelho` cumpre. O preço é não haver limite por pessoa — há um tecto
-- diário global e um limite de tamanho, no `functions/sugerir.js`, e é mais grosseiro de
-- propósito, porque a alternativa era guardar quem é cada um.
--
-- A `ramo` não é um identificador de pessoa, é de **ambiente**: diz qual é o nosso site, não
-- quem escreveu. Existe para o dono poder experimentar a caixa no site de testes sem que os
-- ensaios virem registos a par das sugestões reais — o `sugestoes.yml` só arquiva onde ela é
-- `NULL`, e o tecto diário também só conta essas.
--
-- A `issue` é o que impede duplicados: o processo diário só olha para as linhas onde ela é
-- `NULL`, e escreve lá o número depois de criar o registo. Sem isso, uma corrida repetida
-- criava a mesma issue duas vezes.
--
-- **A tabela é criada pela própria Function** (`CREATE TABLE IF NOT EXISTS` antes da escrita),
-- e não aqui à mão: a ligação da D1 é o único caminho garantido, porque criar tabelas de fora
-- exige o token da Cloudflare com âmbito de D1, que pode não estar lá. Fica escrita neste
-- ficheiro porque é aqui que se vem ver o que existe.
--
-- Retenção: 180 dias, apagados pelo processo diário. Uma sugestão de há seis meses ou já virou
-- trabalho ou já não é verdade sobre a app que existe.
CREATE TABLE IF NOT EXISTS sugestao (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  dia    TEXT NOT NULL,              -- data de Lisboa, 'AAAA-MM-DD'
  hora   TEXT NOT NULL,              -- 'HH:MM:SS' de Lisboa
  texto  TEXT NOT NULL,              -- o que a pessoa escreveu, até 2000 caracteres
  ecra   TEXT,                       -- onde estava: '/jogo/9539?aba=equipas'
  versao TEXT,                       -- a versão da app que ela tinha
  ramo   TEXT,                       -- 'testes' se veio do site de testes; NULL = produção
  issue  INTEGER                     -- o número do registo criado; NULL = ainda por arquivar
);
CREATE INDEX IF NOT EXISTS idx_sugestao_por_arquivar ON sugestao (issue) WHERE issue IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────────────────
-- Quem ainda bate à porta de um site de ramo. Pedido pelo dono a 10/10/2026, no dia em que
-- partilhou `testes.hoquei.pages.dev` em vez do endereço a sério: *"Sim quero saber"*.
--
-- A pergunta que isto responde é uma decisão, não curiosidade: se daqui a uns dias ainda
-- houver gente a bater, o link anda a circular — num grupo, num favorito partilhado — e o
-- dono tem de avisar as pessoas directamente em vez de esperar que a porta resolva sozinha.
--
-- `evento` separa duas coisas que não se podem somar:
--
--   aviso   alguém viu a porta — é o número que interessa, e são estranhos;
--   entrou  alguém escreveu a chave — é o dono, e serve para o descontar do outro.
--
-- **Isto é uma tabela à parte de propósito.** O `ramo.yml` promete que o tráfego de testes
-- não entra nas contagens reais, e essa promessa era garantida por não haver ligação à base
-- de dados no ambiente de Preview. Deixa de ser: a ligação passa a existir para isto. Quem a
-- garante agora é o `_middleware.js`, que trata os sites de ramo e **sai antes** de chegar ao
-- contador do `visita`. Há um teste só para isso, porque é o género de coisa que se perde
-- numa reorganização e que ninguém nota — os números reais é que ficavam inflados em
-- silêncio.
--
-- **E desde 13/10/2026 estas linhas nascem na base de testes, não nesta.** A porta só aparece
-- em sites de ramo, os sites de ramo são o ambiente de Preview, e o Preview está ligado ao
-- `ok4sticks-dados-testes`. Por isso o `scripts/quem-bate.sh` pergunta **lá**: a tabela existe
-- nas duas bases, e na de produção fica vazia para sempre. Não é desarrumação — a porta é uma
-- coisa de testes, e o número que ela dá é sobre testes.
--
-- Medido nesse dia, e não deduzido: uma navegação a `testes.hoquei.pages.dev` com `User-Agent`
-- de iPhone deixou `testes/aviso=1` na base de testes e **zero** na de produção. A linha foi
-- apagada a seguir, pela razão que o `quem-bate.sh` explica — uma visita minha a confirmar que
-- a porta está de pé não é uma pessoa perdida, e contá-la seria responder a outra pergunta.
CREATE TABLE IF NOT EXISTS porta (
  dia    TEXT NOT NULL,
  ramo   TEXT NOT NULL,                   -- 'testes', 'versoes', ou o id de uma publicação
  evento TEXT NOT NULL,                   -- 'aviso' | 'entrou'
  n      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, ramo, evento)
);
