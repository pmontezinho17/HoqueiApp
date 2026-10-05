#!/usr/bin/env python3
"""
Gera os crachás de escalão em SVG.

Porque é um gerador e não onze ficheiros escritos à mão: as medidas são todas a mesma
geometria — o disco, o aro, o anel fino, a altura do ícone, a linha de base do texto — e
uma constante que mude tem de mudar nos onze. Acrescentar um escalão novo é acrescentar
uma linha ao dicionário `ESCALOES` e voltar a correr isto.

As proporções não foram inventadas: foram medidas nos mock-ups que o Pedro desenhou
(`docs/` não os guarda; os PNG recortados ficaram em `web/static/escaloes/*.png`). O perfil
radial de um crachá deu o disco de cor a acabar em 93.9% do raio, o anel fino branco entre
86.5% e 89.5%, o ícone entre -74.8 e -40.1, e as linhas de base do texto onde estão aqui.

O desenho é vectorial e **sem** a textura de papel nem a sombra do mock-up: a 24px numa
lista isso só suja, e numa lista é onde estes vão viver.

    uv run --no-project python scripts/gerar_escaloes.py
"""
from pathlib import Path

DESTINO = Path(__file__).resolve().parent.parent / "web" / "static" / "escaloes"

# ─── geometria, em unidades de raio (o viewBox é -100 -100 200 200) ──────────────────
R_FORA = 100.0      # o aro branco, que é o bordo do crachá
R_COR = 93.9        # onde a cor começa
R_ANEL = 88.0       # o anel fino branco, pelo meio do traço
ESP_ANEL = 3.0

ICONE_LARG, ICONE_ALT = 48.6, 34.7
ICONE_TOPO = -74.8

# linha de base e largura alvo de cada estilo de texto, medidas nos mock-ups
BASE_LETRA, ALT_LETRA = 30.1, 60.4          # o B dos benjamins, o E dos escolares
BASE_LARGA, LARG_LARGA = 16.6, 148.7        # SUB-13, BAMBIS
BASE_PEQUENA, LARG_PEQUENA = 10.8, 158.5    # SENIORES, TORNEIOS
R_ARCO, TAM_ARCO = 77.0, 23.0               # a palavra que curva em baixo
ESPACO_ARCO = 0.15                          # o arco é espaçado, como nos mock-ups

# A fonte é a do sistema, a mesma do resto da aplicação. Não há cá fonte descarregada: a
# política de privacidade promete nada de terceiros, e isso vale para um ficheiro de letras
# tanto como para um script. O preço é as letras mudarem de feitio entre um iPhone e um
# Android; o `textLength` abaixo garante que a largura não muda, que é o que parte o desenho.
FONTE = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'

# Larguras aproximadas das maiúsculas de uma gorda geométrica, em em. Servem só para
# escolher o corpo de letra de cada palavra — a largura final é fixada pelo `textLength`.
AVANCO = {
    "A": .70, "B": .68, "C": .70, "D": .72, "E": .62, "F": .60, "G": .74, "H": .74,
    "I": .30, "J": .56, "K": .68, "L": .58, "M": .88, "N": .76, "O": .78, "P": .66,
    "Q": .78, "R": .68, "S": .66, "T": .62, "U": .74, "V": .68, "W": 1.0, "X": .68,
    "Y": .66, "Z": .62, "-": .36, " ": .32,
}
EM = lambda t: sum(AVANCO.get(c, .60) for c in t)

