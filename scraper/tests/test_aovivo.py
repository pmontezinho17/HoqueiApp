"""A ronda ao vivo escreve o minuto do jogo na agenda — e apaga-o quando o jogo fecha.

A lista de jogos dizia só "AO VIVO", e saber se o jogo ia no início ou no fim é o que
decide se vale a pena entrar. A ficha já vem no mesmo pedido, portanto não há pedidos
extra: o que há é o risco de a marca ficar lá depois do apito, e é isso que estes testes
guardam. A fonte é falsa de propósito — o que está em teste é o que se escreve na agenda,
não o parser, que tem os seus testes em `test_jogo.py`.
"""

import json
import pathlib
import types
from argparse import Namespace
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pytest

from hoquei import cli
from hoquei.modelos import FichaJogo

ID = 9999
COMP = 450


class _FonteFalsa:
    """Devolve sempre a mesma página; o `cli.ficha` está trocado por um duplo."""

    def __init__(self, *_, **__):
        self.pedidos = 0

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def jogo(self, id_jogo: int):
        self.pedidos += 1
        return types.SimpleNamespace(html="")

    def seccion(self, *_, **__):
        # a classificação não interessa aqui; o comando apanha a excepção e segue
        raise RuntimeError("sem classificação no teste")


def _agenda(tmp_path: pathlib.Path) -> pathlib.Path:
    """Um jogo de hoje que começou há dez minutos, para cair na janela da ronda."""
    agora = datetime.now(ZoneInfo("Europe/Lisbon"))
    inicio = (agora - timedelta(minutes=10)).strftime("%H:%M")
    (tmp_path / "match").mkdir(parents=True, exist_ok=True)
    (tmp_path / "meta.json").write_text(json.dumps({"generated_at": "2026-10-04T00:00:00+00:00"}))
    (tmp_path / "agenda.json").write_text(
        json.dumps({"jogos": [{
            "id": ID, "data": agora.date().isoformat(), "hora": inicio,
            "casa": "A", "fora": "B", "gc": None, "gf": None,
            "recinto": None, "comp": COMP, "prova": "P", "cat": "SUB-15",
        }]})
    )
    return tmp_path


def _ficha(estado: str | None, periodo: str | None, relogio: str | None,
           situacao: str | None, gc: int, gf: int) -> FichaJogo:
    return FichaJogo(
        id=ID, competicao="P", casa="A", fora="B", golos_casa=gc, golos_fora=gf,
        estado=estado, data=date.today(), hora=time(11, 0), recinto=None,
        situacao=situacao, periodo=periodo, relogio=relogio,
    )


def _correr(tmp_path: pathlib.Path, fx: FichaJogo, monkeypatch) -> dict:
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha", lambda _html, _id: fx)
    args = Namespace(destino=str(tmp_path), tenant="aplisboa", janela=3,
                     antes=25, todos=False, id_temp=5)
    assert cli.comando_aovivo(args) == 0
    return json.loads((tmp_path / "agenda.json").read_text())["jogos"][0]


def test_jogo_a_decorrer_leva_fase_e_relogio_para_a_agenda(tmp_path, monkeypatch):
    j = _correr(tmp_path, _ficha(None, "2ª Parte", "7:42", "2ª Parte (7:42)", 2, 1),
                monkeypatch)
    assert j["ao_vivo"] is True
    assert (j["periodo"], j["relogio"]) == ("2ª Parte", "7:42")
    assert j["situacao"] == "2ª Parte (7:42)"
    assert (j["gc"], j["gf"]) == (2, 1)


def test_ao_intervalo_nao_ha_relogio_mas_ha_situacao(tmp_path, monkeypatch):
    """Ao intervalo a fonte não dá relógio — e era aí que a app não dizia nada."""
    j = _correr(tmp_path, _ficha(None, "Intervalo", None, "Intervalo", 2, 1), monkeypatch)
    assert j["situacao"] == "Intervalo"
    assert "relogio" not in j


