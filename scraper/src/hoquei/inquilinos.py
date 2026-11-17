"""As fontes de dados — "inquilinos" da plataforma — e o que muda de uma para a outra.

A APL e a FPP correm o mesmo programa em instalações separadas (`docs/11-ligas-nacionais.md`).
Cada uma numera os seus jogos e os seus emblemas, e os números repetem-se: o jogo 18262 da FPP
pode um dia existir na APL. **A APL fica sem prefixo** porque os caminhos dela — `/jogo/9644`,
`/emblemas/6.webp`, os UID dos calendários que já estão subscritos — são públicos desde 30/09
e estão em cache nos telemóveis. As outras fontes ganham o nome à frente.
"""
from __future__ import annotations

#: A fonte que já estava publicada antes de haver uma segunda.
ORIGINAL = "aplisboa"

#: O nome por extenso, para as frases que dizem de onde vêm os dados.
NOMES = {
    "aplisboa": "Associação de Patinagem de Lisboa",
    "fpp": "Federação de Patinagem de Portugal",
}


#: **O nome com que cada categoria da fonte aparece na app.** A FPP chama às divisões
#: `CAMPEONATO NACIONAL 2ª DIVISAO`, sem acento e com o nome da prova lá dentro: num cartão de
#: 375 px eram quatro linhas, e numa página de equipa repetia o que o título da prova já diz. A
#: tradução acontece **à entrada**, antes de qualquer ficheiro ser escrito, para todos os ecrãs —
#: e os slugs, os `grupo_id` e os calendários — verem o mesmo nome. O filtro `--categorias`
#: continua a usar o nome da fonte, que é o que não muda de época para época.
CATEGORIAS: dict[str, dict[str, str]] = {
    "fpp": {
        "CAMPEONATO NACIONAL 1ª DIVISAO": "1.ª DIVISÃO",
        "CAMPEONATO NACIONAL 2ª DIVISAO": "2.ª DIVISÃO",
        "CAMPEONATO NACIONAL 3ª DIVISAO": "3.ª DIVISÃO",
    },
}


def categoria_publicada(tenant: str, categoria: str) -> str:
    """O nome da categoria na app. Uma que não esteja na lista fica como a fonte a dá."""
    return CATEGORIAS.get(tenant, {}).get(categoria.strip().upper(), categoria)


def prefixo(tenant: str) -> str:
    """`""` para a APL, `"fpp-"` para a FPP. Antecede ids de jogo e de emblema."""
    return "" if tenant == ORIGINAL else f"{tenant}-"


def nome(tenant: str) -> str:
    return NOMES.get(tenant, tenant)
