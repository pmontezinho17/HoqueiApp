"""Decide se uma ronda tem razão para pedir algo à fonte.

    uv run python -m hoquei.vale_pedir --cron '0 */6 * * 1-5'

Imprime `correr=true|false` e `porque=...`, no formato que o `$GITHUB_OUTPUT` espera.

## Porque é que isto existe

O dono apanhou-me a 08/10/2026: *"só faz sentido termos pedidos ao site da APL quando eu
tenho a certeza de que há jogos nesse dia"*. Medido nos 9 dias anteriores — correram **53
rondas completas** e só **23** trouxeram dados novos; 30 rondas de ~75 pedidos cada, ~2 250
pedidos que não trouxeram nada. Projectado até dezembro com o calendário publicado: **28 dias
sem jogos, 145 rondas, ~10 900 pedidos**, dos quais ~8 800 evitáveis — **28% de tudo o que
vamos pedir à APL**.

E a primeira regra deste projecto sobre a fonte é contar o custo antes de acrescentar
pedidos. Eu acrescentei estas rondas e não contei.

## A regra

A pergunta responde-se **sem custar um pedido**: a agenda está no nosso CDN. Quem a estabelece
é a ronda das 00:30, que corre sempre — é ela que fecha o dia anterior e republica a agenda.

**Em dúvida, corre.** Se a agenda não se ler, assume-se que há jogos: o custo de uma ronda a
mais é o que já temos hoje; o de uma ronda a menos é uma tarde de resultados errados.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import urllib.request
from zoneinfo import ZoneInfo

#: a ronda canónica do fecho do dia, em UTC. Corre sempre.
CRON_DO_FECHO = "30 23 * * *"
AGENDA = "https://hoquei.pages.dev/v1/aplisboa/2026-27/agenda.json"
LISBOA = ZoneInfo("Europe/Lisbon")


def decidir(jogos: list[dict] | None, hoje: dt.date, *,
            forcar: bool = False, cron: str = "") -> tuple[bool, str]:
    """`(correr, porque)` — função pura, para ter testes a sério."""
    if forcar:
        return True, "pedido manual com publicar_sempre"
    if cron == CRON_DO_FECHO:
        return True, "ronda de fecho do dia (00:30 em Lisboa)"
    if jogos is None:
        return True, "a agenda não se leu — em dúvida, corre"

    ontem = hoje - dt.timedelta(days=1)
    de_hoje = [j for j in jogos if j.get("data") == hoje.isoformat()]
    if de_hoje:
        return True, f"{len(de_hoje)} jogos hoje"
    # Rede de segurança: um jogo de ontem que ficou sem resultado. A ronda do fecho devia
    # tê-lo apanhado, e se não apanhou é precisamente quando vale a pena insistir.
    pendentes = [j for j in jogos
                 if j.get("data") == ontem.isoformat() and j.get("gc") is None]
    if pendentes:
        return True, f"{len(pendentes)} jogos de ontem ainda sem resultado"
    return False, "sem jogos hoje e nada pendente de ontem"


def _ler_agenda(url: str) -> list[dict] | None:
    try:
        pedido = urllib.request.Request(url, headers={"User-Agent": "hoqueiAPP-ci"})
        with urllib.request.urlopen(pedido, timeout=20) as r:
            d = json.loads(r.read())
        return d["jogos"] if isinstance(d, dict) else d
    except Exception as e:                       # rede, CDN, JSON — qualquer coisa
        print(f"  a agenda não se leu: {e}", file=sys.stderr)
        return None


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--cron", default="", help="o cron que disparou, se foi agendada")
    p.add_argument("--forcar", action="store_true", help="publicar_sempre")
    p.add_argument("--agenda", default=AGENDA, help="url ou ficheiro, para testar")
    p.add_argument("--hoje", default=None, help="data a fingir, para testar")
    a = p.parse_args(argv)

    hoje = (dt.date.fromisoformat(a.hoje) if a.hoje
            else dt.datetime.now(LISBOA).date())
    if a.forcar or a.cron == CRON_DO_FECHO:
        jogos = None                              # nem vale a pena ler
    elif a.agenda.startswith("http"):
        jogos = _ler_agenda(a.agenda)
    else:
        jogos = json.loads(open(a.agenda, encoding="utf-8").read())["jogos"]

    correr, porque = decidir(jogos, hoje, forcar=a.forcar, cron=a.cron)
    print(f"correr={'true' if correr else 'false'}")
    print(f"porque={porque}")
    print(f"  → {porque}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
