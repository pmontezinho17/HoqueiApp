"""O `prejogo/` — o que se sabe de um jogo antes de ele começar (#11, fase 1)."""
import json
import pathlib

import pytest

from hoquei.prejogo import calcular, escrever
from hoquei.tabela import calcular_de_json

PUBLICADO = pathlib.Path(__file__).resolve().parents[2] / "web" / "static" / "v1" / "aplisboa" / "2026-27"


def _jogo(id, data, casa, fora, gc=None, gf=None, comp=1, cat="SUB-15"):
    return {"id": id, "data": data, "hora": "10:00", "casa": casa, "fora": fora, "gc": gc, "gf": gf,
            "comp": comp, "prova": f"PROVA {comp}", "cat": cat}


def _ficha(id, casa, fora, golos, intervalo=None):
    """`golos` é a sequência de quem marcou, por ordem: `"c"` ou `"f"`."""
    return {
        "id": id, "casa": casa, "fora": fora,
        "cronologia": [{"tipo": "inicio_parte"}] + [
            {"tipo": "golo", "equipa": casa if g == "c" else fora} for g in golos],
        "boletim": {"parciais": [{"nome": "1ª parte", "casa": intervalo[0], "fora": intervalo[1]}]}
        if intervalo else None,
    }


AGENDA = [
    _jogo(1, "2026-10-01", "A", "B", 3, 1),
    _jogo(2, "2026-10-08", "C", "A", 2, 2),
    _jogo(3, "2026-10-15", "A", "C", 0, 1),
    _jogo(4, "2026-10-22", "B", "C", 0, 0),
    _jogo(9, "2026-11-20", "B", "A"),                                   # por disputar
    _jogo(7, "2026-10-01", "A", "B", 9, 0, comp=99, cat="TORNEIOS PARTICULARES"),
    _jogo(8, "2026-11-21", "A", "B", comp=99, cat="TORNEIOS PARTICULARES"),
]
FICHAS = {
    1: _ficha(1, "A", "B", "fccc", (0, 1)),
    2: _ficha(2, "C", "A", "ccff", (2, 0)),
    3: _ficha(3, "A", "C", "f", (0, 0)),
    # o 4 não tem ficha: não entra nas contas que precisam dela
}


@pytest.fixture
def pre():
    return calcular(AGENDA, FICHAS)


def test_os_jogos_oficiais_e_sem_torneios(pre):
    """Os disputados também, menos o primeiro: no 1 nenhuma das duas equipas tinha jogado."""
    assert sorted(pre) == [2, 3, 4, 9]


def test_um_jogo_disputado_so_conta_os_anteriores(pre):
    """Decisão do dono a 07/11/2026: depois do jogo, os números de antes dele."""
    p = pre[3]                                      # A–C a 15/10: antes, o 1 e o 2
    assert p["casa"]["epoca"]["jogos"] == 2 and p["fora"]["epoca"]["jogos"] == 1
    assert [x["id"] for x in p["casa"]["ultimos"]] == [2, 1]
    # o confronto directo não inclui o próprio jogo
    assert [x["id"] for x in p["confrontos"]] == [2]
    # a série tinha três equipas com jogos, mas o C só um
    assert p["na_serie"] == 3
    # e nada do que veio depois: o 4 e o 3 não estão nos números
    assert pre[2]["fora"]["epoca"]["jogos"] == 1 and pre[2]["casa"]["epoca"]["jogos"] == 0


def test_um_jogo_disputado_nao_muda_com_os_resultados_seguintes():
    antes = calcular(AGENDA, FICHAS)[3]
    depois = calcular(AGENDA + [_jogo(10, "2026-10-29", "A", "C", 9, 0)], FICHAS)[3]
    assert antes == depois


def test_o_mesmo_dia_conta_pela_hora():
    agenda = [{**_jogo(1, "2026-10-01", "A", "B", 1, 0), "hora": "10:00"},
              {**_jogo(2, "2026-10-01", "A", "C", 2, 0), "hora": "16:00"}]
    pre = calcular(agenda, {})
    assert [x["id"] for x in pre[2]["casa"]["ultimos"]] == [1]
    assert 1 not in pre


