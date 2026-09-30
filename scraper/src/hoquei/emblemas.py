"""Emblemas dos clubes: descarregar uma vez, encolher, e servir da nossa origem.

Os PNG da fonte têm em média 22,8 KB e são mostrados a 24–32 px. Apontar a app
diretamente para lá teria dois problemas: punha o servidor da associação a servir o
tráfego de imagens de todas as visitas, e um ecrã com 20 emblemas passaria ~450 KB de
pixels que ninguém vê. Encolhidos para 96 px em WebP ficam na ordem de 1–3 KB cada.

Incremental pela mesma razão que as fichas: um emblema já convertido não se volta a buscar.
"""
from __future__ import annotations

import io
import pathlib
import re

from PIL import Image

# Mostramos a 24–32 px, logo 64 px cobre densidade dupla com folga. Medido: a 96 px
# ficavam 4,3 KB cada e a 64 px ficam ~2 KB, para uma diferença que não se vê no ecrã.
LADO = 64


def id_do_logo(url: str | None) -> str | None:
    """`.../intranet/logos/8.png` → `8`. A fonte dá uns absolutos e outros relativos."""
    if not url:
        return None
    m = re.search(r"/logos/([\w-]+)\.\w+$", url)
    return m.group(1) if m else None


def caminho_publico(id_logo: str) -> str:
    return f"/emblemas/{id_logo}.webp"


def converter(bruto: bytes) -> bytes:
    """Encaixa o emblema num quadrado transparente, sem cortar nem distorcer."""
    img = Image.open(io.BytesIO(bruto))
    img = img.convert("RGBA")
    img.thumbnail((LADO, LADO), Image.LANCZOS)
    quadro = Image.new("RGBA", (LADO, LADO), (0, 0, 0, 0))
    quadro.paste(img, ((LADO - img.width) // 2, (LADO - img.height) // 2), img)
    saida = io.BytesIO()
    quadro.save(saida, format="WEBP", quality=82, method=6)
    return saida.getvalue()


def garantir(ids_e_urls: dict[str, str], destino: pathlib.Path, buscar) -> tuple[int, int]:
    """Converte os que faltam. `buscar(url) -> bytes`. Devolve (novos, já existentes)."""
    destino.mkdir(parents=True, exist_ok=True)
    novos = existentes = 0
    for id_logo, url in sorted(ids_e_urls.items()):
        alvo = destino / f"{id_logo}.webp"
        if alvo.exists():
            existentes += 1
            continue
        try:
            alvo.write_bytes(converter(buscar(url)))
            novos += 1
        except Exception as e:                    # um emblema em falta não pára a publicação
            print(f"aviso: emblema {id_logo} falhou ({e})")
    return novos, existentes
