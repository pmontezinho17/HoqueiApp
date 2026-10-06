"""Testes do feed de calendário (B4.11).

O que se guarda aqui é sobretudo **conformidade com o RFC 5545**, porque um ficheiro ICS
inválido não dá erro: o calendário simplesmente ignora-o, ou importa metade, e ninguém
percebe porquê. E a estabilidade do UID e do DTSTAMP, que é o que separa "o calendário
corrige-se" de "o calendário enche-se de duplicados".
"""

from __future__ import annotations

import datetime as dt

from hoquei.ics import LISBOA, feed, nome_ficheiro, slug

JOGO = {"id": 9547, "data": "2026-10-02", "hora": "19:30",
        "casa": "CD PAÇO ARCOS B", "fora": "PAREDE FC B", "gc": 2, "gf": 9,
        "recinto": "PAV. PAÇO DE ARCOS", "prova": "CAMP. REG. SUB-13",
        "cat": "SUB-13", "grupo_nome": "CAMP. REG. SUB-13 - 1ª FASE", "serie": "D"}


#: Fixo de propósito: o feed passou a cortar os jogos passados, e um teste que dependa do
#: dia em que corre deixa de ser um teste — passa hoje e falha amanhã sem nada ter mudado.
HOJE = "2026-09-01"


def cal(equipa: str, categoria: str, jogos: list[dict]) -> str:
    return feed(equipa, categoria, jogos, hoje=HOJE)


def linhas(texto: str) -> list[str]:
    return texto.split("\r\n")


def desdobrar(texto: str) -> list[str]:
    """Junta as linhas de continuação, como faz um cliente de calendário."""
    saida: list[str] = []
    for linha in texto.split("\r\n"):
        if linha.startswith(" ") and saida:
            saida[-1] += linha[1:]
        else:
            saida.append(linha)
    return saida


def propriedades(texto: str) -> dict[str, str]:
    return dict(l.split(":", 1) for l in desdobrar(texto) if ":" in l)


class TestFormato:
    def test_termina_sempre_em_crlf(self):
        t = cal("PAREDE FC B", "SUB-13", [JOGO])
        assert t.endswith("\r\n")
        assert "\n" not in t.replace("\r\n", "")   # nunca um LF solto

    def test_abre_e_fecha_os_blocos(self):
        l = desdobrar(cal("PAREDE FC B", "SUB-13", [JOGO, dict(JOGO, id=1, data="2026-11-01")]))
        assert l[0] == "BEGIN:VCALENDAR"
        assert "END:VCALENDAR" in l
        assert l.count("BEGIN:VEVENT") == l.count("END:VEVENT") == 2

    def test_nenhuma_linha_passa_dos_75_octetos(self):
        comprido = dict(JOGO, recinto="PAVILHÃO MUNICIPAL DE SÃO JOÃO DA MADEIRA — CAMPO Nº 2 ANEXO")
        for l in linhas(cal("ASSOCIAÇÃO DESPORTIVA E RECREATIVA", "SUB-13", [comprido])):
            assert len(l.encode("utf-8")) <= 75, l

    def test_dobrar_nao_parte_caracteres_acentuados(self):
        # um `ç` são dois octetos: dobrar a meio dava mojibake
        recinto = "PAVILHÃO " + "ÇÃO" * 30
        t = cal("EQUIPA", "SUB-13", [dict(JOGO, recinto=recinto)])
        t.encode("utf-8").decode("utf-8")              # não rebenta
        assert recinto in propriedades(t)["LOCATION"]  # chega inteiro ao outro lado

    def test_escapa_os_caracteres_reservados(self):
        t = cal("EQUIPA", "SUB-13", [dict(JOGO, recinto="PAV. A; B, C\\D")])
        assert r"LOCATION:PAV. A\; B\, C\\D" in desdobrar(t)


