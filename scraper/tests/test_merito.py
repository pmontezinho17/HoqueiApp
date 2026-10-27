"""Testes do Mérito da Formação — o Artigo 92.º do regulamento da APL em código.

Cada teste cita o ponto do regulamento que verifica. Não é decoração: a conta é uma lista de
regras lidas de um PDF, e a única forma de alguém daqui a um ano saber se uma linha está
certa é ir ler o mesmo ponto. Quando a APL publicar um regulamento novo, é por aqui que se
confirma o que mudou.

O caso real está no fim, contra a amostra anonimizada do jogo 9905: 11 pontos para a equipa
visitada e 14 para a visitante, com a diferença a ser exactamente os 3 pontos dos golos.
"""

from __future__ import annotations

import pytest
from hoquei.merito import escalonar, merito_do_jogo, vale_merito
from hoquei.parsers.participacao import (
    AtletaBoletim,
    NaoAtletaBoletim,
    nao_atletas,
    participacao,
)


def atleta(*periodos, posicao="JC", golos=0, numero="1") -> AtletaBoletim:
    return AtletaBoletim(nome="X", posicao=posicao, numero=numero,
                         periodos=tuple(periodos), golos=golos)


def equipa_regular(guarda_redes=2, campo=8) -> list[AtletaBoletim]:
    """Uma equipa que cumpre o rodízio: metade entra na 1ª e na 3ª, metade na 2ª e na 4ª."""
    saida = []
    for i in range(guarda_redes):
        saida.append(atleta(i == 0, i == 1, i == 0, i == 1, posicao="GR"))
    for i in range(campo):
        par = i % 2 == 0
        saida.append(atleta(par, not par, par, not par))
    return saida


def uma(atletas, golos=1, golos_adversario=0, nome="A"):
    """O mérito de uma equipa só, para não repetir o par em cada teste."""
    return merito_do_jogo(nome, "B", (atletas, []), golos, golos_adversario)[0]


def parcelas(m) -> dict[str, int]:
    return {p.regra: p.pontos for p in m.parcelas}


class TestBonificacoes:
    def test_um_ponto_por_atleta_participante(self):
        """92.3.1 — e só os que **participam**: estar no boletim não basta."""
        atletas = equipa_regular()
        atletas.append(atleta(False, False, False, False))   # inscrito, não jogou
        m = uma(atletas)
        assert m.atletas == 11 and m.participantes == 10
        assert parcelas(m)["3.1"] == 10

    def test_tres_pontos_a_quem_marca_mais(self):
        """92.3.2."""
        assert parcelas(uma(equipa_regular(), 5, 2))["3.2"] == 3

    def test_um_ponto_a_cada_uma_no_empate(self):
        """92.3.3 — e **não** os 3 pontos a ninguém."""
        casa, fora = merito_do_jogo("A", "B", (equipa_regular(), equipa_regular()), 2, 2)
        assert parcelas(casa)["3.3"] == 1 and parcelas(fora)["3.3"] == 1
        assert "3.2" not in parcelas(casa)

    def test_quem_perde_nao_leva_nem_perde_pelos_golos(self):
        p = parcelas(uma(equipa_regular(), 0, 5))
        assert "3.2" not in p and "3.3" not in p

    def test_um_ponto_pela_equipa_completa(self):
        """92.3.4 — completa é 2 GR **e** 8 JC, não "dez atletas"."""
        assert uma(equipa_regular()).completa
        assert parcelas(uma(equipa_regular()))["3.4"] == 1
        # dez atletas com três guarda-redes não é uma equipa completa
        assert not uma(equipa_regular(guarda_redes=3, campo=7)).completa

    def test_jogo_sem_resultado_nao_pontua_golos(self):
        """Um jogo que a fonte ainda não fechou não dá nem tira pontos pelos golos."""
        p = parcelas(uma(equipa_regular(), None, None))
        assert "3.2" not in p and "3.3" not in p
        assert p["3.1"] == 10


