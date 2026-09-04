"""
Přepínání mezi dětmi na rodičovském účtu.

Rodič vidí každé dítě zvlášť a mezi dvěma dětmi se musí projít přes
rodiče — přímé přepnutí z dítěte na dítě EduPage nenabízí. Cesta zpátky
má ale v knihovně stráž `@is_parent`, která se ptá `edupage.data["userid"]`,
tedy toho, co je v paměti. A do paměti si `obnov_kontext()` po přepnutí
na dítě vloží identitu dítěte, protože bez toho se rozvrh stahuje s cizím
uživatelem a skončí to hláškou „list index out of range".

Ty dvě věci se potkaly: od druhého dítěte dál skončil `switch_to_parent()`
výjimkou „nejsi rodič", dítě se přeskočilo a rodina se dvěma dětmi dostala
rozvrh i zprávy jen pro to první.

Spuštění:  python edupage/test_prepinani.py
"""

import sys

import main as modul

selhalo = 0


def ok(popis, podminka):
    global selhalo
    print(("  ✓ " if podminka else "  ✗ ") + popis)
    if not podminka:
        selhalo += 1


class NeniRodic(Exception):
    pass


class FalesnyEdupage:
    """Chová se jako knihovna: hlídá `userid` a po přepnutí ho mění."""

    def __init__(self):
        self.data = {"userid": "Rodic123"}
        self.gsec_hash = "hash-rodice"
        self.subdomain = "skola"
        self.username = "rodic@example.cz"
        self.session = type("S", (), {"cookies": {"PHPSESSID": "abc"}})()
        self.navstivene = []

    def get_user_id(self):
        return self.data["userid"]

    def switch_to_parent(self):
        # Tohle je ta stráž z knihovny — doslova.
        if "Rodic" not in self.get_user_id():
            raise NeniRodic("not a parent")
        self.navstivene.append("rodic")

    def switch_to_child(self, dite):
        self.navstivene.append(dite)
        self.aktualni = dite


class FalesnyLogin:
    """`reload_data` přepíše kontext identitou právě přepnutého dítěte."""

    def __init__(self, edupage):
        self.edupage = edupage

    def reload_data(self, subdomena, sid, username):
        self.edupage.data = {"userid": f"Student{self.edupage.aktualni}"}
        self.edupage.gsec_hash = "hash-ditete"


print("── rodič se dvěma dětmi ──")
puvodni_login = modul.Login
try:
    modul.Login = FalesnyLogin

    edu = FalesnyEdupage()
    prosla = [(dite, chyby) for dite, chyby in modul.po_detech(edu, [11, 22])]

    ok("projdou obě děti", [d for d, _ in prosla] == [11, 22])
    ok("žádné dítě nehlásí chybu", all(not chyby for _, chyby in prosla))
    ok("mezi dětmi se šlo přes rodiče", edu.navstivene == [11, "rodic", 22])

    print("── a se třemi, ať to není náhoda ──")
    edu3 = FalesnyEdupage()
    prosla3 = [d for d, _ in modul.po_detech(edu3, [1, 2, 3])]
    ok("projdou všechny tři", prosla3 == [1, 2, 3])
    ok("k rodiči se chodí mezi každou dvojicí", edu3.navstivene.count("rodic") == 2)

    print("── kontext dítěte se pořád obnovuje ──")
    edu2 = FalesnyEdupage()
    list(modul.po_detech(edu2, [7]))
    ok(
        "po přepnutí je v paměti identita dítěte, ne rodiče",
        edu2.data["userid"] == "Student7",
    )

    print("── rozbité dítě neshodí ostatní ──")

    class EdupageSRozbitymDitetem(FalesnyEdupage):
        def switch_to_child(self, dite):
            if dite == 22:
                raise RuntimeError("not your child")
            super().switch_to_child(dite)

    edu4 = EdupageSRozbitymDitetem()
    prosla4 = [(d, ch) for d, ch in modul.po_detech(edu4, [11, 22, 33])]
    ok("rozbité dítě se přeskočí", [d for d, _ in prosla4] == [11, 33])
    ok("a to poslední se pořád stáhne", 33 in [d for d, _ in prosla4])

    print("── žákovský účet nic nepřepíná ──")
    edu5 = FalesnyEdupage()
    ok("bez dětí projde účet tak, jak je", [d for d, _ in modul.po_detech(edu5, [])] == [None])
    ok("a nikam se nepřepíná", edu5.navstivene == [])
finally:
    modul.Login = puvodni_login

print("\nVšechno prošlo." if selhalo == 0 else f"\nSelhalo: {selhalo}")
sys.exit(0 if selhalo == 0 else 1)
