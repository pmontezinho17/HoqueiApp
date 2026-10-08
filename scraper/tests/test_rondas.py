"""Testes da guarda contra perdas silenciosas (B9.2 + B9.6).

Isto existe por causa de uma avaria real: em Setembro a fonte mudou o número de colunas de
uma linha de calendário, o parser **não deu erro** e devolveu 256 linhas a menos de 307.
Ficou 11 dias assim. Nenhum teste contra HTML gravado apanha isso, porque o HTML gravado é
o antigo — a única defesa é comparar rondas.
"""

from __future__ import annotations

import json

import pytest
from hoquei.rondas import acumular_pedidos, contar, diario_de, quedas, registar, ultima

BASE = {"jogos": 307, "fichas": 180, "competicoes": 37, "equipas": 216}


class TestQuedas:
    def test_a_avaria_de_setembro_seria_apanhada(self):
        # 307 → 51 linhas de calendário: 83% a menos, e o parser não se queixou
        assert quedas(BASE, {**BASE, "jogos": 51}) == [
            "jogos: 307 → 51 (83% a menos)"
        ]

    def test_crescer_nunca_e_suspeito(self):
        assert quedas(BASE, {k: v * 2 for k, v in BASE.items()}) == []

    def test_contagem_igual_nao_levanta_nada(self):
        assert quedas(BASE, dict(BASE)) == []

    def test_uma_queda_pequena_passa(self):
        # dois jogos adiados em 307 são 0,7% — ruído normal da fonte
        assert quedas(BASE, {**BASE, "jogos": 305}) == []

    def test_percentagem_nao_manda_em_numeros_pequenos(self):
        """Uma prova com 3 jogos e um adiamento dá 33% de queda sem nada estar errado."""
        assert quedas({"jogos": 3}, {"jogos": 2}) == []

    def test_chave_que_desaparece_conta_como_zero(self):
        # um parser que deixe de produzir uma secção é a pior versão do problema
        assert quedas(BASE, {"jogos": 307, "competicoes": 37, "equipas": 216}) == [
            "fichas: 180 → 0 (100% a menos)"
        ]

    def test_tolerancia_configuravel(self):
        meio = {**BASE, "jogos": 200}
        assert quedas(BASE, meio, tolerancia=0.05)
        assert quedas(BASE, meio, tolerancia=0.9) == []


class TestDiario:
    def test_sem_diario_nao_ha_linha_de_base(self, tmp_path):
        assert ultima(tmp_path / "nao-existe.jsonl") is None

    def test_grava_e_volta_a_ler(self, tmp_path):
        d = tmp_path / "r.jsonl"
        assert registar(d, BASE, "aplisboa") is True
        assert ultima(d) == BASE

    def test_contagens_iguais_nao_acrescentam_linha(self, tmp_path):
        """Uma linha por ronda tornava o diário num relógio.

        O cron corre de 2 em 2 horas; se cada corrida escrevesse, a Action via alterações e
        comitava para sempre sem nada ter acontecido nos jogos — foi o que já aconteceu com
        o `meta.json`.
        """
        d = tmp_path / "r.jsonl"
        registar(d, BASE, "aplisboa")
        assert registar(d, dict(BASE), "aplisboa") is False
        assert len(d.read_text().splitlines()) == 1

    def test_contagens_novas_acrescentam(self, tmp_path):
        d = tmp_path / "r.jsonl"
        registar(d, BASE, "aplisboa")
        registar(d, {**BASE, "jogos": 320}, "aplisboa")
        assert len(d.read_text().splitlines()) == 2
        assert ultima(d)["jogos"] == 320

    def test_linha_corrompida_nao_mata_a_leitura(self, tmp_path):
        d = tmp_path / "r.jsonl"
        registar(d, BASE, "aplisboa")
        with d.open("a") as f:
            f.write("isto não é json\n")
        # salta a linha estragada e usa a última boa, em vez de perder a linha de base
        assert ultima(d) == BASE

    def test_guarda_o_carimbo_e_o_inquilino(self, tmp_path):
        d = tmp_path / "r.jsonl"
        registar(d, BASE, "apsetubal")
        registo = json.loads(d.read_text().splitlines()[0])
        assert registo["tenant"] == "apsetubal"
        assert registo["ts"].endswith("+00:00")


