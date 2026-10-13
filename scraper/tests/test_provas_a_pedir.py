"""Testes da decisão de pedir ou não a tabela de uma prova.

**O risco deste filtro é cegar-nos, não poupar de menos.** Está escrito no backlog desde
09/10/2026: *"o filtro que poupa pedidos é o mesmo que nos pode cegar, e um erro destes não dá
sinal nenhum: a prova simplesmente para de actualizar e ninguém repara"*. Por isso a maior
parte destes testes verifica as razões para **pedir**, e não as razões para saltar.

Cada teste cita a regra que verifica. As datas são de propósito as de um fim de semana real:
10/10/2026 foi sábado, 11/10 domingo, 12/10 segunda — o dia da varredura.
"""
from __future__ import annotations

import datetime as dt

import pytest
from hoquei.provas_a_pedir import (DIA_DA_VARREDURA, e_dia_de_varredura,
                                   pedir_tabela, resumir)

SABADO = dt.date(2026, 10, 10)
DOMINGO = dt.date(2026, 10, 11)
SEGUNDA = dt.date(2026, 10, 12)
QUARTA = dt.date(2026, 10, 14)


def jogo(data: str, gc=None, gf=None, id=1) -> dict:
    return {"id": id, "data": data, "gc": gc, "gf": gf}


#: para o ajudante poder distinguir "não disse nada" de "disse explicitamente que não há cópia"
IGUAL = object()


def decidir(jogos_agora, jogos_antes=IGUAL, hoje=QUARTA, varredura=False):
    """Por omissão: quarta-feira, fora da varredura, com a cópia publicada igual à de agora.

    O sentinela não é preciosismo: com um `None` por omissão, o teste que passa `None` de
    propósito — "não há cópia publicada" — não conseguia dizê-lo, e passava a medir o caso
    errado sem se notar.
    """
    if jogos_antes is IGUAL:
        jogos_antes = jogos_agora
    return pedir_tabela(jogos_agora=jogos_agora, jogos_antes=jogos_antes,
                        hoje=hoje, varredura=varredura)


class TestQuandoSeSalta:
    def test_uma_prova_terminada_nao_se_pede(self):
        """Todos os jogos com resultado: a tabela dela não muda mais."""
        pedir, porque = decidir([jogo("2026-09-20", 3, 1), jogo("2026-09-27", 0, 5, id=2)])
        assert not pedir
        assert porque == "terminada"

    def test_uma_prova_sem_jogos_no_dia_nao_se_pede(self):
        """Tem jogos por disputar, mas nenhum hoje — a tabela não mexeu desde ontem."""
        pedir, porque = decidir([jogo("2026-09-20", 3, 1), jogo("2026-10-18", id=2)])
        assert not pedir
        assert porque == "sem jogos no dia"


class TestQuandoSePede:
    def test_um_jogo_hoje(self):
        pedir, porque = decidir([jogo("2026-10-14")], hoje=QUARTA)
        assert pedir and porque == "tem jogo hoje"

    def test_um_jogo_hoje_ja_com_resultado_tambem_conta(self):
        """A tabela muda com o resultado, e a ronda das 22:00 vem depois do jogo das 21:00."""
        pedir, _ = decidir([jogo("2026-10-14", 2, 2)], hoje=QUARTA)
        assert pedir

    def test_um_jogo_de_ontem_sem_resultado(self):
        """A mesma rede de segurança que o `vale_pedir` tem para a ronda inteira: a ronda do
        fecho devia tê-lo apanhado, e se não apanhou é quando vale a pena insistir."""
        pedir, porque = decidir([jogo("2026-10-13")], hoje=QUARTA)
        assert pedir and porque == "jogo de ontem ainda sem resultado"

    def test_um_jogo_de_ontem_com_resultado_nao_basta(self):
        """Já está fechado e já foi publicado: não há nada de novo para a tabela."""
        pedir, _ = decidir([jogo("2026-10-13", 1, 0)], hoje=QUARTA)
        assert not pedir

    def test_sem_copia_publicada_pede_se(self):
        """Primeira corrida, ou prova nova: não há nada para reutilizar."""
        pedir, porque = decidir([jogo("2026-11-01")], jogos_antes=None)
        assert pedir and porque == "sem cópia publicada para reutilizar"

    def test_uma_prova_sem_jogos_conhecidos_pede_se(self):
        """**A armadilha do `all([])`.**

        Em Python, `all([])` é `True`. Sem esta guarda, uma prova que a fonte acabou de criar
        — já na lista de competições, ainda sem calendário — passava por "terminada" e nunca
        mais era olhada. É o modo de falha exacto que o backlog descreve: a prova pára de
        actualizar e ninguém repara.
        """
        pedir, porque = decidir([])
        assert pedir and porque == "prova sem jogos conhecidos"

    def test_um_resultado_corrigido_sem_jogo_novo(self):
        """**O travão que trata do caso que nos cegaria.**

        A fonte pode corrigir um resultado dias depois, sem haver jogo nenhum. A tabela dela
        muda e a nossa cópia ficaria velha até à varredura. Como o calendário continua a ser
        lido em todas as rondas, sabemos que mudou sem gastar um pedido.
        """
        antes = [jogo("2026-09-20", 3, 1)]
        agora = [jogo("2026-09-20", 3, 2)]
        pedir, porque = decidir(agora, jogos_antes=antes)
        assert pedir and porque == "os resultados mudaram desde a última publicação"

    def test_um_jogo_novo_acrescentado_pela_fonte(self):
        """Uma eliminatória com mais uma ronda, ou um adiado remarcado."""
        antes = [jogo("2026-09-20", 3, 1)]
        agora = [jogo("2026-09-20", 3, 1), jogo("2026-11-05", id=2)]
        pedir, _ = decidir(agora, jogos_antes=antes)
        assert pedir

    def test_a_hora_ou_o_recinto_mudarem_nao_pede(self):
        """A assinatura é só id e golos, de propósito: um recinto corrigido não mexe na tabela,
        e reagir a isso era pedir a tabela por nada."""
        antes = [{"id": 1, "data": "2026-09-20", "gc": 3, "gf": 1, "hora": "10:00"}]
        agora = [{"id": 1, "data": "2026-09-20", "gc": 3, "gf": 1, "hora": "11:30"}]
        pedir, porque = decidir(agora, jogos_antes=antes)
        assert not pedir and porque == "terminada"


