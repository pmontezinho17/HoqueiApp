-- Esquema do `ok4sticks-dados` (D1), criado a 09/10/2026.
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
