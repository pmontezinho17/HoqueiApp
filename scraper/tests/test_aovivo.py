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

#: O instante em que estes testes vivem — uma quinta-feira às 19:30 em Lisboa.
#:
#: **Fixo, e não `datetime.now()`.** As corridas agendadas das 23:38 e 00:06 UTC falharam
#: duas noites seguidas, 06/10 e 07/10/2026, e nenhuma delas por culpa do código: o `_jogo`
#: abaixo datava o jogo de **hoje** e dava-lhe a hora de `agora - N horas`, o que depois da
#: meia-noite punha o jogo vinte horas no futuro em vez de quatro no passado. Com a hora
#: fixa, o que o teste constrói e o que o código lê concordam a qualquer hora do dia.
AGORA = datetime(2026, 10, 8, 19, 30, tzinfo=ZoneInfo("Europe/Lisbon"))


@pytest.fixture(autouse=True)
def _relogio_parado(monkeypatch):
    """Todos os testes deste ficheiro correm no mesmo instante."""
    monkeypatch.setattr(cli, "_agora", lambda: AGORA)


class _FonteFalsa:
    """Devolve sempre a mesma página; o `cli.ficha` está trocado por um duplo."""

    def __init__(self, *_, **__):
        # os mesmos contadores da `Fonte` a sério: o comando publica-os no `meta.json`, e um
        # duplo que não os tenha faz o comando rebentar em vez de o teste falhar com sentido
        self.pedidos = 0
        self.falhados = 0
        self.por_tipo = {}

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
    """Um jogo que começou há dez minutos, para cair na janela da ronda."""
    agora = AGORA
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


def _args(tmp_path: pathlib.Path, **extra) -> Namespace:
    base = dict(destino=str(tmp_path), tenant="aplisboa", janela=3, antes=25,
                todos=False, id_temp=5, ronda=1, cada_atraso=10, atraso_max=8.0)
    return Namespace(**{**base, **extra})


def _ficha(estado: str | None, periodo: str | None, relogio: str | None,
           situacao: str | None, gc: int, gf: int) -> FichaJogo:
    return FichaJogo(
        id=ID, competicao="P", casa="A", fora="B", golos_casa=gc, golos_fora=gf,
        estado=estado, data=AGORA.date(), hora=time(11, 0), recinto=None,
        situacao=situacao, periodo=periodo, relogio=relogio,
    )


def _correr(tmp_path: pathlib.Path, fx: FichaJogo, monkeypatch) -> dict:
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha", lambda _html, _id: fx)
    args = _args(tmp_path)
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
    args = _args(tmp_path)
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


def test_a_janela_nao_se_parte_a_meia_noite(tmp_path, monkeypatch):
    """Um jogo a decorrer às 23:41 não pode desaparecer da ronda.

    A janela era comparada como texto `"HH:MM"`: às 23:41 o limite de cima — hora mais 25
    minutos — dava `"00:06"`, e `"23:31" <= "00:06"` é falso. O jogo caía fora da ronda no
    momento em que ainda estava a ser jogado. Só se via entre as 23:35 e a meia-noite, que
    é precisamente quando ninguém está a olhar.
    """
    # 23:41 do dia 9, que é o instante em que o defeito aparecia. Fixa-se pelo `_agora`,
    # como todos os outros: a subclasse de `datetime` que estava aqui deixou de ter efeito
    # quando o relógio passou a ser injectável, e um teste que já não testa nada é pior do
    # que não haver teste.
    quase_meia_noite = datetime(2026, 10, 9, 23, 41, tzinfo=ZoneInfo("Europe/Lisbon"))
    monkeypatch.setattr(cli, "_agora", lambda: quase_meia_noite)
    (tmp_path / "match").mkdir(parents=True, exist_ok=True)
    (tmp_path / "meta.json").write_text(json.dumps({"generated_at": "2026-10-09T00:00:00+00:00"}))
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": [{
        "id": ID, "data": "2026-10-09", "hora": "23:31",
        "casa": "A", "fora": "B", "gc": None, "gf": None,
        "recinto": None, "comp": COMP, "prova": "P", "cat": "SUB-15",
    }]}))

    j = _correr(tmp_path, _ficha(None, "1ª Parte", "4:12", "1ª Parte (4:12)", 1, 0), monkeypatch)
    assert j["ao_vivo"] is True, "o jogo das 23:31 saiu da ronda às 23:41"
    assert j["relogio"] == "4:12"