ICONE = "M4.6 34.6C4.6 34.5 4.4 34.5 4.2 34.5C2.9 34.5 0.7 32.8 0.4 31.5C0.4 31.3 0.3 31.1 0.2 31.0C-0.0 30.8 -0.1 28.2 0.1 28.2C0.2 28.2 0.3 28.0 0.3 27.8C0.8 26.7 1.8 26.4 2.7 26.9C3.3 27.3 3.4 27.6 3.4 28.8C3.4 29.7 3.4 29.8 3.7 30.1C4.6 30.9 6.1 31.0 7.3 30.4C8.1 30.0 10.0 28.2 10.6 27.3C10.7 27.1 11.0 26.8 11.1 26.7C11.3 26.5 11.6 26.1 11.8 25.9C11.9 25.6 12.1 25.4 12.2 25.4C12.2 25.4 12.3 25.2 12.5 25.0C12.6 24.8 12.8 24.5 12.9 24.4C13.1 24.2 13.3 23.9 13.4 23.7C13.5 23.5 13.7 23.3 13.7 23.3C13.8 23.3 14.0 23.1 14.2 22.8C14.4 22.4 14.6 22.2 14.6 22.2C14.7 22.2 14.8 22.0 14.9 21.8C15.1 21.6 15.3 21.3 15.4 21.1C15.5 21.0 15.8 20.7 15.9 20.5C16.0 20.3 16.1 20.1 16.2 20.1C16.3 20.1 16.4 19.9 16.5 19.7C16.6 19.5 16.9 19.2 17.0 19.1C17.1 18.9 17.3 18.6 17.5 18.4C17.6 18.2 17.7 18.0 17.8 18.0C17.8 18.0 18.0 17.9 18.1 17.7C18.2 17.5 18.4 17.2 18.6 17.0C18.7 16.9 18.9 16.6 19.0 16.3C19.2 16.1 19.3 16.0 19.4 16.0C19.4 16.0 19.6 15.8 19.7 15.6C19.8 15.3 20.0 15.1 20.1 15.0C20.1 14.9 20.3 14.7 20.5 14.5C20.6 14.3 20.8 14.0 20.9 13.9C21.0 13.9 21.1 13.6 21.3 13.4C21.4 13.2 21.5 13.0 21.6 13.0C21.7 13.0 21.8 12.8 21.9 12.6C22.0 12.4 22.3 12.1 22.4 12.0C22.5 11.8 22.8 11.4 23.1 11.0C23.3 10.6 23.6 10.2 23.6 10.2C23.7 10.2 23.8 10.0 24.0 9.8C24.1 9.6 24.3 9.4 24.3 9.3C24.4 9.2 24.6 9.0 24.7 8.7C24.9 8.5 25.1 8.3 25.1 8.3C25.1 8.2 25.3 8.0 25.4 7.8C25.6 7.6 25.7 7.4 25.8 7.4C25.8 7.3 26.0 7.1 26.1 6.9C26.3 6.7 26.4 6.4 26.5 6.4C26.6 6.3 26.8 6.0 26.9 5.8C27.0 5.6 27.2 5.4 27.2 5.4C27.3 5.4 27.4 5.2 27.6 5.0C27.7 4.8 27.9 4.5 27.9 4.4C28.0 4.4 28.2 4.1 28.3 3.9C28.5 3.7 28.7 3.5 28.7 3.4C28.7 3.4 28.9 3.2 29.0 3.0C29.2 2.8 29.3 2.6 29.4 2.5C29.5 2.4 30.1 1.4 30.5 0.7L30.8 0.0L31.4 0.0C31.9 0.0 31.9 0.0 32.0 0.4C32.2 0.7 32.1 0.8 31.8 1.5C31.6 1.9 31.3 2.4 31.2 2.5C31.0 2.7 30.8 3.0 30.7 3.2C30.6 3.4 30.4 3.6 30.4 3.6C30.3 3.6 30.1 3.8 29.9 4.1C29.7 4.5 29.5 4.7 29.5 4.7C29.4 4.7 29.1 5.2 28.7 5.8C28.3 6.4 27.9 7.0 27.8 7.1C27.8 7.1 27.2 8.0 26.6 9.0C25.9 9.9 25.4 10.8 25.3 10.8C25.3 10.8 25.0 11.2 24.7 11.6C24.5 12.0 24.2 12.4 24.1 12.5C24.0 12.7 23.7 13.0 23.5 13.4C23.3 13.7 23.0 14.3 22.8 14.7C22.6 15.0 22.4 15.4 22.3 15.5C22.2 15.6 21.7 16.3 21.2 17.1C20.6 17.9 20.2 18.6 20.1 18.6C20.1 18.6 19.7 19.2 19.4 19.8C19.0 20.4 18.6 20.9 18.6 20.9C18.5 20.9 17.9 21.9 17.1 23.1C16.3 24.3 15.6 25.3 15.5 25.4C15.4 25.5 15.1 26.0 14.9 26.4C14.7 26.8 14.4 27.2 14.3 27.4C14.1 27.5 14.0 27.8 13.9 28.0C13.7 28.4 12.2 30.7 12.0 30.8C12.0 30.8 11.8 31.0 11.7 31.3C11.5 31.5 11.2 31.9 10.8 32.1C10.5 32.4 10.2 32.6 10.1 32.7C9.4 33.5 7.3 34.5 6.6 34.5C6.4 34.5 6.2 34.5 6.2 34.6C6.2 34.7 5.9 34.7 5.4 34.7C5.0 34.7 4.6 34.7 4.6 34.6ZM17.4 34.3C16.6 34.0 15.5 32.8 15.5 32.2C15.5 32.1 15.5 31.8 15.4 31.6C15.2 31.2 15.5 30.2 15.9 29.7C16.1 29.6 16.3 29.3 16.4 29.2C16.6 28.6 17.9 28.3 18.8 28.7C19.5 28.9 20.5 30.1 20.8 30.9C20.9 31.3 20.9 31.4 20.8 31.9C20.5 32.6 20.2 33.2 19.9 33.5C19.5 33.9 19.5 33.6 19.9 33.0C20.2 32.5 20.2 32.3 20.2 31.8C20.2 31.4 20.2 31.1 20.1 31.1C20.1 31.1 20.0 31.3 20.0 31.5C20.0 32.0 19.6 33.0 19.2 33.4C19.0 33.6 19.0 33.7 19.1 33.8C19.4 33.9 19.2 34.1 18.6 34.3C17.9 34.4 17.7 34.5 17.4 34.3ZM35.3 33.8C34.4 33.2 34.1 31.7 34.7 30.5C34.9 30.1 35.1 29.8 35.2 29.8C35.3 29.7 35.5 29.6 35.6 29.5C36.3 29.2 37.4 29.6 37.8 30.3C38.0 30.7 38.0 31.0 38.0 31.7C38.0 32.8 37.8 33.2 37.3 33.7C36.8 34.1 35.9 34.1 35.3 33.8ZM45.4 32.9C45.1 32.7 44.8 32.4 44.7 32.2C44.5 31.8 44.5 30.8 44.8 30.4C45.2 29.6 46.7 29.2 47.5 29.5C47.8 29.7 48.4 30.5 48.4 30.7C48.4 30.8 48.4 30.9 48.5 30.9C48.5 30.9 48.6 31.1 48.6 31.3C48.6 31.4 48.5 31.6 48.5 31.6C48.4 31.6 48.4 31.7 48.4 31.8C48.4 32.1 47.9 32.8 47.5 33.1C46.8 33.5 46.2 33.4 45.4 32.9ZM36.8 32.3C37.0 32.1 37.1 31.9 37.1 31.8C37.1 31.6 36.6 31.0 36.3 31.0C36.1 31.0 35.6 31.6 35.6 31.8C35.6 32.0 36.1 32.6 36.3 32.6C36.4 32.6 36.7 32.5 36.8 32.3ZM42.6 32.3C42.1 32.0 42.0 31.5 41.9 29.7C41.8 28.2 41.5 28.0 40.5 28.5C40.1 28.7 39.9 28.7 39.3 28.7C38.5 28.6 37.9 28.5 37.6 28.4C37.2 28.3 39.1 28.0 41.6 27.8C43.8 27.7 44.5 27.5 44.2 27.3C44.2 27.2 44.1 27.0 44.1 26.8C44.1 26.2 43.8 25.8 43.5 25.9C43.4 25.9 43.0 25.9 42.6 25.9C41.9 26.0 41.7 26.1 40.6 26.6C39.1 27.4 38.2 27.7 37.2 27.8C36.1 28.0 34.9 28.2 35.3 28.3L35.7 28.3L35.3 28.5C34.6 29.0 33.3 30.4 33.0 31.2L32.9 31.5L32.9 31.0C32.9 30.7 32.8 30.4 32.7 30.4C32.6 30.3 32.6 30.4 32.7 30.7C32.8 31.4 32.6 32.0 32.3 32.2C31.5 32.6 30.5 32.3 29.9 31.5C29.6 31.1 29.5 31.0 29.1 31.0C28.5 31.0 28.4 30.7 28.8 30.0C28.9 29.5 29.9 28.7 30.3 28.7C30.5 28.7 30.3 28.5 30.1 28.5C29.8 28.4 29.8 28.4 29.8 27.8C29.8 27.2 29.8 27.2 30.1 27.1C30.7 27.1 30.6 26.9 29.7 26.6C29.5 26.6 29.5 26.4 29.5 25.8L29.4 25.0L29.2 25.5L28.9 26.0L27.9 26.0C27.3 26.0 26.9 26.0 26.9 26.1C26.9 26.1 27.2 26.2 27.6 26.2C28.1 26.2 28.5 26.3 28.7 26.4C29.0 26.5 29.0 26.6 29.0 27.2L29.0 27.7L28.5 27.8C27.9 27.8 27.2 28.0 27.0 28.2C26.8 28.4 26.8 28.6 26.8 29.3C26.8 29.9 26.7 30.2 26.6 30.3C26.5 30.4 25.4 30.3 24.4 30.2C23.2 29.9 23.1 28.5 24.2 27.7C24.4 27.5 24.5 27.4 24.4 27.3C24.3 27.2 24.3 26.9 24.3 26.5L24.4 25.9L25.1 26.0C25.5 26.0 25.8 25.9 25.8 25.9C25.8 25.8 25.6 25.7 25.4 25.7C24.9 25.7 24.3 25.5 24.0 25.3C23.9 25.2 23.9 24.9 23.9 24.3C23.9 23.0 24.2 22.5 25.3 21.9C25.7 21.7 26.1 21.7 26.5 22.1C27.0 22.5 27.1 22.4 26.7 22.0C26.3 21.5 26.4 21.5 26.9 21.0C27.5 20.6 27.6 20.6 28.5 21.3C28.9 21.6 29.3 21.8 29.4 21.8C29.7 21.8 29.7 21.5 29.3 21.1C29.1 20.9 28.9 20.7 28.9 20.7C28.9 20.5 29.8 20.8 30.2 21.1L30.6 21.4L30.8 21.2L31.1 20.9L30.8 20.5C30.6 20.2 30.3 20.0 30.2 19.9C29.7 19.8 29.5 19.7 29.7 19.5C30.0 19.4 30.3 19.4 30.4 19.7C30.5 19.9 30.6 20.0 30.8 20.0C31.0 20.0 31.2 20.1 31.4 20.2C31.7 20.5 32.2 20.5 32.3 20.3C32.4 20.1 32.0 19.7 31.4 19.3C31.2 19.2 31.2 19.2 31.4 19.0C31.7 18.8 31.9 18.8 32.6 19.2C33.1 19.6 33.4 19.6 33.4 19.4C33.5 19.2 33.3 19.0 32.8 18.7C32.6 18.6 32.4 18.4 32.4 18.4C32.4 18.3 32.2 18.2 32.0 18.0L31.6 17.8L31.9 17.5C32.1 17.2 32.1 17.2 32.5 17.4C32.9 17.6 33.6 18.1 33.8 18.4C34.0 18.5 34.1 18.5 34.3 18.3C34.5 18.1 34.4 18.1 34.1 17.8C33.9 17.6 33.5 17.4 33.3 17.3C33.1 17.2 33.0 17.0 33.0 16.9C33.0 16.8 32.9 16.8 32.7 16.8C32.5 16.8 32.4 16.7 32.3 16.7C32.2 16.5 33.0 16.1 33.4 16.1C33.8 16.1 33.9 16.2 33.5 16.4C33.1 16.7 33.3 16.8 34.2 16.8L35.2 16.8L35.5 16.3C35.9 15.6 35.8 15.6 33.5 14.5C33.1 14.4 33.1 14.3 33.1 14.0C33.2 13.9 33.2 12.8 33.3 11.7L33.3 9.8L33.6 9.6C33.9 9.4 34.0 9.5 34.5 9.7C35.7 10.1 36.5 11.1 36.5 12.1C36.5 12.3 36.5 12.6 36.6 12.8C36.7 13.0 36.8 13.2 36.8 13.3C36.7 13.5 36.8 13.5 37.1 13.5L37.5 13.5L37.6 12.4C37.6 11.7 37.5 11.2 37.5 11.0C37.3 10.7 37.7 10.0 38.3 9.7C39.0 9.2 39.9 9.4 41.4 10.1C42.4 10.6 42.7 11.0 42.8 11.9C43.0 14.0 43.0 14.2 43.8 14.3C44.4 14.4 44.4 14.3 44.4 13.4C44.3 12.4 44.5 11.7 45.1 11.1C45.7 10.5 46.4 10.2 46.9 10.5L47.3 10.7L47.2 13.7C47.2 15.4 47.1 16.8 47.1 17.0C47.0 17.2 47.1 17.4 47.3 17.6C47.7 18.1 47.8 18.4 48.0 19.1C48.1 19.4 48.2 19.7 48.3 19.9C48.3 20.1 48.4 21.0 48.4 21.9C48.4 23.7 48.3 23.8 47.5 23.9C47.3 24.0 46.9 24.1 46.6 24.1C46.3 24.2 45.9 24.3 45.7 24.3C45.1 24.5 43.9 25.0 43.9 25.2C43.9 25.3 43.9 25.3 44.0 25.3C44.1 25.2 45.1 24.9 45.9 24.7C46.1 24.6 46.7 24.6 47.2 24.6L48.1 24.6L48.1 25.3C48.2 26.3 47.8 26.9 47.0 26.9C46.6 26.9 46.9 27.1 47.3 27.1C47.6 27.2 47.6 27.2 47.6 27.5C47.6 28.2 47.4 28.6 47.2 28.8C47.1 29.0 47.0 29.0 46.6 28.7C46.2 28.5 46.1 28.5 45.9 28.6C45.7 28.7 45.6 28.7 45.5 28.6C45.3 28.5 45.2 28.5 45.1 28.5C44.9 28.5 44.3 29.5 44.3 29.8C44.3 29.9 44.1 30.2 43.8 30.4L43.4 30.9L43.4 31.7C43.4 32.5 43.4 32.5 43.2 32.5C43.0 32.5 42.8 32.4 42.6 32.3ZM47.3 32.0C47.5 31.7 47.5 31.1 47.3 30.8C46.9 30.3 45.9 30.6 45.9 31.2C45.9 31.9 46.8 32.4 47.3 32.0ZM27.5 30.9C27.2 30.7 27.2 30.6 27.2 29.7C27.2 28.5 27.3 28.3 28.1 28.3C28.4 28.3 28.7 28.2 28.8 28.2C29.2 27.9 29.4 28.3 29.0 28.8C28.7 29.3 28.4 30.1 28.4 30.4C28.4 30.6 28.1 31.1 27.9 31.1C27.9 31.1 27.7 31.0 27.5 30.9ZM29.8 24.4C29.9 24.2 30.7 23.7 31.0 23.7C31.1 23.7 31.4 23.6 31.7 23.5C32.3 23.3 32.3 23.3 32.8 23.5C33.1 23.7 33.3 23.8 33.4 23.8C33.5 23.8 33.4 23.5 33.2 23.2C32.9 22.9 33.0 22.6 33.2 22.6C33.3 22.6 33.6 22.8 33.9 23.0C34.5 23.5 34.7 23.5 34.8 23.3C34.8 23.2 34.7 23.0 34.5 22.8C34.3 22.7 34.2 22.5 34.2 22.3C34.2 21.9 34.3 21.8 34.7 22.0C35.0 22.2 35.1 22.2 35.3 22.1C35.4 21.9 35.4 21.9 35.3 21.6C35.0 21.3 35.1 21.2 35.7 21.4C36.6 21.5 36.7 21.3 36.1 20.7L35.8 20.4L35.4 20.8C35.2 21.0 35.0 21.1 34.9 21.1C34.9 21.1 34.6 21.3 34.3 21.5C33.6 22.0 32.4 22.7 31.7 22.9C30.7 23.1 30.4 23.2 30.1 23.3C29.8 23.5 29.5 24.0 29.5 24.4C29.5 24.6 29.7 24.7 29.8 24.4ZM38.4 19.5C38.5 19.3 38.5 19.2 38.1 18.9L37.6 18.5L37.4 18.7C37.2 19.1 37.2 19.1 37.7 19.4C38.2 19.7 38.2 19.7 38.4 19.5ZM40.9 19.3C41.0 19.2 40.4 18.7 39.9 18.4C39.6 18.3 39.3 18.0 39.1 17.8C38.8 17.5 38.8 17.5 39.0 17.4C39.2 17.2 40.3 17.5 40.6 17.9C40.9 18.1 41.3 18.2 41.4 18.1C41.5 17.9 41.1 17.6 40.5 17.2C39.5 16.6 39.5 16.4 40.6 16.3C41.4 16.2 41.6 16.1 41.7 15.9C41.8 15.3 41.4 15.1 40.8 15.5C40.5 15.7 39.8 15.7 39.6 15.4C39.4 15.3 39.4 15.0 39.4 12.7C39.4 11.4 39.3 10.2 39.3 10.2C39.1 10.2 38.9 10.9 39.0 11.3C39.0 11.6 39.0 11.9 39.0 12.1C39.0 12.7 39.0 12.8 39.1 13.6C39.2 14.3 39.0 15.1 38.0 17.6C37.7 18.4 37.7 18.3 38.2 18.4C38.7 18.5 38.8 18.5 39.1 18.5C39.2 18.4 39.4 18.5 39.8 18.9C40.4 19.4 40.7 19.5 40.9 19.3Z"

