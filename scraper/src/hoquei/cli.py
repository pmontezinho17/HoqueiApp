"""Ferramentas de linha de comandos sobre os parsers.

    uv run python -m hoquei.cli jogos --tenant aplisboa --de 2026-09-19 --ate 2026-09-20
    uv run python -m hoquei.cli despejar --tenant aplisboa --destino ../data-samples/json
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import httpx

from .fonte import UA, Fonte
from .modelos import em_curso, para_dicionario
from .parsers.calendario import calendario
from .parsers.classificacao import classificacao
from .tabela import calcular, calcular_de_json, vale_calcular
from .parsers.competicoes import competicoes, temporadas
from .parsers.jogo import ficha
from .privacidade import anonimizar_ficha, escalao_permite_individual
from .emblemas import caminho_publico, garantir, id_do_logo
from .grupos import identificar
from .ics import feed, nome_ficheiro
from .recintos import conhecidas
from .quadros import agregar
from .rondas import (TOLERANCIA, acumular_pedidos, contar, diario_de, quedas,
                     registar, ultima)


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


def _com_tabela_calculada(conteudo: dict, nome_da_prova: str, jogos) -> dict:
    """Acrescenta `classificacao_calculada` quando a fonte não publica tabela (B9.14/B9.15).

    **Chave nova, e não a `classificacao` existente.** Encher a que já existe era o caminho
    óbvio e está errado: os telemóveis com um build antigo em cache mostrariam a nossa tabela
    calculada **sem o rótulo de "não oficial"**, porque o rótulo é interface nova. Acrescentar
    uma chave é seguro — quem tem código antigo ignora-a; reutilizar uma muda o significado
    do que já está em cache. É a mesma regra do contrato `/v1` ao contrário.
    """
    conteudo["classificacao_calculada"] = (
        [para_dicionario(g) for g in calcular(jogos)]
        if vale_calcular(nome_da_prova, conteudo.get("classificacao"))
        else []
    )
    return conteudo


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
            conteudo = _com_tabela_calculada(
                {"competicao": para_dicionario(prova), **para_dicionario(cal),
                 "classificacao": para_dicionario(tabela)["grupos"] if tabela else []},
                prova.nome, cal.jogos)
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


def _proxima_hora(agenda: list[dict], hoje: str, agora: datetime) -> str | None:
    """A hora do próximo jogo de hoje que ainda não começou, ou `None` se não há mais.

    É o que permite ao ciclo em CI decidir entre ficar a sondar e sair já: sem isto só sabe
    "há jogos por começar", e ficava acordado horas a fazer rondas vazias contra o servidor
    da federação por causa de um jogo que só é às 18:00.
    """
    agora_hm = agora.strftime("%H:%M")
    horas = [j["hora"][:5] for j in agenda
             if j["data"] == hoje and j.get("hora") and j["hora"][:5] > agora_hm]
    return min(horas) if horas else None


LISBOA = ZoneInfo("Europe/Lisbon")


def _agora() -> datetime:
    """A hora de Lisboa, numa função para os testes a poderem fixar.

    Existe por causa de uma falha real e repetida: as corridas agendadas das 23:38 e 00:06
    UTC falharam duas noites seguidas — 06/10 e 07/10/2026 — e o dono recebeu um email de
    cada vez. Não era o agendador da GitHub, era um teste nosso.

    O teste constrói "um jogo de há quatro horas" com a **data de hoje** e a hora de
    `agora - 4h`. Depois da meia-noite em Lisboa isso dá um jogo marcado para hoje às
    20:38 — vinte horas no futuro, não quatro no passado. O `em_atraso` ignorava-o, e com
    razão; era a expectativa do teste que estava errada.

    Com o relógio aqui, um teste fixa o instante e a regra deixa de depender da hora a que
    a Action calha correr. É a terceira vez que esta família de erros — data local contra
    data UTC, e agora a passagem da meia-noite — custa tempo neste projecto.
    """
    return datetime.now(LISBOA)


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

    agora = _agora()
    hoje = agora.date().isoformat()
    def a_decorrer(j: dict) -> bool:
        """Começou, ainda não acabou.

        O critério **não** pode ser "ainda não tem resultado": um jogo a decorrer tem
        resultado, e a primeira versão deste filtro deixava de seguir cada jogo exactamente
        no momento em que ele se tornava interessante. O que marca o fim é o estado que a
        fonte põe na ficha.
        """
        if j["data"] != hoje or not j.get("id") or not j.get("hora"):
            return False
        # `--antes` minutos antes da hora marcada: é quando a mesa lança a convocatória,
        # e é a única janela em que ela existe na fonte. Medido a 04/10: três horas antes,
        # a ficha está vazia.
        #
        # A comparação é entre instantes e não entre textos "HH:MM". Com texto, a janela
        # partia-se à meia-noite: às 23:41 o limite de cima era "00:06" e `"23:31" <= "00:06"`
        # é falso, por isso um jogo ainda a decorrer desaparecia da ronda. Foram os testes
        # a apanhá-lo, por acaso de estarem a correr às 23:41.
        try:
            hora = datetime.strptime(j["hora"][:5], "%H:%M").time()
        except ValueError:
            return False
        inicio_jogo = datetime.combine(agora.date(), hora, tzinfo=agora.tzinfo)
        if not (agora - timedelta(hours=args.janela) <= inicio_jogo
                <= agora + timedelta(minutes=args.antes)):
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

    def em_atraso(j: dict) -> bool:
        """Hoje, a hora já passou há muito, e continuamos sem o resultado final.

        É a rede de recolha deste comando, e nasceu de um buraco real. A 05/10 o `dados.yml`
        perdeu as corridas das 14h e das 16h — o agendador da GitHub outra vez — e este
        ciclo não estava de pé entre as 12h30 e as 17h50. Resultado: o A STUART HCM–PAREDE
        FC A das 15h30 ficou sem resultado nenhum na app até à noite, como se não tivesse
        sido jogado, e o HC VASCO GAMA das 12h ficou preso em "2ª Parte" sete horas depois
        do apito final. A fonte tinha os dois, e tinha-os na página de calendário.

        A `janela` de três horas é a razão: serve para decidir quem **seguir ao vivo**, e um
        jogo das 15h30 às 19h37 está fora dela. Mas um jogo fora da janela e sem resultado
        não é um jogo que não interessa — é um jogo que nos escapou.

        Duas cautelas, porque isto bate num servidor de uma federação:
        só de `cada_atraso` em `cada_atraso` rondas (cinco minutos, por omissão), e só
        enquanto o apito inicial estiver a menos de `atraso_max` horas. Um jogo adiado
        nunca terá resultado, e sem o segundo limite ficaríamos a perguntar por ele até à
        meia-noite.
        """
        if j["data"] != hoje or not j.get("id") or not j.get("hora"):
            return False
        try:
            hora = datetime.strptime(j["hora"][:5], "%H:%M").time()
        except ValueError:
            return False
        inicio_jogo = datetime.combine(agora.date(), hora, tzinfo=agora.tzinfo)
        # dentro da janela já é a ronda normal que trata dele
        if inicio_jogo >= agora - timedelta(hours=args.janela):
            return False
        if agora - inicio_jogo > timedelta(hours=args.atraso_max):
            return False
        # sem resultado, ou ainda com a marca de "a decorrer" acesa muito depois do fim
        return j.get("gc") is None or bool(j.get("ao_vivo"))

    acorda = [j for j in agenda if a_decorrer(j)]
    atrasados: list[dict] = []
    # `<= 1` para `--cada-atraso 1` querer dizer "em todas as rondas" e não "nunca"
    if args.cada_atraso <= 1 or args.ronda % args.cada_atraso == 1:
        vistos = {j["id"] for j in acorda}
        atrasados = [j for j in agenda if j.get("id") not in vistos and em_atraso(j)]
        acorda += atrasados

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
        print(f"proximo={_proxima_hora(agenda, hoje, agora) or ''}")
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
            antigo = json.loads(alvo.read_text()) if alvo.exists() else {}
            dados = para_dicionario(fx)
            dados.update(_contexto_da_ficha(j, antigo, destino))
            novo = json.dumps(dados, ensure_ascii=False, indent=1)
            if alvo.exists() and alvo.read_text() == novo:
                continue
            alvo.write_text(novo)
            # `ao_vivo` é o que a app usa para marcar o jogo em curso. A app só confia nele
            # dentro de uma janela de horas a contar da hora do jogo — se esta ronda parar a
            # meio, a marca expira sozinha em vez de ficar acesa para sempre.
            vivo = fx.estado != "Jogo Terminado"
            entrada = por_id[j["id"]]
            entrada.update(gc=fx.golos_casa, gf=fx.golos_fora)
            # Uma só definição de "a decorrer" no scraper, partilhada com a ronda completa:
            # a marca, o período e o relógio saem todos da `situacao` que a ficha trouxe
            # neste mesmo pedido, e por isso custam zero pedidos. O minuto na **lista** é o
            # que diz se o jogo vai no início ou no fim, que é o que decide se se entra.
            _marcar_em_curso(entrada, dados)
            _actualizar_calendario(destino, j, fx.golos_casa, fx.golos_fora,
                                   fx.estado != "Jogo Terminado")
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
                alvo = destino / "comp" / f"{comp}.json"
                try:
                    d = json.loads(alvo.read_text())
                except (OSError, json.JSONDecodeError) as e:
                    print(f"  competição {comp}: {e}", file=sys.stderr)
                    continue

                # **Onde a fonte não publica tabela, não se lhe pede uma.**
                #
                # Nos Escolares e nos Benjamins a tabela é a nossa — ver `vale_calcular` — e
                # pedir a página de classificação a cada jogo que fecha era um pedido inútil
                # ao servidor da federação por jogo. No sábado de 10/10 são 36 jogos em cinco
                # escalões; a conta soma.
                #
                # Saber que a fonte não publica vem do nosso último retrato dela. Se ela
                # começar a publicar a meio da época, é a ronda completa do `dados.yml` que
                # o nota — ela vai buscar as 37 tabelas de duas em duas horas ao fim de
                # semana — e a partir daí esta condição passa a ser falsa sozinha.
                nossa = vale_calcular(d.get("competicao", {}).get("nome", ""),
                                      d.get("classificacao"))
                if not nossa:
                    try:
                        tabela = classificacao(
                            fonte.seccao("clasificacion", id_comp=comp, id_temp=id_temp).html,
                            comp, id_temp)
                        d["classificacao"] = para_dicionario(tabela)["grupos"]
                    except Exception as e:
                        # A tabela da fonte falhou. **Não se salta a competição por isso**: a
                        # nossa não depende dela, e para os escalões sem tabela publicada era
                        # a única que havia. O `continue` que estava aqui deixava a tabela
                        # calculada presa na jornada anterior enquanto os jogos já mostravam
                        # o resultado novo.
                        print(f"  classificação {comp}: {e}", file=sys.stderr)

                # A tabela calculada tem de andar com os resultados. Não custa um pedido: o
                # `_actualizar_calendario` já escreveu o resultado neste ficheiro, e a conta
                # sai dos jogos que ele tem dentro.
                if vale_calcular(d.get("competicao", {}).get("nome", ""), d.get("classificacao")):
                    d["classificacao_calculada"] = [
                        para_dicionario(g) for g in calcular_de_json(d.get("jogos") or [])
                    ]
                alvo.write_text(json.dumps(d, ensure_ascii=False, indent=1))

    if mudou:
        agenda_f.write_text(json.dumps({"jogos": agenda}, ensure_ascii=False))
        meta_f = destino / "meta.json"
        meta = json.loads(meta_f.read_text())
        meta["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
        meta["ao_vivo"] = True
        # o custo desta ronda ao vivo: um pedido por jogo seguido, mais o que a recolha dos
        # atrasados tenha ido buscar
        meta["pedidos_fonte"] = fonte.pedidos
        meta["pedidos_falhados"] = fonte.falhados
        meta["pedidos_por_tipo"] = dict(sorted(fonte.por_tipo.items()))
        meta["pedidos_dia"] = acumular_pedidos(meta, fonte, hoje)
        meta_f.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    # `a_decorrer` conta os que a fonte ainda **não** fechou. O ciclo em CI pára por este
    # número e não por "quantos mudaram": entre dois golos pode não mudar nada durante
    # minutos, e desligar aí era desligar a meio do jogo.
    print(f"a_decorrer={por_fechar}")
    print(f"por_vir={por_vir}")
    print(f"proximo={_proxima_hora(agenda, hoje, agora) or ''}")
    print(f"{len(acorda)} jogos sondados, {mudou} com novidade, "
          f"{por_fechar} a decorrer, {por_vir} por começar"
          + (f", {len(atrasados)} em atraso" if atrasados else ""), file=sys.stderr)
    return 0


def _marcar_em_curso(entrada: dict | None, ficha: dict) -> None:
    """Põe — ou tira — a marca de "a decorrer" numa entrada da agenda, a partir da ficha.

    Um jogo a decorrer **tem** resultado, e a página de calendário dá-o sem dizer que ainda
    está a contar. Sem esta marca, uma ronda completa apanhada a meio de um jogo publica o
    parcial como se fosse final: a 04/10 às 16:26 a ronda apanhou o Lourinhã–Stuart ao
    minuto 1 e a app mostrou "terminado 0–0" até ao fim do dia — o jogo acabou 9–1.

    A ficha que a mesma ronda grava até trazia `situacao: "1ª Parte (19:00)"`. A informação
    estava lá; a agenda é que a deitava fora.
    """
    if entrada is None:
        return
    if em_curso(ficha.get("situacao")):
        entrada["ao_vivo"] = True
        for chave in ("periodo", "relogio", "situacao"):
            if ficha.get(chave):
                entrada[chave] = ficha[chave]
    else:
        for chave in ("ao_vivo", "periodo", "relogio", "situacao"):
            entrada.pop(chave, None)


def _contexto_da_ficha(entrada: dict, antigo: dict, destino: pathlib.Path) -> dict:
    """O escalão, a série e a jornada — que a página da fonte não traz.

    **Preserva o que já lá estava e, quando não há nada, tira-o da agenda.** A segunda metade
    é a correcção de 08/10/2026, e nasceu de o dono abrir a ficha de um jogo a decorrer e não
    encontrar nem o separador da classificação nem o escalão.

    A causa: a ficha de um jogo só nasce quando a mesa lança a convocatória, à hora do jogo —
    ou seja, **é esta ronda que a cria**. Antes, o `antigo` estava vazio, não havia nada a
    preservar, e a ficha ficava sem `competicao_id`. Sem ele a app não sabe que competição
    carregar e o separador da tabela não aparece. Corrige-se na ronda completa seguinte, mas
    essa é a das 00:30 — horas depois de as pessoas terem olhado.

    A agenda sabe tudo isto sem custar um pedido. A `jornada` é a excepção: só vive no
    ficheiro da competição, e lê-se dali, que é disco local.
    """
    contexto = {
        "competicao_id": entrada.get("comp"),
        "categoria": entrada.get("cat"),
        "grupo_id": entrada.get("grupo_id"),
        "grupo_nome": entrada.get("grupo_nome"),
        "serie": entrada.get("serie"),
    }
    # o que já lá estava manda: veio da ronda completa, que viu a prova inteira
    for chave, valor in contexto.items():
        if antigo.get(chave) is not None:
            contexto[chave] = antigo[chave]

    jornada = antigo.get("jornada")
    if jornada is None and entrada.get("comp"):
        comp = destino / "comp" / f"{entrada['comp']}.json"
        try:
            for jogo in json.loads(comp.read_text()).get("jogos") or []:
                if jogo.get("id") == entrada.get("id"):
                    jornada = jogo.get("jornada")
                    break
        except (OSError, json.JSONDecodeError):
            jornada = None
    contexto["jornada"] = jornada
    return contexto


def _actualizar_calendario(destino: pathlib.Path, jogo: dict, gc: int, gf: int,
                           ao_vivo: bool) -> None:
    """O resultado também vive no ficheiro da competição, que é o que alimenta a tabela.

    Daí o `ao_vivo`: a tabela tem de saber que este resultado ainda não conta.
    """
    alvo = destino / "comp" / f"{jogo['comp']}.json"
    if not alvo.exists():
        return
    d = json.loads(alvo.read_text())
    for j in d["jogos"]:
        if j.get("id") == jogo["id"]:
            j["golos_casa"], j["golos_fora"] = gc, gf
            if ao_vivo:
                j["ao_vivo"] = True
            else:
                j.pop("ao_vivo", None)
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
        #: id do jogo → a sua entrada na agenda, para a ficha poder marcá-lo a decorrer
        agenda_por_id: dict[int, dict] = {}
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
            conteudo = _com_tabela_calculada(
                {"competicao": para_dicionario(prova), **para_dicionario(cal),
                 "classificacao": para_dicionario(tabela)["grupos"] if tabela else []},
                prova.nome, cal.jogos)
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
                if j.id is not None:
                    agenda_por_id[j.id] = agenda[-1]

            publica_nomes = not args.anonimizar_formacao or escalao_permite_individual(prova.categoria)
            if not publica_nomes:
                restritas += 1
            fichas_da_prova: list[dict] = []
            for jogo in cal.jogos:
                # Os jogos por disputar ficam de fora, e **medi-o antes de desistir**: das
                # seis fichas de jogos "sem começar" que fui ver a 04/10, todas tinham zero
                # jogadores. A fonte só preenche a convocatória quando a mesa a lança, que
                # é à hora do jogo. Ir buscar 16 fichas por corrida para publicar ficheiros
                # vazios era desperdício contra o servidor de uma federação.
                #
                # Quem apanha a convocatória é a ronda ao vivo, que começa a seguir cada
                # jogo `--antes` minutos antes da hora marcada.
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
                _marcar_em_curso(agenda_por_id.get(jogo.id), dados)
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
    # Um jogo por disputar só é clicável na app se houver ficha para mostrar. A app não
    # pode adivinhar — tentar e apanhar um 404 dava um ecrã de erro a quem só queria ver
    # os convocados.
    com_ficha = {int(f.stem) for f in (destino / "match").glob("*.json")}
    for j in agenda:
        if j["gc"] is None and j["id"] in com_ficha:
            j["tem_ficha"] = True
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
    meta_anterior = {}
    if (destino / "meta.json").exists():
        try:
            meta_anterior = json.loads((destino / "meta.json").read_text())
        except json.JSONDecodeError:
            meta_anterior = {}
    (destino / "meta.json").write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tenant": args.tenant,
        "temporada_id": id_temp,
        "competicoes": len(provas),
        "jogos": total,
        "fichas_publicadas": len(list((destino / "match").glob("*.json"))),
        "fonte": f"https://{args.tenant}.assyssoftware.es/intranet/web/",
        "feeds_ics": len(escritos),
        # O custo desta ronda para a fonte, medido e não estimado. Vai no `meta.json` porque
        # é o ficheiro que o observador já lê de minuto a minuto, logo a consola fica com o
        # número de graça. **Fora das `contagens`** de propósito: aquelas só crescem ao longo
        # da época e a guarda do B9.6 trata uma queda como suspeita — os pedidos sobem e
        # descem com o trabalho de cada ronda.
        "pedidos_fonte": fonte.pedidos,
        "pedidos_falhados": fonte.falhados,
        "pedidos_por_tipo": dict(sorted(fonte.por_tipo.items())),
        "pedidos_dia": acumular_pedidos(meta_anterior, fonte, _agora().date().isoformat()),
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
    v.add_argument("--antes", type=float, default=25.0, metavar="MIN",
                   help="começar a seguir um jogo N minutos antes da hora marcada, para "
                        "apanhar a convocatória quando a mesa a lança (default 25)")
    v.add_argument("--janela", type=float, default=3.0,
                   help="há quantas horas um jogo pode ter começado e ainda contar (default 3)")
    v.add_argument("--todos", action="store_true",
                   help="rever também os que já têm resultado (apanha correcções)")
    v.add_argument("--ronda", type=int, default=1, metavar="N",
                   help="número da ronda dentro do ciclo; decide quando se faz a recolha "
                        "dos jogos em atraso (default 1)")
    v.add_argument("--cada-atraso", type=int, default=10, metavar="N",
                   help="de quantas em quantas rondas se vai buscar os jogos de hoje que "
                        "ficaram sem resultado (default 10, ou 5 min a 30 s por ronda)")
    v.add_argument("--atraso-max", type=float, default=8.0, metavar="H",
                   help="até quantas horas depois da hora marcada ainda se insiste num "
                        "jogo sem resultado (default 8)")
    v.set_defaults(func=comando_aovivo)

    d = sub.add_parser("despejar", parents=[comum], help="escrever todas as competições em JSON")
    d.add_argument("--destino", required=True)
    d.set_defaults(func=comando_despejar)

    args = p.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
