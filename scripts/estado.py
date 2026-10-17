#!/usr/bin/env python3
"""O que há para fazer, e o que as pessoas escreveram.

## Porque é que isto existe

O dono perguntou a 16/10/2026: *"como é que eu consigo ver o que temos em backlog para fazer?
ou mesmo o que foi escrito na caixa de sugestões?"*. As duas respostas existiam e nenhuma era
prática: o backlog tem mais de 3 700 linhas e os itens abertos estão espalhados por uma tabela
no meio delas; as sugestões vivem em dois sítios — as arquivadas num repositório privado, as
que ainda não foram arquivadas na D1.

Perguntar isto é a definição de tarefa que se repete, por isso deixa de ser uma mensagem minha
e passa a ser um comando dele.

    python3 scripts/estado.py

Lê e não escreve nada. Não toca na APL.

## O que ele **não** faz, de propósito

**Não inventa um zero quando não consegue ler.** Se o `wrangler` não tiver sessão válida — e já
expirou duas vezes neste projecto — isto diz que não conseguiu ler a D1, em vez de dizer que não
há sugestões nenhumas. É a mesma lição que o `sugestoes.yml` pagou a 15/10: um erro contado como
zero é pior do que um erro, porque ninguém vai procurar.
"""
from __future__ import annotations

import json
import re
import subprocess
from collections import Counter
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REPO_SUGESTOES = "pmontezinho17/ok4sticks-sugestoes"
BASE_D1 = "ok4sticks-dados"

#: Um item da tabela do backlog: `| B1.12 | descrição | should | S | aberto |`
ITEM = re.compile(r"^[A-Z]+\d+(?:\.\d+[a-z]?)?$|^R\d+$")

#: Como se lê a quinta coluna. Nem todas as linhas lá têm estado: as fases antigas têm o
#: **critério de aceitação**, e isso quer dizer "por fazer e ninguém lhe tocou" — não "sem
#: estado". A contagem distingue as duas coisas de propósito, porque juntá-las dava um número
#: que ninguém saberia ler.
def classificar(estado: str) -> str:
    e = estado.strip()
    baixo = e.lower()
    if e.startswith("✅") or "feito" in baixo or "fechado" in baixo:
        return "feito"
    if e.startswith("❌"):
        return "recusado"
    if e.startswith("🟡"):
        return "a meio"
    if "aberto" in baixo:
        return "aberto"
    if "adiado" in baixo:
        return "adiado"
    return "por começar"


def _correr(cmd: list[str]) -> tuple[int, str]:
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=RAIZ)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def itens() -> list[tuple[str, str, str, str, str]]:
    """Todos os itens da tabela do backlog: `(id, prioridade, tamanho, descrição, classe)`."""
    saida = []
    for linha in (RAIZ / "docs" / "03-backlog.md").read_text(encoding="utf-8").splitlines():
        if not linha.startswith("|"):
            continue
        celulas = [c.strip() for c in linha.strip("|").split("|")]
        if len(celulas) < 5 or not ITEM.match(celulas[0]):
            continue
        saida.append((celulas[0], celulas[2], celulas[3], celulas[1], classificar(celulas[4])))
    return saida


def itens_abertos() -> list[tuple[str, str, str, str]]:
    """Só os que dizem `aberto` — os que alguém marcou como por fazer agora."""
    return [(i[0], i[1], i[2], i[3]) for i in itens() if i[4] == "aberto"]


def sugestoes_arquivadas() -> tuple[list[dict], str | None]:
    codigo, saida = _correr([
        "gh", "issue", "list", "--repo", REPO_SUGESTOES, "--state", "all",
        "--limit", "200", "--json", "number,title,state,createdAt",
    ])
    if codigo != 0:
        return [], saida.strip().splitlines()[-1] if saida.strip() else "o `gh` falhou"
    try:
        return json.loads(saida), None
    except json.JSONDecodeError:
        return [], "a resposta do `gh` não era JSON"


