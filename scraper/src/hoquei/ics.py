"""Feed de calendário por equipa (B4.11), em iCalendar — RFC 5545.

Porque é um **feed subscrito** e não um ficheiro descarregado: o utilizador cola o URL uma
vez e o calendário dele relê-o sozinho. Quando a federação adia um jogo, o calendário
corrige-se sem a app fazer nada e mesmo que a PWA seja desinstalada. Um `.ics` descarregado
ficava congelado na hora velha.

O ritmo da releitura não é nosso: o Google Calendar relê a cada ~12–24 h e não deixa forçar;
o Apple Calendar deixa escolher e chega aos 15 minutos. Por isso o feed resolve bem "ter a
época toda no calendário" e mal "o jogo de amanhã mudou de hora" — essa é a Fase 5.
"""

from __future__ import annotations

import datetime as dt
import re
import unicodedata
from zoneinfo import ZoneInfo

from .nomes import clube, escalao
from .recintos import localizacao

LISBOA = ZoneInfo("Europe/Lisbon")
DOMINIO = "hoquei.pages.dev"
#: Sem duração na fonte. 90 min cobrem as duas partes e o intervalo em qualquer escalão,
#: do sub-13 (2×18) aos seniores (2×25), com margem para descontos de tempo.
DURACAO = dt.timedelta(minutes=90)


def slug(texto: str) -> str:
    """O mesmo slug da web (`web/src/lib/slug.ts`), para o URL do feed casar com o da equipa."""
    sem_acento = "".join(c for c in unicodedata.normalize("NFD", texto)
                         if unicodedata.category(c) != "Mn")
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", sem_acento.lower()))


def _escapar(valor: str) -> str:
    """RFC 5545 §3.3.11: a barra primeiro, senão escapava-se o que já tinha sido escapado."""
    return (valor.replace("\\", "\\\\").replace(";", "\\;")
                 .replace(",", "\\,").replace("\n", "\\n"))


def _dobrar(linha: str) -> list[str]:
    """RFC 5545 §3.1: no máximo 75 **octetos** por linha, continuação com um espaço.

    Em octetos e não em caracteres: um `ç` ocupa dois bytes em UTF-8 e dobrar a meio
    partia-o em dois, o que dá mojibake em alguns clientes.
    """
    bruto = linha.encode("utf-8")
    if len(bruto) <= 75:
        return [linha]
    partes, resto = [], bruto
    limite = 75
    while len(resto) > limite:
        corte = limite
        # não cortar a meio de um caractere multi-byte
        while corte > 0 and (resto[corte] & 0xC0) == 0x80:
            corte -= 1
        partes.append(resto[:corte].decode("utf-8"))
        resto = resto[corte:]
        limite = 74  # as linhas seguintes levam um espaço à frente
    partes.append(resto.decode("utf-8"))
    return [partes[0]] + [" " + p for p in partes[1:]]


def _utc(data: str, hora: str | None) -> tuple[str, str] | None:
    """Hora local de Lisboa → UTC. `None` quando a fonte ainda não marcou hora."""
    if not hora:
        return None
    try:
        local = dt.datetime.fromisoformat(f"{data}T{hora[:5]}").replace(tzinfo=LISBOA)
    except ValueError:
        return None
    fim = local + DURACAO
    f = lambda d: d.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f(local), f(fim)


def _uid(jogo: dict) -> str:
    if jogo.get("id"):
        return f"jogo-{jogo['id']}@{DOMINIO}"
    # jogos sem id na fonte (apuramentos por definir): chave estável pelo conteúdo
    return f"{jogo['data']}-{slug(jogo['casa'])}-{slug(jogo['fora'])}@{DOMINIO}"


def _resumo(jogo: dict) -> str:
    """`🏑 Sub-13 🏑 Parede FC B vs Caco B`.

    O escalão vem à frente porque um pai com dois filhos subscreve dois calendários e, numa
    semana cheia, é o que distingue um jogo do outro. O 🏑 marca o que é hóquei entre as
    reuniões e os aniversários — é o que torna a linha reconhecível antes de ser lida.
    """
    return (f"🏑 {escalao(jogo['cat'])} 🏑 "
            f"{clube(jogo['casa'])} vs {clube(jogo['fora'])}")


