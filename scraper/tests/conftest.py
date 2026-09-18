import pathlib
import pytest

AMOSTRAS = pathlib.Path(__file__).resolve().parent.parent.parent / "data-samples" / "paginas"


def _ler(nome: str) -> str:
    # as páginas ?seccion= vêm em UTF-8 (só o partido.asp é que é cp1252)
    return (AMOSTRAS / nome).read_bytes().decode("utf-8")


@pytest.fixture(scope="session")
def html_competicoes() -> str:
    return _ler("apl-competicoes-t5.html")


@pytest.fixture(scope="session")
def html_calendario() -> str:
    return _ler("apl-calendario-432.html")
