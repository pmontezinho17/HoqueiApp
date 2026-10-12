"""Se vale a pena pedir a **tabela** de uma prova nesta ronda.

Irmão do `vale_pedir.py`: aquele decide se a ronda inteira corre, este decide, dentro de uma
ronda que corre, o que é que se pede prova a prova.

## O custo que isto corta, medido

Uma ronda completa custa **75 pedidos**: 1 à lista de competições, e 2 a cada uma das 37
provas — o calendário e a classificação. O dono olhou para o gráfico da consola a 09/10/2026 e
perguntou o que era preciso: *"à meia-noite fomos ao site da APL quase 80 vezes?? eu imagino
isto a ir UMA vez, mas diz-me se estou completamente errado"*.

Não está errado. Medido na agenda de 12/10/2026, com 37 provas e 802 jogos, **9 provas já
terminaram** — todos os jogos com resultado — e numa ronda qualquer só uma parte das outras
teve jogo. Saltando só a classificação de quem não precisa:

| dia | provas com jogo | pedidos | em vez de |
|---|---|---|---|
| 06 e 07/10 (sem jogos) | 0 | **38** | 75 |
| 09/10 | 1 | **39** | 75 |
| 10/10 (sábado) | 15 | **53** | 75 |
| 11/10 (domingo) | 23 | **61** | 75 |

Entre 14 e 37 pedidos por ronda, e as rondas correm de duas em duas horas nos dias de jogos.

## Porque é que só a classificação, e não também o calendário

Saltar o **calendário** chegava a 1–47 pedidos em vez de 75 — o dobro da poupança. Não é o que
este módulo faz, e a razão não é técnica.

O calendário é a fonte da agenda, dos emblemas, das equipas por escalão, das fichas e dos
quadros: é dele que sai tudo o que a app publica. Para o saltar, a ronda tem de reconstruir
tudo isso a partir do `comp/<id>.json` guardado — um refactor do ciclo que escreve **todos** os
ficheiros publicados. E a 12/10/2026 esse ciclo **não tem teste de integração nenhum**: não há
um `test_cli.py`. Refactorizar sem rede o código que produz tudo o que a app lê, para poupar a
segunda metade, é trocar um custo medido por um risco que não sei medir.

A classificação não tem esse problema: ela entra num campo só do ficheiro publicado, e a cópia
anterior está lá para ser reutilizada. Dez linhas em vez de quarenta, e o calendário continua a
ser lido em todas as rondas — por isso a agenda, as fichas e a **nossa** tabela calculada
continuam tão frescas como hoje.

A outra metade fica no backlog com a sua condição escrita: primeiro o teste de integração da
ronda, depois o refactor.

## A rede de segurança, que não é um detalhe — é a condição

Os filtros decidem com base nos **nossos** dados. Uma prova a que a fonte corrija uma tabela
sem haver jogo novo ficaria com a tabela velha. Por isso há três travões, e os três estão em
teste:

1. **Se os resultados mudaram desde a última publicação, pede-se.** É o travão preciso: a
   tabela da fonte só muda por causa de um jogo, e nós acabámos de ler o calendário, logo
   sabemos se algum mudou. Não custa um pedido — é comparação de dados que já temos.
2. **Uma vez por semana pede-se tudo**, terminadas incluídas. Dia fixo e não um contador: um
   contador perde-se quando uma corrida falha. É a segunda-feira, que é o fecho do domingo —
   a jornada acabou e é o momento mais calmo da semana.
3. **Em dúvida, pede-se.** Sem cópia publicada para reutilizar, ou sem jogos conhecidos, vai-se
   buscar. Note-se que `all([])` é `True` em Python: uma prova nova, ainda sem jogos, passaria
   por "terminada" e nunca mais seria olhada. Há um teste com esse nome.

## Porque é que isto é uma função pura e vive aqui

Porque a decisão é o risco todo, e uma decisão enterrada a meio do `cli.py` não se testa.
É a mesma razão do `vale_pedir`, e está escrita no backlog desde 09/10: *"a decisão numa função
pura no raspador, com testes, ao lado do `vale_pedir` — **não** dentro do `cli.py` a meio do
ciclo, pela mesma razão de sempre"*.
"""
from __future__ import annotations