class TestPenalizacoes:
    def test_menos_de_oito_atletas(self):
        """92.4.1.1."""
        assert parcelas(uma(equipa_regular(guarda_redes=1, campo=6)))["4.1.1"] == -1

    def test_so_um_guarda_redes(self):
        """92.4.1.2."""
        assert parcelas(uma(equipa_regular(guarda_redes=1, campo=8)))["4.1.2"] == -1

    def test_sem_guarda_redes_nao_se_inventa_a_conta(self):
        """O 92.4.1.2 fala de "equipas só com um guarda-redes" e nada diz de nenhum.

        Penalizar menos quem levou zero do que quem levou um seria absurdo, e inventar um
        valor seria pior: fica o aviso, e quem lê decide.
        """
        m = uma(equipa_regular(guarda_redes=0, campo=8))
        assert "4.1.2" not in parcelas(m)
        assert any("guarda-redes" in a for a in m.avisos)

    def test_ate_oito_atletas_tres_seguidas_vale_um(self):
        """92.4.1.3 — equipa com **até** 8 atletas."""
        atletas = equipa_regular(guarda_redes=1, campo=7)
        atletas[3] = atleta(True, True, True, False)
        m = uma(atletas)
        assert parcelas(m)["4.1.3"] == -1
        assert "4.1.4" not in parcelas(m) and "4.1.5" not in parcelas(m)

    def test_mais_de_oito_tres_periodos_vale_um_e_tres_seguidos_mais_dois(self):
        """92.4.1.4 e 92.4.1.5, somados — a leitura literal, assumida no `merito.py`.

        Três meias partes seguidas são também três meias partes, e o regulamento não diz
        que uma regra substitui a outra. -1 pelo 4.1.4 e -2 pelo 4.1.5, -3 ao todo.
        """
        atletas = equipa_regular()
        atletas[4] = atleta(True, True, True, False)         # três, seguidas
        atletas[5] = atleta(True, True, False, True)         # três, não seguidas
        # **E dois ficam com uma só, senão a grelha não existe.** São 20 lugares — cinco em
        # pista em cada uma das quatro —, e quem ganha uma meia parte tira-a a alguém. Até
        # 27/10/2026 este teste dava as meias partes a mais sem as tirar a ninguém, e as
        # colunas ficavam com seis marcas: o caso da troca a meio, que agora é outra regra.
        atletas[3] = atleta(False, False, False, True)       # deu a 2ª ao [4]
        atletas[6] = atleta(False, False, True, False)       # deu a 1ª ao [5]
        p = parcelas(uma(atletas))
        assert p["4.1.4"] == -2     # os dois têm três meias partes
        assert p["4.1.5"] == -2     # só um as tem seguidas

    def test_as_quatro_meias_partes_valem_menos_quatro(self):
        """92.4.1.6 e 87.º 7.4.1 — fazer as quatro é proibido."""
        atletas = equipa_regular()
        atletas[4] = atleta(True, True, True, True)
        # as duas meias partes a mais saem a alguém, pela razão do teste de cima
        atletas[3] = atleta(False, False, False, True)       # deu a 2ª
        atletas[5] = atleta(False, True, False, False)       # deu a 4ª
        p = parcelas(uma(atletas))
        assert p["4.1.6"] == -4
        # e não se soma o 4.1.5 em cima: as quatro têm a sua própria regra
        assert "4.1.5" not in p

    def test_guarda_redes_unico_pode_fazer_as_quatro(self):
        """A excepção do 87.º 7.4.1, citada pelo próprio 92.4.1.6.

        Sem ela a equipa era castigada duas vezes pela mesma falha de efectivo: uma pelo
        4.1.2, por só ter um guarda-redes, e outra pelo 4.1.6, por esse guarda-redes ter
        tido de jogar o jogo todo.
        """
        atletas = equipa_regular(guarda_redes=0, campo=8)
        atletas.append(atleta(True, True, True, True, posicao="GR"))
        p = parcelas(uma(atletas))
        assert "4.1.6" not in p
        assert p["4.1.2"] == -1

    def test_um_so_periodo_fica_por_confirmar_e_nao_desconta(self):
        """92.4.1.7 — a penalização que **não** aplicamos sozinhos.

        São -6 pontos e a perda de todas as bonificações, excepto "em caso de lesão ou
        situação impeditiva comprovada pelo árbitro". Essa comprovação é texto que o árbitro
        escreve no boletim em papel e que a página não mostra. Descontar sem a poder ler
        castigava uma equipa que levou um miúdo ao hospital.
        """
        atletas = equipa_regular()
        atletas[4] = atleta(True, False, False, False)
        m = uma(atletas)
        assert "4.1.7" not in parcelas(m)
        assert m.penalizacao == 0
        assert any("um só período" in a for a in m.avisos)
        assert m.bonificacao > 0, "as bonificações não se apagam sem a confirmação"