class TestContar:
    def test_conta_a_arvore_publicada(self, tmp_path):
        (tmp_path / "comp").mkdir()
        (tmp_path / "match").mkdir()
        (tmp_path / "scorers").mkdir()
        (tmp_path / "team").mkdir()
        (tmp_path / "competitions.json").write_text(
            json.dumps({"competicoes": [{"id": 1}, {"id": 2}]}))
        (tmp_path / "comp" / "1.json").write_text(json.dumps({
            "jogos": [{"golos_casa": 2, "golos_fora": 1}, {"golos_casa": None}],
            "classificacao": [{"nome": None, "linhas": [{}, {}, {}]}]}))
        (tmp_path / "match" / "9.json").write_text(json.dumps({
            "cronologia": [{}, {}, {}, {}],
            "equipas": [{"jogadores": [{}, {}]}, {"jogadores": [{}]}]}))
        (tmp_path / "scorers" / "1.json").write_text(json.dumps({"jogadores": [{}, {}]}))
        (tmp_path / "teams.json").write_text(json.dumps({"equipas": [{}, {}, {}]}))
        (tmp_path / "team" / "a.ics").write_text("BEGIN:VCALENDAR")

        c = contar(tmp_path)
        assert c == {"competicoes": 2, "jogos": 2, "jogos_disputados": 1,
                     "linhas_classificacao": 3, "fichas": 1, "eventos_cronologia": 4,
                     "linhas_jogador": 3, "linhas_quadro": 2, "equipas": 3, "feeds_ics": 1}


def test_a_arvore_real_tem_contagens_plausiveis():
    """Guarda contra a função contar() devolver zeros por olhar no sítio errado."""
    import pathlib

    destino = pathlib.Path(__file__).resolve().parents[2] / "web" / "static" / "v1" / "aplisboa" / "2026-27"
    if not (destino / "competitions.json").exists():
        pytest.skip("sem árvore publicada")
    c = contar(destino)
    assert c["competicoes"] >= 30
    assert c["jogos"] >= 500
    assert c["eventos_cronologia"] >= 1000
    assert all(v > 0 for v in c.values()), c


class TestOndeViveODiario:
    def test_encontra_a_raiz_do_repositorio(self, tmp_path):
        """Pela raiz e não por contar `..`.

        A primeira versão subia quatro níveis a partir do destino e aterrava em `web/`,
        criando o diário em `web/data-samples/` sem se queixar. Contar pontos num caminho
        é frágil; procurar o `.git` não é.
        """
        (tmp_path / ".git").mkdir()
        fundo = tmp_path / "web" / "static" / "v1" / "aplisboa" / "2026-27"
        fundo.mkdir(parents=True)
        assert diario_de(fundo, "aplisboa") == \
            tmp_path / "data-samples" / "rondas" / "aplisboa.jsonl"

    def test_fora_de_um_repositorio_fica_ao_lado_dos_dados(self, tmp_path):
        assert diario_de(tmp_path, "fpp") == tmp_path / "rondas" / "fpp.jsonl"


class TestAcumularPedidos:
    """
    O total de pedidos do dia vive no próprio `meta.json` (08/10/2026).

    **No ficheiro e não na memória**, porque cada ronda ao vivo é um processo novo: o
    `aovivo.sh` chama o comando de 30 em 30 segundos e um contador em memória morria com
    cada um.
    """

    class _Fonte:
        def __init__(self, por_tipo):
            self.por_tipo = por_tipo

    def test_soma_a_ronda_ao_total_do_dia(self):
        meta = {"pedidos_dia": {"dia": "2026-10-08", "por_tipo": {"ficha": 10}, "total": 10}}
        d = acumular_pedidos(meta, self._Fonte({"ficha": 3, "calendario": 1}), "2026-10-08")
        assert d["por_tipo"] == {"ficha": 13, "calendario": 1}
        assert d["total"] == 14

    def test_um_dia_novo_recomeca(self):
        meta = {"pedidos_dia": {"dia": "2026-10-07", "por_tipo": {"ficha": 400}, "total": 400}}
        d = acumular_pedidos(meta, self._Fonte({"ficha": 2}), "2026-10-08")
        assert d == {"dia": "2026-10-08", "por_tipo": {"ficha": 2}, "total": 2}

    def test_sem_nada_antes(self):
        d = acumular_pedidos({}, self._Fonte({"competiciones": 1}), "2026-10-08")
        assert d["total"] == 1

    def test_uma_ronda_sem_pedidos_nao_mexe_no_total(self):
        """A ronda ao vivo que não encontra nada a decorrer não pede nada à fonte."""
        meta = {"pedidos_dia": {"dia": "2026-10-08", "por_tipo": {"ficha": 7}, "total": 7}}
        d = acumular_pedidos(meta, self._Fonte({}), "2026-10-08")
        assert d["por_tipo"] == {"ficha": 7}
