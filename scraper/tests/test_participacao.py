"""Testes da grelha de participação do boletim (`5I`).

O que estes testes protegem é um mapa de **índices de célula**: a linha de atleta tem 19
células para 21 colunas, porque o nome traz `colspan=3`. Um índice trocado não rebenta —
devolve silêncio, e um silêncio aqui vira uma penalização inventada a uma equipa de
crianças. Daí a amostra real (anonimizada) e não HTML escrito à mão.
"""

from __future__ import annotations

import pytest
from hoquei.parsers.participacao import AtletaBoletim, nao_atletas, participacao


@pytest.fixture(scope="module")
def p(ficha_escolares_com_boletim):
    lido = participacao(ficha_escolares_com_boletim)
    assert lido is not None
    return lido


class TestQuandoNaoExiste:
    def test_html_sem_bloco_nenhum(self):
        assert participacao("<html><body><p>nada</p></body></html>") is None

    def test_jogo_por_disputar_tem_o_bloco_vazio(self, ficha_por_disputar):
        """O `<div id="acta">` existe desde o início e só se enche depois do apito."""
        assert participacao(ficha_por_disputar) is None

    def test_amostra_com_o_boletim_cortado(self, ficha_escolares):
        """A outra amostra de escolares tem o bloco removido — ver `test_boletim.py`."""
        assert participacao(ficha_escolares) is None


class TestLeituraDaGrelha:
    def test_dez_atletas_por_equipa(self, p):
        """Dez é o que o Artigo 87.º 7.4.2 obriga, e é o que esta amostra tem."""
        assert (len(p[0]), len(p[1])) == (10, 10)

    def test_a_equipa_tecnica_fica_de_fora(self, p):
        """As linhas do Delegado, Treinador, Médico e Massagista têm licença e não são atletas.

        Contá-las dava doze "atletas" a uma equipa de dez, e com isso uma bonificação de
        mais dois pontos por jogo pelo 92.3.1.
        """
        assert all(a.posicao in ("GR", "JC") for lado in p for a in lado)

    def test_dois_guarda_redes_e_oito_de_campo(self, p):
        for lado in p:
            assert sum(1 for a in lado if a.posicao == "GR") == 2
            assert sum(1 for a in lado if a.posicao == "JC") == 8

    def test_cada_atleta_faz_duas_meias_partes(self, p):
        """O desenho do escalão: uma meia parte de cada parte, por atleta (87.º 7.4).

        Dez atletas × 2 = 20 = 4 meias partes × 5 em pista. Se este teste falhar numa
        amostra nova, não é o parser que está errado — é um jogo fora da regra, e é
        exactamente o que o Mérito da Formação existe para apanhar.
        """
        for lado in p:
            assert [a.meias_partes for a in lado] == [2] * 10

    def test_os_periodos_sao_os_quatro_e_pela_ordem(self, p):
        """Quem entra na 1ª entra na 3ª ou na 4ª: nunca duas da mesma parte."""
        for lado in p:
            for a in lado:
                primeira = a.periodos[0] or a.periodos[1]
                segunda = a.periodos[2] or a.periodos[3]
                assert primeira and segunda, f"{a.numero} fora do rodízio: {a.periodos}"

    def test_os_golos_somam_o_resultado(self, p):
        """A coluna `total` do boletim, contra o 0-5 que a fonte publica no cabeçalho."""
        assert sum(a.golos for a in p[0]) == 0
        assert sum(a.golos for a in p[1]) == 5

    def test_numero_de_camisola(self, p):
        assert [a.numero for a in p[1]] == ["1", "4", "9", "12", "17", "24", "27", "49",
                                            "76", "82"]

    def test_nenhum_nome_real_na_amostra(self, p):
        """A amostra está num repositório público: só pseudónimos.

        Não é um teste do parser — é o teste de que a amostra pode estar onde está. O
        `anonimizar_ficha.py` já falha quando sobra um nome, mas isso corre uma vez; isto
        corre sempre.
        """
        assert all(a.nome.startswith("JOGADOR ") for lado in p for a in lado)


