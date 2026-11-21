#!/usr/bin/env bash
# O ensaio do ao vivo das ligas nacionais, no site de testes — corre dentro do "DEV · Site de
# testes" (`ramo.yml`), com a finalidade "ligas nacionais ao vivo".
#
# **Porque existe.** O dono quis testar as ligas nacionais com os resultados a entrar sozinhos no
# fim-de-semana de 21–22/11/2026, e aprovou o custo a 19/11. É o passo D de
# `docs/11-ligas-nacionais.md` em ensaio, antes da medição: o placar vem da "Jogos do Dia" do
# `hp.fpp.pt` (ver `scraper/src/hoquei/direto.py`), e as fichas vêm da ronda normal da FPP.
#
# **O que custa, por dia de jogos** (contado a 19/11/2026 com a agenda de 21 e 22/11):
#   * a "Jogos do Dia", de 30 em 30 s, enquanto houver jogos — ~1 000 pedidos ao `hp.fpp.pt`,
#     que é outro servidor;
#   * a ronda normal da FPP de 45 em 45 min, e 5 min depois de cada jogo acabar, de 2 em 2 s —
#     ~130 pedidos ao servidor que a FPP partilha com a APL. Não corre enquanto uma ronda de
#     produção estiver a pedir à APL, para os dois não se somarem.
#
# **Só o site de testes.** Publica com `--branch testes` e guarda no R2 do site de testes. Não
# toca em produção nem no `main`.
set -uo pipefail

MINUTOS=${MINUTOS:-340}              # o limite de um job da GitHub é 6 h; fica folga para o resto
INTERVALO=${INTERVALO:-30}
RONDA_CADA=${RONDA_CADA:-45}         # minutos entre duas rondas normais da FPP
DEPOIS_DO_FIM=${DEPOIS_DO_FIM:-5}    # minutos entre a página dizer "acabou" e ir buscar a ficha
DESTINO=web/static/v1/fpp/2026-27
CATEGORIAS=(--categorias "CAMPEONATO NACIONAL 1ª DIVISAO"
            --categorias "CAMPEONATO NACIONAL 2ª DIVISAO"
            --categorias "CAMPEONATO NACIONAL 3ª DIVISAO")

agora() { date +%s; }
# **O dia fica o da corrida.** A 20/11/2026 a primeira corrida passou a meia-noite e o "hoje" do
# `direto` passou a ser sábado: os 18 jogos de sábado contavam como por acabar e a corrida não
# saía — ia ler a página de 30 em 30 s pela noite fora e revezar-se até à tarde.
HOJE=${HOJE:-$(TZ=Europe/Lisbon date +%F)}
fim=$(( $(agora) + MINUTOS * 60 ))
ultima_ronda=$(agora)                 # a leitura que abriu esta corrida acabou de ser feita
ronda_marcada=0
acabados_vistos=0
paginas=0
rondas=0
publicacoes=0

valor() { echo "$1" | sed -n "s/^$2=//p" | tail -1; }

publicar() {
  cp -R web/static/v1/. web/build/v1/ || return 1
  cp -R web/static/emblemas/. web/build/emblemas/ || return 1
  (cd web && npx --yes wrangler@4.149.0 pages deploy build \
      --project-name hoquei --branch testes >/dev/null 2>&1) || { echo "    a publicação falhou"; return 1; }
  publicacoes=$((publicacoes + 1))
}

producao_a_pedir() {
  [ "$(gh run list --repo "$GITHUB_REPOSITORY" --workflow dados.yml --status in_progress \
        --json databaseId --jq length 2>/dev/null || echo 0)" != 0 ]
}

ronda_normal() {
  if producao_a_pedir; then
    echo "    uma ronda de produção está a pedir à APL; a ronda da FPP fica para daqui a pouco"
    return 1
  fi
  echo "    ronda normal da FPP (fichas e classificações)"
  (cd scraper && uv run python -m hoquei.cli publicar --tenant fpp --intervalo 2 \
      "${CATEGORIAS[@]}" --destino "../$DESTINO" --rondas "$RUNNER_TEMP/rondas-fpp.jsonl" \
      >/dev/null) || echo "    a ronda normal falhou; o placar continua"
  (cd scraper && uv run python -m hoquei.cli prejogo --destino "../$DESTINO" >/dev/null) || true
  rondas=$((rondas + 1))
  ultima_ronda=$(agora)
  return 0
}

