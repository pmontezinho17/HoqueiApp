"""A medição do atraso da "Jogos do Dia" do `hp.fpp.pt` — uma vez, a 21/11/2026.

O ao vivo das ligas nacionais vai assentar nessa página: traz todos os jogos nacionais do dia
numa resposta de 11 KB, noutro servidor que não o da APL (`docs/11-ligas-nacionais.md`). Antes
de construir em cima dela é preciso saber **quanto se atrasa** em relação à ficha da
plataforma, que é onde o golo entra primeiro. Aprovado pelo dono a 09/11/2026, com o custo:

- a "Jogos do Dia" de 30 em 30 s, das 17:25 às 23:00 — **~670 pedidos ao `hp.fpp.pt`**;
- a ficha de **um** jogo, o SPORTING CP–SL BENFICA das 19:30 (`partido.asp?id=18279`), com a
  mesma cadência, das 19:20 até 10 minutos depois do fim — **~250 pedidos ao servidor que a
  FPP partilha com a APL**. Um só, porque nessa noite o ciclo ao vivo da APL pode estar a
  correr: um jogo a mais por ronda cabe no limite de um pedido por segundo, cinco não.

**Fecha-se no código, não no calendário** (AGENTS.md): fora de `DIA` não faz pedido nenhum,
corra quem correr o workflow. Depois de a resposta estar no documento, este ficheiro e o
`medir-direto.yml` saem.

Guarda só contagens, resultados e estados — nunca nomes de atletas, porque o diário fica num
repositório público. Os nomes das equipas ficam, e são os da própria página.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import sys
import time
import unicodedata
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import httpx
from selectolax.parser import HTMLParser

from .fonte import UA, Fonte
from .parsers.jogo import ficha

#: o único dia em que isto pede alguma coisa — a 3.ª jornada do Placard
DIA = date(2026, 11, 21)
DIRETO = "https://hp.fpp.pt/Direto"
INTERVALO = 30.0
#: quanto se continua a ler a ficha depois de ela dizer "Jogo Terminado", para apanhar a
#: "Jogos do Dia" a fechar o mesmo jogo
DEPOIS_DO_FIM = timedelta(minutes=10)
#: o tecto da ficha, para um jogo que nunca chegue a "terminado" não a ler até ao fim da janela
TECTO_DA_FICHA = timedelta(hours=2, minutes=40)
LISBOA = ZoneInfo("Europe/Lisbon")


def jogos_do_dia(html: str) -> list[dict]:
    """Os jogos da "Jogos do Dia", um por linha da versão de computador.

    A página repete cada jogo duas vezes, uma para computador e outra para telemóvel
    (`li.jogo-item.desktop` e `.mobile`); lê-se só a primeira. A competição é o `h4` que vem
    antes, numa linha própria da lista.
    """
    arvore = HTMLParser(html)
    saida: list[dict] = []
    competicao = None
    for li in arvore.css("ul.lista-jogos > li"):
        titulo = li.css_first("h4.titulo-competicao")
        if titulo is not None:
            competicao = titulo.text(strip=True)
            continue
        classes = (li.attributes.get("class") or "").split()
        if "jogo-item" not in classes or "desktop" not in classes:
            continue
        casa = li.css_first(".team-visitada .team-name")
        fora = li.css_first(".team-visitante .team-name")
        resultado = li.css_first(".resultado span")
        estado = li.css_first(".resultado .estado-jogo")
        ligacao = li.css_first('a[href^="jogo/"]')
        saida.append({
            "id_hp": int(ligacao.attributes["href"].split("/")[1]) if ligacao else None,
            "competicao": competicao,
            "casa": casa.text(strip=True) if casa else None,
            "fora": fora.text(strip=True) if fora else None,
            "resultado": resultado.text(strip=True) if resultado else None,
            "estado": estado.text(strip=True) if estado else None,
        })
    return saida


def _palavras(nome: str | None) -> set[str]:
    sem = unicodedata.normalize("NFKD", nome or "").encode("ascii", "ignore").decode().lower()
    return {p for p in "".join(c if c.isalnum() else " " for c in sem).split() if len(p) > 2}


def mesmo_jogo(jogo: dict, casa: str, fora: str) -> bool:
    """Os dois sites escrevem os clubes de maneira diferente ("SPORTING CP" e "Sporting CP",
    "J. PACENSE/DES COMPAGNONS" e "J. Pacense / Des Compagnons"). Basta uma palavra em comum
    de cada lado, e do lado certo."""
    return bool(_palavras(jogo.get("casa")) & _palavras(casa)) and bool(
        _palavras(jogo.get("fora")) & _palavras(fora))


def atrasos(fichas: list[dict], diretos: list[dict]) -> list[dict]:
    """Para cada resultado novo na ficha, quanto tempo a "Jogos do Dia" levou a mostrá-lo.

    `fichas` e `diretos` são as linhas do diário, já só do jogo de referência, por ordem. O
    atraso é positivo quando a "Jogos do Dia" chegou depois, e `None` quando nunca chegou.
    """
    saida = []
    vistos = set()
    for f in fichas:
        marca = f"{f['golos_casa']}-{f['golos_fora']}"
        if f["golos_casa"] is None or marca in vistos:
            continue
        vistos.add(marca)
        quando = datetime.fromisoformat(f["t"])
        chegou = next((datetime.fromisoformat(d["t"]) for d in diretos
                       if (d.get("resultado") or "").replace(" ", "") == marca), None)
        saida.append({"resultado": marca, "na_ficha": f["t"],
                      "atraso_s": None if chegou is None else round((chegou - quando).total_seconds())})
    return saida


class Diario:
    """Uma linha por mudança, e não uma por leitura: um jogo parado ao intervalo não enche o
    ficheiro com 30 linhas iguais."""

    def __init__(self, caminho: pathlib.Path):
        self.caminho = caminho
        self.caminho.parent.mkdir(parents=True, exist_ok=True)
        self._ultimo: dict[str, str] = {}

    def escrever(self, chave: str, linha: dict) -> bool:
        assinatura = json.dumps({k: v for k, v in linha.items() if k != "t"}, sort_keys=True)
        if self._ultimo.get(chave) == assinatura:
            return False
        self._ultimo[chave] = assinatura
        with self.caminho.open("a", encoding="utf-8") as f:
            f.write(json.dumps(linha, ensure_ascii=False) + "\n")
        return True


def _hora(dia: date, hhmm: str) -> datetime:
    h, m = map(int, hhmm.split(":"))
    return datetime(dia.year, dia.month, dia.day, h, m, tzinfo=LISBOA)


def medir(args, agora=lambda: datetime.now(LISBOA), dormir=time.sleep) -> dict:
    hoje = agora().date()
    if hoje != DIA or args.dia != DIA.isoformat():
        print(f"hoje é {hoje} e a medição é só a {DIA} — nenhum pedido feito", file=sys.stderr)
        return {"direto": 0, "ficha": 0}
    inicio, fim = _hora(DIA, args.inicio), _hora(DIA, args.fim)
    ref_inicio = _hora(DIA, args.ref_inicio)
    diario = Diario(pathlib.Path(args.destino) / f"{DIA.isoformat()}.jsonl")
    contas = {"direto": 0, "direto_falhados": 0, "ficha": 0}
    terminou: datetime | None = None
    if agora() < inicio:
        dormir((inicio - agora()).total_seconds())
    with httpx.Client(headers={"User-Agent": UA}, timeout=20.0) as hp, Fonte("fpp") as fonte:
        while agora() < fim:
            volta = time.monotonic()
            t = agora().isoformat(timespec="seconds")
            try:
                r = hp.get(DIRETO)
                contas["direto"] += 1
                jogos = jogos_do_dia(r.text)
                diario.escrever("direto:pagina", {
                    "t": t, "fonte": "direto", "http": r.status_code, "jogos": len(jogos),
                    "hash": hashlib.sha256(r.content).hexdigest()[:12]})
                for j in jogos:
                    diario.escrever(f"direto:{j['id_hp']}", {"t": t, "fonte": "direto", **j})
            except Exception as e:  # noqa: BLE001 — uma leitura falhada não pára a medição
                contas["direto_falhados"] += 1
                diario.escrever("direto:erro", {"t": t, "fonte": "direto", "erro": type(e).__name__})
            ler_ficha = (ref_inicio <= agora() < ref_inicio + TECTO_DA_FICHA
                         and (terminou is None or agora() < terminou + DEPOIS_DO_FIM))
            if ler_ficha:
                try:
                    fx = ficha(fonte.jogo(args.referencia).html, args.referencia)
                    contas["ficha"] += 1
                    diario.escrever("ficha", {
                        "t": t, "fonte": "ficha", "id": args.referencia,
                        "casa": fx.casa, "fora": fx.fora,
                        "golos_casa": fx.golos_casa, "golos_fora": fx.golos_fora,
                        "estado": fx.estado, "periodo": fx.periodo, "relogio": fx.relogio,
                        "golos_na_cronologia": sum(1 for e in fx.cronologia if e.tipo == "golo")})
                    if terminou is None and fx.estado == "Jogo Terminado":
                        terminou = agora()
                except Exception as e:  # noqa: BLE001
                    diario.escrever("ficha:erro", {"t": t, "fonte": "ficha", "erro": type(e).__name__})
            dormir(max(0.0, INTERVALO - (time.monotonic() - volta)))
    return contas


def resumo(caminho: pathlib.Path) -> str:
    """O que vai para o resumo da corrida: os pedidos e o atraso de cada golo."""
    if not caminho.exists():
        return "Nada medido."
    linhas = [json.loads(x) for x in caminho.read_text(encoding="utf-8").splitlines() if x]
    fichas = [x for x in linhas if x.get("fonte") == "ficha" and "golos_casa" in x]
    if not fichas:
        return "A ficha de referência nunca foi lida."
    casa, fora = fichas[0]["casa"], fichas[0]["fora"]
    diretos = [x for x in linhas if x.get("fonte") == "direto" and "resultado" in x
               and mesmo_jogo(x, casa, fora)]
    texto = [f"### {casa} – {fora}", "", "| resultado | na ficha | atraso da Jogos do Dia |",
             "|---|---|---|"]
    for a in atrasos(fichas, diretos):
        quanto = "nunca apareceu" if a["atraso_s"] is None else f"{a['atraso_s']} s"
        texto.append(f"| {a['resultado']} | {a['na_ficha'][11:19]} | {quanto} |")
    return "\n".join(texto)


def principal(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--dia", required=True)
    p.add_argument("--inicio", required=True, help="HH:MM, hora de Lisboa")
    p.add_argument("--fim", required=True)
    p.add_argument("--referencia", type=int, required=True, help="o partido.asp?id= do jogo")
    p.add_argument("--ref-inicio", required=True)
    p.add_argument("--destino", required=True)
    args = p.parse_args(argv)
    contas = medir(args)
    print(json.dumps(contas), file=sys.stderr)
    print(resumo(pathlib.Path(args.destino) / f"{DIA.isoformat()}.jsonl"))
    print(f"\npedidos: {contas.get('direto', 0)} ao hp.fpp.pt "
          f"({contas.get('direto_falhados', 0)} falhados), {contas.get('ficha', 0)} fichas "
          "ao servidor partilhado com a APL")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
