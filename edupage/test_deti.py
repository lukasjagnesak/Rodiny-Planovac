"""
Hledání dětí v přihlašovacích datech EduPage.

EduPage nemá koncový bod, který by děti rodiče vypsal, a struktura dat se
mezi školami liší. Hledá se proto podle tvaru — a právě proto to potřebuje
testy: bez nich by se chyba poznala až tím, že rodič nevidí druhé dítě.

Spuštění:  python edupage/test_deti.py
"""

import sys

from main import najdi_deti

selhalo = 0


def ok(popis, podminka):
    global selhalo
    print(("  ✓ " if podminka else "  ✗ ") + popis)
    if not podminka:
        selhalo += 1


# Seznam pod klíčem, který zmiňuje dítě.
nalezene = najdi_deti(
    {
        "userrow": {"id": "Rodic123"},
        "children": [
            {"studentid": "4521", "name": "Kuba Novák"},
            {"studentid": "4522", "firstname": "Ema", "lastname": "Nováková"},
        ],
    }
)
ok("najde obě děti ze seznamu", len(nalezene) == 2)
ok("přečte ID jako číslo", nalezene[0]["edupageId"] == 4521)
ok("poskládá jméno z křestního a příjmení", nalezene[1]["jmeno"] == "Ema Nováková")

# Slovník ID → údaje, zanořený hlouběji.
nalezene = najdi_deti({"dp": {"deti": {"77": {"meno": "Kuba"}, "78": {"meno": "Ema"}}}})
ok("zvládne i slovník místo seznamu", len(nalezene) == 2)
ok("vezme ID z klíče slovníku", {d["edupageId"] for d in nalezene} == {77, 78})

# Nic, co by dítě připomínalo.
ok("bez dětí vrátí prázdno", najdi_deti({"dp": {"year": 2025}, "items": [1, 2, 3]}) == [])

# Stejné dítě na dvou místech se nesmí nafouknout do nekonečna.
nalezene = najdi_deti(
    {
        "children": [{"studentid": 1, "name": "A"}],
        "ziaci": [{"studentid": 1, "name": "A"}],
    }
)
ok("stejné dítě z více míst je pořád jedno ID", len({d["edupageId"] for d in nalezene}) == 1)

# Záznam bez použitelného ID se přeskočí, ne aby spadl.
ok("záznam bez ID se přeskočí", najdi_deti({"children": [{"name": "Bez ID"}]}) == [])

# Nula ani záporné ID nedávají smysl.
ok("nulové ID se nebere", najdi_deti({"children": [{"studentid": 0, "name": "X"}]}) == [])

print("\n=== VŠE PROŠLO ===" if selhalo == 0 else f"\n=== {selhalo} SELHALO ===")
sys.exit(0 if selhalo == 0 else 1)
