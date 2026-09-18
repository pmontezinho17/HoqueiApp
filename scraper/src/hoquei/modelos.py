"""Modelo normalizado. Os IDs da fonte são preservados de propósito: permitem
re-verificar qualquer valor à mão, abrindo o URL original."""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import date, time


@dataclass(frozen=True)
class Temporada:
    id: int
    rotulo: str          # "2026/27"


@dataclass(frozen=True)
class Competicao:
    id: int
    nome: str
    categoria: str       # "SENIORES MASCULINOS", "SUB-15", ...


@dataclass(frozen=True)
class Equipa:
    id: int
    nome: str
    logo: str | None


@dataclass(frozen=True)
class Jogo:
    id: int | None       # id do partido.asp; None se a fonte ainda não o atribuiu
    numero: str | None   # nº do jogo na prova
    grupo: str | None
    jornada: str
    data: date | None
    hora: time | None
    casa: str
    fora: str
    golos_casa: int | None
    golos_fora: int | None
    recinto: str | None

    @property
    def disputado(self) -> bool:
        return self.golos_casa is not None and self.golos_fora is not None

    @property
    def equipas_definidas(self) -> bool:
        """Quadros de taça têm jogos com as equipas ainda por apurar."""
        return self.casa not in ("", "-") and self.fora not in ("", "-")


@dataclass
class Calendario:
    competicao_id: int
    temporada_id: int
    equipas: list[Equipa] = field(default_factory=list)
    jogos: list[Jogo] = field(default_factory=list)


def para_dicionario(obj) -> dict:
    """asdict + datas em ISO, pronto para json.dump."""
    def converter(v):
        if isinstance(v, (date, time)):
            return v.isoformat()
        if isinstance(v, dict):
            return {k: converter(x) for k, x in v.items()}
        if isinstance(v, list):
            return [converter(x) for x in v]
        return v
    return converter(asdict(obj))
