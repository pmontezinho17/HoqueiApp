"""Parser da classificação (`?seccion=clasificacion`).

Uma prova pode ter vários grupos na mesma página. Cada grupo é um `div.boxDatos`
precedido por um `<p>` com o nome ("SERIE A"), sem qualquer marcação que os ligue —
por isso caminha-se para trás pelos irmãos até encontrar o rótulo.
"""
from __future__ import annotations

import re

from selectolax.parser import HTMLParser

from ..modelos import Classificacao, GrupoClassificacao, LinhaClassificacao

# posição | logo | equipa | JJ | V | E | D | GM | GS | GA | GM/GS | TP
_COLUNAS = 12


def _rotulo_do_grupo(caixa) -> str | None:
    no = caixa.prev
    while no is not None:
        if no.tag == "p":
            return no.text(strip=True) or None
        if no.tag == "div":            # chegámos ao grupo anterior: este não tem rótulo
            return None
        no = no.prev
    return None


def _racio(valor: str) -> float | None:
    """A fonte escreve "3,50" com vírgula decimal, e "-" quando ainda não sofreu golos."""
    valor = valor.strip()
    if not valor or valor == "-":
        return None
    try:
        return float(valor.replace(",", "."))
    except ValueError:
        return None


def classificacao(html: str, competicao_id: int, temporada_id: int) -> Classificacao:
    arvore = HTMLParser(html)
    grupos: list[GrupoClassificacao] = []

    for caixa in arvore.css("div.boxDatos"):
        grupo = GrupoClassificacao(nome=_rotulo_do_grupo(caixa))
        for linha in caixa.css("table.tbDatos tr"):
            celulas = [c.text(strip=True) for c in linha.css("td")]
            if len(celulas) != _COLUNAS or not celulas[0].isdigit():
                continue                                    # cabeçalho da tabela
            img = linha.css_first("td.tdLogo img")
            numeros = [int(c) if re.fullmatch(r"-?\d+", c) else 0 for c in celulas[3:10]]
            grupo.linhas.append(LinhaClassificacao(
                posicao=int(celulas[0]),
                equipa=celulas[2],
                logo=img.attributes.get("src") if img is not None else None,
                jogos=numeros[0], vitorias=numeros[1], empates=numeros[2], derrotas=numeros[3],
                golos_marcados=numeros[4], golos_sofridos=numeros[5], diferenca=numeros[6],
                racio=_racio(celulas[10]),
                pontos=int(celulas[11]) if celulas[11].lstrip("-").isdigit() else 0,
            ))
        if grupo.linhas:
            grupos.append(grupo)

    return Classificacao(competicao_id=competicao_id, temporada_id=temporada_id, grupos=grupos)
