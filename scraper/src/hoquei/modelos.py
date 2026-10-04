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
    #: posto pela ronda ao vivo. Um jogo a decorrer **tem** resultado mas ainda não conta
    #: para a classificação — sem isto, um 0-0 ao primeiro minuto entrava como empate.
    ao_vivo: bool = False

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


# --- ficha de jogo (partido.asp) -------------------------------------------

@dataclass(frozen=True)
class EventoJogo:
    """Uma linha da cronologia (`#desarrollo`).

    O relógio da fonte é decrescente dentro de cada parte ("25:00" = início da parte,
    "0:00" = fim). `minuto` é a conversão para minuto corrido de jogo, para se poder
    desenhar uma timeline sem ter de conhecer as regras do escalão.
    """
    ordem: int                    # 0 = primeiro acontecimento do jogo
    tipo: str                     # golo | falta_equipa | cartao | desconto_tempo |
                                  # penalti_falhado | livre_direto_falhado |
                                  # inicio_parte | fim_parte | fim_jogo | desconhecido
    relogio: str | None           # como a fonte mostra: "3:23"; None em FIN
    parte: int | None
    minuto: int | None            # minuto corrido do jogo (B1.9b)
    equipa: str | None
    jogador: str | None
    assistencia: str | None
    variante: str | None          # livre_direto | penalti | amarelo | azul | vermelho
    numero: int | None            # nº da falta de equipa, ou ordem do cartão
    golos_casa: int | None        # resultado imediatamente após o evento
    golos_fora: int | None
    texto: str                    # texto original, para nada se perder em silêncio


@dataclass(frozen=True)
class LinhaJogador:
    numero: str | None
    nome: str
    titular: bool                 # coluna "5I" (cinco inicial)
    golos: int | None
    assistencias: int | None
    defesas: int | None
    penalidades: str | None       # "1/2" (marcadas/tentadas)
    livres_diretos: str | None
    # as três últimas colunas da ficha, identificadas na fonte pelos ícones
    # tamarilla / tazul / troja
    cartoes_amarelos: int = 0
    cartoes_azuis: int = 0
    cartoes_vermelhos: int = 0
    papel: str | None = None      # None = jogador; D/T/T2/MAS para equipa técnica


@dataclass
class EquipaFicha:
    nome: str
    jogadores: list[LinhaJogador] = field(default_factory=list)


@dataclass
class FichaJogo:
    id: int
    competicao: str | None
    casa: str
    fora: str
    golos_casa: int | None
    golos_fora: int | None
    estado: str | None            # "Jogo Terminado", "Jogo Suspendido", None se por disputar
    data: date | None
    hora: time | None
    recinto: str | None
    arbitros: list[str] = field(default_factory=list)
    faltas: tuple[int | None, int | None] = (None, None)
    #: o que a fonte diz estar a acontecer: "1ª Parte (13:26)", "Intervalo",
    #: "Jogo Terminado", "Jogo sem começar". É daqui que sai tudo o resto.
    situacao: str | None = None
    #: só num jogo a decorrer: "2ª Parte" ou "Intervalo", e o relógio quando há
    periodo: str | None = None
    relogio: str | None = None
    equipas: list[EquipaFicha] = field(default_factory=list)
    cronologia: list[EventoJogo] = field(default_factory=list)
    #: `None` quando a fonte ainda não anexou o boletim, ou nunca o anexa (ver `Boletim`)
    boletim: "Boletim | None" = None

    @property
    def tem_cronologia(self) -> bool:
        """B1.9d: a app usa isto para não abrir uma tab vazia."""
        marcadores = {"fim_jogo", "inicio_parte", "fim_parte", "por_iniciar"}
        return any(e.tipo not in marcadores for e in self.cronologia)


@dataclass(frozen=True)
class Parcial:
    """O resultado num momento do jogo: cada parte, o prolongamento, os grandes penalidades."""
    nome: str
    casa: int | None
    fora: int | None


@dataclass(frozen=True)
class Boletim:
    """O boletim oficial (`#acta`) — o documento que as equipas assinam no fim.

    Existe quase sempre — 207 das 216 fichas publicadas a 03/10, **em todos os escalões** —
    mas não desde o início: **só aparece depois do apito final**, e nem logo. Medido a 02/10
    com a sonda: a ficha saltou 41 915 bytes **seis minutos** depois do "Jogo Terminado".
    Das nove que faltam, seis são jogos que a fonte nunca fechou.

    Por isso o parser devolve `None` em vez de um objecto vazio: quem consome tem de decidir
    o que mostrar, e "não há" é diferente de "está tudo a zeros".
    """
    #: papel → nome, só os que estão preenchidos (cronometrista, delegado técnico, …)
    oficiais: dict[str, str] = field(default_factory=dict)
    parciais: list[Parcial] = field(default_factory=list)
    #: faltas de equipa por parte, que a ficha só dá somadas
    faltas_casa: list[int] = field(default_factory=list)
    faltas_fora: list[int] = field(default_factory=list)
    inicio: list[str] = field(default_factory=list)
    termo: list[str] = field(default_factory=list)
    capitao_casa: str | None = None
    capitao_fora: str | None = None


# --- classificação ---------------------------------------------------------

@dataclass(frozen=True)
class LinhaClassificacao:
    posicao: int
    equipa: str
    logo: str | None
    jogos: int
    vitorias: int
    empates: int
    derrotas: int
    golos_marcados: int
    golos_sofridos: int
    diferenca: int
    racio: float | None       # GM/GS; None quando ainda não sofreu golos (a fonte põe "-")
    pontos: int


@dataclass
class GrupoClassificacao:
    nome: str | None          # "SERIE A"; None quando a prova tem um só grupo
    linhas: list[LinhaClassificacao] = field(default_factory=list)


@dataclass
class Classificacao:
    competicao_id: int
    temporada_id: int
    grupos: list[GrupoClassificacao] = field(default_factory=list)


#: O que a fonte escreve em `situacao` quando o jogo **não** está a decorrer.
#: "Jogo sem começar" e "Jogo não iniciado" são a mesma coisa em dois sítios da página.
FECHADO = frozenset({"Jogo Terminado", "Jogo Suspendido", "Jogo Adiado",
                     "Jogo sem começar", "Jogo não iniciado"})


def em_curso(situacao: str | None) -> bool:
    """O jogo está a decorrer, segundo o campo que a fonte publica na ficha.

    A regra é por exclusão e não por reconhecimento: durante o jogo a `situacao` é
    `"2ª Parte (13:26)"` ou `"Intervalo"`, e ao intervalo não há sequer relógio. Reconhecer
    os textos de jogo a decorrer deixaria de fora o primeiro que a fonte inventasse; excluir
    os de jogo fechado falha do lado seguro — um jogo a mais marcado como a decorrer corrige-se
    na ronda seguinte, um jogo a menos deixa o utilizador sem nada durante todo o jogo.
    """
    if not situacao:
        return False
    s = situacao.strip()
    return s not in FECHADO and "come" not in s.lower()