def sugestoes_por_arquivar() -> tuple[list[dict], str | None]:
    """As linhas da D1 que ainda não viraram registo. Erro é erro, e não zero."""
    codigo, saida = _correr([
        "npx", "--yes", "wrangler@4.150.0", "d1", "execute", BASE_D1, "--remote", "--json",
        "--command",
        "SELECT id, dia, hora, substr(texto, 1, 90) AS inicio FROM sugestao "
        "WHERE issue IS NULL AND ramo IS NULL ORDER BY id",
    ])
    inicio = saida.find("[")
    if inicio < 0:
        return [], f"não se conseguiu ler a D1 — {saida.strip()[-200:]}"
    try:
        corpo, _ = json.JSONDecoder().raw_decode(saida[inicio:])
    except json.JSONDecodeError:
        return [], "a resposta do wrangler não era JSON"
    primeiro = corpo[0] if isinstance(corpo, list) and corpo else corpo
    if not isinstance(primeiro, dict) or "results" not in primeiro:
        # `{"text": "Authentication error [code: 10000]"}` é o caso que já aconteceu duas vezes:
        # a sessão do `wrangler` expira e é preciso `npx wrangler login` outra vez.
        razao = (primeiro or {}).get("text") or "resposta sem `results`"
        return [], f"não se conseguiu ler a D1 — {razao}"
    return primeiro["results"], None


def panorama() -> int:
    """A contagem por classe, para a pergunta "quanto falta ao todo?"."""
    todos = itens()
    classes = Counter(i[4] for i in todos)
    print(f"\n── Backlog: {len(todos)} itens ao todo " + "─" * 28)
    for classe in ("feito", "aberto", "por começar", "a meio", "adiado", "recusado"):
        if classes[classe]:
            print(f"  {classes[classe]:4}  {classe}")
    porFazer = classes["aberto"] + classes["por começar"] + classes["a meio"]
    print(f"\n  Por fazer, ao todo: {porFazer}")
    print("  (`aberto` é o que alguém marcou como por fazer agora; `por começar` são as fases")
    print("   antigas, cuja quinta coluna é o critério de aceitação e não um estado.)")

    print("\n── Por fase " + "─" * 46)
    fases = Counter()
    porFazerFase = Counter()
    for i in todos:
        # `B9.14` → fase `B9`; `R1` e `C3` não têm ponto e são famílias por si — agrupam-se
        # pelas letras, senão cada um aparecia como uma "fase" de um item só.
        m = re.match(r"^([A-Z]+)(\d+)(\.)?", i[0])
        f = m.group(1) + m.group(2) if m.group(3) else m.group(1)
        fases[f] += 1
        if i[4] in ("aberto", "por começar", "a meio"):
            porFazerFase[f] += 1
    for f, n in sorted(fases.items(), key=lambda x: -porFazerFase[x[0]]):
        if porFazerFase[f]:
            print(f"  {f:7} {porFazerFase[f]:3} por fazer de {n}")
    return porFazer


def main() -> int:
    if "--tudo" in sys.argv:
        panorama()
    abertos = itens_abertos()
    print(f"\n── Backlog: {len(abertos)} itens por fazer " + "─" * 30)
    for ident, prioridade, tamanho, descricao in sorted(
        abertos, key=lambda i: {"must": 0, "should": 1, "could": 2}.get(i[1], 3)
    ):
        print(f"  {ident:7} {prioridade:7} {tamanho:3}  {descricao[:66]}")
    print("\n  O porquê de cada um está em docs/03-backlog.md; a ordem, na secção")
    print("  \"Próximo incremento\".")

    arquivadas, erro = sugestoes_arquivadas()
    print(f"\n── Sugestões arquivadas: {len(arquivadas)} " + "─" * 34)
    if erro:
        print(f"  não se conseguiu ler o arquivo — {erro}")
    for s in arquivadas:
        print(f"  #{s['number']:<4} {s['createdAt'][:10]}  [{s['state'].lower()}]  {s['title'][:60]}")
    print(f"\n  Estão em https://github.com/{REPO_SUGESTOES}/issues — privado, porque são")
    print("  palavras de outras pessoas.")

    pendentes, erro = sugestoes_por_arquivar()
    print("\n── Sugestões ainda por arquivar " + "─" * 27)
    if erro:
        print(f"  {erro}")
        print("  (se for sessão expirada: `npx wrangler login`)")
    elif not pendentes:
        print("  nenhuma — está tudo arquivado")
    else:
        for s in pendentes:
            print(f"  #{s['id']:<4} {s['dia']} {s['hora']}  {s['inicio']}")
        print("\n  O `sugestoes.yml` arquiva-as às 07:20 UTC. Para não esperar:")
        print("  `gh workflow run sugestoes.yml`")
    print()
    return 0


if __name__ == "__main__":
    sys.exit(main())
