import pathlib
import pytest


def pytest_collection_modifyitems(config, items):
    """Marca com `fonte` tudo o que depende do que a APL publica **neste momento**.

    Automático, e não um decorador por teste, por duas razões: um teste novo que use o
    fixture `provas` fica marcado sem ninguém se lembrar, e a marca não se perde numa
    reorganização do ficheiro.

    O que a marca serve está no `pyproject.toml` e no `dados.yml`: estes testes avisam mas
    **não bloqueiam** a publicação, porque uma incoerência passageira da fonte não é um
    defeito nosso — e a 11/10/2026 custou-nos 16 horas sem publicar nada.
    """
    for item in items:
        if "provas" in getattr(item, "fixturenames", ()):
            item.add_marker(pytest.mark.fonte)

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


def _ler_ficha(nome: str) -> str:
    # partido.asp vem em Windows-1252, ao contrário das páginas ?seccion=
    return (AMOSTRAS / nome).read_bytes().decode("cp1252")


@pytest.fixture(scope="session")
def ficha_seniores() -> str:
    """Jogo terminado de seniores: 2 partes de 25 min, com cartões, penáltis e livres diretos."""
    return _ler_ficha("apl-ficha-seniores-terminado.html")


@pytest.fixture(scope="session")
def ficha_escolares() -> str:
    """Jogo de formação: 4 partes de 8 min. Anonimizado — ver scripts/anonimizar_ficha.py."""
    return _ler_ficha("apl-ficha-escolares-4partes.html")


@pytest.fixture(scope="session")
def ficha_escolares_com_boletim() -> str:
    """Escolares com o boletim oficial **anonimizado e não removido** — HC ALFA A 0-5 CD BETA A.

    É a amostra que guarda a grelha `5I` — quem jogou que meia parte — e por isso é a rede do
    `parsers/participacao.py` e do `merito.py`.

    **Os clubes também são fictícios, e isso é deliberado.** Trinta nomes de pessoas estão
    trocados por pseudónimos, mas os números de camisola ficaram, porque são estrutura que o
    parser lê — e com o clube e a data verdadeiros ao lado, um número de camisola voltava a
    identificar uma criança a quem tivesse o boletim original. Com as equipas trocadas, isto
    deixa de ser um registo pseudonimizado de um jogo real e passa a ser só a forma da
    página. Gerado pelo `scripts/anonimizar_ficha.py --equipa`.
    """
    return _ler_ficha("apl-ficha-escolares-boletim.html")


@pytest.fixture(scope="session")
def ficha_com_cartao_ao_banco() -> str:
    """A única amostra com um cartão a um **não atleta** — HC ALFA 3-7 CD BETA, SUB-19.

    Existe por uma razão só: o Artigo 92.º ponto 4.2 desconta -4 por um vermelho por
    acumulação e -6 por um directo, e a ficha (`#jugadores`) não distingue os dois — diz
    "1 vermelho" e mais nada. **O boletim distingue**, e esta amostra prova onde: o treinador
    da equipa visitada tem o `X` na coluna `dir.`.

    Varri as 317 fichas publicadas a 12/10/2026 à procura de cartões a não atletas: 42, em
    sete escalões, e **zero nos Encontros Distritais** — ou seja, hoje o 4.2 não mexe em
    nenhuma tabela de Mérito. A amostra é de SUB-19 porque é onde há um vermelho para ver, e
    serve igual: a estrutura do banco no boletim é a mesma em todos os escalões.

    Anonimizada com os clubes trocados, pela mesma razão que a de Escolares.
    """
    return _ler_ficha("apl-ficha-cartao-ao-banco.html")


@pytest.fixture(scope="session")
def ficha_por_disputar() -> str:
    return _ler_ficha("apl-ficha-por-disputar.html")


@pytest.fixture(scope="session")
def html_classificacao() -> str:
    return _ler("apl-classificacao-432.html")


@pytest.fixture(scope="session")
def html_calendario_sem_grupo() -> str:
    """Prova de série única: as linhas de jogo têm 9 colunas, sem a coluna de grupo."""
    return _ler("apl-calendario-sem-grupo.html")