def test_forma_do_mais_recente_para_o_mais_antigo(pre):
    a = pre[9]["fora"]
    assert a["equipa"] == "A"
    assert [(x["id"], x["em_casa"], x["adversario"], x["marcados"], x["sofridos"]) for x in a["ultimos"]] == [
        (3, True, "C", 0, 1), (2, False, "C", 2, 2), (1, True, "B", 3, 1)]


def test_o_torneio_nao_conta_na_epoca(pre):
    """O 9–0 do Torneio Particular não entra: nem nos jogos, nem nos golos."""
    assert pre[9]["fora"]["epoca"] == {"jogos": 3, "vitorias": 1, "empates": 1, "derrotas": 1,
                                       "marcados": 5, "sofridos": 4, "sem_sofrer": 0, "sem_marcar": 1}


def test_sequencias(pre):
    s = pre[9]["fora"]["sequencias"]
    assert s["resultado"] == {"tipo": "D", "n": 1}
    assert (s["sem_perder"], s["sem_ganhar"], s["a_marcar"], s["a_sofrer"]) == (0, 2, 0, 3)
    # jogo 1: B marcou primeiro; jogo 2: C marcou primeiro; jogo 3: C marcou o único
    assert s["marcou_primeiro"] == {"vezes": 0, "de": 3}
    assert s["sofreu_primeiro"] == {"vezes": 3, "de": 3}
    assert s["ganhou_depois_de_marcar_primeiro"] == {"vezes": 0, "de": 0}
    # ao intervalo: 0–1 a perder (casa), 0–2 a perder (fora), 0–0
    assert s["ganhava_ao_intervalo"] == {"vezes": 0, "de": 3}
    assert s["perdia_ao_intervalo"] == {"vezes": 2, "de": 3}


def test_sem_ficha_nao_conta_no_de(pre):
    """O B–C do jogo 4 não tem ficha: conta na época, não nas sequências da cronologia."""
    b = pre[9]["casa"]
    assert b["epoca"]["jogos"] == 2
    assert b["sequencias"]["ganhava_ao_intervalo"]["de"] == 1
    assert b["sequencias"]["marcou_primeiro"] == {"vezes": 1, "de": 1}
    assert b["sequencias"]["ganhou_depois_de_marcar_primeiro"] == {"vezes": 0, "de": 1}


def test_confronto_directo_visto_da_casa(pre):
    assert pre[9]["confrontos"] == [{"id": 1, "data": "2026-10-01", "comp": 1, "prova": "PROVA 1",
                                     "em_casa": False, "adversario": "A", "marcados": 1, "sofridos": 3}]


def test_lugares_por_jogo_com_empates_partilhados(pre):
    # A: 3 jogos, 1V, 5–4 · B: 2 jogos, 0V, 1–3 · C: 3 jogos, 1V, 3–2
    assert pre[9]["na_serie"] == 3
    assert pre[9]["fora"]["lugares"]["vitorias"] == 1        # A e C com 1/3, empatados
    assert pre[9]["casa"]["lugares"]["vitorias"] == 3
    assert pre[9]["fora"]["lugares"]["marcados"] == 1        # 5/3 contra 1/2 e 3/3
    # sofridos por jogo: C 0,67, A 1,33, B 1,5 — menos é melhor
    assert pre[9]["casa"]["lugares"]["sofridos"] == 3
    assert pre[9]["fora"]["lugares"]["sofridos"] == 2


def test_equipa_sem_jogos():
    pre = calcular([_jogo(5, "2026-11-01", "X", "Y")], {})
    x = pre[5]["casa"]
    assert x["ultimos"] == [] and x["epoca"]["jogos"] == 0 and x["lugares"] == {}
    assert x["sequencias"]["resultado"] is None
    assert pre[5]["na_serie"] == 0


