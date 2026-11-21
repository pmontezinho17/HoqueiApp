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


from .inquilinos import prefixo


def chave_do_emblema(id_logo: str, tenant: str) -> str:
    """O nome do ficheiro do emblema na nossa origem.

    **Cada fonte numera os seus emblemas, e os números repetem-se.** A APL e a FPP correm o
    mesmo programa com bases de dados separadas: os 31 emblemas da APL publicados a
    12/11/2026 são `0.webp` a `9x.webp`, e os da FPP começam também nos números pequenos. Sem
    prefixo, o emblema de um clube do Placard substituía o de um clube da APL com o mesmo
    número, e os dois ecrãs mostravam o errado.

    A APL fica sem prefixo porque os caminhos dela já estão no contrato `/v1` que os
    telemóveis têm em cache. As outras fontes ganham o nome à frente: `fpp-12`.
    """
    return f"{prefixo(tenant)}{id_logo}"


#: **Equipas a que a fonte deu o emblema de outro clube**, e o clube cujo emblema é o delas.
#:
#: No torneio Zeca Pinto de 2026/27 a APL inscreveu o `CD MAFRA (B)`, o `HC TURQUEL (B)` e o
#: `HC TURQUEL (E)` seguidos (ids 1826, 1827 e 1828) e as três com o emblema do Mafra. O dono
#: confirmou a 17/11/2026: *"o Turquel é um emblema branco ao contrário do Mafra que é um
#: emblema verde e amarelo"*. Sem isto, o "O Meu Clube" juntava as duas do Turquel ao Mafra,
#: porque agrupa os clubes pelo emblema.
EMBLEMA_DE_OUTRA_EQUIPA: dict[str, dict[str, str]] = {
    "aplisboa": {
        "HC TURQUEL (B)": "HC TURQUEL",
        "HC TURQUEL (E)": "HC TURQUEL",
    },
}


def corrigir_emblemas(emblemas: dict[str, str], tenant: str) -> dict[str, str]:
    """O mapa nome → emblema com as correcções acima. Uma equipa da lista que não esteja no
    mapa, ou cujo clube não tenha emblema, fica como estava."""
    certo = dict(emblemas)
    for equipa, clube in EMBLEMA_DE_OUTRA_EQUIPA.get(tenant, {}).items():
        if equipa in certo and clube in certo:
            certo[equipa] = certo[clube]
    return certo


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
