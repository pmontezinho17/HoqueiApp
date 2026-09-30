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