def test_o_apito_final_apaga_a_marca_e_o_minuto(tmp_path, monkeypatch):
    """O pior resultado possível é um jogo acabado que fica com o relógio a correr."""
    _correr(tmp_path, _ficha(None, "2ª Parte", "7:42", "2ª Parte (7:42)", 2, 1), monkeypatch)
    j = _correr(tmp_path, _ficha("Jogo Terminado", None, None, "Jogo Terminado", 3, 1),
                monkeypatch)
    for chave in ("ao_vivo", "periodo", "relogio", "situacao"):
        assert chave not in j, f"{chave} ficou na agenda depois do apito final"
    assert (j["gc"], j["gf"]) == (3, 1)


def test_uma_ronda_e_um_pedido_por_jogo(tmp_path, monkeypatch):
    """Isto corre contra o servidor de uma federação: um jogo, um pedido."""
    fontes: list[_FonteFalsa] = []

    class Espia(_FonteFalsa):
        def __init__(self, *a, **k):
            super().__init__(*a, **k)
            fontes.append(self)

    monkeypatch.setattr(cli, "Fonte", Espia)
    monkeypatch.setattr(cli, "ficha",
                        lambda _h, _i: _ficha(None, "1ª Parte", "3:10", "1ª Parte (3:10)", 0, 0))
    args = Namespace(destino=str(tmp_path), tenant="aplisboa", janela=3,
                     antes=25, todos=False, id_temp=5)
    assert cli.comando_aovivo(args) == 0
    assert [f.pedidos for f in fontes] == [1]


@pytest.fixture(autouse=True)
def arvore(tmp_path):
    """A árvore publicada que a ronda lê e reescreve."""
    _agenda(tmp_path)


def test_ronda_completa_nao_publica_parcial_como_final():
    """O bug de 04/10 às 16:26, fixado onde ele nasceu.

    A ronda completa monta a agenda a partir da página de **calendário**, que durante um
    jogo mostra o resultado corrente sem dizer que ainda está a contar. Apanhou o
    Lourinhã–Stuart ao minuto 1, leu 0–0, e a app mostrou "terminado 0–0" o resto do dia.
    O jogo acabou 9–1.
    """
    from hoquei.cli import _marcar_em_curso

    entrada = {"id": 9616, "gc": 0, "gf": 0}
    _marcar_em_curso(entrada, {"situacao": "1ª Parte (19:00)", "periodo": "1ª Parte",
                               "relogio": "19:00"})
    assert entrada["ao_vivo"] is True
    assert entrada["relogio"] == "19:00"

    _marcar_em_curso(entrada, {"situacao": "Jogo Terminado"})
    for chave in ("ao_vivo", "periodo", "relogio", "situacao"):
        assert chave not in entrada


def test_um_jogo_por_comecar_nao_e_marcado_a_decorrer():
    """A ronda ao vivo vai buscar a ficha 25 min antes, e aí ainda não há jogo nenhum."""
    from hoquei.cli import _marcar_em_curso

    entrada = {"id": 1}
    for situacao in (None, "Jogo sem começar", "Jogo não iniciado", "Jogo Adiado"):
        _marcar_em_curso(entrada, {"situacao": situacao})
        assert "ao_vivo" not in entrada, situacao


def test_proxima_hora_ignora_ontem_e_o_que_ja_passou():
    from hoquei.cli import _proxima_hora
    from datetime import datetime

    agenda = [
        {"data": "2026-10-05", "hora": "09:00"},
        {"data": "2026-10-04", "hora": "10:00"},
        {"data": "2026-10-04", "hora": "16:30"},
        {"data": "2026-10-04", "hora": "18:00"},
    ]
    agora = datetime(2026, 10, 4, 11, 0)
    assert _proxima_hora(agenda, "2026-10-04", agora) == "16:30"
    assert _proxima_hora(agenda, "2026-10-04", datetime(2026, 10, 4, 19, 0)) is None
