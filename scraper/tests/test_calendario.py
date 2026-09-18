from datetime import date, time

from hoquei.parsers.calendario import calendario, equipas, jogos


def test_equipas_com_nome_do_title_do_logotipo(html_calendario):
    es = equipas(html_calendario)
    assert len(es) == 16
    nomes = {e.nome for e in es}
    assert {"SL BENFICA", "SPORTING CP", "CD PAÇO ARCOS"} <= nomes
    assert all(e.nome for e in es), "nome vazio significa que o title deixou de estar lá"
    assert all(e.logo for e in es)


def test_jogos_lidos_com_data_hora_e_recinto(html_calendario):
    js = jogos(html_calendario)
    assert len(js) == 24
    j = next(x for x in js if x.id == 9289)
    assert (j.data, j.hora) == (date(2026, 9, 19), time(10, 0))  # a fonte escreve "10.00"
    assert (j.casa, j.fora) == ("AE FISICA D", "SPORTING CP")
    assert j.recinto == "PAV. FÍSICA TORRES VEDRAS"
    assert j.jornada == "1ª JORNADA - 1ª FASE"


def test_jogo_por_disputar_nao_inventa_resultado(html_calendario):
    j = next(x for x in jogos(html_calendario) if x.id == 9289)
    assert (j.golos_casa, j.golos_fora) == (None, None)
    assert not j.disputado


def test_linha_de_cabecalho_nao_entra_como_jogo(html_calendario):
    assert all(j.casa != "Visitado" for j in jogos(html_calendario))


def test_todos_os_jogos_tem_id_e_jornada(html_calendario):
    for j in jogos(html_calendario):
        assert j.id is not None, "sem id não se chega à ficha de jogo"
        assert j.jornada


def test_calendario_junta_tudo(html_calendario):
    c = calendario(html_calendario, 432, 5)
    assert (c.competicao_id, c.temporada_id) == (432, 5)
    assert len(c.equipas) == 16 and len(c.jogos) == 24
