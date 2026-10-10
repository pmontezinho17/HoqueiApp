"""Quem jogou que período, lido do boletim oficial (`#acta`) — e nunca publicado.

O que isto resolve, e porque é que não existia antes: o Artigo 92.º do regulamento da APL
manda pontuar o **Mérito da Formação** dos Escolares e dos Benjamins a partir de coisas que
só o boletim sabe — quantos atletas jogaram, se a equipa levou dois guarda-redes, e em que
meias partes cada um entrou. Até 10/10/2026 a avaliação deste projecto era que esses dados
não eram publicados e viviam só na "Folha de Controlo de Jogo" em papel. **Estava errada.**
Estão no `#acta` da mesma página que já descarregamos para cada ficha, na grelha `5I`.

Custo de os usar: **zero pedidos novos à fonte** — é o mesmo HTML, já pago.

**Nada do que sai daqui é publicado.** São dados pessoais de crianças: que período é que o
filho de alguém jogou. O `merito.py` lê isto e devolve só o agregado da *equipa*; o
`test_privacidade.py` percorre os ficheiros publicados e falha se algum trouxer a grelha.
A própria fonte já esconde as licenças (`******`) e a nossa amostra em `data-samples` tem o
boletim cortado com um comentário a dizer exactamente isto.

### A grelha

As colunas `1ª 2ª 3ª 4ª` vivem debaixo do cabeçalho `5I` (cinco inicial) e marcam, com um
`X`, as **meias partes** em que o atleta entrou. São quatro porque o Artigo 87.º ponto 7.1
parte o jogo de Escolares e Benjamins em duas partes de 16 minutos, cada uma subdividida em
dois períodos de 8 — e o ponto 7.4 obriga cada atleta a fazer uma meia parte inteira de cada
parte. Daí o desenho: 10 atletas × 2 meias partes = 20 = 4 meias partes × 5 em pista. É por
isso que, nestes escalões, o cinco inicial de cada meia parte **é** o registo de participação:
quem entra faz a meia parte toda (7.4.3), e quem substitui conta como se a tivesse feito
inteira (7.6).
"""

from __future__ import annotations

from dataclasses import dataclass

from selectolax.parser import HTMLParser, Node

from .boletim import _celulas, _numero

#: a coluna a seguir ao nome: guarda-redes ou jogador de campo. As linhas da equipa técnica
#: (Delegado, Treinador, Médico…) trazem o papel por extenso e é assim que ficam de fora.
POSICOES = ("GR", "JC")

#: índices das células numa linha de atleta, medidos num boletim de Escolares a 10/10/2026 e
#: fixos em `test_participacao.py`. (Sem o número do jogo de propósito: a amostra versionada
#: tem os clubes trocados precisamente para não se poder voltar ao jogo real.)
#: A linha tem 19 células para 21 colunas, porque o nome traz
#: `colspan=3`: licença(0) nome(1) posição(2) cap.(3) nº(4) | 1ª-4ª(5-8) | amarelo(9) |
#: suspensões(10-12) | expulsões(13-14) | golos t.normal/prol./g.p./total(15-18)
_PERIODOS = (5, 6, 7, 8)
_TOTAL_DE_GOLOS = 18
_CELULAS_MINIMAS = 19


@dataclass(frozen=True)
class AtletaBoletim:
    """Uma linha de atleta do boletim. **Não vai para lado nenhum publicado.**"""
    nome: str
    #: "GR" ou "JC"
    posicao: str
    numero: str | None
    #: as quatro meias partes, por ordem; `True` onde a mesa pôs o `X`
    periodos: tuple[bool, bool, bool, bool]
    golos: int

    @property
    def participou(self) -> bool:
        return any(self.periodos)

    @property
    def meias_partes(self) -> int:
        return sum(self.periodos)

    @property
    def tres_seguidas(self) -> bool:
        """Três meias partes consecutivas: `1-2-3` ou `2-3-4`."""
        p = self.periodos
        return (p[0] and p[1] and p[2]) or (p[1] and p[2] and p[3])

    @property
    def todas(self) -> bool:
        return all(self.periodos)


def _atletas(tabela: Node) -> list[AtletaBoletim]:
    saida: list[AtletaBoletim] = []
    for tr in tabela.css("tr"):
        c = _celulas(tr)
        if len(c) < _CELULAS_MINIMAS or c[2] not in POSICOES or not c[1]:
            continue
        saida.append(AtletaBoletim(
            nome=c[1],
            posicao=c[2],
            numero=c[4] or None,
            # qualquer marca conta, e não só o `X`: a marca é da mesa e não do sistema,
            # e falhar uma participação por causa de um `x` minúsculo dava uma penalização
            # inventada a uma equipa que não fez nada de errado
            periodos=tuple(bool(c[i]) for i in _PERIODOS),  # type: ignore[arg-type]
            golos=_numero(c[_TOTAL_DE_GOLOS]) or 0,
        ))
    return saida


def participacao(html: str) -> tuple[list[AtletaBoletim], list[AtletaBoletim]] | None:
    """(visitada, visitante), ou `None` quando o boletim não está lá.

    `None` e `([], [])` são coisas diferentes e quem consome tem de as distinguir: a
    primeira é "o jogo ainda não fechou" — o boletim só aparece minutos depois do apito —
    e a segunda seria uma equipa sem atletas, que é uma falta de comparência.
    """
    acta = HTMLParser(html).css_first("#acta")
    if acta is None:
        return None
    tabelas = acta.css("table")
    if len(tabelas) < 4:
        return None
    casa, fora = _atletas(tabelas[2]), _atletas(tabelas[3])
    if not casa and not fora:
        return None
    return casa, fora
