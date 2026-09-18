# Fonte de dados — investigação (26/07/2026)

## Resumo

`https://aplisboa.pt/resultados/` **não tem dados próprios**. É uma página WordPress (tema Avada)
cujo único conteúdo é um `<iframe>` lazy-loaded:

```html
<iframe data-orig-src="https://aplisboa.assyssoftware.es/intranet/web/"
        width="100%" height="790px" frameborder="0"></iframe>
```

O atributo é `data-orig-src` (não `src`) porque o Avada faz lazy-load — por isso o iframe não
aparece se olharmos só para o HTML renderizado inicial.

A fonte real é a plataforma **Assys Software** (empresa espanhola de software para federações de
patinagem), servida em `*.assyssoftware.es`.

## Plataforma

| Propriedade | Valor |
|---|---|
| Stack | Microsoft-IIS/8.5 + ASP.NET / Classic ASP (`.asp`), Plesk Windows |
| Tipo | HTML server-side rendered, navegação por *query string* |
| API JSON | **Não existe.** Só HTML → é necessário scraping |
| `robots.txt` | 404 (não existe) — sem restrições declaradas de crawling |
| Autenticação | Nenhuma na área `/intranet/web/` (é a vista pública) |
| Cache headers | `Cache-Control: private`, sem `ETag` nem `Last-Modified` → deteção de alterações tem de ser feita por hash do conteúdo |
| Encoding | ⚠️ Inconsistente: as páginas `?seccion=` devolvem UTF-8, mas `partido.asp` devolve **ISO-8859-1/Windows-1252**. Tem de ser tratado por endpoint. |

## Multi-tenant: um parser serve várias fontes

O mesmo código corre em subdomínios por federação/associação. Verificado com HTTP 200:

| Subdomínio | Entidade |
|---|---|
| `fpp.assyssoftware.es` | **Federação de Patinagem de Portugal** (competições nacionais) |
| `aplisboa.assyssoftware.es` | Associação de Patinagem de Lisboa |
| `apsetubal.assyssoftware.es` | Associação de Patinagem de Setúbal |

Testados e sem resposta: `apporto`, `appaveiro`, `apbraga`, `apmadeira`, `apacores`, `apleiria`,
`apviseu`, `apcoimbra`, `apfaro`, `apsantarem`. Provavelmente usam outros nomes de subdomínio —
vale a pena descobrir mais tarde (ver B0.6 no backlog).

**Implicação importante:** escrever o parser uma vez dá acesso ao campeonato nacional inteiro
(1ª/2ª/3ª Divisão, Taça de Portugal, Supertaça, Elite Cup, femininos, todos os escalões de
formação) e não apenas à região de Lisboa.

## Endpoints

Base: `https://{tenant}.assyssoftware.es/intranet/web/`

### 1. Lista de competições (página inicial)

```
GET /intranet/web/?seccion=competiciones&id_temp={temp}&id_modal=1
```

- `id_modal=1` = hóquei em patins (modalidade). Outros valores = patinagem artística, velocidade, etc.
- `id_temp` = ID da temporada e **é diferente por tenant**:
  - FPP: `10` = 2025/2026, `9` = 2024/2025 … `1` = 2016/2017
  - APLisboa: `4` = 2025/26, `3` = 2024/25, `2` = 2023/24, `1` = 2022/23
  - Ler sempre do `<select id="temporada">` em vez de hardcodar.
- Qualquer `seccion` desconhecida cai nesta página (fallback silencioso) — não confiar em 200 como sinal de endpoint válido.

Estrutura: `div.boxCompeticion` = categoria (ex. "SENIORES MASCULINOS"), seguido de
`div.boxJornada#c{id}` com `<tr onclick="location.href='./?seccion=calendario&grupo=&id_comp={id}&id_temp={t}&id_modal=1'">`.

Competições FPP 2025/26 confirmadas: 46 (ex. `id_comp=300` CAMPEONATO NACIONAL PLACARD,
`316` TAÇA DE PORTUGAL SENIORES MASCULINOS, `311` SUPERTAÇA, `313` ELITE CUP MASCULINA…).

### 2. Calendário / resultados de uma competição

```
GET /intranet/web/?seccion=calendario&grupo={grupo}&id_comp={id}&id_temp={t}&id_modal=1
GET /intranet/web/?seccion=calendario&grupo=&id_comp={id}&id_equipo={id}&id_temp={t}&id_modal=1
```

