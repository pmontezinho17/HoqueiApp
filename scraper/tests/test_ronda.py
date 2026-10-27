"""A ronda inteira, sem rede — o teste de integração que não existia.

## Porque é que isto nasceu agora

A 12/10/2026, ao implementar o filtro das tabelas (`provas_a_pedir.py`), fui ver o que havia
de rede debaixo do `comando_publicar` e **não havia nada**: todos os testes do raspador são de
parsers e de funções puras. O ciclo que escreve *todos* os ficheiros que a app lê nunca tinha
sido corrido num teste.

Foi isso que me fez cortar o item A ao meio. Saltar a **classificação** é um campo de um
ficheiro e a cópia anterior está lá para reutilizar; saltar o **calendário** obrigava a
reconstruir a agenda, as fichas, os emblemas e os quadros a partir do JSON guardado — um
refactor deste ciclo. Refactorizar sem rede o código que produz tudo o que a app lê, para
poupar a segunda metade dos pedidos, era trocar um custo medido por um risco que não sei medir.

Este ficheiro é a rede. Começa pelo que o filtro precisa, e a partir daqui a outra metade
deixa de ser um salto no escuro.

## O que a `Fonte` de mentira faz

Serve as amostras de `data-samples` e **conta os pedidos por tipo**, que é o que interessa
verificar: o filtro não muda o que se publica, muda quantas vezes se vai à APL. Serve o mesmo
calendário e a mesma classificação a todas as provas — para o padrão de pedidos isso é
indiferente, e é o padrão que está em causa.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import pathlib

import pytest
from hoquei import cli, provas_a_pedir

AMOSTRAS = pathlib.Path(__file__).parents[2] / "data-samples/paginas"


def _ler(nome: str, codec: str) -> str:
    return (AMOSTRAS / nome).read_bytes().decode(codec, errors="replace")


class FonteFalsa:
    """O mínimo da `Fonte` que a ronda usa, a servir amostras e a contar pedidos."""

    def __init__(self, *_a, **_k):
        self.por_tipo: dict[str, int] = collections.Counter()
        self.pedidos = 0
        self.falhados = 0

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def _conta(self, tipo: str):
        self.pedidos += 1
        self.por_tipo[tipo] += 1

    def seccao(self, seccion: str, **_params):
        self._conta(seccion)
        nomes = {
            "competiciones": ("apl-competicoes-t5.html", "utf-8"),
            "calendario": ("apl-calendario-432.html", "utf-8"),
            "clasificacion": ("apl-classificacao-432.html", "utf-8"),
        }
        if seccion not in nomes:
            raise AssertionError(f"a ronda pediu uma secção inesperada: {seccion}")
        nome, codec = nomes[seccion]
        return type("R", (), {"html": _ler(nome, codec)})()

    def jogo(self, id_jogo: int):
        self._conta("ficha")
        return type("R", (), {"html": _ler("apl-ficha-seniores-terminado.html", "cp1252")})()


def _args(destino: pathlib.Path) -> argparse.Namespace:
    """Os mesmos valores que o `dados.yml` passa, menos os emblemas (que iriam à rede)."""
    from hoquei.rondas import TOLERANCIA
    return argparse.Namespace(
        tenant="aplisboa", destino=str(destino), id_temp=5,
        emblemas=None, anonimizar_formacao=False,
        rondas=None, tolerancia=TOLERANCIA, sem_guarda=True)


#: Quantas provas a ronda vê neste teste, de 37 que a amostra tem.
#:
#: **Cortar não é fazer de conta.** O que estes testes verificam é o padrão de pedidos e a
#: igualdade dos ficheiros publicados, e nenhuma das duas coisas depende de haver 37 provas —
#: depende de haver mais do que uma e de todas passarem pelo mesmo caminho. Com as 37 a suite
#: levava **80 segundos**, contra 1,4 s de tudo o resto junto, e uma suite lenta é uma suite que
#: alguém acaba por saltar. Com quatro leva menos de três.
PROVAS_NO_TESTE = 4


@pytest.fixture
def correr(tmp_path, monkeypatch):
    """Corre a ronda numa pasta vazia e devolve `(fonte, destino)`."""
    competicoes_reais = cli.competicoes

    def _correr(*, filtrar: bool, hoje: dt.date, destino: pathlib.Path | None = None):
        destino = destino or tmp_path / "v1"
        fonte = FonteFalsa()
        monkeypatch.setattr(cli, "Fonte", lambda *a, **k: fonte)
        monkeypatch.setattr(cli, "competicoes",
                            lambda html: competicoes_reais(html)[:PROVAS_NO_TESTE])
        monkeypatch.setattr(provas_a_pedir, "FILTRAR_TABELAS", filtrar)
        monkeypatch.setattr(cli, "FILTRAR_TABELAS", filtrar, raising=False)
        monkeypatch.setattr(
            cli, "_agora",
            lambda: dt.datetime.combine(hoje, dt.time(14, 0), tzinfo=dt.timezone.utc))
        with open("/dev/null", "w") as mudo:
            monkeypatch.setattr(cli.sys, "stderr", mudo)
            cli.comando_publicar(_args(destino))
        return fonte, destino
    return _correr


QUARTA_SEM_JOGOS = dt.date(2026, 10, 7)
SEGUNDA_DA_VARREDURA = dt.date(2026, 10, 12)


class TestARondaCorre:
    def test_publica_as_competicoes_e_a_agenda(self, correr):
        """Antes de medir poupanças, saber que a ronda faz o que diz que faz."""
        _, destino = correr(filtrar=False, hoje=QUARTA_SEM_JOGOS)
        comp = json.loads((destino / "competitions.json").read_text())
        assert comp["competicoes"], "nenhuma competição publicada"
        assert (destino / "agenda.json").exists()
        assert (destino / "meta.json").exists()
        assert list((destino / "comp").glob("*.json")), "nenhum ficheiro de prova"

    def test_sem_o_interruptor_pede_a_tabela_de_todas(self, correr):
        """A linha de base: duas páginas por prova, como sempre foi."""
        fonte, destino = correr(filtrar=False, hoje=QUARTA_SEM_JOGOS)
        provas = len(json.loads((destino / "competitions.json").read_text())["competicoes"])
        assert fonte.por_tipo["calendario"] == provas
        assert fonte.por_tipo["clasificacion"] == provas
        meta = json.loads((destino / "meta.json").read_text())
        assert meta["tabelas_saltadas"] == 0
        assert meta["tabelas_saltadas_porque"] == {}


class TestComOInterruptorLigado:
    def test_na_primeira_corrida_pede_tudo(self, correr):
        """Não há cópia publicada para reutilizar — em dúvida, pede-se."""
        fonte, destino = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS)
        provas = len(json.loads((destino / "competitions.json").read_text())["competicoes"])
        assert fonte.por_tipo["clasificacion"] == provas
        assert json.loads((destino / "meta.json").read_text())["tabelas_saltadas"] == 0

    def test_na_segunda_corrida_salta_e_poupa(self, correr, tmp_path):
        """**O que isto existe para provar.** Com a mesma pasta e nada de novo, a segunda
        ronda não volta a pedir as tabelas — e diz no `meta.json` quantas saltou e porquê."""
        destino = tmp_path / "v1"
        primeira, _ = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino)
        segunda, _ = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino)

        assert segunda.por_tipo["calendario"] == primeira.por_tipo["calendario"], \
            "o calendário tem de continuar a ser lido em todas as rondas"
        assert segunda.por_tipo["clasificacion"] < primeira.por_tipo["clasificacion"]

        meta = json.loads((destino / "meta.json").read_text())
        assert meta["tabelas_saltadas"] > 0
        assert meta["tabelas_saltadas_porque"], "saltou sem dizer porquê"

    def test_a_tabela_publicada_fica_igual_a_da_ronda_completa(self, correr, tmp_path):
        """**A propriedade que torna isto seguro de publicar.**

        Saltar o pedido não pode mudar um byte do que a app lê. Se mudar, a poupança de
        pedidos passou a alterar a classificação que as pessoas vêem — e esse defeito não
        dava erro nenhum, descobria-se com alguém a olhar para a tabela errada.
        """
        completa = tmp_path / "completa"
        filtrada = tmp_path / "filtrada"
        correr(filtrar=False, hoje=QUARTA_SEM_JOGOS, destino=completa)
        correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=filtrada)
        correr(filtrar=False, hoje=QUARTA_SEM_JOGOS, destino=completa)
        correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=filtrada)

        for a in sorted((completa / "comp").glob("*.json")):
            b = filtrada / "comp" / a.name
            assert b.exists(), f"{a.name} desapareceu com o filtro ligado"
            da, db = json.loads(a.read_text()), json.loads(b.read_text())
            assert da["classificacao"] == db["classificacao"], a.name
            assert da["classificacao_calculada"] == db["classificacao_calculada"], a.name
            assert da["jogos"] == db["jogos"], a.name

    def test_a_agenda_fica_igual(self, correr, tmp_path):
        """A agenda sai do calendário, que se lê sempre — mas vale a pena fixá-lo: é o
        ficheiro que o ecrã de jogos lê, e uma prova que desaparecesse dele não dava erro."""
        completa, filtrada = tmp_path / "c", tmp_path / "f"
        for _ in range(2):
            correr(filtrar=False, hoje=QUARTA_SEM_JOGOS, destino=completa)
            correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=filtrada)
        a = json.loads((completa / "agenda.json").read_text())
        b = json.loads((filtrada / "agenda.json").read_text())
        assert a == b

    def test_no_dia_da_varredura_volta_a_pedir_tudo(self, correr, tmp_path):
        """A rede de segurança semanal, de ponta a ponta."""
        destino = tmp_path / "v1"
        correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino)
        fonte, _ = correr(filtrar=True, hoje=SEGUNDA_DA_VARREDURA, destino=destino)
        provas = len(json.loads((destino / "competitions.json").read_text())["competicoes"])
        assert fonte.por_tipo["clasificacion"] == provas
        assert json.loads((destino / "meta.json").read_text())["tabelas_saltadas"] == 0


class TestOMeritoNaAgenda:
    """O resumo do Mérito que as listas da app desenham — ver `_resumo_do_merito`."""

    FICHA = {"id": 1, "casa": "A", "fora": "B", "merito": [
        {"equipa": "A", "bonificacao": 9, "penalizacao": -8, "avisos": []},
        {"equipa": "B", "bonificacao": 11, "penalizacao": 0, "avisos": []}]}

    def test_cada_conta_fica_com_a_sua_equipa(self):
        assert cli._resumo_do_merito(self.FICHA) == {"casa": [9, -8], "fora": [11, 0]}

    def test_pelo_nome_e_nao_pela_ordem(self):
        trocada = {**self.FICHA, "merito": self.FICHA["merito"][::-1]}
        assert cli._resumo_do_merito(trocada) == {"casa": [9, -8], "fora": [11, 0]}

    def test_uma_penalizacao_em_aberto_vai_marcada(self):
        com_aviso = {**self.FICHA, "merito": [
            {**self.FICHA["merito"][0], "avisos": ["4.1.7 por confirmar"]}, self.FICHA["merito"][1]]}
        assert cli._resumo_do_merito(com_aviso)["por_confirmar"] is True

    def test_sem_merito_nao_ha_resumo(self):
        assert cli._resumo_do_merito({**self.FICHA, "merito": None}) is None
