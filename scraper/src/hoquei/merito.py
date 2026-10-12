"""Mérito da Formação: o Artigo 92.º do regulamento da APL, em código.

O regulamento geral da APL para 2026/27 tem, no Artigo 92.º (páginas 92 e 93), uma tabela de
pontos que **não é a classificação** e que ninguém publica: ela escalona os clubes dos
Encontros Distritais de Escolares e Benjamins não por ganharem, mas por levarem a equipa
completa, por porem toda a gente a jogar, e por cumprirem o rodízio das meias partes. Marcar
mais golos vale 3 pontos; levar dez atletas e pô-los a todos em pista vale 10. É de propósito.

A fonte publica os ingredientes — a grelha `5I` do boletim oficial, ver `parsers/participacao.py` —
e não publica a conta. Nós fazemos a conta, com três avisos que não se escondem:

1. **Não é oficial.** A pontuação oficial é preenchida pelos delegados na Folha de Controlo
   de Jogo em papel e validada pelo Comité Técnico da APL (Artigo 93.º ponto 4.1). A nossa é
   lida do boletim que a fonte publica. Onde as duas discordarem, a oficial é a que manda.
2. **A excepção do 4.1.7 não é legível.** A penalização por um atleta fazer um só período não
   se aplica "em caso de lesão ou situação impeditiva comprovada pelo árbitro" — e isso é
   texto que o árbitro escreve no boletim em papel, não um campo. Nós detectamos o caso e
   marcamo-lo como **a confirmar**, em vez de penalizar uma equipa que levou um miúdo ao
   hospital.
3. **Os cartões a não atletas (4.2) ficam de fora.** As colunas de disciplina do boletim são
   dos atletas; as do banco não existem na grelha. Uma penalização que não conseguimos ver
   é melhor assumida em falta do que inventada.

### A conta, artigo a artigo

Bonificações (92.3), por jogo e por equipa:

| 3.1 | por cada atleta participante                 | +1 cada |
| 3.2 | equipa que marque mais golos                  | +3 |
| 3.3 | ambas com o mesmo número de golos             | +1 |
| 3.4 | equipa completa (2 GR e 8 JC)                 | +1 |

Penalizações (92.4.1):

| 4.1.1 | menos de 8 atletas                                      | -1 |
| 4.1.2 | só um guarda-redes                                      | -1 |
| 4.1.3 | até 8 atletas, por atleta com 3 meias partes seguidas   | -1 cada |
| 4.1.4 | mais de 8 atletas, por atleta com 3 meias partes        | -1 cada |
| 4.1.5 | mais de 8 atletas, por atleta com 3 seguidas            | -2 cada |
| 4.1.6 | por atleta que faça as quatro meias partes              | -4 cada |
| 4.1.7 | por atleta que faça um só período (e perde-se tudo)     | -6 cada |
| 4.1.8 | falta de comparência                                    | -10 |

Duas leituras que tomámos à letra e que vale a pena saber que tomámos:

* **O 4.1.4 e o 4.1.5 somam-se.** Numa equipa com mais de 8 atletas, três meias partes
  seguidas são também três meias partes: -1 pelo 4.1.4 e -2 pelo 4.1.5, -3 ao todo. O
  regulamento não diz que uma substitui a outra, e inventar essa regra seria mais ousado do
  que somá-las.
* **O 4.1.7.2 apaga as bonificações da equipa toda**, e não só as desse atleta: "não é
  atribuído bonificações", sem sujeito. Como nunca o aplicamos sozinhos — fica sempre
  pendente de confirmação, pelo ponto 2 acima — o efeito prático é um aviso, não um zero.

O 4.1.8 (falta de comparência) não aparece aqui por uma razão simples: um jogo sem
comparência não tem boletim nenhum para ler. Quem o souber tem de o dizer de fora.

### Porque é que isto é por equipa e não por criança

Ver `parsers/participacao.py`: a grelha diz que período é que cada criança jogou, e isso não
sai daqui. Tudo o que este módulo devolve é o agregado da equipa.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, field

from .parsers.participacao import AtletaBoletim

#: Em quantas meias partes se parte um jogo destes escalões — Artigo 87.º ponto 7.1.
MEIAS_PARTES = 4

#: Uma equipa completa, pelo 92.3.4 e pelo 87.º 7.4.2.
GUARDAS_REDES_COMPLETA = 2
JOGADORES_DE_CAMPO_COMPLETA = 8


@dataclass(frozen=True)
class Parcela:
    """Uma linha da conta, para a app poder mostrar *porquê* e não só *quanto*."""
    regra: str
    texto: str
    pontos: int


@dataclass(frozen=True)
class MeritoEquipa:
    """O mérito de uma equipa num jogo. Agregado — nunca por atleta."""
    equipa: str
    atletas: int
    guardas_redes: int
    participantes: int
    completa: bool
    bonificacao: int
    penalizacao: int
    total: int
    parcelas: list[Parcela] = field(default_factory=list)
    #: o que ficou por confirmar neste jogo, em português e para ser mostrado
    avisos: list[str] = field(default_factory=list)


def _conta(equipa: str, atletas: list[AtletaBoletim],
           golos: int | None, golos_adversario: int | None) -> MeritoEquipa:
    guarda_redes = [a for a in atletas if a.posicao == "GR"]
    campo = [a for a in atletas if a.posicao == "JC"]
    participantes = [a for a in atletas if a.participou]
    completa = (len(guarda_redes) == GUARDAS_REDES_COMPLETA
                and len(campo) == JOGADORES_DE_CAMPO_COMPLETA)

    boni: list[Parcela] = []
    if participantes:
        boni.append(Parcela("3.1", f"{len(participantes)} atletas participantes",
                            len(participantes)))
    if golos is not None and golos_adversario is not None:
        if golos > golos_adversario:
            boni.append(Parcela("3.2", "marcou mais golos", 3))
        elif golos == golos_adversario:
            boni.append(Parcela("3.3", "mesmo número de golos", 1))
    if completa:
        boni.append(Parcela("3.4", "equipa completa (2 GR e 8 JC)", 1))

    pena: list[Parcela] = []
    avisos: list[str] = []

    if len(atletas) < JOGADORES_DE_CAMPO_COMPLETA:
        pena.append(Parcela("4.1.1", f"apresentou {len(atletas)} atletas", -1))
    # O 4.1.2 lê-se "equipas só com um guarda-redes": zero guarda-redes não é o caso
    # previsto, e seria estranho penalizar menos quem levou nenhum do que quem levou um.
    # Quando acontecer, fica o aviso em vez de uma conta inventada.
    if len(guarda_redes) == 1:
        pena.append(Parcela("4.1.2", "só um guarda-redes", -1))
    elif not guarda_redes and atletas:
        avisos.append("sem guarda-redes no boletim — o 4.1.2 não prevê este caso")

    ate_oito = len(atletas) <= JOGADORES_DE_CAMPO_COMPLETA
    # Quem faz as quatro meias partes também fez três seguidas, e fica de fora do 4.1.3/4.1.5
    # de propósito: tem a sua própria regra, o 4.1.6, que é mais pesada (-4) e mais
    # específica. Somar as duas castigava duas vezes a mesma falha.
    seguidas = [a for a in atletas if a.tres_seguidas and not a.todas]
    tres = [a for a in atletas if a.meias_partes == 3]
    if ate_oito:
        if seguidas:
            pena.append(Parcela("4.1.3", f"{len(seguidas)} com 3 meias partes seguidas",
                                -len(seguidas)))
    else:
        if tres:
            pena.append(Parcela("4.1.4", f"{len(tres)} com 3 meias partes", -len(tres)))
        if seguidas:
            pena.append(Parcela("4.1.5", f"{len(seguidas)} com 3 meias partes seguidas",
                                -2 * len(seguidas)))

    # 87.º 7.4.1: fazer as quatro é proibido, **excepto ao guarda-redes de uma equipa que
    # só leve um**. É a mesma excepção que o 92.4.1.6 cita, e sem ela penalizávamos a
    # equipa duas vezes pela mesma falha de efectivo.
    so_um_gr = len(guarda_redes) == 1
    todas = [a for a in atletas
             if a.todas and not (so_um_gr and a.posicao == "GR")]
    if todas:
        pena.append(Parcela("4.1.6", f"{len(todas)} fizeram as quatro meias partes",
                            -4 * len(todas)))

    # 4.1.7 — o único que **não** aplicamos sozinhos. Ver o ponto 2 do cabeçalho.
    um_so = [a for a in atletas if a.meias_partes == 1]
    if um_so:
        avisos.append(
            f"{len(um_so)} atleta(s) com um só período — o 4.1.7 penaliza em 6 pontos e "
            "retira as bonificações, salvo lesão comprovada pelo árbitro, que o boletim "
            "publicado não mostra. Fica por confirmar e não está descontado."
        )

    bonificacao = sum(p.pontos for p in boni)
    penalizacao = sum(p.pontos for p in pena)
    return MeritoEquipa(
        equipa=equipa,
        atletas=len(atletas),
        guardas_redes=len(guarda_redes),
        participantes=len(participantes),
        completa=completa,
        bonificacao=bonificacao,
        penalizacao=penalizacao,
        total=bonificacao + penalizacao,
        parcelas=boni + pena,
        avisos=avisos,
    )


def merito_do_jogo(casa: str, fora: str,
                   atletas: tuple[list[AtletaBoletim], list[AtletaBoletim]],
                   golos_casa: int | None, golos_fora: int | None,
                   ) -> tuple[MeritoEquipa, MeritoEquipa]:
    """O mérito das duas equipas de um jogo, pela ordem (visitada, visitante)."""
    return (_conta(casa, atletas[0], golos_casa, golos_fora),
            _conta(fora, atletas[1], golos_fora, golos_casa))


# --- escalonamento da prova -------------------------------------------------

@dataclass(frozen=True)
class LinhaMerito:
    posicao: int
    equipa: str
    jogos: int
    participantes: int
    bonificacao: int
    penalizacao: int
    pontos: int
    #: pontos por jogo, para comparar equipas com calendários desiguais
    media: float
    por_confirmar: int


def escalonar(meritos: Iterable[dict]) -> list[LinhaMerito]:
    """A tabela da prova: o somatório de todos os jogos, por equipa (92.2.1).

    Recebe os agregados já guardados nas fichas — `{"equipa", "bonificacao",
    "penalizacao", "total", "participantes", "avisos"}` — para não voltar a abrir página
    nenhuma. É a mesma escolha que a classificação faz no `calcular_de_json`.

    **A ordem depois dos pontos é nossa.** O Artigo 92.º manda somar e escalonar, e não diz
    o que fazer num empate; pomos à frente quem conseguiu o mesmo em menos jogos, e só
    depois o nome. Se a APL publicar um critério, troca-se este.

    **O regulamento escalona *clubes*; nós escalonamos equipas**, como a fonte as nomeia em
    cada jogo. Numa série onde o mesmo clube inscreva duas equipas, a soma oficial juntava-as
    e a nossa não.
    """
    acc: dict[str, dict] = {}
    for m in meritos:
        equipa = m.get("equipa")
        if not equipa:
            continue
        a = acc.setdefault(equipa, {"jogos": 0, "participantes": 0, "bonificacao": 0,
                                    "penalizacao": 0, "pontos": 0, "por_confirmar": 0})
        a["jogos"] += 1
        a["participantes"] += m.get("participantes") or 0
        a["bonificacao"] += m.get("bonificacao") or 0
        a["penalizacao"] += m.get("penalizacao") or 0
        a["pontos"] += m.get("total") or 0
        a["por_confirmar"] += 1 if m.get("avisos") else 0

    ordenadas = sorted(
        acc.items(),
        key=lambda par: (-par[1]["pontos"], par[1]["jogos"], par[0]),
    )
    return [
        LinhaMerito(
            posicao=i, equipa=equipa, jogos=a["jogos"],
            participantes=a["participantes"], bonificacao=a["bonificacao"],
            penalizacao=a["penalizacao"], pontos=a["pontos"],
            media=round(a["pontos"] / a["jogos"], 2) if a["jogos"] else 0.0,
            por_confirmar=a["por_confirmar"],
        )
        for i, (equipa, a) in enumerate(ordenadas, start=1)
    ]


#: As provas onde o Artigo 92.º se aplica — ponto 1, lido à letra.
#:
#: Em 2026/27 só as oito primeiras existem (os cinco Encontros de Escolares e os três de
#: Benjamins). As Taças APL destes escalões estão aqui porque o artigo as nomeia e porque,
#: no dia em que a APL as inscrever, não queremos descobrir isto por elas não aparecerem.
_COM_MERITO = re.compile(
    r"^\s*(ENCONTROS\s+DISTRITAIS\s+(ESCOLARES|BENJAMINS)"
    r"|TA[ÇC]A\s+APL\s+(DE\s+)?(ESCOLARES|BENJAMINS|BAMBIS))",
    re.IGNORECASE,
)


def vale_merito(nome_da_prova: str) -> bool:
    """Se esta prova tem Mérito da Formação. Por nome, e nunca por palpite."""
    return bool(_COM_MERITO.match(nome_da_prova or ""))
