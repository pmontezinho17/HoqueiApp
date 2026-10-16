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
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
REPO_SUGESTOES = "pmontezinho17/ok4sticks-sugestoes"
BASE_D1 = "ok4sticks-dados"

#: Um item da tabela do backlog: `| B1.12 | descrição | should | S | aberto |`
ITEM = re.compile(r"^[A-Z]+\d+(?:\.\d+[a-z]?)?$|^R\d+$")


def _correr(cmd: list[str]) -> tuple[int, str]:
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=RAIZ)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def itens_abertos() -> list[tuple[str, str, str, str]]:
    """Os itens da tabela do backlog cujo estado ainda diz `aberto`."""
    abertos = []
    for linha in (RAIZ / "docs" / "03-backlog.md").read_text(encoding="utf-8").splitlines():
        if not linha.startswith("|"):
            continue
        celulas = [c.strip() for c in linha.strip("|").split("|")]
        if len(celulas) < 5 or not ITEM.match(celulas[0]):
            continue
        if "aberto" in celulas[4].lower():
            abertos.append((celulas[0], celulas[2], celulas[3], celulas[1]))
    return abertos


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


def main() -> int:
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
