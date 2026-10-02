# A fonte actualiza durante o jogo — medido a 02/10/2026

**Pergunta em aberto desde 18/09:** a fonte reflecte golos e cartões *enquanto* o jogo decorre, ou
o boletim só é fechado no fim? Decidia o F8.1 (live scores) e as notificações de golo da Fase 5.

**Resposta: sim, actualiza ao longo do jogo.** Com folga.

## O que foi medido

Jogo **#9547**, CD PAÇO ARCOS B — PAREDE FC B, Camp. Reg. Sub-13 Série D, 02/10 às 19:30.
Sonda automática (`.github/workflows/sonda.yml`), 86 rondas de 3 em 3 minutos, **zero erros de rede**.

| Hora (WEST) | Resultado | Eventos | Golos | Bytes | |
|---|---|---|---|---|---|
| 19:39 | 0-0 | 3 | 0 | 25 867 | jogo a começar |
| 19:45 | 0-0 | 8 | 0 | 27 499 | |
| **19:48** | **0-2** | 10 | 2 | 28 388 | golos de 10' e 12' |
| 19:54 | 1-2 | 11 | 3 | 28 876 | |
| 19:57 | 1-3 | 14 | 4 | 30 066 | fim da 1ª parte |
| 20:18 | 2-3 | 18 | 5 | 31 515 | |
| 20:21 | 2-5 | 22 | 7 | 33 096 | |
| 20:24 | 2-6 | 25 | 8 | 34 314 | |
| 20:30 | 2-8 | 27 | 10 | 35 202 | |
| **20:33** | **2-9** | 28 | 11 | 35 967 | **Jogo Terminado** |
| **20:39** | 2-9 | 28 | 11 | **77 882** | **+41 915 bytes, sem nada novo na cronologia** |
| 20:42 → 23:41 | 2-9 | 28 | 11 | 77 882 | 60 rondas sem uma única alteração |

## Três conclusões

**1. O marcador e a cronologia andam em tempo real.** Não é um despejo no fim: o resultado subiu
degrau a degrau, pela ordem certa, e os eventos acompanharam. Os golos de 10' e 12' não existiam
às 19:45 e estavam lá às 19:48.

**2. A latência é inferior à nossa resolução de medida.** Sondámos de 3 em 3 minutos, por isso só
podemos dizer **"menos de 3 minutos"**. Cruzando o relógio de jogo da ficha com a hora real das
rondas, o começo foi por volta das 19:35 e cada golo apareceu dentro da ronda seguinte ao minuto
em que foi marcado — compatível com latência quase nula, mas **não medimos isso**. Para o saber,
a próxima sonda tem de correr a 30–60 s (`--intervalo 45`).

**3. O boletim oficial só é anexado depois do apito.** O salto de **41 915 bytes** às 20:39, seis
minutos depois do "Jogo Terminado" e sem um único evento novo, bate certo com o bloco `#acta` da
ficha, que mede hoje **41 968 bytes**. Durante o jogo o boletim não existe.

## O que isto desbloqueia

| Item | Antes | Agora |
|---|---|---|
| **F8.1** live scores | por validar desde 18/09 | ✅ **viável** |
| **B9.17** ronda ao vivo | bloqueada pela sonda | ✅ **viável** — no pico são 15 jogos em simultâneo, ~15 pedidos por ronda |
| **Fase 5** notificações de golo | por validar | ✅ **viável** — a cronologia traz marcador e assistência durante o jogo |
| **B1.9c** boletim oficial | — | ⚠️ **a ler**: o boletim **não existe** durante o jogo nem nos primeiros minutos a seguir. A 3ª tab precisa de um estado vazio honesto, não de um erro |

## Duas notas de método, para a próxima

- **As capturas de HTML não sobreviveram.** O `.gitignore` exclui `data-samples/sondagem/html/`,
  por tamanho, e a Action é efémera: a prova dos momentos de mudança morreu com o runner. O
  diário `.jsonl` chegou para esta pergunta, mas para medir latência fina convém guardar as
  capturas da janela do jogo — ou, melhor, registar no próprio diário o último evento da
  cronologia com o seu relógio, que é barato e não ocupa nada.
- **57 das 86 rondas foram depois do fim do jogo** e não observaram nada. Já corrigido no mesmo
  dia: a sonda passa a sair cinco rondas depois de todos os jogos reportarem estado terminal.
