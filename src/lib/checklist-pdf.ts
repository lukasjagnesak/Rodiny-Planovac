import "server-only";

import { pdfDokument, type Prvek } from "./pdf";
import { ZNACKA } from "./brand";
import { CHECKLIST_PATA, CHECKLIST_TITULEK, CHECKLIST_UVOD, SEKCE } from "./checklist";

/**
 * Checklist prvních 30 dní jako PDF k vytištění.
 *
 * PDF místo Wordu: otevře se v každém telefonu bez aplikace, vytiskne se
 * stejně všude a nikdo si omylem nepřepíše text. Obsah se skládá ze
 * stejných dat jako stránka.
 */
export function prvkyChecklistu(): Prvek[] {
  const celkem = SEKCE.reduce((soucet, sekce) => soucet + sekce.body.length, 0);
  const prvky: Prvek[] = [
    { typ: "nadtitulek", text: `Checklist · ${celkem} bodů` },
    { typ: "nadpis", text: CHECKLIST_TITULEK },
    { typ: "odstavec", text: CHECKLIST_UVOD },
    { typ: "mezera", vyska: 6 },
  ];

  for (const sekce of SEKCE) {
    prvky.push({
      typ: "karta",
      prvky: [
        { typ: "podnadpis", text: sekce.nadpis },
        ...sekce.body.map((text): Prvek => ({ typ: "ukol", text })),
      ],
    });
  }

  prvky.push({ typ: "mezera", vyska: 4 }, { typ: "odstavec", text: CHECKLIST_PATA });
  return prvky;
}

export function checklistPdf(): Buffer {
  return pdfDokument(prvkyChecklistu(), {
    titulek: CHECKLIST_TITULEK,
    autor: ZNACKA,
    paticka: `${ZNACKA} · klidoo.cz · checklist prvních 30 dní`,
  });
}