class TestContasDoAtleta:
    def atleta(self, *periodos, posicao="JC"):
        return AtletaBoletim(nome="X", posicao=posicao, numero="1",
                             periodos=tuple(periodos), golos=0)

    def test_participou_e_meias_partes(self):
        assert self.atleta(True, False, True, False).participou
        assert not self.atleta(False, False, False, False).participou
        assert self.atleta(True, True, False, True).meias_partes == 3

    @pytest.mark.parametrize("periodos,esperado", [
        ((True, True, True, False), True),
        ((False, True, True, True), True),
        ((True, True, False, True), False),   # três, mas não seguidas
        ((True, False, True, True), False),
        ((True, True, True, True), True),     # quatro contêm três seguidas
        ((True, True, False, False), False),
    ])
    def test_tres_seguidas(self, periodos, esperado):
        assert self.atleta(*periodos).tres_seguidas is esperado

    def test_todas(self):
        assert self.atleta(True, True, True, True).todas
        assert not self.atleta(True, True, True, False).todas


@pytest.fixture(scope="module")
def banco(ficha_com_cartao_ao_banco):
    lido = nao_atletas(ficha_com_cartao_ao_banco)
    assert lido is not None
    return lido


class TestOBanco:
    """As linhas de equipa técnica do boletim — o que o Artigo 92.º ponto 4.2 precisa."""

    def test_le_quem_esta_no_banco_de_cada_equipa(self, banco):
        casa, fora = banco
        assert [x.papel for x in casa] == ["Delegado", "Treinador", "Enf./Fisiot./Mass."]
        assert [x.papel for x in fora] == ["Delegado", "Treinador", "2º Trein./Prep. Físico"]

    def test_as_linhas_sem_ninguem_inscrito_nao_contam(self, banco):
        """O boletim traz sempre as seis linhas, Médico e Mecânico incluídos, quase sempre
        vazias. Uma linha sem nome não é uma pessoa."""
        assert all(x.nome for lado in banco for x in lado)

    def test_separa_o_vermelho_directo_do_vermelho_por_acumulacao(self, banco):
        """**A razão de existir deste leitor.** A ficha diz "1 vermelho" ao treinador da
        equipa visitada; o 4.2 desconta -4 se foi por acumulação e -6 se foi directo, e só
        o boletim diz qual — aqui, a coluna `dir.`."""
        treinador = next(x for x in banco[0] if x.papel == "Treinador")
        assert treinador.vermelho_directo
        assert not treinador.vermelho_acumulacao
        assert treinador.azuis == 0

    def test_quem_nao_levou_nada_nao_leva_nada(self, banco):
        outros = [x for lado in banco for x in lado
                  if not (x.papel == "Treinador" and x.vermelho_directo)]
        assert all(not x.amarelo and x.azuis == 0
                   and not x.vermelho_acumulacao and not x.vermelho_directo
                   for x in outros)

    def test_um_atleta_nunca_e_lido_como_banco(self, ficha_seniores):
        """**A regressão que isto fecha.** Contar células parecia bastar e não bastava: o
        boletim de Escolares dá 19 células a um atleta e o de Seniores dá 15, e qualquer
        janela larga o suficiente para as 9 de um banco apanhava também as 15 de um atleta.
        Medido a 12/10/2026: o capitão de uma equipa de seniores aparecia como membro do
        banco, com três azuis e duas expulsões, que eram os cabeçalhos das colunas.

        O que distingue mesmo é o `colspan` do papel — ele tapa as colunas que um não atleta
        não tem.
        """
        lido = nao_atletas(ficha_seniores)
        assert lido is not None
        papeis = {x.papel for lado in lido for x in lado}
        assert papeis == {"Delegado", "Treinador", "2º Trein./Prep. Físico",
                          "Enf./Fisiot./Mass."}
        assert not any(x.azuis or x.vermelho_acumulacao or x.vermelho_directo
                       for lado in lido for x in lado)

    def test_sem_boletim_devolve_nada(self, ficha_por_disputar):
        assert nao_atletas("<html><body></body></html>") is None
        assert nao_atletas(ficha_por_disputar) is None

    def test_um_banco_vazio_nao_e_um_boletim_em_falta(self, ficha_escolares_com_boletim):
        """`([], [])` e `None` dizem coisas diferentes, como no `participacao` — mas aqui a
        lista vazia é normal: uma equipa pode apresentar-se sem ninguém no banco."""
        lido = nao_atletas(ficha_escolares_com_boletim)
        assert lido is not None
        assert all(x.azuis == 0 and not x.vermelho_directo for lado in lido for x in lado)
