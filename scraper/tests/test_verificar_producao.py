"""Testes da verificação pós-publicação — `scripts/verificar_producao.py`.

**O teste que interessa é o `TestAAvariaDe12Outubro`**: ele reconstrói, resposta a resposta, o
que o `hoquei.pages.dev` serviu durante 18 horas, e exige que a verificação o apanhe. Sem isso
este ficheiro seria uma verificação a dizer que está tudo bem, que é exactamente o que tínhamos
antes — os 288 testes do raspador e os 294 da app correram verdes no commit daquela publicação,
e estavam certos: o código estava bem, o build estava bem, o upload estava bem. A Cloudflare é
que serviu mal.

**É o primeiro teste a um ficheiro de `scripts/`**, por isso o import é por caminho: o pytest
deste projecto só olha para `tests/`, e o script não é um módulo do pacote porque também corre
do `aovivo.sh`, fora do ambiente do raspador.
"""
from __future__ import annotations

import importlib.util
import json
import pathlib

import pytest

CAMINHO = pathlib.Path(__file__).parents[2] / "scripts/verificar_producao.py"


def _carregar():
    spec = importlib.util.spec_from_file_location("verificar_producao", CAMINHO)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def vp():
    return _carregar()


# --- os corpos e cabeçalhos de um site são ------------------------------------------------

AGENDA = json.dumps({"jogos": [{"id": 1, "data": "2026-10-17"}]}).encode()
META = json.dumps({"generated_at": "2026-10-13T00:00:00+00:00", "temporada_id": 5}).encode()
COMPS = json.dumps({"competicoes": [{"id": 432}]}).encode()
VERSAO = json.dumps({"versao": "1.1"}).encode()
CACHE_NOSSA = {"cache-control": "public, max-age=20, stale-while-revalidate=600"}


def site_bom(url: str):
    """O que produção serve quando está tudo bem — medido a 13/10/2026, depois da correcção."""
    if url.endswith("/consola"):
        return 200, {}, b"<html><body><input name=chave></body></html>"
    if "/contar" in url:
        return 204, {}, b""
    if "/jogo/" in url:
        return 200, {}, b"<html><body>app</body></html>"
    if url.endswith("/meta.json"):
        return 200, CACHE_NOSSA, META
    if url.endswith("/agenda.json"):
        return 200, CACHE_NOSSA, AGENDA
    if url.endswith("/competitions.json"):
        return 200, CACHE_NOSSA, COMPS
    if url.endswith("/versao.json"):
        return 200, {}, VERSAO
    raise AssertionError(f"a verificação pediu algo inesperado: {url}")


def site_so_estaticos(url: str):
    """**O que produção serviu entre as 23:42 de 12/10 e as 17:45 de 13/10.**

    Os ficheiros estáticos saíam; as Functions, o `_redirects` e o `_headers` não. Os 404 de 0
    bytes e o `s-maxage=604800` são os valores reais, lidos com `curl`.
    """
    if url.endswith("/consola") or "/contar" in url or "/jogo/" in url:
        return 404, {"cache-control": "no-store"}, b""
    cache_por_omissao = {"cache-control": "public, s-maxage=604800"}
    if url.endswith("/meta.json"):
        return 200, cache_por_omissao, META
    if url.endswith("/agenda.json"):
        return 200, cache_por_omissao, AGENDA
    if url.endswith("/competitions.json"):
        return 200, cache_por_omissao, COMPS
    if url.endswith("/versao.json"):
        return 200, cache_por_omissao, VERSAO
    raise AssertionError(url)


def correr(vp, monkeypatch, site, tentativas=1, base=None):
    """Por omissão finge ser **produção**: é lá que todas as verificações se aplicam.

    A da consola salta-se fora de produção de propósito — ver o `consola_viva` —, e um teste
    que corresse contra um anfitrião qualquer estaria a medir menos do que diz.
    """
    monkeypatch.setattr(vp, "_pedir", site)
    return vp.verificar(base or vp.PRODUCAO, tentativas=tentativas, dormir=lambda _s: None)


class TestQuandoEstaBem:
    def test_nao_devolve_falha_nenhuma(self, vp, monkeypatch):
        assert correr(vp, monkeypatch, site_bom) == []

    def test_e_o_programa_sai_a_zero(self, vp, monkeypatch):
        monkeypatch.setattr(vp, "_pedir", site_bom)
        assert vp.main(["--base", vp.PRODUCAO, "--tentativas", "1"]) == 0


