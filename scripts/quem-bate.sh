#!/usr/bin/env bash
# Quantas pessoas ainda batem no endereço errado.
#
# O dono partilhou `testes.hoquei.pages.dev` em vez do endereço a sério a 10/10/2026 e pediu
# para saber se o engano continua a circular. A resposta é uma decisão: se daqui a uns dias
# ainda houver gente a bater, o link anda num grupo ou num favorito partilhado, e ele tem de
# avisar as pessoas directamente em vez de esperar que a porta resolva sozinha.
#
# Está aqui, e não numa mensagem minha, porque é para ser corrido mais do que uma vez e por
# ele. Lê e não escreve nada.
#
#   aviso   alguém viu a porta — são estranhos, é este o número que interessa
#   entrou  alguém escreveu a chave — é o dono, e serve para descontar do outro
#
# `curl`, robôs e quem não manda User-Agent não contam: ver o `NAO_E_GENTE` no
# `web/functions/_middleware.js`, e o porquê no `docs/03-backlog.md`.
set -euo pipefail
cd "$(dirname "$0")/.."

# Pergunta à base **de testes**, e não à de produção: a porta só aparece em sites de ramo, os
# sites de ramo são o ambiente de Preview, e desde 13/10/2026 o Preview está ligado ao
# `ok4sticks-dados-testes`. Na base de produção esta tabela existe e fica vazia para sempre.
npx wrangler d1 execute ok4sticks-dados-testes --remote --json \
  --command "SELECT dia, ramo, evento, n FROM porta ORDER BY dia DESC, ramo, evento" \
  | python3 -c '
import json, sys
linhas = json.load(sys.stdin)[0]["results"]
if not linhas:
    # Zero linhas tem duas leituras e elas não se distinguem daqui: ou ninguém bateu, ou a
    # porta está a funcionar sem contar porque falta a ligação `DADOS` no ambiente de
    # Preview. Dizer só a primeira era dar por resolvido o que pode estar por medir.
    print("Nada registado. Há duas razões possíveis e esta tabela não as separa:")
    print("  * ninguém bateu à porta de um site de ramo — o engano parou de circular;")
    print("  * ou falta a ligação `DADOS` ao `ok4sticks-dados-testes` no ambiente *Preview*")
    print("    do projecto de Pages, e nesse caso a porta funciona mas não conta.")
    print("\nNo painel: Workers & Pages -> hoquei -> Settings -> Bindings -> Preview.")
    print("Para separar as duas: abre https://testes.hoquei.pages.dev e vê se a caixa")
    print("\"O que está mal\" consegue enviar. Se conseguir, há ligação e ninguém bateu.")
    raise SystemExit
print(f"{"dia":<12}{"ramo":<14}{"evento":<9}quantos")
for r in linhas:
    print(f"{r["dia"]:<12}{r["ramo"]:<14}{r["evento"]:<9}{r["n"]}")
avisos = sum(r["n"] for r in linhas if r["evento"] == "aviso")
print(f"\nAo todo, {avisos} {"pessoa" if avisos == 1 else "pessoas"} a bater no endereço errado.")
'