def test_escrever_so_o_que_muda_e_apaga_o_que_sai(tmp_path):
    (tmp_path / "match").mkdir()
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": AGENDA}))
    assert escrever(tmp_path) == (4, 0)
    assert json.loads((tmp_path / "prejogo" / "9.json").read_text())["id"] == 9
    assert escrever(tmp_path) == (0, 0)
    # depois de disputado fica, e igual: os números já eram os de antes dele
    disputado = [dict(j, gc=1, gf=0) if j["id"] == 9 else j for j in AGENDA]
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": disputado}))
    assert escrever(tmp_path) == (0, 0)
    assert (tmp_path / "prejogo" / "9.json").exists()
    # um jogo que sai da agenda leva o ficheiro com ele
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": [j for j in disputado if j["id"] != 9]}))
    assert escrever(tmp_path) == (0, 1)
    assert not (tmp_path / "prejogo" / "9.json").exists()


@pytest.fixture(scope="module")
def publicado():
    if not (PUBLICADO / "agenda.json").exists():
        pytest.skip("sem dados publicados em web/static/v1")
    agenda = json.loads((PUBLICADO / "agenda.json").read_text())["jogos"]
    fichas = {json.loads(f.read_text())["id"]: json.loads(f.read_text())
              for f in (PUBLICADO / "match").glob("*.json")}
    return agenda, fichas, calcular(agenda, fichas)


def test_a_epoca_bate_com_o_motor_das_tabelas(publicado):
    """Onde uma equipa só jogou numa prova, os números da época são os da tabela dessa prova.

    Contra o **nosso** motor de tabelas e não contra a tabela da APL, de propósito. Medido a
    06/11/2026: das 37 equipas comparáveis, 36 batiam com a da APL e uma não — o AE FISICA D A
    dos Sub-15, 50 golos marcados nos resultados e 45 na tabela publicada. Não é uma regra de
    golos máximos (há um 35–2 contado por inteiro nos Sub-17): a série C inteira da tabela da APL
    não bate com o seu próprio calendário, e o `test_reproduz_as_tabelas_publicadas` já o
    apanha. Aqui o que se quer provar é a soma, e o motor das tabelas é uma segunda soma escrita
    à parte e verificada contra 30 tabelas.
    """
    agenda, _, pre = publicado
    # só os por disputar: os dos disputados têm a época de antes deles, e não a da tabela
    por_disputar = {j["id"] for j in agenda if j["gc"] is None}
    pre = {i: p for i, p in pre.items() if i in por_disputar}
    provas_de = {}
    for j in agenda:
        if j["gc"] is not None:
            for e in (j["casa"], j["fora"]):
                provas_de.setdefault((j["cat"], e), set()).add(j["comp"])
    cat_de = {j["comp"]: j["cat"] for j in agenda}
    cat_do_jogo = {j["id"]: j["cat"] for j in agenda}
    epocas = {(cat_do_jogo[p["id"]], p[lado]["equipa"]): p[lado]["epoca"]
              for p in pre.values() for lado in ("casa", "fora")}
    comparadas = 0
    for f in (PUBLICADO / "comp").glob("*.json"):
        d = json.loads(f.read_text())
        for g in calcular_de_json(d["jogos"]):
            for linha in g.linhas:
                chave = (cat_de.get(d["competicao_id"]), linha.equipa)
                if provas_de.get(chave) != {d["competicao_id"]} or chave not in epocas:
                    continue
                e = epocas[chave]
                assert (e["jogos"], e["vitorias"], e["empates"], e["derrotas"], e["marcados"], e["sofridos"]) == (
                    linha.jogos, linha.vitorias, linha.empates, linha.derrotas,
                    linha.golos_marcados, linha.golos_sofridos), chave
                comparadas += 1
    assert comparadas >= 20, f"só {comparadas} equipas comparadas — a amostra encolheu?"


def test_todos_os_jogos_por_disputar_oficiais_tem_prejogo(publicado):
    agenda, _, pre = publicado
    por_disputar = {j["id"] for j in agenda if j["gc"] is None and j["cat"] != "TORNEIOS PARTICULARES"}
    assert por_disputar and por_disputar <= set(pre)


