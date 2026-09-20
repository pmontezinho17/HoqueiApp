#!/usr/bin/env python3
"""Anonimiza uma ficha de jogo para poder ser versionada num repositório público.

As fichas de escalões de formação trazem nomes completos de crianças. Para testar o parser
o nome não interessa — só a estrutura. Este script troca cada nome por um pseudónimo
estável e remove o boletim oficial (`#acta`), que é o bloco com mais dados pessoais e que
ainda não é usado por nenhum teste.

Corre debaixo do ambiente do scraper (precisa do selectolax):

    cd scraper && uv run python ../scripts/anonimizar_ficha.py \
        --id 8627 --destino ../data-samples/paginas/apl-ficha-escolares-4partes.html
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "scraper" / "src"))

from hoquei.fonte import Fonte                      # noqa: E402
from hoquei.parsers.jogo import equipas_ficha, cronologia  # noqa: E402


def nomes_de_pessoas(html: str) -> list[str]:
    """Todos os nomes que aparecem na ficha e na cronologia."""
    nomes: set[str] = set()
    for equipa in equipas_ficha(html):
        for j in equipa.jogadores:
            if j.nome:
                nomes.add(j.nome)
    for e in cronologia(html):
        for n in (e.jogador, e.assistencia):
            if n:
                nomes.add(n)
    # os mais longos primeiro, senão um nome curto parte um nome longo que o contenha
    return sorted(nomes, key=len, reverse=True)


def anonimizar(bruto: bytes, nomes: list[str]) -> bytes:
    texto = bruto.decode("cp1252")
    for i, nome in enumerate(nomes, 1):
        pseudo = f"JOGADOR {i:02d}"
        # o HTML tem os nomes tal como o parser os lê, mas também com &nbsp; à mistura
        texto = texto.replace(nome, pseudo)
        texto = texto.replace(nome.replace(" ", "&nbsp;"), pseudo)
    # o boletim oficial é o bloco com mais dados pessoais e nenhum teste o usa ainda;
    # o <div> fica, porque delimita o fim da cronologia
    texto = re.sub(r'(<div id="acta"[^>]*>).*?(</div>\s*</div>\s*</body>)',
                   r"\1<!-- removido: boletim oficial, dados pessoais -->\2",
                   texto, flags=re.S)
    return texto.encode("cp1252", errors="replace")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--tenant", default="aplisboa")
    p.add_argument("--id", type=int, required=True)
    p.add_argument("--destino", required=True)
    args = p.parse_args()

    with Fonte(args.tenant) as fonte:
        r = fonte.jogo(args.id)
    nomes = nomes_de_pessoas(r.html)
    saida = anonimizar(r.bruto, nomes)

    restantes = [n for n in nomes if n in saida.decode("cp1252")]
    if restantes:
        print(f"ERRO: {len(restantes)} nomes sobreviveram: {restantes[:3]}", file=sys.stderr)
        return 1

    pathlib.Path(args.destino).write_bytes(saida)
    print(f"{args.destino}: {len(saida)} bytes, {len(nomes)} nomes substituídos "
          f"(original tinha {len(r.bruto)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
