"""Filtro de dados pessoais por escalão.

A fonte expõe nomes completos de crianças ligados a golos, cartões e assistências.
Republicar isso num sítio público, pesquisável e agregável é um problema diferente do
site de uma federação — ver o risco em docs/03-backlog.md (B1.21).

A regra: abaixo de sub-17 não sai nenhum dado individual. Fica o jogo, o resultado, a
cronologia dos acontecimentos e as equipas; sai apenas quem os fez.
"""
from __future__ import annotations

import re

# Escalões onde os atletas são maioritariamente menores. Na dúvida, restringir:
# um escalão novo que não conheçamos cai no ramo restritivo por omissão.
_IDADE_MINIMA_PUBLICAVEL = 17


def escalao_permite_individual(categoria: str | None) -> bool:
    """True quando é aceitável publicar nomes de atletas desta categoria."""
    if not categoria:
        return False
    texto = categoria.upper()
    if "SENIOR" in texto or "SÉNIOR" in texto:
        return True
    if m := re.search(r"SUB[\s-]*(\d{1,2})", texto):
        return int(m.group(1)) >= _IDADE_MINIMA_PUBLICAVEL
    # ESCOLARES, BENJAMINS, BAMBIS, INFANTIS e tudo o que não soubermos ler
    return False


def anonimizar_ficha(dados: dict) -> dict:
    """Remove tudo o que identifica um atleta, preservando a estrutura do jogo.

    Não apaga a cronologia: um golo continua a ser um golo, com minuto, equipa e
    resultado. Desaparece só quem o marcou.
    """
    dados = dict(dados)
    dados["individuais_omitidos"] = True
    dados["arbitros"] = []
    dados["equipas"] = [{"nome": e["nome"], "jogadores": []} for e in dados.get("equipas", [])]
    dados["cronologia"] = [
        {**e, "jogador": None, "assistencia": None,
         "texto": e["texto"].split(" | ")[0]}
        for e in dados.get("cronologia", [])
    ]
    return dados
