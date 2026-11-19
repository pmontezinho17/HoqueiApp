"""O ensaio do ao vivo nacional (`direto.py`), contra a única amostra que há da "Jogos do Dia".

A amostra é de 09/11/2026: o RIBA D AVE HC B–HC BRAGA B da 3.ª Norte A ao intervalo, 1–0 (acabou
3–1). Tudo o que ela não mostra — o Placard, um jogo acabado — é escrito à mão aqui, e é por isso
que isto é um ensaio: a medição de 21/11 é que diz como a página é num dia inteiro.
"""
import json
import pathlib

from hoquei.direto import aplicar, divisao, jogos_do_dia, main, resultado

AMOSTRA = pathlib.Path(__file__).parents[2] / "data-samples/paginas/fpp-direto-intervalo.html"
DIA = "2026-11-09"


def _agenda():
    return [
        {"id": 18924, "data": DIA, "hora": "18:00", "comp": 354, "cat": "3.ª DIVISÃO",
         "serie": "NORTE A", "casa": "RIBA D AVE HC B", "fora": "HC BRAGA B", "gc": None, "gf": None},
        # a equipa A do mesmo clube, noutra divisão e noutro dia: não pode receber nada
        {"id": 18300, "data": "2027-04-17", "hora": "18:00", "comp": 348, "cat": "1.ª DIVISÃO",
         "serie": None, "casa": "RIBA D AVE HC/ CSJ GROUP", "fora": "HC BRAGA SAD", "gc": None, "gf": None},
    ]


def test_a_amostra_le_se():
    jogos = jogos_do_dia(AMOSTRA.read_text(encoding="utf-8"))
    assert [(j["competicao"], j["resultado"], j["estado"]) for j in jogos] == [
        ("CN 3ª Divisão Norte A", "1-0", "Intervalo")]


def test_as_divisoes_e_as_zonas():
    assert divisao("CN 3ª Divisão Norte A") == ("3.ª DIVISÃO", "NORTE A")
    assert divisao("CN 2ª Divisão Sul") == ("2.ª DIVISÃO", "SUL")
    assert divisao("Campeonato Placard") == ("1.ª DIVISÃO", None)
    for fora in ("CN Seniores Femininos Norte", "CN Sub-23 Sul", "Taça de Portugal", "Elite Cup"):
        assert divisao(fora) is None, fora


def test_o_jogo_ao_intervalo_fica_a_decorrer_com_o_resultado():
    agenda = _agenda()
    contas = aplicar(agenda, jogos_do_dia(AMOSTRA.read_text(encoding="utf-8")), DIA)
    j = agenda[0]
    assert (j["gc"], j["gf"], j["ao_vivo"], j["situacao"]) == (1, 0, True, "Intervalo")
    assert contas["mudou"] == 1 and contas["a_decorrer"] == 1
    assert agenda[1]["gc"] is None and "ao_vivo" not in agenda[1]


def test_um_jogo_acabado_perde_a_marca_e_guarda_o_resultado():
    agenda = _agenda()
    agenda[0].update(gc=2, gf=1, ao_vivo=True, situacao="2ª Parte")
    d = {"competicao": "CN 3ª Divisão Norte A", "casa": 'Riba D`Ave HC "B"', "fora": 'HC Braga "B"',
         "resultado": "3-1", "estado": "Final"}
    contas = aplicar(agenda, [d], DIA)
    assert (agenda[0]["gc"], agenda[0]["gf"]) == (3, 1)
    assert "ao_vivo" not in agenda[0] and "situacao" not in agenda[0]
    assert contas["acabaram"] == 1


def test_sem_par_unico_nao_escreve_nada():
    """Escrever o resultado de um jogo noutro é pior do que não o escrever."""
    agenda = _agenda()
    d = {"competicao": "CN 3ª Divisão Norte A", "casa": "Outro Clube", "fora": 'HC Braga "B"',
         "resultado": "1-0", "estado": "1ª Parte"}
    assert aplicar(agenda, [d], DIA)["mudou"] == 0
    assert agenda[0]["gc"] is None
    # e a equipa A não casa com a B, nem a B com a A
    d = {**d, "casa": "Riba D`Ave HC", "fora": "HC Braga"}
    assert aplicar(agenda, [d], DIA)["mudou"] == 0


def test_o_benfica_de_alenquer_nao_e_uma_equipa_b():
    agenda = [{"id": 1, "data": DIA, "hora": "18:00", "comp": 350, "cat": "2.ª DIVISÃO",
               "serie": "SUL", "casa": "S. ALENQUER B", "fora": "APAC TOJAL", "gc": None, "gf": None}]
    d = {"competicao": "CN 2ª Divisão Sul", "casa": "S. Alenquer e Benfica", "fora": "APAC Tojal",
         "resultado": "2-2", "estado": "2ª Parte"}
    assert aplicar(agenda, [d], DIA)["mudou"] == 1


def test_um_resultado_que_nao_se_le_nao_se_escreve():
    assert resultado("1-0") == (1, 0) and resultado(" 10 – 2 ") == (10, 2)
    assert resultado("-") is None and resultado(None) is None and resultado("vs") is None


def test_a_ronda_escreve_a_agenda_e_o_ficheiro_da_prova(tmp_path, capsys):
    (tmp_path / "comp").mkdir()
    (tmp_path / "agenda.json").write_text(json.dumps({"jogos": _agenda()}), encoding="utf-8")
    (tmp_path / "comp" / "354.json").write_text(json.dumps({"jogos": [
        {"id": 18924, "golos_casa": None, "golos_fora": None}]}), encoding="utf-8")
    assert main(["--destino", str(tmp_path), "--pagina", str(AMOSTRA), "--hoje", DIA]) == 0
    assert "mudou=1" in capsys.readouterr().out
    assert json.loads((tmp_path / "agenda.json").read_text())["jogos"][0]["gc"] == 1
    comp = json.loads((tmp_path / "comp" / "354.json").read_text())["jogos"][0]
    assert (comp["golos_casa"], comp["golos_fora"], comp["ao_vivo"]) == (1, 0, True)


def test_pendentes_conta_o_que_ainda_pode_mudar():
    from datetime import datetime
    from hoquei.direto import LISBOA, pendentes
    agora = datetime(2026, 11, 21, 20, 0, tzinfo=LISBOA)
    jogos = [
        {"hora": "21:00", "gc": None},                    # por começar
        {"hora": "19:30", "gc": None},                    # começou e a página não o mostra
        {"hora": "18:30", "gc": 2, "gf": 1, "ao_vivo": True},  # a decorrer
        {"hora": "18:00", "gc": 3, "gf": 1},              # acabou
        {"hora": "15:00", "gc": None},                    # passou da janela: já não se espera
    ]
    assert pendentes(jogos, agora) == 3