class TestEventos:
    def test_hora_local_convertida_para_utc(self):
        # 2 de Outubro: Portugal em WEST (UTC+1) → 19:30 local são 18:30Z
        p = propriedades(cal("E", "SUB-13", [JOGO]))
        assert p["DTSTART"] == "20261002T183000Z"
        assert p["DTEND"] == "20261002T200000Z"       # +90 min

    def test_horario_de_inverno(self):
        # 1 de Dezembro: Portugal em WET (UTC+0) → 19:30 local são 19:30Z
        p = propriedades(cal("E", "SUB-13", [dict(JOGO, data="2026-12-01")]))
        assert p["DTSTART"] == "20261201T193000Z"

    def test_jogo_sem_hora_marcada_fica_de_dia_inteiro(self):
        p = propriedades(cal("E", "SUB-13", [dict(JOGO, hora=None)]))
        assert p["DTSTART;VALUE=DATE"] == "20261002"
        assert p["DTEND;VALUE=DATE"] == "20261003"    # fim exclusivo

    def test_titulo_com_escalao_e_marca_de_hoquei(self):
        """`🏑 Sub-13 🏑 CD Paço Arcos B vs Parede FC B`.

        O 🏑 torna a linha reconhecível antes de ser lida, entre reuniões e aniversários;
        o escalão distingue os calendários de dois filhos na mesma semana.
        """
        p = propriedades(cal("PAREDE FC B", "SUB-13", [JOGO]))
        assert p["SUMMARY"] == "🏑 Sub-13 🏑 CD Paço Arcos B vs Parede FC B"

    def test_nomes_em_caixa_de_titulo_sem_estragar_as_siglas(self):
        jogo = dict(JOGO, casa="FSE/AJ SALESIANA", fora="SPORTING CP B", cat="SENIORES MASCULINOS")
        assert propriedades(cal("E", "X", [jogo]))["SUMMARY"] == \
            "🏑 Seniores Masculinos 🏑 FSE/AJ Salesiana vs Sporting CP B"

    def test_o_resultado_fica_na_descricao_e_nao_no_titulo(self):
        # quem passa os olhos pelo mês não quer saber o resultado de um jogo que ainda não viu
        p = propriedades(cal("E", "SUB-13", [JOGO]))
        assert "2–9" not in p["SUMMARY"]
        assert p["DESCRIPTION"].startswith("CD Paço Arcos B 2–9 Parede FC B")

    def test_morada_do_recinto_quando_a_sabemos(self):
        """Sem morada, tocar na localização do evento não leva a lado nenhum.

        O teste não fixa a morada: a lista é preenchida à mão e vai crescendo, e um teste
        que trave a cada linha nova não guarda nada de útil. O que tem de valer sempre é
        que um recinto conhecido sai como morada e não como nome.
        """
        from hoquei.recintos import conhecidas

        recinto, morada = next(iter(conhecidas().items()))
        p = propriedades(cal("E", "SUB-13", [dict(JOGO, recinto=recinto)]))
        assert p["LOCATION"] == morada
        assert p["LOCATION"] != recinto
        # e o nome do recinto não se perde — fica na descrição
        assert recinto in p["DESCRIPTION"]

    def test_sem_morada_cai_no_nome_do_recinto(self):
        p = propriedades(cal("E", "SUB-13", [dict(JOGO, recinto="PAV. INVENTADO")]))
        assert p["LOCATION"] == "PAV. INVENTADO"

    def test_ordenado_por_data_e_hora(self):
        jogos = [dict(JOGO, id=3, data="2026-11-01", hora="18:00"),
                 dict(JOGO, id=1, data="2026-10-02", hora="09:00"),
                 dict(JOGO, id=2, data="2026-10-02", hora="19:30")]
        uids = [l for l in desdobrar(cal("E", "SUB-13", jogos)) if l.startswith("UID:")]
        assert uids == ["UID:jogo-1@hoquei.pages.dev", "UID:jogo-2@hoquei.pages.dev",
                        "UID:jogo-3@hoquei.pages.dev"]


class TestEstabilidade:
    """Sem isto o feed não serve para nada: ou duplica eventos, ou republica para sempre."""

    def test_uid_vem_do_id_da_fonte(self):
        assert "UID:jogo-9547@hoquei.pages.dev" in desdobrar(cal("E", "SUB-13", [JOGO]))

    def test_uid_sobrevive_a_mudanca_de_hora_e_de_resultado(self):
        # é esta propriedade que faz o calendário **corrigir** o evento em vez de criar outro
        a = propriedades(cal("E", "SUB-13", [JOGO]))["UID"]
        b = propriedades(cal("E", "SUB-13", [dict(JOGO, hora="21:00", gc=4, gf=4)]))["UID"]
        assert a == b

    def test_jogo_sem_id_na_fonte_tem_uid_estavel(self):
        sem = dict(JOGO, id=None)
        assert propriedades(cal("E", "SUB-13", [sem]))["UID"] == \
               propriedades(cal("E", "SUB-13", [dict(sem)]))["UID"]
        assert "@hoquei.pages.dev" in propriedades(cal("E", "SUB-13", [sem]))["UID"]

    def test_gerar_duas_vezes_da_exactamente_o_mesmo(self):
        """O DTSTAMP não pode ser `now()`.

        Com a hora de geração lá dentro, cada corrida do cron produzia um ficheiro
        diferente, o `git` via alterações e a app republicava de 6 em 6 horas para sempre
        sem um único dado novo — foi o que já aconteceu com o `meta.json`.
        """
        assert cal("E", "SUB-13", [JOGO]) == cal("E", "SUB-13", [JOGO])

    def test_dtstamp_nao_tem_a_hora_de_agora(self):
        agora = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H")
        assert agora not in propriedades(cal("E", "SUB-13", [JOGO]))["DTSTAMP"]


class TestNomeDoFicheiro:
    def test_casa_com_a_rota_da_equipa(self):
        # /equipa/sub-13/parede-fc-b  ↔  team/sub-13--parede-fc-b.ics
        assert nome_ficheiro("PAREDE FC B", "SUB-13") == "sub-13--parede-fc-b.ics"

    def test_tira_acentos_e_barras(self):
        assert slug("FSE/AJ SALESIANA") == "fse-aj-salesiana"
        assert slug("CD PAÇO ARCOS") == "cd-paco-arcos"