# ─── os escalões ────────────────────────────────────────────────────────────────────
# `centro` é a palavra grande; `arco` é a que curva em baixo, se houver. As cores dos oito
# primeiros foram tiradas dos mock-ups; as três últimas são novas e seguem a mesma lógica —
# os mais novos em cores quentes, os escalões a subir pelo arco-íris, e o que não é
# competição regular em ardósia.
ESCALOES = {
    "BAMBIS":               ("#EF7D1A", "BAMBIS", None),
    "BENJAMINS":            ("#F5C905", "B", "BENJAMINS"),
    "ESCOLARES":            ("#25B481", "E", "ESCOLARES"),
    "SUB-13":               ("#05A9C6", "SUB-13", None),
    "SUB-15":               ("#203D81", "SUB-15", None),
    "SUB-17":               ("#B92126", "SUB-17", None),
    "SUB-19":               ("#7131CE", "SUB-19", None),
    "SUB-23":               ("#D62E7A", "SUB-23", None),
    "SENIORES FEMININOS":   ("#15A9CA", "SENIORES", "FEMININOS"),
    "SENIORES MASCULINOS":  ("#263441", "SENIORES", "MASCULINOS"),
    "TORNEIOS PARTICULARES":("#64748B", "TORNEIOS", "PARTICULARES"),
}


