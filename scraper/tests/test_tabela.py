"""Testes do motor de classificação (B9.12) e a reprodução das tabelas reais (B9.13).

O teste que interessa é o `test_reproduz_as_tabelas_publicadas`: recalcula **todas** as
tabelas que a fonte publica e exige igualdade linha a linha. É ele que nos dá o direito de
publicar as tabelas que a fonte *não* publica — e é ele que parte no dia em que a federação
mudar a regra de pontos, em vez de passarmos a publicar tabelas erradas em silêncio.
"""

from __future__ import annotations

import glob
import json
import pathlib
import random

import pytest
from hoquei.modelos import Jogo
from hoquei.tabela import calcular, calcular_de_json, vale_calcular

PUBLICADO = pathlib.Path(__file__).resolve().parents[2] / "web" / "static" / "v1"


def jogo(casa, fora, gc=None, gf=None, grupo=None, ao_vivo=False) -> Jogo:
    return Jogo(
        id=None, numero=None, grupo=grupo, jornada="1ª JORNADA", data=None, hora=None,
        casa=casa, fora=fora, golos_casa=gc, golos_fora=gf, recinto=None, ao_vivo=ao_vivo,
    )


def so(grupos):
    assert len(grupos) == 1
    return grupos[0].linhas


class TestRegras:
    def test_vitoria_vale_tres_pontos_e_empate_um(self):
        linhas = {l.equipa: l for l in so(calcular([
            jogo("A", "B", 3, 1),
            jogo("C", "D", 2, 2),
        ]))}
        assert (linhas["A"].pontos, linhas["A"].vitorias) == (3, 1)
        assert (linhas["B"].pontos, linhas["B"].derrotas) == (0, 1)
        assert (linhas["C"].pontos, linhas["C"].empates) == (1, 1)
        assert linhas["D"].pontos == 1

    def test_golos_contam_dos_dois_lados(self):
        linhas = {l.equipa: l for l in so(calcular([jogo("A", "B", 5, 2)]))}
        assert (linhas["A"].golos_marcados, linhas["A"].golos_sofridos) == (5, 2)
        assert (linhas["B"].golos_marcados, linhas["B"].golos_sofridos) == (2, 5)
        assert (linhas["A"].diferenca, linhas["B"].diferenca) == (3, -3)

    def test_jogo_a_decorrer_nao_conta_mas_a_equipa_aparece(self):
        """Um jogo a decorrer **tem** resultado e não pode entrar na tabela.

        Apareceu quando a ronda ao vivo começou a escrever resultados no ficheiro da
        competição: um 0-0 ao primeiro minuto dava um empate e um ponto a cada equipa.
        """
        linhas = {l.equipa: l for l in so(calcular([
            jogo("A", "B", 0, 0, ao_vivo=True),
            jogo("A", "C", 3, 1),
        ]))}
        assert (linhas["A"].jogos, linhas["A"].pontos) == (1, 3)
        assert (linhas["B"].jogos, linhas["B"].pontos) == (0, 0)

    def test_jogo_por_disputar_nao_conta_mas_a_equipa_aparece(self):
        linhas = so(calcular([jogo("A", "B"), jogo("A", "C", 1, 0)]))
        porEquipa = {l.equipa: l for l in linhas}
        assert set(porEquipa) == {"A", "B", "C"}
        assert porEquipa["A"].jogos == 1
        assert (porEquipa["B"].jogos, porEquipa["B"].pontos) == (0, 0)

    def test_prova_por_comecar_da_tabela_a_zeros_e_nao_tabela_vazia(self):
        linhas = so(calcular([jogo("A", "B"), jogo("C", "D")]))
        assert [l.equipa for l in linhas] == ["A", "B", "C", "D"]
        assert all(l.jogos == 0 and l.pontos == 0 for l in linhas)

    def test_equipas_por_definir_ficam_de_fora(self):
        # a fonte põe "-" quando o apuramento ainda não decidiu quem joga
        linhas = so(calcular([jogo("A", "B", 2, 1), jogo("-", "-")]))
        assert {l.equipa for l in linhas} == {"A", "B"}

    def test_racio_arredonda_para_o_par_no_empate_exacto(self):
        """`1/40 = 0.025` → `0.02`, como o `Round()` do Classic ASP em que a fonte corre.

        O `round()` do Python daria 0.03, porque 0.025 em binário fica um fio acima de meio.
        Um caso em 137 — e foi o teste de reprodução que o encontrou, com dados novos.
        """
        linhas = {l.equipa: l for l in so(calcular([jogo("A", "B", 1, 40)]))}
        assert linhas["A"].racio == 0.02

    def test_racio_e_none_quando_nao_sofreu_golos(self):
        linhas = {l.equipa: l for l in so(calcular([jogo("A", "B", 4, 0)]))}
        assert linhas["A"].racio is None
        assert linhas["B"].racio == 0.0

    def test_posicao_e_atribuida_pela_ordem(self):
        linhas = so(calcular([jogo("A", "B", 9, 0), jogo("B", "A", 0, 1)]))
        assert [(l.posicao, l.equipa) for l in linhas] == [(1, "A"), (2, "B")]


