"""O que se sabe de um jogo antes de ele começar (#11, fase 1).

Um `prejogo/<id>.json` por cada jogo oficial — por disputar e, desde 07/11/2026, também os
disputados, com o que se sabia antes deles (ver `calcular`): a forma recente das duas equipas, o
confronto directo desta época, os números da época com o lugar na série, e as sequências que
só se tiram da cronologia — quem marca primeiro, quem ganha ao intervalo.

**Feito aqui e não no telemóvel, e sem um único pedido à fonte.** Os resultados estão todos na
agenda que a app já descarrega, mas as sequências precisam das fichas: medido a 06/11/2026, 545
ficheiros e 10 MB. Ninguém descarrega isso para abrir um jogo, e fazer metade das contas no
browser e a outra metade aqui era ter duas implementações da mesma época. Tudo o que isto lê
já está no disco — a agenda e o `match/` que o `publicar` acabou de escrever —, por isso corre
em cada ronda e também sozinho, no botão do site de testes, sem custar nada à APL.

**Um ficheiro por jogo, e não um por equipa**, para a página do jogo fazer um pedido e não
três: as duas equipas, o confronto entre elas e o lugar de cada uma na série. O preço é que um
resultado mexe em todos os jogos por disputar das duas equipas e da série, e isso é só espaço
no git — os ficheiros só se reescrevem quando mudam.

**Fase 2, a 06/11/2026:** quando marcam e quando sofrem, a disciplina e os treinadores — ver
`_detalhe`. Tudo das mesmas fichas, e com a mesma cobertura medida nesse dia: as 521 fichas
oficiais têm o relógio de cada parte, as faltas de equipa e o treinador das duas equipas.

O que fica de fora, de propósito:

* **Torneios Particulares** — jogos-treino e torneios de convite, com equipas de escalões
  diferentes debaixo do mesmo nome. Uma forma que mistura um treino de pré-época com o
  campeonato não diz nada sobre o campeonato.
* **As defesas dos guarda-redes** — só 141 das 521 fichas oficiais as registam (medido a
  06/11/2026). Uma percentagem feita com um quarto dos jogos parecia um número e não era.
"""
from __future__ import annotations

import bisect
import json
import pathlib
from dataclasses import dataclass, field

#: os escalões que não entram — ver o cabeçalho
FORA = {"TORNEIOS PARTICULARES"}
#: quantos jogos mostra a forma recente; os cinco das apps que o dono trouxe a 06/11/2026
ULTIMOS = 5


@dataclass
class Detalhe:
    """O que só a ficha diz de um jogo, visto de uma das equipas (fase 2)."""

    #: golos em cada quarto do tempo regulamentar, da equipa e do adversário; `None` sem relógio
    quartos_marcados: list[int] | None
    quartos_sofridos: list[int] | None
    #: (partes, minutos de cada uma) — 2×20 nos Sub-15, 4×8 nos Benjamins
    formato: tuple[int, int] | None
    #: faltas de equipa no fim do jogo: (nossas, do adversário)
    faltas: tuple[int, int] | None
    azuis: int
    amarelos: int
    vermelhos: int
    #: (marcados, tentados), a favor e contra
    penaltis: tuple[int, int]
    penaltis_contra: tuple[int, int]
    livres: tuple[int, int]
    livres_contra: tuple[int, int]
    treinador: str | None
    treinador_adversario: str | None


@dataclass
class Jogado:
    """Um jogo já disputado, visto de uma das equipas."""

    id: int
    data: str
    hora: str
    comp: int
    prova: str
    em_casa: bool
    adversario: str
    marcados: int
    sofridos: int
    #: `marcou` ou `sofreu` — quem fez o primeiro golo; `None` num 0–0 ou sem ficha
    primeiro: str | None = None
    #: o resultado da 1.ª parte, visto desta equipa; `None` sem boletim
    intervalo: tuple[int, int] | None = None
    detalhe: Detalhe | None = None

    @property
    def resultado(self) -> str:
        return "V" if self.marcados > self.sofridos else "D" if self.marcados < self.sofridos else "E"


