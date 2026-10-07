#!/usr/bin/env python3
"""Gera os ícones da PWA. Provisórios — o ícone a sério é o L7.3, na fase de lançamento.

    uv run --with pillow python scripts/gerar_icones.py
"""
import pathlib

from PIL import Image, ImageDraw

#: Amarelo torrado, escolhido pelo dono a 07/10/2026 — `#c8860d`.
#:
#: Medido antes de escolher: o stick branco sobre esta cor dá **3,06:1** de contraste, acima
#: do mínimo de 3:1 que se exige a elementos gráficos. Os tons mais claros de mostarda
#: (`#d4a017`, 2,38) ficavam abaixo e o desenho perdia-se no ecrã principal.
#:
#: **Só o ícone muda de cor.** O verde continua a ser o acento da interface, e isso foi
#: decisão com número à frente: nenhum amarelo passa os 4,5:1 exigidos a texto nos dois temas
#: com um valor só — o torrado dá 3,06 no claro.
TORRADO = (200, 134, 13)
BRANCO = (255, 255, 255)
DESTINO = pathlib.Path(__file__).resolve().parent.parent / "web" / "static" / "icones"


def desenhar(lado: int, margem: float) -> Image.Image:
    """`margem` maior = conteúdo mais ao centro, para o recorte dos ícones maskable."""
    escala = 4
    n = lado * escala
    img = Image.new("RGBA", (n, n), TORRADO)
    d = ImageDraw.Draw(img)
    m = int(n * margem)
    util = n - 2 * m

    # stick: uma diagonal grossa com a lâmina virada para a bola
    largura = int(util * 0.13)
    d.line([(m + util * 0.20, m + util * 0.08), (m + util * 0.52, m + util * 0.66)],
           fill=BRANCO, width=largura, joint="curve")
    d.line([(m + util * 0.52, m + util * 0.66), (m + util * 0.80, m + util * 0.62)],
           fill=BRANCO, width=largura, joint="curve")

    # bola
    r = int(util * 0.15)
    cx, cy = m + util * 0.30, m + util * 0.84
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BRANCO)

    return img.resize((lado, lado), Image.LANCZOS)


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    for lado in (192, 512):
        desenhar(lado, 0.14).save(DESTINO / f"icone-{lado}.png")
    # maskable: o sistema recorta um círculo, por isso o conteúdo recua para a zona segura
    desenhar(512, 0.26).save(DESTINO / "icone-maskable-512.png")
    for f in sorted(DESTINO.iterdir()):
        print(f"  {f.name}: {f.stat().st_size} bytes")


if __name__ == "__main__":
    main()