class TestOrdem:
    """O desempate do **Artigo 7.º** do regulamento da APL, critério a critério.

    A ordem antiga — `pontos → diferença → golos marcados` — era um palpite assumido no
    comentário do módulo. O regulamento manda ver primeiro o confronto directo e, no fim,
    o quociente; golos marcados não é critério nenhum.
    """

    def test_primeiro_os_pontos(self):
        linhas = so(calcular([jogo("A", "B", 1, 0), jogo("B", "A", 0, 0)]))
        assert [l.equipa for l in linhas] == ["A", "B"]

    def test_depois_o_confronto_directo_em_pontos(self):
        """7.4.1 — e passa à frente da diferença de golos na prova.

        B tem muito melhor diferença (+8 contra +1) e fica atrás: perdeu com A.
        """
        linhas = so(calcular([
            jogo("A", "B", 1, 0),      # confronto directo: 3 pontos para A
            jogo("X", "A", 1, 0), jogo("B", "X", 9, 1),
            jogo("A", "Y", 0, 0), jogo("B", "Y", 0, 0),
        ]))
        porEquipa = {l.equipa: l for l in linhas}
        assert porEquipa["A"].pontos == porEquipa["B"].pontos
        assert porEquipa["B"].diferenca > porEquipa["A"].diferenca
        assert [l.equipa for l in linhas][:2] == ["A", "B"]

    def test_depois_o_confronto_directo_na_diferenca_de_golos(self):
        """7.4.2 — duas voltas, uma vitória para cada: 1-0 e 0-3."""
        linhas = so(calcular([jogo("A", "B", 1, 0), jogo("B", "A", 3, 0)]))
        assert [l.equipa for l in linhas] == ["B", "A"]

    def test_depois_a_diferenca_de_golos_na_fase(self):
        """7.4.3 — empatados no confronto directo (1-1), decide a diferença na prova."""
        linhas = so(calcular([
            jogo("A", "B", 1, 1),
            jogo("A", "X", 5, 0), jogo("B", "X", 1, 0),
        ]))
        assert [l.equipa for l in linhas][:2] == ["A", "B"]

    def test_por_fim_o_quociente_e_nao_os_golos_marcados(self):
        """7.4.4 — o critério que muda a ordem face à regra antiga.

        É o caso real da série C do Torneio de Abertura de sub-17: mesma diferença, e quem
        marcou mais golos tem pior quociente. 12-6 dá 2.00; 10-4 dá 2.50.
        """
        linhas = so(calcular([
            jogo("A", "B", 4, 4),
            jogo("A", "X", 8, 2), jogo("B", "X", 6, 0),
        ]))
        porEquipa = {l.equipa: l for l in linhas}
        assert porEquipa["A"].diferenca == porEquipa["B"].diferenca
        assert porEquipa["A"].golos_marcados > porEquipa["B"].golos_marcados
        assert [l.equipa for l in linhas][:2] == ["B", "A"], "o quociente manda, não os golos"

    def test_com_tres_empatadas_conta_a_mini_tabela_entre_elas(self):
        """7.5.1 — "pontos nos jogos realizados entre as três ou mais equipas".

        A ganhou a B, B ganhou a C, C ganhou a A: na mini-tabela ficam os três com 3 pontos,
        e decide a diferença de golos entre eles (7.5.2).
        """
        linhas = so(calcular([
            jogo("A", "B", 1, 0), jogo("B", "C", 1, 0), jogo("C", "A", 5, 0),
        ]))
        assert [l.equipa for l in linhas] == ["C", "B", "A"]

    def test_a_meio_da_fase_o_confronto_directo_nao_se_aplica(self):
        """7.4 diz "no final de qualquer fase" — e a meio seria pior do que não o aplicar.

        É o caso real da série F do campeonato de sub-17 à segunda jornada: quatro equipas
        empatadas em pontos, e só duas delas já tinham jogado entre si. Com a mini-tabela a
        contar, a equipa com 12-0 de diferença caía do 1.º para o 3.º por ainda não ter
        jogado com as outras, e quem tinha ganho um confronto subia a 1.º com +1.

        Aqui: A fez 12-0 e não jogou com B nem com C; B ganhou a C. Enquanto faltar esse
        jogo, manda a diferença de golos na fase (7.4.3) e A fica à frente.
        """
        linhas = so(calcular([
            jogo("A", "X", 12, 0),                 # A: 3 pts, +12
            jogo("B", "C", 1, 0),                  # B: 3 pts, +1
            jogo("C", "Z", 3, 0),                  # C: 3 pts, +2
            jogo("A", "B"), jogo("A", "C"),        # por disputar
        ]))
        porEquipa = {l.equipa: l for l in linhas}
        assert porEquipa["A"].pontos == porEquipa["B"].pontos == porEquipa["C"].pontos == 3
        # pela mini-tabela viria B à frente de C, por lhe ter ganho; pela diferença na
        # fase vem C à frente, e é essa que manda enquanto faltarem jogos entre os três
        assert [l.equipa for l in linhas][:3] == ["A", "C", "B"]

    def test_fechados_os_confrontos_a_mini_tabela_manda_mesmo_contra_a_diferenca(self):
        """Com todos os pares jogados, o 7.5.2 passa à frente do 7.5.3.

        Os três ganham um ao outro em ciclo, e cada um leva uma vitória e uma derrota de
        fora que lhes dá a mesma pontuação e diferenças muito diferentes. Pela diferença na
        fase a ordem seria A, B, C (+6, 0, -6); pelo confronto directo é C, B, A — e é o
        confronto directo que o regulamento manda ver primeiro.
        """
        linhas = so(calcular([
            jogo("A", "B", 1, 0), jogo("B", "C", 1, 0), jogo("C", "A", 3, 0),
            jogo("A", "W", 9, 0), jogo("V", "A", 1, 0),
            jogo("B", "W", 1, 0), jogo("V", "B", 1, 0),
            jogo("C", "W", 1, 0), jogo("V", "C", 9, 0),
        ]))
        porEquipa = {l.equipa: l for l in linhas}
        assert [porEquipa[e].pontos for e in "ABC"] == [6, 6, 6]
        assert [porEquipa[e].diferenca for e in "ABC"] == [6, 0, -6]
        assert [l.equipa for l in linhas if l.equipa in "ABC"] == ["C", "B", "A"]

    def test_por_fim_pelo_nome_e_nao_pela_ordem_de_entrada(self):
        """O regulamento manda jogar um jogo de desempate (7.6); nós temos de ordenar."""
        linhas = so(calcular([jogo("Z", "M", 1, 1), jogo("M", "Z", 1, 1)]))
        assert [l.equipa for l in linhas] == ["M", "Z"]

    def test_quem_nao_sofreu_golos_fica_a_frente_no_quociente(self):
        """O quociente de quem não sofreu é infinito — a fonte escreve "-" nessa coluna."""
        linhas = so(calcular([
            jogo("A", "B", 2, 2),
            jogo("A", "X", 2, 0), jogo("B", "X", 4, 2),
        ]))
        porEquipa = {l.equipa: l for l in linhas}
        assert porEquipa["A"].diferenca == porEquipa["B"].diferenca
        assert [l.equipa for l in linhas][:2] == ["A", "B"]