class TestConformidade:
    """Validação por um parser independente.

    Os testes acima verificam o que eu *acho* que o RFC 5545 pede. Este põe a biblioteca
    `icalendar` a ler o que produzimos: se ela recusar, um calendário a sério também recusa.
    """

    def test_a_biblioteca_icalendar_le_o_que_produzimos(self):
        from icalendar import Calendar

        jogos = [JOGO,
                 dict(JOGO, id=2, data="2026-12-01", hora=None, gc=None, gf=None),
                 dict(JOGO, id=3, data="2026-11-15", recinto="PAV. A; B, C")]
        c = Calendar.from_ical(cal("CD PAÇO ARCOS B", "SUB-13", jogos))

        assert c.get("VERSION") == "2.0"
        assert str(c.get("X-WR-CALNAME")) == "🏑 CD Paço Arcos B · Sub-13"
        eventos = list(c.walk("VEVENT"))
        assert len(eventos) == 3

        # os caracteres reservados voltam **desescapados** e os acentos inteiros
        por_uid = {str(e["UID"]): e for e in eventos}
        assert str(por_uid["jogo-3@hoquei.pages.dev"]["LOCATION"]) == "PAV. A; B, C"
        assert "🏑" in str(por_uid["jogo-3@hoquei.pages.dev"]["SUMMARY"])
        # acentos e o traço longo sobrevivem à ida e volta pelo ficheiro
        assert str(por_uid["jogo-9547@hoquei.pages.dev"]["SUMMARY"]) == \
            "🏑 Sub-13 🏑 CD Paço Arcos B vs Parede FC B"
        assert "CD Paço Arcos B 2–9 Parede FC B" in str(
            por_uid["jogo-9547@hoquei.pages.dev"]["DESCRIPTION"])

    def test_as_horas_sobrevivem_a_ida_e_volta(self):
        import datetime as dt

        from icalendar import Calendar

        e = next(iter(Calendar.from_ical(cal("E", "SUB-13", [JOGO])).walk("VEVENT")))
        inicio = e["DTSTART"].dt
        assert inicio == dt.datetime(2026, 10, 2, 18, 30, tzinfo=dt.timezone.utc)
        # e em hora de Lisboa volta a ser a hora que está no cartaz do jogo
        assert inicio.astimezone(LISBOA).strftime("%H:%M") == "19:30"

    def test_jogo_sem_hora_volta_como_data_e_nao_como_instante(self):
        import datetime as dt

        from icalendar import Calendar

        e = next(iter(Calendar.from_ical(
            cal("E", "SUB-13", [dict(JOGO, hora=None)])).walk("VEVENT")))
        assert isinstance(e["DTSTART"].dt, dt.date)
        assert not isinstance(e["DTSTART"].dt, dt.datetime)


class TestSoDeHojeEmDiante:
    """Um calendário pessoal serve para saber onde é preciso estar, não para guardar
    histórico. Os resultados antigos vivem na app; no calendário só enchiam o passado."""

    def test_corta_os_jogos_ja_passados(self):
        antigo = dict(JOGO, id=1, data="2026-08-30")
        futuro = dict(JOGO, id=2, data="2026-09-20")
        uids = [l for l in desdobrar(cal("E", "SUB-13", [antigo, futuro])) if l.startswith("UID:")]
        assert uids == ["UID:jogo-2@hoquei.pages.dev"]

    def test_o_dia_de_hoje_entra_inteiro(self):
        # o jogo da tarde ainda conta de manhã
        hoje = dict(JOGO, id=3, data=HOJE, hora="19:30")
        assert "UID:jogo-3@hoquei.pages.dev" in desdobrar(cal("E", "SUB-13", [hoje]))

    def test_uma_equipa_sem_jogos_futuros_da_um_calendario_vazio_e_valido(self):
        from icalendar import Calendar

        c = Calendar.from_ical(cal("E", "SUB-13", [dict(JOGO, data="2026-01-01")]))
        assert list(c.walk("VEVENT")) == []
        assert c.get("VERSION") == "2.0"


class TestDominioDoUid:
    """
    O domínio dos UID é uma chave, não um endereço.

    Este teste existe por causa do B9.27, o domínio próprio: a tentação ao trocar de domínio é
    actualizar tudo onde o antigo apareça, e aqui isso custava **cada jogo duplicado** no
    calendário de quem subscreveu o feed — o evento antigo fica órfão e o novo entra como se
    fosse outro jogo. Se um dia houver razão para mudar, que seja com este teste à frente.
    """

    def test_o_uid_nao_segue_o_dominio_do_site(self):
        from hoquei import ics

        assert ics.DOMINIO_UID == "hoquei.pages.dev"
        anterior = ics.DOMINIO
        try:
            ics.DOMINIO = "exemplo.pt"
            saida = desdobrar(cal("E", "SUB-13", [JOGO]))
            assert "UID:jogo-9547@hoquei.pages.dev" in saida
            # o link dentro do evento, esse acompanha o site
            assert "https://exemplo.pt/jogo/9547" in "\n".join(saida)
        finally:
            ics.DOMINIO = anterior
