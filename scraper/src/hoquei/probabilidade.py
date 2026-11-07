"""A probabilidade de vitória, empate e derrota antes de cada jogo (#11, fase 3).

**É uma previsão, e não pretende ser mais do que isso.** O dono disse-o a 07/11/2026 ao pedir
esta fase: *"não tem de ser 100% eficaz (…) lembra-te que isto é apenas uma previsão"*. O que
se exige dela é **não mentir sobre a própria confiança**: quando diz 75%, o favorito tem de
ganhar perto de 75 vezes em cada 100. É essa a medida que escolheu o modelo, e é essa que o
`test_probabilidade.py` vigia.

**O modelo é a média de dois, e é a mistura que ganha** — medido nos jogos oficiais
disputados, prevendo cada mês só com os anteriores (331 jogos em outubro e novembro em que as
duas equipas já tinham jogado):

* **Elo com margem**: cada equipa tem uma força que sobe e desce com cada resultado, mais
  quanto maior a diferença de golos, com rendimentos decrescentes (o logaritmo da margem) e
  menos para o favorito que ganha por muito — a receita do FiveThirtyEight. O empate pelo
  modelo de Davidson.
* **Golos esperados ajustados ao adversário** (o modelo de Maher, 1982, a base do
  Dixon-Coles): cada equipa tem um ataque e uma defesa, e cada resultado explica-se pelos dois
  lados. Um 26–0 ao SC TORRES diz sobretudo que a defesa do SC TORRES é fraca — e conta pouco
  para um jogo entre duas equipas boas. Ver `_ajustar`.
* Sem modelo — as frequências da época —, o mais provável acontecia em 47% dos jogos.
* A média dos dois é afiada por um expoente, `AFIAR`, porque sozinha era modesta de mais.

**Os golos sem ajuste ao adversário foram a primeira versão, e estavam errados.** A 07/11/2026
o dono olhou para o CD PAÇO ARCOS A–AD OEIRAS A dos Sub-13 — duas equipas do topo, uma vitória
para cada uma no confronto directo — e o separador dava 67% ao Paço de Arcos: *"não deverá ser
por goleadas que eu devo contabilizar mais (…) não faz sentido num jogo entre duas equipas
boas"*. Tinha razão, e a causa era esta: os golos marcados contavam por inteiro, fosse contra
quem fosse, e o Paço de Arcos tinha 24–0 e 26–0 ao SC TORRES. Ajustados ao adversário, os golos
esperados desse jogo descem para 2,1–1,9 e a previsão fica 55–9–36. E **melhorou no conjunto**,
nos mesmos 331 jogos:

* o mais provável aconteceu em 81,3% (era 80,1%), com log loss 0,487 (era 0,512);
* o expoente afinado saiu 1,2 com setembro e outra vez 1,2 com setembro e outubro;
* calibração do favorito: dito 55% aconteceu 45% (31 jogos), 66% → 73%, 75% → 71%,
  86% → 87%, 96% → 97%; empates, 10,1 previstos e 12 reais — e nos 90 jogos em que o favorito
  tinha menos de 70%, 5,7 previstos e 5 reais.

**E os resultados da secretaria não ensinam nada** (07/11/2026, ver `administrativos`). O
AE FISICA D A–PAREDE FC A dos Sub-13 saiu 16–3–81 e acabou 2–2; o dono perguntou porquê, e a
causa era um 0–10 do AE FISICA D A na primeira jornada que foi um castigo e não um resultado
de campo — os dez golos estão no mesmo segundo e sem marcador. Sem os 6 jogos assim, esse jogo fica 29–6–65, e o conjunto
melhora nos mesmos 406 jogos: acerto 79,3% → 80,5%, log loss 0,4945 → 0,4877. Nos 324 jogos de
outubro e novembro, com o expoente afinado outra vez só com os meses anteriores (1,2 e 1,3; fica
1,2): acerto 84%, log loss 0,450.

O que se tentou e **não** ficou, para ninguém repetir:

* **Limitar as goleadas** (contar no máximo 10 ou 15 golos de diferença). Aproximava aquele
  jogo, mas tirava acerto à época (77,0% → 76,5%), como num teste publicado com o futebol
  americano universitário em que cada limite tirava acerto. O ajuste ao adversário resolve o
  mesmo problema pela razão certa, e acerta mais.
* **Dar peso extra ao confronto directo.** Nos 85 jogos que já tinham um, piorou com os quatro
  pesos testados: os jogos entre as duas já entram nas contas como os outros.
* **Pesar mais os jogos recentes** (o ξ do Dixon-Coles): não mudou nada que se medisse.
* **Juntar os nomes do Torneio de Abertura aos do campeonato** (AE FISICA A e AE FISICA D A).
  Não se tentou, de propósito: são 113 jogos-equipa fora do nome do campeonato, e em muitos
  não há como saber qual equipa jogou — o SPORTING CP do torneio é a A ou a B. Ver o
  `test_as_equipas_de_uma_fase_nova_ja_existiam_na_anterior`.
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
POISSON_PESO = 2        # quantos golos "de equipa média" entram no ataque e na defesa de cada uma
POISSON_CASA = 1.05
AFIAR = 1.2
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
        self.do_escalao: dict[str, list[tuple[str, str, int, int]]] = defaultdict(list)
        self._ajuste: dict[str, tuple[int, float, dict, dict]] = {}

    def _equipas(self, j: dict) -> tuple[tuple, tuple]:
        return (j["cat"], j["casa"]), (j["cat"], j["fora"])

    def _elo(self, a: tuple, b: tuple) -> tuple[float, float, float]:
        d = self.elo[a] - self.elo[b] + ELO_CASA
        pa, pb = 10 ** (d / 800), 10 ** (-d / 800)
        e = ELO_EMPATE * math.sqrt(pa * pb)
        s = pa + pb + e
        return pa / s, e / s, pb / s

    def _ajustar(self, cat: str) -> tuple[float, dict, dict]:
        """O ataque e a defesa de cada equipa do escalão, **explicando cada resultado pelos dois
        lados** — o modelo de Maher por aproximações sucessivas.

        Ataque 2 é marcar o dobro do que a média marcaria contra a mesma defesa; defesa 0,5 é
        sofrer metade. Cada volta recalcula os ataques com as defesas da volta anterior e depois
        as defesas com os ataques novos. `POISSON_PESO` golos de equipa média entram em cada um,
        para que uma equipa com dois jogos não fique com um ataque de 9 por ter dado 18–0.

        Refaz-se só quando o escalão tem um jogo novo, e parte do ajuste anterior. Medido a
        07/11/2026 nos 413 jogos com previsão: 10 voltas a partir do anterior afastam-se no
        máximo 0,4 pontos percentuais de 40 voltas a partir do zero, e a época inteira mede-se
        em 0,3 s.
        """
        jogos = self.do_escalao[cat]
        guardado = self._ajuste.get(cat)
        if guardado and guardado[0] == len(jogos):
            return guardado[1], guardado[2], guardado[3]
        mu = sum(gc + gf for _, _, gc, gf in jogos) / (2 * len(jogos)) if jogos else MEDIA_SEM_JOGOS
        ataque = dict(guardado[2]) if guardado else {}
        defesa = dict(guardado[3]) if guardado else {}
        for casa, fora, _, _ in jogos:
            for t in (casa, fora):
                ataque.setdefault(t, 1.0)
                defesa.setdefault(t, 1.0)
        for _ in range(10 if guardado else 40):
            num: dict[str, float] = defaultdict(float)
            den: dict[str, float] = defaultdict(float)
            for casa, fora, gc, gf in jogos:
                num[casa] += gc
                den[casa] += mu * defesa[fora] * POISSON_CASA
                num[fora] += gf
                den[fora] += mu * defesa[casa] / POISSON_CASA
            ataque = {t: (num[t] + POISSON_PESO) / (den[t] + POISSON_PESO) for t in ataque}
            num, den = defaultdict(float), defaultdict(float)
            for casa, fora, gc, gf in jogos:
                num[fora] += gc
                den[fora] += mu * ataque[casa] * POISSON_CASA
                num[casa] += gf
                den[casa] += mu * ataque[fora] / POISSON_CASA
            defesa = {t: (num[t] + POISSON_PESO) / (den[t] + POISSON_PESO) for t in defesa}
        self._ajuste[cat] = (len(jogos), mu, ataque, defesa)
        return mu, ataque, defesa

    def golos_esperados(self, a: tuple, b: tuple) -> tuple[float, float]:
        mu, ataque, defesa = self._ajustar(a[0])
        la = mu * ataque.get(a[1], 1.0) * defesa.get(b[1], 1.0) * POISSON_CASA
        lb = mu * ataque.get(b[1], 1.0) * defesa.get(a[1], 1.0) / POISSON_CASA
        return max(0.05, la), max(0.05, lb)

    def _golos(self, a: tuple, b: tuple) -> tuple[float, float, float]:
        la, lb = self.golos_esperados(a, b)
        # até 80 golos: o maior resultado da época é um 35–2 (Sub-17)
        pa, pb = _poisson(la, 80), _poisson(lb, 80)
        acumulado, vitoria, empate = 0.0, 0.0, 0.0
        for x in range(80):
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
        self.jogos[a] += 1
        self.jogos[b] += 1
        self.do_escalao[j["cat"]].append((j["casa"], j["fora"], gc, gf))


def administrativos(fichas: dict[int, dict]) -> set[int]:
    """Os jogos cujo resultado foi **escrito pela secretaria e não jogado**.

    **São castigos**: a APL dá 10–0 contra a equipa que cometeu uma irregularidade — por
    exemplo, alinhar um jogador ainda não inscrito na associação. Explicou-o o dono a
    07/11/2026. O jogo pode até ter sido disputado, mas o resultado que fica não é o do campo,
    e por isso diz alguma coisa sobre a papelada e nada sobre o hóquei.

    Na ficha vêem-se assim: três golos ou mais da mesma equipa no mesmo instante e sem marcador.
    Medido a 07/11/2026: são 6 na época, todos 10–0 e todos com os dez golos no mesmo segundo —
    o AE FISICA D A–FSE/AJ SALESIANA dos Sub-13 estava 0–0 ao intervalo e acabou 0–10 com os dez
    golos no minuto 36. Contam na classificação, e por isso continuam na forma e na época do
    separador. **Não contam para a previsão**: não dizem nada sobre a força de ninguém, e aquele
    0–10 era a maior parte da razão por que o AE FISICA D A–PAREDE FC A de 07/11 saía 16–3–81.
    O jogo acabou 2–2; o dono deu por isso no site de testes.
    """
    r = set()
    for id_jogo, ficha in fichas.items():
        sem_marcador: dict[tuple, int] = defaultdict(int)
        for e in ficha.get("cronologia") or []:
            if e.get("tipo") == "golo" and not e.get("jogador"):
                sem_marcador[(e.get("parte"), e.get("relogio"), e.get("equipa"))] += 1
        if sem_marcador and max(sem_marcador.values()) >= 3:
            r.add(id_jogo)
    return r


def previsoes(oficiais: list[dict], ignorar: set[int] = frozenset()) -> dict[int, tuple[float, float, float] | None]:
    """jogo → (casa, empate, fora), cada um com o que se sabia antes dele.

    Os disputados pela ordem do calendário, cada um antes de aprender com ele. Os por disputar
    com tudo o que já se jogou — mesmo um adiado, que tem data antiga e vem atrás de jogos já
    disputados. Dos `ignorar` não se aprende nada — ver `administrativos`.
    """
    p = Previsor()
    r: dict[int, tuple[float, float, float] | None] = {}
    pendentes = []
    for j in sorted(oficiais, key=chave):
        if j.get("gc") is None or j.get("gf") is None:
            pendentes.append(j)
            continue
        r[j["id"]] = p.prever(j)
        if j["id"] not in ignorar:
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


def medir(oficiais: list[dict], ignorar: set[int] = frozenset()) -> dict:
    """O que o modelo vale nos jogos já disputados: acerto, log loss e calibração.

    A calibração é a do favorito: em cada caixa de 10 pontos, a probabilidade média que se lhe
    deu e as vezes que ganhou. Ver `test_probabilidade.py`.
    """
    prev = previsoes(oficiais, ignorar)
    n = acertos = 0
    logloss = 0.0
    caixas: dict[int, list[float]] = defaultdict(lambda: [0, 0, 0.0])
    for j in oficiais:
        p = prev.get(j["id"])
        if j.get("gc") is None or p is None or j["id"] in ignorar:
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
