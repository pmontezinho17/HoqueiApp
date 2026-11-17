"""A ronda inteira da FPP, sem rede, com as páginas verdadeiras de 17/11/2026.

O que se guarda aqui é **a forma da árvore** `/v1/fpp/...`: a app lê-a com o mesmo código que
lê a da APL, e o que muda entre as duas — o prefixo dos emblemas, o dos UID dos calendários, a
fonte no `meta.json` — tem de mudar aqui e em mais lado nenhum. A primeira ronda verdadeira no
site de testes custa ~300 pedidos ao servidor da APL; isto prova o resto antes de os gastar.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import pathlib

import pytest

from hoquei import cli
from hoquei.rondas import TOLERANCIA

AMOSTRAS = pathlib.Path(__file__).parents[2] / "data-samples/paginas"
FICHAS = {18275: "fpp-ficha-placard-18275.html", 18470: "fpp-ficha-2divisao-norte-18470.html"}


def _ler(nome: str, codec: str = "utf-8") -> str:
    return (AMOSTRAS / nome).read_bytes().decode(codec, errors="replace")


class FonteDaFPP:
    def __init__(self):
        self.por_tipo: dict[str, int] = collections.Counter()
        self.pedidos = self.falhados = 0
        self.fichas: list[int] = []

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def seccao(self, seccion: str, **p):
        self.pedidos += 1
        self.por_tipo[seccion] += 1
        nome = {
            "competiciones": "fpp-competicoes-t11.html",
            # Só há classificação gravada da 2.ª Norte; o Placard recebe-a também. Estes testes
            # não lêem o conteúdo da tabela, só onde ela vai parar.
            "clasificacion": "fpp-classificacao-2divisao-norte.html",
            "calendario": {348: "fpp-calendario-placard.html",
                           349: "fpp-calendario-2divisao-norte.html"}.get(p.get("id_comp")),
        }[seccion]
        assert nome, f"pedido inesperado: {seccion} {p}"
        return type("R", (), {"html": _ler(nome)})()

    def jogo(self, id_jogo: int):
        self.pedidos += 1
        self.por_tipo["ficha"] += 1
        self.fichas.append(id_jogo)
        # os jogos sem ficha gravada recebem a da mesma divisão: o que se verifica é o caminho
        nome = FICHAS.get(id_jogo) or (FICHAS[18275] if id_jogo < 18440 else FICHAS[18470])
        return type("R", (), {"html": _ler(nome, "cp1252")})()


@pytest.fixture
def ronda(tmp_path, monkeypatch):
    fonte = FonteDaFPP()
    chamada = {}

    def criar(tenant, **k):
        chamada.update(tenant=tenant, **k)
        fonte.tenant = tenant
        return fonte
    monkeypatch.setattr(cli, "Fonte", criar)
    reais = cli.competicoes
    # as duas competições com calendário gravado — as outras cinco pediam páginas que não há
    monkeypatch.setattr(cli, "competicoes", lambda html: [p for p in reais(html) if p.id in (348, 349)])
    emblemas_pedidos = {}
    monkeypatch.setattr(cli, "garantir",
                        lambda logos, destino, buscar: (emblemas_pedidos.update(logos) or (0, 0)))
    monkeypatch.setattr(cli, "_agora",
                        lambda: dt.datetime(2026, 11, 17, 14, 0, tzinfo=dt.timezone.utc))
    destino = tmp_path / "v1" / "fpp" / "2026-27"
    args = argparse.Namespace(
        tenant="fpp", destino=str(destino), id_temp=11, emblemas=str(tmp_path / "emblemas"),
        anonimizar_formacao=False, rondas=str(tmp_path / "rondas.jsonl"), tolerancia=TOLERANCIA,
        sem_guarda=True, rever_boletins=False, rever_merito=False, reler=None, intervalo=2.0,
        categorias=["CAMPEONATO NACIONAL 1ª DIVISAO", "CAMPEONATO NACIONAL 2ª DIVISAO"])
    with open("/dev/null", "w") as mudo:
        monkeypatch.setattr(cli.sys, "stderr", mudo)
        assert cli.comando_publicar(args) in (0, None)
    return fonte, destino, chamada, emblemas_pedidos


def _json(destino: pathlib.Path, nome: str):
    return json.loads((destino / nome).read_text(encoding="utf-8"))


def test_pede_de_dois_em_dois_segundos(ronda):
    _, _, chamada, _ = ronda
    assert chamada["tenant"] == "fpp" and chamada["intervalo"] == 2.0


def test_le_cada_ficha_jogada_uma_vez(ronda):
    fonte, *_ = ronda
    # 13 do Placard e 27 da 2.ª Norte com resultado a 17/11
    assert len(fonte.fichas) == 40 == len(set(fonte.fichas))


def test_os_emblemas_tem_o_prefixo_da_fpp(ronda):
    _, destino, _, pedidos = ronda
    emblemas = _json(destino, "emblemas.json")
    assert len(emblemas) == 28
    assert all(v.startswith("/emblemas/fpp-") for v in emblemas.values())
    assert all(k.startswith("fpp-") for k in pedidos)
    assert all("fpp.assyssoftware.es" in url for url in pedidos.values())
    for comp in ("348", "349"):
        logos = [e["logo"] for e in _json(destino, f"comp/{comp}.json")["equipas"]]
        assert logos and all(l.startswith("/emblemas/fpp-") for l in logos)


def test_as_zonas_sao_series_e_o_placard_nao(ronda):
    _, destino, *_ = ronda
    provas = {c["id"]: c for c in _json(destino, "competitions.json")["competicoes"]}
    assert set(provas) == {348, 349}
    assert provas[349]["serie"] == "NORTE" and provas[348]["serie"] is None
    agenda = _json(destino, "agenda.json")["jogos"]
    assert {j["comp"] for j in agenda} == {348, 349}


def test_as_categorias_aparecem_com_o_nome_da_app_e_nao_o_da_fonte(ronda):
    """`CAMPEONATO NACIONAL 2ª DIVISAO` são quatro linhas num cartão de 375 px; o filtro do
    workflow usa o nome da fonte e a app recebe o seu, em todos os ficheiros."""
    _, destino, *_ = ronda
    cats = {c["categoria"] for c in _json(destino, "competitions.json")["competicoes"]}
    assert cats == {"1.ª DIVISÃO", "2.ª DIVISÃO"}
    assert {j["cat"] for j in _json(destino, "agenda.json")["jogos"]} == cats
    assert {e["categoria"] for e in _json(destino, "teams.json")["equipas"]} == cats
    assert {c["grupo_id"] for c in _json(destino, "competitions.json")["competicoes"]} == {
        "1-divisao--campeonato-nacional-placard", "2-divisao--campeonato-nacional-2-divisao"}
    # os calendários das equipas seguem o slug da categoria, como a página da equipa
    assert (destino / "team" / "2-divisao--fc-porto-b.ics").exists()


def test_o_meta_diz_que_a_fonte_e_a_fpp(ronda):
    _, destino, *_ = ronda
    meta = _json(destino, "meta.json")
    assert meta["tenant"] == "fpp"
    assert "fpp.assyssoftware.es" in meta["fonte"]


def test_os_calendarios_das_equipas_tem_uid_proprio(ronda):
    _, destino, *_ = ronda
    ics = sorted((destino / "team").glob("*.ics"))
    assert len(ics) == 28
    texto = "".join(f.read_text(encoding="utf-8") for f in ics)
    assert "UID:jogo-fpp-" in texto and "UID:jogo-1" not in texto
    assert "Federação de Patinagem de Portugal" in texto.replace("\r\n ", "")
