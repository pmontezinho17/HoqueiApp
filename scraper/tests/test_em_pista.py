"""O separador "Em pista" (07/11/2026): a grelha do boletim, atleta a atleta."""

from __future__ import annotations

import json
from datetime import date

from hoquei.em_pista import em_pista
from hoquei.modelos import para_dicionario
from hoquei.parsers.jogo import ficha
from hoquei.parsers.participacao import participacao


def _dados(html: str) -> dict:
    return para_dicionario(ficha(html, 1))


def test_as_duas_equipas_com_os_dez_atletas(ficha_escolares_com_boletim):
    html = ficha_escolares_com_boletim
    saida = em_pista(html, _dados(html))
    assert [e["equipa"] for e in saida] == ["HC ALFA A", "CD BETA A"]
    assert [len(e["atletas"]) for e in saida] == [10, 10]
    for e in saida:
        for a in e["atletas"]:
            assert len(a["marcas"]) == 4 and set(a["marcas"]) <= {"X", "J", ""}
            assert "licenca" not in a


def test_as_marcas_batem_com_o_que_o_merito_conta(ficha_escolares_com_boletim):
    html = ficha_escolares_com_boletim
    saida = em_pista(html, _dados(html))
    for lado, e in zip(participacao(html), saida):
        for atleta, publicado in zip(lado, e["atletas"]):
            assert [bool(m) for m in publicado["marcas"]] == list(atleta.periodos)


def test_os_golos_por_periodo_somam_os_do_boletim(ficha_escolares_com_boletim):
    """O boletim dá o total de cada atleta, e a cronologia dá o período: têm de bater."""
    html = ficha_escolares_com_boletim
    dados = _dados(html)
    saida = em_pista(html, dados)
    golos_do_jogo = 0
    for lado, e in zip(participacao(html), saida):
        for atleta, publicado in zip(lado, e["atletas"]):
            assert publicado["golos"] is not None
            assert sum(publicado["golos"]) == atleta.golos, atleta.nome
            golos_do_jogo += atleta.golos
    assert golos_do_jogo == (dados["golos_casa"] or 0) + (dados["golos_fora"] or 0)


def test_um_j_chega_como_j(ficha_escolares_com_boletim):
    """O `J` é quem entrou a meio: o separador pinta-o de amarelo, por isso não pode virar `X`."""
    lido = participacao(ficha_escolares_com_boletim)
    alvo = next(a for a in lido[0] if not a.periodos[3])
    # a amostra não tem nenhum J: troca-se uma célula vazia por um, na linha deste atleta
    html = _com_j(ficha_escolares_com_boletim, alvo.nome)
    saida = em_pista(html, _dados(html))
    publicado = next(a for a in saida[0]["atletas"] if a["nome"] == alvo.nome)
    assert publicado["marcas"][3] == "J"


def _com_j(html: str, nome: str) -> str:
    import re
    from selectolax.parser import HTMLParser
    arvore = HTMLParser(html)
    html = arvore.html  # serializado pelo mesmo parser, para a linha se encontrar à letra
    for tr in arvore.css("#acta tr"):
        if any(c.text(strip=True) == nome for c in tr.css("td,th")):
            linha = tr.html
            celulas = list(re.finditer(r"<t[dh][^>]*>.*?</t[dh]>", linha, re.S))
            # licença(0) nome(1, colspan=3) posição(2) cap.(3) nº(4) | 1ª-4ª(5-8)
            c = celulas[8]
            abre = re.match(r"<t[dh][^>]*>", c.group(0)).group(0)
            nova = linha[:c.start()] + abre + "J</td>" + linha[c.end():]
            assert linha in html, "a linha tem de se encontrar à letra no HTML"
            return html.replace(linha, nova, 1)
    raise AssertionError(f"{nome} não está no boletim")


def test_sem_boletim_e_none(ficha_por_disputar):
    assert em_pista(ficha_por_disputar, _dados(ficha_por_disputar)) is None


def test_golos_none_quando_as_partes_nao_sao_quatro_de_oito(ficha_escolares_com_boletim):
    html = ficha_escolares_com_boletim
    dados = _dados(html)
    dados["cronologia"] = [e for e in dados["cronologia"] if not (
        e["tipo"] == "inicio_parte" and e["parte"] == 4)]
    assert all(a["golos"] is None for e in em_pista(html, dados) for a in e["atletas"])


# --- quando se pede a ficha outra vez -------------------------------------------------------

def _ficha(tmp_path, **campos):
    caminho = tmp_path / "1.json"
    caminho.write_text(json.dumps({"merito": [{"equipa": "A"}], **campos}))
    return caminho


def test_pede_se_uma_vez_a_ficha_que_nenhuma_releitura_vai_ler(tmp_path):
    from hoquei.cli import _em_pista_por_preencher
    hoje = date(2026, 11, 7)
    # fora do mês de vigia
    assert _em_pista_por_preencher(_ficha(tmp_path, data="2026-09-26",
                                          merito_revisto="2026-10-31"), hoje)
    # dentro, mas a última releitura já foi: a seguinte cairia aos 34 dias
    assert _em_pista_por_preencher(_ficha(tmp_path, data="2026-10-10",
                                          merito_revisto="2026-11-07"), hoje)
    # dentro, e a releitura semanal ainda lá vai: zero pedidos a mais
    assert not _em_pista_por_preencher(_ficha(tmp_path, data="2026-10-24",
                                              merito_revisto="2026-10-31"), hoje)
    assert not _em_pista_por_preencher(_ficha(tmp_path, data="2026-11-07"), hoje)
    # já lida, mesmo a None: não se repete
    assert not _em_pista_por_preencher(_ficha(tmp_path, data="2026-09-26", em_pista=None), hoje)
    # sem Mérito não há boletim, e não há grelha para ir buscar
    caminho = tmp_path / "2.json"
    caminho.write_text(json.dumps({"merito": None, "data": "2026-09-26"}))
    assert not _em_pista_por_preencher(caminho, hoje)


def test_anonimizar_tira_a_grelha_e_deixa_a_chave():
    from hoquei.privacidade import anonimizar_ficha
    dados = {"equipas": [], "cronologia": [], "em_pista": [{"equipa": "A", "atletas": [{}]}]}
    assert anonimizar_ficha(dados)["em_pista"] is None