class TestOndeSeAplica:
    def test_os_oito_encontros_distritais(self):
        """92.1.1 e 92.1.2 — as oito provas que existem em 2026/27."""
        assert vale_merito("ENCONTROS DISTRITAIS ESCOLARES - 1ª FASE NIVEL I - SERIE A")
        assert vale_merito("ENCONTROS DISTRITAIS BENJAMINS - 1ª FASE NIVEL II - SERIE C")

    def test_as_tacas_apl_destes_escaloes_tambem(self):
        """92.1.3 a 92.1.5 — ainda não existem na época, e o artigo nomeia-as."""
        assert vale_merito("TAÇA APL ESCOLARES")
        assert vale_merito("TAÇA APL DE BAMBIS")
        assert vale_merito("TACA APL BENJAMINS")

    def test_os_escaloes_de_cima_nao_tem_merito(self):
        """O artigo é só da formação: um campeonato de sub-17 não tem Mérito nenhum."""
        assert not vale_merito("CAMP. REG. SUB-17 - 1ª FASE - SERIE A")
        assert not vale_merito("TAÇA APL SENIORES MASCULINOS")
        assert not vale_merito("SUPERTAÇA APL SUB-13")
        assert not vale_merito("")


class TestEscalonamento:
    def jogos(self):
        return [
            {"equipa": "A", "participantes": 10, "bonificacao": 14, "penalizacao": 0,
             "total": 14, "avisos": []},
            {"equipa": "B", "participantes": 10, "bonificacao": 11, "penalizacao": 0,
             "total": 11, "avisos": []},
            {"equipa": "A", "participantes": 9, "bonificacao": 10, "penalizacao": -1,
             "total": 9, "avisos": ["um só período"]},
            {"equipa": "C", "participantes": 10, "bonificacao": 14, "penalizacao": 0,
             "total": 14, "avisos": []},
        ]

    def test_soma_todos_os_jogos_da_equipa(self):
        """92.2.1 — "no final da prova será realizado o somatório"."""
        linhas = {l.equipa: l for l in escalonar(self.jogos())}
        assert (linhas["A"].jogos, linhas["A"].pontos) == (2, 23)
        assert linhas["A"].bonificacao == 24 and linhas["A"].penalizacao == -1
        assert linhas["A"].participantes == 19

    def test_a_media_compara_calendarios_desiguais(self):
        linhas = {l.equipa: l for l in escalonar(self.jogos())}
        assert linhas["A"].media == 11.5
        assert linhas["C"].media == 14.0

    def test_ordem_por_pontos_e_no_empate_quem_jogou_menos(self):
        """O empate não vem do regulamento — ver o `escalonar`."""
        assert [l.equipa for l in escalonar(self.jogos())] == ["A", "C", "B"]

    def test_conta_os_jogos_por_confirmar(self):
        linhas = {l.equipa: l for l in escalonar(self.jogos())}
        assert linhas["A"].por_confirmar == 1
        assert linhas["B"].por_confirmar == 0

    def test_prova_sem_jogos_da_tabela_vazia_e_nao_rebenta(self):
        assert escalonar([]) == []


