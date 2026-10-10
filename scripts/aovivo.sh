#!/usr/bin/env bash
# Acompanha os jogos a decorrer: sonda, publica, repete. Corre na Action `aovivo.yml`
# e também à mão, a partir da raiz do repositório.
#
# Porque é um ciclo longo e não um cron de N em N minutos: o agendador da GitHub tem
# granularidade de 5 minutos e **não é de confiança**. Medido a 04/10, um sábado inteiro
# de jogos: das 8 corridas agendadas de `dados.yml` saíram 2, e das 3 de `aovivo.yml`
# saíram **zero** — as quatro que correram foram todas lançadas à mão. O atraso entre a
# criação e o arranque de cada corrida era de 0 s: a GitHub não as atrasa, simplesmente
# não as cria. O cron dá só o arranque; o compasso é daqui.
#
# A cobertura é feita por três camadas que se cobrem umas às outras:
#   1. uma rede de `cron` de 30 em 30 min, para haver muitas tentativas em vez de três;
#   2. este ciclo longo (5 h), para uma tentativa que acerte cobrir quase o dia todo;
#   3. a `concurrency` da Action: uma corrida que dispare com outra a correr fica **em
#      espera** e arranca mal a primeira acabe. É o revezamento, e sai de graça — sem
#      precisar de um token pessoal para a Action se auto-disparar.
#
# **Não comita.** Um commit a cada 45 segundos seria absurdo, e colidiria com a Action dos
# dados — já aconteceu duas vezes num dia. O registo definitivo fica para o `dados.yml`,
# que passa de 2 em 2 horas; isto só actualiza o que o CDN serve.
#
# ⚠️ **Durante uma janela ao vivo há dois publicadores.** Os resultados deste ciclo vivem só
# no CDN, e um `wrangler pages deploy` feito à mão a partir de uma cópia local apaga-os —
# aconteceu a 04/10 às 10:23, com um jogo a decorrer. A ronda seguinte deste ciclo repõe os
# dados, por isso essa metade cura-se sozinha.
#
# As outras duas eram piores, porque aconteciam sozinhas, e estão resolvidas abaixo: o ciclo
# detecta **código** novo em `origin/main` e reconstrói-se, em vez de republicar para sempre
# o build do arranque; e detecta **dados** novos e traz-nos, em vez de republicar de 30 em
# 30 segundos a árvore que tinha quando começou.
set -uo pipefail

MINUTOS=${MINUTOS:-300}
INTERVALO=${INTERVALO:-30}
#: minutos de antecedência a partir dos quais vale a pena ficar acordado à espera do
#: próximo jogo. Mais do que isto e saímos: a rede de `cron` de 30 em 30 minutos traz-nos
#: de volta a tempo, e ficar a sondar a vazio é bater num servidor de uma federação para
#: não trazer nada.
ESPERA_MAX=${ESPERA_MAX:-40}
#: rondas sem nada a decorrer **e** sem nada por começar hoje antes de desistir.
#: Não se conta "sem novidade" (entre dois golos pode não mudar nada durante minutos), nem
#: só "a decorrer" — a 04/10 o ciclo saiu às 10:51 assim que o jogo das 10:00 acabou e
#: deixou o das 11:00 sem cobertura. Um intervalo entre jogos não é o fim do dia.
PACIENCIA=${PACIENCIA:-4}
DESTINO=web/static/v1/aplisboa/2026-27

fim=$(( $(date +%s) + MINUTOS * 60 ))
vazias=0
ronda=0

# A janela dura horas, e nesse tempo pode entrar código novo no repositório. Sem isto, o
# ciclo republicava para sempre o build que fez no arranque e **revertia** o que fosse
# publicado entretanto — aconteceu duas vezes a 04/10, a segunda logo depois de eu ter
# escrito o aviso a dizer para ter cuidado. Um aviso não é uma defesa.
#
CODIGO=(web/src web/static/_headers web/vite.config.ts web/package.json scraper/src scripts)

