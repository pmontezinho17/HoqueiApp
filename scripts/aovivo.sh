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
# ⚠️ **Consequência: durante uma janela ao vivo há dois publicadores.** Os resultados deste
# ciclo vivem só no CDN, e um `wrangler pages deploy` feito à mão a partir de uma cópia
# local apaga-os — aconteceu a 04/10 às 10:23, com um jogo a decorrer. Ao contrário, este
# ciclo republica o build que fez no arranque, por isso também reverte código publicado
# entretanto. Enquanto uma janela estiver a correr: ou não se publica à mão, ou cancela-se
# a corrida, publica-se, e lança-se outra.
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
