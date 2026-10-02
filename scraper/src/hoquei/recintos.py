"""Morada de cada recinto, para o `LOCATION` dos eventos de calendário.

A fonte só publica o **nome** do recinto — a ficha de jogo diz `Rinque/Localidade: PAV.
SALESIANA` e mais nada. Um nome assim não geocodifica: quem toca na localização do evento
não vai parar a lado nenhum. Daí esta lista, em `dados/recintos.json`.

**Uma morada errada é pior do que nenhuma**, porque manda alguém para o sítio errado num
sábado de manhã. Por isso o que não se sabe fica a `null` e cai no nome tal como vem.
"""

from __future__ import annotations

import json
import pathlib

_FICHEIRO = pathlib.Path(__file__).parent / "dados" / "recintos.json"
_MORADAS: dict[str, str] = {
    nome: dados["morada"]
    for nome, dados in json.loads(_FICHEIRO.read_text(encoding="utf-8"))["recintos"].items()
    if dados.get("morada")
}


def localizacao(recinto: str | None) -> str | None:
    """A morada quando a sabemos; senão o nome do recinto, que é melhor do que nada."""
    if not recinto:
        return None
    return _MORADAS.get(recinto.strip()) or recinto


def por_preencher() -> list[str]:
    """Os recintos ainda sem morada — usado pelo teste que impede a lista de apodrecer."""
    todos = json.loads(_FICHEIRO.read_text(encoding="utf-8"))["recintos"]
    return sorted(n for n, d in todos.items() if not d.get("morada"))
