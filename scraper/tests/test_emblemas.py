import io

from PIL import Image

from hoquei.emblemas import LADO, caminho_publico, converter, id_do_logo


def test_extrai_o_id_de_urls_absolutos_e_relativos():
    """A fonte é inconsistente: o calendário dá URLs absolutos e a classificação relativos."""
    assert id_do_logo("https://aplisboa.assyssoftware.es/intranet/logos/8.png") == "8"
    assert id_do_logo("/intranet/logos/8.png") == "8"
    assert id_do_logo(None) is None
    assert id_do_logo("") is None
    assert id_do_logo("/sem/padrao") is None


def test_caminho_e_da_nossa_origem():
    # nunca apontar para a fonte: seria ela a pagar o tráfego de imagens
    assert caminho_publico("8") == "/emblemas/8.webp"


def _png(w: int, h: int) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (200, 30, 30)).save(buf, format="PNG")
    return buf.getvalue()


def test_converte_para_quadrado_sem_distorcer():
    img = Image.open(io.BytesIO(converter(_png(400, 200))))
    assert img.size == (LADO, LADO)
    assert img.format == "WEBP"


def test_encolhe_muito_um_png_grande():
    grande = _png(1000, 1000)
    pequeno = converter(grande)
    assert len(pequeno) < len(grande) / 5, f"{len(grande)} → {len(pequeno)}"


def test_nao_amplia_um_emblema_pequeno():
    img = Image.open(io.BytesIO(converter(_png(32, 32))))
    assert img.size == (LADO, LADO)          # a moldura é sempre quadrada
    # mas o conteúdo não foi esticado: o resto é transparente
    assert img.convert("RGBA").getpixel((2, 2))[3] == 0


# ─────────────────────────────────────────────────────────────────────────────────────────
# Toda a equipa publicada tem emblema.
#
# ## Porque é que isto é um teste e não uma medição numa mensagem
#
# O item B1.13 do backlog dizia que havia grafias de clube erradas na fonte e que elas
# "partem emblemas e junções por nome". Estava medido a 05/10/2026: 3 nomes em 86. A 13/10
# fui normalizá-las e **remedi primeiro**: duas já não existiam, porque a APL as corrigiu, e
# a terceira nunca tinha sido um erro — o parêntesis em `AE FISICA D (B)` é o escalão, não
# uma grafia alternativa, e normalizá-la fundia duas equipas diferentes. B1.13 fechou sem
# código.
#
# O que fica dessa noite é a pergunta, não a resposta: *há alguma equipa publicada sem
# emblema?* Hoje a resposta é não, e uma grafia nova e errada na fonte é precisamente o que a
# faria mudar. Deixar isto escrito num documento obrigava a remedir à mão da próxima vez —
# que foi exactamente o que quase me enganou.
#
# Lê o que **nós** publicámos e não a fonte: zero pedidos à APL, e por isso não leva a marca
# `fonte`. Se não houver nada publicado, salta.


def _publicado(nome: str):
    import json
    from pathlib import Path

    raiz = Path(__file__).resolve().parents[2] / "web" / "static" / "v1" / "aplisboa"
    for temporada in sorted(raiz.glob("*/"), reverse=True):
        f = temporada / nome
        if f.exists():
            return json.loads(f.read_text(encoding="utf-8")), temporada
    return None, None


def test_toda_a_equipa_publicada_tem_emblema():
    import json
    import pytest

    emblemas, temporada = _publicado("emblemas.json")
    if emblemas is None:
        pytest.skip("sem dados publicados em web/static/v1 — correr `cli publicar` primeiro")

    nomes: set[str] = set()
    for f in sorted((temporada / "comp").glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        nomes.update(e["nome"] for e in d.get("equipas", []))
    agenda, _ = _publicado("agenda.json")
    for j in (agenda or {}).get("jogos", []):
        nomes.update(x for x in (j.get("casa"), j.get("fora")) if x)

    # Guarda contra o teste passar por não ter encontrado nada que verificar.
    assert len(nomes) >= 50, f"só {len(nomes)} nomes de equipa — a amostra encolheu?"

    sem = sorted(n for n in nomes if n not in emblemas)
    assert not sem, (
        f"{len(sem)} equipas publicadas sem emblema — uma grafia nova na fonte?\n  "
        + "\n  ".join(sem[:20])
    )