class TestGrupos:
    def test_uma_tabela_por_serie(self):
        grupos = calcular([
            jogo("A", "B", 1, 0, grupo="A"),
            jogo("C", "D", 2, 0, grupo="B"),
        ])
        assert [g.nome for g in grupos] == ["SERIE A", "SERIE B"]
        assert {l.equipa for l in grupos[0].linhas} == {"A", "B"}

    def test_fase_a_eliminar_nao_conta_para_tabela_nenhuma(self):
        # foi a causa de 25 das 29 divergências na primeira validação: os quartos e as
        # meias vêm sem grupo e inflavam a tabela da série
        grupos = calcular([
            jogo("A", "B", 1, 0, grupo="A"),
            jogo("A", "C", 3, 2),  # meia-final, sem grupo
        ])
        assert len(grupos) == 1
        linhas = {l.equipa: l for l in grupos[0].linhas}
        assert set(linhas) == {"A", "B"}
        assert linhas["A"].jogos == 1

    def test_prova_de_serie_unica_conta_tudo_num_grupo_sem_nome(self):
        grupos = calcular([jogo("A", "B", 1, 0), jogo("B", "A", 2, 2)])
        assert len(grupos) == 1 and grupos[0].nome is None
        assert {l.equipa: l.jogos for l in grupos[0].linhas} == {"A": 2, "B": 2}


