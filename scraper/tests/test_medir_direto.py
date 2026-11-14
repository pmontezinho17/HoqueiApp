"""A medição do atraso da "Jogos do Dia" (`medir_direto.py`), sem rede."""
import argparse
import json
import pathlib
from datetime import datetime

import pytest

from hoquei import medir_direto as m

AMOSTRA = pathlib.Path(__file__).parents[2] / "data-samples/paginas/fpp-direto-intervalo.html"


def test_le_a_amostra_de_09_11():
    """A amostra tem um jogo, repetido na versão de telemóvel: lê-se uma vez."""
    jogos = m.jogos_do_dia(AMOSTRA.read_text(encoding="utf-8"))
    assert jogos == [{
        "id_hp": 18924, "competicao": "CN 3ª Divisão Norte A",
        "casa": 'Riba D`Ave HC "B"', "fora": 'HC Braga "B"',
        "resultado": "1-0", "estado": "Intervalo",
    }]


def test_uma_pagina_sem_jogos_da_lista_vazia():
    assert m.jogos_do_dia("<ul class='lista-jogos'></ul>") == []


def test_o_mesmo_jogo_escrito_de_duas_maneiras():
    j = {"casa": "Sporting CP", "fora": "SL Benfica"}
    assert m.mesmo_jogo(j, "SPORTING CP", "SL BENFICA")
    # do lado errado não é o mesmo jogo
    assert not m.mesmo_jogo(j, "SL BENFICA", "SPORTING CP")
    assert m.mesmo_jogo({"casa": "J. Pacense / Des Compagnons", "fora": "AJ Viana"},
                        "J. PACENSE/DES COMPAGNONS", "AJ VIANA")


def test_atraso_de_cada_resultado():
    fichas = [
        {"t": "2026-11-21T19:30:00+00:00", "golos_casa": 0, "golos_fora": 0},
        {"t": "2026-11-21T19:41:00+00:00", "golos_casa": 1, "golos_fora": 0},
        {"t": "2026-11-21T19:41:30+00:00", "golos_casa": 1, "golos_fora": 0},
        {"t": "2026-11-21T20:02:00+00:00", "golos_casa": 1, "golos_fora": 1},
    ]
    diretos = [
        {"t": "2026-11-21T19:30:00+00:00", "resultado": "0-0"},
        {"t": "2026-11-21T19:42:30+00:00", "resultado": "1-0"},
    ]
    assert m.atrasos(fichas, diretos) == [
        {"resultado": "0-0", "na_ficha": "2026-11-21T19:30:00+00:00", "atraso_s": 0},
        {"resultado": "1-0", "na_ficha": "2026-11-21T19:41:00+00:00", "atraso_s": 90},
        {"resultado": "1-1", "na_ficha": "2026-11-21T20:02:00+00:00", "atraso_s": None},
    ]


def test_o_diario_so_escreve_mudancas(tmp_path):
    d = m.Diario(tmp_path / "x.jsonl")
    assert d.escrever("a", {"t": "1", "resultado": "0-0"})
    assert not d.escrever("a", {"t": "2", "resultado": "0-0"})
    assert d.escrever("a", {"t": "3", "resultado": "1-0"})
    assert len((tmp_path / "x.jsonl").read_text().splitlines()) == 2


def _args(tmp_path, dia="2026-11-21"):
    return argparse.Namespace(dia=dia, inicio="17:25", fim="23:00", referencia=18279,
                              ref_inicio="19:20", destino=str(tmp_path))