class TestVarredura:
    def test_na_varredura_pede_se_tudo_mesmo_o_que_terminou(self):
        pedir, porque = decidir([jogo("2026-09-20", 3, 1)], varredura=True)
        assert pedir and porque == "varredura semanal — pede-se tudo"

    def test_o_dia_e_fixo_e_e_segunda(self):
        """Dia fixo e não um contador: um contador perde-se quando uma corrida falha, e foi
        exactamente uma cadeia de corridas falhadas que nos custou a noite de 11/10."""
        assert DIA_DA_VARREDURA == 0
        assert e_dia_de_varredura(SEGUNDA)
        for outro in (SABADO, DOMINGO, QUARTA):
            assert not e_dia_de_varredura(outro), outro

    def test_sem_dizer_nada_a_varredura_sai_do_calendario(self):
        """Quem chama não tem de se lembrar do dia: a omissão lê-o da data."""
        pedir, porque = pedir_tabela(jogos_agora=[jogo("2026-09-20", 3, 1)],
                                     jogos_antes=[jogo("2026-09-20", 3, 1)],
                                     hoje=SEGUNDA)
        assert pedir and "varredura" in porque

    def test_e_a_falta_de_copia_manda_mais_do_que_a_varredura(self):
        """A ordem importa só para a razão escrita no log, mas a razão é o que o dono lê."""
        pedir, porque = pedir_tabela(jogos_agora=[], jogos_antes=None, hoje=SEGUNDA)
        assert pedir and porque == "sem cópia publicada para reutilizar"


class TestResumo:
    def test_conta_as_razoes_por_ordem(self):
        assert resumir(["terminada", "sem jogos no dia", "terminada"]) == {
            "sem jogos no dia": 1,
            "terminada": 2,
        }

    def test_sem_nada_saltado_e_um_resumo_vazio(self):
        assert resumir([]) == {}


@pytest.fixture(scope="module")
def agenda():
    import json
    import pathlib
    p = pathlib.Path(__file__).parents[2] / "web/static/v1/aplisboa/2026-27/agenda.json"
    if not p.exists():
        pytest.skip("sem agenda publicada nesta árvore")
    return json.loads(p.read_text(encoding="utf-8"))["jogos"]


class TestContraAAgendaReal:
    """Contra a agenda publicada, que é o que a ronda vai mesmo ler.

    Os testes acima são a regra; este é a ordem de grandeza — e é o número que o dono viu no
    gráfico da consola. Marcado `fonte` porque depende de dados publicados que mudam todos os
    dias: avisa, não bloqueia.
    """

    def test_poupa_pedidos_a_sério_num_dia_de_jogos(self, agenda):
        import collections
        por_prova = collections.defaultdict(list)
        for j in agenda:
            por_prova[j["comp"]].append(j)

        # domingo 11/10/2026: o dia mais cheio que já tivemos
        pedidas = sum(
            pedir_tabela(jogos_agora=js, jogos_antes=js, hoje=DOMINGO, varredura=False)[0]
            for js in por_prova.values()
        )
        n = len(por_prova)
        completa, filtrada = 1 + 2 * n, 1 + n + pedidas
        assert filtrada < completa, "o filtro não está a poupar nada"
        # 37 provas → 75 pedidos; com o filtro, menos de 70 até no dia mais cheio
        assert filtrada <= completa - 5

    def test_num_dia_sem_jogos_pede_se_quase_nenhuma_tabela(self, agenda):
        import collections
        por_prova = collections.defaultdict(list)
        for j in agenda:
            por_prova[j["comp"]].append(j)
        # 07/10/2026 foi uma quarta sem jogos nenhuns
        quarta_vazia = dt.date(2026, 10, 7)
        pedidas = sum(
            pedir_tabela(jogos_agora=js, jogos_antes=js, hoje=quarta_vazia, varredura=False)[0]
            for js in por_prova.values()
        )
        assert pedidas == 0, f"{pedidas} tabelas pedidas num dia sem jogos"
