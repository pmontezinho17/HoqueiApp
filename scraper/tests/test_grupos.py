from hoquei.grupos import identificar, separar


def test_sufixo_de_serie_e_separado():
    assert separar("CAMP. REG. SUB-17 - 1ª FASE - SERIE A") == ("CAMP. REG. SUB-17 - 1ª FASE", "A")
    assert separar("CAMP. REG. SUB-13 - 1ª FASE - SERIE D") == ("CAMP. REG. SUB-13 - 1ª FASE", "D")


def test_prova_sem_serie_fica_intacta():
    for nome in ("TAÇA JESUS CORREIA - SENIORES MASCULINOS",
                 "TORNEIO ABERTURA APL SUB-13",
                 "SUPERTAÇA APL SUB-19"):
        assert separar(nome) == (nome, None)


def test_nivel_nao_e_serie():
    """Verificado nos dados: NIVEL distingue provas diferentes, não séries da mesma."""
    base, serie = separar("ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL I - SERIE A")
    assert base == "ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL I"
    assert serie == "A"
    # e sem sufixo de série, o NIVEL permanece no nome base
    assert separar("ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL II")[1] is None


def test_zona_tambem_e_reconhecida():
    assert separar("CAMPEONATO NACIONAL 2ª DIVISAO - ZONA NORTE") == (
        "CAMPEONATO NACIONAL 2ª DIVISAO", "NORTE")


def test_nome_fora_dos_padroes_nao_e_agrupado_a_palpite():
    for nome in ("QUALQUER COISA - INVENTADA AQUI", "JOGO TREINO", "ZECA PINTO"):
        assert separar(nome)[1] is None


def test_series_da_mesma_prova_partilham_grupo_id():
    a = identificar("SUB-17", "CAMP. REG. SUB-17 - 1ª FASE - SERIE A")
    f = identificar("SUB-17", "CAMP. REG. SUB-17 - 1ª FASE - SERIE F")
    assert a["grupo_id"] == f["grupo_id"]
    assert (a["serie"], f["serie"]) == ("A", "F")


def test_o_escalao_faz_parte_do_grupo():
    """Duas provas com o mesmo nome em escalões diferentes não são o mesmo grupo."""
    a = identificar("SUB-15", "CAMP. REG. - 1ª FASE - SERIE A")
    b = identificar("SUB-17", "CAMP. REG. - 1ª FASE - SERIE A")
    assert a["grupo_id"] != b["grupo_id"]


def test_grupo_id_e_estavel_e_sem_acentos():
    g = identificar("SENIORES MASCULINOS", "TAÇA JESUS CORREIA - SENIORES MASCULINOS")
    assert g["grupo_id"] == "seniores-masculinos--taca-jesus-correia-seniores-masculinos"
    assert g["serie"] is None
