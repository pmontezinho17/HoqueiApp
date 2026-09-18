"""Ferramentas de linha de comandos sobre os parsers.

    uv run python -m hoquei.cli jogos --tenant aplisboa --de 2026-09-19 --ate 2026-09-20
    uv run python -m hoquei.cli despejar --tenant aplisboa --destino ../data-samples/json
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from datetime import date

from .fonte import Fonte
from .modelos import para_dicionario
from .parsers.calendario import calendario
from .parsers.competicoes import competicoes, temporadas


def _temporada_corrente(fonte: Fonte) -> int:
    """A época corrente é o maior id do select — nunca hardcodar."""
    return temporadas(fonte.seccao("competiciones").html)[0].id


def _tudo(fonte: Fonte, id_temp: int):
    """Percorre as competições da época e devolve (competicao, calendario)."""
    provas = competicoes(fonte.seccao("competiciones", id_temp=id_temp).html)
    for i, prova in enumerate(provas, 1):
        print(f"  [{i}/{len(provas)}] {prova.categoria} · {prova.nome}", file=sys.stderr)
        html = fonte.seccao("calendario", id_comp=prova.id, id_temp=id_temp, grupo="").html
        yield prova, calendario(html, prova.id, id_temp)


def comando_jogos(args) -> int:
    de, ate = date.fromisoformat(args.de), date.fromisoformat(args.ate)
    with Fonte(args.tenant) as fonte:
        id_temp = args.id_temp or _temporada_corrente(fonte)
        print(f"temporada {id_temp} em '{args.tenant}'", file=sys.stderr)
        linhas = []
        for prova, cal in _tudo(fonte, id_temp):
            for j in cal.jogos:
                if j.data and de <= j.data <= ate:
                    linhas.append((j, prova))
    linhas.sort(key=lambda p: (p[0].data, p[0].hora or __import__("datetime").time(0, 0)))
    print(f"\n{len(linhas)} jogos entre {de} e {ate}\n")
    for j, prova in linhas:
        hora = j.hora.strftime("%H:%M") if j.hora else "  ?  "
        res = f"{j.golos_casa}-{j.golos_fora}" if j.disputado else "  ·  "
        print(f"{j.data}  {hora}  #{str(j.id or '?'):>5}  {j.casa[:20]:22}{res:^7}{j.fora[:20]:22}"
              f"{prova.categoria[:18]:20}{(j.recinto or '')[:28]}")
    return 0


def comando_despejar(args) -> int:
    destino = pathlib.Path(args.destino)
    (destino / "comp").mkdir(parents=True, exist_ok=True)
    with Fonte(args.tenant) as fonte:
        id_temp = args.id_temp or _temporada_corrente(fonte)
        provas, total = [], 0
        for prova, cal in _tudo(fonte, id_temp):
            provas.append(para_dicionario(prova))
            (destino / "comp" / f"{prova.id}.json").write_text(
                json.dumps(para_dicionario(cal), ensure_ascii=False, indent=1))
            total += len(cal.jogos)
    (destino / "competitions.json").write_text(
        json.dumps({"temporada": id_temp, "competicoes": provas}, ensure_ascii=False, indent=1))
    print(f"\n{len(provas)} competições, {total} jogos → {destino}")
    return 0


def main(argv=None) -> int:
    # num parser-pai partilhado, para que --tenant funcione antes OU depois do subcomando
    comum = argparse.ArgumentParser(add_help=False)
    comum.add_argument("--tenant", default="aplisboa")
    comum.add_argument("--id-temp", type=int, default=None, help="default: época corrente")

    p = argparse.ArgumentParser(prog="hoquei", parents=[comum])
    sub = p.add_subparsers(dest="comando", required=True)

    j = sub.add_parser("jogos", parents=[comum], help="jogos num intervalo de datas")
    j.add_argument("--de", required=True)
    j.add_argument("--ate", required=True)
    j.set_defaults(func=comando_jogos)

    d = sub.add_parser("despejar", parents=[comum], help="escrever todas as competições em JSON")
    d.add_argument("--destino", required=True)
    d.set_defaults(func=comando_despejar)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
