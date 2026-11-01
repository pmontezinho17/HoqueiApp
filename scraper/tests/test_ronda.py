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


def _args(destino: pathlib.Path, rever: bool = False) -> argparse.Namespace:
    """Os mesmos valores que o `dados.yml` passa, menos os emblemas (que iriam à rede)."""
    from hoquei.rondas import TOLERANCIA
    return argparse.Namespace(
        tenant="aplisboa", destino=str(destino), id_temp=5,
        emblemas=None, anonimizar_formacao=False,
        rondas=None, tolerancia=TOLERANCIA, sem_guarda=True, rever_boletins=rever, rever_merito=False, reler=None)


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

    def _correr(*, filtrar: bool, hoje: dt.date, destino: pathlib.Path | None = None,
                rever: bool = False):
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
            cli.comando_publicar(_args(destino, rever))
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


class TestOBoletimQueChegaDepois:
    """Um jogo guardado sem boletim volta a pedir-se na ronda das 00:30 — ver
    `_boletim_por_chegar` no `cli.py`. O jogo 10067 esteve dez dias sem ele, e sem Mérito.

    A `FonteFalsa` serve a mesma ficha a todos os jogos, por isso os jogos cujo resultado não
    bate com o dela pedem-se em todas as rondas, como pediria a ronda verdadeira. O que se
    mede é **a diferença**: os jogos que a ronda dava por actuais e que o interruptor manda
    pedir outra vez.
    """

    def _sem_boletim(self, destino: pathlib.Path, data: dt.date | None = None) -> list[str]:
        """Põe as fichas como a primeira ronda depois do apito as deixava, ou só as conta."""
        nulos = []
        for f in sorted((destino / "match").glob("*.json")):
            d = json.loads(f.read_text())
            if data is not None:
                d["boletim"], d["data"] = None, data.isoformat()
                f.write_text(json.dumps(d))
            if d["boletim"] is None:
                nulos.append(f.name)
        return nulos

    def _preparar(self, correr, destino, data):
        correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino)
        self._sem_boletim(destino, data)
        base, _ = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino)
        # o que sobra sem boletim são os jogos que a ronda dá por actuais e não pede
        actuais = self._sem_boletim(destino)
        assert actuais, "nenhum jogo dado por actual — o teste não diria nada"
        return base.por_tipo["ficha"], actuais

    def test_sem_o_interruptor_ficam_como_estao(self, correr, tmp_path):
        """As outras rondas do dia não pagam isto: só a das 00:30 passa o `--rever-boletins`."""
        destino = tmp_path / "v1"
        base, actuais = self._preparar(correr, destino, QUARTA_SEM_JOGOS - dt.timedelta(days=5))
        fonte, _ = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino)
        assert fonte.por_tipo["ficha"] == base
        assert self._sem_boletim(destino) == actuais

    def test_na_ronda_das_00_30_pede_se_e_o_boletim_fica(self, correr, tmp_path):
        destino = tmp_path / "v1"
        base, actuais = self._preparar(correr, destino, QUARTA_SEM_JOGOS - dt.timedelta(days=5))
        fonte, _ = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino, rever=True)
        assert fonte.por_tipo["ficha"] == base + len(actuais)
        assert self._sem_boletim(destino) == []
        # com o boletim lá, a ronda das 00:30 seguinte já não paga nada a mais
        fonte, _ = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino, rever=True)
        assert fonte.por_tipo["ficha"] == base

    def test_passado_o_prazo_desiste_se(self, correr, tmp_path):
        """Um boletim que não chegou num mês não se pede para sempre — o 9965, de 27/09."""
        destino = tmp_path / "v1"
        base, actuais = self._preparar(
            correr, destino, QUARTA_SEM_JOGOS - dt.timedelta(days=cli.DIAS_DO_BOLETIM + 1))
        fonte, _ = correr(filtrar=True, hoje=QUARTA_SEM_JOGOS, destino=destino, rever=True)
        assert fonte.por_tipo["ficha"] == base
        assert self._sem_boletim(destino) == actuais

    def test_um_jogo_de_hoje_tambem_conta(self, tmp_path):
        """A ronda das 00:30 corre às 23:30 de Lisboa no Inverno: o jogo é ainda de hoje."""
        f = tmp_path / "1.json"
        f.write_text(json.dumps({"estado": "Jogo Terminado", "boletim": None,
                                 "data": QUARTA_SEM_JOGOS.isoformat()}))
        assert cli._boletim_por_chegar(f, QUARTA_SEM_JOGOS)
        f.write_text(json.dumps({"estado": "Jogo Terminado", "boletim": None, "data": "2026-10-08"}))
        assert not cli._boletim_por_chegar(f, QUARTA_SEM_JOGOS), "um jogo de amanhã não"
        f.write_text(json.dumps({"estado": "Em Jogo", "boletim": None,
                                 "data": QUARTA_SEM_JOGOS.isoformat()}))
        assert not cli._boletim_por_chegar(f, QUARTA_SEM_JOGOS), "nem um jogo a decorrer"