@pytest.fixture(scope="module")
def jogo(ficha_escolares_com_boletim):
    p = participacao(ficha_escolares_com_boletim)
    return merito_do_jogo("HC ALFA A", "CD BETA A", p, 0, 5)


class TestOJogoReal:
    """Contra a amostra anonimizada: HC ALFA A 0-5 CD BETA A, com as duas equipas completas."""

    def test_a_visitada_faz_onze_pontos(self, jogo):
        casa, _ = jogo
        assert (casa.atletas, casa.guardas_redes, casa.participantes) == (10, 2, 10)
        assert casa.completa
        assert parcelas(casa) == {"3.1": 10, "3.4": 1}
        assert (casa.bonificacao, casa.penalizacao, casa.total) == (11, 0, 11)

    def test_a_visitante_faz_catorze(self, jogo):
        _, fora = jogo
        assert parcelas(fora) == {"3.1": 10, "3.2": 3, "3.4": 1}
        assert (fora.bonificacao, fora.penalizacao, fora.total) == (14, 0, 14)

    def test_a_diferenca_entre_as_duas_e_so_os_golos(self, jogo):
        """O que o Artigo 92.º quer dizer: num jogo bem corrido, ganhar vale 3 em 14."""
        casa, fora = jogo
        assert fora.total - casa.total == 3

    def test_um_jogo_dentro_da_regra_nao_tem_penalizacoes_nem_avisos(self, jogo):
        for m in jogo:
            assert m.penalizacao == 0 and m.avisos == []


def no_banco(azuis=0, amarelo=False, acumulacao=False, directo=False, papel="Treinador"):
    return NaoAtletaBoletim(nome="X", papel=papel, amarelo=amarelo, azuis=azuis,
                            vermelho_acumulacao=acumulacao, vermelho_directo=directo)


def com_banco(*pessoas, golos=1, golos_adversario=0):
    """O mérito da equipa da casa com estas pessoas no banco, e nada de errado em pista."""
    return merito_do_jogo("A", "B", (equipa_regular(), equipa_regular()),
                          golos, golos_adversario, ([*pessoas], []))[0]


def quatro_dois(m) -> list[tuple[str, int]]:
    """As linhas do 4.2, que são várias e por isso não cabem no `parcelas`, que é um dict."""
    return [(p.texto, p.pontos) for p in m.parcelas if p.regra == "4.2"]


