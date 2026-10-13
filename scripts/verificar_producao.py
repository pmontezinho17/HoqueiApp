#!/usr/bin/env python3
"""Confirma que o site publicado serve o que lhe mandámos — **depois** de publicar.

    python3 scripts/verificar_producao.py
    python3 scripts/verificar_producao.py --base https://testes.hoquei.pages.dev

Sai `0` se tudo passar e `1` se alguma coisa falhar, com a lista do que falhou no `stderr`.

## Porque é que isto existe, e porque é que os testes que já tínhamos não bastavam

A 12/10/2026 às 23:42 a ronda de fecho publicou. O log do `wrangler` diz, por extenso,
`Uploading Functions bundle`, `_headers` e `_redirects`. O alias daquela publicação servia as
três coisas. E o `hoquei.pages.dev` servia **só os ficheiros estáticos**, durante **18 horas**:

| | produção | o alias da mesma publicação |
|---|---|---|
| `/consola` | 404, 0 bytes | 200 |
| `/contar` | 404 | 204 |
| qualquer link directo de jogo | 404 | 200 |
| `meta.json` | `s-maxage=604800` | `max-age=20` |

O dono deu por ela pela consola. **A pior das três não era essa.** Sem o `_headers`, todo o
`/v1/*` passou a ser servido com a cache por omissão da Cloudflare: **sete dias** em vez dos
nossos 20 segundos. Naquele dia não havia jogos, por isso não se perdeu nada. Num sábado, os
resultados ao vivo ficavam congelados na borda durante uma semana — e ninguém daria por ela a
olhar para a app, porque a app mostrava números, só que os de antes.

**O CI não podia ter apanhado isto, e é esse o ponto.** Os 288 testes do raspador e os 294 da
app correram verdes no commit que produziu aquela publicação, e estavam certos: o código estava
bem, o build estava bem, o upload estava bem. O que falhou foi a Cloudflare a servir. A única
coisa que apanha esta classe de avaria é **pedir ao site publicado, depois de publicar**.

E nada no projecto o fazia. O `sonda.yml` sonda o servidor da APL, não o nosso; a cadeia do
`vigia` e do `aviso` olha para o observador e para as Actions.

## Porque é que corre nos **dois** publicadores

Porque há dois, e é uma regra escrita do projecto: o `dados.yml` e o `scripts/aovivo.sh`. Um
teste só no `dados.yml` deixava de fora todas as publicações do ciclo ao vivo — que são as que
acontecem **durante os jogos**, exactamente quando esta avaria custa mais.

No ciclo ao vivo não corre a cada publicação: num dia de jogos houve 809 publicações (medido a
11/10/2026) e 809 × 5 pedidos ao nosso próprio CDN é ruído sem proveito. Corre na primeira e
depois a cada dez — ver o `aovivo.sh`.

## O que não faz

**Não reverte nada.** Quando isto falha, o site já está no ar e já está mal; o que se quer é um
aviso e não uma segunda publicação automática a adivinhar. Quem avisa é o `dados.yml`, pelo
registo com etiqueta `ronda` que já existe.

E **tenta três vezes antes de desistir**: um soluço de rede não pode pôr uma ronda vermelha.
"""
from __future__ import annotations

import argparse
import json
import ssl
import sys
import time
import urllib.error
import urllib.request

PRODUCAO = "https://hoquei.pages.dev"
V1 = "/v1/aplisboa/2026-27"
UA = "hoqueiAPP-verificacao (github.com/pmontezinho17/HoqueiApp)"

#: Três tentativas, com um segundo de intervalo. Um soluço de rede não é uma avaria do site, e
#: uma ronda vermelha por causa de um soluço ensina a ignorar rondas vermelhas.
TENTATIVAS = 3
ESPERA = 1.0


def _contexto_ssl() -> ssl.SSLContext:
    """O contexto de TLS, com as autoridades do sistema ou, se não as houver, as do `certifi`.

    Isto não é zelo: **sem ele esta ferramenta mente**. Corrido a 13/10/2026 com o
    `/usr/local/bin/python3`, as sete verificações falharam todas com
    `CERTIFICATE_VERIFY_FAILED` e o relatório dizia *"7 de 7 verificações falharam"* — produção
    estava perfeitamente bem. Medido a seguir: esse interpretador tem **zero** raízes no
    contexto por omissão (é a distribuição python.org, a que precisa do
    `Install Certificates.command`), e o `/usr/bin/python3` da mesma máquina tem 128. Qual
    deles corre depende do `PATH` de quem chama, e é por isso que isto passou despercebido até
    hoje. Uma verificação que grita "produção em baixo" quando o problema é o interpretador de
    quem a corre ensina a ignorá-la, que é exactamente o contrário do que ela existe para fazer.

    Nunca desliga a verificação do certificado. Ou há raízes, ou o pedido falha — e falhar
    aparece como *"não se conseguiu verificar"*, que já é uma frase diferente de *"está mal"*.
    """
    contexto = ssl.create_default_context()
    try:                                     # as raízes do sistema chegam? então é só isso.
        contexto.load_default_certs(ssl.Purpose.SERVER_AUTH)
        if contexto.get_ca_certs():
            return contexto
    except Exception:                        # pragma: no cover - depende da máquina
        pass
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:                      # pragma: no cover - depende da máquina
        return contexto


