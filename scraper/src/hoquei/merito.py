"""Mérito da Formação: o Artigo 92.º do regulamento da APL, em código.

O regulamento geral da APL para 2026/27 tem, no Artigo 92.º (páginas 92 e 93), uma tabela de
pontos que **não é a classificação** e que ninguém publica: ela escalona os clubes dos
Encontros Distritais de Escolares e Benjamins não por ganharem, mas por levarem a equipa
completa, por porem toda a gente a jogar, e por cumprirem o rodízio das meias partes. Marcar
mais golos vale 3 pontos; levar dez atletas e pô-los a todos em pista vale 10. É de propósito.

A fonte publica os ingredientes — a grelha `5I` do boletim oficial, ver `parsers/participacao.py` —
e não publica a conta. Nós fazemos a conta, com dois avisos que não se escondem:

1. **Não é oficial.** A pontuação oficial é preenchida pelos delegados na Folha de Controlo
   de Jogo em papel e validada pelo Comité Técnico da APL (Artigo 93.º ponto 4.1). A nossa é
   lida do boletim que a fonte publica. Onde as duas discordarem, a oficial é a que manda.
2. **A excepção do 4.1.7 não é legível.** A penalização por um atleta fazer um só período não
   se aplica "em caso de lesão ou situação impeditiva comprovada pelo árbitro" — e isso é
   texto que o árbitro escreve no boletim em papel, não um campo. Nós detectamos o caso e
   marcamo-lo como **a confirmar**, em vez de penalizar uma equipa que levou um miúdo ao
   hospital.

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

Penalizações aos não atletas (92.4.2), lidas das linhas do banco do boletim:

| 4.2 | cartão azul a um não atleta         | -2 cada |
| 4.2 | vermelho por acumulação (`a.c.`)    | -4 cada |
| 4.2 | vermelho directo (`dir.`)           | -6 cada |

**O 4.2 esteve duas vezes mal avaliado aqui, e vale a pena saber porquê.** Primeiro escrevi
que não era calculável, porque "as colunas de disciplina do boletim são dos atletas"; depois,
que era calculável pela ficha mas sem separar acumulação de directo, que é a diferença entre
-4 e -6. As duas avaliações estavam erradas pela mesma razão: ninguém tinha olhado para uma
linha de banco do boletim. Elas têm as seis colunas todas — amarelo, três suspensões,
`a.c.` e `dir.` — e a 12/10/2026 medi-o no jogo 9864, onde a ficha diz "1 vermelho" ao
treinador da FSE/AJ Salesiana e o boletim diz **onde**: na coluna `dir.`, logo -6.

Custo: zero pedidos novos. É o mesmo `#acta` de que já sai a grelha `5I`.

O amarelo a um não atleta **não** desconta: o 4.2 fala de azul e de vermelho, e acrescentar
o amarelo seria inventar regulamento.

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
from dataclasses import dataclass, field, replace

from .parsers.participacao import AtletaBoletim, NaoAtletaBoletim

#: Em quantas meias partes se parte um jogo destes escalões — Artigo 87.º ponto 7.1.
MEIAS_PARTES = 4

#: Quantos atletas de uma equipa estão em pista ao mesmo tempo.
EM_PISTA = 5

#: Uma equipa completa, pelo 92.3.4 e pelo 87.º 7.4.2.
GUARDAS_REDES_COMPLETA = 2
JOGADORES_DE_CAMPO_COMPLETA = 8

#: O 92.4.2, cartão a cartão. Os nomes estão aqui e não espalhados pelo `_conta` para que a
#: tabela do cabeçalho e a conta nunca possam discordar.
AZUL_NAO_ATLETA = -2
VERMELHO_POR_ACUMULACAO = -4
VERMELHO_DIRECTO = -6


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
    #: em quantas meias partes houve uma troca a meio — mais de cinco marcas na coluna. Ver
    #: `_sem_as_duvidosas`. É também o sinal, no ficheiro publicado, de que a ficha já foi
    #: lida com esta regra: um jogo antigo sem ele é revisitado uma vez (ver o `cli.py`).
    meias_partes_em_duvida: int = 0


def _sem_as_duvidosas(atletas: list[AtletaBoletim]) -> tuple[list[AtletaBoletim], int]:
    """Os atletas com as meias partes em dúvida apagadas, e quantas são essas.

    **A grelha marca quem entrou numa meia parte, e não quem a jogou inteira.** Até
    27/10/2026 contávamos cada marca como uma meia parte feita, com o 7.4.3 e o 7.6 do Artigo
    87.º a dizerem que isso era o mesmo: quem entra faz a meia parte toda, e quem substitui
    conta como se a tivesse feito.

    Deixa de ser o mesmo quando há uma troca a meio. Apanhado por um pai a 26/10/2026, numa
    penalização de -3 à AE Física nos Escolares: no jogo 9913 a 4.ª meia parte da equipa tinha
    **seis** marcas — os dois guarda-redes —, e o guarda-redes marcado na 2.ª, 3.ª e 4.ª
    contava como "três meias partes seguidas". Se foi ele quem saiu a meio da 4.ª, pelo 7.4.3
    não a fez e não há penalização nenhuma; se foi ele quem entrou, pelo 7.6 fê-la e a
    penalização é devida. **O boletim publicado não diz qual dos dois**, e escolher um seria
    inventar um castigo ou perdoá-lo.

    Por isso uma coluna com mais de cinco marcas fica fora da conta das penalizações por
    excesso de meias partes, e quem só chegue às três ou às quatro com ela fica **por
    confirmar** — o mesmo tratamento do 4.1.7, pela mesma razão: o que decide está no papel do
    árbitro e não no boletim que a fonte publica. As bonificações e o 4.1.7 continuam a ler
    as marcas todas: uma marca diz sempre que o atleta participou.
    """
    marcas = [sum(a.periodos[i] for a in atletas) for i in range(MEIAS_PARTES)]
    duvidosas = {i for i, n in enumerate(marcas) if n > EM_PISTA}
    if not duvidosas:
        return atletas, 0
    certos = [replace(a, periodos=tuple(  # type: ignore[arg-type]
        p and i not in duvidosas for i, p in enumerate(a.periodos))) for a in atletas]
    return certos, len(duvidosas)


def _conta(equipa: str, atletas: list[AtletaBoletim],
           golos: int | None, golos_adversario: int | None,
           banco: list[NaoAtletaBoletim] | None = None) -> MeritoEquipa:
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
    # As penalizações por excesso contam-se só nas meias partes sem troca a meio — ver
    # `_sem_as_duvidosas`. Quem só passa da conta com uma delas fica por confirmar, abaixo.
    certos, em_duvida = _sem_as_duvidosas(atletas)
    # Quem faz as quatro meias partes também fez três seguidas, e fica de fora do 4.1.3/4.1.5
    # de propósito: tem a sua própria regra, o 4.1.6, que é mais pesada (-4) e mais
    # específica. Somar as duas castigava duas vezes a mesma falha.
    seguidas = [a for a in certos if a.tres_seguidas and not a.todas]
    tres = [a for a in certos if a.meias_partes == 3]
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
    todas = [a for a in certos
             if a.todas and not (so_um_gr and a.posicao == "GR")]
    if todas:
        pena.append(Parcela("4.1.6", f"{len(todas)} fizeram as quatro meias partes",
                            -4 * len(todas)))

    # Quem passaria da conta se a meia parte da troca contasse: não se desconta, diz-se.
    if em_duvida:
        def excede(a: AtletaBoletim) -> bool:
            return a.meias_partes >= 3 and not (
                a.todas and so_um_gr and a.posicao == "GR")
        por_confirmar = sum(1 for bruto, certo in zip(atletas, certos)
                            if excede(bruto) and not excede(certo))
        if por_confirmar:
            avisos.append(
                f"{por_confirmar} atleta(s) só chegam às 3 ou 4 meias partes contando uma em "
                "que houve troca a meio — o boletim marca quem entrou e não diz quem saiu. "
                "Fica por confirmar e não está descontado."
            )

    # 4.1.7 — o único que **não** aplicamos sozinhos. Ver o ponto 2 do cabeçalho.
    um_so = [a for a in atletas if a.meias_partes == 1]
    if um_so:
        avisos.append(
            f"{len(um_so)} atleta(s) com um só período — o 4.1.7 penaliza em 6 pontos e "
            "retira as bonificações, salvo lesão comprovada pelo árbitro, que o boletim "
            "publicado não mostra. Fica por confirmar e não está descontado."
        )

    pena += _disciplina_do_banco(banco or [])

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
        meias_partes_em_duvida=em_duvida,
    )


def _disciplina_do_banco(banco: list[NaoAtletaBoletim]) -> list[Parcela]:
    """O 92.4.2: os cartões a quem está no banco e não joga.

    Uma pessoa pode somar mais do que uma linha — três azuis e a expulsão por acumulação que
    vem deles são quatro marcas no boletim, e o regulamento não diz que o vermelho absorve os
    azuis. Contamos o que está marcado, que é o que o Comité Técnico tem à frente.

    Os amarelos ficam de fora: o 4.2 fala de azul e de vermelho, e só.
    """
    azuis = sum(p.azuis for p in banco)
    acumulacao = [p for p in banco if p.vermelho_acumulacao]
    directos = [p for p in banco if p.vermelho_directo]

    parcelas: list[Parcela] = []
    if azuis:
        texto = ("um cartão azul ao banco" if azuis == 1
                 else f"{azuis} cartões azuis ao banco")
        parcelas.append(Parcela("4.2", texto, AZUL_NAO_ATLETA * azuis))
    if acumulacao:
        texto = ("um vermelho por acumulação ao banco" if len(acumulacao) == 1
                 else f"{len(acumulacao)} vermelhos por acumulação ao banco")
        parcelas.append(Parcela("4.2", texto, VERMELHO_POR_ACUMULACAO * len(acumulacao)))
    if directos:
        texto = ("um vermelho directo ao banco" if len(directos) == 1
                 else f"{len(directos)} vermelhos directos ao banco")
        parcelas.append(Parcela("4.2", texto, VERMELHO_DIRECTO * len(directos)))
    return parcelas


def merito_do_jogo(casa: str, fora: str,
                   atletas: tuple[list[AtletaBoletim], list[AtletaBoletim]],
                   golos_casa: int | None, golos_fora: int | None,
                   banco: tuple[list[NaoAtletaBoletim], list[NaoAtletaBoletim]] | None = None,
                   ) -> tuple[MeritoEquipa, MeritoEquipa]:
    """O mérito das duas equipas de um jogo, pela ordem (visitada, visitante).

    O `banco` é opcional porque pode faltar sem o jogo deixar de ter mérito: sem ele a conta
    sai sem o 4.2, que é o que acontecia até 12/10/2026 e continua a ser o comportamento de
    quem não o passe.
    """
    sem_banco: tuple[list[NaoAtletaBoletim], list[NaoAtletaBoletim]] = ([], [])
    casa_banco, fora_banco = banco or sem_banco
    return (_conta(casa, atletas[0], golos_casa, golos_fora, casa_banco),
            _conta(fora, atletas[1], golos_fora, golos_casa, fora_banco))


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
