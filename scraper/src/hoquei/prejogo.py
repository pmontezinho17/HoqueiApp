"""O que se sabe de um jogo antes de ele começar (#11, fase 1).

Um `prejogo/<id>.json` por cada jogo por disputar: a forma recente das duas equipas, o
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

O que fica de fora, de propósito:

* **Torneios Particulares** — jogos-treino e torneios de convite, com equipas de escalões
  diferentes debaixo do mesmo nome. Uma forma que mistura um treino de pré-época com o
  campeonato não diz nada sobre o campeonato.
* **As defesas dos guarda-redes** — só 141 das 521 fichas oficiais as registam (medido a
  06/11/2026). Uma percentagem feita com um quarto dos jogos parecia um número e não era.
"""
from __future__ import annotations

import json
import pathlib
from dataclasses import dataclass, field

#: os escalões que não entram — ver o cabeçalho
FORA = {"TORNEIOS PARTICULARES"}
#: quantos jogos mostra a forma recente; os cinco das apps que o dono trouxe a 06/11/2026
ULTIMOS = 5


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
        primeiro=primeiro, intervalo=intervalo,
    )


def calcular(agenda: list[dict], fichas: dict[int, dict]) -> dict[int, dict]:
    """jogo por disputar → o seu `prejogo`. Função pura: lê o que lhe dão e mais nada."""
    oficiais = [j for j in agenda if j.get("cat") not in FORA and j.get("id")]
    equipas: dict[tuple[str, str], Equipa] = {}
    for j in sorted(oficiais, key=lambda j: (j["data"], j.get("hora") or "99:99", j["id"])):
        if j.get("gc") is None or j.get("gf") is None:
            continue
        ficha = fichas.get(j["id"])
        for casa in (True, False):
            nome = j["casa"] if casa else j["fora"]
            equipas.setdefault((j["cat"], nome), Equipa()).jogos.append(_jogado(j, casa, ficha))

    # as equipas de cada série, a partir de todos os jogos dela, disputados ou não
    serie: dict[int, set[str]] = {}
    for j in oficiais:
        serie.setdefault(j["comp"], set()).update((j["casa"], j["fora"]))

    numeros = {chave: e.epoca() for chave, e in equipas.items()}
    vazio = Equipa()
    resultado = {}
    for j in oficiais:
        if j.get("gc") is not None:
            continue
        cat = j["cat"]
        da_serie = {nome: numeros.get((cat, nome), vazio.epoca()) for nome in serie[j["comp"]]}
        lados = {}
        for lado, nome in (("casa", j["casa"]), ("fora", j["fora"])):
            e = equipas.get((cat, nome), vazio)
            lados[lado] = {
                "equipa": nome,
                "ultimos": [_linha(x) for x in e.jogos[::-1][:ULTIMOS]],
                "epoca": e.epoca(),
                "lugares": _lugares(da_serie, nome),
                "sequencias": e.sequencias(),
            }
        confrontos = [x for x in equipas.get((cat, j["casa"]), vazio).jogos if x.adversario == j["fora"]]
        resultado[j["id"]] = {
            "id": j["id"],
            "na_serie": sum(1 for n in da_serie.values() if n["jogos"]),
            **lados,
            # vistos da equipa da casa deste jogo, do mais recente para o mais antigo
            "confrontos": [_linha(x) for x in confrontos[::-1]],
        }
    return resultado


def _linha(x: Jogado) -> dict:
    return {"id": x.id, "data": x.data, "comp": x.comp, "prova": x.prova, "em_casa": x.em_casa,
            "adversario": x.adversario, "marcados": x.marcados, "sofridos": x.sofridos}


def escrever(destino: pathlib.Path) -> tuple[int, int]:
    """Escreve `prejogo/` a partir da agenda e das fichas em disco. Devolve (escritos, apagados).

    **Só reescreve o que mudou**, como os `.ics`: o resultado é determinista, e reescrevê-lo
    igual fazia o git ver alterações a cada ronda. E apaga os dos jogos que entretanto se
    disputaram — a página do jogo só os pede enquanto não houver resultado.
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
