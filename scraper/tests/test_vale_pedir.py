"""A regra que decide se uma ronda toca na fonte (08/10/2026).

Medido antes de a escrever: 28 dias sem jogos até dezembro, 145 rondas, ~10 900 pedidos —
28% de tudo o que vamos pedir à APL, gasto em dias sem uma bola a rolar.
"""
import datetime as dt

from hoquei.vale_pedir import CRON_DO_FECHO, decidir

HOJE = dt.date(2026, 10, 8)
ONTEM = dt.date(2026, 10, 7)


def jogo(data: dt.date, **extra):
    return {"id": 1, "data": data.isoformat(), "hora": "20:00", "gc": 2, "gf": 1, **extra}


class TestQuandoCorre:
    def test_ha_jogos_hoje(self):
        correr, porque = decidir([jogo(HOJE)], HOJE)
        assert correr and "1 jogos hoje" in porque

    def test_a_ronda_do_fecho_corre_sempre(self):
        """É ela que estabelece o dia: sem ela não se sabe se amanhã há jogos."""
        correr, porque = decidir([], HOJE, cron=CRON_DO_FECHO)
        assert correr and "fecho do dia" in porque

    def test_um_pedido_manual_corre_sempre(self):
        correr, porque = decidir([], HOJE, forcar=True)
        assert correr and "publicar_sempre" in porque

    def test_em_duvida_corre(self):
        """Uma ronda a mais custa 75 pedidos; uma a menos custa uma tarde de resultados errados."""
        correr, porque = decidir(None, HOJE)
        assert correr and "em dúvida" in porque

    def test_um_jogo_de_ontem_sem_resultado_ainda_vale_uma_ronda(self):
        correr, porque = decidir([jogo(ONTEM, gc=None, gf=None)], HOJE)
        assert correr and "ontem" in porque


class TestQuandoNaoCorre:
    def test_sem_jogos_hoje_e_nada_pendente(self):
        correr, porque = decidir([jogo(ONTEM), jogo(dt.date(2026, 10, 10))], HOJE)
        assert not correr
        assert porque == "sem jogos hoje e nada pendente de ontem"

    def test_uma_agenda_vazia_nao_e_motivo_para_pedir(self):
        assert decidir([], HOJE) == (False, "sem jogos hoje e nada pendente de ontem")

    def test_jogos_de_ontem_todos_com_resultado_nao_obrigam_a_nada(self):
        assert not decidir([jogo(ONTEM), jogo(ONTEM)], HOJE)[0]

    def test_jogos_amanha_nao_sao_motivo_hoje(self):
        """A ronda das 00:30 de amanhã é que os vai buscar, e chega a tempo."""
        assert not decidir([jogo(HOJE + dt.timedelta(days=1))], HOJE)[0]


class TestNaoPedir:
    """Corridas que não têm nada a perguntar à fonte, porque o que querem já está no repo.

    Duas razões, ambas de 09/10/2026. A primeira foi um erro meu: disparar o workflow à mão
    para experimentar o R2 custou ~76 pedidos ao servidor da associação, nenhum necessário.
    A segunda é maior e apareceu horas depois — o servidor da associação ficou em baixo e uma
    correcção pronta não chegava ao site, porque publicar exigia raspar primeiro.
    """

    def test_nao_corre(self):
        correr, porque = decidir([jogo(HOJE)], HOJE, nao_pedir=True)
        assert not correr
        assert porque == "nada a pedir à fonte nesta corrida"

    def test_ganha_ao_forcar(self):
        """`publicar_sempre` não obriga a pedir: publicar é levar código, não raspar."""
        assert not decidir([jogo(HOJE)], HOJE, nao_pedir=True, forcar=True)[0]

    def test_ganha_a_ronda_do_fecho(self):
        """Mesmo na hora do fecho: se a corrida não é para pedir, não pede."""
        assert not decidir(None, HOJE, nao_pedir=True, cron="30 23 * * *")[0]