class TestNaoAtletas:
    """Artigo 92.º ponto 4.2 — os cartões a quem está no banco e não joga.

    Lido das linhas de equipa técnica do boletim, ver `parsers/participacao.py`. O ponto 4.2
    é um sub-ponto do 4, que abre com "às equipas que participam nas provas designadas no
    ponto 1" — logo só se aplica onde o Mérito se aplica, e não a todos os escalões.
    """

    def test_um_azul_desconta_dois(self):
        m = com_banco(no_banco(azuis=1))
        assert quatro_dois(m) == [("um cartão azul ao banco", -2)]

    def test_os_azuis_somam(self):
        m = com_banco(no_banco(azuis=2), no_banco(azuis=1, papel="Delegado"))
        assert quatro_dois(m) == [("3 cartões azuis ao banco", -6)]

    def test_um_vermelho_por_acumulacao_desconta_quatro(self):
        m = com_banco(no_banco(acumulacao=True))
        assert quatro_dois(m) == [("um vermelho por acumulação ao banco", -4)]

    def test_um_vermelho_directo_desconta_seis(self):
        m = com_banco(no_banco(directo=True))
        assert quatro_dois(m) == [("um vermelho directo ao banco", -6)]

    def test_o_amarelo_nao_desconta(self):
        """O 4.2 fala de azul e de vermelho. Descontar o amarelo era inventar regulamento."""
        assert quatro_dois(com_banco(no_banco(amarelo=True))) == []

    def test_os_azuis_e_o_vermelho_que_deles_vem_somam_os_dois(self):
        """Três azuis e a expulsão por acumulação são quatro marcas no boletim, e o
        regulamento não diz que o vermelho absorve os azuis: -6 e -4, -10 ao todo."""
        m = com_banco(no_banco(azuis=3, acumulacao=True))
        assert quatro_dois(m) == [("3 cartões azuis ao banco", -6),
                                  ("um vermelho por acumulação ao banco", -4)]
        assert m.penalizacao == -10

    def test_entra_na_penalizacao_e_no_total(self):
        limpo = com_banco()
        sujo = com_banco(no_banco(directo=True))
        assert limpo.penalizacao == 0
        assert sujo.penalizacao == -6
        assert sujo.total == limpo.total - 6

    def test_sem_banco_a_conta_sai_igual_a_antes(self):
        """Quem chame o `merito_do_jogo` sem banco — e até 12/10/2026 era todo o código —
        tem a mesma conta que tinha."""
        sem = merito_do_jogo("A", "B", (equipa_regular(), equipa_regular()), 1, 0)[0]
        vazio = com_banco()
        assert (sem.total, sem.penalizacao) == (vazio.total, vazio.penalizacao)

    def test_cada_equipa_leva_o_seu(self):
        casa, fora = merito_do_jogo(
            "A", "B", (equipa_regular(), equipa_regular()), 1, 0,
            ([no_banco(directo=True)], [no_banco(azuis=1)]))
        assert quatro_dois(casa) == [("um vermelho directo ao banco", -6)]
        assert quatro_dois(fora) == [("um cartão azul ao banco", -2)]


class TestOCartaoRealAoBanco:
    """Contra a amostra: HC ALFA 3-7 CD BETA, com um vermelho directo ao treinador da casa.

    O jogo é de SUB-19 e portanto não tem Mérito nenhum — o que esta amostra prova é a
    leitura, não a aplicação. A 12/10/2026 não havia um único cartão a não atleta nos oito
    Encontros Distritais, por isso o 4.2 ainda não mexeu em nenhuma tabela.

    Os atletas vão vazios de propósito: o boletim de SUB-19 não tem a grelha `5I` (são duas
    partes e não quatro meias partes), e por isso o `participacao` devolve `None` aqui. É o
    banco que se lê igual em todos os escalões, e é isso que esta amostra guarda.
    """

    def test_o_boletim_diz_que_foi_directo_e_a_conta_desconta_seis(
            self, ficha_com_cartao_ao_banco):
        banco = nao_atletas(ficha_com_cartao_ao_banco)
        assert banco is not None
        casa, fora = merito_do_jogo("HC ALFA", "CD BETA", ([], []), 3, 7, banco)
        assert quatro_dois(casa) == [("um vermelho directo ao banco", -6)]
        assert quatro_dois(fora) == []

    def test_a_grelha_de_participacao_nao_existe_num_boletim_de_sub_19(
            self, ficha_com_cartao_ao_banco):
        """Dito aqui para ninguém se enganar a reutilizar esta amostra para o resto do
        Mérito: ela só serve para o 4.2."""
        assert participacao(ficha_com_cartao_ao_banco) is None


