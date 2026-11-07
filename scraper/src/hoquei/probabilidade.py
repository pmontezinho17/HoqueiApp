"""A probabilidade de vitória, empate e derrota antes de cada jogo (#11, fase 3).

**É uma previsão, e não pretende ser mais do que isso.** O dono disse-o a 07/11/2026 ao pedir
esta fase: *"não tem de ser 100% eficaz (…) lembra-te que isto é apenas uma previsão"*. O que
se exige dela é **não mentir sobre a própria confiança**: quando diz 75%, o favorito tem de
ganhar perto de 75 vezes em cada 100. É essa a medida que escolheu o modelo, e é essa que o
`test_probabilidade.py` vigia.

**O modelo é a média de dois, e é a mistura que ganha** — medido a 07/11/2026 nos 524 jogos
oficiais disputados, prevendo cada mês só com os anteriores (331 jogos em outubro e novembro
em que as duas equipas já tinham jogado):

* **Elo com margem**: cada equipa tem uma força que sobe e desce com cada resultado, mais
  quanto maior a diferença de golos. O empate pelo modelo de Davidson.
* **Poisson**: os golos esperados de cada equipa a partir do que ela marca e sofre, puxados
  para a média do escalão enquanto há poucos jogos. A probabilidade sai de todos os resultados
  possíveis.
* Sem modelo — as frequências da época —, o mais provável acontecia em 47% dos jogos. Cada um
  dos dois, afinado, em 76% a 79%. **A média dos dois, sem afinar, em 80%**, e com a melhor
  pontuação das três (log loss 0,53 contra 0,56 e 0,59).
* A média era modesta de mais: quando dizia 70–80%, o favorito ganhava 87%. Daí o `AFIAR`,
  que eleva as três probabilidades a 1,4 e as normaliza. Afinado só com setembro deu 1,4, e
  com setembro e outubro deu outra vez 1,4. Depois disso, em 331 jogos: o favorito ganhou
  80%; dito 55% aconteceu 54%, dito 75% aconteceu 74%, dito 85% aconteceu 88%, e dito 96%
  aconteceu 96%.

O que se tentou e **não** ficou, para ninguém repetir:

* **A força do clube noutros escalões** como ponto de partida das equipas com poucos jogos.
  Ganhava nos jogos de afinação e perdia nos outros: era afinar sobre ruído.
* **Encolher o empate**. Há 20 empates em 524 jogos, e com 4 nos jogos de afinação o valor
  escolhido estava errado no mês seguinte, que teve 7.

**Só há probabilidade quando as duas equipas já jogaram**: a primeira jornada de uma equipa
seria um palpite sobre o nome. Os Torneios Particulares não entram, como no resto do
separador.
"""
from __future__ import annotations

import math
from collections import defaultdict

# Os números escolhidos a 07/11/2026 — ver a docstring. Mexer num muda a calibração, e o
# `test_probabilidade.py` mede-a outra vez sobre os dados publicados.
ELO_K = 120
ELO_CASA = 25           # pontos de Elo da equipa da casa
ELO_EMPATE = 0.05       # o ν de Davidson
POISSON_PESO = 4        # quantos jogos "da média do escalão" entram em cada equipa
POISSON_CASA = 1.05
AFIAR = 1.4
INICIAL = 1500.0
MEDIA_SEM_JOGOS = 4.5   # golos por equipa e jogo num escalão que ainda não jogou nada


def chave(j: dict) -> tuple[str, str, int]:
    """A ordem do calendário, a mesma do `prejogo`."""
    return (j["data"], j.get("hora") or "99:99", j["id"])


def _poisson(l: float, ate: int) -> list[float]:
    p = [math.exp(-l)]
    for x in range(1, ate):
        p.append(p[-1] * l / x)
    return p