- `id_equipo` filtra o calendário por equipa → é exatamente o que precisamos para o ecrã "o meu clube".
- `div#equipos` no topo lista todas as equipas da competição com `id_equipo`, nome (`title` do `<img>`) e logótipo (`/intranet/logos/{n}.png`).
- Jogos agrupados em `div.boxJornada` com `div.boxHead` = "1ª JORNADA - 1ª FASE".
- Colunas da tabela `table.jornada`: `Jogo | Gr. | Data (dd/mm/aaaa) | Hora (hh.mm) | logo | Visitado | logo | Visitante | Res. ("2 - 16") | Recinto`.
- Cada `<tr>` tem `onclick="window.open('./partido.asp?id={id_jogo}')"` → chave para o detalhe.
- Jogos não realizados aparecem com `Res.` vazio.

### 3. Classificação

```
GET /intranet/web/?seccion=clasificacion&id_comp={id}&id_temp={t}&id_modal=1
```

Colunas: `Equipa | JJ | V | E | D | GM | GS | GA | GM/GS | TP`.
Suporta múltiplos grupos na mesma página (ex. "1ª FASE - GRUPO A").

### 4. Ficha de jogo — o dado mais rico de todos (~80–85 KB por jogo)

```
GET /intranet/web/partido.asp?id={id_jogo}      ← canónico, existe em todos os tenants
GET /intranet/web/partido2.asp?id={id_jogo}     ← alias, NÃO usar (ver nota)
```

> **`partido.asp` vs `partido2.asp`:** em `aplisboa` os dois devolvem exatamente o mesmo
> conteúdo (verificado: SHA-256 idêntico, 79 160 bytes para o jogo 8627). Em `fpp` o
> `partido2.asp` devolve **404** — só existe o `partido.asp`. É um ficheiro legado presente em
> alguns tenants. **Usar sempre `partido.asp`**, que é também o que os `onclick` do calendário
> apontam em ambos os tenants.

Um único GET traz **quatro blocos** de informação, todos no mesmo HTML (as "tabs" FICHA DE JOGO /
BOLETIM DE JOGO são só `display:none` alternado por JS — não há segundo pedido a fazer):

#### 4a. `div#resultado` — cabeçalho
Equipas, resultado, **faltas de equipa acumuladas** (`div.box_faltas`, um por equipa), estado do
jogo (`Jogo Terminado`, `Jogo Suspendido`), competição, data/hora, recinto e árbitros.

#### 4b. `div#ficha_partido > div#jugadores` — estatística por jogador
Por equipa: `nº | 5I (cinco inicial) | Nome | G (golos) | AG (assistências) | D (defesas) |
Pe (penalidades, formato feitas/tentadas) | LD (livres diretos, feitas/tentadas) | 3 colunas de
disciplina`, mais a equipa técnica (D=Delegado, T=Treinador, T2=2º treinador, MAS=massagista) e a
linha "Total da equipa".

#### 4c. `div#desarrollo` — ⭐ cronologia jogada a jogada (o achado principal)
Lista de eventos com relógio, **da mais recente para a mais antiga**. Vocabulário de eventos
confirmado em jogos reais:

| Evento | Exemplo |
|---|---|
| Golo (com resultado corrente, marcador e assistente) | `4:21 · 6-3 · Golo para CD PAÇO ARCOS · MATEUS MARQUES · Assistência por LOURENÇO MIGUELITO` |
| Falta de equipa (numerada) | `3:28 · Falta 5 para CD PAÇO ARCOS` |
| Desconto de tempo | `8:48 · DESCONTO DE TEMPO SL BENFICA` |
| Livre direto | `Livre Direto` |
| Início/fim de parte | `8:00 Início da 1ª Parte`, `0:00 Final da 2ª parte` |
| Fim do jogo | `FIN · Jogo Terminado` |

O `#acta` tem colunas próprias para `SUSPENSOES (1ª/2ª/3ª)` e `EXPULSOES (a.c. / dir.)`, pelo que
cartões azuis e vermelhos também aparecem aqui quando ocorrem.

⚠️ Dois detalhes que dão bugs se forem ignorados:
- **O relógio é decrescente dentro de cada parte** (`8:00` = início, `0:00` = fim), não é o minuto
  corrido do jogo. Para uma timeline há que converter usando o marcador de parte anterior.
- **O número e duração das partes varia com o escalão**: escolares jogam 4 partes de 8 min,
  seniores 2 partes de 25 min. Não hardcodar.

#### 4d. `div#acta` — Boletim Oficial de Jogo (~45 KB)
O documento oficial digitalizado em HTML. Acrescenta, para além de 4b:

- **Equipa de arbitragem completa**: Árbitro 1 e 2, árbitros auxiliares, cronometrista, auxiliar
  dos 45 segundos, delegado técnico, diretor de campo, gestor de segurança.
