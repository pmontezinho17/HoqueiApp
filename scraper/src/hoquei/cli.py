"""Ferramentas de linha de comandos sobre os parsers.

    uv run python -m hoquei.cli jogos --tenant aplisboa --de 2026-09-19 --ate 2026-09-20
    uv run python -m hoquei.cli despejar --tenant aplisboa --destino ../data-samples/json
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from datetime import date, datetime, timezone

import httpx

from .fonte import UA, Fonte
from .modelos import para_dicionario
from .parsers.calendario import calendario
from .parsers.classificacao import classificacao
from .parsers.competicoes import competicoes, temporadas
from .parsers.jogo import ficha
from .privacidade import anonimizar_ficha, escalao_permite_individual
from .emblemas import caminho_publico, garantir, id_do_logo
from .grupos import identificar
from .quadros import agregar


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
            # emblemas: guardamos o id da fonte e reescrevemos o campo para a nossa origem,
            # o que também resolve a inconsistência de URLs absolutos vs relativos
            for eq in cal.equipas:
                if (idl := id_do_logo(eq.logo)):
                    logos.setdefault(idl, f"https://{args.tenant}.assyssoftware.es/intranet/logos/{idl}.png")
                    emblema_da_equipa[eq.nome] = caminho_publico(idl)

            provas.append({**para_dicionario(prova), **identificar(prova.categoria, prova.nome)})
            conteudo = {"competicao": para_dicionario(prova), **para_dicionario(cal),
                        "classificacao": para_dicionario(tabela)["grupos"] if tabela else []}
            # aponta os emblemas para a nossa origem; resolve de caminho a inconsistência
            # entre os URLs absolutos do calendário e os relativos da classificação
            for eq in conteudo["equipas"]:
                idl = id_do_logo(eq.get("logo"))
                eq["logo"] = caminho_publico(idl) if idl else None
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


def _resultado_conhecido(caminho: pathlib.Path) -> tuple | None:
    """Resultado já publicado para este jogo, ou None se ainda não existe ficheiro."""
    try:
        d = json.loads(caminho.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    return (d.get("golos_casa"), d.get("golos_fora"), d.get("estado"))


def comando_publicar(args) -> int:
    """Gera a árvore /v1 completa que a PWA consome.

    O crawl das fichas é incremental (B1.19): só se busca `partido.asp` de um jogo que
    ainda não tenha ficheiro ou cujo resultado tenha mudado. Sem isto seriam milhares de
    páginas de ~80 KB a cada execução do cron, o que é indefensável contra o servidor de
    uma federação.
    """
    destino = pathlib.Path(args.destino)
    for pasta in ("comp", "match", "scorers"):
        (destino / pasta).mkdir(parents=True, exist_ok=True)

    with Fonte(args.tenant) as fonte:
        id_temp = args.id_temp or _temporada_corrente(fonte)
        provas, total, buscadas, saltadas, restritas = [], 0, 0, 0, 0
        equipas_por_escalao: dict[tuple[str, str], set[int]] = {}
        agenda: list[dict] = []
        logos: dict[str, str] = {}
        emblema_da_equipa: dict[str, str] = {}

        for prova, cal, tabela in _tudo(fonte, id_temp, com_classificacao=True):
            # emblemas: guardamos o id da fonte e reescrevemos o campo para a nossa origem,
            # o que também resolve a inconsistência de URLs absolutos vs relativos
            for eq in cal.equipas:
                if (idl := id_do_logo(eq.logo)):
                    logos.setdefault(idl, f"https://{args.tenant}.assyssoftware.es/intranet/logos/{idl}.png")
                    emblema_da_equipa[eq.nome] = caminho_publico(idl)

            provas.append({**para_dicionario(prova), **identificar(prova.categoria, prova.nome)})
            conteudo = {"competicao": para_dicionario(prova), **para_dicionario(cal),
                        "classificacao": para_dicionario(tabela)["grupos"] if tabela else []}
            # aponta os emblemas para a nossa origem; resolve de caminho a inconsistência
            # entre os URLs absolutos do calendário e os relativos da classificação
            for eq in conteudo["equipas"]:
                idl = id_do_logo(eq.get("logo"))
                eq["logo"] = caminho_publico(idl) if idl else None
            (destino / "comp" / f"{prova.id}.json").write_text(
                json.dumps(conteudo, ensure_ascii=False, indent=1))
            total += len(cal.jogos)

            # Decisão do dono do projecto (30/09/2026): publicar nomes em todos os escalões,
            # por a fonte já os expor publicamente. O filtro fica disponível em --anonimizar-formacao
            # para poder ser reactivado sem alterar código — por exemplo se a federação o pedir.
            # a equipa pode aparecer na lista de equipas da prova ou só nos jogos
            for nome_eq in {e.nome for e in cal.equipas} | {j.casa for j in cal.jogos} | {j.fora for j in cal.jogos}:
                if nome_eq and nome_eq not in ("-", "--"):
                    equipas_por_escalao.setdefault((prova.categoria, nome_eq), set()).add(prova.id)

            # Agenda transversal: o ecrã "próximos jogos" tem de cruzar as 37 competições,
            # e fazê-lo no browser seriam 37 pedidos. Campos ao mínimo de propósito.
            for j in cal.jogos:
                if not j.data or not j.equipas_definidas:
                    continue
                agenda.append({
                    "id": j.id, "data": j.data.isoformat(),
                    "hora": j.hora.strftime("%H:%M") if j.hora else None,
                    "casa": j.casa, "fora": j.fora,
                    "gc": j.golos_casa, "gf": j.golos_fora,
                    "recinto": j.recinto, "comp": prova.id,
                    "prova": prova.nome, "cat": prova.categoria,
                    **{k: v for k, v in identificar(prova.categoria, prova.nome).items()
                       if k in ("grupo_id", "grupo_nome", "serie")},
                })

            publica_nomes = not args.anonimizar_formacao or escalao_permite_individual(prova.categoria)
            if not publica_nomes:
                restritas += 1
            fichas_da_prova: list[dict] = []
            for jogo in cal.jogos:
                if jogo.id is None or not jogo.disputado:
                    continue
                alvo = destino / "match" / f"{jogo.id}.json"
                if _resultado_conhecido(alvo) == (jogo.golos_casa, jogo.golos_fora, "Jogo Terminado"):
                    saltadas += 1
                    # O contexto (escalão, jornada, série) é derivado do que já temos aqui,
                    # não da página da fonte. Quando o esquema ganha campos novos, actualiza-se
                    # no sítio — uma mudança de esquema não justifica voltar a buscar 188 páginas.
                    existente = json.loads(alvo.read_text())
                    contexto = {"competicao_id": prova.id, "categoria": prova.categoria,
                                "jornada": jogo.jornada, **identificar(prova.categoria, prova.nome)}
                    if any(existente.get(k) != v for k, v in contexto.items()):
                        existente.update(contexto)
                        alvo.write_text(json.dumps(existente, ensure_ascii=False, indent=1))
                    fichas_da_prova.append(existente)
                    continue
                dados = para_dicionario(ficha(fonte.jogo(jogo.id).html, jogo.id))
                # contexto para as migalhas no detalhe de jogo (W7.3): a ficha da fonte
                # não sabe em que jornada nem em que série o jogo está
                dados["competicao_id"] = prova.id
                dados["categoria"] = prova.categoria
                dados["jornada"] = jogo.jornada
                dados.update(identificar(prova.categoria, prova.nome))
                if not publica_nomes:
                    dados = anonimizar_ficha(dados)
                alvo.write_text(json.dumps(dados, ensure_ascii=False, indent=1))
                fichas_da_prova.append(dados)
                buscadas += 1

            quadro = agregar(fichas_da_prova, prova.id)
            (destino / "scorers" / f"{prova.id}.json").write_text(
                json.dumps(para_dicionario(quadro), ensure_ascii=False, indent=1))

    (destino / "competitions.json").write_text(json.dumps(
        {"temporada": id_temp, "competicoes": provas}, ensure_ascii=False, indent=1))

    # Índice equipa+escalão → competições. É o que permite seguir "Paço de Arcos sub-15"
    # e ver tudo o que essa equipa joga, sem o cliente abrir as 37 competições.
    novos_emb, emb_existentes = garantir(
        logos, pathlib.Path(args.emblemas or (destino / ".." / ".." / ".." / "emblemas")).resolve(),
        lambda url: httpx.get(url, timeout=30, headers={"User-Agent": UA}).raise_for_status().content)

    # mapa nome→emblema: a agenda e a classificação precisam do emblema sem carregar
    # o ficheiro de cada competição
    (destino / "emblemas.json").write_text(
        json.dumps(emblema_da_equipa, ensure_ascii=False, indent=1))

    agenda.sort(key=lambda j: (j["data"], j["hora"] or "99:99"))
    (destino / "agenda.json").write_text(json.dumps({"jogos": agenda}, ensure_ascii=False))

    (destino / "teams.json").write_text(json.dumps(
        {"equipas": [{"equipa": eq, "categoria": cat, "competicoes": sorted(ids)}
                     for (cat, eq), ids in sorted(equipas_por_escalao.items())]},
        ensure_ascii=False, indent=1))
    (destino / "meta.json").write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tenant": args.tenant,
        "temporada_id": id_temp,
        "competicoes": len(provas),
        "jogos": total,
        "fichas_publicadas": len(list((destino / "match").glob("*.json"))),
        "fonte": f"https://{args.tenant}.assyssoftware.es/intranet/web/",
    }, ensure_ascii=False, indent=1))

    nota = f"{restritas} sem dados individuais" if args.anonimizar_formacao else "nomes em todos os escalões"
    print(f"\nemblemas: {novos_emb} convertidos, {emb_existentes} já existentes")
    print(f"{len(provas)} competições ({nota}), {total} jogos"
          f"\nfichas: {buscadas} buscadas, {saltadas} já actuais → {destino}")
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

    b = sub.add_parser("publicar", parents=[comum], help="gerar a árvore /v1 que a PWA consome")
    b.add_argument("--destino", required=True)
    b.add_argument("--emblemas", default=None,
                   help="pasta dos emblemas (default: <destino>/../../../emblemas)")
    b.add_argument("--anonimizar-formacao", action="store_true",
                   help="omitir nomes de atletas, árbitros e equipa técnica abaixo de sub-17")
    b.set_defaults(func=comando_publicar)

    d = sub.add_parser("despejar", parents=[comum], help="escrever todas as competições em JSON")
    d.add_argument("--destino", required=True)
    d.set_defaults(func=comando_despejar)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
