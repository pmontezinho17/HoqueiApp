"""Motor de classificação: calcular a tabela a partir dos resultados.

Existe por uma razão concreta: **198 jogos da APL não têm tabela nenhuma**. Os Escolares
(5 provas), os Benjamins (3) e os Torneios Particulares (2) não publicam classificação, e
quem acompanha um filho nesses escalões anda a fazer as contas à mão.

As regras aqui não foram assumidas — foram **medidas** contra as 42 tabelas que a fonte
publica (ver `tests/test_tabela.py`, que volta a medi-las a cada execução):

* **3 pontos por vitória, 1 por empate.** Ajustado contra 151 linhas publicadas: `3V+1E`
  acerta em 151, `2V+1E` em 65.
* **A tabela conta só a fase de grupos.** Numa prova com séries, os jogos a eliminar
  (quartos, meias, final) vêm com a coluna de grupo vazia e **não** contam para lado nenhum.
* **Prova de série única deixa a coluna de grupo vazia em todos os jogos.** Aí contam todos,
  numa só tabela sem nome.
* **Ordem: pontos → diferença de golos → golos marcados → nome.**

Sobre o último critério, uma ressalva honesta que o teste também guarda: o desempate por
**nome** não é uma regra de regulamento, é o que a fonte faz quando tudo o resto empata. Dos
21 casos que lá chegam, 18 são tabelas sem um único jogo disputado. O regulamento da
federação quase de certeza manda ver o confronto directo primeiro; simplesmente ainda não
existe nenhum caso que distinga as duas regras. O `test_empates_por_desempatar_sao_conhecidos`
avisa no dia em que existir.
"""

from __future__ import annotations

from collections.abc import Iterable

from .modelos import GrupoClassificacao, Jogo, LinhaClassificacao

PONTOS_VITORIA = 3
PONTOS_EMPATE = 1

# a fonte usa "-" no calendário quando o apuramento ainda não definiu a equipa
_POR_DEFINIR = {"", "-", "--"}


class _Acumulador:
    __slots__ = ("jogos", "vitorias", "empates", "derrotas", "marcados", "sofridos")

    def __init__(self) -> None:
        self.jogos = self.vitorias = self.empates = self.derrotas = 0
        self.marcados = self.sofridos = 0

    def somar(self, marcados: int, sofridos: int) -> None:
        self.jogos += 1
        self.marcados += marcados
        self.sofridos += sofridos
        if marcados > sofridos:
            self.vitorias += 1
        elif marcados == sofridos:
            self.empates += 1
        else:
            self.derrotas += 1

    @property
    def pontos(self) -> int:
        return self.vitorias * PONTOS_VITORIA + self.empates * PONTOS_EMPATE


def _real(equipa: str | None) -> bool:
    return bool(equipa) and equipa.strip() not in _POR_DEFINIR


def _racio(marcados: int, sofridos: int) -> float | None:
    """A fonte mostra "-" quando ainda não sofreu golos; nós pomos None."""
    return None if sofridos == 0 else round(marcados / sofridos, 2)


def _linhas(jogos: list[Jogo]) -> list[LinhaClassificacao]:
    # as equipas vêm de **todos** os jogos do grupo, disputados ou não: uma prova por
    # começar tem tabela, com todos a zero, e sem isto ela sairia vazia
    acc: dict[str, _Acumulador] = {}
    for j in jogos:
        for equipa in (j.casa, j.fora):
            if _real(equipa):
                acc.setdefault(equipa, _Acumulador())

    for j in jogos:
        if j.golos_casa is None or j.golos_fora is None:
            continue
        if not (_real(j.casa) and _real(j.fora)):
            continue
        acc[j.casa].somar(j.golos_casa, j.golos_fora)
        acc[j.fora].somar(j.golos_fora, j.golos_casa)

    ordenadas = sorted(
        acc.items(),
        key=lambda par: (
            -par[1].pontos,
            -(par[1].marcados - par[1].sofridos),
            -par[1].marcados,
            par[0],
        ),
    )
    return [
        LinhaClassificacao(
            posicao=i,
            equipa=equipa,
            logo=None,
            jogos=a.jogos,
            vitorias=a.vitorias,
            empates=a.empates,
            derrotas=a.derrotas,
            golos_marcados=a.marcados,
            golos_sofridos=a.sofridos,
            diferenca=a.marcados - a.sofridos,
            racio=_racio(a.marcados, a.sofridos),
            pontos=a.pontos,
        )
        for i, (equipa, a) in enumerate(ordenadas, start=1)
    ]


def calcular(jogos: Iterable[Jogo]) -> list[GrupoClassificacao]:
    """A classificação de uma prova, um grupo por série.

    Numa prova com séries, os jogos sem grupo são a fase a eliminar e ficam de fora. Numa
    prova de série única — onde *nenhum* jogo traz grupo — entram todos, num grupo sem nome.
    """
    jogos = list(jogos)
    series = sorted({j.grupo for j in jogos if j.grupo})
    if not series:
        return [GrupoClassificacao(nome=None, linhas=_linhas(jogos))]
    return [
        GrupoClassificacao(
            # a fonte escreve "SERIE A" na classificação e só "A" no calendário
            nome=f"SERIE {s}",
            linhas=_linhas([j for j in jogos if j.grupo == s]),
        )
        for s in series
    ]