def test_os_disputados_tem_prejogo_a_data(publicado):
    """Medido a 07/11/2026: dos jogos oficiais disputados, só não têm os primeiros de cada
    equipa — aqueles em que nenhuma das duas tinha jogado antes."""
    agenda, _, pre = publicado
    disputados = [j for j in agenda if j["gc"] is not None and j["cat"] != "TORNEIOS PARTICULARES"]
    com = [j for j in disputados if j["id"] in pre]
    assert len(com) / len(disputados) > 0.7
    for j in com:
        p = pre[j["id"]]
        # nada do que se jogou nesse dia depois dele, nem nos dias seguintes
        for lado in ("casa", "fora"):
            assert all(x["data"] <= j["data"] and x["id"] != j["id"] for x in p[lado]["ultimos"]), j["id"]


def test_as_sequencias_da_ficha_tem_cobertura(publicado):
    """Quase todos os jogos disputados têm ficha com golos e parciais — medido a 06/11/2026, 544
    de 545. Se isto cair muito, as percentagens de "marcou primeiro" passam a ser de poucos jogos
    sem ninguém dar por isso."""
    _, _, pre = publicado
    de = [(p[l]["sequencias"]["ganhava_ao_intervalo"]["de"], p[l]["epoca"]["jogos"])
          for p in pre.values() for l in ("casa", "fora") if p[l]["epoca"]["jogos"]]
    assert sum(a for a, _ in de) / sum(b for _, b in de) > 0.9


def test_uma_fase_nova_continua_a_contar_as_anteriores():
    """A 2.ª fase é outra prova, com outro id e outra série — e a época da equipa continua lá.

    A equipa é o escalão e o nome, e não a prova: a forma, a época, o confronto directo e as
    sequências juntam todas as provas do escalão. Pedido do dono a 06/11/2026, antes de haver
    uma 2.ª fase publicada para o verificar com dados reais — ver o teste seguinte.
    """
    fase1 = dict(comp=10)
    agenda = [
        {**_jogo(1, "2026-10-01", "A", "B", 3, 1), "prova": "CAMP. REG. SUB-15 - 1ª FASE - SERIE A", **fase1},
        {**_jogo(2, "2026-10-08", "C", "D", 5, 0), "prova": "CAMP. REG. SUB-15 - 1ª FASE - SERIE B", "comp": 11},
        {**_jogo(3, "2026-10-15", "B", "A", 2, 2), "prova": "CAMP. REG. SUB-15 - 1ª FASE - SERIE A", **fase1},
        # a 2.ª fase junta A e C, que vêm de séries diferentes
        {**_jogo(9, "2027-01-10", "A", "C"), "prova": "CAMP. REG. SUB-15 - 2ª FASE - SERIE A", "comp": 20},
        {**_jogo(8, "2027-01-17", "C", "A"), "prova": "CAMP. REG. SUB-15 - 2ª FASE - SERIE A", "comp": 20},
    ]
    p = calcular(agenda, {})[9]
    assert p["casa"]["epoca"]["jogos"] == 2 and p["fora"]["epoca"]["jogos"] == 1
    assert [x["id"] for x in p["casa"]["ultimos"]] == [3, 1]
    # os lugares comparam as equipas da série nova, com os números da época inteira
    assert p["na_serie"] == 2
    assert p["casa"]["lugares"]["marcados"] == 2 and p["fora"]["lugares"]["marcados"] == 1


