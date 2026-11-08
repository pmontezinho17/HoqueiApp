"""A probabilidade antes do jogo (#11, fase 3) — ver a docstring de `probabilidade.py`."""
import json
import pathlib

import pytest

from hoquei.prejogo import calcular
from hoquei.probabilidade import Previsor, administrativos, chave, em_percentagem, medir, previsoes

PUBLICADO = pathlib.Path(__file__).resolve().parents[2] / "web" / "static" / "v1" / "aplisboa" / "2026-27"


def _jogo(id, data, casa, fora, gc=None, gf=None, cat="SUB-15"):
    return {"id": id, "data": data, "hora": "10:00", "casa": casa, "fora": fora, "gc": gc, "gf": gf,
            "comp": 1, "prova": "P", "cat": cat}


AGENDA = [
    _jogo(1, "2026-10-01", "A", "B", 8, 0),
    _jogo(2, "2026-10-01", "C", "D", 1, 1),
    _jogo(3, "2026-10-08", "B", "C", 2, 3),
    _jogo(4, "2026-10-08", "D", "A", 0, 6),
    _jogo(9, "2026-11-01", "A", "C"),
    _jogo(10, "2026-11-01", "B", "E"),          # o E nunca jogou
]


def test_so_ha_probabilidade_quando_as_duas_ja_jogaram():
    p = previsoes(AGENDA)
    assert p[1] is None and p[2] is None        # primeira jornada
    assert p[10] is None                        # o E ainda não jogou
    assert p[3] is not None and p[9] is not None


def test_quem_ganhou_tudo_por_muito_e_favorito():
    v, e, d = previsoes(AGENDA)[9]
    assert v > d > e
    assert abs(v + e + d - 1) < 1e-9


def test_um_jogo_disputado_e_previsto_sem_o_proprio_resultado():
    antes = previsoes(AGENDA)[3]
    outro = [dict(j, gc=0, gf=20) if j["id"] == 3 else j for j in AGENDA]
    assert previsoes(outro)[3] == antes


def test_um_adiado_por_disputar_conta_com_tudo_o_que_ja_se_jogou():
    """Um jogo adiado fica com a data antiga e vem atrás dos que já se jogaram."""
    adiado = AGENDA + [_jogo(11, "2026-09-20", "A", "C")]
    assert previsoes(adiado)[11] == previsoes(AGENDA)[9]


def test_uma_goleada_ao_mais_fraco_nao_faz_esperar_golos_contra_um_bom():
    """O caso do dono a 07/11/2026: o CD PAÇO ARCOS A tinha 24–0 e 26–0 ao SC TORRES, e o
    separador dava-lhe 67% contra o AD OEIRAS A, que é do mesmo nível. Com os golos ajustados ao
    adversário, o 26–0 explica-se pela defesa do mais fraco — todos lhe marcam muitos — e o jogo
    entre os dois bons espera os golos que eles marcam um ao outro."""
    def j(id, data, casa, fora, gc, gf):
        return {**_jogo(id, data, casa, fora, gc, gf), "cat": "SUB-13"}
    agenda = [j(1, "2026-10-01", "A", "W", 26, 0), j(2, "2026-10-01", "B", "W", 15, 0),
              j(3, "2026-10-02", "C", "W", 14, 0), j(4, "2026-10-03", "W", "D", 0, 16),
              j(5, "2026-10-08", "A", "B", 1, 0), j(6, "2026-10-15", "B", "A", 3, 2),
              j(7, "2026-10-16", "A", "C", 4, 1), j(8, "2026-10-16", "B", "D", 4, 1)]
    p = Previsor()
    for x in sorted(agenda, key=chave):
        p.aprender(x)
    contra_o_bom = p.golos_esperados(("SUB-13", "A"), ("SUB-13", "B"))
    contra_o_fraco = p.golos_esperados(("SUB-13", "A"), ("SUB-13", "W"))
    assert max(contra_o_bom) < 4          # medido: 2,1–1,7
    assert contra_o_fraco[0] > 15         # medido: 23,6