class Previsor:
    """O estado da época até um certo jogo. `prever` antes de `aprender`, jogo a jogo."""

    def __init__(self) -> None:
        self.elo: dict[tuple, float] = defaultdict(lambda: INICIAL)
        self.jogos: dict[tuple, int] = defaultdict(int)
        self.marcados: dict[tuple, float] = defaultdict(float)
        self.sofridos: dict[tuple, float] = defaultdict(float)
        self.golos_do_escalao: dict[str, float] = defaultdict(float)
        self.jogos_do_escalao: dict[str, int] = defaultdict(int)

    def _equipas(self, j: dict) -> tuple[tuple, tuple]:
        return (j["cat"], j["casa"]), (j["cat"], j["fora"])

    def _elo(self, a: tuple, b: tuple) -> tuple[float, float, float]:
        d = self.elo[a] - self.elo[b] + ELO_CASA
        pa, pb = 10 ** (d / 800), 10 ** (-d / 800)
        e = ELO_EMPATE * math.sqrt(pa * pb)
        s = pa + pb + e
        return pa / s, e / s, pb / s

    def _media(self, cat: str) -> float:
        n = self.jogos_do_escalao[cat]
        return self.golos_do_escalao[cat] / (2 * n) if n else MEDIA_SEM_JOGOS

    def _golos(self, a: tuple, b: tuple) -> tuple[float, float, float]:
        mu = self._media(a[0])
        ataque = lambda t: (self.marcados[t] / mu + POISSON_PESO) / (self.jogos[t] + POISSON_PESO)
        defesa = lambda t: (self.sofridos[t] / mu + POISSON_PESO) / (self.jogos[t] + POISSON_PESO)
        la = max(0.05, mu * ataque(a) * defesa(b) * POISSON_CASA)
        lb = max(0.05, mu * ataque(b) * defesa(a) / POISSON_CASA)
        # até 70 golos: o maior resultado da época é um 35–2 (Sub-17), e λ não passa de 30
        pa, pb = _poisson(la, 70), _poisson(lb, 70)
        acumulado, vitoria, empate = 0.0, 0.0, 0.0
        for x in range(70):
            vitoria += pa[x] * acumulado
            empate += pa[x] * pb[x]
            acumulado += pb[x]
        return vitoria, empate, max(0.0, 1 - vitoria - empate)

    def prever(self, j: dict) -> tuple[float, float, float] | None:
        a, b = self._equipas(j)
        if not self.jogos[a] or not self.jogos[b]:
            return None
        media = [(x + y) / 2 for x, y in zip(self._elo(a, b), self._golos(a, b))]
        afiada = [x ** AFIAR for x in media]
        s = sum(afiada)
        return tuple(x / s for x in afiada)  # type: ignore[return-value]

    def aprender(self, j: dict) -> None:
        a, b = self._equipas(j)
        gc, gf = j["gc"], j["gf"]
        d = self.elo[a] - self.elo[b] + ELO_CASA
        esperado = 1 / (1 + 10 ** (-d / 400))
        real = 1.0 if gc > gf else 0.5 if gc == gf else 0.0
        # a margem conta, mas cada vez menos; e o favorito que ganha por muito ganha menos
        # pontos do que o mais fraco que ganha pelo mesmo — senão as forças subiam sem fim
        margem = math.log(1 + abs(gc - gf))
        do_vencedor = d if real == 1 else -d if real == 0 else 0
        margem *= 2.2 / (do_vencedor * 0.001 + 2.2)
        self.elo[a] += ELO_K * margem * (real - esperado)
        self.elo[b] -= ELO_K * margem * (real - esperado)
        for t, m, s in ((a, gc, gf), (b, gf, gc)):
            self.marcados[t] += m
            self.sofridos[t] += s
            self.jogos[t] += 1
        self.golos_do_escalao[j["cat"]] += gc + gf
        self.jogos_do_escalao[j["cat"]] += 1


def previsoes(oficiais: list[dict]) -> dict[int, tuple[float, float, float] | None]:
    """jogo → (casa, empate, fora), cada um com o que se sabia antes dele.

    Os disputados pela ordem do calendário, cada um antes de aprender com ele. Os por disputar
    com tudo o que já se jogou — mesmo um adiado, que tem data antiga e vem atrás de jogos já
    disputados.
    """
    p = Previsor()
    r: dict[int, tuple[float, float, float] | None] = {}
    pendentes = []
    for j in sorted(oficiais, key=chave):
        if j.get("gc") is None or j.get("gf") is None:
            pendentes.append(j)
            continue
        r[j["id"]] = p.prever(j)
        p.aprender(j)
    for j in pendentes:
        r[j["id"]] = p.prever(j)
    return r


def em_percentagem(p: tuple[float, float, float] | None) -> dict | None:
    """Inteiros que somam 100, pelos maiores restos — como as partes do jogo na app.

    **E nenhum abaixo de 1%.** Num jogo muito desequilibrado o modelo diz 99,7%, e arredondado
    isso era "100%" contra "0%" — uma certeza que uma previsão não tem. Visto a 07/11/2026 no
    AD OEIRAS A–CRIAR-T GD dos Sub-15, e medido nesse dia: 127 dos 670 prejogo com previsão
    tinham um 0%, e 46 um 100%. Dos jogos a que o modelo dava mais de 90%, o favorito ganhou
    96%: o que falta para os 100 existe, e escreve-se.
    """
    if p is None:
        return None
    exactas = [100 * x for x in p]
    r = [math.floor(x) for x in exactas]
    falta = 100 - sum(r)
    for i in sorted(range(3), key=lambda i: (-(exactas[i] - r[i]), i))[:falta]:
        r[i] += 1
    for i in range(3):
        if r[i] == 0:
            r[i] = 1
            r[max(range(3), key=lambda k: r[k])] -= 1
    return {"casa": r[0], "empate": r[1], "fora": r[2]}


def medir(oficiais: list[dict]) -> dict:
    """O que o modelo vale nos jogos já disputados: acerto, log loss e calibração.

    A calibração é a do favorito: em cada caixa de 10 pontos, a probabilidade média que se lhe
    deu e as vezes que ganhou. Ver `test_probabilidade.py`.
    """
    prev = previsoes(oficiais)
    n = acertos = 0
    logloss = 0.0
    caixas: dict[int, list[float]] = defaultdict(lambda: [0, 0, 0.0])
    for j in oficiais:
        p = prev.get(j["id"])
        if j.get("gc") is None or p is None:
            continue
        real = 0 if j["gc"] > j["gf"] else 1 if j["gc"] == j["gf"] else 2
        n += 1
        acertos += max(range(3), key=lambda i: p[i]) == real
        logloss -= math.log(max(p[real], 1e-9))
        favorito = 0 if p[0] >= p[2] else 2
        c = caixas[min(9, int(p[favorito] * 10))]
        c[0] += 1
        c[1] += real == favorito
        c[2] += p[favorito]
    return {
        "jogos": n,
        "acerto": acertos / n if n else 0.0,
        "logloss": logloss / n if n else 0.0,
        "calibracao": {10 * k: {"jogos": int(c[0]), "dito": c[2] / c[0], "aconteceu": c[1] / c[0]}
                       for k, c in sorted(caixas.items())},
    }
