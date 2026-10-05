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


#: Grafias que a fonte escreve de duas maneiras para o **mesmo** clube.
#:
#: Tabela explícita e não um algoritmo de semelhança, por uma razão medida: dos 79 pares de
#: nomes "a uma letra de distância" na agenda de 05/10, **77 são equipas mesmo diferentes** —
#: `CACO A` e `CACO B`, `SL BENFICA` e `SL BENFICA A`. Um algoritmo esperto juntava-as.
#:
#: Cada entrada foi confirmada a olhar para as provas em que cada grafia aparece:
#: - `HC LOURINHA` só nas taças e torneios de abertura (13 jogos); `HC LOURINHÃ` nos
#:   campeonatos regionais (52). O mesmo clube, sem o til nalgumas páginas da fonte.
#: - `A STRUART HCM` só na Taça Prof. João Campelo (3 jogos), onde `A STUART HCM` não
#:   aparece de todo. Gralha da fonte.
#:
#: **Não entra aqui** o `AE FISICA D (B)`: o `(B)` é o escalão dentro do torneio Zeca Pinto
#: — há um `AE FISICA D B (B)` ao lado dele, que é a equipa B no mesmo torneio. Juntá-los
#: fundia duas equipas diferentes. Cheguei a anunciá-lo como caso a corrigir, e era engano.
ALIAS = {
    "HC LOURINHA": "HC LOURINHÃ",
    "A STRUART HCM": "A STUART HCM",
}


def canonico(nome: str | None) -> str | None:
    """A grafia boa de um clube, quando a fonte usa duas."""
    if not nome:
        return nome
    return ALIAS.get(nome.strip(), nome)