class TestAFichaRelidaDuranteUmMes:
    """Decisão do dono a 01/11/2026: todas as fichas com Mérito, todas as semanas, durante um
    mês — ver `_merito_por_rever`."""

    HOJE = dt.date(2026, 11, 2)
    COM_J = [{"total": -1, "marcas_fora_do_x": {"J": 7}}, {"total": 6}]

    def _ficha(self, tmp_path, merito=COM_J, **campos):
        f = tmp_path / "1.json"
        f.write_text(json.dumps({"estado": "Jogo Terminado", "merito": merito, **campos}))
        return f

    def test_com_uma_semana_rele_se(self, tmp_path):
        assert cli._merito_por_rever(self._ficha(tmp_path, data="2026-10-26"), self.HOJE)

    def test_antes_da_semana_ainda_nao(self, tmp_path):
        assert not cli._merito_por_rever(self._ficha(tmp_path, data="2026-10-27"), self.HOJE)

    def test_relida_ha_menos_de_uma_semana_espera(self, tmp_path):
        f = self._ficha(tmp_path, data="2026-10-12", merito_revisto="2026-10-27")
        assert not cli._merito_por_rever(f, self.HOJE)

    def test_relida_ha_uma_semana_rele_se_outra_vez(self, tmp_path):
        f = self._ficha(tmp_path, data="2026-10-12", merito_revisto="2026-10-26")
        assert cli._merito_por_rever(f, self.HOJE)

    def test_passado_o_mes_a_ficha_esta_fechada(self, tmp_path):
        assert cli._merito_por_rever(self._ficha(tmp_path, data="2026-10-03"), self.HOJE)
        assert not cli._merito_por_rever(self._ficha(tmp_path, data="2026-10-02"), self.HOJE)

    def test_uma_ficha_sem_j_tambem_se_rele(self, tmp_path):
        """As quatro correcções de 31/10/2026 foram em fichas que hoje não têm `J`."""
        sem_j = [{"total": 11}, {"total": 6}]
        assert cli._merito_por_rever(self._ficha(tmp_path, merito=sem_j, data="2026-10-26"), self.HOJE)

    def test_sem_merito_nao_ha_nada_a_reler(self, tmp_path):
        assert not cli._merito_por_rever(self._ficha(tmp_path, data="2026-10-26", merito=None), self.HOJE)

    def test_quatro_releituras_num_mes(self, tmp_path):
        """Os dias 7, 14, 21 e 28, com a ronda das 00:30 a correr todos os dias."""
        f = self._ficha(tmp_path, data="2026-10-01")
        relida = []
        for d in range(0, 40):
            hoje = dt.date(2026, 10, 1) + dt.timedelta(days=d)
            if cli._merito_por_rever(f, hoje):
                relida.append(d)
                f.write_text(json.dumps({**json.loads(f.read_text()), "merito_revisto": hoje.isoformat()}))
        assert relida == [7, 14, 21, 28]


def test_o_botao_do_site_de_testes_rele_so_o_que_se_pediu():
    """O `--reler` do site de testes — ver `_pedido_a_reler`. Sem ele a ronda é a de sempre."""
    from hoquei.cli import _pedido_a_reler
    assert not _pedido_a_reler(None, 9988, True)
    assert _pedido_a_reler("merito", 9988, True)
    assert not _pedido_a_reler("merito", 9988, False)
    assert _pedido_a_reler("9988, 9989", 9989, False)
    assert not _pedido_a_reler("9988", 99880, True)
