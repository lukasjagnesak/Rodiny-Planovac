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

import logging
import os
from datetime import date, datetime, timedelta
from typing import Any, Iterator, Optional

from edupage_api import Edupage
from edupage_api.exceptions import BadCredentialsException
from edupage_api.timeline import EventType
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
    try:
        cislo = int(str(hodnota).strip())
    except (TypeError, ValueError):
        return None
    return cislo if cislo > 0 else None


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
                    "diteId": dite_id,
                    "druh": druh,
                    "typ": u.event_type.name,
                    "text": (u.text or "").strip(),
                    "predmet": predmet(u),
                    "termin": termin(u),
                    "zadano": cas(u.timestamp),
                    "hotovo": bool(u.is_done),
                    "autor": str(u.author),
                    # Návrh typu události pro kalendář — jen u školních akcí.
                    "navrhKalendare": SKOLNI_AKCE.get(u.event_type),
                }
            )

    polozky.sort(key=lambda p: (p["termin"] or "9999", p["zadano"] or ""))
    return {"ok": True, "pocet": len(polozky), "polozky": polozky, "chyby": chyby[:8]}


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
    dnu = 0

    for dite_id, potize in po_detech(edupage, data.deti):
        chyby.extend(potize)

        for posun in range(data.dnu_dopredu):
            den = date.today() + timedelta(days=posun)
            # Víkend nemá rozvrh, ať se zbytečně netahá.
            if den.weekday() >= 5:
                continue

            try:
                tabulka = edupage.get_my_timetable(den)
            except Exception as chyba:  # noqa: BLE001 — jeden den navíc nesmí shodit celé stažení
                chyby.append(f"{den.isoformat()}: {chyba}")
                continue

            if tabulka is None:
                continue

            dnu += 1
            for lekce in tabulka.lessons:
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

    return {"ok": True, "dnu": dnu, "pocet": len(hodiny), "hodiny": hodiny, "chyby": chyby[:8]}
