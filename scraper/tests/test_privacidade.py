from hoquei.privacidade import anonimizar_ficha, escalao_permite_individual


def test_seniores_e_escaloes_altos_podem_publicar_nomes():
    for categoria in ("SENIORES MASCULINOS", "SENIORES FEMININOS", "SUB-23", "SUB-19", "SUB-17"):
        assert escalao_permite_individual(categoria) is True


def test_escaloes_de_formacao_nao_podem():
    for categoria in ("SUB-15", "SUB-13", "ESCOLARES", "BENJAMINS", "BAMBIS", "INFANTIS"):
        assert escalao_permite_individual(categoria) is False


def test_categoria_desconhecida_e_tratada_como_restrita():
    """Na dúvida restringe: um escalão novo não deve começar a publicar nomes sozinho."""
    for categoria in (None, "", "TORNEIOS PARTICULARES", "QUALQUER COISA NOVA"):
        assert escalao_permite_individual(categoria) is False


def test_anonimizacao_tira_pessoas_e_mantem_o_jogo():
    ficha = {
        "casa": "A", "fora": "B", "golos_casa": 2, "golos_fora": 1,
        "arbitros": ["FULANO"],
        "equipas": [{"nome": "A", "jogadores": [{"nome": "CRIANÇA", "golos": 2}]}],
        "cronologia": [
            {"tipo": "golo", "minuto": 4, "equipa": "A", "golos_casa": 1, "golos_fora": 0,
             "jogador": "CRIANÇA", "assistencia": "OUTRA CRIANÇA",
             "texto": "Golo para A | CRIANÇA | Assistência por OUTRA CRIANÇA"},
        ],
    }
    limpa = anonimizar_ficha(ficha)
    inteiro = str(limpa)
    assert "CRIANÇA" not in inteiro and "FULANO" not in inteiro
    assert limpa["individuais_omitidos"] is True
    # o jogo sobrevive: resultado, minuto, equipa e o facto de ter havido golo
    assert limpa["golos_casa"] == 2
    evento = limpa["cronologia"][0]
    assert (evento["tipo"], evento["minuto"], evento["equipa"]) == ("golo", 4, "A")
    assert evento["texto"] == "Golo para A"


def test_anonimizacao_nao_altera_o_original():
    original = {"equipas": [{"nome": "A", "jogadores": [{"nome": "X"}]}], "cronologia": [], "arbitros": ["Y"]}
    anonimizar_ficha(original)
    assert original["equipas"][0]["jogadores"] == [{"nome": "X"}]
