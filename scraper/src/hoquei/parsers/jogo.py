"""Parser da ficha de jogo (`partido.asp?id=N`).

Um único GET traz quatro blocos: `#resultado` (cabeçalho), `#jugadores` (estatística por
jogador), `#desarrollo` (cronologia) e `#acta` (boletim oficial). Este módulo cobre os três
primeiros — o boletim fica para B1.9c.
"""
from __future__ import annotations

import re
from datetime import date, time

from selectolax.parser import HTMLParser

from ..modelos import EquipaFicha, EventoJogo, FichaJogo, LinhaJogador

_MESES = {"janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4, "maio": 5, "junho": 6,
          "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12}
# Confirmados na fonte. "Jogo sem começar" é o que aparece no cabeçalho de um jogo por
# disputar, enquanto a cronologia do mesmo jogo diz "Jogo não iniciado" — são strings
# diferentes para o mesmo estado, e ambas têm de ser reconhecidas.
_ESTADOS = ("Jogo Terminado", "Jogo Suspendido", "Jogo Adiado",
            "Jogo sem começar", "Jogo não iniciado")


def _texto(no) -> str:
    return re.sub(r"\s+", " ", no.text(separator=" ")).strip() if no is not None else ""


# --- cronologia (B1.9a) ----------------------------------------------------

def _classificar(texto: str) -> tuple[str, str | None, int | None]:
    """(tipo, variante, numero) a partir da primeira linha da descrição."""
    t = texto.strip()
    if re.match(r"jogo terminado", t, re.I):
        return "fim_jogo", None, None
    if re.match(r"jogo n[ãa]o iniciado", t, re.I):
        return "por_iniciar", None, None
    if m := re.match(r"in[íi]cio d[ae]\s*(\d+)", t, re.I):
        return "inicio_parte", None, int(m.group(1))
    if m := re.match(r"final d[ae]\s*(\d+)", t, re.I):
        return "fim_parte", None, int(m.group(1))
    if m := re.match(r"falta\s+(\d+)\s+para", t, re.I):
        return "falta_equipa", None, int(m.group(1))
    if re.match(r"desconto de tempo", t, re.I):
        return "desconto_tempo", None, None
    if re.match(r"golo para", t, re.I):
        variante = ("livre_direto" if re.search(r"de livre direto", t, re.I)
                    else "penalti" if re.search(r"de pen[áa]lti", t, re.I) else None)
        return "golo", variante, None
    if m := re.match(r"(?:(\d+)[ºo°]\s*)?cart[ãa]o\s+(amarelo|azul|vermelho)", t, re.I):
        return "cartao", m.group(2).lower(), int(m.group(1)) if m.group(1) else None
    if re.match(r"pen[áa]lti para", t, re.I):
        return "penalti_falhado", "penalti", None
    if re.match(r"livre direto para", t, re.I):
        return "livre_direto_falhado", "livre_direto", None
    return "desconhecido", None, None


def _equipa(texto: str) -> str | None:
    """A fonte escreve a equipa de três maneiras: "para X", "- X" e numa 2ª linha."""
    if m := re.search(r"\bpara\s+(.+?)(?:\s+de (?:Livre Direto|Pen[áa]lti))?$", texto.strip(), re.I):
        return m.group(1).strip() or None
    if m := re.search(r"cart[ãa]o\s+\w+\s*-\s*(.+)$", texto.strip(), re.I):
        return m.group(1).strip() or None
    return None


def cronologia(html: str) -> list[EventoJogo]:
    """Lê `#desarrollo`.

    A fonte lista do mais recente para o mais antigo; devolvemos em ordem cronológica.
    O relógio é decrescente dentro da parte, e a duração da parte vem do próprio evento
    "Início da Nª Parte" — nunca hardcodada, porque varia com o escalão (seniores 2×25min,
    escolares 4×8min).
    """
    arvore = HTMLParser(html)
    bloco = arvore.css_first("div#desarrollo")
    if bloco is None:
        return []

    cruas: list[tuple[str | None, str, tuple[int, int] | None]] = []
    for linha in bloco.css("tr"):
        celulas = linha.css("td")
        if len(celulas) != 3:
            continue                                   # a linha "INCIDENCIAS" tem colspan
        relogio = _texto(celulas[0].css_first("span.box_tiempo")) or None
        resultado = None
        if (caixa := celulas[1].css_first("div.box_result")) is not None:
            if m := re.search(r"(\d+)\s*-\s*(\d+)", _texto(caixa)):
                resultado = (int(m.group(1)), int(m.group(2)))
        # o <br> separa "o que aconteceu" de "a quem"
        partes = [re.sub(r"\s+", " ", p).strip()
                  for p in re.split(r"<br\s*/?>", celulas[2].html or "")]
        partes = [re.sub(r"<[^>]+>", " ", p).strip() for p in partes]
        partes = [re.sub(r"\s+", " ", p).strip() for p in partes if p.strip()]
        cruas.append((relogio, " | ".join(partes), resultado))

    cruas.reverse()                                    # → ordem cronológica

    eventos: list[EventoJogo] = []
    parte_atual: int | None = None
    duracao_atual: int | None = None                   # segundos
    decorrido_antes = 0                                # segundos das partes já fechadas

    for i, (relogio, texto, resultado) in enumerate(cruas):
        cabeca, _, cauda = texto.partition(" | ")
        tipo, variante, numero = _classificar(cabeca)
        segundos = None
        if relogio and (m := re.match(r"(\d+):(\d{2})$", relogio)):
            segundos = int(m.group(1)) * 60 + int(m.group(2))

        if tipo == "inicio_parte":
            if parte_atual is not None and duracao_atual is not None:
                decorrido_antes += duracao_atual
            parte_atual, duracao_atual = numero, segundos

        minuto = None
        if segundos is not None and duracao_atual is not None:
            # relógio decrescente: o decorrido na parte é o que falta subtraído à duração
            minuto = (decorrido_antes + max(0, duracao_atual - segundos)) // 60

        jogador = assistencia = None
        if cauda:
            if m := re.search(r"assist[êe]ncia por\s+(.+)$", cauda, re.I):
                assistencia = m.group(1).strip()
            primeiro = cauda.split(" | ")[0]
            primeiro = re.sub(r"^(?:marcado|falhado|defendido) por\s+", "", primeiro, flags=re.I)
            if not re.match(r"assist[êe]ncia por", primeiro, re.I):
                jogador = primeiro.strip() or None

        equipa = _equipa(cabeca) or (cauda.split(" | ")[0].strip()
                                     if tipo == "desconto_tempo" and cauda else None)
        if tipo == "desconto_tempo":
            jogador = None

        eventos.append(EventoJogo(
            ordem=i, tipo=tipo, relogio=relogio,
            parte=parte_atual if tipo != "inicio_parte" else numero,
            minuto=minuto, equipa=equipa, jogador=jogador, assistencia=assistencia,
            variante=variante,
            numero=numero if tipo in ("falta_equipa", "cartao") else None,
            golos_casa=resultado[0] if resultado else None,
            golos_fora=resultado[1] if resultado else None,
            texto=texto,
        ))
    return eventos


# --- cabeçalho e estatística por jogador (B1.9) ----------------------------

def _cabecalho(arvore, equipa_fora: str | None = None) -> dict:
    bloco = arvore.css_first("div#resultado")
    bruto = _texto(bloco)
    dados: dict = {"estado": next((e for e in _ESTADOS if e in bruto), None)}
    if m := re.search(r"(\d+)\s*-\s*(\d+)", bruto):
        dados["golos_casa"], dados["golos_fora"] = int(m.group(1)), int(m.group(2))
    if m := re.search(r"(\d{1,2}) de ([a-zç]+) de (\d{4})", bruto, re.I):
        if (mes := _MESES.get(m.group(2).lower())):
            dados["data"] = date(int(m.group(3)), mes, int(m.group(1)))
    if m := re.search(r"\b(\d{1,2})[.:](\d{2})\b", bruto):
        dados["hora"] = time(int(m.group(1)), int(m.group(2)))
    if m := re.search(r"Recinto:\s*(.+?)\s*(?:[ÁA]rbitros?:|$)", bruto):
        dados["recinto"] = m.group(1).strip() or None
    if m := re.search(r"[ÁA]rbitros?:\s*(.+)$", bruto):
        # os rótulos das tabs vêm logo a seguir no DOM e entravam na lista de árbitros
        lista = re.split(r"FICHA DE JOGO|BOLETIM DE JOGO", m.group(1))[0]
        dados["arbitros"] = [a.strip() for a in lista.split(",") if a.strip()]
    faltas = [int(f) for c in bloco.css("div.box_faltas") if (f := _texto(c)).isdigit()]
    dados["faltas"] = tuple(faltas[:2]) if len(faltas) >= 2 else (None, None)
    dados["competicao"] = _competicao(bruto, dados.get("estado"), equipa_fora)
    return dados


def _competicao(bruto: str, estado: str | None, equipa_fora: str | None) -> str | None:
    """O nome da prova fica entre o estado do jogo e a data, sem marcação própria.

    Ancoramos no que vem imediatamente antes: o estado quando existe, senão o nome da
    equipa visitante — porque um jogo por disputar não tem estado nenhum.
    """
    m = re.search(r"\d{1,2} de [a-zç]+ de \d{4}", bruto, re.I)
    if not m:
        return None
    antes = bruto[:m.start()]
    for ancora in (estado, equipa_fora):
        if ancora and ancora in antes:
            antes = antes.rsplit(ancora, 1)[-1]
    # tira o dia da semana. Explícito de propósito: um `[^,]*,$` é ganancioso e, como
    # não há outra vírgula na linha, apagava o nome da prova inteiro.
    antes = re.sub(r"\s*(?:\d+[ªa]\s*feira|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)"
                   r"(?:-feira)?\s*,\s*$", "", antes, flags=re.I)
    return antes.strip(" |") or None


def _inteiro(valor: str) -> int | None:
    return int(valor) if valor.strip().isdigit() else None


def equipas_ficha(html: str) -> list[EquipaFicha]:
    """Lê `#jugadores`: uma tabela por equipa, jogadores seguidos da equipa técnica.

    As duas têm layouts diferentes e distinguem-se pelo número de células, que é mais
    fiável do que procurar a linha separadora "Técnicos":

        jogador (12)  nº | 5I | · | Nome | G | AG | D | Pe | LD | c1 | c2 | c3
        técnico (11)  papel |  · | Nome | -- | -- | -- | -- | -- | c1 | c2 | c3
    """
    arvore = HTMLParser(html)
    bloco = arvore.css_first("div#jugadores")
    if bloco is None:
        return []

    equipas: list[EquipaFicha] = []
    for tabela in bloco.css("table"):
        linhas = tabela.css("tr")
        if not linhas:
            continue
        atual = EquipaFicha(nome=_texto(linhas[0]))
        for linha in linhas[1:]:
            celulas = [_texto(c) for c in linha.css("td")]
            if len(celulas) == 12:
                numero, marca, nome = celulas[0], celulas[1], celulas[3]
                estatistica, papel = celulas[4:9], None
            elif len(celulas) == 11:
                numero, marca, nome = None, "", celulas[2]
                estatistica, papel = ["--"] * 5, celulas[0] or None
            else:
                continue                      # cabeçalho, "Técnicos" e "Total da equipa"
            # "Total da equipa" tem as mesmas 12 células de um jogador e duplicava os golos
            if not nome or nome in ("--", "Nome") or nome.lower().startswith("total"):
                continue
            atual.jogadores.append(LinhaJogador(
                numero=numero or None,
                nome=nome.replace("©", "").strip(),
                titular=marca.upper() == "X",
                golos=_inteiro(estatistica[0]),
                assistencias=_inteiro(estatistica[1]),
                defesas=_inteiro(estatistica[2]),
                penalidades=estatistica[3] if estatistica[3] != "--" else None,
                livres_diretos=estatistica[4] if estatistica[4] != "--" else None,
                papel=papel,
            ))
        if atual.jogadores:
            equipas.append(atual)
    return equipas


def ficha(html: str, id_jogo: int) -> FichaJogo:
    arvore = HTMLParser(html)
    equipas = equipas_ficha(html)
    cab = _cabecalho(arvore, equipas[1].nome if len(equipas) > 1 else None)
    return FichaJogo(
        id=id_jogo,
        competicao=cab.get("competicao"),
        casa=equipas[0].nome if equipas else "",
        fora=equipas[1].nome if len(equipas) > 1 else "",
        golos_casa=cab.get("golos_casa"),
        golos_fora=cab.get("golos_fora"),
        estado=cab.get("estado"),
        data=cab.get("data"),
        hora=cab.get("hora"),
        recinto=cab.get("recinto"),
        arbitros=cab.get("arbitros", []),
        faltas=cab.get("faltas", (None, None)),
        equipas=equipas,
        cronologia=cronologia(html),
    )
