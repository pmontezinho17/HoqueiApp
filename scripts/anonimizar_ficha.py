#!/usr/bin/env python3
"""Anonimiza uma ficha de jogo para poder ser versionada num repositório público.

As fichas de escalões de formação trazem nomes completos de crianças. Para testar o parser
o nome não interessa — só a estrutura. Este script troca cada nome por um pseudónimo estável.

**O boletim (`#acta`) deixou de ser removido — passou a ser anonimizado** (10/10/2026).
Antes era cortado por ser o bloco com mais dados pessoais e por nenhum teste o usar; hoje é
de lá que sai a grelha de participação que o Mérito da Formação precisa (ver `merito.py`), e
um parser dessa grelha sem amostra é um parser sem rede. Cortar o bloco protegia os dados e
também apagava a estrutura; trocar os nomes protege os dados e guarda a estrutura.

Corre debaixo do ambiente do scraper (precisa do selectolax):

    cd scraper && uv run python ../scripts/anonimizar_ficha.py \
        --id 8627 --destino ../data-samples/paginas/apl-ficha-escolares-4partes.html

Com `--de-ficheiro` trabalha sobre HTML já descarregado e **não faz pedido nenhum** à fonte.
É o caminho a usar para regerar uma amostra: a regra do projecto é contar os pedidos, e
regerar uma amostra não é razão para ir outra vez ao servidor da associação.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scraper" / "src"))

from hoquei.fonte import Fonte, descodificar       # noqa: E402
from hoquei.parsers.boletim import boletim          # noqa: E402
from hoquei.parsers.jogo import equipas_ficha, cronologia  # noqa: E402
from hoquei.parsers.participacao import participacao  # noqa: E402


def nomes_de_pessoas(html: str) -> list[str]:
    """Todos os nomes que aparecem na ficha, na cronologia e no boletim.

    O boletim tem gente que a ficha não tem — árbitros, cronometrista, delegados,
    treinadores, massagista — e por isso é lido à parte. Quando faltava, sobravam nomes
    reais num ficheiro versionado num repositório público.
    """
    nomes: set[str] = set()
    for equipa in equipas_ficha(html):
        for j in equipa.jogadores:
            if j.nome:
                nomes.add(j.nome)
    for e in cronologia(html):
        for n in (e.jogador, e.assistencia):
            if n:
                nomes.add(n)
    if (b := boletim(html)) is not None:
        nomes.update(v for v in b.oficiais.values() if v)
        nomes.update(n for n in (b.capitao_casa, b.capitao_fora) if n)
    if (p := participacao(html)) is not None:
        nomes.update(a.nome for lado in p for a in lado if a.nome)
    nomes.update(_equipa_tecnica(html))
    # os mais longos primeiro, senão um nome curto parte um nome longo que o contenha
    return sorted(nomes, key=len, reverse=True)


#: As linhas da equipa técnica no boletim (`Delegado`, `Treinador`, …) não passam pelo
#: parser de atletas, e o nome está na célula a seguir à licença. Lê-se à bruta porque é
#: um script de uma só utilidade e o que importa é não deixar escapar um nome.
_LINHA_DE_PESSOAL = re.compile(
    r"\*{3,}\s*</td>\s*<td[^>]*>\s*([A-Z\u00c0-\u00dc][A-Z\u00c0-\u00dc\'\s]{4,40}?)\s*</td>",
    re.IGNORECASE)


def _equipa_tecnica(html: str) -> set[str]:
    cruas = {m.group(1) for m in _LINHA_DE_PESSOAL.finditer(html)}
    return {re.sub(r"\s+", " ", n).strip() for n in cruas if len(n.split()) >= 2}


def anonimizar(bruto: bytes, nomes: list[str]) -> bytes:
    """Troca cada nome por um pseudónimo estável, **sem cortar o boletim**.

    A ordem importa: os nomes chegam do mais longo para o mais curto, senão "ANA" parte
    "ANA CATARINA NOBRE" pelo meio e sobra um nome meio real no ficheiro.
    """
    texto = bruto.decode("cp1252")
    for i, nome in enumerate(nomes, 1):
        pseudo = f"JOGADOR {i:02d}"
        # o HTML tem os nomes tal como o parser os lê, mas também com &nbsp; à mistura
        texto = texto.replace(nome, pseudo)
        texto = texto.replace(nome.replace(" ", "&nbsp;"), pseudo)
    return texto.encode("cp1252", errors="replace")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--tenant", default="aplisboa")
    p.add_argument("--id", type=int)
    p.add_argument("--de-ficheiro", help="HTML já descarregado; não faz pedido à fonte")
    p.add_argument("--equipa", action="append", default=[], metavar="REAL=FICTICIA",
                   help="troca também um nome de equipa; repetível")
    p.add_argument("--destino", required=True)
    args = p.parse_args()

    if args.de_ficheiro:
        bruto = pathlib.Path(args.de_ficheiro).read_bytes()
        html = descodificar("partido.asp", bruto)
    elif args.id:
        with Fonte(args.tenant) as fonte:
            r = fonte.jogo(args.id)
        bruto, html = r.bruto, r.html
    else:
        print("ERRO: dá --id ou --de-ficheiro", file=sys.stderr)
        return 2

    nomes = nomes_de_pessoas(html)
    saida = anonimizar(bruto, nomes)
    # Os clubes são públicos e normalmente ficam. Mas num boletim de formação ficam a
    # amarrar o ficheiro a um jogo concreto, e aí o pseudónimo deixa de chegar: quem tenha o
    # boletim verdadeiro junta o número da camisola ao clube e à data e chega à criança. Com
    # as equipas trocadas, a amostra deixa de ser dados pessoais pseudonimizados e passa a
    # ser estrutura.
    for par in args.equipa:
        real, _, ficticia = par.partition("=")
        saida = saida.decode("cp1252").replace(real, ficticia).encode("cp1252", errors="replace")

    restantes = [n for n in nomes if n in saida.decode("cp1252")]
    if restantes:
        print(f"ERRO: {len(restantes)} nomes sobreviveram: {restantes[:3]}", file=sys.stderr)
        return 1

    pathlib.Path(args.destino).write_bytes(saida)
    print(f"{args.destino}: {len(saida)} bytes, {len(nomes)} nomes substituídos "
          f"(original tinha {len(bruto)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
