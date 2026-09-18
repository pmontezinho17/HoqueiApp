"""Testes contra HTML gravado: correm sem rede e falham quando a fonte muda de markup."""
from hoquei.parsers.competicoes import competicoes, temporadas


def test_temporadas_sem_duplicados_e_mais_recente_primeiro(html_competicoes):
    ts = temporadas(html_competicoes)
    assert [t.id for t in ts] == [5, 4, 3, 2, 1]
    assert ts[0].rotulo == "2026/27"


def test_competicoes_com_categoria_correta(html_competicoes):
    cs = competicoes(html_competicoes)
    assert len(cs) == 37
    por_id = {c.id: c for c in cs}
    # a regressão que isto guarda: um seletor com vírgula no selectolax devolve os nós
    # agrupados por seletor, o que fazia cair tudo na última categoria
    assert por_id[432].categoria == "SENIORES MASCULINOS"
    assert por_id[432].nome == "TAÇA JESUS CORREIA - SENIORES MASCULINOS"
    assert por_id[433].categoria == "SENIORES FEMININOS"
    assert len({c.categoria for c in cs}) == 9


def test_agenda_desportiva_nao_e_competicao(html_competicoes):
    assert not any("AGENDA" in c.nome.upper() for c in competicoes(html_competicoes))