- **Resultado desdobrado**: por parte, prolongamento e desempate por grandes penalidades.
- **Horas reais**: entrada em pista de árbitros e equipas, início e fim de cada parte.
- **Por jogador**: posição (`GR` guarda-redes / `JC` jogador de campo), capitão/suplente,
  presença por parte, suspensões, expulsões e golos por tempo normal/prolongamento/desempate.
- Total de faltas de equipa por parte.

**RGPD:** os números de licença dos jogadores estão mascarados (`******`) na vista pública — bom
sinal. Mas os **nomes completos** aparecem, incluindo em escalões de formação (sub-13, escolares,
bambis), e algumas licenças de oficiais aparecem em claro (ex. `LICENÇA 134677`). Ver riscos.

#### Notas técnicas
- ⚠️ Devolve **ISO-8859-1/Windows-1252** — descodificar ou os nomes vêm corrompidos ("PA�O ARCOS").
- Existe uma função JS `actualizar()` na página que calcula um cache-buster e **não faz nada**
  (stub morto). É resto de uma funcionalidade de auto-refresh. **Não há polling ao vivo na fonte.**

### 5. Agenda (próximos jogos)

```
GET /intranet/web/?seccion=agenda&id_temp={t}&id_modal=1
```

Em 26/07/2026 devolve "No existen partidos próximos" (fora de época — a temporada corre de
setembro a junho). Útil para pré-carregar próximos jogos durante a época.

## Riscos e considerações legais

1. **Sem contrato nem API oficial.** O HTML pode mudar sem aviso e quebrar o parser. Mitigação:
   parser no backend (não na app), testes com HTML gravado, alerta automático de quebra.
2. **Sem `robots.txt`** não significa autorização comercial. Recomendação: contactar a FPP/APL
   antes de publicar na Play Store, e atribuir a fonte visivelmente na app.
3. **Logótipos de clubes e marcas** (SL Benfica, Sporting CP…) são propriedade dos clubes.
   Não incluir na app sem permissão — usar iniciais/placeholders na v1.
4. **Servidor pequeno** (IIS num Plesk partilhado). Ser educado: 1 scrape central por intervalo
   servido a todos os utilizadores, nunca N pedidos por utilizador. Rate limit ~1 req/s,
   `User-Agent` identificável com contacto.
5. **Dados pessoais de menores.** As fichas e boletins de jogo dos escalões de formação (escolares,
   sub-13, bambis) contêm **nomes completos de crianças** com estatísticas individuais associadas.
   Os nºs de licença estão mascarados na fonte, mas há licenças de oficiais em claro. Uma app
   pública que agregue e torne pesquisável "quem marcou quantos golos" em escalões de formação é
   materialmente diferente de um site de federação: decidir explicitamente se a v1 expõe nomes
   individuais abaixo de sub-17, ou só resultados e classificações coletivas. Recomendação: v1 sem
   estatísticas individuais de formação.

## Como reproduzir esta investigação

```bash
curl -s "https://aplisboa.pt/resultados/" | grep -o 'data-orig-src="[^"]*"'
```

```bash
curl -s "https://fpp.assyssoftware.es/intranet/web/?seccion=clasificacion&id_comp=300&id_temp=10&id_modal=1" | head -100
```

Cronologia de um jogo (nota o `iconv` — sem ele os acentos vêm corrompidos):

```bash
curl -s "https://fpp.assyssoftware.es/intranet/web/partido.asp?id=17770" | iconv -f WINDOWS-1252 -t UTF-8 | tr -d '\r' | awk '/id="desarrollo"/,/id="acta"/' | sed 's/<[^>]*>/\n/g' | grep -v '^\s*$'
```

---

## Como é que os dados entram na página (investigação de 18/09/2026)

Pergunta: dá para ligar a app à *origem* dos dados em vez de depender do HTML renderizado?
Resposta curta: **não existe origem pública.** O que existe é isto.

### O caminho de escrita

```
https://{tenant}.assyssoftware.es/intranet/      ← formulário de login (Utilizador / Palavra-passe)
        └── POST ./validarclave.asp              ← autenticação
https://{tenant}.assyssoftware.es/intranet/web/  ← a mesma aplicação, vista pública, sem login
```

`/intranet/` e `/intranet/web/` são **a mesma aplicação ASP sobre a mesma base de dados**: uma com
sessão autenticada (onde federação, associações, clubes e oficiais de mesa introduzem os dados) e
outra sem, que é a que consumimos. Não há camada intermédia, nem exportação, nem webhook, nem feed.

Consequências:

