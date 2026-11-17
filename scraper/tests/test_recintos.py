"""Os outros nomes dos pavilhões — ver a secção `outros_nomes` de `dados/recintos.json`."""
import json
import pathlib

from hoquei.recintos import conhecidas, localizacao

DADOS = json.loads((pathlib.Path(__file__).parents[1] / "src/hoquei/dados/recintos.json")
                   .read_text(encoding="utf-8"))


def test_cada_outro_nome_aponta_para_um_recinto_com_morada():
    """Um outro nome que aponte para um recinto sem morada, ou que não exista, não serve de nada
    e esconde uma gralha. Medido a 17/11/2026: 18 nomes da FPP, todos para recintos da APL."""
    for outro, nome in DADOS["outros_nomes"].items():
        assert nome in DADOS["recintos"], f"{outro} → {nome}, que não está na lista"
        assert DADOS["recintos"][nome].get("morada"), f"{outro} → {nome}, que não tem morada"
        assert outro not in DADOS["recintos"], f"{outro} está nas duas secções"


def test_o_outro_nome_herda_a_morada():
    assert localizacao("PAV. AD OEIRAS") == localizacao("PAV. A.D.OEIRAS") == "Sports Association of Oeiras"
    assert localizacao("PAV. ESC. SEC. FERNANDO LOPES GRAÇA") == conhecidas()["PAV. PAREDE"]
    # e o que não se sabe continua a cair no nome, que é melhor do que uma morada inventada
    assert localizacao("PAV. DA LUZ") == "PAV. DA LUZ"