# ─── B9.13: reprodução contra os dados reais ────────────────────────────────────

def _provas_publicadas():
    for caminho in sorted(glob.glob(str(PUBLICADO / "*" / "*" / "comp" / "*.json"))):
        d = json.loads(pathlib.Path(caminho).read_text(encoding="utf-8"))
        if any(g["linhas"] for g in d["classificacao"]):
            yield d


def _jogos_de(d) -> list[Jogo]:
    return [jogo(j["casa"], j["fora"], j["golos_casa"], j["golos_fora"], j["grupo"],
                 j.get("ao_vivo", False))
            for j in d["jogos"]]


def _normalizar(nome: str | None) -> str:
    return (nome or "").replace("SERIE", "").strip().upper()


def _emparelhar(calculados, publicados: list[dict]) -> list[tuple[list, dict]]:
    """Casa cada tabela nossa com a da fonte.

    Quase sempre pelo nome da série. A excepção é a prova de série única — a TAÇA PROF. JOAO
    CAMPELO rotula a tabela "SERIE A" mas nunca preenche a coluna de grupo no calendário, por
    isso nós não temos de onde tirar esse nome. Quando há uma tabela de cada lado, são a mesma.
    """
    publicados = [g for g in publicados if g["linhas"]]
    if len(calculados) == 1 and len(publicados) == 1:
        return [(calculados[0].linhas, publicados[0])]
    porNome = {_normalizar(g.nome): g.linhas for g in calculados}
    return [(porNome.get(_normalizar(g["nome"]), []), g) for g in publicados]


@pytest.fixture(scope="module")
def provas():
    lista = list(_provas_publicadas())
    if not lista:
        pytest.skip("sem dados publicados em web/static/v1 — correr `cli publicar` primeiro")
    return lista


def test_ha_tabelas_publicadas_que_cheguem(provas):
    """Guarda contra o teste passar por não ter encontrado nada que verificar."""
    tabelas = sum(1 for d in provas for g in d["classificacao"] if g["linhas"])
    linhas = sum(len(g["linhas"]) for d in provas for g in d["classificacao"])
    assert tabelas >= 30, f"só {tabelas} tabelas — a amostra encolheu?"
    assert linhas >= 120, f"só {linhas} linhas — a amostra encolheu?"


def test_reproduz_as_tabelas_publicadas(provas):
    """Linha a linha, campo a campo, contra tudo o que a fonte publica."""
    divergencias = []
    for d in provas:
        for nossas, g in _emparelhar(
                calcular(_jogos_de(d), como_a_fonte=True), d["classificacao"]):
            calculadas = {l.equipa: l for l in nossas}
            for l in g["linhas"]:
                c = calculadas.get(l["equipa"])
                if c is None:
                    divergencias.append(f"{d['competicao']['nome']} [{g['nome']}]: "
                                        f"{l['equipa']} não saiu no nosso cálculo")
                    continue
                for campo in ("jogos", "vitorias", "empates", "derrotas",
                              "golos_marcados", "golos_sofridos", "diferenca",
                              "racio", "pontos", "posicao"):
                    if getattr(c, campo) != l[campo]:
                        divergencias.append(
                            f"{d['competicao']['nome']} [{g['nome']}] {l['equipa']}: "
                            f"{campo} fonte={l[campo]} nosso={getattr(c, campo)}")
    assert not divergencias, (
        f"{len(divergencias)} divergências face à fonte — a regra mudou ou o parser partiu:\n  "
        + "\n  ".join(divergencias[:20]))


