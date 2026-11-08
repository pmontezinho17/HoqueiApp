"""Quem esteve em pista em cada período, nos Escolares e Benjamins — a grelha da
tabela do separador Equipas.

Pedido do dono a 07/11/2026, numa sugestão pela app: as fichas destes escalões mostram os
atletas por períodos, e ele quis vê-los na ficha do jogo. Foi um separador próprio, o "Em pista", e no dia seguinte
passou para dentro das Equipas, a pedido dele: separadores a mais. A grelha é a mesma que o Mérito já lê
(`parsers/participacao.py`), do mesmo HTML: **zero pedidos novos** para os jogos que se lêem a
partir de agora. A decisão de a publicar é dele, no mesmo dia — os nomes dos atletas já estão
nas fichas e nos marcadores.

Sai por atleta: o número, o nome, se é guarda-redes, a letra de cada período (`X` jogou, `J`
entrou a meio, vazio não jogou) e os golos de cada período. **A licença nunca sai**: a própria
fonte a esconde.

Os golos por período vêm da cronologia, porque o boletim só dá o total do jogo. Medido a
07/11/2026 nas 109 fichas com Mérito: os 1 359 golos com marcador batem todos num atleta do
plantel pela equipa e pelo nome, e os 109 jogos têm as quatro partes de 8:00 que fazem de cada
"parte" da cronologia um período da grelha. Num jogo com outra forma os golos ficam `None` em
vez de se adivinharem — a grelha mostra-se na mesma.
"""

from __future__ import annotations

from .parsers.participacao import AtletaBoletim, participacao

#: as quatro partes de 8 minutos — o 87.º 7.1, e a forma dos 109 jogos medidos
PERIODOS = 4
_DURACAO_DO_PERIODO = "8:00"


def _quatro_periodos(cronologia: list[dict]) -> bool:
    inicios = [e for e in cronologia if e.get("tipo") == "inicio_parte"]
    return (len(inicios) == PERIODOS
            and all(e.get("relogio") == _DURACAO_DO_PERIODO for e in inicios)
            and [e.get("parte") for e in inicios] == list(range(1, PERIODOS + 1)))


def _golos_por_periodo(cronologia: list[dict], equipa: str | None) -> dict[str, list[int]]:
    """{nome: [golos no 1º, 2º, 3º, 4º]} de uma equipa. Sem o desempate por penáltis (`PTY`),
    que não é de período nenhum."""
    por: dict[str, list[int]] = {}
    for e in cronologia:
        if (e.get("tipo") != "golo" or e.get("equipa") != equipa or not e.get("jogador")
                or e.get("relogio") == "PTY"):
            continue
        parte = e.get("parte")
        if isinstance(parte, int) and 1 <= parte <= PERIODOS:
            por.setdefault(e["jogador"], [0] * PERIODOS)[parte - 1] += 1
    return por


def _atleta(a: AtletaBoletim, golos: dict[str, list[int]] | None) -> dict:
    return {
        "numero": a.numero,
        "nome": a.nome,
        "gr": a.posicao == "GR",
        "marcas": list(a.marcas),
        "golos": (golos.get(a.nome, [0] * PERIODOS) if golos is not None else None),
    }


def em_pista(html: str, dados: dict) -> list[dict] | None:
    """As duas equipas, casa primeiro, ou `None` quando o boletim ainda não está lá.

    `None` guarda-se como `None`, e isso é diferente de não haver chave — a mesma distinção do
    Mérito, ver `_merito_da_ficha` no `cli.py`.
    """
    lido = participacao(html)
    if lido is None:
        return None
    cronologia = dados.get("cronologia") or []
    com_golos = _quatro_periodos(cronologia)
    saida = []
    for equipa, atletas in zip((dados.get("casa"), dados.get("fora")), lido):
        golos = _golos_por_periodo(cronologia, equipa) if com_golos else None
        saida.append({"equipa": equipa, "atletas": [_atleta(a, golos) for a in atletas]})
    return saida