class TestAAvariaDe12Outubro:
    """A avaria a sério, reconstruída. Se algum destes passar a verde, a rede desapareceu."""

    @pytest.fixture
    def falhas(self, vp, monkeypatch):
        return correr(vp, monkeypatch, site_so_estaticos)

    def test_e_apanhada(self, falhas):
        assert falhas, "a verificação não apanhou a avaria que a motivou"

    def test_diz_que_as_functions_nao_respondem(self, falhas):
        assert any("Functions" in f for f in falhas), falhas

    def test_diz_que_os_links_directos_nao_abrem(self, falhas):
        assert any("_redirects" in f for f in falhas), falhas

    def test_diz_que_a_cache_dos_dados_nao_e_a_nossa(self, falhas):
        """**A mais importante das três.** É a única que não dá sinal nenhum a quem usa a app:
        a app mostra números, só que os de antes. Num sábado seriam os resultados congelados
        na borda durante uma semana."""
        assert any("congelar" in f for f in falhas), falhas

    def test_e_o_programa_sai_a_um(self, vp, monkeypatch):
        monkeypatch.setattr(vp, "_pedir", site_so_estaticos)
        assert vp.main(["--base", vp.PRODUCAO, "--tentativas", "1"]) == 1


class TestCadaVerificacaoSozinha:
    """Uma avaria de cada vez, para nenhuma das verificações poder passar por acidente."""

    def _com(self, vp, monkeypatch, estrago):
        def site(url: str):
            r = estrago(url)
            return r if r is not None else site_bom(url)
        return correr(vp, monkeypatch, site)

    def test_a_consola_a_dar_503_por_falta_de_chave(self, vp, monkeypatch):
        """O caso real de alguém apagar a `CHAVE_CONTAGENS` no painel de produção."""
        falhas = self._com(vp, monkeypatch, lambda u: (
            (503, {}, b"A consola nao tem chave configurada neste projecto.")
            if u.endswith("/consola") else None))
        assert len(falhas) == 1 and "/consola" in falhas[0]

    def test_a_mesma_consola_a_503_fora_de_producao_nao_e_falha(self, vp, monkeypatch):
        """No site de testes a `CHAVE_CONTAGENS` não existe e o 503 está certo. Verificá-lo
        ali era ensinar-nos a ignorar esta verificação — e a de produção com ela."""
        def site(url):
            if url.endswith("/consola"):
                return 503, {}, b"A consola nao tem chave configurada neste projecto."
            return site_bom(url)
        assert correr(vp, monkeypatch, site, base="https://testes.hoquei.pages.dev") == []

    def test_o_contador_a_dar_500(self, vp, monkeypatch):
        falhas = self._com(vp, monkeypatch,
                           lambda u: (500, {}, b"") if "/contar" in u else None)
        assert len(falhas) == 1 and "/contar" in falhas[0]

    def test_um_link_directo_a_dar_404(self, vp, monkeypatch):
        falhas = self._com(vp, monkeypatch,
                           lambda u: (404, {}, b"") if "/jogo/" in u else None)
        assert len(falhas) == 1 and "_redirects" in falhas[0]

    def test_a_agenda_a_perder_a_chave_jogos(self, vp, monkeypatch):
        """O contrato `/v1` a mudar de forma — o defeito que deixa os telemóveis com a app
        vazia **e sem explicação**, porque do nosso lado não dá erro nenhum."""
        falhas = self._com(vp, monkeypatch, lambda u: (
            (200, CACHE_NOSSA, json.dumps({"partidas": []}).encode())
            if u.endswith("/agenda.json") else None))
        assert len(falhas) == 1 and "contrato mudou" in falhas[0]

    def test_um_json_truncado(self, vp, monkeypatch):
        falhas = self._com(vp, monkeypatch, lambda u: (
            (200, CACHE_NOSSA, b'{"jogos": [') if u.endswith("/agenda.json") else None))
        assert len(falhas) == 1 and "não é JSON válido" in falhas[0]

    def test_o_versao_json_a_desaparecer(self, vp, monkeypatch):
        """Sem ele a app volta a interromper todos a cada publicação — e também não dá erro."""
        falhas = self._com(vp, monkeypatch,
                           lambda u: (404, {}, b"") if u.endswith("/versao.json") else None)
        assert len(falhas) == 1 and "/versao.json" in falhas[0]


class TestAsTentativas:
    def test_um_solucco_de_rede_nao_poe_a_ronda_vermelha(self, vp, monkeypatch):
        """Uma ronda vermelha por causa de um soluço ensina a ignorar rondas vermelhas."""
        falhou_uma_vez = {"consola": 0}

        def site(url: str):
            if url.endswith("/consola"):
                falhou_uma_vez["consola"] += 1
                if falhou_uma_vez["consola"] == 1:
                    raise TimeoutError("timed out")
            return site_bom(url)

        assert correr(vp, monkeypatch, site, tentativas=3) == []
        assert falhou_uma_vez["consola"] == 2, "não repetiu a verificação que falhou"

    def test_mas_uma_avaria_a_sério_nao_se_salva_com_tentativas(self, vp, monkeypatch):
        assert correr(vp, monkeypatch, site_so_estaticos, tentativas=3)

    def test_uma_excepcao_de_rede_e_uma_falha_e_nao_um_estouro(self, vp, monkeypatch):
        def site(url: str):
            raise OSError("sem DNS")
        falhas = correr(vp, monkeypatch, site, tentativas=1)
        assert len(falhas) == len(vp.VERIFICACOES)
        assert all("não se conseguiu verificar" in f for f in falhas)