reconstruir_se_houver_codigo_novo() {
  git diff --quiet HEAD origin/main -- "${CODIGO[@]}" && return 0
  echo "    código novo em origin/main — a actualizar e reconstruir"
  git checkout -q origin/main -- "${CODIGO[@]}" || return 0
  (cd web && npm run build >/dev/null 2>&1)
}

# **E os dados também.** Isto estava de fora de propósito — "os dados ao vivo desta ronda
# vivem aí e um `git pull` em cima deles dava conflito" — e era um erro que custou um jogo
# inteiro.
#
# A 05/10 a ronda completa das 18h07 commitou o A STUART HCM–PAREDE FC A das 15h30 a 0–3,
# certo e vindo da página de calendário da fonte. Às 18h39 a app dizia que o jogo não tinha
# resultado nenhum. A razão é que este ciclo publica a árvore `web/static/v1` **toda**, e a
# dele era a do arranque: de 30 em 30 segundos republicava o `null` por cima do 0–3. O aviso
# que está em cima deste ficheiro falava do perigo na outra direcção — um deploy à mão a
# apagar os dados ao vivo — e esta, que é a que acontece sozinha, não estava coberta.
#
# Trazer os dados commitados é seguro porque eles são, por construção, melhores: vêm de uma
# raspagem completa e recente. O que esta ronda sabe dos jogos a decorrer volta a ser
# escrito em cima, no mesmo segundo, porque é o que ela faz a seguir — e o que ela sabia de
# um jogo **fora** da janela fica a cargo da recolha dos atrasados, que é por isso que a
# ronda logo depois de uma actualização de dados corre como ronda 1.
DADOS_NOVOS=0
# O estado dos dados com que arrancámos. Guarda-se a *hash da árvore* e não um `git diff`
# contra o `HEAD`: o `HEAD` nunca avança — este ciclo não comita — e um diff contra ele
# passaria a diferir para sempre depois da primeira actualização, o que daria uma reposição
# a cada 30 segundos e faria piscar de volta o que esta ronda já sabia.
SHA_DADOS=$(git rev-parse "HEAD:$DESTINO" 2>/dev/null || true)

actualizar_dados_commitados() {
  local sha
  sha=$(git rev-parse "origin/main:$DESTINO" 2>/dev/null) || return 0
  [ "$sha" = "$SHA_DADOS" ] && return 0
  echo "    dados novos em origin/main — a trazer para cima dos locais"
  git checkout -q "origin/main" -- "$DESTINO" || return 0
  SHA_DADOS=$sha
  DADOS_NOVOS=1
}

publicar() {
  # `/.` copia o conteúdo: sem isso o `cp -R` aninha e cria build/v1/v1
  cp -R web/static/v1/. web/build/v1/ || return 1
  (cd web && npx wrangler pages deploy build \
      --project-name hoquei --branch main >/dev/null 2>&1)
}