@pytest.mark.parametrize("hoje, dia", [
    (datetime(2026, 11, 14, 18, 0, tzinfo=m.LISBOA), "2026-11-21"),  # um sábado qualquer
    (datetime(2026, 11, 21, 18, 0, tzinfo=m.LISBOA), "2026-11-28"),  # outro dia pedido à mão
])
def test_fora_do_dia_nao_pede_nada(tmp_path, monkeypatch, hoje, dia):
    """A trava está no código: corra o workflow quando correr, fora de 21/11 não há pedidos."""
    def proibido(*_a, **_k):
        raise AssertionError("pediu à rede fora do dia")
    monkeypatch.setattr(m.httpx, "Client", proibido)
    monkeypatch.setattr(m, "Fonte", proibido)
    assert m.medir(_args(tmp_path, dia), agora=lambda: hoje, dormir=lambda _s: None) == {
        "direto": 0, "ficha": 0}
    assert not list(tmp_path.iterdir())


def test_o_resumo_diz_o_atraso(tmp_path):
    linhas = [
        {"t": "2026-11-21T19:41:00+00:00", "fonte": "ficha", "casa": "SPORTING CP",
         "fora": "SL BENFICA", "golos_casa": 1, "golos_fora": 0},
        {"t": "2026-11-21T19:41:30+00:00", "fonte": "direto", "casa": "Sporting CP",
         "fora": "SL Benfica", "resultado": "1-0"},
        # outro jogo com o mesmo resultado não conta
        {"t": "2026-11-21T19:41:00+00:00", "fonte": "direto", "casa": "AJ Viana",
         "fora": "AD Sanjoanense", "resultado": "1-0"},
    ]
    c = tmp_path / "2026-11-21.jsonl"
    c.write_text("\n".join(json.dumps(x) for x in linhas))
    assert "| 1-0 | 19:41:00 | 30 s |" in m.resumo(c)


def test_o_ciclo_inteiro_no_dia(tmp_path, monkeypatch):
    """Só corre uma vez, a 21/11, por isso o ciclo prova-se aqui: um relógio falso que anda 30 s
    por volta, a "Jogos do Dia" da amostra, e uma ficha que acaba o jogo à terceira leitura."""
    relogio = {"t": datetime(2026, 11, 21, 19, 19, tzinfo=m.LISBOA)}
    pagina = AMOSTRA.read_text(encoding="utf-8")

    class Resp:
        status_code = 200
        text = pagina
        content = pagina.encode()

    class Cliente:
        def __init__(self, *_a, **_k): self.pedidos = 0
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def get(self, url):
            assert url == m.DIRETO
            return Resp()

    leituras = {"n": 0}

    class Ficha:
        def __init__(self, n):
            self.casa, self.fora = "RIBA D AVE HC B", "HC BRAGA B"
            self.golos_casa, self.golos_fora = (0, 0) if n < 2 else (1, 0)
            self.estado = "Jogo Terminado" if n >= 3 else "Em curso"
            self.periodo = self.relogio = None
            self.cronologia = []

    class FonteFalsa:
        def __init__(self, tenant): assert tenant == "fpp"
        def __enter__(self): return self
        def __exit__(self, *_): pass
        def jogo(self, id_jogo):
            leituras["n"] += 1
            return type("R", (), {"html": str(leituras["n"])})()

    monkeypatch.setattr(m.httpx, "Client", Cliente)
    monkeypatch.setattr(m, "Fonte", FonteFalsa)
    monkeypatch.setattr(m, "ficha", lambda html, _id: Ficha(int(html)))

    def dormir(s):
        relogio["t"] += __import__("datetime").timedelta(seconds=max(s, 30))

    args = _args(tmp_path)
    args.inicio, args.fim, args.ref_inicio = "19:19", "19:45", "19:20"
    contas = m.medir(args, agora=lambda: relogio["t"], dormir=dormir)
    # 26 minutos de 30 em 30 s
    assert contas["direto"] == 52
    # a ficha começa às 19:20 e pára 10 minutos depois do "Jogo Terminado" (à 3.ª leitura)
    assert 20 <= contas["ficha"] <= 24
    linhas = (tmp_path / "2026-11-21.jsonl").read_text().splitlines()
    # o jogo da amostra não mudou: uma linha só, e não 52
    assert sum('"id_hp": 18924' in x for x in linhas) == 1
    assert sum('"fonte": "ficha"' in x for x in linhas) == 3
