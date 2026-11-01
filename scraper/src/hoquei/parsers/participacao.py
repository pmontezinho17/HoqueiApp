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

### As linhas do banco, e porque é que elas também estão aqui

A mesma tabela continua, depois dos atletas, com as linhas da equipa técnica — Delegado,
Treinador, Massagista — e **elas trazem as colunas de disciplina**: um amarelo, três
suspensões e as duas expulsões, `a.c.` (por acumulação) e `dir.` (directa). É o que o
Artigo 92.º ponto 4.2 precisa, e com a distinção que a ficha não dá: em `#jugadores` um
vermelho a um não atleta é só um `1` na terceira coluna, e o 4.2 desconta -4 ou -6 conforme
tenha sido por acumulação ou directo.

Medido a 12/10/2026 no jogo 9864, onde a ficha publicada diz que o treinador da FSE/AJ
Salesiana levou um vermelho: o boletim tem o `X` na coluna `dir.` — logo -6 e não -4.

**Isto corrige duas avaliações erradas minhas.** A primeira dizia que o 4.2 não era
calculável porque "as colunas de disciplina do boletim são dos atletas"; a segunda, que era
calculável mas só pela ficha, sem separar acumulação de directo. As duas estavam erradas
pela mesma razão: ninguém tinha olhado para uma linha de banco do boletim.
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


def _atletas(tabela: Node, ignorar: frozenset[str] = frozenset()) -> list[AtletaBoletim]:
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
            periodos=tuple(bool(c[i]) and c[i].strip().upper() not in ignorar  # type: ignore[arg-type]
                           for i in _PERIODOS),
            golos=_numero(c[_TOTAL_DE_GOLOS]) or 0,
        ))
    return saida


#: índices das células de disciplina numa linha de banco, medidos a 12/10/2026 e fixos em
#: `test_participacao.py`:
#: licença(0) nome(1) papel(2) | amarelo(3) | suspensões(4-6) | a.c.(7) | dir.(8)
_DISCIPLINA_BANCO = (3, (4, 5, 6), 7, 8)
_CELULAS_BANCO = 9

#: **O que distingue uma linha de banco de uma linha de atleta é o `colspan` do papel**, e
#: não o número de células. Contar células parecia funcionar e não funciona: o boletim de
#: Escolares dá dezenove células a um atleta, o de Seniores dá quinze, e qualquer janela que
#: apanhe as nove de um banco apanha também as quinze de um atleta sénior — media a 12/10/2026
#: e vi o capitão de uma equipa de seniores aparecer como membro do banco com três azuis.
#:
#: O papel tapa as colunas que um não atleta não tem (posição, cap., nº e as meias partes),
#: por isso traz `colspan=7` nos Escolares e `colspan=3` nos Seniores. Num atleta, e no
#: cabeçalho da tabela, essa célula vale uma coluna só.
_COLSPAN_MINIMO_DO_PAPEL = 3


@dataclass(frozen=True)
class NaoAtletaBoletim:
    """Uma linha de banco do boletim: quem era, e que cartões levou.

    Ao contrário do `AtletaBoletim`, isto **não** é dado de uma criança — é a equipa técnica,
    e a ficha de jogo já publica estes nomes e estes cartões. O que o `merito.py` devolve
    continua a ser só o agregado da equipa.
    """
    nome: str
    #: por extenso, como o boletim o escreve: "Delegado", "Treinador", "Enf./Fisiot./Mass."
    papel: str
    amarelo: bool
    #: quantas das três colunas de suspensão estão marcadas — os cartões azuis
    azuis: int
    #: expulsão por acumulação (`a.c.`) e expulsão directa (`dir.`)
    vermelho_acumulacao: bool
    vermelho_directo: bool