- **Não há um "upstream" a que ligar.** A base de dados é da FPP/APL e o acesso é credenciado.
  Obter esse acesso é um pedido a fazer às federações, não uma coisa a descobrir. Isso transforma o
  email do L7.1 de "pedir autorização" em "pedir autorização **e** perguntar se dão exportação ou
  acesso de leitura" — passa a valer a pena fazê-lo cedo, não antes de publicar.
- **O HTML é o contrato, gostemos ou não.** A mitigação real não é evitar o scraping, é tornar a
  dependência rasa: JSON normalizado nosso + arquivo do HTML bruto de cada scrape. Se a fonte mudar
  ou desaparecer, fica-nos o histórico e troca-se o parser.

### Confirmado: não há polling ao vivo na fonte

O `actualizar()` de `partido.asp` continua a ser um stub morto — calcula um cache-buster
(`cod = ano+mês+dia+hora+min+seg`) e **não o usa**. Era o resto de um auto-refresh que recarregava
a própria página. Não existe endpoint leve de resultado: cada verificação custa os ~80 KB todos.

### Cabeçalhos e deteção de alterações — verificado

`Cache-Control: private`, sem `ETag` e sem `Last-Modified` (confirmado em `?seccion=` e em
`partido.asp`). Mas dois pedidos seguidos ao mesmo jogo devolvem **SHA-256 idêntico** — o HTML não
tem ruído por pedido (sem timestamps nem tokens embebidos). Logo o hash do corpo serve diretamente
como sinal de alteração, sem normalização prévia.

### Correções ao que estava escrito acima

1. **Os `id_temp` mudaram — a época 2026/27 já existe.** FPP: `11` = 2026/27 (o `10` é 2025/26).
   APLisboa: `5` = 2026/27. Confirma-se a regra de ler sempre o `<select id="temporada">`; qualquer
   mapa fixo em documentação envelhece numa época.
2. **A `seccion=agenda` não serve para nada.** Devolve "No existen partidos próximos" em
   `id_temp=10` *e* em `id_temp=11`, a 18/09/2026, com jogos marcados para o dia seguinte no mesmo
   tenant. Está partida ou alimentada por outro critério. **Não construir nada em cima dela** —
   os próximos jogos tiram-se dos calendários das competições.
3. **A época sénior nacional começa em novembro, não em setembro.** O CAMPEONATO NACIONAL PLACARD
   2026/27 (`id_comp=348`, `id_temp=11`) tem 182 jogos publicados, **zero disputados**, o primeiro a
   07/11/2026. Quem já está a jogar são as associações regionais: a APL tem jogos desde 05/09.
4. **Há jogos "por definir" no calendário**: linhas com equipas a `-` e recinto preenchido
   (ex. `9442`, `9443`, fases seguintes de torneios). O parser tem de as aceitar sem rebentar.

### O que uma ficha de jogo mostra *antes* do jogo — indício forte a favor do live

`partido.asp?id=9438` (jogo por disputar) devolve 10,9 KB em vez dos ~79 KB de um jogo terminado,
mas **já traz a estrutura da cronologia**, com o relógio no valor inicial do escalão e o texto
`Jogo não iniciado`:

```
20:00  Jogo não iniciado
```

Ou seja, a plataforma tem uma máquina de estados por jogo e a vista pública reflete-a. É compatível
com a hipótese de o boletim ser preenchido ao vivo pela mesa e não copiado no fim — mas **isto é um
indício, não uma prova**. A prova exige observar um jogo a decorrer.

### A sonda (`scripts/sondar_atualizacao.py`)

Escrita para responder às duas perguntas em aberto com dados reais, não com suposições. Só stdlib,
1 pedido/s, User-Agent identificável:

```bash
./scripts/sondar_atualizacao.py --tenant aplisboa --ids 9438 9439 9440 9441 \
    --intervalo 120 --ate 22:00
```

Por cada sondagem grava em `data-samples/sondagem/{data}.jsonl` o resultado do cabeçalho, o estado,
o número de eventos da cronologia, o número de golos já registados e o hash; sempre que o hash muda
guarda o HTML completo em `data-samples/sondagem/html/`. No fim do dia esses ficheiros respondem a:

- o marcador mexe durante o jogo, ou só aparece no fim? → decide F8.1 (live scores)
- os eventos da cronologia aparecem um a um, ou todos de uma vez? → decide notificações de golo
- quanto tempo passa entre o fim do jogo e o boletim ficar completo?

Nota de implementação: o Python do python.org no macOS não usa o trust store do sistema e rebenta
com `CERTIFICATE_VERIFY_FAILED`. A sonda resolve isso sozinha (`/etc/ssl/cert.pem` → `certifi`).
