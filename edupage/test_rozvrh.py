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

print("── druhá cesta: currenttt ──")

import json as _json  # noqa: E402
from main import plany_pres_currenttt  # noqa: E402


class SessionCurrenttt:
    def __init__(self, telo):
        self.telo = telo
        self.posledni_json = None

    def post(self, url, json=None, timeout=None):  # noqa: A002
        self.posledni_json = json

        class Odpoved:
            def __init__(self, text):
                self.content = text.encode()

        return Odpoved(self.telo)


class EdupageCurrenttt:
    def __init__(self, telo):
        self.session = SessionCurrenttt(telo)
        self.subdomain = "skola"
        self.gsec_hash = "hash123"

    def get_school_year(self):
        return 2026


ODPOVED = _json.dumps(
    {
        "r": {
            "ttitems": [
                {"date": "2026-09-01", "uniperiod": "1", "subjectid": "7"},
                {"date": "2026-09-01", "uniperiod": "2", "subjectid": "8"},
                {"date": "2026-09-02", "uniperiod": "1", "subjectid": "9"},
            ]
        }
    }
)

edu2 = EdupageCurrenttt(ODPOVED)
vysledek2 = plany_pres_currenttt(edu2, 1890, date(2026, 9, 1), date(2026, 9, 11))

ok("rozdělí hodiny po dnech", vysledek2 is not None and len(vysledek2) == 2)
ok("dva dny sedí", "2026-09-01" in (vysledek2 or {}) and "2026-09-02" in (vysledek2 or {}))
ok("první den má obě hodiny", len(vysledek2["2026-09-01"]["plan"]) == 2)
ok("tvar je stejný jako u nástěnky", "plan" in vysledek2["2026-09-01"])

poslano = edu2.session.posledni_json or {}
ok("posílá celý rozsah", poslano["__args"][1]["datefrom"] == "2026-09-01" and poslano["__args"][1]["dateto"] == "2026-09-11")
ok("ptá se na žáka", poslano["__args"][1]["table"] == "students" and poslano["__args"][1]["id"] == "1890")
ok("posílá bezpečnostní hash", poslano["__gsh"] == "hash123")

ok(
    "bez ID dítěte se to ani nezkouší",
    plany_pres_currenttt(EdupageCurrenttt(ODPOVED), None, date(2026, 9, 1), date(2026, 9, 2)) is None,
)
ok(
    "chybová odpověď vrátí None",
    plany_pres_currenttt(
        EdupageCurrenttt(_json.dumps({"r": {"error": "insuficient rights"}})),
        1890, date(2026, 9, 1), date(2026, 9, 2),
    )
    is None,
)
ok(
    "prázdný rozvrh taky",
    plany_pres_currenttt(
        EdupageCurrenttt(_json.dumps({"r": {"ttitems": []}})),
        1890, date(2026, 9, 1), date(2026, 9, 2),
    )
    is None,
)
# Záporné ID dostane druhý pokus s kladným.
edu_zaporne = EdupageCurrenttt(ODPOVED)
ok(
    "záporné ID dítěte projde",
    plany_pres_currenttt(edu_zaporne, -1890, date(2026, 9, 1), date(2026, 9, 2)) is not None,
)

ok(
    "rozbitý JSON nespadne",
    plany_pres_currenttt(EdupageCurrenttt("<html>chyba</html>"), 1890, date(2026, 9, 1), date(2026, 9, 2))
    is None,
)


print("── obnovení kontextu po přepnutí ──")


class SessionSCookie(FalesnaSession):
    def __init__(self):
        super().__init__()
        self.cookies = {"PHPSESSID": "abc123"}
        self.cookies_get = self.cookies.get


class EdupageSPrepnutim(FalesnyEdupage):
    def __init__(self, sid=True):
        super().__init__()
        self.session = SessionSCookie()
        if not sid:
            self.session.cookies = {}
        self.username = "rodic@example.cz"
        self.obnoveno = False

    class _Cookies(dict):
        pass


import main as modul  # noqa: E402

vysledky = {"volano": False}


def falesny_reload(self, subdomena, sid, username):  # noqa: ANN001
    vysledky["volano"] = True
    vysledky["sid"] = sid
    vysledky["username"] = username


puvodni_login = modul.Login
try:
    class FalesnyLogin:
        def __init__(self, edupage):
            self.edupage = edupage

        reload_data = falesny_reload

    modul.Login = FalesnyLogin

    edu = EdupageSPrepnutim()
    edu.session.cookies = {"PHPSESSID": "abc123"}
    modul.obnov_kontext(edu)
    ok("po přepnutí se znovu načte kontext", vysledky["volano"])
    ok("posílá se aktuální session", vysledky.get("sid") == "abc123")
    ok("uživatelské jméno zůstává", vysledky.get("username") == "rodic@example.cz")

    # Bez cookie není co obnovovat a nesmí to spadnout.
    vysledky["volano"] = False
    bez = EdupageSPrepnutim()
    bez.session.cookies = {}
    modul.obnov_kontext(bez)
    ok("bez session se nic nevolá a nic nespadne", not vysledky["volano"])
finally:
    modul.Login = puvodni_login


print("── strop ──")
ok("je kratší než minuta, po které umírá volání z aplikace", STROP_SEKUND < 60)

print("\nVšechno prošlo." if selhalo == 0 else f"\nSelhalo: {selhalo}")
sys.exit(0 if selhalo == 0 else 1)