@dataclass
class Equipa:
    jogos: list[Jogado] = field(default_factory=list)   # do mais antigo para o mais recente

    def epoca(self) -> dict:
        js = self.jogos
        return {
            "jogos": len(js),
            "vitorias": sum(j.resultado == "V" for j in js),
            "empates": sum(j.resultado == "E" for j in js),
            "derrotas": sum(j.resultado == "D" for j in js),
            "marcados": sum(j.marcados for j in js),
            "sofridos": sum(j.sofridos for j in js),
            "sem_sofrer": sum(j.sofridos == 0 for j in js),
            "sem_marcar": sum(j.marcados == 0 for j in js),
        }

    def sequencias(self) -> dict:
        recentes = self.jogos[::-1]

        def seguidos(cond) -> int:
            n = 0
            for j in recentes:
                if not cond(j):
                    break
                n += 1
            return n

        ultimo = recentes[0].resultado if recentes else None
        com_golos = [j for j in self.jogos if j.primeiro]
        com_intervalo = [j for j in self.jogos if j.intervalo]
        marcou_primeiro = [j for j in com_golos if j.primeiro == "marcou"]

        def vezes(js, cond) -> dict:
            return {"vezes": sum(1 for j in js if cond(j)), "de": len(js)}

        return {
            # o resultado que se repete desde o último jogo: três vitórias seguidas, por exemplo
            "resultado": {"tipo": ultimo, "n": seguidos(lambda j: j.resultado == ultimo)} if ultimo else None,
            "sem_perder": seguidos(lambda j: j.resultado != "D"),
            "sem_ganhar": seguidos(lambda j: j.resultado != "V"),
            "a_marcar": seguidos(lambda j: j.marcados > 0),
            "a_sofrer": seguidos(lambda j: j.sofridos > 0),
            # sobre os jogos com pelo menos um golo e ficha publicada — num 0–0 ninguém marcou
            # primeiro, e contá-lo no "de" fazia a percentagem mentir para baixo
            "marcou_primeiro": vezes(com_golos, lambda j: j.primeiro == "marcou"),
            "sofreu_primeiro": vezes(com_golos, lambda j: j.primeiro == "sofreu"),
            "ganhou_depois_de_marcar_primeiro": vezes(marcou_primeiro, lambda j: j.resultado == "V"),
            "ganhava_ao_intervalo": vezes(com_intervalo, lambda j: j.intervalo[0] > j.intervalo[1]),
            "perdia_ao_intervalo": vezes(com_intervalo, lambda j: j.intervalo[0] < j.intervalo[1]),
        }


    def periodos(self) -> dict:
        """Os golos marcados e sofridos em cada quarto do jogo, somados na época.

        **Em quartos do tempo e não em minutos**, porque as partes vão de 8 a 25 minutos
        conforme o escalão e a prova (medido a 06/11/2026: 2×15, 2×18, 2×20, 2×25 e 4×8). Num
        jogo de quatro partes cada quarto é uma parte; num de duas é meia parte. O prolongamento
        fica de fora: não é tempo que todos os jogos tenham. O `formato` mais frequente vai junto
        para a app decidir se mostra duas partes ou quatro — ver `partesDoJogo`.
        """
        com = [j.detalhe for j in self.jogos if j.detalhe and j.detalhe.quartos_marcados is not None]
        formatos = [d.formato for d in com if d.formato]
        formato = max(set(formatos), key=formatos.count) if formatos else None
        return {
            "jogos": len(com),
            "marcados": [sum(d.quartos_marcados[i] for d in com) for i in range(4)],
            "sofridos": [sum(d.quartos_sofridos[i] for d in com) for i in range(4)],
            "formato": list(formato) if formato else None,
        }

    def disciplina(self) -> dict:
        com = [j.detalhe for j in self.jogos if j.detalhe]
        faltas = [d.faltas for d in com if d.faltas]
        soma = lambda f: [sum(f(d)[0] for d in com), sum(f(d)[1] for d in com)]
        return {
            "jogos": len(com),
            # sobre os jogos com faltas no boletim: 521 de 521 a 06/11/2026, mas o "de" é dele
            "jogos_com_faltas": len(faltas),
            "faltas": sum(f[0] for f in faltas),
            "faltas_adversario": sum(f[1] for f in faltas),
            "azuis": sum(d.azuis for d in com),
            "amarelos": sum(d.amarelos for d in com),
            "vermelhos": sum(d.vermelhos for d in com),
            "penaltis": soma(lambda d: d.penaltis),
            "penaltis_contra": soma(lambda d: d.penaltis_contra),
            "livres": soma(lambda d: d.livres),
            "livres_contra": soma(lambda d: d.livres_contra),
        }

    def treinador(self) -> dict | None:
        """O treinador do último jogo, e o que a equipa fez com ele esta época.

        O do último jogo e não o mais frequente: uma troca de treinador a meio da época é
        exactamente o que quem vai ver o jogo quer saber, e "o mais frequente" escondia-a.
        """
        com = [j for j in self.jogos if j.detalhe and j.detalhe.treinador]
        if not com:
            return None
        nome = com[-1].detalhe.treinador
        dele = [j for j in com if j.detalhe.treinador == nome]
        return {
            "nome": nome,
            "jogos": len(dele),
            "vitorias": sum(j.resultado == "V" for j in dele),
            "empates": sum(j.resultado == "E" for j in dele),
            "derrotas": sum(j.resultado == "D" for j in dele),
        }


