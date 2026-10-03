"""Testes do boletim oficial (B1.9c).

O boletim é o canto da fonte que menos vezes existe: só aparece minutos **depois** do apito
final e nunca aparece nos escalões de formação. Metade destes testes é sobre isso — garantir
que a ausência é tratada como ausência e não rebenta nem inventa zeros.
"""

from __future__ import annotations

import pytest
from hoquei.parsers.boletim import boletim
from hoquei.parsers.jogo import ficha


@pytest.fixture(scope="module")
def b(ficha_seniores):
    return boletim(ficha_seniores)


class TestQuandoNaoExiste:
    def test_jogo_por_disputar_nao_tem_boletim(self, ficha_por_disputar):
        assert boletim(ficha_por_disputar) is None

    def test_amostra_sem_boletim_porque_fomos_nos_que_o_tirámos(self, ficha_escolares):
        """Cuidado ao ler esta amostra: **não** prova nada sobre a fonte.

        O `scripts/anonimizar_ficha.py` remove o bloco `#acta` antes de a amostra ser
        versionada, por ser onde há mais dados pessoais. Cheguei a concluir daqui que a
        formação não tinha boletim — é falso: numa publicação real, 49 das 51 fichas de
        sub-13 e 6 das 7 de escolares têm boletim. O que a amostra serve mesmo é para
        guardar o caminho da ausência.
        """
        assert ficha(ficha_escolares, 1).estado == "Jogo Terminado"
        assert boletim(ficha_escolares) is None

    def test_html_sem_o_bloco_nao_rebenta(self):
        assert boletim("<html><body><p>nada</p></body></html>") is None


class TestResultadoPorParte:
    def test_le_o_resultado_de_cada_parte(self, b):
        assert [(p.nome, p.casa, p.fora) for p in b.parciais] == [
            ("1ª parte", 0, 2),
            ("2ª parte", 2, 4),
            ("Resultado final", 2, 6),
        ]

    def test_momentos_vazios_ficam_de_fora(self, b):
        # este jogo não foi a prolongamento nem a grandes penalidades
        assert not any("Prolongamento" in p.nome or "Desempate" in p.nome for p in b.parciais)

    def test_as_partes_somam_o_resultado_final(self, b):
        partes = [p for p in b.parciais if p.nome != "Resultado final"]
        final = next(p for p in b.parciais if p.nome == "Resultado final")
        assert sum(p.casa for p in partes) == final.casa
        assert sum(p.fora for p in partes) == final.fora

    def test_o_resultado_final_bate_com_o_da_ficha(self, b, ficha_seniores):
        f = ficha(ficha_seniores, 1)
        final = next(p for p in b.parciais if p.nome == "Resultado final")
        assert (final.casa, final.fora) == (f.golos_casa, f.golos_fora)


class TestFaltas:
    def test_faltas_por_parte(self, b):
        assert b.faltas_casa == [2, 5]
        assert b.faltas_fora == [8, 9]

    def test_somam_o_total_que_a_ficha_ja_dava(self, b, ficha_seniores):
        """Validação cruzada: duas leituras independentes do mesmo HTML têm de concordar.

        A ficha dá as faltas somadas, o boletim dá-as parte a parte. Se um dos dois parsers
        partir, isto apanha-o — é o tipo de erro que de outra forma passaria em silêncio.
        """
        f = ficha(ficha_seniores, 1)
        assert (sum(b.faltas_casa), sum(b.faltas_fora)) == f.faltas


class TestOficiais:
    def test_apanha_a_equipa_de_arbitragem_toda(self, b):
        assert b.oficiais["Árbitro 1 (ch. dupla)"] == "RUI MATOSO"
        assert b.oficiais["Cronometrista"] == "ALEXANDRE SIMÕES"
        assert b.oficiais["Auxiliar 45 Seg."] == "LUÍS SILVESTRE"
        assert b.oficiais["Gestor de segurança"] == "PEDRO SANTOS"

    def test_papeis_por_preencher_nao_entram(self, b):
        # a fonte deixa a linha lá com o nome vazio; um papel sem nome não é informação
        assert "Delegado Técnico" not in b.oficiais
        assert "Diretor de campo" not in b.oficiais
        assert all(v for v in b.oficiais.values())

    def test_traz_mais_do_que_a_ficha(self, b, ficha_seniores):
        # a ficha só dá os dois árbitros principais; o boletim dá a equipa toda
        assert len(b.oficiais) > len(ficha(ficha_seniores, 1).arbitros)


class TestHorasECapitaes:
    def test_hora_de_inicio_e_termo_de_cada_parte(self, b):
        assert b.inicio == ["18:00", "18:54"]
        assert b.termo == ["18:44", "19:52"]

    def test_capitao_de_cada_equipa(self, b):
        # a coluna `cap.` marca `C`; o `S` é o suplente e não conta
        assert b.capitao_casa == "VASCO TEIXEIRA"
        assert b.capitao_fora == "ANDRÉ GASPAR"
