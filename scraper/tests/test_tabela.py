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
from hoquei.tabela import calcular

PUBLICADO = pathlib.Path(__file__).resolve().parents[2] / "web" / "static" / "v1"


def jogo(casa, fora, gc=None, gf=None, grupo=None) -> Jogo:
    return Jogo(
        id=None, numero=None, grupo=grupo, jornada="1ª JORNADA", data=None, hora=None,
        casa=casa, fora=fora, golos_casa=gc, golos_fora=gf, recinto=None,
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
    def test_desempata_por_diferenca_de_golos(self):
        linhas = so(calcular([jogo("A", "X", 5, 0), jogo("B", "Y", 1, 0)]))
        assert [l.equipa for l in linhas][:2] == ["A", "B"]

    def test_depois_por_golos_marcados(self):
        # mesma diferença (+2), mas A marcou mais
        linhas = so(calcular([jogo("A", "X", 5, 3), jogo("B", "Y", 2, 0)]))
        assert [l.equipa for l in linhas][:2] == ["A", "B"]

    def test_por_fim_pelo_nome_e_nao_pela_ordem_de_entrada(self):
        linhas = so(calcular([jogo("Z", "M", 1, 1), jogo("M", "Z", 1, 1)]))
        assert [l.equipa for l in linhas] == ["M", "Z"]


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
    return [jogo(j["casa"], j["fora"], j["golos_casa"], j["golos_fora"], j["grupo"])
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
        for nossas, g in _emparelhar(calcular(_jogos_de(d)), d["classificacao"]):
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
        for nossas, g in _emparelhar(calcular(jogos), d["classificacao"]):
            esperada = [l["equipa"] for l in g["linhas"]]
            assert [l.equipa for l in nossas] == esperada, (
                f"{d['competicao']['nome']} [{g['nome']}]: ordem diferente da fonte")


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