def _segundos(relogio: str | None) -> int | None:
    try:
        m, s = (relogio or "").split(":")
        return int(m) * 60 + int(s)
    except ValueError:
        return None


def _treinador(ficha: dict, nome_equipa: str | None) -> str | None:
    for e in ficha.get("equipas") or []:
        if e.get("nome") == nome_equipa:
            return next((j["nome"] for j in e.get("jogadores") or [] if j.get("papel") == "T" and j.get("nome")), None)
    return None


def _detalhe(ficha: dict | None, casa: bool) -> Detalhe | None:
    """Os números da fase 2 de um jogo, a partir da cronologia e do boletim.

    O quarto de cada golo sai do relógio da fonte, que conta para trás dentro de cada parte: o
    `inicio_parte` diz quanto dura a parte (`"20:00"`), e um golo aos `"8:13"` foi marcado com
    11:47 jogados. As partes regulamentares são as que duram o mesmo que a primeira — o
    prolongamento tem 3 ou 5 minutos, e medido a 06/11/2026 vem em 50 das 521 fichas.

    A equipa de um penálti falhado é a que o bateu, e a de um cartão a do jogador que o viu —
    verificado contra o plantel da própria ficha.
    """
    if not ficha:
        return None
    nossa = ficha.get("casa") if casa else ficha.get("fora")
    deles = ficha.get("fora") if casa else ficha.get("casa")
    cron = ficha.get("cronologia") or []

    duracao = {e.get("parte"): _segundos(e.get("relogio")) for e in cron if e.get("tipo") == "inicio_parte"}
    primeira = duracao.get(1)
    regulares = sorted(p for p, d in duracao.items() if p and d and d == primeira)
    quartos_m = quartos_s = formato = None
    if primeira and regulares == list(range(1, len(regulares) + 1)):
        total = primeira * len(regulares)
        quartos_m, quartos_s = [0, 0, 0, 0], [0, 0, 0, 0]
        formato = (len(regulares), primeira // 60)
        for e in cron:
            if e.get("tipo") != "golo" or e.get("parte") not in regulares:
                continue
            falta = _segundos(e.get("relogio"))
            if falta is None:
                quartos_m = quartos_s = formato = None
                break
            jogado = (e["parte"] - 1) * primeira + (primeira - falta)
            q = min(3, max(0, jogado * 4 // total))
            if e.get("equipa") == nossa:
                quartos_m[q] += 1
            elif e.get("equipa") == deles:
                quartos_s[q] += 1

    def conta(tipo_golo: str, tipo_falhado: str, equipa: str) -> tuple[int, int]:
        marcados = sum(1 for e in cron if e.get("tipo") == "golo" and e.get("variante") == tipo_golo
                       and e.get("equipa") == equipa)
        falhados = sum(1 for e in cron if e.get("tipo") == tipo_falhado and e.get("equipa") == equipa)
        return marcados, marcados + falhados

    def cartoes(cor: str) -> int:
        return sum(1 for e in cron if e.get("tipo") == "cartao" and e.get("variante") == cor
                   and e.get("equipa") == nossa)

    f = ficha.get("faltas") or [None, None]
    faltas = None
    if f[0] is not None and f[1] is not None:
        faltas = (f[0], f[1]) if casa else (f[1], f[0])
    return Detalhe(
        quartos_marcados=quartos_m, quartos_sofridos=quartos_s, formato=formato, faltas=faltas,
        azuis=cartoes("azul"), amarelos=cartoes("amarelo"), vermelhos=cartoes("vermelho"),
        penaltis=conta("penalti", "penalti_falhado", nossa),
        penaltis_contra=conta("penalti", "penalti_falhado", deles),
        livres=conta("livre_direto", "livre_direto_falhado", nossa),
        livres_contra=conta("livre_direto", "livre_direto_falhado", deles),
        treinador=_treinador(ficha, nossa), treinador_adversario=_treinador(ficha, deles),
    )


def _do_jogo(ficha: dict | None, casa: bool) -> tuple[str | None, tuple[int, int] | None]:
    """Quem marcou primeiro e como estava ao intervalo, do ponto de vista de uma das equipas.

    Lido da ficha e não da agenda: a agenda só tem o resultado final. O primeiro golo é o
    primeiro `golo` da cronologia — medido a 06/11/2026, as 545 fichas têm tantos eventos de
    golo como golos no resultado, e todos com a equipa preenchida.
    """
    if not ficha:
        return None, None
    nossa = ficha.get("casa") if casa else ficha.get("fora")
    primeiro = None
    for e in ficha.get("cronologia") or []:
        if e.get("tipo") == "golo" and e.get("equipa"):
            primeiro = "marcou" if e["equipa"] == nossa else "sofreu"
            break
    # o `1ª parte` dos parciais é o resultado ao intervalo em todos os escalões, também nos
    # Benjamins e Escolares de quatro períodos: as 544 fichas com boletim têm `1ª parte` e
    # `2ª parte`, e as seis com prolongamento acrescentam-no depois
    intervalo = None
    for p in (ficha.get("boletim") or {}).get("parciais") or []:
        if p.get("nome") == "1ª parte" and p.get("casa") is not None and p.get("fora") is not None:
            intervalo = (p["casa"], p["fora"]) if casa else (p["fora"], p["casa"])
            break
    return primeiro, intervalo


def _lugares(numeros: dict[str, dict], equipa: str) -> dict:
    """O lugar de uma equipa na série em cada número, **por jogo** e não em total.

    Por jogo porque as equipas de uma série não jogaram todas o mesmo número de vezes: um jogo
    adiado punha uma equipa atrás em golos marcados sem ter marcado menos. Empates partilham o
    lugar (1, 2, 2, 4), como numa classificação. Só entram as equipas que já jogaram.
    """
    com_jogos = {e: n for e, n in numeros.items() if n["jogos"]}
    if equipa not in com_jogos:
        return {}
    medidas = {
        "vitorias": (lambda n: n["vitorias"] / n["jogos"], True),
        "marcados": (lambda n: n["marcados"] / n["jogos"], True),
        "sofridos": (lambda n: n["sofridos"] / n["jogos"], False),
        "diferenca": (lambda n: (n["marcados"] - n["sofridos"]) / n["jogos"], True),
        "sem_sofrer": (lambda n: n["sem_sofrer"] / n["jogos"], True),
    }
    lugares = {}
    for nome, (valor, maior_e_melhor) in medidas.items():
        meu = valor(com_jogos[equipa])
        melhores = sum(1 for n in com_jogos.values()
                       if (valor(n) > meu if maior_e_melhor else valor(n) < meu))
        lugares[nome] = melhores + 1
    return lugares


def _jogado(j: dict, casa: bool, ficha: dict | None) -> Jogado:
    primeiro, intervalo = _do_jogo(ficha, casa)
    return Jogado(
        id=j["id"], data=j["data"], hora=j.get("hora") or "", comp=j["comp"], prova=j["prova"],
        em_casa=casa, adversario=j["fora"] if casa else j["casa"],
        marcados=j["gc"] if casa else j["gf"], sofridos=j["gf"] if casa else j["gc"],
        primeiro=primeiro, intervalo=intervalo, detalhe=_detalhe(ficha, casa),
    )


def _chave(data: str, hora: str | None, id_jogo: int) -> tuple[str, str, int]:
    """A ordem do calendário. Sem hora vai para o fim do dia, como na agenda."""
    return (data, hora or "99:99", id_jogo)


def calcular(agenda: list[dict], fichas: dict[int, dict]) -> dict[int, dict]:
    """jogo oficial → o seu `prejogo`. Função pura: lê o que lhe dão e mais nada.

    **Também os jogos já disputados, com o que se sabia antes deles** — decisão do dono a
    07/11/2026: *"mantemos o separador depois do jogo, mas com os dados recolhidos até essa
    data"*. Para um jogo por disputar conta tudo o que já se jogou; para um disputado, só os
    jogos que vêm antes dele no calendário — a forma, a época, o lugar na série, o confronto
    directo e os treinadores ficam como estavam quando o jogo começou. Por isso o ficheiro de um
    jogo disputado não muda com os resultados seguintes, e só se reescreve se a APL corrigir
    uma ficha anterior. Um disputado em que nenhuma das duas equipas tinha jogado não tem nada
    para mostrar e não leva ficheiro.
    """
    oficiais = [j for j in agenda if j.get("cat") not in FORA and j.get("id")]
    equipas: dict[tuple[str, str], Equipa] = {}
    for j in sorted(oficiais, key=lambda j: _chave(j["data"], j.get("hora"), j["id"])):
        if j.get("gc") is None or j.get("gf") is None:
            continue
        ficha = fichas.get(j["id"])
        for casa in (True, False):
            nome = j["casa"] if casa else j["fora"]
            equipas.setdefault((j["cat"], nome), Equipa()).jogos.append(_jogado(j, casa, ficha))
    chaves = {k: [_chave(x.data, x.hora, x.id) for x in e.jogos] for k, e in equipas.items()}

    def ate(corte: tuple | None) -> dict[tuple[str, str], Equipa]:
        """As equipas só com os jogos antes de `corte`; com `None`, tudo o que se jogou."""
        if corte is None:
            return equipas
        return {k: Equipa(e.jogos[:bisect.bisect_left(chaves[k], corte)]) for k, e in equipas.items()}

    # as equipas de cada série, a partir de todos os jogos dela, disputados ou não
    serie: dict[int, set[str]] = {}
    for j in oficiais:
        serie.setdefault(j["comp"], set()).update((j["casa"], j["fora"]))

    vazio = Equipa()
    resultado = {}
    for j in oficiais:
        disputado = j.get("gc") is not None
        vistas = ate(_chave(j["data"], j.get("hora"), j["id"]) if disputado else None)
        cat = j["cat"]
        if disputado and not any(vistas.get((cat, n), vazio).jogos for n in (j["casa"], j["fora"])):
            continue
        da_serie = {nome: vistas.get((cat, nome), vazio).epoca() for nome in serie[j["comp"]]}
        lados = {}
        for lado, nome in (("casa", j["casa"]), ("fora", j["fora"])):
            e = vistas.get((cat, nome), vazio)
            lados[lado] = {
                "equipa": nome,
                "ultimos": [_linha(x) for x in e.jogos[::-1][:ULTIMOS]],
                "epoca": e.epoca(),
                "lugares": _lugares(da_serie, nome),
                "sequencias": e.sequencias(),
                "periodos": e.periodos(),
                "disciplina": e.disciplina(),
                "treinador": e.treinador(),
            }
        confrontos = [x for x in vistas.get((cat, j["casa"]), vazio).jogos if x.adversario == j["fora"]]
        resultado[j["id"]] = {
            "id": j["id"],
            "na_serie": sum(1 for n in da_serie.values() if n["jogos"]),
            **lados,
            # vistos da equipa da casa deste jogo, do mais recente para o mais antigo
            "confrontos": [_linha(x) for x in confrontos[::-1]],
            "treinadores": _treinadores_frente_a_frente(lados["casa"]["treinador"], lados["fora"]["treinador"], vistas),
        }
    return resultado


def _treinadores_frente_a_frente(casa: dict | None, fora: dict | None,
                                 equipas: dict[tuple[str, str], Equipa]) -> dict | None:
    """As vezes que os dois treinadores já se defrontaram esta época, **em qualquer escalão**.

    Um treinador costuma ter mais do que uma equipa, e é aí que isto diz alguma coisa que o
    confronto directo das equipas não diz. Contado do lado do treinador da casa deste jogo, e
    só uma vez por jogo — cada jogo está nas duas equipas que o jogaram.
    """
    if not casa or not fora or casa["nome"] == fora["nome"]:
        return None
    r = {"jogos": 0, "vitorias": 0, "empates": 0, "derrotas": 0}
    vistos = set()
    for e in equipas.values():
        for j in e.jogos:
            d = j.detalhe
            if j.id in vistos or not d or d.treinador != casa["nome"] or d.treinador_adversario != fora["nome"]:
                continue
            vistos.add(j.id)
            r["jogos"] += 1
            r[{"V": "vitorias", "E": "empates", "D": "derrotas"}[j.resultado]] += 1
    return r


def _linha(x: Jogado) -> dict:
    return {"id": x.id, "data": x.data, "comp": x.comp, "prova": x.prova, "em_casa": x.em_casa,
            "adversario": x.adversario, "marcados": x.marcados, "sofridos": x.sofridos}


def escrever(destino: pathlib.Path) -> tuple[int, int]:
    """Escreve `prejogo/` a partir da agenda e das fichas em disco. Devolve (escritos, apagados).

    **Só reescreve o que mudou**, como os `.ics`: o resultado é determinista, e reescrevê-lo
    igual fazia o git ver alterações a cada ronda. E apaga os que deixaram de existir — um jogo
    que saiu da agenda, ou que passou a Torneio Particular.
    """
    agenda = json.loads((destino / "agenda.json").read_text(encoding="utf-8"))["jogos"]
    fichas = {}
    for f in (destino / "match").glob("*.json"):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        fichas[d.get("id") or int(f.stem)] = d
    pasta = destino / "prejogo"
    pasta.mkdir(exist_ok=True)
    escritos = 0
    nomes = set()
    for id_jogo, conteudo in calcular(agenda, fichas).items():
        alvo = pasta / f"{id_jogo}.json"
        nomes.add(alvo.name)
        novo = json.dumps(conteudo, ensure_ascii=False, separators=(",", ":"))
        if not alvo.exists() or alvo.read_text(encoding="utf-8") != novo:
            alvo.write_text(novo, encoding="utf-8")
            escritos += 1
    apagados = 0
    for velho in pasta.glob("*.json"):
        if velho.name not in nomes:
            velho.unlink()
            apagados += 1
    return escritos, apagados
