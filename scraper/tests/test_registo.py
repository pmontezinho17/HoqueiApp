"""O registo de cada ida à APL no observador — ver `registo.py` e o B9.31."""
import json
from datetime import datetime, timezone

from hoquei.fonte import Fonte
from hoquei.registo import carga, registar

QUANDO = datetime(2026, 10, 30, 2, 44, 51, tzinfo=timezone.utc)
AMBIENTE = {"OBSERVADOR": "https://observador.exemplo/", "CHAVE_RONDAS": "segredo",
            "ORIGEM_RONDA": "producao", "GITHUB_RUN_ID": "40993445344"}


class _Resposta:
    def __init__(self, status):
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False


def test_a_ronda_que_nao_publicou_conta_na_mesma():
    """O caso de 30/10/2026: 37 calendários e 2 listas, nada de novo, e conta."""
    c = carga({"calendario": 37, "competiciones": 2}, 0, "producao", QUANDO, "40993445344")
    assert c == {"origem": "producao", "quando": "2026-10-30T02:44:51+00:00",
                 "por_tipo": {"calendario": 37, "competiciones": 2}, "falhados": 0,
                 "corrida": "40993445344"}


def test_quem_nao_pediu_nada_nao_manda_linha():
    assert carga({}, 0, "producao", QUANDO) is None
    assert carga({"ficha": 0}, 0, "aovivo", QUANDO) is None


def test_uma_origem_desconhecida_nao_se_inventa():
    assert carga({"ficha": 1}, 0, "portatil", QUANDO) is None


def test_sem_configuracao_nada_sai_daqui():
    """Em desenvolvimento e nos testes não há variáveis, e nenhum pedido é feito."""
    def abrir(*_a, **_k):
        raise AssertionError("não devia ter tentado enviar")
    assert registar({"ficha": 3}, ambiente={}, abrir=abrir) is False
    sem_chave = {k: v for k, v in AMBIENTE.items() if k != "CHAVE_RONDAS"}
    assert registar({"ficha": 3}, ambiente=sem_chave, abrir=abrir) is False


def test_envia_ao_observador_com_a_chave():
    vistos = []

    def abrir(pedido, timeout):
        vistos.append((pedido, timeout))
        return _Resposta(204)

    assert registar({"ficha": 3}, 1, ambiente=AMBIENTE, abrir=abrir, agora=QUANDO) is True
    pedido, timeout = vistos[0]
    assert pedido.full_url == "https://observador.exemplo/ronda"
    assert pedido.get_method() == "POST"
    assert pedido.get_header("Authorization") == "Bearer segredo"
    assert json.loads(pedido.data) == {"origem": "producao", "quando": "2026-10-30T02:44:51+00:00",
                                       "por_tipo": {"ficha": 3}, "falhados": 1,
                                       "corrida": "40993445344"}
    assert timeout <= 5, "uma medição não pode atrasar um golo"


def test_um_observador_em_baixo_nao_parte_a_ronda(capsys):
    def abrir(*_a, **_k):
        raise OSError("ligação recusada")
    assert registar({"ficha": 3}, ambiente=AMBIENTE, abrir=abrir) is False
    assert "falhou" in capsys.readouterr().err


def test_a_fonte_regista_ao_fechar_mesmo_quando_a_ronda_rebenta(monkeypatch):
    """Os pedidos feitos antes de um erro foram feitos do lado da APL, e contam."""
    registados = []
    monkeypatch.setattr("hoquei.registo.registar",
                        lambda por_tipo, falhados=0: registados.append((dict(por_tipo), falhados)))
    try:
        with Fonte("aplisboa") as fonte:
            fonte.por_tipo["calendario"] = 5
            fonte.falhados = 1
            raise RuntimeError("a ronda rebentou")
    except RuntimeError:
        pass
    assert registados == [({"calendario": 5}, 1)]
