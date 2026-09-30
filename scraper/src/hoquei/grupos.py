"""Agrupar séries de uma mesma prova (B5.22/B5.23).

A fonte não tem o conceito de "o campeonato regional de sub-17": tem seis competições irmãs
cujo único laço é o prefixo do nome. Agrupar exige inferir a partir do nome — e por isso o
padrão foi **inventariado** nos dados antes de se escrever este código, e não adivinhado.

Inventário na APLisboa 2026/27 (37 competições):

    25×  `... - SERIE X`     → sufixo de série
    12×  sem sufixo          → prova de série única

`NIVEL I` / `NIVEL II` NÃO é série: faz parte do nome base
(`ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL I - SERIE A`), e o `NIVEL` distingue provas
diferentes, não séries da mesma. Foi verificado nos dados.

`ZONA NORTE` / `ZONA SUL` aparece nas competições nacionais da FPP e é reconhecido, mas não
está verificado nos dados da APL — por isso está aqui documentado como não confirmado.

Um nome que não encaixe em nenhum padrão fica **sem série**, nunca agrupado a palpite.
"""
from __future__ import annotations

import re
import unicodedata

# ancorado no fim da string: só o último segmento é sufixo de série
_SUFIXO = re.compile(
    r"\s+-\s+(?:S[EÉ]RIE|ZONA|GRUPO)\s+([A-Z0-9]{1,6}(?:\s+[A-Z]{1,6})?)\s*$",
    re.IGNORECASE,
)


def _slug(texto: str) -> str:
    sem_acentos = "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"[^a-z0-9]+", "-", sem_acentos.lower()).strip("-")


def separar(nome: str) -> tuple[str, str | None]:
    """`CAMP. REG. SUB-17 - 1ª FASE - SERIE A` → `("CAMP. REG. SUB-17 - 1ª FASE", "A")`."""
    m = _SUFIXO.search(nome)
    if not m:
        return nome.strip(), None
    return nome[: m.start()].strip(), m.group(1).strip().upper()


def identificar(categoria: str, nome: str) -> dict:
    """Metadados de grupo para uma competição, prontos a publicar no JSON."""
    base, serie = separar(nome)
    return {
        "grupo_id": f"{_slug(categoria)}--{_slug(base)}",
        "grupo_nome": base,
        "serie": serie,
    }