import datetime as dt

#: **O interruptor.** Com isto a `False` a ronda pede tudo como sempre pediu, e nada do que
#: está aqui se aplica — o código vai a produção desligado e liga-se numa linha, sem publicar
#: outra vez. Está registado em `web/src/lib/bandeiras.ts`, com data.
#:
#: Ligar é uma decisão do dono, e o que se olha depois de ligar é o gráfico de pedidos por hora
#: na consola: os pedidos têm de cair e **nenhuma prova pode ficar calada**. O `meta.json`
#: passa a dizer quantas tabelas se saltaram e porquê, para a queda se distinguir de uma avaria.
FILTRAR_TABELAS = False

#: Segunda-feira. A varredura completa corre no fecho do domingo — ver o ponto 2 acima.
#: `0` é segunda em `date.weekday()`.
DIA_DA_VARREDURA = 0


def e_dia_de_varredura(hoje: dt.date) -> bool:
    """Se hoje é o dia em que se pede tudo, terminadas incluídas."""
    return hoje.weekday() == DIA_DA_VARREDURA


def _resultados(jogos) -> list[tuple]:
    """A assinatura dos resultados de uma prova, para detectar o que mudou.

    Só o id e o par de golos: a hora e o recinto mudam sem a tabela mudar, e uma comparação
    que reagisse a isso pedia a tabela por nada.
    """
    return sorted(
        (j.get("id"), j.get("gc"), j.get("gf"))
        for j in jogos
        if isinstance(j, dict)
    )


def pedir_tabela(
    *,
    jogos_agora: list[dict],
    jogos_antes: list[dict] | None,
    hoje: dt.date,
    varredura: bool | None = None,
) -> tuple[bool, str]:
    """`(pedir, porque)` para **uma** prova. Pura.

    `jogos_antes` a `None` quer dizer que não há cópia publicada desta prova — e aí pede-se,
    porque não há nada para reutilizar.

    Os jogos entram como dicionários, no formato que a agenda e o `comp/<id>.json` publicam:
    `data` em `AAAA-MM-DD` e `gc`/`gf` a `None` enquanto não houver resultado.
    """
    if varredura is None:
        varredura = e_dia_de_varredura(hoje)

    if jogos_antes is None:
        return True, "sem cópia publicada para reutilizar"
    if varredura:
        return True, "varredura semanal — pede-se tudo"

    ontem = (hoje - dt.timedelta(days=1)).isoformat()
    hoje_iso = hoje.isoformat()

    if any(j.get("data") == hoje_iso for j in jogos_agora):
        return True, "tem jogo hoje"
    if any(j.get("data") == ontem and j.get("gc") is None for j in jogos_agora):
        return True, "jogo de ontem ainda sem resultado"
    if _resultados(jogos_agora) != _resultados(jogos_antes):
        return True, "os resultados mudaram desde a última publicação"
    if not jogos_agora:
        # `all([])` é `True`: sem esta guarda, uma prova nova sem jogos passava por terminada
        return True, "prova sem jogos conhecidos"
    if all(j.get("gc") is not None for j in jogos_agora):
        return False, "terminada"
    return False, "sem jogos no dia"


def resumir(razoes: list[str]) -> dict[str, int]:
    """Quantas provas se saltaram e porquê, para o `meta.json`.

    **Sem isto o gráfico da consola passava a mostrar menos pedidos sem ninguém saber se foi
    poupança ou avaria** — é o mesmo defeito do B9.31 e não vale a pena criar outro igual.
    """
    saida: dict[str, int] = {}
    for r in razoes:
        saida[r] = saida.get(r, 0) + 1
    return dict(sorted(saida.items()))
