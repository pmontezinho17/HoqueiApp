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
# A outra metade era pior e está resolvida abaixo: o ciclo detecta código novo em
# `origin/main` e reconstrói-se, em vez de republicar para sempre o build do arranque.
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
# Só o código é actualizado, nunca `web/static/v1`: os dados ao vivo desta ronda vivem
# aí e um `git pull` em cima deles dava conflito.
CODIGO=(web/src web/static/_headers web/vite.config.ts web/package.json scraper/src scripts)

reconstruir_se_houver_codigo_novo() {
  git fetch -q origin main 2>/dev/null || return 0
  git diff --quiet HEAD origin/main -- "${CODIGO[@]}" && return 0
  echo "    código novo em origin/main — a actualizar e reconstruir"
  git checkout -q origin/main -- "${CODIGO[@]}" || return 0
  (cd web && npm run build >/dev/null 2>&1)
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
  reconstruir_se_houver_codigo_novo
  saida=$(cd scraper && uv run python -m hoquei.cli aovivo \
            --tenant aplisboa --destino "../$DESTINO" 2>&1)
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
    alvo=$(( 10#${BASH_REMATCH[1]} * 60 + 10#${BASH_REMATCH[2]} ))
    agora_min=$(( 10#$(date +%H) * 60 + 10#$(date +%M) ))
    faltam=$(( alvo - agora_min ))
    if [ "$faltam" -gt "$ESPERA_MAX" ]; then
      echo "próximo jogo às $proximo, daqui a ${faltam} min — a sair, o cron traz-nos de volta"
      exit 0
    fi
  fi

  sleep "$INTERVALO"
done
echo "fim da janela — se ainda houver jogos hoje, é a corrida em espera que continua"