@pytest.mark.fonte
def test_as_equipas_de_uma_fase_nova_ja_existiam_na_anterior(publicado):
    """**O que pode partir a 2.ª fase é o nome, e não a fase.** O teste acima prova a conta; este
    vigia a fonte, e só tem o que verificar quando a APL publicar uma 2.ª fase.

    Medido a 06/11/2026: nas Supertaças e nos Torneios de Abertura da formação, **44 dos 103**
    jogos disputados têm pelo menos uma equipa com um nome que não é o do campeonato —
    `SPORTING CP` onde o campeonato diz `SPORTING CP A`, `AE FISICA A` onde diz `AE FISICA D A`.
    Esses jogos não entram na época da equipa do campeonato, e não se juntam à mão: nos Sub-15
    há um `SPORTING CP A` e um `SPORTING CP B`, e nada diz qual dos dois jogou a Supertaça.

    Se a 2.ª fase vier com os nomes da 1.ª, isto passa e o separador conta as duas. Se não
    vier, falha a nomear as equipas — e é **marcado `fonte`** porque a causa é o que a APL
    escreve, e uma diferença de nomes não pode parar a publicação.
    """
    import re
    agenda, _, _ = publicado
    fase_de = lambda prova: int(m.group(1)) if (m := re.search(r"(\d+)ª FASE", prova or "")) else None
    novas = [j for j in agenda if (fase_de(j["prova"]) or 1) >= 2]
    if not novas:
        pytest.skip("ainda não há nenhuma 2.ª fase publicada")
    sem_historia = set()
    for j in novas:
        antes = {e for x in agenda if x["cat"] == j["cat"] and (fase_de(x["prova"]) or 0) == fase_de(j["prova"]) - 1
                 for e in (x["casa"], x["fora"])}
        sem_historia |= {(j["cat"], e) for e in (j["casa"], j["fora"]) if e not in antes}
    assert not sem_historia, f"equipas de uma fase nova sem nome na anterior: {sorted(sem_historia)}"


# --- fase 2: quando marcam, disciplina, treinadores ------------------------------------------

def _ficha_completa():
    """Um 2×20 com prolongamento de 5, penáltis, livres, cartões e os dois treinadores."""
    golo = lambda parte, relogio, equipa, variante=None: {
        "tipo": "golo", "parte": parte, "relogio": relogio, "equipa": equipa, "variante": variante}
    return {
        "id": 1, "casa": "A", "fora": "B", "faltas": [7, 4],
        "equipas": [
            {"nome": "A", "jogadores": [{"nome": "ANA", "papel": None}, {"nome": "TREINA A", "papel": "T"}]},
            {"nome": "B", "jogadores": [{"nome": "ADJUNTO B", "papel": "T2"}, {"nome": "TREINA B", "papel": "T"}]},
        ],
        "cronologia": [
            {"tipo": "inicio_parte", "parte": 1, "relogio": "20:00"},
            golo(1, "19:00", "A"),                      # 1:00 jogado → 1.º quarto
            golo(1, "5:00", "B", "penalti"),            # 15:00 → 2.º quarto
            {"tipo": "penalti_falhado", "parte": 1, "equipa": "A", "variante": "penalti"},
            {"tipo": "cartao", "parte": 1, "equipa": "A", "variante": "azul"},
            {"tipo": "inicio_parte", "parte": 2, "relogio": "20:00"},
            golo(2, "20:00", "A", "livre_direto"),      # 20:00 → 3.º quarto
            golo(2, "0:01", "A"),                       # 39:59 → 4.º quarto
            {"tipo": "cartao", "parte": 2, "equipa": "B", "variante": "vermelho"},
            {"tipo": "inicio_parte", "parte": 3, "relogio": "5:00"},
            golo(3, "2:00", "B"),                       # prolongamento: fora dos quartos
        ],
    }


def test_detalhe_de_um_jogo_visto_da_casa():
    from hoquei.prejogo import _detalhe
    d = _detalhe(_ficha_completa(), casa=True)
    assert d.quartos_marcados == [1, 0, 1, 1] and d.quartos_sofridos == [0, 1, 0, 0]
    assert d.formato == (2, 20)
    assert d.faltas == (7, 4)
    assert (d.azuis, d.amarelos, d.vermelhos) == (1, 0, 0)
    assert d.penaltis == (0, 1) and d.penaltis_contra == (1, 1)
    assert d.livres == (1, 1) and d.livres_contra == (0, 0)
    # o treinador principal, e não o adjunto que aparece primeiro
    assert (d.treinador, d.treinador_adversario) == ("TREINA A", "TREINA B")