_SSL = _contexto_ssl()


def _pedir(url: str, metodo: str = "GET",
           corpo: bytes | None = None) -> tuple[int, dict[str, str], bytes]:
    cabecalhos = {"User-Agent": UA}
    if corpo is not None:
        cabecalhos["Content-Type"] = "application/json"
    pedido = urllib.request.Request(url, headers=cabecalhos, data=corpo, method=metodo)
    try:
        with urllib.request.urlopen(pedido, timeout=20, context=_SSL) as r:
            return r.status, {k.lower(): v for k, v in r.headers.items()}, r.read()
    except urllib.error.HTTPError as e:
        return e.code, {k.lower(): v for k, v in e.headers.items()}, e.read()


# --- as verificações, cada uma uma função que devolve o que está mal ou `None` -------------

def funcoes_vivas(base: str) -> str | None:
    """As Pages Functions respondem.

    **O `/contar` é a sonda boa para qualquer anfitrião**, e é por isso que é esta a que corre
    sempre: é um `fetch` e não uma navegação, logo a porta dos sites de ramo deixa-o passar.
    Um 404 aqui é o sintoma exacto da avaria de 12/10 — a Function não corre.
    """
    estado, _, _ = _pedir(f"{base}/contar?novo=0")
    if estado != 204:
        return f"/contar devolveu HTTP {estado} em vez de 204 — a Function não corre"
    return None


def consola_viva(base: str) -> str | None:
    """A consola responde com a caixa da chave.

    **Só em produção**, e não é uma excepção preguiçosa: a consola vive em
    `hoquei.pages.dev/consola` por decisão de 09/10/2026, e a `CHAVE_CONTAGENS` existe só no
    ambiente de Production. No site de testes ela devolve 503 — "não tem chave configurada" —
    e isso está certo. Verificá-la ali era ensinar-nos a ignorar esta verificação.

    Um 503 **em produção** é outra coisa: é a chave a ter desaparecido do painel.
    """
    if base.rstrip("/") != PRODUCAO:
        return None
    estado, _, corpo = _pedir(f"{base}/consola")
    if estado != 200 or b"chave" not in corpo.lower():
        return f"/consola devolveu HTTP {estado} com {len(corpo)} bytes"
    return None


def links_directos_abrem(base: str) -> str | None:
    """Um caminho que não existe como ficheiro devolve a app, e não um 404.

    É o `_redirects` a funcionar, e é o que faz um link de jogo partilhado no WhatsApp abrir.
    Sem ele, quem recebe o link vê um 404 — e foi uma das três coisas que se perderam.
    """
    estado, _, corpo = _pedir(f"{base}/jogo/999999")
    if estado != 200:
        return f"/jogo/999999 devolveu HTTP {estado} — o _redirects não está a ser aplicado"
    if b"<html" not in corpo.lower():
        return "/jogo/999999 devolveu 200 mas não é HTML"
    return None


def cache_dos_dados(base: str) -> str | None:
    """O `/v1/*` vem com os **nossos** 20 segundos, e não com a cache por omissão.

    **A verificação mais importante deste ficheiro.** É a que apanha o congelamento dos
    resultados ao vivo, e é a única das três que não dá sinal nenhum a quem usa a app.
    """
    estado, cab, _ = _pedir(f"{base}{V1}/meta.json")
    if estado != 200:
        return f"{V1}/meta.json devolveu HTTP {estado}"
    cc = cab.get("cache-control", "")
    if "max-age=20" not in cc:
        return (f"{V1}/meta.json veio com `cache-control: {cc or '(nada)'}` — "
                "o _headers não está a ser aplicado e os dados podem congelar na borda")
    return None


def contrato_intacto(base: str) -> str | None:
    """Os ficheiros do contrato `/v1` existem, são JSON, e têm as chaves que a app espera.

    Não é paranóia: o `AGENTS.md` diz que o contrato é público e que há builds antigos em cache
    nos telemóveis, e que renomear um campo deixa esses telefones com uma app vazia **e sem
    explicação**. Um erro desses não dá erro nenhum do nosso lado.
    """
    esperado = {
        "agenda.json": ("jogos",),
        "meta.json": ("generated_at", "temporada_id"),
        "competitions.json": ("competicoes",),
    }
    for nome, chaves in esperado.items():
        estado, _, corpo = _pedir(f"{base}{V1}/{nome}")
        if estado != 200:
            return f"{V1}/{nome} devolveu HTTP {estado}"
        try:
            d = json.loads(corpo)
        except json.JSONDecodeError as e:
            return f"{V1}/{nome} não é JSON válido: {e}"
        faltam = [c for c in chaves if c not in d]
        if faltam:
            return f"{V1}/{nome} não tem {', '.join(faltam)} — o contrato mudou"
    return None


