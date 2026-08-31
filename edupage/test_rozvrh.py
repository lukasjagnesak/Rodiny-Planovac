"""
Stahování rozvrhu jedním dotazem na celý rozsah.

Knihovna umí jen jeden den a stojí dva požadavky, takže dvě děti na dva
týdny znamenaly čtyřicet cest na server a spadlý časový limit. Tady se
ptáme na celý rozsah naráz — a rozbalování odpovědi je křehké místo:
EduPage vrací JSON zabalený v textu, který se musí přesně useknout.

Spuštění:  python edupage/test_rozvrh.py
"""

import json
import sys
from datetime import date

from main import STROP_SEKUND, plany_rozsahem

selhalo = 0


def ok(popis, podminka):
    global selhalo
    print(("  ✓ " if podminka else "  ✗ ") + popis)
    if not podminka:
        selhalo += 1


UZIVATEL = "Rodic123"

DATA = {
    "dates": {
        "2026-09-01": {"plan": [{"uniperiod": "1", "subjectid": "7"}]},
        "2026-09-02": {"plan": [{"uniperiod": "2", "subjectid": "9"}]},
    }
}

# Tělo odpovědi vypadá jako v EduPage: JSON obalený textem, před ním
# uživatel a za ním čárka s hranatou závorkou.
TELO = f'nejaky_prefix("{UZIVATEL}",{json.dumps(DATA)},["neco","dalsiho"])'


class FalesnaOdpoved:
    def __init__(self, text):
        self.text = text


class FalesnaSession:
    """Zaznamená, kolikrát se kam šlo — na tom je celá oprava postavená."""

    def __init__(self, telo=TELO, csrf='… gpid=41&… gsh="abc" …'):
        self.telo = telo
        self.csrf = csrf
        self.gety = 0
        self.posty = 0
        self.posledni_data = None

    def get(self, url, timeout=None):
        self.gety += 1
        return FalesnaOdpoved(self.csrf)

    def post(self, url, data=None, headers=None, timeout=None):
        self.posty += 1
        self.posledni_data = data
        return FalesnaOdpoved(self.telo)


class FalesnyEdupage:
    def __init__(self, session=None):
        self.session = session or FalesnaSession()
        self.subdomain = "skola"

    def get_user_id(self):
        return UZIVATEL


print("── celý rozsah jedním dotazem ──")
edupage = FalesnyEdupage()
vysledek = plany_rozsahem(edupage, date(2026, 9, 1), date(2026, 9, 11))

ok("vrátí dny z odpovědi", vysledek is not None and len(vysledek) == 2)
ok("dny jsou pod svými daty", "2026-09-01" in (vysledek or {}))
ok("jeden dotaz na CSRF, jeden na data", edupage.session.gety == 1 and edupage.session.posty == 1)

data = edupage.session.posledni_data or ""
ok("posílá začátek rozsahu", "2026-09-01" in data)
ok("a taky jeho konec — ne dvakrát tentýž den", "2026-09-11" in data)
ok("gpid se posouvá o jedna", "gpid=42" in data)

print("── když se to nepovede ──")
ok(
    "rozbité tělo nespadne, jen řekne ne",
    plany_rozsahem(FalesnyEdupage(FalesnaSession(telo="úplně jiná stránka")), date(2026, 9, 1), date(2026, 9, 2))
    is None,
)
ok(
    "chybějící gsh v CSRF taky ne",
    plany_rozsahem(FalesnyEdupage(FalesnaSession(csrf="přihlaste se prosím")), date(2026, 9, 1), date(2026, 9, 2))
    is None,
)


class PadajiciSession(FalesnaSession):
    def get(self, url, timeout=None):
        raise ConnectionError("síť spadla")


ok(
    "výpadek sítě vrátí None místo výjimky",
    plany_rozsahem(FalesnyEdupage(PadajiciSession()), date(2026, 9, 1), date(2026, 9, 2)) is None,
)

print("── strop ──")
ok("je kratší než minuta, po které umírá volání z aplikace", STROP_SEKUND < 60)

print("\nVšechno prošlo." if selhalo == 0 else f"\nSelhalo: {selhalo}")
sys.exit(0 if selhalo == 0 else 1)
