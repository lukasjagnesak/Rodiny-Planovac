"""
Vedlejší služba pro EduPage.

EduPage nemá veřejné API. Knihovna `edupage-api` napodobuje mobilní
aplikaci a existuje jen pro Python — proto je tahle část oddělená od
zbytku aplikace a mluví se s ní přes HTTP uvnitř Dockeru.

Služba si nic neukládá. Přihlašovací údaje dostane v každém požadavku,
použije je a zapomene; uložené (zašifrované) jsou v databázi plánovače.

Chráněná je sdíleným tajemstvím v hlavičce `X-Sidecar-Secret`, aby na ni
nemohl sáhnout nikdo jiný než plánovač.
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta
from typing import Any, Optional

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
}

# Typy, které dávají smysl nabídnout k zapsání do kalendáře.
SKOLNI_AKCE = {
    EventType.PARENTS_EVENING: "parent_meeting",
    EventType.EXCURSION: "excursion",
    EventType.CULTURE: "other",
    EventType.CONTEST: "other",
    EventType.FREE_DAY: "holiday",
    EventType.HOLIDAY: "holiday",
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
    """ID dítěte u rodičovského účtu — bez něj se bere timeline rodiče."""
    dite_id: Optional[int] = None


class DotazUkoly(Prihlaseni):
    """Kolik dní zpět z timeline načíst."""
    dnu_zpet: int = Field(default=30, ge=1, le=180)


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

    if data.dite_id is not None:
        try:
            edupage.switch_to_child(data.dite_id)
        except Exception as chyba:  # noqa: BLE001
            raise HTTPException(400, f"Přepnutí na dítě se nepovedlo: {chyba}")

    return edupage


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


@app.get("/health")
def health() -> dict:
    return {"ok": True}


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


@app.post("/ukoly")
def ukoly(data: DotazUkoly, x_sidecar_secret: str = Header(default="")) -> dict:
    """
    Úkoly, písemky a školní akce z timeline.

    EduPage nemá zvláštní koncový bod pro úkoly — všechno chodí jako proud
    událostí, které se rozliší podle typu.
    """
    zkontroluj_tajemstvi(x_sidecar_secret)
    edupage = prihlas(data)

    od = date.today() - timedelta(days=data.dnu_zpet)
    try:
        udalosti = edupage.get_notification_history(od)
    except Exception as chyba:  # noqa: BLE001
        raise HTTPException(502, f"Načtení timeline selhalo: {chyba}")

    polozky = []
    for u in udalosti:
        if u.is_removed:
            continue

        if u.event_type in UKOLY:
            druh = "ukol"
        elif u.event_type in ZKOUSENI:
            druh = "pisemka"
        elif u.event_type in SKOLNI_AKCE:
            druh = "akce"
        else:
            continue

        polozky.append(
            {
                "id": str(u.event_id),
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

    polozky.sort(key=lambda p: (p["termin"] or "9999", p["zadano"] or ""), reverse=False)
    return {"ok": True, "pocet": len(polozky), "polozky": polozky}


class DotazRozvrh(Prihlaseni):
    """Kolik dní dopředu se má rozvrh číst. Dva týdny stačí i na školy se sudým a lichým týdnem."""
    dnu_dopredu: int = Field(default=14, ge=1, le=28)


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


@app.post("/rozvrh")
def rozvrh(data: DotazRozvrh, x_sidecar_secret: str = Header(default="")) -> dict:
    """
    Rozvrh na následující dny.

    EduPage vrací rozvrh vždy po jednom dni, takže se prochází den po dni.
    Skládání do týdenní tabulky (včetně rozpoznání sudého a lichého týdne)
    dělá až plánovač — tahle služba jen hlásí, co který den viděla.
    """
    zkontroluj_tajemstvi(x_sidecar_secret)
    edupage = prihlas(data)

    hodiny = []
    dnu = 0
    chyby = []

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
            # Zrušené hodiny a jednorázové akce do trvalého rozvrhu nepatří.
            if lekce.is_cancelled or lekce.is_event:
                continue
            predmet_nazev = jmeno(lekce.subject)
            if not predmet_nazev:
                continue

            hodiny.append(
                {
                    "den": den.isoweekday(),
                    "datum": den.isoformat(),
                    "tyden": den.isocalendar()[1],
                    "poradi": lekce.period if lekce.period is not None else 0,
                    "predmet": predmet_nazev,
                    "ucebna": jmeno((lekce.classrooms or [None])[0]),
                    "ucitel": jmeno((lekce.teachers or [None])[0]),
                    "zacatek": lekce.start_time.strftime("%H:%M"),
                    "konec": lekce.end_time.strftime("%H:%M"),
                }
            )

    return {"ok": True, "dnu": dnu, "pocet": len(hodiny), "hodiny": hodiny, "chyby": chyby[:5]}
