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
from .parsers.classificacao import classificacao
from .parsers.competicoes import competicoes, temporadas
from .parsers.jogo import ficha


def _temporada_corrente(fonte: Fonte) -> int:
    """A época corrente é o maior id do select — nunca hardcodar."""
    return temporadas(fonte.seccao("competiciones").html)[0].id


def _tudo(fonte: Fonte, id_temp: int, com_classificacao: bool = False):
    """Percorre as competições da época e devolve (competicao, calendario, classificacao)."""
    provas = competicoes(fonte.seccao("competiciones", id_temp=id_temp).html)
    for i, prova in enumerate(provas, 1):
        print(f"  [{i}/{len(provas)}] {prova.categoria} · {prova.nome}", file=sys.stderr)
        html = fonte.seccao("calendario", id_comp=prova.id, id_temp=id_temp, grupo="").html
        tabela = None
        if com_classificacao:
            tabela = classificacao(
                fonte.seccao("clasificacion", id_comp=prova.id, id_temp=id_temp).html,
                prova.id, id_temp)
        yield prova, calendario(html, prova.id, id_temp), tabela


def comando_jogos(args) -> int:
    de, ate = date.fromisoformat(args.de), date.fromisoformat(args.ate)
    with Fonte(args.tenant) as fonte:
        id_temp = args.id_temp or _temporada_corrente(fonte)
        print(f"temporada {id_temp} em '{args.tenant}'", file=sys.stderr)
        linhas = []
        for prova, cal, _ in _tudo(fonte, id_temp):
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
        for prova, cal, tabela in _tudo(fonte, id_temp, com_classificacao=True):
            provas.append(para_dicionario(prova))
            conteudo = {"competicao": para_dicionario(prova),
                        **para_dicionario(cal),
                        "classificacao": para_dicionario(tabela)["grupos"] if tabela else []}
            (destino / "comp" / f"{prova.id}.json").write_text(
                json.dumps(conteudo, ensure_ascii=False, indent=1))
            total += len(cal.jogos)
    (destino / "competitions.json").write_text(
        json.dumps({"temporada": id_temp, "competicoes": provas}, ensure_ascii=False, indent=1))
    print(f"\n{len(provas)} competições, {total} jogos → {destino}")
    return 0


def comando_jogo(args) -> int:
    """Despeja a ficha completa de um jogo: cabeçalho, jogadores e cronologia."""
    with Fonte(args.tenant) as fonte:
        fx = ficha(fonte.jogo(args.id).html, args.id)
    if args.destino:
        pathlib.Path(args.destino).write_text(
            json.dumps(para_dicionario(fx), ensure_ascii=False, indent=1))
        print(f"{args.destino}: {len(fx.cronologia)} eventos")
        return 0
    print(f"{fx.casa} {fx.golos_casa}-{fx.golos_fora} {fx.fora}   {fx.estado or 'por disputar'}")
    print(f"{fx.competicao}   {fx.data} {fx.hora}   {fx.recinto}")
    print(f"Árbitros: {', '.join(fx.arbitros)}   Faltas: {fx.faltas[0]}-{fx.faltas[1]}\n")
    for e in fx.cronologia:
        marca = {"golo": "⚽", "cartao": "▮", "falta_equipa": "·", "desconto_tempo": "⏱"}.get(e.tipo, " ")
        res = f"{e.golos_casa}-{e.golos_fora}" if e.golos_casa is not None else ""
        minuto = f"{e.minuto}'" if e.minuto is not None else ""
        print(f"  {marca} {minuto:>5} {(e.relogio or ''):>6} {res:>5}  {e.texto[:72]}")
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

    g = sub.add_parser("jogo", parents=[comum], help="ficha completa de um jogo")
    g.add_argument("--id", type=int, required=True)
    g.add_argument("--destino", default=None, help="escrever JSON em vez de imprimir")
    g.set_defaults(func=comando_jogo)

    d = sub.add_parser("despejar", parents=[comum], help="escrever todas as competições em JSON")
    d.add_argument("--destino", required=True)
    d.set_defaults(func=comando_despejar)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
