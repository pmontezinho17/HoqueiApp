"""Agregação de estatística individual por competição (B1.20).

Os números por jogador vivem espalhados por uma ficha de jogo cada. Somá-los no browser
obrigaria a app a descarregar dezenas de ficheiros de 10 KB para desenhar uma tabela, por
isso a soma é feita aqui e publicada já pronta.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Totais:
    nome: str
    equipa: str
    numero: str | None = None
    posicao: str | None = None          # GR (guarda-redes) ou JC (jogador de campo)
    jogos: int = 0
    golos: int = 0
    assistencias: int = 0
    defesas: int = 0
    amarelos: int = 0
    azuis: int = 0
    vermelhos: int = 0

    @property
    def pontos(self) -> int:
        """Golos + assistências, a medida habitual de contribuição ofensiva."""
        return self.golos + self.assistencias


@dataclass
class Quadro:
    competicao_id: int
    jogos_considerados: int = 0
    # TODOS os que alinharam, não só quem marcou: a página de equipa precisa do plantel
    # completo, e o quadro de marcadores filtra no cliente
    jogadores: list[dict] = field(default_factory=list)
    # a fonte só regista defesas numa minoria das fichas; a app usa isto para não
    # mostrar um quadro de guarda-redes quase vazio como se fosse a realidade
    tem_defesas: bool = False


def agregar(fichas: list[dict], competicao_id: int) -> Quadro:
    """Soma por (equipa, nome): o mesmo nome em clubes diferentes é outra pessoa."""
    por_jogador: dict[tuple[str, str], Totais] = {}
    considerados = 0

    for ficha in fichas:
        if ficha.get("individuais_omitidos"):
            continue                                  # escalão sem dados individuais
        considerados += 1
        for equipa in ficha.get("equipas", []):
            for linha in equipa.get("jogadores", []):
                if linha.get("papel"):
                    continue                          # equipa técnica não é jogador
                nome = (linha.get("nome") or "").strip()
                if not nome:
                    continue
                chave = (equipa["nome"], nome)
                t = por_jogador.setdefault(chave, Totais(nome=nome, equipa=equipa["nome"]))
                # o número e a posição vêm da ficha mais recente em que apareceu
                t.numero = linha.get("numero") or t.numero
                t.jogos += 1
                t.golos += linha.get("golos") or 0
                t.assistencias += linha.get("assistencias") or 0
                t.defesas += linha.get("defesas") or 0
                t.amarelos += linha.get("cartoes_amarelos") or 0
                t.azuis += linha.get("cartoes_azuis") or 0
                t.vermelhos += linha.get("cartoes_vermelhos") or 0

    ordenados = sorted(
        por_jogador.values(),
        key=lambda t: (-t.golos, -t.assistencias, t.jogos, t.nome),
    )
    return Quadro(
        competicao_id=competicao_id,
        jogos_considerados=considerados,
        tem_defesas=any(t.defesas for t in ordenados),
        jogadores=[{
            "nome": t.nome, "equipa": t.equipa, "jogos": t.jogos,
            "numero": t.numero,
            "golos": t.golos, "assistencias": t.assistencias,
            "defesas": t.defesas, "pontos": t.pontos,
            "amarelos": t.amarelos, "azuis": t.azuis, "vermelhos": t.vermelhos,
        } for t in ordenados],
    )
