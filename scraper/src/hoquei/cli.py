"""Ferramentas de linha de comandos sobre os parsers.

    uv run python -m hoquei.cli jogos --tenant aplisboa --de 2026-09-19 --ate 2026-09-20
    uv run python -m hoquei.cli despejar --tenant aplisboa --destino ../data-samples/json
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

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
from .ics import feed, nome_ficheiro
from .recintos import conhecidas
from .quadros import agregar
from .rondas import TOLERANCIA, contar, diario_de, quedas, registar, ultima


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


def _sem_chave(caminho: pathlib.Path, chave: str) -> bool:
    """Se a ficha guardada ainda não conhece este campo, há que ir buscá-lo à fonte."""
    if not caminho.exists():
        return False
    try:
        return chave not in json.loads(caminho.read_text())
    except (OSError, json.JSONDecodeError):
        return True


def _resultado_conhecido(caminho: pathlib.Path) -> tuple | None:
    """Resultado já publicado para este jogo, ou None se ainda não existe ficheiro."""
    try:
        d = json.loads(caminho.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    return (d.get("golos_casa"), d.get("golos_fora"), d.get("estado"))


def comando_aovivo(args) -> int:
    """Actualiza só os jogos que estão a decorrer (B9.17).

    O `publicar` percorre as 37 competições e demora minutos — não serve para acompanhar um
    jogo. Isto parte da `agenda.json` já publicada, escolhe os jogos cuja hora já passou e
    que ainda não têm resultado, e vai buscar **só esses**. No pico da época são 15 jogos à
    mesma hora, ou seja 15 pedidos por ronda: ao nosso ritmo de 1/s, 15 segundos.

    A sonda de 02/10 provou que vale a pena — a fonte reflecte os golos enquanto o jogo
    decorre, com latência abaixo dos 3 minutos que conseguimos medir.
    """
    destino = pathlib.Path(args.destino)
    agenda_f = destino / "agenda.json"
    agenda = json.loads(agenda_f.read_text())["jogos"]

    agora = datetime.now(ZoneInfo("Europe/Lisbon"))
    hoje = agora.date().isoformat()
    limite = (agora - timedelta(hours=args.janela)).strftime("%H:%M")
    def a_decorrer(j: dict) -> bool:
        """Começou, ainda não acabou.

        O critério **não** pode ser "ainda não tem resultado": um jogo a decorrer tem
        resultado, e a primeira versão deste filtro deixava de seguir cada jogo exactamente
        no momento em que ele se tornava interessante. O que marca o fim é o estado que a
        fonte põe na ficha.
        """
        if j["data"] != hoje or not j.get("id") or not j.get("hora"):
            return False
        if not (limite <= j["hora"][:5] <= agora.strftime("%H:%M")):
            return False
        if args.todos:
            return True
        guardada = destino / "match" / f"{j['id']}.json"
        if not guardada.exists():
            return True
        try:
            return json.loads(guardada.read_text()).get("estado") != "Jogo Terminado"
        except (OSError, json.JSONDecodeError):
            return True

    acorda = [j for j in agenda if a_decorrer(j)]

    # Jogos de hoje cuja hora ainda não chegou. O ciclo em CI precisa disto para **não**
    # desligar nos intervalos: a 04/10 saiu às 10:51, assim que o jogo das 10:00 acabou, e
    # deixou o das 11:00 sem cobertura nenhuma. "Não há nada a decorrer" não é o mesmo que
    # "o dia acabou".
    por_vir = sum(1 for j in agenda
                  if j["data"] == hoje and j.get("hora")
                  and j["hora"][:5] > agora.strftime("%H:%M"))

    if not acorda:
        # linhas lidas pelo ciclo que corre isto em CI: é por elas que sabe quando parar
        print("a_decorrer=0")
        print(f"por_vir={por_vir}")
        print(f"nenhum jogo a decorrer, {por_vir} ainda por começar hoje", file=sys.stderr)
        return 0

    por_id = {j["id"]: j for j in agenda}
    mudou = 0
    por_fechar = 0
    provas_tocadas: set[int] = set()
    with Fonte(args.tenant) as fonte:
        for j in acorda:
            fx = ficha(fonte.jogo(j["id"]).html, j["id"])
            if fx.estado != "Jogo Terminado":
                por_fechar += 1
            if fx.golos_casa is None:
                continue
            alvo = destino / "match" / f"{j['id']}.json"
            # preserva o contexto que a ficha da fonte não sabe (escalão, jornada, série)
            antigo = json.loads(alvo.read_text()) if alvo.exists() else {}
            dados = para_dicionario(fx)
            for chave in ("competicao_id", "categoria", "jornada", "grupo_id", "grupo_nome", "serie"):
                if chave in antigo:
                    dados[chave] = antigo[chave]
            novo = json.dumps(dados, ensure_ascii=False, indent=1)
            if alvo.exists() and alvo.read_text() == novo:
                continue
            alvo.write_text(novo)
            # `ao_vivo` é o que a app usa para marcar o jogo em curso. A app só confia nele
            # dentro de uma janela de horas a contar da hora do jogo — se esta ronda parar a
            # meio, a marca expira sozinha em vez de ficar acesa para sempre.
            por_id[j["id"]].update(gc=fx.golos_casa, gf=fx.golos_fora,
                                   ao_vivo=fx.estado != "Jogo Terminado")
            _actualizar_calendario(destino, j, fx.golos_casa, fx.golos_fora)
            # A classificação da fonte só muda quando o jogo fecha, não a cada golo. Pedi-la
            # em cada ronda eram dois terços dos nossos pedidos a não trazer nada de novo,
            # contra o servidor de uma federação.
            if fx.estado == "Jogo Terminado" and antigo.get("estado") != "Jogo Terminado":
                provas_tocadas.add(j["comp"])
            mudou += 1
            print(f"  {j['hora'][:5]} #{j['id']} {j['casa']} {fx.golos_casa}-{fx.golos_fora} "
                  f"{j['fora']}  {fx.estado or 'a decorrer'}", file=sys.stderr)

        # A classificação tem de vir atrás do resultado, senão o ficheiro da competição fica
        # a dizer duas coisas diferentes: jogos já com resultado e uma tabela que ainda não
        # os conta. Foi o teste de reprodução (B9.13) que apanhou isto, e tinha razão — é
        # incoerência a sério, e via-se na app.
        if provas_tocadas:
            # a época não muda a meio de uma janela de quatro horas; pedi-la por ronda era
            # um pedido inteiro a confirmar o que já sabíamos
            id_temp = args.id_temp or _temporada_corrente(fonte)
            for comp in sorted(provas_tocadas):
                try:
                    tabela = classificacao(
                        fonte.seccao("clasificacion", id_comp=comp, id_temp=id_temp).html,
                        comp, id_temp)
                except Exception as e:              # uma tabela em falta não estraga o resto
                    print(f"  classificação {comp}: {e}", file=sys.stderr)
                    continue
                alvo = destino / "comp" / f"{comp}.json"
                d = json.loads(alvo.read_text())
                d["classificacao"] = para_dicionario(tabela)["grupos"]
                alvo.write_text(json.dumps(d, ensure_ascii=False, indent=1))

    if mudou:
        agenda_f.write_text(json.dumps({"jogos": agenda}, ensure_ascii=False))
        meta_f = destino / "meta.json"
        meta = json.loads(meta_f.read_text())
        meta["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        meta["ao_vivo"] = True
        meta_f.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    # `a_decorrer` conta os que a fonte ainda **não** fechou. O ciclo em CI pára por este
    # número e não por "quantos mudaram": entre dois golos pode não mudar nada durante
    # minutos, e desligar aí era desligar a meio do jogo.
    print(f"a_decorrer={por_fechar}")
    print(f"por_vir={por_vir}")
    print(f"{len(acorda)} jogos sondados, {mudou} com novidade, "
          f"{por_fechar} a decorrer, {por_vir} por começar", file=sys.stderr)
    return 0


def _actualizar_calendario(destino: pathlib.Path, jogo: dict, gc: int, gf: int) -> None:
    """O resultado também vive no ficheiro da competição, que é o que alimenta a tabela."""
    alvo = destino / "comp" / f"{jogo['comp']}.json"
    if not alvo.exists():
        return
    d = json.loads(alvo.read_text())
    for j in d["jogos"]:
        if j.get("id") == jogo["id"]:
            j["golos_casa"], j["golos_fora"] = gc, gf
    alvo.write_text(json.dumps(d, ensure_ascii=False, indent=1))


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
                # Um campo novo que venha da **página** — e não do que já temos aqui — obriga
                # a revisitar a ficha uma vez. A chave ausente é o sinal; depois de revisitada
                # fica lá, mesmo que a null (a formação nunca tem boletim), e não se repete.
                falta_campo_novo = _sem_chave(alvo, "boletim")
                if not falta_campo_novo and _resultado_conhecido(alvo) == (
                        jogo.golos_casa, jogo.golos_fora, "Jogo Terminado"):
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

    # B4.11 — um feed de calendário por equipa+escalão, com os jogos que a agenda já tem.
    # Subscreve-se uma vez e corrige-se sozinho quando a federação adia um jogo.
    pasta_ics = destino / "team"
    pasta_ics.mkdir(exist_ok=True)
    escritos = set()
    for (cat, eq) in equipas_por_escalao:
        seus = [j for j in agenda if j["cat"] == cat and eq in (j["casa"], j["fora"])]
        if not seus:
            continue
        nome = nome_ficheiro(eq, cat)
        escritos.add(nome)
        alvo = pasta_ics / nome
        novo = feed(eq, cat, seus)
        # só escreve quando muda: o ficheiro é determinista de propósito, e reescrevê-lo
        # igual faria o git ver alterações e a app republicar a cada corrida do cron
        if not alvo.exists() or alvo.read_text(encoding="utf-8") != novo:
            alvo.write_text(novo, encoding="utf-8")
    for velho in pasta_ics.glob("*.ics"):       # equipas que desapareceram da época
        if velho.name not in escritos:
            velho.unlink()

    # as moradas vão para a app porque os links de "adicionar ao calendário" são montados
    # no browser; sem isto levavam o nome do recinto, que não geocodifica
    (destino / "recintos.json").write_text(
        json.dumps({"recintos": conhecidas()}, ensure_ascii=False, indent=1))

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
        "feeds_ics": len(escritos),
    }, ensure_ascii=False, indent=1))

    # B9.2 + B9.6 — a guarda contra uma perda silenciosa. Corre **depois** de escrever:
    # as contagens saem dos ficheiros, e no CI o runner é descartável, por isso dados
    # suspeitos ficam lá sem nunca serem comitados nem publicados.
    diario = (pathlib.Path(args.rondas).resolve() if args.rondas
              else diario_de(destino, args.tenant))
    agora_cont = contar(destino)
    antes = ultima(diario)
    suspeitas = quedas(antes, agora_cont, args.tolerancia) if antes else []

    if suspeitas and not args.sem_guarda:
        print("\n*** RONDA SUSPEITA — nada foi registado ***", file=sys.stderr)
        for s in suspeitas:
            print(f"    {s}", file=sys.stderr)
        print("\nAs contagens desta fonte só crescem ao longo da época. Uma queda é quase",
              file=sys.stderr)
        print("sempre um parser a devolver menos sem se queixar — foi o que aconteceu em",
              file=sys.stderr)
        print("Setembro, 256 linhas a menos durante 11 dias. Verificar antes de publicar.",
              file=sys.stderr)
        print("Se a queda for real, repetir com --sem-guarda.", file=sys.stderr)
        return 2

    if registar(diario, agora_cont, args.tenant):
        print(f"ronda registada em {diario.name}", file=sys.stderr)

    nota = f"{restritas} sem dados individuais" if args.anonimizar_formacao else "nomes em todos os escalões"
    print(f"\nemblemas: {novos_emb} convertidos, {emb_existentes} já existentes")
    print(f"feeds de calendário: {len(escritos)}")
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
    b.add_argument("--rondas", default=None,
                   help="diário das contagens (default: data-samples/rondas/<tenant>.jsonl)")
    b.add_argument("--tolerancia", type=float, default=TOLERANCIA,
                   help=f"queda relativa aceitável numa contagem (default {TOLERANCIA})")
    b.add_argument("--sem-guarda", action="store_true",
                   help="publicar mesmo com contagens a cair — usar quando a queda é real")
    b.add_argument("--anonimizar-formacao", action="store_true",
                   help="omitir nomes de atletas, árbitros e equipa técnica abaixo de sub-17")
    b.set_defaults(func=comando_publicar)

    v = sub.add_parser("aovivo", parents=[comum],
                       help="actualizar só os jogos a decorrer, sem percorrer tudo")
    v.add_argument("--destino", required=True)
    v.add_argument("--janela", type=float, default=3.0,
                   help="há quantas horas um jogo pode ter começado e ainda contar (default 3)")
    v.add_argument("--todos", action="store_true",
                   help="rever também os que já têm resultado (apanha correcções)")
    v.set_defaults(func=comando_aovivo)

    d = sub.add_parser("despejar", parents=[comum], help="escrever todas as competições em JSON")
    d.add_argument("--destino", required=True)
    d.set_defaults(func=comando_despejar)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
