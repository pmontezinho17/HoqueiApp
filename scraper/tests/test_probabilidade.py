"""A probabilidade antes do jogo (#11, fase 3) — ver a docstring de `probabilidade.py`."""
import json
import pathlib

import pytest

from hoquei.prejogo import calcular
from hoquei.probabilidade import em_percentagem, medir, previsoes

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
    return medir([j for j in agenda if j["cat"] != "TORNEIOS PARTICULARES"])


def test_acerta_bem_mais_do_que_o_acaso(medida):
    """Medido a 07/11/2026 em 413 jogos, setembro incluído: o favorito ganhou 77%, e sem modelo
    o mais provável acontecia em 47%. Não se pede que acerte sempre — é uma previsão —, mas se
    cair abaixo de 70% alguma coisa mudou nos dados ou no código."""
    assert medida["jogos"] >= 300
    assert medida["acerto"] > 0.70
    assert medida["logloss"] < 0.65


def test_nao_mente_sobre_a_propria_confianca(medida):
    """**O que importa numa probabilidade**: dito 75%, acontece perto de 75%. Medido a
    07/11/2026, nenhuma caixa com 30 jogos ou mais se afastava mais de 5 pontos (85% dito, 90%
    acontecido). A tolerância de 12 pontos é para o ruído de caixas pequenas, não para um modelo
    que se tornou confiante de mais."""
    for caixa, c in medida["calibracao"].items():
        if c["jogos"] >= 30:
            assert abs(c["dito"] - c["aconteceu"]) < 0.12, (caixa, c)
