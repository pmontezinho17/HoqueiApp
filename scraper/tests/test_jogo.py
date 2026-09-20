"""Testes da ficha de jogo e da cronologia, contra HTML gravado."""
import pytest

from hoquei.parsers.jogo import cronologia, equipas_ficha, ficha


# --- cabeçalho -------------------------------------------------------------

def test_cabecalho_do_jogo_terminado(ficha_seniores):
    f = ficha(ficha_seniores, 9308)
    assert (f.casa, f.fora) == ("FSE/AJ SALESIANA", "GRF MURCHES")
    assert (f.golos_casa, f.golos_fora) == (2, 6)
    assert f.estado == "Jogo Terminado"
    assert f.competicao == "TAÇA JESUS CORREIA - SENIORES MASCULINOS"
    assert f.recinto == "PAV. SALESIANA"
    assert f.faltas == (7, 17)


def test_arbitros_sem_os_rotulos_das_tabs(ficha_seniores):
    # os rótulos "FICHA DE JOGO" / "BOLETIM DE JOGO" vêm logo a seguir no DOM
    # e entravam na lista de árbitros
    assert ficha(ficha_seniores, 9308).arbitros == ["RUI MATOSO", "HENRIQUE MATIAS"]


def test_jogo_por_disputar_nao_inventa_estado_nem_cronologia(ficha_por_disputar):
    f = ficha(ficha_por_disputar, 9438)
    assert f.estado == "Jogo sem começar"      # o cabeçalho e a cronologia usam strings diferentes
    assert f.tem_cronologia is False           # B1.9d: a app não deve abrir uma tab vazia


# --- cronologia (B1.9a) ----------------------------------------------------

def test_todos_os_eventos_sao_classificados(ficha_seniores, ficha_escolares):
    for html in (ficha_seniores, ficha_escolares):
        assert [e.texto for e in cronologia(html) if e.tipo == "desconhecido"] == []


def test_eventos_em_ordem_cronologica(ficha_seniores):
    # a fonte lista do mais recente para o mais antigo
    evs = cronologia(ficha_seniores)
    assert evs[0].tipo == "inicio_parte"
    assert evs[-1].tipo == "fim_jogo"
    minutos = [e.minuto for e in evs if e.minuto is not None]
    assert minutos == sorted(minutos)


def test_resultado_corrente_acompanha_os_golos(ficha_seniores):
    f = ficha(ficha_seniores, 9308)
    golos = [e for e in f.cronologia if e.tipo == "golo"]
    assert len(golos) == 8
    ultimo = golos[-1]
    assert (ultimo.golos_casa, ultimo.golos_fora) == (f.golos_casa, f.golos_fora)
    assert all(g.jogador for g in golos)


def test_variantes_de_golo_e_lances_falhados(ficha_seniores):
    tipos = {(e.tipo, e.variante) for e in cronologia(ficha_seniores)}
    assert ("golo", "livre_direto") in tipos
    assert ("penalti_falhado", "penalti") in tipos
    assert ("cartao", "amarelo") in tipos
    assert ("cartao", "azul") in tipos


def test_faltas_de_equipa_trazem_numero(ficha_seniores):
    faltas = [e for e in cronologia(ficha_seniores) if e.tipo == "falta_equipa"]
    assert faltas and all(f.numero and f.equipa for f in faltas)


def test_desconto_de_tempo_tem_equipa_e_nao_jogador(ficha_seniores):
    dts = [e for e in cronologia(ficha_seniores) if e.tipo == "desconto_tempo"]
    assert dts and all(d.equipa and d.jogador is None for d in dts)


# --- relógio (B1.9b) -------------------------------------------------------

@pytest.mark.parametrize("amostra, partes, duracao", [("ficha_seniores", 2, 25), ("ficha_escolares", 4, 8)])
def test_numero_e_duracao_das_partes_vem_da_fonte(request, amostra, partes, duracao):
    """Seniores jogam 2×25min e escolares 4×8min: nada disto pode estar hardcoded."""
    evs = cronologia(request.getfixturevalue(amostra))
    inicios = [e for e in evs if e.tipo == "inicio_parte"]
    assert len(inicios) == partes
    assert all(e.relogio == f"{duracao}:00" for e in inicios)


def test_relogio_decrescente_convertido_em_minuto_corrido(ficha_escolares):
    """Um golo aos 6:25 da 2ª parte de 8 min é o minuto 9 do jogo, não o 6."""
    golos = [e for e in cronologia(ficha_escolares) if e.tipo == "golo"]
    por_relogio = {(g.parte, g.relogio): g.minuto for g in golos}
    assert por_relogio[(1, "6:01")] == 1      # 8:00 - 6:01 = 1:59
    assert por_relogio[(2, "6:25")] == 9      # 8 + (8:00 - 6:25) = 9:35
    assert por_relogio[(4, "3:38")] == 28     # 8×3 + (8:00 - 3:38) = 28:22


# --- estatística por jogador (B1.9) ---------------------------------------

def test_soma_dos_golos_dos_jogadores_bate_certo_com_o_resultado(ficha_seniores):
    f = ficha(ficha_seniores, 9308)
    somas = [sum(j.golos or 0 for j in eq.jogadores if j.papel is None) for eq in f.equipas]
    assert somas == [f.golos_casa, f.golos_fora]


def test_equipa_tecnica_separada_dos_jogadores(ficha_escolares):
    """Jogadores têm 12 células e técnicos 11 — distinguem-se pelo layout, não pelo texto."""
    equipas = equipas_ficha(ficha_escolares)
    tecnicos = [j for j in equipas[0].jogadores if j.papel]
    assert [j.papel for j in tecnicos] == ["D", "T", "T2", "MAS"]
    assert all(j.nome and j.nome != "--" for j in tecnicos)
    assert all(j.golos is None for j in tecnicos)


def test_linha_de_totais_nao_conta_como_jogador(ficha_seniores):
    for eq in equipas_ficha(ficha_seniores):
        assert not any(j.nome.lower().startswith("total") for j in eq.jogadores)
