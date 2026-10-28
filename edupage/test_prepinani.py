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

Po opravě stráže se ukázalo, že návrat k rodiči selhává i sám o sobě —
EduPage na `edupageChange` u některých účtů odpoví přesměrováním na
`EdupageLoginFailed` a knihovna z toho udělá `UnknownServerError()` bez
argumentu, tedy výjimku s prázdným textem. V logu pak stálo „přepnutí
selhalo:" a za tím nic.

Přepnutí se proto zkouší třemi cestami: rovnou, přes rodiče a nakonec
novým přihlášením. Testy níž hlídají všechny tři a taky to, že se prázdná
výjimka nikdy nezaloguje jako prázdná.

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


class PrazdnaVyjimka(Exception):
    """Napodobuje `UnknownServerError()` z knihovny — vyhozená bez
    argumentu, takže `str()` je prázdný řetězec."""


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
    prosla = [(k.dite, k.chyby) for k in modul.po_detech(edu, [11, 22]) if k.stahovat]

    ok("projdou obě děti", [d for d, _ in prosla] == [11, 22])
    ok("žádné dítě nehlásí chybu", all(not chyby for _, chyby in prosla))
    # Přímá cesta stačí, takže se k rodiči vůbec nechodí. Ta oklika je
    # záloha, ne první volba — a právě ona v produkci selhávala.
    ok("když jde přepnout rovnou, přes rodiče se nechodí", edu.navstivene == [11, 22])

    print("── a se třemi, ať to není náhoda ──")
    edu3 = FalesnyEdupage()
    prosla3 = [k.dite for k in modul.po_detech(edu3, [1, 2, 3]) if k.stahovat]
    ok("projdou všechny tři", prosla3 == [1, 2, 3])
    ok("a pořád bez okliky", edu3.navstivene == [1, 2, 3])

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
    prosla4 = [(k.dite, k.chyby) for k in modul.po_detech(edu4, [11, 22, 33]) if k.stahovat]
    ok("rozbité dítě se přeskočí", [d for d, _ in prosla4] == [11, 33])
    ok("a to poslední se pořád stáhne", 33 in [d for d, _ in prosla4])

    print("── když přímé přepnutí nejde, jde se přes rodiče ──")

    class BezPrimeho(FalesnyEdupage):
        """Škola, u které `switchchild` z kontextu dítěte neprojde."""

        def switch_to_child(self, dite):
            if self.data["userid"].startswith("Student"):
                raise RuntimeError("nelze z dítěte")
            super().switch_to_child(dite)

    edu6 = BezPrimeho()
    prosla6 = [k.dite for k in modul.po_detech(edu6, [11, 22]) if k.stahovat]
    ok("obě děti se stáhnou i tak", prosla6 == [11, 22])
    ok("a to přes rodiče", "rodic" in edu6.navstivene)

    print("── když selže i rodič, přihlásí se znovu ──")

    class BezRodice(BezPrimeho):
        """Tohle je přesně produkční případ: `edupageChange` skončí
        `UnknownServerError()` bez textu."""

        def switch_to_parent(self):
            raise PrazdnaVyjimka()

    edu7 = BezRodice()
    novy = FalesnyEdupage()
    prosla7 = [k.dite for k in modul.po_detech(edu7, [11, 22], lambda: novy) if k.stahovat]
    ok("druhé dítě projde po novém přihlášení", prosla7 == [11, 22])
    ok("a jelo se na čerstvém účtu", novy.navstivene == [22])

    print("── bez možnosti přihlásit se znovu ──")
    edu8 = BezRodice()
    vysledek8 = [(k.dite, k.chyby, k.stahovat) for k in modul.po_detech(edu8, [11, 22])]
    ok("druhé dítě se nestahuje", [d for d, _, ok_ in vysledek8 if ok_] == [11])
    {
        # Chyba musí říct, co se zkoušelo — jinak se to hledá podle
        # prázdného řádku v logu, jako minule.
    }
    chyba22 = next(ch for d, ch, _ in vysledek8 if d == 22)
    ok("nepovedené dítě se ohlásí, ne jen zaloguje", len(chyba22) == 1)
    ok("chyba jmenuje obě cesty", "přímo" in chyba22[0] and "přes rodiče" in chyba22[0])
    ok("a nikdy není prázdná", "PrazdnaVyjimka" in chyba22[0])

    print("── prázdná výjimka se nezaloguje jako prázdná ──")
    ok("název třídy zůstane", modul.popis_vyjimky(PrazdnaVyjimka()) == "PrazdnaVyjimka")
    ok(
        "s textem se text připojí",
        modul.popis_vyjimky(RuntimeError("rozbité")) == "RuntimeError: rozbité",
    )

    print("── žákovský účet nic nepřepíná ──")
    edu5 = FalesnyEdupage()
    ok("bez dětí projde účet tak, jak je", [k.dite for k in modul.po_detech(edu5, [])] == [None])
    ok("a nikam se nepřepíná", edu5.navstivene == [])
finally:
    modul.Login = puvodni_login

print("\nVšechno prošlo." if selhalo == 0 else f"\nSelhalo: {selhalo}")
sys.exit(0 if selhalo == 0 else 1)
