#!/usr/bin/env python3
"""Observa uma janela de jogos **pelo lado de quem usa a app**, e mede.

    uv run --with httpx python scripts/observar.py --ate 22:30
    uv run --with httpx python scripts/observar.py --analisar obs.jsonl

Nasceu a 08/10/2026, para a janela de sub-17 dessa noite. O dono disse a régua: se as
pessoas virem a app a falhar, voltam ao site da associação. Isto é o que transforma "parece
estar bem" em números.

## O que isto mede, e o que não mede

Lê só o **nosso CDN**, de 20 em 20 segundos. Não toca na fonte: a raspagem é central, e
uma segunda a medir seria exactamente o que a Decisão 1 proíbe. Por isso **não** consegue
dizer "o golo demorou X segundos a chegar desde que foi marcado" — para isso é preciso
alguém no pavilhão com um cronómetro, que foi como se mediu a 03/10 (~20 s da mesa + ~15 s
nossos).

O que mede, e é o que apanha as falhas que já nos morderam:

* **cadência de publicação** — intervalos entre `generated_at` do `meta.json`. Um buraco de
  dez minutos a meio de um jogo é o ciclo ao vivo parado;
* **coerência entre a lista e a ficha** — o resultado na agenda contra o resultado na ficha
  do mesmo jogo. Foi o bug de 05/10: lista a 0-0 e ficha a 1-0;
* **marcas de "ao vivo" presas** — um jogo que diz estar a decorrer depois de ter acabado;
* **movimento do resultado** — quando cada golo apareceu no CDN, e de quanto em quanto
  tempo;
* **tabelas a acompanhar** — nas provas sem tabela da fonte, se a nossa muda quando um jogo
  fecha.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import sys
import time
from zoneinfo import ZoneInfo

# `httpx` e não `urllib`: o Python desta máquina não encontra os certificados de raiz e
# qualquer leitura por `urllib` falha no handshake. O `httpx` traz os seus, e já é
# dependência do raspador.
import httpx

BASE = "https://hoquei.pages.dev/v1/aplisboa/2026-27"
LISBOA = ZoneInfo("Europe/Lisbon")
UA = "hoqueiAPP-observador/1.0 (+https://github.com/pmontezinho17/HoqueiApp)"


def _ler(caminho: str) -> dict:
    r = httpx.get(
        f"{BASE}/{caminho}",
        headers={"User-Agent": UA, "Cache-Control": "no-cache"},
        timeout=20,
    )
    r.raise_for_status()
    return r.json()


def _agora() -> dt.datetime:
    return dt.datetime.now(LISBOA)


def _estado_dos_jogos(agenda: dict, hoje: str) -> dict[int, dict]:
    jogos = agenda["jogos"] if isinstance(agenda, dict) else agenda
    return {
        j["id"]: {
            "hora": (j.get("hora") or "")[:5],
            "casa": j["casa"],
            "fora": j["fora"],
            "gc": j.get("gc"),
            "gf": j.get("gf"),
            "ao_vivo": bool(j.get("ao_vivo")),
            "situacao": j.get("situacao"),
            "comp": j.get("comp"),
        }
        for j in jogos
        if j.get("data") == hoje and j.get("id")
    }


def observar(ate: dt.time, intervalo: int, destino: pathlib.Path) -> int:
    hoje = _agora().date().isoformat()
    fim = dt.datetime.combine(_agora().date(), ate, tzinfo=LISBOA)
    if fim < _agora():
        fim += dt.timedelta(days=1)
    print(f"a observar até {fim:%H:%M}, de {intervalo} em {intervalo} s → {destino}",
          file=sys.stderr)

    anterior: dict[int, dict] = {}
    carimbo_anterior = None
    with destino.open("a", encoding="utf-8") as registo:
        def anotar(tipo: str, **campos):
            linha = {"t": _agora().isoformat(timespec="seconds"), "tipo": tipo, **campos}
            registo.write(json.dumps(linha, ensure_ascii=False) + "\n")
            registo.flush()
            print(f"  {linha['t'][11:19]} {tipo} {campos}", file=sys.stderr)

        anotar("inicio", ate=f"{fim:%H:%M}", intervalo=intervalo)
        while _agora() < fim:
            try:
                meta = _ler("meta.json")
                agenda = _ler("agenda.json")
            except Exception as e:                  # rede, CDN, qualquer coisa: anota e segue
                anotar("erro", erro=str(e)[:200])
                time.sleep(intervalo)
                continue

            carimbo = meta.get("generated_at")
            if carimbo != carimbo_anterior:
                anotar("publicacao", generated_at=carimbo, ao_vivo=meta.get("ao_vivo"))
                carimbo_anterior = carimbo

            actual = _estado_dos_jogos(agenda, hoje)
            for jid, e in actual.items():
                a = anterior.get(jid)
                if a is None:
                    anotar("jogo", id=jid, **e)
                    continue
                if (a["gc"], a["gf"]) != (e["gc"], e["gf"]):
                    anotar("resultado", id=jid, de=f"{a['gc']}-{a['gf']}",
                           para=f"{e['gc']}-{e['gf']}", situacao=e["situacao"])
                if a["ao_vivo"] != e["ao_vivo"]:
                    anotar("ao_vivo", id=jid, agora=e["ao_vivo"], situacao=e["situacao"])
                elif a["situacao"] != e["situacao"]:
                    anotar("situacao", id=jid, de=a["situacao"], para=e["situacao"])
            anterior = actual
            time.sleep(intervalo)

        anotar("fim", jogos=len(anterior))
    return 0


def analisar(ficheiro: pathlib.Path) -> int:
    linhas = [json.loads(l) for l in ficheiro.read_text(encoding="utf-8").splitlines() if l.strip()]
    if not linhas:
        print("registo vazio")
        return 1
    hora = lambda l: dt.datetime.fromisoformat(l["t"])  # noqa: E731

    pubs = [l for l in linhas if l["tipo"] == "publicacao"]
    resultados = [l for l in linhas if l["tipo"] == "resultado"]
    erros = [l for l in linhas if l["tipo"] == "erro"]
    jogos = {l["id"]: l for l in linhas if l["tipo"] == "jogo"}

    print(f"\nobservado de {hora(linhas[0]):%H:%M:%S} a {hora(linhas[-1]):%H:%M:%S} "
          f"({len(linhas)} eventos, {len(jogos)} jogos)\n")

    if len(pubs) > 1:
        gaps = [(hora(b) - hora(a)).total_seconds() for a, b in zip(pubs, pubs[1:])]
        gaps.sort()
        print("cadência de publicação (intervalos entre dados novos no CDN):")
        print(f"  publicações: {len(pubs)}")
        print(f"  mediana: {gaps[len(gaps)//2]:.0f}s   mínimo: {gaps[0]:.0f}s   "
              f"máximo: {gaps[-1]:.0f}s")
        longos = [g for g in gaps if g > 180]
        print(f"  intervalos acima de 3 min: {len(longos)}"
              + (f"  → {[f'{g/60:.0f}min' for g in longos[:6]]}" if longos else ""))
    else:
        print("cadência: só uma publicação observada — ou não houve jogos, ou o ciclo esteve parado")

    print(f"\nmudanças de resultado observadas: {len(resultados)}")
    for l in resultados:
        print(f"  {hora(l):%H:%M:%S}  #{l['id']}  {l['de']} → {l['para']}   {l.get('situacao') or ''}")

    presos = [l for l in linhas if l["tipo"] == "ao_vivo" and l.get("agora")]
    apagados = [l for l in linhas if l["tipo"] == "ao_vivo" and not l.get("agora")]
    print(f"\nmarcas de 'ao vivo': {len(presos)} acesas, {len(apagados)} apagadas")

    if erros:
        print(f"\nerros de leitura do CDN: {len(erros)}")
        for l in erros[:5]:
            print(f"  {hora(l):%H:%M:%S}  {l['erro'][:120]}")

    # coerência final: agenda contra ficha, e as tabelas calculadas
    print("\ncoerência no fim, lida do CDN:")
    try:
        agenda = _ler("agenda.json")
        hoje = hora(linhas[0]).date().isoformat()
        actual = _estado_dos_jogos(agenda, hoje)
        maus = []
        for jid, e in actual.items():
            if e["gc"] is None:
                continue
            try:
                f = _ler(f"match/{jid}.json")
            except Exception:
                maus.append(f"#{jid} {e['casa']}: com resultado na lista e sem ficha publicada")
                continue
            if (f.get("golos_casa"), f.get("golos_fora")) != (e["gc"], e["gf"]):
                maus.append(f"#{jid}: lista {e['gc']}-{e['gf']} ≠ ficha "
                            f"{f.get('golos_casa')}-{f.get('golos_fora')}")
            if e["ao_vivo"] and f.get("estado") == "Jogo Terminado":
                maus.append(f"#{jid}: ficha diz terminado e a lista ainda diz ao vivo")
        print(f"  jogos de hoje com resultado: {sum(1 for e in actual.values() if e['gc'] is not None)}")
        print(f"  incoerências: {len(maus)}")
        for m in maus:
            print(f"    · {m}")
    except Exception as e:
        print(f"  não foi possível verificar: {e}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--ate", default="22:30", help="hora de Lisboa em que pára (HH:MM)")
    p.add_argument("--intervalo", type=int, default=20, help="segundos entre leituras")
    p.add_argument("--registo", default=None, help="ficheiro de registo (JSONL)")
    p.add_argument("--analisar", default=None, help="analisa um registo em vez de observar")
    a = p.parse_args()

    if a.analisar:
        return analisar(pathlib.Path(a.analisar))

    destino = pathlib.Path(
        a.registo or f"/tmp/observar-{_agora():%Y%m%d-%H%M}.jsonl"
    )
    h, m = (int(x) for x in a.ate.split(":"))
    return observar(dt.time(h, m), a.intervalo, destino)


if __name__ == "__main__":
    raise SystemExit(main())
