#!/usr/bin/env bash
# Acompanha os jogos a decorrer: sonda, publica, repete. Corre na Action `aovivo.yml`
# e também à mão, a partir da raiz do repositório.
#
# Porque é um ciclo longo e não um cron de N em N minutos: o agendador da GitHub tem
# granularidade de 5 minutos e atrasa-se — medimos 18 minutos de atraso na sonda de
# 02/10. Para acompanhar um jogo isso não serve. O cron dá só o arranque; o compasso é
# daqui.
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

MINUTOS=${MINUTOS:-235}
INTERVALO=${INTERVALO:-45}
#: rondas sem **nenhum** jogo a decorrer antes de desistir. Não se conta "sem novidade":
#: entre dois golos pode não mudar nada durante minutos.
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
  novos=$(echo "$saida" | grep -oE '[0-9]+ com novidade' | grep -oE '^[0-9]+')

  if [ "${novos:-0}" -gt 0 ]; then
    publicar && echo "[$(date -u +%H:%M:%S)] ronda $ronda · ${novos} novidades · ${vivos:-0} a decorrer · $(( $(date +%s) - t0 ))s"
    echo "$saida" | grep -E 'a decorrer$' | sed 's/^/    /'
  else
    echo "[$(date -u +%H:%M:%S)] ronda $ronda · sem novidade · ${vivos:-0} a decorrer"
  fi

  if [ "${vivos:-0}" -eq 0 ]; then
    vazias=$((vazias + 1))
    if [ "$vazias" -ge "$PACIENCIA" ]; then
      echo "nada a decorrer há $PACIENCIA rondas — a sair"
      exit 0
    fi
  else
    vazias=0
  fi
  sleep "$INTERVALO"
done
echo "fim da janela"