def _descricao(jogo: dict) -> str:
    # o confronto por extenso abre a descrição: o título é abreviado de propósito, e quem
    # abre o evento quer ver quem jogou contra quem sem ter de adivinhar a ordem
    gc, gf = jogo.get("gc"), jogo.get("gf")
    # o resultado vive na descrição: no título ficaria a dizer quem ganhou a quem passa
    # os olhos pelo mês, o que estraga a surpresa a quem ainda não viu o jogo
    confronto = (f"{clube(jogo['casa'])} {gc}–{gf} {clube(jogo['fora'])}"
                 if gc is not None and gf is not None else
                 f"{clube(jogo['casa'])} vs {clube(jogo['fora'])}")
    partes = [p for p in (jogo.get("grupo_nome") or jogo.get("prova"),
                          f"Série {jogo['serie']}" if jogo.get("serie") else None,
                          jogo.get("cat")) if p]
    linhas = [confronto, " · ".join(partes)]
    if jogo.get("recinto"):
        linhas.append(jogo["recinto"])
    if jogo.get("id"):
        linhas.append(f"https://{DOMINIO}/jogo/{jogo['id']}")
    linhas.append("Dados da Associação de Patinagem de Lisboa. Site não oficial.")
    return "\n".join(linhas)


def feed(equipa: str, categoria: str, jogos: list[dict],
         hoje: str | None = None) -> str:
    """O calendário de uma equipa, pronto a servir.

    **Só de hoje em diante.** Um calendário pessoal serve para saber onde é preciso estar,
    não para guardar histórico: os resultados antigos já vivem na app, e no calendário só
    enchiam os meses passados. O dia de hoje entra inteiro, porque o jogo da tarde ainda
    conta de manhã.
    """
    hoje = hoje or dt.datetime.now(LISBOA).date().isoformat()
    jogos = [j for j in jogos if j["data"] >= hoje]
    linhas = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//hoquei//{DOMINIO}//PT",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{_escapar(f'🏑 {clube(equipa)} · {escalao(categoria)}')}",
        f"X-WR-CALDESC:{_escapar(f'Jogos de {clube(equipa)} ({escalao(categoria)})')}",
        "X-WR-TIMEZONE:Europe/Lisbon",
        # pedidos de releitura; o cliente obedece se quiser (o Google ignora-os)
        "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
        "X-PUBLISHED-TTL:PT6H",
    ]
    for jogo in sorted(jogos, key=lambda j: (j["data"], j.get("hora") or "99:99")):
        linhas.append("BEGIN:VEVENT")
        linhas.append(f"UID:{_uid(jogo)}")
        # DTSTAMP determinista, derivado da data do jogo. Com `datetime.now()` o ficheiro
        # mudava a cada corrida do cron e a app republicava de 6 em 6 horas para sempre,
        # mesmo sem um único dado novo — foi o que já aconteceu com o meta.json.
        linhas.append(f"DTSTAMP:{jogo['data'].replace('-', '')}T000000Z")
        quando = _utc(jogo["data"], jogo.get("hora"))
        if quando:
            linhas.append(f"DTSTART:{quando[0]}")
            linhas.append(f"DTEND:{quando[1]}")
        else:
            # sem hora marcada: dia inteiro, e DTEND é o dia seguinte (fim exclusivo)
            dia = dt.date.fromisoformat(jogo["data"])
            linhas.append(f"DTSTART;VALUE=DATE:{dia.strftime('%Y%m%d')}")
            linhas.append(f"DTEND;VALUE=DATE:{(dia + dt.timedelta(days=1)).strftime('%Y%m%d')}")
        linhas.append(f"SUMMARY:{_escapar(_resumo(jogo))}")
        onde = localizacao(jogo.get("recinto"))
        if onde:
            linhas.append(f"LOCATION:{_escapar(onde)}")
        linhas.append(f"DESCRIPTION:{_escapar(_descricao(jogo))}")
        if jogo.get("id"):
            linhas.append(f"URL:https://{DOMINIO}/jogo/{jogo['id']}")
        linhas.append("END:VEVENT")
    linhas.append("END:VCALENDAR")

    dobradas = [d for linha in linhas for d in _dobrar(linha)]
    return "\r\n".join(dobradas) + "\r\n"      # RFC 5545 §3.1: CRLF, e o ficheiro termina com um


def nome_ficheiro(equipa: str, categoria: str) -> str:
    """`sub-13--parede-fc-b.ics` — a mesma chave que a rota `/equipa/[cat]/[nome]`."""
    return f"{slug(categoria)}--{slug(equipa)}.ics"
