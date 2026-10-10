"""Motor de classificação: calcular a tabela a partir dos resultados.

Existe por uma razão concreta: **198 jogos da APL não têm tabela nenhuma**. Os Escolares
(5 provas), os Benjamins (3) e os Torneios Particulares (2) não publicam classificação, e
quem acompanha um filho nesses escalões anda a fazer as contas à mão.

As regras aqui não foram assumidas — foram **medidas** contra as 42 tabelas que a fonte
publica (ver `tests/test_tabela.py`, que volta a medi-las a cada execução):

* **3 pontos por vitória, 1 por empate.** Ajustado contra 151 linhas publicadas: `3V+1E`
  acerta em 151, `2V+1E` em 65.
* **A tabela conta só a fase de grupos.** Numa prova com séries, os jogos a eliminar
  (quartos, meias, final) vêm com a coluna de grupo vazia e **não** contam para lado nenhum.
* **Prova de série única deixa a coluna de grupo vazia em todos os jogos.** Aí contam todos,
  numa só tabela sem nome.
* **A ordem é a do Artigo 7.º do regulamento da APL** — confronto directo primeiro, e
  quociente no fim. Ver `_ordenar`.

Sobre a ordem, o que mudou a 10/10/2026 e porquê. Até esse dia a ordem aqui era
`pontos → diferença de golos → golos marcados → nome`, e este comentário dizia, por escrito,
que o regulamento "quase de certeza manda ver o confronto directo primeiro" mas que não havia
caso que distinguisse as duas regras. O regulamento chegou — o dono recebeu-o de um amigo
treinador — e manda mesmo: o confronto directo é o primeiro critério e **golos marcados não
é critério nenhum**, o último é o quociente. As tabelas que nós publicamos passaram a seguir
o regulamento; o `_como_a_fonte` guarda a regra da fonte, que só o teste de reprodução usa, e
mede em quantas tabelas publicadas as duas discordam (duas, a 10/10).

O desempate final por **nome** continua a não ser regra: o Artigo 7.º 6 manda jogar um jogo
de desempate, e uma tabela tem de sair ordenada de qualquer maneira.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from decimal import ROUND_HALF_EVEN, Decimal

from .modelos import GrupoClassificacao, Jogo, LinhaClassificacao

PONTOS_VITORIA = 3
PONTOS_EMPATE = 1

# a fonte usa "-" no calendário quando o apuramento ainda não definiu a equipa
_POR_DEFINIR = {"", "-", "--"}


class _Acumulador:
    __slots__ = ("jogos", "vitorias", "empates", "derrotas", "marcados", "sofridos")

    def __init__(self) -> None:
        self.jogos = self.vitorias = self.empates = self.derrotas = 0
        self.marcados = self.sofridos = 0

    def somar(self, marcados: int, sofridos: int) -> None:
        self.jogos += 1
        self.marcados += marcados
        self.sofridos += sofridos
        if marcados > sofridos:
            self.vitorias += 1
        elif marcados == sofridos:
            self.empates += 1
        else:
            self.derrotas += 1

    @property
    def pontos(self) -> int:
        return self.vitorias * PONTOS_VITORIA + self.empates * PONTOS_EMPATE


def _real(equipa: str | None) -> bool:
    return bool(equipa) and equipa.strip() not in _POR_DEFINIR


def _racio(marcados: int, sofridos: int) -> float | None:
    """A fonte mostra "-" quando ainda não sofreu golos; nós pomos None.

    **Arredondamento bancário sobre o valor exacto**, e não `round(m / s, 2)`. O empate
    exacto a meio decide-se para o par, que é o que o `Round()` do Classic ASP faz — e a
    fonte corre em ASP. Diferem num caso em 137: `1/40 = 0.025`, onde a fonte diz `0.02` e
    o `round()` do Python diz `0.03`, porque em binário 0.025 fica um fio acima de meio.
    Foi o teste de reprodução (B9.13) que apanhou isto, com dados novos.
    """
    if sofridos == 0:
        return None
    return float((Decimal(marcados) / Decimal(sofridos))
                 .quantize(Decimal("0.01"), rounding=ROUND_HALF_EVEN))


def _quociente(a: _Acumulador) -> float:
    """O "quociente" do Artigo 7.º: golos marcados a dividir pelos sofridos.

    Não é o `racio` que a app mostra — este serve para ordenar e não para ler, por isso não
    arredonda. Quem não sofreu golos fica à frente de todos (`inf`); quem não marcou nem
    sofreu não tem informação nenhuma e fica atrás, que é o caso de uma equipa sem jogos.
    """
    if a.sofridos == 0:
        return float("inf") if a.marcados else 0.0
    return a.marcados / a.sofridos


def _entre(equipas: set[str], jogos: list[Jogo]) -> dict[str, _Acumulador] | None:
    """A mini-tabela dos jogos **realizados entre** estas equipas — ou `None`.

    É o que o Artigo 7.º 4.1 e 5.1 pedem: no desempate "só serão considerados os resultados
    obtidos nessa fase" e, dentro dela, os jogos entre as empatadas.

    O `None` é a parte que custou a aprender. O Artigo 7.º 4 abre com "no caso de empate
    pontual entre duas equipas **no final de qualquer fase**": o confronto directo é um
    critério de fim de fase, e a meio da fase as equipas empatadas ainda não jogaram todas
    entre si. Medido a 10/10/2026 contra as tabelas publicadas, com a época em duas jornadas:
    na série F do campeonato regional de sub-17, aplicar a mini-tabela a meio **tirava o CD
    BOLIQUEIME do 1.º para o 3.º lugar com 12-0 de diferença**, só porque ainda não tinha
    jogado com os outros três empatados, enquanto o HC VASCO GAMA subia a 1.º por ter ganho
    a um deles. Não é o regulamento a dizer isso — é o critério a ser usado onde ele não se
    aplica.
    
    Por isso: só devolve mini-tabela quando **todos os pares** do grupo empatado já jogaram
    entre si. Enquanto faltar um jogo, o critério não é determinável e a ordem cai para o
    seguinte (a diferença de golos na fase, 4.3/5.3), que é também o que a fonte mostra.
    """
    acc = {e: _Acumulador() for e in equipas}
    disputados: set[frozenset[str]] = set()
    for j in jogos:
        if j.golos_casa is None or j.golos_fora is None or getattr(j, "ao_vivo", False):
            continue
        if j.casa in equipas and j.fora in equipas:
            acc[j.casa].somar(j.golos_casa, j.golos_fora)
            acc[j.fora].somar(j.golos_fora, j.golos_casa)
            disputados.add(frozenset((j.casa, j.fora)))
    pares = len(equipas) * (len(equipas) - 1) // 2
    return acc if len(disputados) == pares else None


def _como_a_fonte(acc: dict[str, _Acumulador]) -> list[tuple[str, _Acumulador]]:
    """A ordem que a **fonte** usa: pontos → diferença → golos marcados → nome.

    Não é a do regulamento, e isso foi medido: ver `_ordenar`. Existe por uma razão só —
    o `test_reproduz_as_tabelas_publicadas` recalcula as 42 tabelas que a fonte publica e
    exige igualdade linha a linha, e é esse teste que nos dá o direito de publicar as que
    ela não publica. Se ele passasse a usar a ordem do regulamento, deixava de validar a
    nossa contagem e passava a medir a diferença entre dois regulamentos.
    """
    return sorted(acc.items(), key=lambda par: (
        -par[1].pontos,
        -(par[1].marcados - par[1].sofridos),
        -par[1].marcados,
        par[0],
    ))


def _ordenar(acc: dict[str, _Acumulador], jogos: list[Jogo]) -> list[tuple[str, _Acumulador]]:
    """A ordem da tabela, pelo **Artigo 7.º** do regulamento da APL (pontos 3 a 5).

    Até 10/10/2026 a ordem aqui era `pontos → diferença de golos → golos marcados → nome`,
    e os golos marcados eram um palpite: o comentário deste módulo dizia-o por escrito, que
    o regulamento "quase de certeza manda ver o confronto directo primeiro" e que ainda não
    havia caso que distinguisse as duas regras. O regulamento chegou, e manda:

    * **4.1 / 5.1** — pontos nos jogos realizados entre as empatadas (confronto directo);
    * **4.2 / 5.2** — diferença de golos nesses mesmos jogos;
    * **4.3 / 5.3** — diferença de golos em toda a fase da prova;
    * **5.4** — quociente (marcados/sofridos) entre as que ainda estão empatadas;
    * **4.4 / 5.5** — quociente geral na fase da prova.

    **Golos marcados não é critério nenhum.** Era o nosso, não o do regulamento.

    Os pontos 4 (duas equipas) e 5 (três ou mais) parecem regras diferentes e dão a mesma
    chave: para um par, se o confronto directo empata em pontos *e* em diferença, então a
    diferença entre ambas é zero dos dois lados, logo marcaram o mesmo e o quociente entre
    elas é 1 para as duas. O critério 5.4 é vazio num par — e por isso uma chave só serve
    para os dois casos, em vez de dois caminhos que divergiriam com o tempo.

    O que o regulamento **não** resolve fica por resolver: o ponto 6 manda jogar um jogo de
    desempate. Como a tabela tem de sair ordenada de qualquer maneira, o último critério
    continua a ser o nome — e continua a não ser regra, é só determinismo.

    ### A fonte não faz isto, e medi-o

    Das 42 tabelas que a fonte publica há **uma** onde as duas regras discordam, e ela
    resolve a dúvida toda. TORNEIO ABERTURA APL SUB-17, série C, a 10/10/2026:

        1  AD OEIRAS B        4 pts  12-6  dif +6  racio 2.00
        2  CD PAÇO ARCOS B    4 pts  10-4  dif +6  racio 2.50

    Empatam em pontos; o confronto directo foi 4-4, logo empatam também aí e na diferença;
    a diferença na fase é +6 para as duas. Pelo 4.4 do regulamento decide o quociente, e o
    quociente do Paço de Arcos é melhor — 2.50 contra 2.00. A fonte põe o Oeiras à frente,
    que é o que marcou mais golos. **A fonte ordena por golos marcados**, o critério que nós
    tínhamos por palpite e que o regulamento não tem. E ordena assim enquanto publica, na
    linha ao lado, o rácio que a contradiz.

    Por isso há duas ordens neste módulo e não uma: a do regulamento, para as tabelas que
    **nós** publicamos — onde a fonte não publica nenhuma, e a regra que vale é a escrita —
    e a `_como_a_fonte`, que só o teste de reprodução usa.
    """
    por_pontos: dict[int, list[str]] = {}
    for equipa, a in acc.items():
        por_pontos.setdefault(a.pontos, []).append(equipa)

    saida: list[tuple[str, _Acumulador]] = []
    for pontos in sorted(por_pontos, reverse=True):
        empatadas = por_pontos[pontos]
        mini = _entre(set(empatadas), jogos) if len(empatadas) > 1 else None
        for equipa in sorted(empatadas, key=lambda e: (
            -(mini[e].pontos if mini else 0),
            -((mini[e].marcados - mini[e].sofridos) if mini else 0),
            -(acc[e].marcados - acc[e].sofridos),
            -(_quociente(mini[e]) if mini else 0.0),
            -_quociente(acc[e]),
            e,
        )):
            saida.append((equipa, acc[equipa]))
    return saida


def _linhas(jogos: list[Jogo], como_a_fonte: bool = False) -> list[LinhaClassificacao]:
    # as equipas vêm de **todos** os jogos do grupo, disputados ou não: uma prova por
    # começar tem tabela, com todos a zero, e sem isto ela sairia vazia
    acc: dict[str, _Acumulador] = {}
    for j in jogos:
        for equipa in (j.casa, j.fora):
            if _real(equipa):
                acc.setdefault(equipa, _Acumulador())

    for j in jogos:
        if j.golos_casa is None or j.golos_fora is None:
            continue
        # Um jogo a decorrer tem resultado e não conta. Apareceu quando a ronda ao vivo
        # começou a escrever resultados no ficheiro da competição: um 0-0 ao primeiro
        # minuto entrava na tabela como empate, com um ponto para cada equipa. Foi o teste
        # de reprodução (B9.13) que o apanhou, terceira vez que se paga.
        if getattr(j, "ao_vivo", False):
            continue
        if not (_real(j.casa) and _real(j.fora)):
            continue
        acc[j.casa].somar(j.golos_casa, j.golos_fora)
        acc[j.fora].somar(j.golos_fora, j.golos_casa)

    ordenadas = _como_a_fonte(acc) if como_a_fonte else _ordenar(acc, jogos)
    return [
        LinhaClassificacao(
            posicao=i,
            equipa=equipa,
            logo=None,
            jogos=a.jogos,
            vitorias=a.vitorias,
            empates=a.empates,
            derrotas=a.derrotas,
            golos_marcados=a.marcados,
            golos_sofridos=a.sofridos,
            diferenca=a.marcados - a.sofridos,
            racio=_racio(a.marcados, a.sofridos),
            pontos=a.pontos,
        )
        for i, (equipa, a) in enumerate(ordenadas, start=1)
    ]


def calcular(jogos: Iterable[Jogo], como_a_fonte: bool = False) -> list[GrupoClassificacao]:
    """A classificação de uma prova, um grupo por série.

    Numa prova com séries, os jogos sem grupo são a fase a eliminar e ficam de fora. Numa
    prova de série única — onde *nenhum* jogo traz grupo — entram todos, num grupo sem nome.

    `como_a_fonte` troca o desempate do regulamento pelo da fonte e serve **só** ao teste de
    reprodução — ver `_como_a_fonte` para o porquê e para o caso que separa os dois.
    """
    jogos = list(jogos)
    series = sorted({j.grupo for j in jogos if j.grupo})
    if not series:
        return [GrupoClassificacao(nome=None, linhas=_linhas(jogos, como_a_fonte))]
    return [
        GrupoClassificacao(
            # a fonte escreve "SERIE A" na classificação e só "A" no calendário
            nome=f"SERIE {s}",
            linhas=_linhas([j for j in jogos if j.grupo == s], como_a_fonte),
        )
        for s in series
    ]


#: As provas onde uma tabela calculada **quer dizer alguma coisa**.
#:
#: Inventariado a 07/10/2026, e não adivinhado: das 37 competições da época, **14** não têm
#: tabela publicada pela fonte, e dividem-se em dois grupos muito diferentes.
#:
#:    8×  Encontros Distritais (5 Escolares + 3 Benjamins)  → fase de grupos, a tabela faz sentido
#:    4×  Supertaça APL (sub-13 a sub-19)                   → eliminatória, uma tabela não diz nada
#:    2×  Torneios Particulares (JOGO TREINO, ZECA PINTO)   → jogos-treino de pré-época
#:
#: Calcular a classificação de uma eliminatória produziria uma tabela onde o vencedor de uma
#: meia-final aparece à frente do vencedor da final. Por isso a regra não é "sempre que falta",
#: é "sempre que falta **e** a prova é disputada por pontos".
#:
#: `CAMP. REG.` está aqui por coerência e nunca chega a ser usado: a fonte publica a tabela de
#: todos os campeonatos regionais. Se algum dia deixar de publicar uma, nós preenchemos.
_POR_PONTOS = re.compile(r"^\s*(ENCONTROS DISTRITAIS|CAMP\.?\s*REG)", re.IGNORECASE)


def vale_calcular(nome_da_prova: str, publicada: list | None) -> bool:
    """Se devemos calcular a tabela desta prova.

    **Nunca quando a fonte publica uma.** Não é só evitar trabalho: duas tabelas para a mesma
    prova divergiriam no dia em que a nossa regra e a dela discordassem, e a app passava a
    mostrar duas verdades. Onde a fonte publica, a dela é a que manda.
    """
    if publicada:
        return False
    return bool(_POR_PONTOS.match(nome_da_prova or ""))


class _JogoDeJson:
    """Um jogo lido do nosso próprio JSON, com a forma que o motor espera.

    Serve a ronda ao vivo: ela já escreveu o resultado no ficheiro da competição — ver
    `_actualizar_calendario` — e recalcular dali não custa um único pedido à fonte, que para
    estas provas não tem tabela nenhuma para dar.
    """

    __slots__ = ("casa", "fora", "golos_casa", "golos_fora", "grupo", "ao_vivo")

    def __init__(self, d: dict) -> None:
        self.casa = d.get("casa")
        self.fora = d.get("fora")
        self.golos_casa = d.get("golos_casa")
        self.golos_fora = d.get("golos_fora")
        self.grupo = d.get("grupo")
        self.ao_vivo = bool(d.get("ao_vivo"))


def calcular_de_json(jogos: Iterable[dict]) -> list[GrupoClassificacao]:
    """A mesma conta, a partir dos jogos como estão no nosso JSON."""
    return calcular(_JogoDeJson(j) for j in jogos)
