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
from hoquei.parsers.participacao import AtletaBoletim, participacao


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
        p = parcelas(uma(atletas))
        assert p["4.1.4"] == -2     # os dois têm três meias partes
        assert p["4.1.5"] == -2     # só um as tem seguidas

    def test_as_quatro_meias_partes_valem_menos_quatro(self):
        """92.4.1.6 e 87.º 7.4.1 — fazer as quatro é proibido."""
        atletas = equipa_regular()
        atletas[4] = atleta(True, True, True, True)
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
