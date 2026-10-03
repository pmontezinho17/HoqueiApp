"""Parser do boletim oficial de jogo — o bloco `#acta` do `partido.asp` (B1.9c).

É o documento que o delegado e o capitão assinam no fim. Traz coisas que a ficha normal não
dá: o **resultado parte a parte**, a equipa de arbitragem completa (cronometrista, auxiliar
dos 45 segundos, delegado técnico, gestor de segurança), as **horas de início e termo** de
cada parte, as **faltas de equipa por parte** — a ficha só as dá somadas — e quem era capitão.

Tudo aqui é defensivo de propósito. O boletim é o canto da fonte que menos vezes existe e
mais varia entre provas, e preferimos devolver menos do que rebentar: qualquer pedaço que
não esteja onde se espera sai a `None` ou vazio, e o jogo continua a ver-se na mesma.
"""

from __future__ import annotations

import re

from selectolax.parser import HTMLParser, Node

from ..modelos import Boletim, Parcial

#: as seis colunas do quadro de resultado, na ordem em que a fonte as escreve
_MOMENTOS = ("1ª parte", "2ª parte", "Prolongamento 1ª parte", "Prolongamento 2ª parte",
             "Desempate g.p.", "Resultado final")


def _celulas(tr: Node) -> list[str]:
    return [c.text(strip=True).replace("\xa0", " ").strip() for c in tr.css("td,th")]


def _numero(valor: str) -> int | None:
    return int(valor) if re.fullmatch(r"\d+", valor) else None


def _oficiais(tabela: Node) -> dict[str, str]:
    """`Cronometrista:` → `ALEXANDRE SIMÕES`, só os que estão preenchidos."""
    saida: dict[str, str] = {}
    for tr in tabela.css("tr"):
        c = _celulas(tr)
        if len(c) >= 2 and c[0].endswith(":") and c[1]:
            saida[c[0].rstrip(":").strip()] = c[1]
    return saida


def _parciais(tabela: Node) -> list[Parcial]:
    """O quadro "DEFINIÇÃO DO RESULTADO DO JOGO", lido pelas âncoras Visitada/Visitante.

    Não se conta por índice fixo: as duas linhas têm números de células diferentes, porque a
    da visitada ainda arrasta o quadro dos descontos de tempo e a do visitante arrasta o
    cabeçalho das horas. A âncora é a palavra, e os seis valores vêm logo a seguir.
    """
    def valores(marca: str) -> list[int | None]:
        for tr in tabela.css("tr"):
            c = _celulas(tr)
            # a última ocorrência: na linha da visitada a palavra aparece duas vezes
            indices = [i for i, x in enumerate(c) if x == marca]
            if indices and len(c) > indices[-1] + 6:
                return [_numero(x) for x in c[indices[-1] + 1:indices[-1] + 7]]
        return []

    casa, fora = valores("Visitada"), valores("Visitante")
    if not casa or not fora:
        return []
    return [Parcial(nome=n, casa=c, fora=f)
            for n, c, f in zip(_MOMENTOS, casa, fora)
            if c is not None or f is not None]


def _horas(tabela: Node, rotulo: str) -> list[str]:
    for tr in tabela.css("tr"):
        c = _celulas(tr)
        if rotulo in c:
            i = c.index(rotulo)
            return [x for x in c[i + 1:] if re.fullmatch(r"\d{1,2}:\d{2}", x)]
    return []


def _faltas_por_parte(tabela: Node) -> list[int]:
    """`TEMPO NORMAL | 1ª PARTE | 2` e, na linha seguinte, `2ª PARTE | 5`."""
    linhas = [_celulas(tr) for tr in tabela.css("tr")]
    for i, c in enumerate(linhas):
        if any(x.startswith("TOTAL DE FALTAS") for x in c) and "TEMPO NORMAL" in c:
            primeira = c[c.index("TEMPO NORMAL") + 1:]
            saida = []
            if "1ª PARTE" in primeira:
                saida.append(_numero(primeira[primeira.index("1ª PARTE") + 1]))
            seguinte = linhas[i + 1] if i + 1 < len(linhas) else []
            if "2ª PARTE" in seguinte:
                saida.append(_numero(seguinte[seguinte.index("2ª PARTE") + 1]))
            return [x for x in saida if x is not None]
    return []


def _capitao(tabela: Node) -> str | None:
    """A coluna `cap.` com um `C`. O `S` é o capitão suplente e fica de fora."""
    for tr in tabela.css("tr"):
        c = _celulas(tr)
        if len(c) >= 4 and c[2] == "C" and c[1]:
            return c[1]
    return None


def boletim(html: str) -> Boletim | None:
    """O boletim, ou `None` quando a fonte não o anexou — ver `Boletim` para quando isso é."""
    acta = HTMLParser(html).css_first("#acta")
    if acta is None:
        return None
    tabelas = acta.css("table")
    if len(tabelas) < 4:          # vazio enquanto o jogo decorre, e nos minutos a seguir
        return None

    cabecalho, resultado, visitada, visitante = tabelas[0], tabelas[1], tabelas[2], tabelas[3]
    return Boletim(
        oficiais=_oficiais(cabecalho),
        parciais=_parciais(resultado),
        faltas_casa=_faltas_por_parte(visitada),
        faltas_fora=_faltas_por_parte(visitante),
        inicio=_horas(resultado, "Hora/inicio"),
        termo=_horas(resultado, "Hora/termo"),
        capitao_casa=_capitao(visitada),
        capitao_fora=_capitao(visitante),
    )
