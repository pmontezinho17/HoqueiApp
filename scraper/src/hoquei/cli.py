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
from .merito import escalonar, merito_do_jogo, vale_merito
from .modelos import em_curso, para_dicionario
from .parsers.calendario import calendario
from .parsers.participacao import marcas_da_grelha, nao_atletas, participacao
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
from .provas_a_pedir import FILTRAR_TABELAS, pedir_tabela, resumir


def _temporada_corrente(fonte: Fonte) -> int:
    """A época corrente é o maior id do select — nunca hardcodar."""
    return temporadas(fonte.seccao("competiciones").html)[0].id


def _tudo(fonte: Fonte, id_temp: int, com_classificacao: bool = False,
          quer_tabela=None):
    """Percorre as competições da época e devolve (competicao, calendario, classificacao).

    `quer_tabela(prova, calendario)` decide, prova a prova, se vale a pena gastar o pedido da
    classificação — ver `provas_a_pedir.py`. Sem ele pede-se sempre, que é o comportamento de
    todos os outros comandos e o que esta ronda fazia até 12/10/2026.

    **O calendário lê-se sempre**, e é de propósito: é dele que sai a agenda, as fichas, os
    emblemas e a nossa tabela calculada. Quem decide precisa dele para saber se houve jogo hoje
    ou se um resultado mudou, por isso a decisão vem **depois** de o ler e antes do segundo
    pedido.
    """
    provas = competicoes(fonte.seccao("competiciones", id_temp=id_temp).html)
    for i, prova in enumerate(provas, 1):
        print(f"  [{i}/{len(provas)}] {prova.categoria} · {prova.nome}", file=sys.stderr)
        html = fonte.seccao("calendario", id_comp=prova.id, id_temp=id_temp, grupo="").html
        cal = calendario(html, prova.id, id_temp)
        tabela = None
        if com_classificacao and (quer_tabela is None or quer_tabela(prova, cal)):
            tabela = classificacao(
                fonte.seccao("clasificacion", id_comp=prova.id, id_temp=id_temp).html,
                prova.id, id_temp)
        yield prova, cal, tabela


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
        for prova, cal, tabela in _tudo(fonte, id_temp, com_classificacao=True,
                                        quer_tabela=_quer_tabela):
            # emblemas: guardamos o id da fonte e reescrevemos o campo para a nossa origem,
            # o que também resolve a inconsistência de URLs absolutos vs relativos
            for eq in cal.equipas:
                if (idl := id_do_logo(eq.logo)):
                    logos.setdefault(idl, f"https://{args.tenant}.assyssoftware.es/intranet/logos/{idl}.png")
                    emblema_da_equipa[eq.nome] = caminho_publico(idl)

            provas.append({**para_dicionario(prova), **identificar(prova.categoria, prova.nome)})
            # **Saltar a tabela não é publicar uma tabela vazia.** Reutiliza-se a da última
            # publicação; um `[]` aqui fazia o `vale_calcular` concluir que a fonte não
            # publica tabela nenhuma e punha a nossa calculada no lugar dela — uma tabela
            # diferente por causa de uma poupança de pedidos, que é inaceitável.
            if tabela is not None:
                classif = para_dicionario(tabela)["grupos"]
            else:
                classif = ((_anterior(prova.id) or {}).get("classificacao") or []
                           if prova.id in tabelas_saltadas else [])
            conteudo = _com_tabela_calculada(
                {"competicao": para_dicionario(prova), **para_dicionario(cal),
                 "classificacao": classif},
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

#: Quantos dias depois do jogo se continua a perguntar pelo boletim que faltava.
DIAS_DO_BOLETIM = 30


def _boletim_por_chegar(caminho: pathlib.Path, hoje: date) -> bool:
    """Um jogo terminado que guardámos sem boletim, e que ainda pode vir a tê-lo.

    **O boletim chega depois do jogo, e nós só olhávamos uma vez.** A ficha de um jogo
    terminado guarda-se na primeira ronda a seguir ao apito, muitas vezes antes de a mesa
    anexar o boletim; fica `boletim: null`, a chave existe, o resultado bate, e o jogo nunca
    mais se pedia. Sem boletim não há Mérito, e a tabela mostrava a equipa com um jogo a
    menos. Apanhado pelo dono a 27/10/2026 no APAC Tojal–Sporting de Benjamins (jogo 10067,
    17/10), guardado às 16:19 UTC, minutos depois do fim.

    Medido no mesmo dia: dos 479 jogos terminados, 12 estavam guardados sem boletim, e
    pedidos outra vez **11 já o tinham** — 3 deles com Mérito. O 12.º, de 27/09, continua
    sem ele um mês depois.

    O custo: um pedido por jogo destes, uma vez por dia, só na ronda das 00:30 (o
    `--rever-boletins`), e só durante `DIAS_DO_BOLETIM` dias depois do jogo. No pico são os
    jogos do fim-de-semana que acabaram antes do boletim — uma mão-cheia. Um jogo cujo
    boletim nunca chega custa 30 pedidos num mês e depois deixa-se em paz.
    """
    try:
        dados = json.loads(caminho.read_text())
    except (OSError, ValueError):
        return False
    if dados.get("boletim") or dados.get("estado") != "Jogo Terminado":
        return False
    try:
        dia = date.fromisoformat(dados.get("data") or "")
    except ValueError:
        return False
    return timedelta(0) <= hoje - dia <= timedelta(days=DIAS_DO_BOLETIM)


#: Quantos dias depois do jogo se relê a ficha para apanhar uma correcção ao boletim.
DIAS_ATE_REVER_O_MERITO = 7


def _merito_por_rever(caminho: pathlib.Path, hoje: date) -> bool:
    """Um jogo com Mérito que já leva uma semana e ainda não foi relido.

    **Uma ficha corrigida pela APL não chegava à app.** A ficha de um jogo terminado só se
    volta a pedir se o resultado mudar, e uma correcção às marcas das meias partes não muda o
    resultado. Decisão do dono a 29/10/2026, depois de ouvir quem conhece o regulamento sobre o
    -3 da AE Física (jogo 9913): *"a APL faz as contas baseando-se nas fichas de jogo, como a
    app [...] se a pontuação não está correcta, o clube terá que pedir uma correcção à ficha"*.
    E a pergunta seguinte foi a desta função: se a ficha for corrigida, a app acompanha?

    Relê-se **uma vez**, sete dias depois do jogo, na ronda das 00:30 (`--rever-merito`). O
    custo, contado na agenda a 29/10/2026: 11 a 23 jogos de Mérito por semana, 18 em média, logo
    ~18 pedidos por semana. Na primeira ronda depois de isto entrar, os jogos já com mais de uma
    semana relêem-se todos de uma vez — 64 dos 82 com Mérito a 29/10/2026, uma só vez, e é também
    a primeira medição: diz logo se alguma ficha antiga foi corrigida.

    **Não se sabe se vale a pena, e é por isso que se conta.** A ronda escreve no `meta.json`
    quantas fichas releu e em quantas o Mérito mudou. Se ao fim de um mês forem zero, isto
    desliga-se: ninguém corrige fichas uma semana depois, e 18 pedidos por semana para nada são
    18 pedidos a mais no servidor de uma associação.

    O sinal de "já relida" é o campo `merito_revisto`, com a data da releitura.
    """
    try:
        dados = json.loads(caminho.read_text())
    except (OSError, ValueError):
        return False
    if not dados.get("merito") or dados.get("merito_revisto"):
        return False
    try:
        dia = date.fromisoformat(dados.get("data") or "")
    except ValueError:
        return False
    return hoje - dia >= timedelta(days=DIAS_ATE_REVER_O_MERITO)


def _temporada_em_disco(destino: pathlib.Path) -> int | None:
    """O id da época lido do `competitions.json` que já publicámos. `None` se não der.

    **Existe para não gastar um pedido à APL a confirmar o que muda uma vez por ano.** A
    ronda ao vivo pedia a lista de competições sempre que um jogo fechava, só para saber o
    id da época — e o comentário ao lado dessa linha já dizia, por escrito, que pedi-la por
    ronda "era um pedido inteiro a confirmar o que já sabíamos". Medido a 10/10/2026, um
    sábado com 36 jogos: **96 pedidos** gastos assim, de 5 447 no dia.

    Devolve `None` em vez de adivinhar quando o ficheiro não existe ou não traz o campo — e
    quem chama volta a perguntar à fonte. Uma época errada raspa a época errada, e isso é
    muito pior do que um pedido a mais.
    """
    try:
        d = json.loads((destino / "competitions.json").read_text())
    except (OSError, json.JSONDecodeError):
        return None
    temporada = d.get("temporada")
    return temporada if isinstance(temporada, int) else None

def _merito_da_ficha(html: str, dados: dict) -> list[dict] | None:
    """O Mérito da Formação das duas equipas, **do mesmo HTML que a ficha já leu**.

    Zero pedidos novos à fonte: a grelha de participação vive no `#acta` da página que
    acabámos de descarregar. `None` quando o boletim ainda não está lá — só aparece uns
    minutos depois do apito — e aí fica `None` guardado, que é diferente de não haver chave:
    sem a chave, o `_sem_chave` mandava-nos buscar a mesma página outra vez, para sempre.

    O que sai daqui é agregado por equipa. A grelha por criança não é guardada nem publicada
    — ver `parsers/participacao.py`.
    """
    lido = participacao(html)
    if lido is None:
        return None
    # o 92.4.2 — cartões a quem está no banco — sai das linhas de equipa técnica do mesmo
    # boletim. `None` aqui não é motivo para desistir do mérito: só quer dizer que não há
    # banco para ler, e o `merito_do_jogo` faz a conta sem o 4.2
    banco = nao_atletas(html)
    contas = [para_dicionario(m) for m in merito_do_jogo(
        dados.get("casa"), dados.get("fora"), lido,
        dados.get("golos_casa"), dados.get("golos_fora"), banco)]
    # as letras que não são o `X` normal, por equipa e sem dizer de quem — ver
    # `marcas_da_grelha`. Só quando as há: um jogo normal fica exactamente como era.
    for conta, letras in zip(contas, marcas_da_grelha(html) or ()):
        fora_do_x = {k: v for k, v in sorted(letras.items()) if k != "X"}
        if fora_do_x:
            conta["marcas_fora_do_x"] = fora_do_x
    return contas


def _sem_marcas(merito: list[dict] | None) -> list[dict] | None:
    """O Mérito sem a contagem das letras, para a releitura comparar só a conta: sem isto, a
    primeira releitura de cada jogo com um `J` contava como ficha corrigida."""
    if merito is None:
        return None
    return [{k: v for k, v in m.items() if k != "marcas_fora_do_x"} for m in merito]


def _resumo_do_merito(ficha: dict) -> dict | None:
    """O Mérito de um jogo em duas contas, para a linha do jogo nas listas da app.

    Pedido do dono a 27/10/2026: ver o Mérito por baixo de cada jogo já disputado, numa linha
    só, sem abrir a ficha. As listas lêem a `agenda.json` e não as fichas — abrir 79 fichas
    para desenhar uma lista estava fora de questão —, por isso o resumo tem de viver na agenda.

    **Zero pedidos novos:** sai da ficha que já está em disco. Fica ao mínimo, `[bonificação,
    penalização]` por equipa, porque a agenda traz ~800 jogos numa só resposta: medido no mesmo
    dia, são 79 jogos com Mérito e 3,8 KB a mais nos 291 KB da agenda. O total é a soma, e o
    pormenor regra a regra fica na ficha, que é onde se lê.

    A ordem do `merito` da ficha é casa e fora, mas procura-se pelo nome primeiro: é o nome
    que diz de quem é a conta, e uma ordem trocada punha os pontos de uma equipa na outra.
    Nos 79, o nome bate sempre; a ordem fica só de recurso.
    """
    contas = ficha.get("merito") or []
    por_nome = {m.get("equipa"): m for m in contas}
    casa, fora = por_nome.get(ficha.get("casa")), por_nome.get(ficha.get("fora"))
    if (casa is None or fora is None) and len(contas) == 2:
        casa, fora = contas
    if casa is None or fora is None:
        return None
    resumo: dict = {"casa": [casa["bonificacao"], casa["penalizacao"]],
                    "fora": [fora["bonificacao"], fora["penalizacao"]]}
    # sem isto, a linha mostrava como certo um total que tem uma penalização em aberto. E uma
    # grelha com letras que não são o `X` também, pedido do dono a 29/10/2026 — ver o
    # `docs/09-regulamento-apl.md`. Essa **não** entra nos `avisos` da equipa: o `por_confirmar`
    # da tabela da série conta os avisos, e a nota que o explica em produção fala só do 4.1.7.
    if any(m.get("avisos") or m.get("marcas_fora_do_x") for m in (casa, fora)):
        resumo["por_confirmar"] = True
    return resumo


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
            _nomes_do_calendario(dados, j.get("casa"), j.get("fora"))
            # O Mérito da Formação não se calcula aqui, e isso é deliberado. O boletim só
            # aparece uns minutos **depois** do apito final, por isso uma ronda ao vivo lê-o
            # sempre vazio — e escrever `merito: null` agora era pior do que não escrever
            # nada: a chave passava a existir, o `_sem_chave` da ronda completa deixava de
            # pedir a página outra vez, e o jogo ficava sem mérito para sempre. Sem a chave,
            # a ronda completa revisita uma vez, já com o jogo fechado, e acerta.
            if "merito" in antigo:
                dados["merito"] = antigo["merito"]
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
            # A época não muda a meio de uma janela de quatro horas — e agora o código faz o
            # que este comentário já dizia. Lê-se do `competitions.json` em disco, que a
            # ronda completa acabou de publicar, e só se pergunta à fonte quando ele não
            # responde. Ver `_temporada_em_disco`: eram 96 pedidos num sábado.
            id_temp = args.id_temp or _temporada_em_disco(destino) or _temporada_corrente(fonte)
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


def _nomes_do_calendario(dados: dict, casa: str | None, fora: str | None) -> None:
    """Uma ficha sem equipas fica com os nomes do calendário.

    A ficha de um jogo por começar pode vir da fonte **sem equipas nenhumas**: a mesa ainda não
    lançou a convocatória, e o cabeçalho com os nomes também não está lá. Apanhado pelo dono a
    31/10/2026 no Parede FC A – FSE/AJ Salesiana de sub-13 (jogo 9521): a ronda ao vivo foi
    buscá-la aos 20 minutos antes do apito e publicou `casa: ""` e `fora: ""`. A ficha de jogo
    mostrou dois círculos sem emblema, e tocar num deles dava "página não encontrada", porque o
    endereço da equipa sai do nome.

    O calendário já sabe quem joga, e ler os nomes daí não custa nenhum pedido. Só se preenche o
    que vem vazio: quando a ficha traz nomes, são esses que mandam.
    """
    if not dados.get("casa") and casa:
        dados["casa"] = casa
    if not dados.get("fora") and fora:
        dados["fora"] = fora


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
    hoje = _agora().date()
    for pasta in ("comp", "match", "merito", "scorers"):
        (destino / pasta).mkdir(parents=True, exist_ok=True)

    with Fonte(args.tenant) as fonte:
        id_temp = args.id_temp or _temporada_corrente(fonte)
        provas, total, buscadas, saltadas, restritas = [], 0, 0, 0, 0
        #: as releituras do Mérito desta ronda, e em quantas ele mudou — ver `_merito_por_rever`
        merito_relido, merito_mudou = 0, 0
        #: id da prova → a razão por que não se pediu a tabela dela. Vai no `meta.json`:
        #: sem isto o gráfico da consola mostrava menos pedidos sem ninguém saber se foi
        #: poupança ou avaria, que é o defeito do B9.31 outra vez.
        tabelas_saltadas: dict[int, str] = {}
        #: o `comp/<id>.json` da última publicação, lido uma vez por prova. É o que se
        #: reutiliza quando se salta a tabela, e é também o que diz se os resultados mudaram.
        publicado_antes: dict[int, dict | None] = {}

        def _anterior(id_prova: int) -> dict | None:
            if id_prova not in publicado_antes:
                try:
                    publicado_antes[id_prova] = json.loads(
                        (destino / "comp" / f"{id_prova}.json").read_text())
                except (OSError, json.JSONDecodeError):
                    publicado_antes[id_prova] = None
            return publicado_antes[id_prova]

        def _quer_tabela(prova, cal) -> bool:
            """Com o interruptor desligado pede-se tudo, como sempre."""
            if not FILTRAR_TABELAS:
                return True
            antes = _anterior(prova.id)
            pedir, porque = pedir_tabela(
                jogos_agora=[para_dicionario(j) for j in cal.jogos],
                jogos_antes=antes.get("jogos") if antes is not None else None,
                hoje=_agora().date())
            if not pedir:
                tabelas_saltadas[prova.id] = porque
                print(f"      tabela saltada: {porque}", file=sys.stderr)
            return pedir
        equipas_por_escalao: dict[tuple[str, str], set[int]] = {}
        agenda: list[dict] = []
        #: id do jogo → a sua entrada na agenda, para a ficha poder marcá-lo a decorrer
        agenda_por_id: dict[int, dict] = {}
        logos: dict[str, str] = {}
        emblema_da_equipa: dict[str, str] = {}

        for prova, cal, tabela in _tudo(fonte, id_temp, com_classificacao=True,
                                        quer_tabela=_quer_tabela):
            # emblemas: guardamos o id da fonte e reescrevemos o campo para a nossa origem,
            # o que também resolve a inconsistência de URLs absolutos vs relativos
            for eq in cal.equipas:
                if (idl := id_do_logo(eq.logo)):
                    logos.setdefault(idl, f"https://{args.tenant}.assyssoftware.es/intranet/logos/{idl}.png")
                    emblema_da_equipa[eq.nome] = caminho_publico(idl)

            provas.append({**para_dicionario(prova), **identificar(prova.categoria, prova.nome)})
            # **Saltar a tabela não é publicar uma tabela vazia.** Reutiliza-se a da última
            # publicação; um `[]` aqui fazia o `vale_calcular` concluir que a fonte não
            # publica tabela nenhuma e punha a nossa calculada no lugar dela — uma tabela
            # diferente por causa de uma poupança de pedidos, que é inaceitável.
            if tabela is not None:
                classif = para_dicionario(tabela)["grupos"]
            else:
                classif = ((_anterior(prova.id) or {}).get("classificacao") or []
                           if prova.id in tabelas_saltadas else [])
            conteudo = _com_tabela_calculada(
                {"competicao": para_dicionario(prova), **para_dicionario(cal),
                 "classificacao": classif},
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
                # Uma revisita por jogo, e só nas provas com Mérito — medido a 10/10/2026:
                # 27 jogos disputados nos oito Encontros Distritais, logo 27 pedidos uma vez
                # só. Pedir o campo em todas as provas custaria 260, para nada: o Artigo 92.º
                # não se aplica aos outros escalões.
                #
                # E um boletim que faltava pode ter chegado entretanto — ver `_boletim_por_chegar`.
                reler_merito = (args.rever_merito and vale_merito(prova.nome)
                                and _merito_por_rever(alvo, hoje))
                falta_campo_novo = _sem_chave(alvo, "boletim") or (
                    vale_merito(prova.nome) and _sem_chave(alvo, "merito")) or (
                    args.rever_boletins and _boletim_por_chegar(alvo, hoje)) or reler_merito
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
                pagina = fonte.jogo(jogo.id).html
                dados = para_dicionario(ficha(pagina, jogo.id))
                _nomes_do_calendario(dados, jogo.casa, jogo.fora)
                if vale_merito(prova.nome):
                    dados["merito"] = _merito_da_ficha(pagina, dados)
                    antigo = json.loads(alvo.read_text()) if alvo.exists() else {}
                    if reler_merito:
                        merito_relido += 1
                        # sem a contagem das letras, que as fichas antigas não tinham: senão
                        # cada releitura contava como "mudou"
                        if _sem_marcas(antigo.get("merito")) != _sem_marcas(dados["merito"]):
                            merito_mudou += 1
                            print(f"Mérito do jogo {jogo.id} mudou na releitura de uma semana depois",
                                  file=sys.stderr)
                        dados["merito_revisto"] = hoje.isoformat()
                    elif antigo.get("merito_revisto"):
                        # uma ficha relida por outra razão (um resultado corrigido) não volta
                        # a contar como por reler
                        dados["merito_revisto"] = antigo["merito_revisto"]
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

            # Ficheiro próprio e não uma chave no `comp/`, por duas razões: o `comp/` já foi
            # escrito acima, antes de haver fichas, e um caminho novo não mexe no contrato
            # `/v1` que os telemóveis têm em cache. É a mesma escolha do `scorers/`.
            if vale_merito(prova.nome):
                com_merito = [f for f in fichas_da_prova if f.get("merito")]
                for f in com_merito:
                    resumo = _resumo_do_merito(f)
                    if resumo and f.get("id") in agenda_por_id:
                        agenda_por_id[f["id"]]["merito"] = resumo
                (destino / "merito" / f"{prova.id}.json").write_text(json.dumps({
                    "competicao_id": prova.id,
                    "nome": prova.nome,
                    "jogos_lidos": len(com_merito),
                    # jogos disputados cujo boletim a fonte não publicou: a tabela está
                    # incompleta nessa medida, e quem a lê tem direito a saber quanto
                    "jogos_sem_boletim": len(fichas_da_prova) - len(com_merito),
                    "linhas": [para_dicionario(l) for l in escalonar(
                        m for f in com_merito for m in f["merito"])],
                }, ensure_ascii=False, indent=1))

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
        # Quantas tabelas se saltaram e porquê — ver `provas_a_pedir.py`. Com o interruptor
        # desligado isto é sempre `{}`, e é assim que se distingue "não filtrámos" de
        # "filtrámos e não havia nada para saltar".
        "tabelas_saltadas": len(tabelas_saltadas),
        "tabelas_saltadas_porque": resumir(list(tabelas_saltadas.values())),
        "pedidos_fonte": fonte.pedidos,
        "pedidos_falhados": fonte.falhados,
        "pedidos_por_tipo": dict(sorted(fonte.por_tipo.items())),
        "pedidos_dia": acumular_pedidos(meta_anterior, fonte, _agora().date().isoformat()),
        # a medição que decide se a releitura de uma semana fica — ver `_merito_por_rever`;
        # o `meta.json` vai para o git a cada ronda, por isso o histórico conta-se depois
        "merito_relido": merito_relido,
        "merito_mudou": merito_mudou,
        # os jogos cuja grelha tem letras que não são o `X` — a pergunta do dono a 29/10/2026,
        # contada sobre todas as fichas em disco e não só as desta ronda
        "merito_marcas_fora_do_x": sorted(
            d["id"] for d in (json.loads(f.read_text()) for f in (destino / "match").glob("*.json"))
            if any(m.get("marcas_fora_do_x") for m in d.get("merito") or [])),
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
    b.add_argument("--rever-boletins", action="store_true",
                   help="voltar a pedir os jogos terminados que guardámos sem boletim, até "
                        f"{DIAS_DO_BOLETIM} dias depois do jogo — uma vez por dia, na ronda das 00:30")
    b.add_argument("--rever-merito", action="store_true",
                   help=f"reler uma vez as fichas com Mérito {DIAS_ATE_REVER_O_MERITO} dias depois do "
                        "jogo, para apanhar uma correcção da APL — na ronda das 00:30")
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