class TestTrocaAMeio:
    """Uma meia parte com mais de cinco marcas teve uma troca a meio, e o boletim não diz quem
    saiu. Apanhado por um pai a 26/10/2026 — ver `_sem_as_duvidosas` no `merito.py`."""

    def jogo_9913(self):
        """A grelha da AE Física no jogo 9913 de 25/10/2026, Escolares, tal como o boletim a
        publica — **sem os nomes**, que são de crianças e não saem do boletim. A 4.ª meia
        parte tem seis marcas: os dois guarda-redes."""
        gr = [atleta(True, False, False, True, posicao="GR"),
              atleta(False, True, True, True, posicao="GR")]
        campo = [atleta(*p) for p in [
            (False, True, False, True), (False, True, False, True),
            (False, True, True, False), (False, True, True, False),
            (True, False, False, True), (True, False, False, True),
            (True, False, True, False), (True, False, True, False)]]
        return gr + campo

    def test_a_grelha_e_mesmo_a_do_jogo(self):
        marcas = [sum(a.periodos[i] for a in self.jogo_9913()) for i in range(4)]
        assert marcas == [5, 5, 5, 6]

    def test_a_ae_fisica_deixa_de_ter_os_menos_tres(self):
        m = uma(self.jogo_9913())
        p = parcelas(m)
        assert "4.1.4" not in p and "4.1.5" not in p
        assert m.penalizacao == 0
        assert m.meias_partes_em_duvida == 1

    def test_e_fica_por_confirmar_em_vez_de_desaparecer(self):
        m = uma(self.jogo_9913())
        assert any("troca a meio" in a for a in m.avisos)

    def test_as_bonificacoes_contam_as_marcas_todas(self):
        # quem entrou a meio participou, e o 3.1 conta-o
        assert parcelas(uma(self.jogo_9913()))["3.1"] == 10

    def test_quem_passa_da_conta_sem_a_meia_parte_da_troca_continua_penalizado(self):
        atletas = self.jogo_9913()
        # Um jogador de campo marcado nas quatro. Sem a 4.ª, a da troca, ainda tem a 1.ª, a 2.ª
        # e a 3.ª seguidas — e isso é penalização sem dúvida nenhuma. Os dois que lhe cederam
        # a 1.ª e a 3.ª mantêm as colunas em 5, 5, 5 e 6.
        atletas[2] = atleta(True, True, True, True)
        atletas[6] = atleta(False, False, False, True)   # cedeu a 1.ª
        atletas[4] = atleta(False, True, False, False)   # cedeu a 3.ª
        assert [sum(a.periodos[i] for a in atletas) for i in range(4)] == [5, 5, 5, 6]
        p = parcelas(uma(atletas))
        assert p["4.1.4"] == -1 and p["4.1.5"] == -2
        # e não leva o 4.1.6: as quatro só as tem contando a da troca
        assert "4.1.6" not in p

    def test_sem_troca_a_meio_nada_muda(self):
        assert uma(equipa_regular()).meias_partes_em_duvida == 0


class TestRevisitaDasFichasAntigas:
    """A correcção de 27/10/2026 tem de chegar às penalizações já publicadas — ver
    `_merito_por_rever` no `cli.py`. Só as que podem mudar custam um pedido."""

    def ficha(self, tmp_path, merito):
        import json
        alvo = tmp_path / "1.json"
        alvo.write_text(json.dumps({"merito": merito}))
        return alvo

    def test_penalizacao_por_meias_partes_sem_o_campo_novo_e_revista(self, tmp_path):
        from hoquei.cli import _merito_por_rever
        alvo = self.ficha(tmp_path, [{"parcelas": [{"regra": "4.1.5", "pontos": -2}]}])
        assert _merito_por_rever(alvo)

    def test_uma_vez_revista_nao_se_pede_outra_vez(self, tmp_path):
        from hoquei.cli import _merito_por_rever
        alvo = self.ficha(tmp_path, [{"parcelas": [{"regra": "4.1.5", "pontos": -2}],
                                      "meias_partes_em_duvida": 0}])
        assert not _merito_por_rever(alvo)

    def test_sem_penalizacao_por_meias_partes_nao_custa_um_pedido(self, tmp_path):
        from hoquei.cli import _merito_por_rever
        alvo = self.ficha(tmp_path, [{"parcelas": [{"regra": "4.1.2", "pontos": -1}]}])
        assert not _merito_por_rever(alvo)
        assert not _merito_por_rever(self.ficha(tmp_path, None))

    def test_a_conta_nova_escreve_sempre_o_sinal(self):
        from hoquei.modelos import para_dicionario
        assert "meias_partes_em_duvida" in para_dicionario(uma(equipa_regular()))
