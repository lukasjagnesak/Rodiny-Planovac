import "server-only";

import { pdfDokument, type Prvek } from "./pdf";
import {
  ETAPY,
  najdiEtapu,
  spocitejVyzivne,
  type VyzivneVstup,
} from "./vyzivne";
import { ZNACKA } from "./brand";

/**
 * Dokument s orientačním výpočtem výživného.
 *
 * Posílá se na e-mail místo pouhého čísla na obrazovce, protože právě
 * v téhle podobě má cenu: dá se přiložit k e-mailu druhému rodiči,
 * vzít k advokátovi nebo si ho po půl roce znovu přečíst a vědět,
 * z čeho číslo vzniklo.
 *
 * Dokument proto nese i vstupy. Výsledek bez zadání je k ničemu — nikdo
 * si po třech měsících nepamatuje, jaký příjem tam psal.
 */

function koruny(castka: number): string {
  return `${new Intl.NumberFormat("cs-CZ").format(castka)} Kč`;
}

function procenta(hodnota: number): string {
  return `${new Intl.NumberFormat("cs-CZ").format(hodnota)} %`;
}

const VYHRADA =
  "Výsledek je orientační a není právně závazný. Doporučující tabulka " +
  "Ministerstva spravedlnosti je pomůcka, kterou soudy používají jen podpůrně. " +
  "Konkrétní částku vždy určuje soud podle odůvodněných potřeb dítěte a možností " +
  "obou rodičů.";

export function prvkyVyzivneho(vstup: VyzivneVstup): Prvek[] {
  const vysledek = spocitejVyzivne(vstup);
  const dnes = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "long" }).format(new Date());

  const zadani: Prvek[] = [
    { typ: "radek", vlevo: "Čistý měsíční příjem rodiče A", vpravo: koruny(vstup.prijemA) },
    { typ: "radek", vlevo: "Čistý měsíční příjem rodiče B", vpravo: koruny(vstup.prijemB) },
    {
      typ: "radek",
      vlevo: "Podíl péče",
      vpravo: `rodič A ${procenta(vstup.peceA)}, rodič B ${procenta(100 - vstup.peceA)}`,
    },
    { typ: "radek", vlevo: "Společné děti", vpravo: String(vstup.deti.length) },
  ];
  for (const [i, dite] of vstup.deti.entries()) {
    zadani.push({
      typ: "radek",
      vlevo: `${i + 1}. dítě`,
      vpravo: najdiEtapu(dite.etapa).popis,
    });
  }
  if (vstup.dalsiDetiA > 0) {
    zadani.push({
      typ: "radek",
      vlevo: "Další vyživované děti rodiče A",
      vpravo: String(vstup.dalsiDetiA),
    });
  }
  if (vstup.dalsiDetiB > 0) {
    zadani.push({
      typ: "radek",
      vlevo: "Další vyživované děti rodiče B",
      vpravo: String(vstup.dalsiDetiB),
    });
  }

  const vysledekKarta: Prvek[] = vysledek.bezVyzivneho
    ? [
        { typ: "cislo", popis: "Výživné měsíčně", hodnota: "Nestanovuje se" },
        {
          typ: "odstavec",
          text:
            "Oba rodiče přispívají na dítě srovnatelně, takže rozdíl mezi nimi je " +
            "zanedbatelný. To je u rovnoměrné střídavé péče a podobných příjmů obvyklý " +
            "výsledek, ne chyba výpočtu.",
        },
      ]
    : [
        {
          typ: "cislo",
          popis: `Výživné měsíčně, platí ${vysledek.platce === "a" ? "rodič A" : "rodič B"}`,
          hodnota: koruny(vysledek.castka),
        },
        {
          typ: "odstavec",
          text:
            `Rozpětí podle tabulky je ${koruny(vysledek.rozpeti.od)} až ` +
            `${koruny(vysledek.rozpeti.do)} měsíčně. Uvedená částka leží uprostřed; ` +
            `kde v rozpětí se skutečně skončí, záleží na konkrétních potřebách dítěte.`,
        },
      ];

  const prvky: Prvek[] = [
    { typ: "nadtitulek", text: "Kalkulačka · doporučující tabulka MSp" },
    { typ: "nadpis", text: "Orientační výpočet výživného" },
    {
      typ: "odstavec",
      text:
        `Spočítáno ${dnes}. Výpočet vychází ze zadání níže; se změnou příjmů ` +
        `nebo rozsahu péče se změní i výsledek.`,
    },
    { typ: "mezera", vyska: 6 },
    { typ: "karta", prvky: vysledekKarta },
    { typ: "podnadpis", text: "Z čeho se počítalo" },
    { typ: "karta", prvky: zadani },
  ];

  if (!vysledek.bezVyzivneho && vysledek.podleDeti.length > 1) {
    prvky.push({ typ: "podnadpis", text: "Rozpad po dětech" });
    prvky.push({
      typ: "karta",
      prvky: vysledek.podleDeti.map((podil) => ({
        typ: "radek" as const,
        vlevo: podil.etapa.popis,
        vpravo: koruny(podil.castka),
      })),
    });
  }

  prvky.push({ typ: "podnadpis", text: "Jak výpočet funguje" });
  prvky.push({
    typ: "odstavec",
    text:
      "Z tabulky se vezme procento podle etapy dítěte a spočítá se, kolik by na dítě " +
      "měl ze svého příjmu přispívat každý rodič. Od toho se odečte to, co rodič už " +
      "pokrývá tím, že má dítě fyzicky u sebe. Rozdíl mezi rodiči je výživné a platí " +
      "ho ten, komu vyjde víc.",
  });
  prvky.push({
    typ: "odstavec",
    text: `Použité rozpětí: ${ETAPY.map((e) => `${e.popis} ${e.od}–${e.do} %`).join("; ")}.`,
  });

  prvky.push({ typ: "podnadpis", text: "Čím se výpočet zjednodušuje" });
  prvky.push({
    typ: "odstavec",
    text:
      "U více vyživovacích povinností se používá koeficient místo samostatné řady " +
      "z tabulky. Nepočítá se kontrolní částka, tedy minimum, které musí platícímu " +
      "rodiči zůstat. Nepracuje se s majetkem ani s potenciálním příjmem. " +
      "U nadstandardních příjmů tabulka spolehlivě nefunguje vůbec.",
  });

  prvky.push({ typ: "mezera", vyska: 4 });
  prvky.push({
    typ: "karta",
    prvky: [
      { typ: "odstavec", text: VYHRADA },
      {
        typ: "odstavec",
        text:
          "Oficiální kalkulačku ministerstva najdete na vyzivne.justice.cz. " +
          "Nejlevnější a nejrychlejší cesta k výsledku je dohoda rodičů, kterou soud " +
          "schválí; vzor najdete na klidoo.cz/vzor-dohody-o-stridave-peci.",
      },
    ],
  });

  return prvky;
}

export function vyzivnePdf(vstup: VyzivneVstup): Buffer {
  return pdfDokument(prvkyVyzivneho(vstup), {
    titulek: "Orientační výpočet výživného",
    autor: ZNACKA,
    paticka: `${ZNACKA} · klidoo.cz · orientační výpočet, není právně závazný`,
  });
}
