#!/usr/bin/env python3
"""Sonda a fonte durante jogos a decorrer para responder a duas perguntas em aberto:

1. Com que rapidez a fonte atualiza o resultado durante e depois de um jogo? (decide F8.1, live scores)
2. A cronologia (#desarrollo) é preenchida durante o jogo ou só no fim? (decide notificações de golo)

Só stdlib. Educado: um pedido de cada vez, intervalo configurável, User-Agent identificável.

    ./sondar_atualizacao.py --tenant aplisboa --ids 9438 9439 9440 9441 --intervalo 120

Escreve uma linha JSON por sondagem em data-samples/sondagem/{data}.jsonl e guarda um
snapshot do HTML sempre que o hash muda, em data-samples/sondagem/html/.
"""
import argparse, hashlib, json, os, pathlib, re, ssl, sys, time, urllib.request
from datetime import datetime, timezone

UA = "hoqueiAPP-research/0.1 (+https://github.com/pmontezinho17/HoqueiApp)"
BASE = "https://{tenant}.assyssoftware.es/intranet/web/partido.asp?id={id}"
RAIZ = pathlib.Path(__file__).resolve().parent.parent / "data-samples" / "sondagem"


def contexto_ssl():
    """O python.org do macOS nao usa o trust store do sistema -> certificate verify failed."""
    for ca in (os.environ.get("SSL_CERT_FILE"), "/etc/ssl/cert.pem"):
        if ca and pathlib.Path(ca).exists():
            return ssl.create_default_context(cafile=ca)
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


CTX = contexto_ssl()


def buscar(tenant, id_jogo):
    req = urllib.request.Request(BASE.format(tenant=tenant, id=id_jogo), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
        bruto = r.read()
    # partido.asp devolve Windows-1252, ao contrário das páginas ?seccion=
    return bruto, bruto.decode("cp1252", errors="replace")


def extrair(html):
    """O mínimo para ver o jogo a mexer sem ter de abrir o HTML todo."""
    texto = lambda s: re.sub(r"\s+", " ", re.sub(r"<[^>]*>", " ", s)).strip()

    estado = None
    m = re.search(r'id="resultado"(.*?)(?:id="ficha_partido"|id="menu_ficha")', html, re.S)
    cabeca = texto(m.group(1)) if m else ""
    for palavra in ("Jogo Terminado", "Jogo Suspendido", "Jogo Adiado"):
        if palavra in cabeca:
            estado = palavra
    resultado = None
    mr = re.search(r"\b(\d{1,2})\s*-\s*(\d{1,2})\b", cabeca)
    if mr:
        resultado = f"{mr.group(1)}-{mr.group(2)}"

    md = re.search(r'id="desarrollo"(.*?)id="acta"', html, re.S)
    bloco = md.group(1) if md else ""
    linhas = [l for l in (texto(x) for x in re.split(r"</tr>|</li>|<br\s*/?>", bloco)) if l]
    eventos = len([l for l in linhas if re.search(r"\d+:\d{2}", l)])
    golos = len(re.findall(r"Golo para", bloco))

    return {
        "estado": estado,
        "resultado_cabecalho": resultado,
        "eventos_cronologia": eventos,
        "golos_na_cronologia": golos,
        "topo_cronologia": linhas[1][:120] if len(linhas) > 1 else None,
        "tem_acta": 'id="acta"' in html,
    }


def hashes_conhecidos():
    """Último hash visto por jogo, lido dos diários anteriores.

    Sem isto a primeira ronda de cada execução marca tudo como "mudou", e perde-se a
    comparação com a sondagem da véspera — que é precisamente a linha de base.
    """
    estado = {}
    for diario in sorted(RAIZ.glob("*.jsonl")):
        for linha in diario.read_text().splitlines():
            try:
                r = json.loads(linha)
            except json.JSONDecodeError:
                continue
            if "sha256" in r:
                estado[r["id"]] = r["sha256"]
    return estado


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--tenant", default="aplisboa")
    p.add_argument("--ids", nargs="+", required=True, type=int)
    p.add_argument("--intervalo", type=int, default=120, help="segundos entre rondas (default 120)")
    p.add_argument("--ate", default=None, help="hora local de fim, HH:MM (tem de ser futura)")
    p.add_argument("--rondas", type=int, default=None, help="nº de rondas e sai (para leituras pontuais)")
    p.add_argument("--esquecer", action="store_true", help="ignorar hashes de execuções anteriores")
    args = p.parse_args()

    (RAIZ / "html").mkdir(parents=True, exist_ok=True)
    diario = RAIZ / f"{datetime.now().strftime('%Y-%m-%d')}.jsonl"
    fim = None
    if args.ate:
        h, m = args.ate.split(":")
        fim = datetime.now().replace(hour=int(h), minute=int(m), second=0, microsecond=0)
        if fim <= datetime.now():
            # senão a sonda faz uma ronda, imprime "fim da janela" e sai — parecendo que correu
            print(f"erro: --ate {args.ate} já passou hoje ({datetime.now():%H:%M}). "
                  f"A sonda faria uma única ronda e sairia.\n"
                  f"       Usa --ate com uma hora futura, ou --rondas 1 para uma leitura pontual.",
                  file=sys.stderr)
            return 2

    ultimos = {} if args.esquecer else hashes_conhecidos()
    if ultimos:
        print(f"linha de base: {len(ultimos)} jogos já sondados antes", file=sys.stderr)
    print(f"sonda: {len(args.ids)} jogos em '{args.tenant}', a cada {args.intervalo}s → {diario}")
    ronda = 0
    while True:
        ronda += 1
        for id_jogo in args.ids:
            agora = datetime.now(timezone.utc).isoformat(timespec="seconds")
            try:
                bruto, html = buscar(args.tenant, id_jogo)
            except Exception as e:                       # rede/fonte em baixo não deve matar a sonda
                registo = {"ts": agora, "id": id_jogo, "erro": str(e)}
            else:
                # o diário só guarda 16 chars, logo a comparação tem de ser na forma truncada,
                # senão o hash completo nunca casa com a linha de base e tudo aparece como "mudou"
                h = hashlib.sha256(bruto).hexdigest()[:16]
                mudou = ultimos.get(id_jogo) != h
                ultimos[id_jogo] = h
                registo = {"ts": agora, "id": id_jogo, "bytes": len(bruto),
                           "sha256": h, "mudou": mudou, **extrair(html)}
                if mudou:                                 # guarda prova do momento da mudança
                    alvo = RAIZ / "html" / f"{id_jogo}-{agora.replace(':', '')}.html"
                    alvo.write_bytes(bruto)
                    registo["snapshot"] = alvo.name
            with diario.open("a") as f:
                f.write(json.dumps(registo, ensure_ascii=False) + "\n")
            marca = "*" if registo.get("mudou") else " "
            print(f"{marca} {agora} #{id_jogo} {registo.get('resultado_cabecalho') or '—':>5} "
                  f"ev={registo.get('eventos_cronologia', '?')} {registo.get('estado') or ''}"
                  f"{registo.get('erro', '')}", flush=True)
            time.sleep(1)                                 # 1 req/s, servidor pequeno
        if args.rondas and ronda >= args.rondas:
            return
        if fim and datetime.now() >= fim:
            print("fim da janela de sondagem")
            return
        time.sleep(max(0, args.intervalo - len(args.ids)))


if __name__ == "__main__":
    sys.exit(main())