def _banco(tabela: Node) -> list[NaoAtletaBoletim]:
    amarelo, suspensoes, acumulacao, directo = _DISCIPLINA_BANCO
    saida: list[NaoAtletaBoletim] = []
    for tr in tabela.css("tr"):
        celulas = tr.css("td,th")
        if len(celulas) < _CELULAS_BANCO:
            continue
        if _colunas(celulas[2]) < _COLSPAN_MINIMO_DO_PAPEL:
            continue
        c = _celulas(tr)
        if not c[1] or not c[2]:
            continue
        saida.append(NaoAtletaBoletim(
            nome=c[1],
            papel=c[2],
            # qualquer marca conta, pela mesma razão que nas meias partes: a marca é da
            # mesa e um `x` minúsculo não pode apagar uma penalização
            amarelo=bool(c[amarelo]),
            azuis=sum(1 for i in suspensoes if c[i]),
            vermelho_acumulacao=bool(c[acumulacao]),
            vermelho_directo=bool(c[directo]),
        ))
    return saida


def _colunas(celula: Node) -> int:
    """Quantas colunas é que esta célula ocupa. Um `colspan` ilegível vale uma."""
    bruto = celula.attributes.get("colspan") or "1"
    return int(bruto) if bruto.isdigit() else 1


def participacao(html: str, ignorar: frozenset[str] = frozenset(),
                 ) -> tuple[list[AtletaBoletim], list[AtletaBoletim]] | None:
    """(visitada, visitante), ou `None` quando o boletim não está lá.

    `ignorar` lê a grelha como se as letras dadas não estivessem lá. Serve para uma só pergunta:
    que regras do Mérito mudam por causa de um `J` — ver `regras_do_j` no `cli.py`.

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
    casa, fora = _atletas(tabelas[2], ignorar), _atletas(tabelas[3], ignorar)
    if not casa and not fora:
        return None
    return casa, fora


def marcas_da_grelha(html: str) -> tuple[dict[str, int], dict[str, int]] | None:
    """(visitada, visitante): quantas vezes aparece cada **letra** na grelha das meias partes.

    O `_atletas` conta qualquer marca como meia parte jogada, e isso fica. Mas a marca não é
    sempre um `X`: a 29/10/2026, ao falar do -3 da AE Física (jogo 9913), quem conhece o
    regulamento disse ao dono que ali *"surgiu um J"* por o atleta ter jogado mais tempo do
    que devia. Uma letra fora do normal é um sinal de que a mesa quis dizer outra coisa, e o
    dono pediu para saber em quantos jogos isto acontece.

    O que o `J` é soube-se a 01/11/2026: uma **substituição** a meio de uma meia parte, marcada
    em quem entrou, e que pelo 87.º 7.6 conta como meia parte jogada — é o que o `_atletas` já
    fazia. A contagem fica para se medir quantos há e quantos a APL tira depois de o clube os
    justificar, e é ela que pinta de amarelo o Mérito do jogo na app. Ver
    `docs/09-regulamento-apl.md`.

    **Só a contagem por equipa**, e nunca de quem: `{"X": 20, "J": 1}` não diz que criança
    teve o `J`, e é isso que permite guardá-la.
    """
    acta = HTMLParser(html).css_first("#acta")
    if acta is None:
        return None
    tabelas = acta.css("table")
    if len(tabelas) < 4:
        return None

    def contar(tabela: Node) -> dict[str, int]:
        letras: dict[str, int] = {}
        for tr in tabela.css("tr"):
            c = _celulas(tr)
            if len(c) < _CELULAS_MINIMAS or c[2] not in POSICOES or not c[1]:
                continue
            for i in _PERIODOS:
                if c[i]:
                    letra = c[i].strip().upper()
                    letras[letra] = letras.get(letra, 0) + 1
        return letras

    return contar(tabelas[2]), contar(tabelas[3])


def nao_atletas(html: str) -> tuple[list[NaoAtletaBoletim], list[NaoAtletaBoletim]] | None:
    """(visitada, visitante) do banco, ou `None` quando o boletim não está lá.

    Separado do `participacao` de propósito: o Mérito precisa dos dois, mas uma equipa pode
    perfeitamente apresentar-se sem ninguém inscrito no banco, e `([], [])` nesse caso é a
    resposta certa — não é um boletim em falta.
    """
    acta = HTMLParser(html).css_first("#acta")
    if acta is None:
        return None
    tabelas = acta.css("table")
    if len(tabelas) < 4:
        return None
    return _banco(tabelas[2]), _banco(tabelas[3])
