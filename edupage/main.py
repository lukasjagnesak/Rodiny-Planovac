"""
Vedlejší služba pro EduPage.

EduPage nemá veřejné API. Knihovna `edupage-api` napodobuje mobilní
aplikaci a existuje jen pro Python — proto je tahle část oddělená od
zbytku aplikace a mluví se s ní přes HTTP uvnitř Dockeru.

Služba si nic neukládá. Přihlašovací údaje dostane v každém požadavku,
použije je a zapomene; uložené (zašifrované) jsou v databázi plánovače.

Chráněná je sdíleným tajemstvím v hlavičce `X-Sidecar-Secret`, aby na ni
nemohl sáhnout nikdo jiný než plánovač.

Rodičovský účet vidí data dítěte až po přepnutí na něj. Když má rodič dětí
víc, přihlásí se jednou a přepíná se mezi nimi — proto každý koncový bod
bere seznam dětí a vrací výsledky označené tím, komu patří.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time as _cas
from datetime import date, datetime, timedelta
from typing import Any, Iterator, Optional

from edupage_api import Edupage
from edupage_api.exceptions import BadCredentialsException
from edupage_api.timeline import EventType
from edupage_api.login import Login
from edupage_api.timetables import Timetables
from edupage_api.utils import RequestUtil
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("edupage")

app = FastAPI(title="EduPage most", docs_url=None, redoc_url=None)

SECRET = os.environ.get("EDUPAGE_SIDECAR_SECRET", "")

# Typy událostí, které nás zajímají. Timeline EduPage nese i spoustu
# provozních záznamů (H_* jsou interní), ty nechceme.
UKOLY = {
    EventType.HOMEWORK,
    EventType.HOMEWORK_TEST,
}

ZKOUSENI = {
    EventType.BIG_EXAM,
    EventType.EXAM_ASSIGNMENT,
    EventType.ORAL_EXAM,
    EventType.PROJECT_EXAM,
    EventType.PAPER,
    EventType.SHORT_EXAM,
}

# Zprávy od učitelů a školní novinky.
ZPRAVY = {
    EventType.MESSAGE,
    EventType.NEWS,
}

# Typy, které dávají smysl nabídnout k zapsání do kalendáře.
SKOLNI_AKCE = {
    EventType.PARENTS_EVENING: "parent_meeting",
    EventType.EXCURSION: "excursion",
    EventType.SCHOOL_TRIP: "school_trip",
    EventType.SCHOOL_EVENT: "other",
    EventType.CLASS_TEACHER_EVENT: "other",
    EventType.EVENT: "other",
    EventType.CULTURE: "other",
    EventType.CONTEST: "other",
    EventType.FREE_DAY: "holiday",
    EventType.HOLIDAY: "holiday",
    EventType.SHORT_HOLIDAY: "holiday",
}


def zkontroluj_tajemstvi(hlavicka: Optional[str]) -> None:
    if not SECRET:
        raise HTTPException(500, "Služba nemá nastavené EDUPAGE_SIDECAR_SECRET.")
    if hlavicka != SECRET:
        raise HTTPException(401, "Neplatné tajemství.")


class Prihlaseni(BaseModel):
    email: str
    heslo: str
    """Nepovinná subdoména školy. Bez ní se použije automatické hledání."""
    subdomena: Optional[str] = None
    """
    ID dětí v EduPage. Prázdný seznam znamená „ber účet tak, jak je“ —
    u žákovského účtu je to to jediné správné.
    """
    deti: list[int] = Field(default_factory=list)


class DotazUkoly(Prihlaseni):
    """Kolik dní zpět z timeline načíst."""
    dnu_zpet: int = Field(default=30, ge=1, le=180)


class DotazRozvrh(Prihlaseni):
    """Kolik dní dopředu se má rozvrh číst. Dva týdny stačí i na školy se sudým a lichým týdnem."""
    dnu_dopredu: int = Field(default=14, ge=1, le=28)


def prihlas(data: Prihlaseni) -> Edupage:
    edupage = Edupage()
    try:
        if data.subdomena:
            vysledek = edupage.login(data.email, data.heslo, data.subdomena)
        else:
            vysledek = edupage.login_auto(data.email, data.heslo)
    except BadCredentialsException:
        raise HTTPException(401, "EduPage odmítlo e-mail nebo heslo.")
    except Exception as chyba:  # noqa: BLE001 — chceme srozumitelnou hlášku ven
        log.warning("přihlášení selhalo: %s", chyba)
        raise HTTPException(502, f"Přihlášení k EduPage selhalo: {chyba}")

    # login vrací objekt jen tehdy, když škola vyžaduje druhý faktor.
    if vysledek is not None:
        raise HTTPException(
            409,
            "Účet je chráněný dvoufázovým ověřením. Tudy se k datům dostat nedá.",
        )

    return edupage


def je_rodic(edupage: Edupage) -> bool:
    try:
        return "Rodic" in edupage.get_user_id()
    except Exception:  # noqa: BLE001
        return False


def obnov_kontext(edupage: Edupage) -> None:
    """
    Po přepnutí na dítě znovu načte data přihlášení.

    `switch_to_child()` z knihovny jen překlopí cookie na serveru. V paměti
    ale zůstane, co se načetlo při přihlášení — tedy identita rodiče.
    Rozvrh se pak stahuje s cizím `user` v požadavku a odpověď se hledá
    podle cizího identifikátoru; z toho vznikne „list index out of range",
    protože hledaný text tam prostě není.

    Selhání není fatální: horší, než mít starý kontext, je nemít žádný.
    """
    try:
        sid = edupage.session.cookies.get("PHPSESSID")
        if not sid:
            return
        Login(edupage).reload_data(edupage.subdomain, sid, edupage.username)
    except Exception as chyba:  # noqa: BLE001
        log.warning("obnovení kontextu po přepnutí selhalo: %s", chyba)


def po_detech(edupage: Edupage, deti: list[int]) -> Iterator[tuple[Optional[int], list[str]]]:
    """
    Projde postupně všechny děti a mezi nimi přepne účet.

    Vrací dvojici (ID dítěte, chyby). Když seznam dětí prázdný je, projde
    se účet tak, jak je — to je případ žákovského účtu. Chyba u jednoho
    dítěte neshodí ostatní; vrátí se v seznamu a plánovač ji ukáže.
    """
    if not deti:
        yield None, []
        return

    rodic = je_rodic(edupage)

    for index, dite in enumerate(deti):
        chyby: list[str] = []
        try:
            # Mezi dětmi se musí projít přes rodiče, přímé přepnutí
            # z dítěte na dítě EduPage nenabízí.
            if rodic and index > 0:
                edupage.switch_to_parent()
            edupage.switch_to_child(dite)
            obnov_kontext(edupage)
        except Exception as chyba:  # noqa: BLE001
            log.warning("přepnutí na dítě %s selhalo: %s", dite, chyba)
            chyby.append(f"dítě {dite}: přepnutí selhalo ({chyba})")
            continue

        yield dite, chyby


def cas(hodnota: Any) -> Optional[str]:
    if isinstance(hodnota, (datetime, date)):
        return hodnota.isoformat()
    return None


def termin(udalost) -> Optional[str]:
    """
    Datum odevzdání. EduPage ho vozí v `additional_data` pod různými klíči
    podle typu úkolu, tak zkoušíme ty známé a jinak vrátíme None.
    """
    data = udalost.additional_data or {}
    for klic in ("dateTo", "date_to", "termin", "dueDate", "due_date", "datum"):
        hodnota = data.get(klic)
        if isinstance(hodnota, str) and hodnota[:4].isdigit():
            return hodnota[:10]
    return None


def predmet(udalost) -> Optional[str]:
    data = udalost.additional_data or {}
    for klic in ("subjectName", "predmet", "subject"):
        hodnota = data.get(klic)
        if isinstance(hodnota, str) and hodnota.strip():
            return hodnota.strip()
    return None


# Adresy, které EduPage vozí u novinek a zpráv. Klíč se liší podle typu
# události, tak se zkoušejí známé a pak se prohledá zbytek.
KLICE_ODKAZU = ("url", "link", "href", "odkaz", "externalUrl", "webUrl")
ADRESA = re.compile(r"https?://[^\s\"'<>\\]+")


def _adresa_v_textu(hodnota: Any) -> Optional[str]:
    if not isinstance(hodnota, str):
        return None
    nalez = ADRESA.search(hodnota)
    return nalez.group(0).rstrip(".,;:!?)") if nalez else None


def najdi_odkaz(udalost) -> Optional[str]:
    """
    Adresa, na kterou událost odkazuje.

    U novinek je v textu jen titulek — odkaz leží v doprovodných datech.
    Nejdřív se zkusí známé klíče, pak se prohledají všechny textové
    hodnoty. Hledat podle tvaru je tady spolehlivější než podle názvu:
    klíč se mezi typy událostí liší, adresa vypadá vždycky stejně.
    """
    data = udalost.additional_data or {}

    if isinstance(data, dict):
        for klic in KLICE_ODKAZU:
            adresa = _adresa_v_textu(data.get(klic))
            if adresa:
                return adresa

    zasobnik = [data]
    while zasobnik:
        polozka = zasobnik.pop()
        if isinstance(polozka, dict):
            zasobnik.extend(polozka.values())
        elif isinstance(polozka, list):
            zasobnik.extend(polozka[:50])
        else:
            adresa = _adresa_v_textu(polozka)
            if adresa:
                return adresa

    return _adresa_v_textu(udalost.text)


def jmeno(hodnota) -> Optional[str]:
    """Z objektu knihovny (předmět, učebna, učitel) vytáhne čitelné jméno."""
    if hodnota is None:
        return None
    for atribut in ("name", "short"):
        nazev = getattr(hodnota, atribut, None)
        if isinstance(nazev, str) and nazev.strip():
            return nazev.strip()
    text = str(hodnota).strip()
    return text or None


@app.get("/health")
def health() -> dict:
    """
    Kromě „žiju" hlásí i to, co spuštěný kód umí.

    Uvicorn si po úpravě souboru sám nic nenačte a při ladění se pak
    těžko pozná, jestli běží nová verze, nebo pořád ta stará.
    """
    return {
        "ok": True,
        "umi": [
            "parentStudentids",
            "ciselne-klice",
            "potize-misto-500",
            "hodnoty-id",
            "zaporna-id",
            "udalost-id",
            "odkazy",
            "jmena-z-dbi",
            "zpravy",
            "rozvrh",
            "zmeny-rozvrhu",
        ],
    }


@app.post("/overit")
def overit(data: Prihlaseni, x_sidecar_secret: str = Header(default="")) -> dict:
    """Ověří přihlašovací údaje a řekne, co je to za účet."""
    zkontroluj_tajemstvi(x_sidecar_secret)
    edupage = prihlas(data)

    uzivatel = edupage.get_user_id()
    return {
        "ok": True,
        "uzivatel": uzivatel,
        "jeRodic": "Rodic" in uzivatel,
        "skolniRok": edupage.get_school_year(),
        "subdomena": edupage.subdomain,
    }


# ─────────────────────────────────────────────────────────────────────
#  Hledání dětí rodičovského účtu
# ─────────────────────────────────────────────────────────────────────

# Klíče, pod kterými EduPage vozí jméno a ID. Je jich víc verzí, tak se
# zkouší po řadě.
KLICE_ID = ("studentid", "childid", "userid", "id", "student_id", "child_id")
KLICE_JMENA = ("name", "meno", "fullname", "celemeno", "vypis", "p_meno")


def _cislo(hodnota: Any) -> Optional[int]:
    """
    Přečte ID. Záporná čísla jsou platná — EduPage jimi běžně označuje
    děti rodičovského účtu. Odmítá se jen nula, ta bývá „nevyplněno".
    """
    try:
        cislo = int(str(hodnota).strip())
    except (TypeError, ValueError):
        return None
    return cislo if cislo != 0 else None


def _jako_dite(zaznam: dict) -> Optional[dict]:
    """Z jednoho záznamu udělá dítě, pokud vypadá jako člověk s ID."""
    dite_id = None
    for klic in KLICE_ID:
        dite_id = _cislo(zaznam.get(klic))
        if dite_id is not None:
            break
    if dite_id is None:
        return None

    nazev = None
    for klic in KLICE_JMENA:
        hodnota = zaznam.get(klic)
        if isinstance(hodnota, str) and hodnota.strip():
            nazev = hodnota.strip()
            break

    # Rozdělené jméno se skládá zvlášť — samotné křestní by ke dvěma
    # sourozencům nestačilo.
    if nazev is None:
        casti = [
            zaznam.get("firstname") or zaznam.get("p_meno"),
            zaznam.get("lastname") or zaznam.get("p_priezvisko"),
        ]
        slozene = " ".join(c.strip() for c in casti if isinstance(c, str) and c.strip())
        nazev = slozene or None

    return {"edupageId": dite_id, "jmeno": nazev}


# Pole, ve kterých EduPage vozí přímo ID dětí rodiče — bez obalu, jen
# holá čísla. Tohle je ta spolehlivá cesta; hledání podle tvaru níž je
# záložní pro školy, které to mají jinak.
KLICE_SEZNAMU_ID = ("parentstudentids", "studentids", "childids", "childrenids")


def deti_ze_seznamu(data: Any) -> list[int]:
    """Najde pole s holými ID dětí, ať je kdekoli v přihlašovacích datech."""
    nalezena: list[int] = []

    if isinstance(data, dict):
        for klic, hodnota in data.items():
            # Klíč nemusí být řetězec — `userProps` má například číselné.
            nizky = klic.lower() if isinstance(klic, str) else ""
            if nizky in KLICE_SEZNAMU_ID and isinstance(hodnota, list):
                for polozka in hodnota:
                    cislo = _cislo(polozka)
                    if cislo is not None and cislo not in nalezena:
                        nalezena.append(cislo)
            else:
                for cislo in deti_ze_seznamu(hodnota):
                    if cislo not in nalezena:
                        nalezena.append(cislo)

    elif isinstance(data, list):
        for polozka in data[:50]:
            for cislo in deti_ze_seznamu(polozka):
                if cislo not in nalezena:
                    nalezena.append(cislo)

    return nalezena


def jmena_studentu(data: Any) -> dict[int, str]:
    """
    Jména podle ID ze seznamu studentů, který EduPage posílá s přihlášením.

    Bez něj bychom měli jen čísla a rodič by netušil, které je které dítě.
    """
    if not isinstance(data, dict):
        return {}

    dbi = data.get("dbi")
    studenti = dbi.get("students") if isinstance(dbi, dict) else None
    if not isinstance(studenti, dict):
        return {}

    jmena: dict[int, str] = {}
    for klic, zaznam in studenti.items():
        cislo = _cislo(klic)
        if cislo is None or not isinstance(zaznam, dict):
            continue

        dite = _jako_dite({**zaznam, "id": zaznam.get("id", klic)})
        if dite and dite.get("jmeno"):
            jmena[cislo] = dite["jmeno"]

    return jmena


def najdi_deti(data: Any, cesta: str = "", nalezene: Optional[list] = None) -> list[dict]:
    """
    Prohledá přihlašovací data a najde v nich děti rodiče.

    EduPage nemá koncový bod, který by děti vypsal, a knihovna to neumí
    taky. Struktura se navíc mezi školami liší, proto se hledá podle tvaru
    dat: seznam pod klíčem, který zmiňuje dítě, jehož položky mají ID.
    """
    if nalezene is None:
        nalezene = []
    if len(nalezene) >= 20:
        return nalezene

    if isinstance(data, dict):
        for klic, hodnota in data.items():
            nizky = klic.lower() if isinstance(klic, str) else ""
            vypada_na_deti = any(
                slovo in nizky for slovo in ("child", "dieta", "deti", "ziak", "student")
            )

            if vypada_na_deti and isinstance(hodnota, list):
                for polozka in hodnota:
                    if isinstance(polozka, dict):
                        dite = _jako_dite(polozka)
                        if dite:
                            dite["kde"] = f"{cesta}{klic}"
                            nalezene.append(dite)
            elif vypada_na_deti and isinstance(hodnota, dict):
                # Někdy je to slovník ID → údaje.
                for pod_klic, polozka in hodnota.items():
                    if isinstance(polozka, dict):
                        dite = _jako_dite({**polozka, "id": polozka.get("id", pod_klic)})
                        if dite:
                            dite["kde"] = f"{cesta}{klic}"
                            nalezene.append(dite)

            najdi_deti(hodnota, f"{cesta}{klic}.", nalezene)

    elif isinstance(data, list):
        for polozka in data[:50]:
            najdi_deti(polozka, cesta, nalezene)

    return nalezene


def popis_struktury(data: Any, max_klicu: int = 40) -> list[str]:
    """
    Popíše tvar přihlašovacích dat — jen názvy polí a typy, žádné hodnoty.

    Když hledání dětí selže, tohle je jediná cesta, jak zjistit, kde je
    zrovna tahle škola má, aniž by se odsud tahaly osobní údaje.
    """
    if not isinstance(data, dict):
        return []

    radky: list[str] = []
    for surovy_klic, hodnota in list(data.items())[:max_klicu]:
        klic = str(surovy_klic)

        # U polí, ze kterých se čtou ID dětí, ukážeme i hodnoty. Jsou to
        # čísla, která rodič stejně opisuje ručně, a bez nich se nedá
        # poznat, proč je hledání nevzalo.
        if klic.lower() in KLICE_SEZNAMU_ID:
            radky.append(f"{klic} = {hodnota!r} (typy: {[type(x).__name__ for x in hodnota] if isinstance(hodnota, list) else type(hodnota).__name__})")
            continue

        if isinstance(hodnota, dict):
            podklice = list(hodnota.keys())[:12]
            radky.append(f"{klic}: dict({', '.join(map(str, podklice))})")
        elif isinstance(hodnota, list):
            prvni = hodnota[0] if hodnota else None
            if isinstance(prvni, dict):
                podklice = list(prvni.keys())[:12]
                radky.append(
                    f"{klic}: list[{len(hodnota)}] prvek({', '.join(map(str, podklice))})"
                )
            else:
                radky.append(f"{klic}: list[{len(hodnota)}] {type(prvni).__name__}")
        else:
            radky.append(f"{klic}: {type(hodnota).__name__}")

    return radky


@app.post("/deti")
def deti(data: Prihlaseni, x_sidecar_secret: str = Header(default="")) -> dict:
    """
    Děti, které rodičovský účet vidí.

    Když se nic nenajde, vrátí se aspoň názvy klíčů v přihlašovacích datech
    — podle nich se dá dohledat, kde je má zrovna tahle škola schované, a
    ID jde vždycky zadat ručně.
    """
    zkontroluj_tajemstvi(x_sidecar_secret)
    edupage = prihlas(data)

    surova = getattr(edupage, "data", None) or {}
    bez_duplicit: dict[int, dict] = {}
    potize: Optional[str] = None

    # Struktura dat se mezi školami liší natolik, že hledání může narazit
    # na něco nečekaného. Když spadne, chceme pořád vrátit aspoň popis
    # dat — jinak není podle čeho chybu opravit.
    try:
        jmena = jmena_studentu(surova)

        # Nejdřív pole s holými ID — tou cestou to EduPage opravdu vozí.
        for cislo in deti_ze_seznamu(surova):
            bez_duplicit[cislo] = {
                "edupageId": cislo,
                "jmeno": jmena.get(cislo),
                "kde": "parentStudentids",
            }

        # Když nic, zkusíme hledat podle tvaru dat. Stejné dítě může být
        # v datech víckrát; bereme první výskyt.
        if not bez_duplicit:
            for dite in najdi_deti(surova):
                if dite["edupageId"] not in bez_duplicit:
                    if not dite.get("jmeno"):
                        dite["jmeno"] = jmena.get(dite["edupageId"])
                    bez_duplicit[dite["edupageId"]] = dite
    except Exception as chyba:  # noqa: BLE001
        log.warning("hledání dětí selhalo: %s", chyba)
        potize = f"{type(chyba).__name__}: {chyba}"

    return {
        "ok": True,
        "jeRodic": je_rodic(edupage),
        "deti": list(bez_duplicit.values()),
        # Jen názvy polí a typy, žádné hodnoty — kdyby hledání selhalo,
        # aby bylo podle čeho ho doladit.
        "klice": popis_struktury(surova) if not bez_duplicit else [],
        "potize": potize,
    }


@app.post("/ukoly")
def ukoly(data: DotazUkoly, x_sidecar_secret: str = Header(default="")) -> dict:
    """
    Úkoly, písemky, zprávy a školní akce z timeline.

    EduPage nemá zvláštní koncový bod pro úkoly — všechno chodí jako proud
    událostí, které se rozliší podle typu.
    """
    zkontroluj_tajemstvi(x_sidecar_secret)
    edupage = prihlas(data)

    od = date.today() - timedelta(days=data.dnu_zpet)
    polozky = []
    chyby: list[str] = []

    for dite_id, potize in po_detech(edupage, data.deti):
        chyby.extend(potize)

        try:
            udalosti = edupage.get_notification_history(od)
        except Exception as chyba:  # noqa: BLE001
            chyby.append(f"timeline{f' dítěte {dite_id}' if dite_id else ''}: {chyba}")
            continue

        for u in udalosti:
            if u.is_removed:
                continue

            if u.event_type in UKOLY:
                druh = "ukol"
            elif u.event_type in ZKOUSENI:
                druh = "pisemka"
            elif u.event_type in ZPRAVY:
                druh = "zprava"
            elif u.event_type in SKOLNI_AKCE:
                druh = "akce"
            else:
                continue

            polozky.append(
                {
                    # ID události je jedinečné v rámci účtu, ne dítěte —
                    # do klíče proto patří obojí.
                    "id": f"{dite_id}:{u.event_id}" if dite_id else str(u.event_id),
                    # Holé ID události. Rodičovský účet vidí u každého dítěte
                    # tutéž timeline, takže se podle něj pozná, co patří celé
                    # rodině a co opravdu jednomu dítěti.
                    "udalostId": str(u.event_id),
                    "diteId": dite_id,
                    "druh": druh,
                    "typ": u.event_type.name,
                    "text": (u.text or "").strip(),
                    "predmet": predmet(u),
                    "termin": termin(u),
                    "zadano": cas(u.timestamp),
                    "hotovo": bool(u.is_done),
                    "autor": str(u.author),
                    "odkaz": najdi_odkaz(u),
                    # Návrh typu události pro kalendář — jen u školních akcí.
                    "navrhKalendare": SKOLNI_AKCE.get(u.event_type),
                }
            )

    polozky.sort(key=lambda p: (p["termin"] or "9999", p["zadano"] or ""))
    return {"ok": True, "pocet": len(polozky), "polozky": polozky, "chyby": chyby[:8]}


# ─────────────────────────────────────────────────────────────────────
#  Rozvrh: celý rozsah jedním dotazem
# ─────────────────────────────────────────────────────────────────────

# Kolik nejdéle smí trvat stahování rozvrhu, než vrátíme, co máme.
# Plánovač na odpověď čeká a raději dostane deset dní z dvanácti než
# chybu po minutě čekání.
STROP_SEKUND = 45

# Hláška pro případ, kdy škola vrátí stránku bez rozvrhu. Vysvětlení
# místo „list index out of range", které svádí hledat chybu v aplikaci.
POTIZ_ROZVRH = (
    "Škola nevrátila stránku s denním rozvrhem. Buď ho přes EduPage "
    "nesdílí, nebo účet nemá k rozvrhu přístup — úkoly a zprávy fungují "
    "nezávisle na tom."
)


def plany_rozsahem(edupage: Edupage, od: date, do: date) -> Optional[dict]:
    """
    Stáhne rozvrh na celý rozsah dní jediným dotazem.

    `get_my_timetable()` z knihovny umí jen jeden den a stojí dva
    požadavky — pro dvě děti a dva týdny to je čtyřicet cest na server
    a klidně minuta čekání, po které spadne časový limit a nezůstane nic.

    Přitom endpoint EduPage bere `date` i `dateto` a odpověď vrací pod
    klíčem `dates` rovnou po dnech; knihovna jen pošle dvakrát totéž
    datum a zbytek zahodí. Tady se ptáme na celý rozsah naráz.

    Vrací mapu `{"2026-09-01": [hodiny…]}`, nebo `None`, když se cokoli
    nepovede — volající pak spadne zpátky na den po dni.
    """
    try:
        session = edupage.session
        subdomena = edupage.subdomain
        uzivatel = edupage.get_user_id()

        csrf = session.get(
            f"https://{subdomena}.edupage.org/dashboard/eb.php?mode=ttday",
            timeout=20,
        )

        # Bez tokenu na stránce nemá smysl pokračovat — a hlavně by z toho
        # vzniklo „list index out of range", což nikomu nic neřekne.
        if "gpid=" not in csrf.text or "gsh=" not in csrf.text:
            log.warning(
                "stránka s rozvrhem nemá očekávaný tvar (%s znaků, začátek: %r)",
                len(csrf.text),
                csrf.text[:200],
            )
            raise ValueError(POTIZ_ROZVRH)

        gpid = csrf.text.split("gpid=")[1].split("&")[0]
        gsh = csrf.text.split("gsh=")[1].split('"')[0]

        odpoved = session.post(
            f"https://{subdomena}.edupage.org/gcall",
            data=RequestUtil.encode_form_data(
                {
                    "gpid": str(int(gpid) + 1),
                    "gsh": gsh,
                    "action": "loadData",
                    "user": uzivatel,
                    "changes": "{}",
                    "date": od.strftime("%Y-%m-%d"),
                    "dateto": do.strftime("%Y-%m-%d"),
                    "_LJSL": "4096",
                }
            ),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=40,
        )

        telo = odpoved.text.split(uzivatel + '",')[1].rsplit(",[", 1)[0]
        dny = json.loads(telo).get("dates")
        return dny if isinstance(dny, dict) else None
    except Exception as chyba:  # noqa: BLE001 — na chybu máme záložní cestu
        log.warning("hromadné stažení rozvrhu selhalo, jedu den po dni: %s", chyba)
        return None


def hodiny_dne(edupage: Edupage, plan: Any) -> list:
    """Poskládá hodiny z denního plánu knihovnou, ať se logika neduplikuje."""
    prevod = getattr(Timetables(edupage), "_Timetables__parse_timetable")
    tabulka = prevod(plan)
    return tabulka.lessons if tabulka else []


@app.post("/rozvrh")
def rozvrh(data: DotazRozvrh, x_sidecar_secret: str = Header(default="")) -> dict:
    """
    Rozvrh na následující dny.

    EduPage vydává rozvrh vždy po jednom dni — a je to rozvrh toho dne,
    tedy včetně odpadlých hodin. Skládání do týdenní tabulky i rozpoznání
    změn dělá až plánovač; tahle služba jen hlásí, co který den viděla.
    """
    zkontroluj_tajemstvi(x_sidecar_secret)
    edupage = prihlas(data)

    hodiny = []
    chyby: list[str] = []
    nedokonceno: list[str] = []
    dnu = 0
    zacatek_behu = _cas.monotonic()

    dny_rozsahu = [
        date.today() + timedelta(days=posun)
        for posun in range(data.dnu_dopredu)
        # Víkend nemá rozvrh, ať se zbytečně netahá.
        if (date.today() + timedelta(days=posun)).weekday() < 5
    ]

    for dite_id, potize in po_detech(edupage, data.deti):
        chyby.extend(potize)

        # Jeden dotaz na celý rozsah. Když neprojde, jede se den po dni
        # jako dřív — pomalu, ale jistě.
        plany = plany_rozsahem(edupage, dny_rozsahu[0], dny_rozsahu[-1]) if dny_rozsahu else None

        for den in dny_rozsahu:
            if _cas.monotonic() - zacatek_behu > STROP_SEKUND:
                nedokonceno.append(den.isoformat())
                continue

            lekce_dne: list = []

            if plany is not None:
                zaznam = plany.get(den.isoformat())
                plan = zaznam.get("plan") if isinstance(zaznam, dict) else None
                if plan:
                    try:
                        lekce_dne = hodiny_dne(edupage, plan)
                    except Exception as chyba:  # noqa: BLE001
                        chyby.append(f"{den.isoformat()}: {chyba}")
                        continue
            else:
                try:
                    tabulka = edupage.get_my_timetable(den)
                except Exception as chyba:  # noqa: BLE001 — jeden den navíc nesmí shodit celé stažení
                    # Když je rozbité rovnou první stažení, je rozbité pro
                    # všechny dny stejně. Deset totožných řádků z toho ale
                    # nedělá lepší hlášku, tak se říká jednou.
                    if "list index out of range" in str(chyba):
                        if POTIZ_ROZVRH not in chyby:
                            chyby.append(POTIZ_ROZVRH)
                        break
                    chyby.append(f"{den.isoformat()}: {chyba}")
                    continue
                if tabulka is None:
                    continue
                lekce_dne = tabulka.lessons

            if not lekce_dne:
                continue

            dnu += 1
            for lekce in lekce_dne:
                predmet_nazev = jmeno(lekce.subject)
                if not predmet_nazev:
                    continue

                hodiny.append(
                    {
                        "diteId": dite_id,
                        "den": den.isoweekday(),
                        "datum": den.isoformat(),
                        "tyden": den.isocalendar()[1],
                        "poradi": lekce.period if lekce.period is not None else 0,
                        "predmet": predmet_nazev,
                        "ucebna": jmeno((lekce.classrooms or [None])[0]),
                        "ucitel": jmeno((lekce.teachers or [None])[0]),
                        "zacatek": lekce.start_time.strftime("%H:%M"),
                        "konec": lekce.end_time.strftime("%H:%M"),
                        # Denní rozvrh nese i to, co se ten den nekoná.
                        "zruseno": bool(lekce.is_cancelled),
                        "akce": bool(lekce.is_event),
                    }
                )

    if nedokonceno:
        chyby.append(
            f"{len(nedokonceno)} dní se nestihlo stáhnout, doplní se při další "
            "synchronizaci"
        )

    return {
        "ok": True,
        "dnu": dnu,
        "pocet": len(hodiny),
        "hodiny": hodiny,
        "nedokonceno": nedokonceno,
        "chyby": chyby[:8],
    }
