"""
Hledání dětí v přihlašovacích datech EduPage.

EduPage nemá koncový bod, který by děti rodiče vypsal, a struktura dat se
mezi školami liší. Hledá se proto podle tvaru — a právě proto to potřebuje
testy: bez nich by se chyba poznala až tím, že rodič nevidí druhé dítě.

Spuštění:  python edupage/test_deti.py
"""

import sys

from main import deti_ze_seznamu, jmena_studentu, najdi_deti

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

# ── Skutečný tvar dat, jak ho posílá EduPage rodičovskému účtu ──────
# Ověřeno proti ZŠ Mukařov. ID dětí nejsou v žádném objektu, jsou to holá
# čísla v poli `parentStudentids` — hledání podle tvaru je proto minulo.
SKUTECNY = {
    "parentStudentids": [-1890, -694],
    "childGroups": {"-1890": {}, "-694": {}},
    "userrow": {"UserID": "Rodic1035206", "RodicID": "1035206", "p_meno": "Lukas"},
    "dbi": {
        "students": {
            "-1890": {"id": "-1890", "firstname": "Martin", "lastname": "Novak"},
            "-694": {"id": "-694", "firstname": "Ema", "lastname": "Novakova"},
        }
    },
}

nalezena = deti_ze_seznamu(SKUTECNY)
# ZŠ Mukařov má ID dětí záporná. Podmínka „musí být kladné" je tichem
# zahazovala — proto se dlouho nenašlo nic, aniž by cokoli spadlo.
ok("vytáhne i záporná ID z parentStudentids", nalezena == [-1890, -694])

jmena = jmena_studentu(SKUTECNY)
ok("dotáhne jméno prvního dítěte", jmena.get(-1890) == "Martin Novak")
ok("dotáhne jméno druhého dítěte", jmena.get(-694) == "Ema Novakova")

ok("nula pořád neprojde", deti_ze_seznamu({"studentids": [0]}) == [])
ok("bez seznamu ID vrátí prázdno", deti_ze_seznamu({"dp": {"year": 2025}}) == [])
ok("bez dbi.students vrátí prázdno", jmena_studentu({"dbi": {}}) == {})
ok("duplicitní ID se nezopakuje", deti_ze_seznamu({"a": {"studentids": [1, 1, 2]}}) == [1, 2])

# EduPage vozí `userProps` s číselnými klíči. Volání .lower() na nich
# shodilo celé hledání dřív, než se dostalo k parentStudentids.
S_CISELNYMI_KLICI = {
    "userProps": {946616: {}, 945195: {}, 1035206: {}},
    "parentStudentids": [-1890, -694],
}
ok(
    "číselné klíče hledání neshodí",
    deti_ze_seznamu(S_CISELNYMI_KLICI) == [-1890, -694],
)
ok("číselné klíče neshodí ani záložní hledání", najdi_deti(S_CISELNYMI_KLICI) == [])

print("\n=== VŠE PROŠLO ===" if selhalo == 0 else f"\n=== {selhalo} SELHALO ===")
sys.exit(0 if selhalo == 0 else 1)