echo "ciclo ao vivo: até $MINUTOS min, de $INTERVALO em $INTERVALO s"
while [ "$(date +%s)" -lt "$fim" ]; do
  ronda=$((ronda + 1))
  t0=$(date +%s)
  git fetch -q origin main 2>/dev/null
  reconstruir_se_houver_codigo_novo
  actualizar_dados_commitados
  # A ronda que vem logo depois de chegarem dados novos conta como a primeira: é nas rondas
  # `1 mod 10` que o comando vai buscar os jogos de hoje que ficaram sem resultado, e é
  # precisamente depois de trocar a base que isso faz falta.
  if [ "$DADOS_NOVOS" = "1" ]; then ronda=1; DADOS_NOVOS=0; fi
  saida=$(cd scraper && uv run python -m hoquei.cli aovivo \
            --tenant aplisboa --destino "../$DESTINO" --ronda "$ronda" 2>&1)
  vivos=$(echo "$saida" | grep -oE '^a_decorrer=[0-9]+' | cut -d= -f2)
  porvir=$(echo "$saida" | grep -oE '^por_vir=[0-9]+' | cut -d= -f2)
  proximo=$(echo "$saida" | grep -oE '^proximo=[0-9:]*' | cut -d= -f2)
  novos=$(echo "$saida" | grep -oE '[0-9]+ com novidade' | grep -oE '^[0-9]+')

  if [ "${novos:-0}" -gt 0 ]; then
    publicar && echo "[$(date -u +%H:%M:%S)] ronda $ronda · ${novos} novidades · ${vivos:-0} a decorrer · $(( $(date +%s) - t0 ))s"
    echo "$saida" | grep -E 'a decorrer$' | sed 's/^/    /'
  else
    echo "[$(date -u +%H:%M:%S)] ronda $ronda · sem novidade · ${vivos:-0} a decorrer · ${porvir:-0} por começar"
  fi

  if [ "${vivos:-0}" -eq 0 ] && [ "${porvir:-0}" -eq 0 ]; then
    vazias=$((vazias + 1))
    if [ "$vazias" -ge "$PACIENCIA" ]; then
      echo "nada a decorrer e nada por começar hoje — a sair"
      exit 0
    fi
  else
    vazias=0
  fi

  # Nada a decorrer e o próximo jogo ainda longe: sair é mais barato e mais educado do que
  # ficar a sondar. Quem nos traz de volta é a rede de `cron`, que dispara de 30 em 30 min —
  # e uma corrida que não tem nada para fazer custa ~40 s e sai.
  if [ "${vivos:-0}" -eq 0 ] && [[ "$proximo" =~ ^([0-9]{2}):([0-9]{2})$ ]]; then
    # minutos até ao próximo jogo, em aritmética de shell e não com `date`: o runner é
    # GNU e a máquina de desenvolvimento é BSD, e as duas não partilham sintaxe nenhuma
    # para "hoje às 16:30". `10#` força base 10 — sem isso "08" e "09" são octal inválido.
    #
    # `TZ=Europe/Lisbon` não é enfeite: as horas dos jogos vêm da agenda, que está na hora
    # de Lisboa, e o runner da GitHub corre em UTC. Sem isto, a 05/10 às 10:21 o ciclo
    # calculou que o jogo das 11:00 estava a **99** minutos em vez de 39, e saiu quando
    # devia ter ficado. No inverno, com Portugal em UTC, o erro desaparecia sozinho — que
    # é a pior espécie de bug.
    alvo=$(( 10#${BASH_REMATCH[1]} * 60 + 10#${BASH_REMATCH[2]} ))
    agora_min=$(( 10#$(TZ=Europe/Lisbon date +%H) * 60 + 10#$(TZ=Europe/Lisbon date +%M) ))
    faltam=$(( alvo - agora_min ))
    if [ "$faltam" -gt "$ESPERA_MAX" ]; then
      echo "próximo jogo às $proximo (agora $(TZ=Europe/Lisbon date +%H:%M) em Lisboa), daqui a ${faltam} min — a sair, o cron traz-nos de volta"
      exit 0
    fi
  fi

  # ── Acordar o observador ────────────────────────────────────────────────────────────
  #
  # **O ciclo ao vivo é o relógio mais fiável que este projecto tem durante um jogo**, e por
  # isso passa a acordar também o observador. Os `cron` do Worker observador deixaram de
  # disparar a 09/10/2026 — aceites ao publicar, nunca executados — e o do relógio, que o
  # substituiu nessa noite, também não acordou na manhã seguinte.
  #
  # **A dependência é ao contrário do que parece.** O observador existe para dar pelo
  # silêncio deste ciclo, e aqui é este ciclo que o alimenta: se ele morrer, o observador
  # emudece com ele. É por isso que o pulso na consola importa — um observador calado passou
  # a ser vermelho, e é precisamente esse o sinal de que o ciclo parou.
  #
  # Sem bloquear nada: em segundo plano, com um tempo de espera curto, e o erro vai para o
  # lixo. Uma medição perdida não pode atrasar a publicação de um golo.
  if [ -n "${OBSERVADOR:-}" ]; then
    curl -fsS -m 5 -o /dev/null "$OBSERVADOR/observar" 2>/dev/null &
  fi

  sleep "$INTERVALO"
done
echo "fim da janela — se ainda houver jogos hoje, é a corrida em espera que continua"