def test_a_ordem_nao_depende_da_ordem_de_entrada(provas):
    """Baralhar primeiro: um `sorted` estável esconde critérios de desempate em falta.

    Sem isto o teste passa por preservar a ordem da fonte em vez de a deduzir — foi
    exactamente o que aconteceu na primeira validação, que deu 42/42 falsos.
    """
    baralhador = random.Random(7)
    for d in provas:
        jogos = _jogos_de(d)
        baralhador.shuffle(jogos)
        for nossas, g in _emparelhar(
                calcular(jogos, como_a_fonte=True), d["classificacao"]):
            esperada = [l["equipa"] for l in g["linhas"]]
            assert [l.equipa for l in nossas] == esperada, (
                f"{d['competicao']['nome']} [{g['nome']}]: ordem diferente da fonte")


def test_a_fonte_ordena_por_golos_marcados_e_o_regulamento_nao(provas):
    """A medição que justifica haver duas ordens neste módulo — ver `_como_a_fonte`.

    Conta em quantas tabelas publicadas as duas regras discordam. A 10/10/2026, com a época
    em duas jornadas, eram **duas** — e as duas pelo mesmo motivo, o quociente do 4.4 contra
    os golos marcados da fonte:

    * Torneio de Abertura de sub-17, série C: 12-6 (racio 2.00) à frente de 10-4 (2.50);
    * Campeonato regional de sub-17, série F: 4-3 (1.33) à frente de 3-2 (1.50).

    Nos dois casos a fonte põe primeiro quem marcou mais golos, e nos dois casos publica, na
    coluna ao lado, o rácio que a contradiz.

    Se este número crescer, não é um bug: é a fonte a aplicar a sua regra mais vezes. Se
    cair a zero, vale a pena perguntar se a fonte mudou — e aí talvez já não sejam precisas
    duas ordens.
    """
    divergentes = []
    for d in provas:
        pela_fonte = _emparelhar(calcular(_jogos_de(d), como_a_fonte=True), d["classificacao"])
        pelo_regulamento = _emparelhar(calcular(_jogos_de(d)), d["classificacao"])
        for (f, g), (r, _) in zip(pela_fonte, pelo_regulamento):
            if [l.equipa for l in f] != [l.equipa for l in r]:
                divergentes.append(f"{d['competicao']['nome']} [{g['nome']}]")
    assert divergentes == ["TORNEIO ABERTURA APL SUB-17 [SERIE C]",
                           "CAMP. REG. SUB-17 - 1ª FASE - SERIE F [None]"], (
        f"{len(divergentes)} tabelas onde as duas regras discordam:\n  "
        + "\n  ".join(divergentes))


def test_empates_por_desempatar_sao_conhecidos(provas):
    """O desempate final por nome não é regra de regulamento — é o que a fonte faz.

    Hoje todos os casos que lá chegam são entre equipas que **ainda não jogaram**, onde
    qualquer critério dá o mesmo. No dia em que duas equipas com jogos disputados empatarem
    em pontos, diferença e golos marcados, a nossa ordem passa a ser um palpite e este teste
    avisa: aí é preciso ler o regulamento (confronto directo?) em vez de adivinhar.
    """
    suspeitos = []
    for d in provas:
        for g in d["classificacao"]:
            for a, b in zip(g["linhas"], g["linhas"][1:]):
                chave = ("pontos", "diferenca", "golos_marcados")
                if all(a[c] == b[c] for c in chave) and (a["jogos"] or b["jogos"]):
                    suspeitos.append(f"{d['competicao']['nome']} [{g['nome']}]: "
                                     f"{a['equipa']} vs {b['equipa']} ({a['jogos']}J)")
    assert len(suspeitos) <= 3, (
        "apareceram empates entre equipas com jogos que o nosso critério não resolve:\n  "
        + "\n  ".join(suspeitos))


