"""Nomes de clube e escalão em caixa de título, para fora da app.

Dentro da app os nomes ficam como a fonte os dá — maiúsculas — porque aparecem em tabelas
onde são todos iguais. Mas num calendário pessoal, ao lado de "Dentista" e "Reunião", um
`PAREDE FC B vs CACO B` grita.

Pôr isto em caixa de título **não é** `str.title()`: isso produz `Parede Fc B` e
`Fse/aj Salesiana`. As siglas têm de ficar como estão, e por isso estão listadas. A lista é
curta e fechada porque o universo é: 88 equipas na APL, com 70 palavras distintas.
"""

from __future__ import annotations

import re

#: Siglas que ficam em maiúsculas. Levantadas dos 88 nomes de equipa reais, não adivinhadas.
SIGLAS = {
    "AA", "AD", "AE", "APAC", "CD", "CF", "CP", "FC", "GD", "GDS", "GRF", "HC", "HCM",
    "IR", "SC", "SL", "UD", "UF", "FSE/AJ",
}


def _palavra(p: str) -> str:
    if p.upper() in SIGLAS:
        return p.upper()
    # sufixos de equipa (A, B, C, D) e códigos entre parênteses — (B), (S13), (SF)
    if len(p) == 1 or p.startswith("("):
        return p.upper()
    # desconhecida e curta: fica como está. Mais vale uma sigla nova em maiúsculas do
    # que transformar "APAC" em "Apac" por causa de uma regra esperta demais.
    if len(p) <= 3 and p.isupper():
        return p
    return re.sub(r"(^|[-/'])(\w)", lambda m: m.group(1) + m.group(2).upper(), p.lower())


def clube(nome: str) -> str:
    """`CD PAÇO ARCOS B` → `CD Paço Arcos B`."""
    return " ".join(_palavra(p) for p in nome.split())


def escalao(nome: str) -> str:
    """`SUB-13` → `Sub-13`; `SENIORES MASCULINOS` → `Seniores Masculinos`."""
    return " ".join(
        re.sub(r"(^|-)(\w)", lambda m: m.group(1) + m.group(2).upper(), p.lower())
        for p in nome.split()
    )
