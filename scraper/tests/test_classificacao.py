"""A classificação tem invariantes aritméticos fortes — é o parser mais fácil de validar
sem copiar valores da fonte."""
import pytest

from hoquei.parsers.calendario import jogos
from hoquei.parsers.classificacao import classificacao


@pytest.fixture(scope="session")
def tabela(html_classificacao):
    return classificacao(html_classificacao, 432, 5)


def test_grupos_lidos_com_o_rotulo_certo(tabela):
    # os grupos não têm marcação que os ligue à tabela: o nome está num <p> anterior
    assert [g.nome for g in tabela.grupos] == ["SERIE A", "SERIE B", "SERIE C", "SERIE D"]
    assert all(len(g.linhas) == 4 for g in tabela.grupos)


def test_posicoes_sequenciais_em_cada_grupo(tabela):
    for g in tabela.grupos:
        assert [l.posicao for l in g.linhas] == list(range(1, len(g.linhas) + 1))


def test_jogos_igual_a_vitorias_mais_empates_mais_derrotas(tabela):
    for g in tabela.grupos:
        for l in g.linhas:
            assert l.vitorias + l.empates + l.derrotas == l.jogos, f"{g.nome} {l.equipa}"


def test_diferenca_de_golos_coerente(tabela):
    for g in tabela.grupos:
        for l in g.linhas:
            assert l.golos_marcados - l.golos_sofridos == l.diferenca, f"{g.nome} {l.equipa}"


def test_pontuacao_de_hoquei_tres_um_zero(tabela):
    for g in tabela.grupos:
        for l in g.linhas:
            assert l.pontos == 3 * l.vitorias + l.empates, f"{g.nome} {l.equipa}"


def test_racio_ausente_quando_nao_sofreu_golos(tabela):
    """A fonte escreve "-" em vez de uma divisão por zero — não pode virar 0.0."""
    for g in tabela.grupos:
        for l in g.linhas:
            if l.golos_sofridos == 0 and l.golos_marcados > 0:
                assert l.racio is None, f"{l.equipa} devia ter rácio indefinido"
            elif l.golos_sofridos:
                assert l.racio == pytest.approx(l.golos_marcados / l.golos_sofridos, abs=0.01)


def test_classificacao_bate_certo_com_o_calendario(tabela, html_calendario):
    """Cruzamento entre dois parsers independentes: os golos somados dos jogos disputados
    têm de dar exatamente os golos marcados e sofridos da tabela."""
    marcados: dict[str, int] = {}
    sofridos: dict[str, int] = {}
    for j in jogos(html_calendario):
        if not j.disputado:
            continue
        marcados[j.casa] = marcados.get(j.casa, 0) + j.golos_casa
        sofridos[j.casa] = sofridos.get(j.casa, 0) + j.golos_fora
        marcados[j.fora] = marcados.get(j.fora, 0) + j.golos_fora
        sofridos[j.fora] = sofridos.get(j.fora, 0) + j.golos_casa

    verificadas = 0
    for g in tabela.grupos:
        for l in g.linhas:
            if l.equipa in marcados:
                assert (l.golos_marcados, l.golos_sofridos) == (marcados[l.equipa], sofridos[l.equipa]), l.equipa
                verificadas += 1
    assert verificadas >= 8, "poucas equipas cruzadas — as amostras estão dessincronizadas"
