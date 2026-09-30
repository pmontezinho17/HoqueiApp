from datetime import date, time

from hoquei.parsers.calendario import calendario, equipas, jogos


def so_jogos(html):
    lista, ignoradas = jogos(html)
    assert ignoradas == 0, f"{ignoradas} linhas descartadas em silêncio"
    return lista


def test_equipas_com_nome_do_title_do_logotipo(html_calendario):
    es = equipas(html_calendario)
    assert len(es) == 16
    nomes = {e.nome for e in es}
    assert {"SL BENFICA", "SPORTING CP", "CD PAÇO ARCOS"} <= nomes
    assert all(e.nome for e in es), "nome vazio significa que o title deixou de estar lá"
    assert all(e.logo for e in es)


def test_jogos_lidos_com_data_hora_e_recinto(html_calendario):
    js = so_jogos(html_calendario)
    assert len(js) == 31
    j = next(x for x in js if x.id == 9289)
    assert (j.data, j.hora) == (date(2026, 9, 19), time(10, 0))  # a fonte escreve "10.00"
    assert (j.casa, j.fora) == ("AE FISICA D", "SPORTING CP")
    assert j.recinto == "PAV. FÍSICA TORRES VEDRAS"
    assert j.jornada == "1ª JORNADA - 1ª FASE"


def test_jogo_disputado_traz_resultado(html_calendario):
    j = next(x for x in so_jogos(html_calendario) if x.id == 9289)
    assert (j.golos_casa, j.golos_fora) == (1, 1)
    assert j.disputado


def test_jogo_por_disputar_nao_inventa_resultado(html_calendario):
    """A amostra é um snapshot coerente com a da classificação: 7 jogados, 17 por jogar."""
    js = so_jogos(html_calendario)
    assert (sum(j.disputado for j in js), sum(not j.disputado for j in js)) == (7, 24)
    j = next(x for x in js if x.id == 9307)
    assert (j.golos_casa, j.golos_fora) == (None, None)
    assert not j.disputado


def test_linha_de_cabecalho_nao_entra_como_jogo(html_calendario):
    assert all(j.casa != "Visitado" for j in so_jogos(html_calendario))


def test_todos_os_jogos_tem_id_e_jornada(html_calendario):
    for j in so_jogos(html_calendario):
        assert j.id is not None, "sem id não se chega à ficha de jogo"
        assert j.jornada


def test_calendario_junta_tudo(html_calendario):
    c = calendario(html_calendario, 432, 5)
    assert (c.competicao_id, c.temporada_id) == (432, 5)
    assert len(c.equipas) == 16 and len(c.jogos) == 31


def test_nenhuma_linha_com_ficha_de_jogo_e_descartada(html_calendario):
    """Invariante que faltava, e que teria apanhado o bug dos dois layouts.

    A fonte usa 10 colunas em provas com grupo e 9 nas de série única. A primeira versão
    assumia 10 e deitava fora 256 de 307 linhas sem dizer nada — 32 das 37 competições
    apareciam vazias na app. Toda a linha que aponta para uma ficha tem de virar um Jogo.
    """
    import re
    from selectolax.parser import HTMLParser

    esperados = {
        int(m.group(1))
        for linha in HTMLParser(html_calendario).css("div.boxJornada table.jornada tr")
        if (m := re.search(r"partido\.asp\?id=(\d+)", linha.attributes.get("onclick") or ""))
    }
    obtidos = {j.id for j in so_jogos(html_calendario) if j.id}
    assert esperados - obtidos == set(), f"jogos perdidos: {sorted(esperados - obtidos)}"
    assert len(esperados) > 0


def test_provas_sem_grupo_tambem_sao_lidas(html_calendario_sem_grupo):
    """Layout de 9 colunas: o caso maioritário, e o que estava completamente partido."""
    js = so_jogos(html_calendario_sem_grupo)
    assert len(js) > 0
    assert all(j.grupo is None for j in js)
    assert all(j.data and j.casa and j.fora for j in js)