class TestQuandoValeCalcular:
    """
    A regra de **onde** publicamos tabela nossa (B9.14/B9.15).

    O inventário está no comentário do `tabela.py`: das 14 provas sem tabela publicada, 8 são
    Encontros Distritais e as outras 6 são eliminatórias e jogos-treino. Calcular a
    classificação de uma Supertaça punha o vencedor de uma meia-final à frente do vencedor da
    final, e era publicado com a mesma cara de verdade que o resto.
    """

    def test_os_encontros_distritais_nao_levam_tabela_de_pontos(self):
        """Mudou a 10/10/2026, e é uma correcção e não uma remoção de funcionalidade.

        Durante três dias calculámos-lhes uma tabela de 3/1/0 e publicámo-la com o rótulo de
        "não oficial". Essa tabela não existe em lado nenhum: a APL não publica classificação
        nestes escalões de propósito, e o Artigo 92.º diz o que se escalona ali — o Mérito da
        Formação. Tínhamos inventado uma ordem por vitórias para uma prova que não é
        disputada por vitórias.
        """
        assert not vale_calcular("ENCONTROS DISTRITAIS BENJAMINS - 1ª FASE NIVEL I - SERIE A", [])
        assert not vale_calcular("ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL II - SERIE D", None)

    def test_um_campeonato_regional_sem_tabela_publicada_calcula_se(self):
        """O último caso que sobra, e que nunca chega a acontecer: a fonte publica-as todas."""
        assert vale_calcular("CAMP. REG. SUB-13 - 1ª FASE - SERIE A", [])

    def test_eliminatorias_e_jogos_treino_nao(self):
        assert not vale_calcular("SUPERTAÇA APL SUB-13", [])
        assert not vale_calcular("TAÇA APL SENIORES MASCULINOS", [])
        assert not vale_calcular("JOGO TREINO", [])
        assert not vale_calcular("ZECA PINTO", [])

    def test_onde_a_fonte_publica_manda_a_dela(self):
        """Duas tabelas para a mesma prova divergiriam, e a app mostrava duas verdades."""
        assert not vale_calcular(
            "CAMP. REG. SUB-13 - 1ª FASE - SERIE A",
            [{"nome": None, "linhas": [{"equipa": "A"}]}],
        )

    def test_um_nome_que_nao_conhecemos_fica_de_fora(self):
        """Nunca a palpite: uma prova nova não ganha tabela nossa sem alguém decidir."""
        assert not vale_calcular("TORNEIO DE NATAL", [])
        assert not vale_calcular("", [])


class TestCalcularDeJson:
    """
    A ronda ao vivo recalcula a partir do nosso próprio ficheiro, porque é lá que ela já
    escreveu o resultado — e a fonte, nestas provas, não tem tabela para dar.
    """

    def jogos(self):
        return [
            {"casa": "A", "fora": "B", "golos_casa": 3, "golos_fora": 1, "grupo": None},
            {"casa": "B", "fora": "C", "golos_casa": 2, "golos_fora": 2, "grupo": None},
            {"casa": "A", "fora": "C", "golos_casa": None, "golos_fora": None, "grupo": None},
        ]

    def test_conta_o_que_esta_no_ficheiro(self):
        linhas = {l.equipa: l for l in so(calcular_de_json(self.jogos()))}
        # `C` à frente de `B` com os mesmos pontos: a diferença de golos desempata, e é 0
        # contra -2. Escrevi primeiro `["A", "B", "C"]` e o teste apanhou-me a mim.
        assert [l.equipa for l in so(calcular_de_json(self.jogos()))] == ["A", "C", "B"]
        assert linhas["A"].pontos == 3
        assert linhas["B"].pontos == 1
        assert linhas["C"].pontos == 1
        # a equipa com um jogo por disputar aparece na tabela, a zeros no que falta
        assert linhas["C"].jogos == 1

    def test_um_jogo_a_decorrer_nao_conta(self):
        """O mesmo cuidado do motor, agora pelo caminho do JSON: um 0-0 ao 1º minuto não é empate."""
        jogos = self.jogos()
        jogos[2] = {"casa": "A", "fora": "C", "golos_casa": 0, "golos_fora": 0,
                    "grupo": None, "ao_vivo": True}
        linhas = {l.equipa: l for l in so(calcular_de_json(jogos))}
        assert linhas["A"].jogos == 1
        assert linhas["A"].pontos == 3