def slug(texto: str) -> str:
    return texto.lower().replace(" ", "-")


def svg(nome: str, cor: str, centro: str, arco: str | None) -> str:
    p = [
        '<svg xmlns="http://www.w3.org/2000/svg" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="-100 -100 200 200" '
        f'role="img" aria-label="{nome}">',
        f'<title>{nome}</title>',
        f'<circle r="{R_FORA}" fill="#fff"/>',
        f'<circle r="{R_COR}" fill="{cor}"/>',
        f'<circle r="{R_ANEL}" fill="none" stroke="#fff" stroke-width="{ESP_ANEL}"/>',
        f'<g fill="#fff" fill-rule="evenodd" transform="translate({-ICONE_LARG / 2} {ICONE_TOPO})">'
        f'<path d="{ICONE}"/></g>',
    ]
    # a palavra grande
    if len(centro) == 1:
        tam = ALT_LETRA / 0.70
        p.append(
            f'<text x="0" y="{BASE_LETRA}" fill="#fff" text-anchor="middle" '
            f'font-family=\'{FONTE}\' font-weight="700" font-size="{tam:.1f}">{centro}</text>'
        )
    else:
        largo = len(centro) <= 6
        alvo = LARG_LARGA if largo else LARG_PEQUENA
        base = BASE_LARGA if largo else BASE_PEQUENA
        tam = alvo / EM(centro)
        p.append(
            f'<text x="0" y="{base}" fill="#fff" text-anchor="middle" '
            f'font-family=\'{FONTE}\' font-weight="700" font-size="{tam:.1f}" '
            f'textLength="{alvo}">{centro}</text>'
        )
    # a palavra em arco
    if arco:
        # o `letter-spacing` é quem dá o ar espaçado; o `textLength` só o prende, para a
        # palavra ocupar o mesmo arco onde quer que isto seja desenhado. Um motor que
        # ignore o `textLength` num `textPath` — e há-os — fica na mesma com o espaçamento.
        natural = EM(arco) * (1 + ESPACO_ARCO) * TAM_ARCO
        tam = TAM_ARCO * min(1.0, 200.0 / natural)
        comp = min(natural, 200.0)
        p.append(
            f'<path id="arco-{slug(nome)}" fill="none" '
            f'd="M{-R_ARCO} 0A{R_ARCO} {R_ARCO} 0 0 0 {R_ARCO} 0"/>'
            f'<text fill="#fff" font-family=\'{FONTE}\' font-weight="700" '
            f'font-size="{tam:.1f}" letter-spacing="{tam * ESPACO_ARCO:.1f}">'
            # `xlink:href` a dobrar o `href`: o Safari só passou a entender o moderno na
            # versão 16, e um telemóvel de 2019 ficava com a palavra de baixo por desenhar.
            f'<textPath href="#arco-{slug(nome)}" xlink:href="#arco-{slug(nome)}" '
            f'startOffset="50%" text-anchor="middle" '
            f'textLength="{comp:.1f}">{arco}</textPath></text>'
        )
    p.append("</svg>")
    return "".join(p)


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    for nome, (cor, centro, arco) in ESCALOES.items():
        f = DESTINO / f"{slug(nome)}.svg"
        f.write_text(svg(nome, cor, centro, arco), encoding="utf-8")
        print(f"{f.name:28s} {len(f.read_text()) // 1024} KB")


if __name__ == "__main__":
    main()