# ─── a recolha dos que escaparam ────────────────────────────────────────────────────────
#
# A 05/10 o `dados.yml` perdeu as corridas das 14h e das 16h e este ciclo não esteve de pé
# entre as 12h30 e as 17h50. O A STUART HCM–PAREDE FC A das 15h30 ficou sem resultado na app
# até à noite — a fonte tinha-o, e tinha-o na página de calendário. A janela de três horas
# serve para decidir quem seguir ao vivo; não pode ser também quem desistimos de ir buscar.


def _agenda_com(tmp_path: pathlib.Path, *jogos: dict) -> None:
    (tmp_path / "match").mkdir(parents=True, exist_ok=True)
    (tmp_path / "meta.json").write_text(json.dumps({"generated_at": "2026-10-04T00:00:00+00:00"}))
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": list(jogos)}))


def _jogo(horas_atras: float, **extra) -> dict:
    """Um jogo que começou há `horas_atras`, com a data e a hora a concordarem entre si."""
    quando = AGORA - timedelta(hours=horas_atras)
    return {
        "id": extra.pop("id", ID),
        "data": quando.date().isoformat(),
        "hora": quando.strftime("%H:%M"),
        "casa": "A", "fora": "B", "gc": None, "gf": None,
        "recinto": None, "comp": COMP, "prova": "P", "cat": "SUB-13",
        **extra,
    }


def test_um_jogo_de_ha_quatro_horas_sem_resultado_e_ido_buscar(tmp_path, monkeypatch):
    """Fora da janela de três horas, mas sem resultado: escapou-nos, não é irrelevante."""
    _agenda_com(tmp_path, _jogo(4))
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha",
                        lambda _h, _i: _ficha("Jogo Terminado", None, None, "Jogo Terminado", 0, 3))
    assert cli.comando_aovivo(_args(tmp_path)) == 0
    j = json.loads((tmp_path / "agenda.json").read_text())["jogos"][0]
    assert (j["gc"], j["gf"]) == (0, 3)


def test_um_jogo_de_ha_quatro_horas_com_resultado_fica_em_paz(tmp_path, monkeypatch):
    """A recolha é para quem ficou sem resultado. O resto não se volta a pedir."""
    _agenda_com(tmp_path, _jogo(4, gc=2, gf=2))
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha", lambda _h, _i: pytest.fail("não devia ter sido pedido"))
    assert cli.comando_aovivo(_args(tmp_path)) == 0


def test_a_marca_de_ao_vivo_presa_horas_depois_e_reconciliada(tmp_path, monkeypatch):
    """O HC VASCO GAMA das 12h estava "2ª Parte (3:41)" às 19h37, sete horas depois.

    Tem resultado, logo a regra do "sem resultado" não o apanha — mas um jogo que diz estar
    a decorrer muito depois da janela é, ele próprio, o sinal de que alguém perdeu o apito
    final.
    """
    _agenda_com(tmp_path, _jogo(7, gc=3, gf=2, ao_vivo=True, periodo="2ª Parte",
                                relogio="3:41", situacao="2ª Parte (3:41)"))
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha",
                        lambda _h, _i: _ficha("Jogo Terminado", None, None, "Jogo Terminado", 5, 2))
    assert cli.comando_aovivo(_args(tmp_path)) == 0
    j = json.loads((tmp_path / "agenda.json").read_text())["jogos"][0]
    assert (j["gc"], j["gf"]) == (5, 2)
    for chave in ("ao_vivo", "periodo", "relogio", "situacao"):
        assert chave not in j, f"{chave} ficou preso na agenda"


def test_um_jogo_adiado_nao_se_pergunta_para_sempre(tmp_path, monkeypatch):
    """Sem este limite, um jogo que nunca teve resultado era um pedido de 5 em 5 minutos
    contra o servidor da associação até à meia-noite."""
    _agenda_com(tmp_path, _jogo(9))
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha", lambda _h, _i: pytest.fail("não devia ter sido pedido"))
    assert cli.comando_aovivo(_args(tmp_path)) == 0


