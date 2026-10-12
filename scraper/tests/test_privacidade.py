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


# ─── a grelha de participação não sai daqui ─────────────────────────────────────

def test_o_merito_publicado_nao_leva_nenhuma_criança(ficha_escolares_com_boletim):
    """O que o Artigo 92.º precisa é quantos jogaram; o boletim diz **quem** jogou o quê.

    Esta é a linha que separa as duas coisas. A grelha `5I` — que meia parte cada criança
    fez — é lida para a conta e morre na função que a lê; o que vai para o ficheiro
    publicado é a soma da equipa. Sem este teste nada impediria alguém de acrescentar
    `atletas: [...]` ao agregado por conveniência de interface.
    """
    import json

    from hoquei.merito import merito_do_jogo
    from hoquei.modelos import para_dicionario
    from hoquei.parsers.participacao import participacao

    lido = participacao(ficha_escolares_com_boletim)
    nomes = [a.nome for lado in lido for a in lado]
    assert len(nomes) == 20, "a amostra tem de ter atletas, senão o teste não prova nada"

    publicado = json.dumps(
        [para_dicionario(m) for m in
         merito_do_jogo("HC ALFA A", "CD BETA A", lido, 0, 5)],
        ensure_ascii=False)
    for nome in nomes:
        assert nome not in publicado, f"{nome} escapou para o ficheiro publicado"
    # nem os números de camisola, que identificam tão bem como o nome dentro de uma equipa
    for numero in {a.numero for lado in lido for a in lado if a.numero}:
        assert f'"{numero}"' not in publicado


def test_o_merito_nao_diz_que_periodo_cada_um_jogou(ficha_escolares_com_boletim):
    """O agregado conta participantes; nunca a grelha, nem resumida por posição."""
    from hoquei.merito import merito_do_jogo
    from hoquei.parsers.participacao import participacao

    lido = participacao(ficha_escolares_com_boletim)
    for m in merito_do_jogo("A", "B", lido, 0, 5):
        campos = set(m.__dict__)
        assert "periodos" not in campos and "atletas_detalhe" not in campos
        assert isinstance(m.atletas, int) and isinstance(m.participantes, int)
