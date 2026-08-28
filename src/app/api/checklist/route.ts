import { NextResponse } from "next/server";
import { vytvorDocx, type Odstavec } from "@/lib/docx";
import {
  CHECKLIST_PATA,
  CHECKLIST_TITULEK,
  CHECKLIST_UVOD,
  SEKCE,
} from "@/lib/checklist";

/**
 * Checklist ke stažení ve Wordu.
 *
 * Skládá se ze stejných dat, jaká vykresluje stránka — kdyby to bylo
 * dvakrát, rozejde se to při první úpravě a lidem přijde něco jiného,
 * než co si přečetli.
 */
export function GET() {
  const odstavce: Odstavec[] = [
    { druh: "nadpis1", text: CHECKLIST_TITULEK },
    { druh: "text", text: CHECKLIST_UVOD },
  ];

  for (const sekce of SEKCE) {
    odstavce.push({ druh: "nadpis2", text: sekce.nadpis });
    for (const bod of sekce.body) {
      odstavce.push({ druh: "odrazka", text: bod });
    }
  }

  odstavce.push({ druh: "drobne", text: CHECKLIST_PATA });

  const soubor = vytvorDocx(odstavce);

  return new NextResponse(new Uint8Array(soubor), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition":
        'attachment; filename="klidoo-checklist-prvnich-30-dni.docx"',
      "Content-Length": String(soubor.length),
      // Obsah se mění jen s nasazením, ne s uživatelem.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
