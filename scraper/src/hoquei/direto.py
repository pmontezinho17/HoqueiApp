"""O placar das ligas nacionais a partir da "Jogos do Dia" do `hp.fpp.pt` — o ensaio do ao vivo.

    uv run python -m hoquei.direto --destino ../web/static/v1/fpp/2026-27

Uma ronda: lê a página **uma vez**, encontra cada jogo dela na agenda da FPP que publicamos, e
escreve na agenda o resultado e a marca de "a decorrer". Imprime, para o ciclo que a chama:
`a_decorrer=N`, `por_vir=N`, `acabaram=N` e `mudou=N`.

## Porque é que isto existe, e porque é um ensaio

O ao vivo nacional é o passo D de `docs/11-ligas-nacionais.md`: em vez de ler a ficha de cada
jogo de 30 em 30 segundos — que no servidor partilhado com a APL não cabe —, **um pedido de 30 em
30 segundos à "Jogos do Dia"**, noutro servidor, para todos os jogos ao mesmo tempo. O dono quis
testá-lo no site de testes no fim-de-semana de 21–22/11/2026, aprovou o custo a 19/11 (~1 000
pedidos por dia ao `hp.fpp.pt`) e sabia que isto vinha antes da medição: foi escrito contra uma
amostra só, com um jogo ao intervalo (`data-samples/paginas/fpp-direto-intervalo.html`). **Se a
página real for diferente, o placar simplesmente não mexe** — nunca escreve um resultado que não
leu —, e as rondas normais do ciclo continuam a trazer os resultados das fichas.

**Esta página não é a fonte oficial.** O resultado que fica é o da ficha, que a ronda normal
traz quando o jogo acaba; isto só adianta o que se vê enquanto ele decorre.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import unicodedata
from datetime import datetime
from zoneinfo import ZoneInfo

import httpx
from selectolax.parser import HTMLParser

from .fonte import UA

DIRETO = "https://hp.fpp.pt/Direto"
LISBOA = ZoneInfo("Europe/Lisbon")

#: Palavras que não distinguem clubes, e que fariam o "SC TOMAR" casar com o "SC MARINHENSE".
VAZIAS = {"hc", "cd", "sc", "ad", "fc", "gd", "cf", "ac", "ud", "sl", "ca", "aa", "cp", "hcp",
          "clube", "hoquei", "sad", "de", "da", "do", "dos", "das"}


def jogos_do_dia(html: str) -> list[dict]:
    """Os jogos da "Jogos do Dia", um por linha da versão de computador.

    A página repete cada jogo duas vezes, uma para computador e outra para telemóvel
    (`li.jogo-item.desktop` e `.mobile`); lê-se só a primeira. A competição é o `h4` que vem
    antes, numa linha própria da lista. É o mesmo parser do `medir_direto.py`, que sai depois
    da medição de 21/11.
    """
    arvore = HTMLParser(html)
    saida: list[dict] = []
    competicao = None
    for li in arvore.css("ul.lista-jogos > li"):
        titulo = li.css_first("h4.titulo-competicao")
        if titulo is not None:
            competicao = titulo.text(strip=True)
            continue
        classes = (li.attributes.get("class") or "").split()
        if "jogo-item" not in classes or "desktop" not in classes:
            continue
        casa = li.css_first(".team-visitada .team-name")
        fora = li.css_first(".team-visitante .team-name")
        resultado = li.css_first(".resultado span")
        estado = li.css_first(".resultado .estado-jogo")
        ligacao = li.css_first('a[href^="jogo/"]')
        saida.append({
            "id_hp": int(ligacao.attributes["href"].split("/")[1]) if ligacao else None,
            "competicao": competicao,
            "casa": casa.text(strip=True) if casa else None,
            "fora": fora.text(strip=True) if fora else None,
            "resultado": resultado.text(strip=True) if resultado else None,
            "estado": estado.text(strip=True) if estado else None,
        })
    return saida


def divisao(competicao: str | None) -> tuple[str, str | None] | None:
    """`CN 3ª Divisão Norte A` → `("3.ª DIVISÃO", "NORTE A")`. O Placard não tem zonas.

    Só as três divisões que a app tem (decisão do dono a 17/11/2026); o Feminino, os Sub-23 e
    as taças dão `None` e ficam de fora.
    """
    if not competicao:
        return None
    t = competicao.upper()
    if "FEMIN" in t or "SUB" in t or "TAÇA" in t or "TACA" in t or "CUP" in t:
        return None
    if "PLACARD" in t or re.search(r"\b1\s*[ªA.]?\s*DIVIS", t):
        return "1.ª DIVISÃO", None
    m = re.search(r"\b([23])\s*[ªA.]?\s*DIVIS\S*\s*(NORTE|SUL)?\s*([AB])?\b", t)
    if not m:
        return None
    zona = " ".join(p for p in (m.group(2), m.group(3)) if p) or None
    return f"{m.group(1)}.ª DIVISÃO", zona


def _palavras(nome: str | None) -> set[str]:
    sem = unicodedata.normalize("NFKD", nome or "").encode("ascii", "ignore").decode().lower()
    return {p for p in re.sub(r"[^a-z0-9]+", " ", sem).split() if len(p) > 2 and p not in VAZIAS}


def _equipa_b(nome: str | None) -> bool:
    """`Riba D`Ave HC "B"` e `RIBA D AVE HC B`: a letra no fim distingue a B da A.

    **Menos no Benfica de Alenquer**, que a FPP escreve `S. ALENQUER B` — o B é de Benfica, e a
    equipa B dele é a `S. ALENQUER B B` (ver `MESMO_CLUBE` no `web/src/lib/fontes.ts`).
    """
    t = re.sub(r"^S\.?\s*ALENQUER\s+B\b", "S. ALENQUER", (nome or "").upper().strip())
    return bool(re.search(r'["\s]B"?\s*$', t))


def _casa_com(direto: dict, jogo: dict) -> bool:
    """O mesmo jogo, se cada lado tiver uma palavra em comum e a mesma letra de equipa."""
    for lado_d, lado_j in (("casa", "casa"), ("fora", "fora")):
        if not (_palavras(direto.get(lado_d)) & _palavras(jogo.get(lado_j))):
            return False
        if _equipa_b(direto.get(lado_d)) != _equipa_b(jogo.get(lado_j)):
            return False
    return True


def resultado(texto: str | None) -> tuple[int, int] | None:
    m = re.fullmatch(r"\s*(\d+)\s*[-–]\s*(\d+)\s*", texto or "")
    return (int(m.group(1)), int(m.group(2))) if m else None


#: O que a página escreve num jogo que acabou. Só "Intervalo" foi visto até 19/11/2026; os
#: outros são palpites prudentes, e um estado desconhecido conta como "a decorrer".
ACABOU = re.compile(r"final|termin|fim|encerr", re.I)


def aplicar(agenda: list[dict], diretos: list[dict], hoje: str,
            mudados: list[dict] | None = None) -> dict[str, int]:
    """Escreve na agenda o que a página diz dos jogos de hoje. Devolve as contagens, e deixa em
    `mudados`, se vier, as entradas que mudaram.

    Só toca em jogos de hoje, da mesma divisão e zona, com as duas equipas a casar — **um só**
    candidato, senão nada: escrever o resultado de um jogo no jogo errado é pior do que não o
    escrever. Um jogo que acabou perde a marca de "a decorrer" e fica com o último resultado
    lido, até a ronda normal trazer o da ficha.
    """
    de_hoje = [j for j in agenda if j.get("data") == hoje]
    mudou = acabaram = 0
    mudados = [] if mudados is None else mudados
    for d in diretos:
        div = divisao(d.get("competicao"))
        placar = resultado(d.get("resultado"))
        if div is None or placar is None:
            continue
        cands = [j for j in de_hoje if j.get("cat") == div[0] and (j.get("serie") or None) == div[1]
                 and _casa_com(d, j)]
        if len(cands) != 1:
            print(f"  sem par único na agenda ({len(cands)}): {d.get('competicao')} · "
                  f"{d.get('casa')} – {d.get('fora')}", file=sys.stderr)
            continue
        j = cands[0]
        antes = (j.get("gc"), j.get("gf"), j.get("ao_vivo"), j.get("situacao"))
        j["gc"], j["gf"] = placar
        if ACABOU.search(d.get("estado") or ""):
            acabaram += 1
            for chave in ("ao_vivo", "periodo", "relogio", "situacao"):
                j.pop(chave, None)
        else:
            j["ao_vivo"] = True
            if d.get("estado"):
                j["situacao"] = d["estado"]
        if (j.get("gc"), j.get("gf"), j.get("ao_vivo"), j.get("situacao")) != antes:
            mudou += 1
            mudados.append(j)
    agora = datetime.now(LISBOA).strftime("%H:%M")
    a_decorrer = sum(1 for j in de_hoje if j.get("ao_vivo"))
    por_vir = sum(1 for j in de_hoje if j.get("gc") is None and (j.get("hora") or "99:99") > agora)
    return {"a_decorrer": a_decorrer, "por_vir": por_vir, "acabaram": acabaram, "mudou": mudou,
            "pendentes": pendentes(de_hoje, datetime.now(LISBOA))}


#: Quanto pode durar um jogo nacional, do apito inicial ao fim, com intervalos e descontos.
#: Medido nos calendários de 09/11/2026: 1h45 é o normal; 2h30 dá margem a um atraso.
DURACAO_MAXIMA_MIN = 150


def pendentes(de_hoje: list[dict], agora: datetime) -> int:
    """Os jogos de hoje que ainda podem mudar: sem resultado final e dentro da janela deles.

    **Não chega olhar para o "a decorrer"**: um jogo que já começou e que a página ainda não
    mostra — ou que mostra com um estado que não sabemos ler — não está marcado, e um ciclo que
    parasse por aí saía a meio do jogo. Conta enquanto não tiver resultado ou estiver marcado,
    até 2h30 depois da hora marcada.

    **O início é o do dia do jogo, e não o de hoje.** Até 21/11/2026 a hora marcada punha-se no
    dia do relógio, e a primeira corrida a sério passou a meia-noite: às 00:51 o jogo das 21:30
    de sexta contava como daí a vinte horas, e a corrida ficou a ler a página de 30 em 30 s pela
    noite fora, a caminho de se revezar até sábado à tarde.
    """
    n = 0
    for j in de_hoje:
        if j.get("gc") is not None and not j.get("ao_vivo"):
            continue
        hora = j.get("hora")
        if not hora:
            continue
        h, m = map(int, hora.split(":")[:2])
        dia = datetime.fromisoformat(j["data"]).date() if j.get("data") else agora.date()
        inicio = datetime(dia.year, dia.month, dia.day, h, m, tzinfo=agora.tzinfo)
        if (agora - inicio).total_seconds() < DURACAO_MAXIMA_MIN * 60:
            n += 1
    return n


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--destino", required=True, help="a árvore da FPP: .../v1/fpp/2026-27")
    p.add_argument("--pagina", default=None, help="um HTML gravado em vez da página, para testar")
    p.add_argument("--hoje", default=None, help="a data a fingir, para testar")
    a = p.parse_args(argv)

    destino = pathlib.Path(a.destino)
    if a.pagina:
        html = pathlib.Path(a.pagina).read_text(encoding="utf-8")
    else:
        try:
            html = httpx.get(DIRETO, headers={"User-Agent": UA}, timeout=20).raise_for_status().text
        except Exception as e:                  # um soluço não pára o ciclo: a ronda seguinte tenta
            print(f"a Jogos do Dia não respondeu: {e}", file=sys.stderr)
            print("a_decorrer=0\npor_vir=0\nacabaram=0\nmudou=0\nfalhou=1")
            return 0
    hoje = a.hoje or datetime.now(LISBOA).date().isoformat()
    ficheiro = destino / "agenda.json"
    dados = json.loads(ficheiro.read_text(encoding="utf-8"))
    mudados: list[dict] = []
    contas = aplicar(dados["jogos"], jogos_do_dia(html), hoje, mudados)
    if contas["mudou"]:
        ficheiro.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
        # o mesmo resultado no ficheiro da prova, que é o que a página da equipa lê — com a
        # marca de "a decorrer", para a tabela não o contar como final
        from .cli import _actualizar_calendario
        for j in mudados:
            _actualizar_calendario(destino, j, j["gc"], j["gf"], bool(j.get("ao_vivo")))
    for k, v in contas.items():
        print(f"{k}={v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
