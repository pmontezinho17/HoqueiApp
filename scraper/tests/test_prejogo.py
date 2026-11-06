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


def test_so_os_jogos_por_disputar_e_sem_torneios(pre):
    assert list(pre) == [9]


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


def test_escrever_so_o_que_muda_e_apaga_os_disputados(tmp_path):
    (tmp_path / "match").mkdir()
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": AGENDA}))
    assert escrever(tmp_path) == (1, 0)
    assert json.loads((tmp_path / "prejogo" / "9.json").read_text())["id"] == 9
    assert escrever(tmp_path) == (0, 0)
    disputado = [dict(j, gc=1, gf=0) if j["id"] == 9 else j for j in AGENDA]
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": disputado}))
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
    assert por_disputar and set(pre) == por_disputar


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
