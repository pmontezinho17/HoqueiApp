"""Parser do calendário de uma competição: equipas, jornadas e jogos."""
from __future__ import annotations

import re
from datetime import date, time

from selectolax.parser import HTMLParser

from ..modelos import Calendario, Equipa, Jogo

_ID_EQUIPA = re.compile(r"id_equipo=(\d+)")
_ID_JOGO = re.compile(r"partido\.asp\?id=(\d+)")
_RESULTADO = re.compile(r"^\s*(\d{1,3})\s*-\s*(\d{1,3})\s*$")
_POR_DEFINIR = {"", "-", "--"}


def equipas(html: str) -> list[Equipa]:
    """Do `div#equipos` no topo: o nome está no `title` do logótipo, não no texto."""
    arvore = HTMLParser(html)
    encontradas: dict[int, Equipa] = {}
    for ligacao in arvore.css("div#equipos a"):
        m = _ID_EQUIPA.search(ligacao.attributes.get("href") or "")
        img = ligacao.css_first("img")
        if not m or img is None:
            continue
        id_equipa = int(m.group(1))
        encontradas.setdefault(id_equipa, Equipa(
            id=id_equipa,
            nome=(img.attributes.get("title") or "").strip(),
            logo=img.attributes.get("src"),
        ))
    return sorted(encontradas.values(), key=lambda e: e.nome)


def _data(texto: str) -> date | None:
    try:
        d, m, a = texto.strip().split("/")
        return date(int(a), int(m), int(d))
    except (ValueError, AttributeError):
        return None


def _hora(texto: str) -> time | None:
    # a fonte escreve "20.30", com ponto
    m = re.match(r"^\s*(\d{1,2})[.:h](\d{2})\s*$", texto or "")
    return time(int(m.group(1)), int(m.group(2))) if m else None


def jogos(html: str) -> list[Jogo]:
    arvore = HTMLParser(html)
    encontrados: list[Jogo] = []

    for bloco in arvore.css("div.boxJornada"):
        cabeca = bloco.css_first("div.boxHead")
        jornada = cabeca.text(strip=True) if cabeca else ""
        for linha in bloco.css("table.jornada tr"):
            celulas = [c.text(strip=True) for c in linha.css("td")]
            if len(celulas) < 10 or linha.css_first("td b"):
                continue  # linha de cabeçalho da tabela
            m = _ID_JOGO.search(linha.attributes.get("onclick") or "")
            numero, grupo, data_txt, hora_txt, _, casa, _, fora, resultado, recinto = celulas[:10]
            mr = _RESULTADO.match(resultado)
            encontrados.append(Jogo(
                id=int(m.group(1)) if m else None,
                numero=numero or None,
                grupo=grupo or None,
                jornada=jornada,
                data=_data(data_txt),
                hora=_hora(hora_txt),
                casa=casa,
                fora=fora,
                golos_casa=int(mr.group(1)) if mr else None,
                golos_fora=int(mr.group(2)) if mr else None,
                recinto=recinto or None,
            ))
    return encontrados


def calendario(html: str, competicao_id: int, temporada_id: int) -> Calendario:
    return Calendario(
        competicao_id=competicao_id,
        temporada_id=temporada_id,
        equipas=equipas(html),
        jogos=jogos(html),
    )
