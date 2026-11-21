"""A escolha das provas pela categoria — é o que deixa a FPP entrar por fases.

A FPP tem 18 competições em 2026/27 e a app só lê as que o dono decidiu (`docs/11-...`).
Escolher pelo número da prova obrigava a mudar o workflow todas as épocas.
"""
import pytest

from hoquei.cli import so_das_categorias
from hoquei.modelos import Competicao

PROVAS = [
    Competicao(348, "CAMPEONATO PLACARD", "CAMPEONATO NACIONAL 1ª DIVISAO"),
    Competicao(350, "CAMPEONATO NACIONAL 2ª DIVISAO - ZONA NORTE", "CAMPEONATO NACIONAL 2ª DIVISAO"),
    Competicao(351, "CAMPEONATO NACIONAL 2ª DIVISAO - ZONA SUL", "CAMPEONATO NACIONAL 2ª DIVISAO"),
    Competicao(360, "TAÇA DE PORTUGAL", "TAÇA DE PORTUGAL"),
]


def test_sem_categorias_vem_tudo():
    assert so_das_categorias(PROVAS, None) == PROVAS
    assert so_das_categorias(PROVAS, []) == PROVAS


def test_uma_categoria_traz_todas_as_zonas_dela():
    escolhidas = so_das_categorias(PROVAS, ["CAMPEONATO NACIONAL 2ª DIVISAO"])
    assert [p.id for p in escolhidas] == [350, 351]


def test_maiusculas_e_espacos_nao_contam():
    assert [p.id for p in so_das_categorias(PROVAS, ["  campeonato nacional 1ª divisao "])] == [348]


def test_uma_categoria_que_a_fonte_nao_tem_e_erro_e_nao_lista_vazia():
    # uma gralha no workflow não pode publicar zero provas e apagar a liga da app em silêncio
    with pytest.raises(SystemExit, match="3ª DIVISAO"):
        so_das_categorias(PROVAS, ["CAMPEONATO NACIONAL 1ª DIVISAO", "CAMPEONATO NACIONAL 3ª DIVISAO"])
