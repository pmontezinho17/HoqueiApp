"""Cliente HTTP para a plataforma Assys Software.

Responsabilidades: ser educado com um servidor pequeno (IIS num Plesk partilhado),
identificar-se, e resolver a inconsistência de encoding entre endpoints.
"""
from __future__ import annotations

import time
from dataclasses import dataclass

import httpx

UA = "hoqueiAPP/0.1 (+pedro.montezinho@devoteam.com)"
BASE = "https://{tenant}.assyssoftware.es/intranet/web/"

# id_modal=1 é hóquei em patins. Outros valores são artística, velocidade, etc.
MODALIDADE_HOQUEI = 1


@dataclass(frozen=True)
class Resposta:
    url: str
    html: str
    bruto: bytes


class Fonte:
    """Um pedido de cada vez, com intervalo mínimo garantido entre pedidos.

    O intervalo é deliberadamente conservador: a fonte é o servidor de uma federação,
    não uma API pensada para tráfego automatizado.
    """

    def __init__(self, tenant: str, intervalo: float = 1.0, tentativas: int = 3):
        self.tenant = tenant
        self.intervalo = intervalo
        self.tentativas = tentativas
        self._ultimo = 0.0
        self._cliente = httpx.Client(
            base_url=BASE.format(tenant=tenant),
            headers={"User-Agent": UA},
            timeout=30.0,
            follow_redirects=True,
        )

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self._cliente.close()

    def _esperar(self) -> None:
        falta = self.intervalo - (time.monotonic() - self._ultimo)
        if falta > 0:
            time.sleep(falta)
        self._ultimo = time.monotonic()

    def _obter(self, caminho: str, params: dict | None = None) -> Resposta:
        erro: Exception | None = None
        for tentativa in range(self.tentativas):
            self._esperar()
            try:
                r = self._cliente.get(caminho, params=params)
                r.raise_for_status()
            except Exception as e:  # rede instável ou 5xx transitório do IIS
                erro = e
                time.sleep(2**tentativa)
                continue
            return Resposta(url=str(r.url), html=descodificar(caminho, r.content), bruto=r.content)
        raise RuntimeError(f"falhou {self.tentativas}x: {caminho} {params}") from erro

    # --- endpoints -------------------------------------------------------

    def seccao(self, seccion: str, **params) -> Resposta:
        """Páginas `?seccion=...`. Atenção: uma secção desconhecida devolve 200 com a
        lista de competições (fallback silencioso), por isso o 200 não prova nada."""
        return self._obter("", {"seccion": seccion, "id_modal": MODALIDADE_HOQUEI, **params})

    def jogo(self, id_jogo: int) -> Resposta:
        """Ficha de jogo. Usar sempre partido.asp — o partido2.asp é um alias que só
        existe nalguns tenants (404 na FPP)."""
        return self._obter("partido.asp", {"id": id_jogo})


def descodificar(caminho: str, bruto: bytes) -> str:
    """A fonte mistura encodings: as páginas `?seccion=` vêm em UTF-8 e o `partido.asp`
    vem em Windows-1252. Sem isto, "PAÇO ARCOS" chega partido."""
    codec = "cp1252" if "partido" in caminho else "utf-8"
    return bruto.decode(codec, errors="replace")
