"""Cada ida à APL, contada por quem a fez — e não pelo que publicámos (B9.31).

**O defeito que isto corrige.** Até 30/10/2026 a consola só sabia dos pedidos à fonte pelo
`meta.json` que publicamos: o observador lia-o, fazia a diferença para a leitura anterior e
somava-a à hora. Uma ronda que não encontrava nada de novo não publicava, e por isso não
existia. Nessa madrugada a ronda das 00:30 pediu ~40 páginas à APL, não publicou, e a consola
deu **zero pedidos** no dia. O ciclo ao vivo era pior: uma ronda sem golos nem escrevia o
`meta.json`, e a sonda nunca teve contador nenhum.

O dono pediu dois gráficos separados: *"um para todas as chamadas [...] à APL
(independentemente de ter atualizações), e outro para informar o número de atualizações"*.
Este módulo é o primeiro: no fim de cada processo que falou com a fonte, diz ao observador o
que pediu. O segundo já existia — são as publicações que o observador vê no nosso CDN.

**Só stdlib, de propósito.** A sonda (`scripts/sondar_atualizacao.py`) corre com o `python3`
da máquina, sem o ambiente do raspador, e importa isto pelo caminho. Um `httpx` aqui
partia-a.

**Nunca falha a ronda.** Uma medição perdida não pode atrasar um golo: sem configuração não
faz nada, e com ela tem cinco segundos e engole o erro.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

#: Quem pede à APL. Uma origem nova é um processo novo a pedir — e a regra do projecto manda
#: contar o custo antes de o acrescentar. O observador recusa o que não estiver aqui.
ORIGENS = ("producao", "aovivo", "testes", "sonda")

UA = "hoqueiAPP-registo/1.0 (+https://github.com/pmontezinho17/HoqueiApp)"


def carga(por_tipo: dict | None, falhados: int, origem: str, quando: datetime,
          corrida: str | None = None) -> dict | None:
    """O que se envia ao observador, ou `None` quando não há nada a contar.

    Um processo que não pediu nada — a corrida que a agenda manda sair, um comando local que
    só leu ficheiros — não manda linha nenhuma. Uma linha de zeros era uma "ronda" que não
    foi à fonte, e é precisamente a diferença entre as duas coisas que o gráfico mostra.
    """
    pedidos = {t: n for t, n in (por_tipo or {}).items() if n}
    if not pedidos or origem not in ORIGENS:
        return None
    return {
        "origem": origem,
        "quando": quando.astimezone(timezone.utc).isoformat(timespec="seconds"),
        "por_tipo": pedidos,
        "falhados": falhados,
        "corrida": corrida,
    }


def registar(por_tipo: dict | None, falhados: int = 0, *, ambiente=None, abrir=None,
             agora: datetime | None = None) -> bool:
    """Envia a contagem ao observador. `True` só se ele a aceitou.

    Liga-se por três variáveis, que só os workflows põem: `OBSERVADOR` (o endereço),
    `CHAVE_RONDAS` (o segredo partilhado) e `ORIGEM_RONDA`. Em desenvolvimento e nos testes
    não há nenhuma, e por isso nada sai daqui.
    """
    ambiente = os.environ if ambiente is None else ambiente
    base = ambiente.get("OBSERVADOR")
    chave = ambiente.get("CHAVE_RONDAS")
    origem = ambiente.get("ORIGEM_RONDA")
    if not (base and chave and origem):
        return False
    corrida = ambiente.get("GITHUB_RUN_ID")
    c = carga(por_tipo, falhados, origem, agora or datetime.now(timezone.utc), corrida)
    if c is None:
        return False
    pedido = urllib.request.Request(
        f"{base.rstrip('/')}/ronda",
        data=json.dumps(c).encode(),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {chave}",
            "User-Agent": UA,
        },
    )
    try:
        with (abrir or urllib.request.urlopen)(pedido, timeout=5) as r:
            return 200 <= r.status < 300
    except Exception as e:  # observador em baixo, rede, 401 — nada disto pára uma ronda
        print(f"registo da ronda no observador falhou: {e}", file=sys.stderr)
        return False
