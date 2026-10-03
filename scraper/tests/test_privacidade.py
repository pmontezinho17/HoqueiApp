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


def test_anonimizar_tira_os_nomes_do_boletim_e_guarda_a_estrutura(ficha_seniores):
    """O boletim entrou depois desta função existir, e trazia nomes por dentro.

    O capitão é um atleta — nestes escalões, uma criança — e a equipa de arbitragem são
    pessoas identificáveis. O que o boletim tem de estrutural (resultado por parte, faltas,
    horas) não identifica ninguém e fica.
    """
    from hoquei.modelos import para_dicionario
    from hoquei.parsers.jogo import ficha
    from hoquei.privacidade import anonimizar_ficha

    dados = para_dicionario(ficha(ficha_seniores, 1))
    assert dados["boletim"]["capitao_casa"] and dados["boletim"]["oficiais"]

    limpo = anonimizar_ficha(dados)
    assert limpo["boletim"]["capitao_casa"] is None
    assert limpo["boletim"]["capitao_fora"] is None
    assert limpo["boletim"]["oficiais"] == {}
    # e o que não identifica ninguém sobrevive
    assert limpo["boletim"]["parciais"] == dados["boletim"]["parciais"]
    assert limpo["boletim"]["faltas_casa"] == dados["boletim"]["faltas_casa"]
    assert limpo["boletim"]["inicio"] == dados["boletim"]["inicio"]


def test_anonimizar_aguenta_uma_ficha_sem_boletim():
    from hoquei.privacidade import anonimizar_ficha

    limpo = anonimizar_ficha({"equipas": [], "cronologia": [], "boletim": None})
    assert limpo["boletim"] is None
