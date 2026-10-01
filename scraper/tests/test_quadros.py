from hoquei.quadros import agregar


def ficha(equipas, omitidos=False):
    d = {"equipas": [{"nome": n, "jogadores": js} for n, js in equipas]}
    if omitidos:
        d["individuais_omitidos"] = True
    return d


def jog(nome, golos=0, assist=0, defesas=0, papel=None):
    return {"nome": nome, "golos": golos, "assistencias": assist,
            "defesas": defesas, "papel": papel}


def test_soma_entre_jogos_e_conta_presencas():
    q = agregar([
        ficha([("A", [jog("ANA", golos=2, assist=1)]), ("B", [jog("BRUNO", golos=1)])]),
        ficha([("A", [jog("ANA", golos=1)]), ("B", [jog("BRUNO")])]),
    ], 1)
    ana = next(j for j in q.jogadores if j["nome"] == "ANA")
    assert (ana["golos"], ana["assistencias"], ana["jogos"]) == (3, 1, 2)
    assert q.jogos_considerados == 2


def test_mesmo_nome_em_clubes_diferentes_sao_pessoas_diferentes():
    q = agregar([ficha([("A", [jog("JOAO SILVA", golos=2)]),
                        ("B", [jog("JOAO SILVA", golos=1)])])], 1)
    assert sorted((j["equipa"], j["golos"]) for j in q.jogadores) == [("A", 2), ("B", 1)]


def test_equipa_tecnica_nao_entra():
    q = agregar([ficha([("A", [jog("TREINADOR", papel="T"), jog("ANA", golos=1)])])], 1)
    assert [j["nome"] for j in q.jogadores] == ["ANA"]


def test_fichas_anonimizadas_sao_ignoradas():
    q = agregar([ficha([("A", [jog("X", golos=3)])], omitidos=True)], 1)
    assert q.jogadores == [] and q.jogos_considerados == 0


def test_inclui_quem_alinhou_sem_marcar():
    """O plantel da página de equipa precisa de todos; o quadro de marcadores filtra."""
    q = agregar([ficha([("A", [jog("ANA", golos=1), jog("SEM NADA")])])], 1)
    assert sorted(j["nome"] for j in q.jogadores) == ["ANA", "SEM NADA"]
    assert [j["nome"] for j in q.jogadores if j["golos"]] == ["ANA"]


def test_ordenado_por_golos_e_depois_assistencias():
    q = agregar([ficha([("A", [
        jog("TRES", golos=3), jog("CINCO", golos=5),
        jog("TRES MAIS ASSIST", golos=3, assist=4),
    ])])], 1)
    assert [j["nome"] for j in q.jogadores] == ["CINCO", "TRES MAIS ASSIST", "TRES"]


def test_tem_defesas_so_quando_alguem_defendeu():
    assert agregar([ficha([("A", [jog("ANA", golos=1)])])], 1).tem_defesas is False
    assert agregar([ficha([("A", [jog("GR", defesas=7)])])], 1).tem_defesas is True