def test_detalhe_visto_de_fora_troca_os_lados():
    from hoquei.prejogo import _detalhe
    d = _detalhe(_ficha_completa(), casa=False)
    assert d.quartos_marcados == [0, 1, 0, 0] and d.faltas == (4, 7) and d.vermelhos == 1
    assert d.penaltis == (1, 1) and d.treinador == "TREINA B"


def test_quatro_partes_cada_parte_e_um_quarto():
    from hoquei.prejogo import _detalhe
    f = {"casa": "A", "fora": "B", "cronologia": [
        {"tipo": "inicio_parte", "parte": p, "relogio": "8:00"} for p in (1, 2, 3, 4)] + [
        {"tipo": "golo", "parte": 3, "relogio": "0:30", "equipa": "A"}]}
    d = _detalhe(f, casa=True)
    assert d.quartos_marcados == [0, 0, 1, 0] and d.formato == (4, 8)


def test_sem_relogio_nao_ha_quartos():
    from hoquei.prejogo import _detalhe
    f = {"casa": "A", "fora": "B", "cronologia": [{"tipo": "golo", "parte": 1, "equipa": "A"}]}
    assert _detalhe(f, casa=True).quartos_marcados is None


def test_treinador_e_o_do_ultimo_jogo_e_os_frente_a_frente():
    """Uma troca de treinador conta a partir dela; e o frente a frente vale em qualquer escalão."""
    def ficha(id, casa, fora, tc, tf):
        return {"id": id, "casa": casa, "fora": fora, "faltas": [0, 0], "cronologia": [],
                "equipas": [{"nome": casa, "jogadores": [{"nome": tc, "papel": "T"}]},
                            {"nome": fora, "jogadores": [{"nome": tf, "papel": "T"}]}]}
    agenda = [
        _jogo(1, "2026-10-01", "A", "B", 1, 0),
        _jogo(2, "2026-10-08", "A", "C", 0, 2),
        _jogo(3, "2026-10-09", "X", "Y", 4, 4, cat="SUB-17", comp=2),   # os mesmos treinadores, noutro escalão
        _jogo(9, "2026-11-01", "A", "B"),
    ]
    fichas = {1: ficha(1, "A", "B", "VELHO", "ZE"), 2: ficha(2, "A", "C", "NOVO", "ZE"),
              3: ficha(3, "X", "Y", "NOVO", "ZE")}
    p = calcular(agenda, fichas)[9]
    assert p["casa"]["treinador"] == {"nome": "NOVO", "jogos": 1, "vitorias": 0, "empates": 0, "derrotas": 1}
    # o NOVO e o ZE: 0–2 (o ZE pelo C) e 4–4 nos Sub-17
    assert p["treinadores"] == {"jogos": 2, "vitorias": 0, "empates": 1, "derrotas": 1}


def test_a_fase_2_cobre_os_dados_publicados(publicado):
    """Medido a 06/11/2026 nos 260 prejogo: os 16 083 golos das equipas caem todos num quarto,
    e todas as equipas que já jogaram têm treinador. Se isto cair, a fonte mudou o relógio ou o
    boletim — e o separador passava a mostrar períodos com golos a menos sem ninguém saber."""
    _, _, pre = publicado
    for p in pre.values():
        for lado in ("casa", "fora"):
            e = p[lado]
            assert sum(e["periodos"]["marcados"]) <= e["epoca"]["marcados"], p["id"]
            for chave in ("penaltis", "penaltis_contra", "livres", "livres_contra"):
                marcados, de = e["disciplina"][chave]
                assert 0 <= marcados <= de, (p["id"], chave)
    lados = [p[l] for p in pre.values() for l in ("casa", "fora") if p[l]["epoca"]["jogos"]]
    assert sum(sum(e["periodos"]["marcados"]) for e in lados) / sum(e["epoca"]["marcados"] for e in lados) > 0.95
    assert sum(1 for e in lados if e["treinador"]) / len(lados) > 0.95