def test_um_resultado_da_secretaria_nao_ensina_nada():
    """O AE FISICA D A–FSE/AJ SALESIANA dos Sub-13: 0–0 ao intervalo e 0–10 no fim, com os dez
    golos no mesmo instante e sem marcador. Medido a 07/11/2026: 6 jogos assim na época."""
    golo = lambda parte, relogio, jogador=None: {"tipo": "golo", "parte": parte, "relogio": relogio,
                                                  "equipa": "B", "jogador": jogador}
    fichas = {
        1: {"cronologia": [golo(2, "0:00") for _ in range(10)]},
        2: {"cronologia": [golo(1, "10:00", "ANA"), golo(1, "10:00", "RITA"), golo(2, "3:00")]},
        3: {"cronologia": []},
    }
    assert administrativos(fichas) == {1}
    agenda = AGENDA + [_jogo(5, "2026-10-09", "A", "C", 0, 10)]
    normal, sem = previsoes(agenda)[9], previsoes(agenda, {5})[9]
    assert sem == previsoes(AGENDA)[9] and sem[0] > normal[0]


def test_em_percentagem_soma_100():
    assert em_percentagem((1 / 3, 1 / 3, 1 / 3)) == {"casa": 34, "empate": 33, "fora": 33}
    assert sum(em_percentagem((0.615, 0.049, 0.336)).values()) == 100
    assert em_percentagem(None) is None


def test_nunca_100_contra_0():
    """Uma previsão não é uma certeza — o AD OEIRAS A–CRIAR-T GD de 06/11/2026 saía 100–0–0."""
    assert em_percentagem((0.997, 0.002, 0.001)) == {"casa": 98, "empate": 1, "fora": 1}
    assert em_percentagem((0.001, 0.004, 0.995)) == {"casa": 1, "empate": 1, "fora": 98}


def test_vai_no_prejogo():
    pre = calcular(AGENDA, {})
    assert pre[9]["probabilidade"] and sum(pre[9]["probabilidade"].values()) == 100
    assert pre[10]["probabilidade"] is None


@pytest.fixture(scope="module")
def medida():
    if not (PUBLICADO / "agenda.json").exists():
        pytest.skip("sem dados publicados em web/static/v1")
    agenda = json.loads((PUBLICADO / "agenda.json").read_text())["jogos"]
    fichas = {}
    for f in (PUBLICADO / "match").glob("*.json"):
        d = json.loads(f.read_text())
        fichas[d["id"]] = d
    return medir([j for j in agenda if j["cat"] != "TORNEIOS PARTICULARES"], administrativos(fichas))


def test_acerta_bem_mais_do_que_o_acaso(medida):
    """Medido a 07/11/2026 em 406 jogos, setembro incluído e sem os resultados da secretaria:
    o favorito ganhou 80,5% (log loss 0,488), e sem modelo o mais provável acontecia em 47%. Não se pede que acerte sempre — é uma previsão —, mas se
    cair abaixo de 70% alguma coisa mudou nos dados ou no código."""
    assert medida["jogos"] >= 300
    assert medida["acerto"] > 0.70
    assert medida["logloss"] < 0.65


def test_nao_mente_sobre_a_propria_confianca(medida):
    """**O que importa numa probabilidade**: dito 75%, acontece perto de 75%.

    A tolerância é a do acaso e não um número fixo: numa caixa de n jogos em que se disse p, o
    que acontece varia naturalmente uns √(p(1−p)/n) — 7 pontos com 46 jogos a 55%. Aceita-se
    até 2,5 vezes isso. Medido a 07/11/2026, a caixa que mais se afastava era a de 90–100%: 96%
    dito, 98% acontecido, em 136 jogos — 1,2 vezes. Um modelo que se torne confiante de mais
    passa disto nas caixas grandes, onde o acaso já não o cobre.
    """
    import math
    for caixa, c in medida["calibracao"].items():
        if c["jogos"] >= 30:
            acaso = math.sqrt(c["dito"] * (1 - c["dito"]) / c["jogos"])
            assert abs(c["dito"] - c["aconteceu"]) < 2.5 * acaso, (caixa, c)
