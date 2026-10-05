"""Parser do calendário de uma competição: equipas, jornadas e jogos."""
from __future__ import annotations

import re
import sys
from datetime import date, time

from selectolax.parser import HTMLParser

from ..modelos import Calendario, Equipa, Jogo
from ..nomes import canonico

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
            nome=canonico((img.attributes.get("title") or "").strip()) or "",
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


def _colunas(celulas: list[str]) -> dict | None:
    """Mapeia uma linha de jogo, que a fonte escreve em dois formatos consoante a prova:

        10 colunas  Jogo | Gr. | Data | Hora | logo | Visitado | logo | Visitante | Res. | Recinto
         9 colunas  Jogo |      | Data | Hora | logo | Visitado | logo | Visitante | Res. | Recinto

    O de 9 (sem grupo) é o mais comum — provas de série única não têm grupo nenhum.
    Devolve None para linhas que não são jogos (cabeçalhos, separadores).
    """
    if len(celulas) == 10:
        numero, grupo, data, hora, _, casa, _, fora, resultado, recinto = celulas
    elif len(celulas) == 9:
        numero, data, hora, _, casa, _, fora, resultado, recinto = celulas
        grupo = ""
    else:
        return None
    return {"numero": numero, "grupo": grupo, "data": data, "hora": hora,
            "casa": casa, "fora": fora, "resultado": resultado, "recinto": recinto}


def jogos(html: str) -> tuple[list[Jogo], int]:
    """Devolve (jogos, linhas_ignoradas).

    A contagem de ignoradas existe porque a primeira versão deste parser deitava fora
    256 de 307 linhas sem dizer nada: assumia o layout de 10 colunas e as provas sem
    grupo desapareciam por completo. Um parser que descarta em silêncio é pior do que um
    que rebenta.
    """
    arvore = HTMLParser(html)
    encontrados: list[Jogo] = []
    ignoradas = 0

    for bloco in arvore.css("div.boxJornada"):
        cabeca = bloco.css_first("div.boxHead")
        jornada = cabeca.text(strip=True) if cabeca else ""
        for linha in bloco.css("table.jornada tr"):
            celulas = [c.text(strip=True) for c in linha.css("td")]
            if not celulas or linha.css_first("td b"):
                continue                                   # cabeçalho da tabela
            campos = _colunas(celulas)
            if campos is None:
                ignoradas += 1
                continue
            m = _ID_JOGO.search(linha.attributes.get("onclick") or "")
            mr = _RESULTADO.match(campos["resultado"])
            encontrados.append(Jogo(
                id=int(m.group(1)) if m else None,
                numero=campos["numero"] or None,
                grupo=campos["grupo"] or None,
                jornada=jornada,
                data=_data(campos["data"]),
                hora=_hora(campos["hora"]),
                casa=canonico(campos["casa"]),
                fora=canonico(campos["fora"]),
                golos_casa=int(mr.group(1)) if mr else None,
                golos_fora=int(mr.group(2)) if mr else None,
                recinto=campos["recinto"] or None,
            ))
    return encontrados, ignoradas


def calendario(html: str, competicao_id: int, temporada_id: int) -> Calendario:
    lista, ignoradas = jogos(html)
    if ignoradas:
        # não é fatal, mas tem de aparecer: é assim que se percebe que a fonte mudou
        print(f"aviso: {ignoradas} linhas de jogo ignoradas em id_comp={competicao_id}",
              file=sys.stderr)
    return Calendario(
        competicao_id=competicao_id,
        temporada_id=temporada_id,
        equipas=equipas(html),
        jogos=lista,
    )
