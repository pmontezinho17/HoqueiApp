"""Parser da página inicial: temporadas disponíveis e competições da modalidade."""
from __future__ import annotations

import re

from selectolax.parser import HTMLParser

from ..modelos import Competicao, Temporada

_ID_COMP = re.compile(r"id_comp=(\d+)")
_VER_COMP = re.compile(r"verComp\((\d+)\)")


def temporadas(html: str) -> list[Temporada]:
    """Do `<select id="temporada">`. Nunca hardcodar: os ids mudam a cada época e são
    diferentes por tenant (em 2026/27 a FPP está em 11 e a APLisboa em 5)."""
    arvore = HTMLParser(html)
    vistos: dict[int, Temporada] = {}
    for opcao in arvore.css("#temporada option"):
        valor = (opcao.attributes.get("value") or "").strip()
        if not valor.isdigit():
            continue
        # a fonte repete a época corrente como primeira opção; dict mantém a 1ª ocorrência
        vistos.setdefault(int(valor), Temporada(id=int(valor), rotulo=opcao.text(strip=True)))
    return sorted(vistos.values(), key=lambda t: -t.id)


def competicoes(html: str) -> list[Competicao]:
    """Cada `div.boxCompeticion` é uma categoria e traz `onclick="verComp(N)"`; as provas
    dessa categoria estão no `div#cN` correspondente.

    Usar essa ligação explícita e não a ordem dos nós: um seletor com vírgula no selectolax
    devolve os resultados agrupados por seletor, não por ordem no documento, e uma caminhada
    por irmãos parte à primeira mudança de markup da fonte.
    """
    arvore = HTMLParser(html)
    encontradas: list[Competicao] = []

    for cabeca in arvore.css("div.boxCompeticion"):
        m = _VER_COMP.search(cabeca.attributes.get("onclick") or "")
        nome = cabeca.css_first("p.boxCompeticionNom")
        if not m or not nome:
            continue  # a "AGENDA DEPORTIVA" é uma boxCompeticion sem bloco associado
        bloco = arvore.css_first(f"div#c{m.group(1)}")
        if bloco is None:
            continue
        categoria = nome.text(strip=True)
        for linha in bloco.css("tr[onclick]"):
            mc = _ID_COMP.search(linha.attributes.get("onclick") or "")
            celula = linha.css_first("td.tdNombre")
            if mc and celula:
                encontradas.append(
                    Competicao(id=int(mc.group(1)), nome=celula.text(strip=True), categoria=categoria)
                )
    return encontradas
