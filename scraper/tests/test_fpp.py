"""A plataforma da FPP lida pelos mesmos *parsers* da APL — com HTML verdadeiro.

As amostras foram pedidas a 17/11/2026, seis pedidos um por segundo, com autorização do dono
(`docs/11-ligas-nacionais.md`). É o mesmo programa da APL e o mesmo HTML; estes testes existem
para que uma diferença entre as duas instalações apareça aqui e não num ecrã vazio.
"""
import pathlib

import pytest

from hoquei.cli import so_das_categorias
from hoquei.fonte import descodificar
from hoquei.grupos import identificar
from hoquei.parsers.calendario import calendario
from hoquei.parsers.classificacao import classificacao
from hoquei.parsers.competicoes import competicoes
from hoquei.parsers.jogo import ficha

AMOSTRAS = pathlib.Path(__file__).resolve().parent.parent.parent / "data-samples" / "paginas"

#: As categorias que o dono decidiu a 09/11 e a 17/11: o Placard, a 2.ª e a 3.ª divisão.
#: É esta lista que o workflow passa ao `--categorias`.
FASE_1 = ["CAMPEONATO NACIONAL 1ª DIVISAO", "CAMPEONATO NACIONAL 2ª DIVISAO",
          "CAMPEONATO NACIONAL 3ª DIVISAO"]


def _ler(nome: str) -> str:
    return descodificar("partido.asp" if "ficha" in nome else "", (AMOSTRAS / nome).read_bytes())


def test_a_fase_1_sao_as_sete_competicoes_das_tres_divisoes():
    provas = so_das_categorias(competicoes(_ler("fpp-competicoes-t11.html")), FASE_1)
    assert sorted(p.id for p in provas) == [348, 349, 350, 354, 355, 356, 357]
    # o Feminino, os Sub-23 e as taças ficam de fora por decisão, não por acaso
    assert not any("FEMININ" in p.categoria or "SUB-23" in p.categoria for p in provas)


def test_as_zonas_viram_series_de_uma_so_competicao():
    """A 2.ª Norte e a 2.ª Sul são um ecrã com duas séries, como as séries da APL."""
    provas = so_das_categorias(competicoes(_ler("fpp-competicoes-t11.html")), FASE_1)
    grupos = {p.id: identificar(p.categoria, p.nome) for p in provas}
    assert grupos[349]["grupo_id"] == grupos[350]["grupo_id"]
    assert {grupos[349]["serie"], grupos[350]["serie"]} == {"NORTE", "SUL"}
    assert {grupos[i]["serie"] for i in (354, 355, 356, 357)} == {"NORTE A", "NORTE B", "SUL A", "SUL B"}
    assert grupos[348]["serie"] is None


@pytest.mark.parametrize("nome,comp,resultados", [
    ("fpp-calendario-placard.html", 348, 13),
    ("fpp-calendario-2divisao-norte.html", 349, 27),
])
def test_calendarios(nome, comp, resultados):
    cal = calendario(_ler(nome), comp, 11)
    assert len(cal.jogos) == 182 and len(cal.equipas) == 14
    assert sum(j.golos_casa is not None for j in cal.jogos) == resultados
    assert all(e.logo and "/logos/" in e.logo for e in cal.equipas)


def test_classificacao_da_2_norte():
    c = classificacao(_ler("fpp-classificacao-2divisao-norte.html"), 349, 11)
    linhas = c.grupos[0].linhas
    assert len(linhas) == 14
    assert linhas[0].equipa == "FAMALICENSE AC" and linhas[0].pontos == 12
    # 3 pontos por vitória, 1 por empate, como na APL
    assert all(l.pontos == 3 * l.vitorias + l.empates for l in linhas)


@pytest.mark.parametrize("nome,id_jogo,casa,fora,gc,gf", [
    ("fpp-ficha-placard-18275.html", 18275, "AD OEIRAS", "OC BARCELOS SAD", 3, 8),
    ("fpp-ficha-2divisao-norte-18470.html", 18470, "ADJ VILA PRAIA", "FC PORTO B", 2, 3),
])
def test_fichas(nome, id_jogo, casa, fora, gc, gf):
    f = ficha(_ler(nome), id_jogo)
    assert (f.casa, f.fora, f.golos_casa, f.golos_fora) == (casa, fora, gc, gf)
    assert f.estado == "Jogo Terminado"
    assert f.boletim is not None
    golos = [e for e in f.cronologia if e.tipo == "golo"]
    assert len(golos) == gc + gf