def versao_servida(base: str) -> str | None:
    """O `/versao.json` existe e é um número.

    É dele que a app decide se uma actualização vale um aviso — ver `lib/actualizacao.ts`. Se
    desaparecer, a app volta a interromper todos a cada publicação, e isso também não dá erro.
    """
    estado, _, corpo = _pedir(f"{base}/versao.json")
    if estado != 200:
        return f"/versao.json devolveu HTTP {estado}"
    try:
        v = json.loads(corpo).get("versao")
    except json.JSONDecodeError as e:
        return f"/versao.json não é JSON válido: {e}"
    if not isinstance(v, str) or not v.strip():
        return f"/versao.json não traz uma versão: {v!r}"
    return None


def base_de_dados_ligada(base: str) -> str | None:
    """A caixa de sugestões tem base de dados onde escrever.

    **Sonda sem escrever nada.** Manda um corpo que a Function recusa de certeza — texto vazio —
    e lê o código: um **400** quer dizer que ela correu e decidiu, logo há ligação; um **503**
    quer dizer que não há `env.DADOS`. Nenhum dos dois cria uma linha.

    Existe porque esta é a única parte da app cujo comportamento depende de uma ligação que vive
    só no painel da Cloudflare, e não no repositório. A 13/10/2026 descobriu-se isso por
    tentativa — o dono publicou em `testes`, carregou em enviar, e viu a mensagem de falha —, e
    uma assimetria entre ambientes que só se descobre a usar é uma assimetria que volta.
    """
    estado, _, _ = _pedir(f"{base}/sugerir", metodo="POST", corpo=b'{"texto":"","ok4":""}')
    if estado == 503:
        return ("/sugerir devolveu 503 — não há ligação à base de dados neste ambiente, "
                "e a caixa de sugestões não guarda nada")
    # **O 405 não é avaria: é a funcionalidade ainda não estar nesta publicação.** Um caminho
    # sem Function cai no servidor de ficheiros, que só aceita GET. Distinguir isto de uma
    # avaria importa, porque esta verificação corre de 15 em 15 minutos e um aviso falso
    # ensina-se a ignorar — e porque o que cai quando a camada das Functions morre é o
    # `/contar`, que tem a sua própria verificação e é a que apanha isso.
    if estado == 405:
        return None
    if estado != 400:
        return f"/sugerir devolveu HTTP {estado} em vez de 400 a um corpo que devia recusar"
    return None


#: Pela ordem em que correm. O nome é o que aparece no `stderr` e no registo do aviso.
VERIFICACOES = [
    ("as Functions respondem", funcoes_vivas),
    ("a consola responde", consola_viva),
    ("os links directos abrem", links_directos_abrem),
    ("a cache dos dados é a nossa", cache_dos_dados),
    ("o contrato /v1 está intacto", contrato_intacto),
    ("a versão é servida", versao_servida),
    ("a caixa de sugestões tem onde escrever", base_de_dados_ligada),
]


def verificar(base: str, tentativas: int = TENTATIVAS, espera: float = ESPERA,
              dormir=time.sleep) -> list[str]:
    """Corre tudo e devolve a lista do que falhou, vazia se estiver tudo bem.

    Cada verificação tem as suas tentativas: uma falhar por rede e outra por avaria a sério são
    coisas diferentes, e repetir só a que falhou é mais rápido do que repetir todas.
    """
    falhas = []
    for nome, f in VERIFICACOES:
        erro = None
        for tentativa in range(tentativas):
            try:
                erro = f(base)
            except Exception as e:                  # rede, DNS, timeout — qualquer coisa
                erro = f"não se conseguiu verificar: {type(e).__name__}: {e}"
            if erro is None:
                break
            if tentativa < tentativas - 1:
                dormir(espera)
        if erro:
            falhas.append(f"{nome}: {erro}")
    return falhas


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default=PRODUCAO, help="o site a verificar")
    p.add_argument("--tentativas", type=int, default=TENTATIVAS)
    a = p.parse_args(argv)

    falhas = verificar(a.base, tentativas=a.tentativas)
    if not falhas:
        print(f"{a.base}: as {len(VERIFICACOES)} verificações passaram")
        return 0
    print(f"{a.base}: {len(falhas)} de {len(VERIFICACOES)} verificações falharam",
          file=sys.stderr)
    for f in falhas:
        print(f"  · {f}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