def test_a_recolha_nao_acontece_em_todas_as_rondas(tmp_path, monkeypatch):
    """De 30 em 30 segundos seria um pedido por ronda por jogo em atraso. De 5 em 5 minutos."""
    _agenda_com(tmp_path, _jogo(4))
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha", lambda _h, _i: pytest.fail("não devia ter sido pedido"))
    assert cli.comando_aovivo(_args(tmp_path, ronda=4)) == 0


def test_um_jogo_dentro_da_janela_nao_e_pedido_duas_vezes(tmp_path, monkeypatch):
    """A ronda normal e a recolha não se podem sobrepor: um jogo, um pedido."""
    fontes: list[_FonteFalsa] = []

    class Espia(_FonteFalsa):
        def __init__(self, *a, **k):
            super().__init__(*a, **k)
            fontes.append(self)

    _agenda_com(tmp_path, _jogo(0.2))
    monkeypatch.setattr(cli, "Fonte", Espia)
    monkeypatch.setattr(cli, "ficha",
                        lambda _h, _i: _ficha(None, "1ª Parte", "3:10", "1ª Parte (3:10)", 1, 0))
    assert cli.comando_aovivo(_args(tmp_path)) == 0
    assert [f.pedidos for f in fontes] == [1]


def test_a_recolha_nao_se_confunde_depois_da_meia_noite(tmp_path, monkeypatch):
    """A hora exacta a que a CI falhou duas noites seguidas: 00:38 em Lisboa.

    Este teste existe por causa de um erro **no teste** e não no código. O `_jogo` datava o
    jogo de hoje e dava-lhe a hora de `agora - N horas`; depois da meia-noite isso construía
    um jogo marcado para hoje às 20:38, vinte horas no futuro, e o `em_atraso` ignorava-o com
    razão. As corridas agendadas das 23:38 e 00:06 UTC falharam a 06/10 e a 07/10/2026, e o
    dono recebeu um email de cada vez a dizer que a Action tinha falhado.

    O que se guarda aqui são as duas metades da verdade:

    1. um jogo de **ontem** às 20:38, sem resultado, **não** é perseguido por este ciclo —
       quem fecha o dia é a ronda das 00:30 do `dados.yml`, que raspa tudo de novo;
    2. um jogo de **hoje** que já começou continua a ser apanhado, mesmo às 00:38.
    """
    meia_noite_passada = datetime(2026, 10, 8, 0, 38, tzinfo=ZoneInfo("Europe/Lisbon"))
    monkeypatch.setattr(cli, "_agora", lambda: meia_noite_passada)

    # 1. ontem às 20:38, sem resultado: fica para a ronda que fecha o dia
    _agenda_com(tmp_path, {
        "id": ID, "data": "2026-10-07", "hora": "20:38",
        "casa": "A", "fora": "B", "gc": None, "gf": None,
        "recinto": None, "comp": COMP, "prova": "P", "cat": "SUB-13",
    })
    monkeypatch.setattr(cli, "Fonte", _FonteFalsa)
    monkeypatch.setattr(cli, "ficha", lambda _h, _i: pytest.fail("não devia pedir jogos de ontem"))
    assert cli.comando_aovivo(_args(tmp_path)) == 0

    # 2. hoje às 00:10, meia hora antes: esse é da ronda de agora
    _agenda_com(tmp_path, {
        "id": ID, "data": "2026-10-08", "hora": "00:10",
        "casa": "A", "fora": "B", "gc": None, "gf": None,
        "recinto": None, "comp": COMP, "prova": "P", "cat": "SUB-13",
    })
    monkeypatch.setattr(cli, "ficha",
                        lambda _h, _i: _ficha("Jogo Terminado", None, None, "Jogo Terminado", 4, 1))
    assert cli.comando_aovivo(_args(tmp_path)) == 0
    j = json.loads((tmp_path / "agenda.json").read_text())["jogos"][0]
    assert (j["gc"], j["gf"]) == (4, 1)


# ─── a tabela calculada durante uma jornada ─────────────────────────────────────────────
#
# A 10/10 são 36 jogos num sábado, cinco escalões, e dois deles — Escolares e Benjamins — não
# têm tabela publicada pela fonte: a que a app mostra é a nossa. Estes testes guardam o que
# acontece a essa tabela enquanto os jogos fecham, que é o caminho novo desta semana.