echo "ao vivo nacional no site de testes: até $MINUTOS min, de $INTERVALO em $INTERVALO s"
while [ "$(agora)" -lt "$fim" ]; do
  # `DIRETO_ARGS` só para ensaiar o ciclo à mão com a amostra (`--pagina …`, com `HOJE=` fora)
  saida=$(cd scraper && uv run python -m hoquei.direto --destino "../$DESTINO" --hoje "$HOJE" ${DIRETO_ARGS:-} 2>&1)
  paginas=$((paginas + 1))
  mudou=$(valor "$saida" mudou); acabaram=$(valor "$saida" acabaram)
  pendentes=$(valor "$saida" pendentes); vivos=$(valor "$saida" a_decorrer)
  echo "$(TZ=Europe/Lisbon date +%H:%M:%S) a decorrer=${vivos:-?} pendentes=${pendentes:-?} mudou=${mudou:-0}"
  echo "$saida" | grep "sem par" | sed 's/^/    /' || true

  # um jogo novo acabado marca uma ronda para daqui a uns minutos: a mesa anexa o boletim
  # ~6 min depois do apito (medido a 02/10/2026), e a ficha antes disso vem incompleta
  if [ "${acabaram:-0}" -gt "$acabados_vistos" ]; then
    ronda_marcada=$(( $(agora) + DEPOIS_DO_FIM * 60 ))
  fi
  acabados_vistos=${acabaram:-0}

  if { [ "$ronda_marcada" -gt 0 ] && [ "$(agora)" -ge "$ronda_marcada" ]; } \
     || [ $(( $(agora) - ultima_ronda )) -ge $(( RONDA_CADA * 60 )) ]; then
    if ronda_normal; then
      ronda_marcada=0
      # a ronda reescreve a agenda a partir dos calendários; volta-se a pôr o placar por cima
      (cd scraper && uv run python -m hoquei.direto --destino "../$DESTINO" --hoje "$HOJE" >/dev/null 2>&1) || true
      paginas=$((paginas + 1))
      mudou=1
    fi
  fi

  [ "${mudou:-0}" -gt 0 ] && publicar

  if [ "${pendentes:-1}" -eq 0 ]; then
    # na primeira volta não há nada a fechar: a leitura que abriu a corrida acabou de ser feita
    if [ "$paginas" -gt 1 ]; then
      echo "nenhum jogo nacional por acabar hoje — última ronda e a sair"
      ronda_normal && publicar
    else
      echo "não há jogos nacionais por acabar hoje — nada a fazer"
    fi
    break
  fi
  sleep "$INTERVALO"
done

# **O revezamento.** Um job da GitHub não passa das 6 h e um sábado de jogos nacionais vai das
# 15:30 às 23:15. Se o tempo acabou com jogos por acabar, a corrida pede a seguinte, que fica em
# fila e arranca quando esta guardar os dados.
if [ "$(agora)" -ge "$fim" ] && [ "${pendentes:-0}" -gt 0 ]; then
  echo "o tempo acabou com $pendentes jogos por acabar — a pedir a corrida seguinte"
  gh workflow run ramo.yml --repo "$GITHUB_REPOSITORY" --ref dev -f finalidade="$FINALIDADE" \
    || echo "::warning::não consegui pedir a corrida seguinte; carrega outra vez no botão"
fi

{
  echo "### Ao vivo nacional no site de testes"
  echo ""
  echo "- leituras da Jogos do Dia (hp.fpp.pt): **$paginas**"
  echo "- rondas normais da FPP: **$rondas** (os pedidos de cada uma estão na consola)"
  echo "- publicações do site de testes: **$publicacoes**"
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
