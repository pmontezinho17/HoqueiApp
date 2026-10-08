"""Contagens por ronda, e a guarda que impede uma perda silenciosa (B9.2 + B9.6).

**O problema que isto resolve já aconteceu.** Em Setembro a fonte mudou o número de colunas
de uma linha de calendário. O parser não deu erro: devolveu **256 linhas a menos de 307**, e
32 das 37 competições apareceram vazias. Ficou assim **11 dias**, até um utilizador reparar.

Nenhum teste apanha isto, porque os testes correm contra HTML gravado — e o HTML gravado
continua a ser o antigo. A única defesa é comparar cada ronda com a anterior: um parser que
devolve *menos* é suspeito, mesmo quando não se queixa.

O diário vive **fora** de `web/static/v1`. Lá dentro, uma linha nova a cada ronda fazia a
Action ver alterações nos dados e publicar de 2 em 2 horas para sempre — foi o que já
aconteceu com o `meta.json`.
"""

from __future__ import annotations

import datetime as dt
import json
import pathlib

#: Quanto uma contagem pode cair sem levantar suspeita. As contagens desta fonte só crescem
#: ao longo da época; uma queda é quase sempre o parser a partir, não a realidade.
TOLERANCIA = 0.05
#: Abaixo disto a percentagem não quer dizer nada — uma prova com 3 jogos e um adiamento
#: dava 33% de queda sem nada estar errado.
MINIMO_ABSOLUTO = 3


def diario_de(destino: pathlib.Path, tenant: str) -> pathlib.Path:
    """`data-samples/rondas/<tenant>.jsonl`, encontrado pela raiz do repositório.

    Pela raiz e não por contar `..`: a primeira versão subia quatro níveis a partir do
    destino e aterrava em `web/`, criando o diário no sítio errado em silêncio. Contar
    pontos num caminho é frágil; procurar o `.git` não é.
    """
    for pasta in [destino.resolve(), *destino.resolve().parents]:
        if (pasta / ".git").exists():
            return pasta / "data-samples" / "rondas" / f"{tenant}.jsonl"
    # fora de um repositório (um tarball, um contentor): ao lado dos dados
    return destino.resolve() / "rondas" / f"{tenant}.jsonl"


def contar(destino: pathlib.Path) -> dict[str, int]:
    """O que se conta é o que se perderia em silêncio se um parser se partisse."""
    ler = lambda p: json.loads(p.read_text(encoding="utf-8"))

    comps = ler(destino / "competitions.json")["competicoes"]
    jogos = disputados = linhas_tabela = eventos = jogadores = 0
    for f in (destino / "comp").glob("*.json"):
        d = ler(f)
        jogos += len(d["jogos"])
        disputados += sum(1 for j in d["jogos"] if j.get("golos_casa") is not None)
        linhas_tabela += sum(len(g["linhas"]) for g in d["classificacao"])
    for f in (destino / "match").glob("*.json"):
        d = ler(f)
        eventos += len(d.get("cronologia") or [])
        jogadores += sum(len(e.get("jogadores") or []) for e in (d.get("equipas") or []))
    quadros = sum(len(ler(f)["jogadores"]) for f in (destino / "scorers").glob("*.json"))

    return {
        "competicoes": len(comps),
        "jogos": jogos,
        "jogos_disputados": disputados,
        "linhas_classificacao": linhas_tabela,
        "fichas": len(list((destino / "match").glob("*.json"))),
        "eventos_cronologia": eventos,
        "linhas_jogador": jogadores,
        "linhas_quadro": quadros,
        "equipas": len(ler(destino / "teams.json")["equipas"]),
        "feeds_ics": len(list((destino / "team").glob("*.ics"))),
    }


def ultima(diario: pathlib.Path) -> dict[str, int] | None:
    if not diario.exists():
        return None
    linhas = [l for l in diario.read_text(encoding="utf-8").splitlines() if l.strip()]
    for linha in reversed(linhas):
        try:
            return json.loads(linha)["contagens"]
        except (json.JSONDecodeError, KeyError):
            continue
    return None


def quedas(antes: dict[str, int], agora: dict[str, int],
           tolerancia: float = TOLERANCIA) -> list[str]:
    """As contagens que caíram o suficiente para valer um alarme."""
    suspeitas = []
    for chave, velho in antes.items():
        novo = agora.get(chave, 0)
        caiu = velho - novo
        if caiu < MINIMO_ABSOLUTO or velho == 0:
            continue
        if caiu / velho > tolerancia:
            suspeitas.append(f"{chave}: {velho} → {novo} ({100 * caiu / velho:.0f}% a menos)")
    return suspeitas


def registar(diario: pathlib.Path, contagens: dict[str, int], tenant: str) -> bool:
    """Acrescenta uma linha ao diário, **só se as contagens mudaram**.

    Uma linha por ronda tornaria o diário num relógio: cresceria de 2 em 2 horas e levava a
    Action a comitar sem nada ter acontecido nos jogos. O que interessa guardar é a evolução
    dos números, não a prova de que o cron correu — essa está no histórico da Action.
    """
    if ultima(diario) == contagens:
        return False
    diario.parent.mkdir(parents=True, exist_ok=True)
    registo = {
        "ts": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "tenant": tenant,
        "contagens": contagens,
    }
    with diario.open("a", encoding="utf-8") as f:
        f.write(json.dumps(registo, ensure_ascii=False) + "\n")
    return True


#: As quatro páginas que a fonte serve, e mais nada. Um tipo novo aqui significa que alguém
#: acrescentou um pedido — e a regra do projecto manda contar o custo antes de o fazer.
TIPOS_DE_PEDIDO = ("competiciones", "calendario", "clasificacion", "ficha")


def acumular_pedidos(meta: dict, fonte, dia: str) -> dict:
    """Soma os pedidos desta ronda ao total do dia, dentro do próprio `meta.json`.

    **Acumula no ficheiro e não na memória** porque cada ronda é um processo novo: o
    `aovivo.sh` chama o comando de 30 em 30 segundos, e um contador em memória morria com
    cada um. O ficheiro sobrevive entre rondas do mesmo ciclo e vai para o CDN em cada
    publicação, que é de onde a consola o lê.

    Quando o dia muda, o total recomeça. E quando uma corrida nova parte do ficheiro
    commitado — que pode ser de há horas — o total pode **descer**; quem lê trata uma descida
    como recomeço, e está escrito no observador.
    """
    anterior = meta.get("pedidos_dia") or {}
    base = anterior.get("por_tipo", {}) if anterior.get("dia") == dia else {}
    por_tipo = dict(base)
    for tipo, n in (fonte.por_tipo or {}).items():
        por_tipo[tipo] = por_tipo.get(tipo, 0) + n
    return {"dia": dia, "por_tipo": por_tipo, "total": sum(por_tipo.values())}