class _FonteContadora(_FonteFalsa):
    """Conta os pedidos à página de classificação, e falha-os como a fonte falharia."""

    def __init__(self, *a, **k):
        super().__init__(*a, **k)
        type(self).tabelas_pedidas = 0

    def seccao(self, *_, **__):
        type(self).tabelas_pedidas += 1
        raise RuntimeError("a fonte não respondeu")


def _comp(tmp_path: pathlib.Path, nome: str, publicada: list, jogos: list) -> pathlib.Path:
    (tmp_path / "comp").mkdir(parents=True, exist_ok=True)
    alvo = tmp_path / "comp" / f"{COMP}.json"
    alvo.write_text(json.dumps({
        "competicao": {"id": COMP, "nome": nome, "categoria": "BENJAMINS"},
        "equipas": [], "jogos": jogos, "classificacao": publicada,
    }))
    return alvo


def test_a_tabela_calculada_acompanha_o_jogo_que_fecha(tmp_path, monkeypatch):
    """Sem isto, os jogos mostram 3-1 e a tabela fica na jornada anterior.

    E **não se pede a tabela à fonte**: nestes escalões ela não publica nenhuma, logo o
    pedido era um pedido inútil ao servidor da federação por cada jogo que fecha.
    """
    jogo = _jogo(0.2)
    _agenda_com(tmp_path, jogo)
    alvo = _comp(
        tmp_path,
        "ENCONTROS DISTRITAIS BENJAMINS - 1ª FASE NIVEL I - SERIE A",
        [],
        [{"id": ID, "casa": "A", "fora": "B", "golos_casa": None, "golos_fora": None,
          "grupo": None, "data": jogo["data"], "hora": jogo["hora"]},
         {"id": 1, "casa": "A", "fora": "C", "golos_casa": 2, "golos_fora": 2,
          "grupo": None, "data": "2026-10-01", "hora": "10:00"}],
    )
    monkeypatch.setattr(cli, "Fonte", _FonteContadora)
    monkeypatch.setattr(cli, "ficha",
                        lambda _h, _i: _ficha("Jogo Terminado", None, None, "Jogo Terminado", 7, 1))
    assert cli.comando_aovivo(_args(tmp_path)) == 0

    d = json.loads(alvo.read_text())
    linhas = {l["equipa"]: l for l in d["classificacao_calculada"][0]["linhas"]}
    assert linhas["A"]["pontos"] == 4, "a vitória de agora não entrou na tabela"
    assert linhas["A"]["golos_marcados"] == 9
    assert linhas["B"]["jogos"] == 1
    assert _FonteContadora.tabelas_pedidas == 0, "pediu à fonte uma tabela que ela não tem"


def test_a_tabela_da_fonte_falhar_nao_salta_a_competicao(tmp_path, monkeypatch):
    """O `continue` que estava aqui deixava a tabela calculada presa na jornada anterior.

    E a tabela publicada que já tínhamos **não** se perde quando o pedido falha: ficar sem
    tabela é pior do que ficar com a da ronda anterior.
    """
    jogo = _jogo(0.2)
    _agenda_com(tmp_path, jogo)
    publicada = [{"nome": None, "linhas": [{"equipa": "A", "pontos": 3}]}]
    alvo = _comp(
        tmp_path, "CAMP. REG. SUB-13 - 1ª FASE - SERIE A", publicada,
        [{"id": ID, "casa": "A", "fora": "B", "golos_casa": None, "golos_fora": None,
          "grupo": None, "data": jogo["data"], "hora": jogo["hora"]}],
    )
    monkeypatch.setattr(cli, "Fonte", _FonteContadora)
    monkeypatch.setattr(cli, "ficha",
                        lambda _h, _i: _ficha("Jogo Terminado", None, None, "Jogo Terminado", 1, 0))
    assert cli.comando_aovivo(_args(tmp_path)) == 0

    d = json.loads(alvo.read_text())
    assert _FonteContadora.tabelas_pedidas == 1, "aqui a tabela é da fonte e tem de ser pedida"
    assert d["classificacao"] == publicada, "perdeu a tabela publicada por o pedido ter falhado"
    # o resultado do jogo chegou ao ficheiro da competição, que é o que alimenta a tabela
    assert [(j["golos_casa"], j["golos_fora"]) for j in d["jogos"]] == [(1, 0)]
