import { NextResponse, type NextRequest } from "next/server";
import { HODINA, klicVolajiciho, Limit } from "@/lib/limit";
import { checklistPdf } from "@/lib/checklist-pdf";

/**
 * Checklist ke stažení v PDF.
 *
 * Skládá se ze stejných dat, jaká vykresluje stránka — kdyby to bylo
 * dvakrát, rozejde se to při první úpravě a lidem přijde něco jiného,
 * než co si přečetli.
 *
 * Skládání dokumentu stojí procesor a jde pořád o tentýž soubor, proto
 * se jednou složí a drží v paměti. Limit chrání před tím, kdo by adresu
 * zkoušel ve smyčce.
 */
const LIMIT = new Limit(30, HODINA);

let soubor: Buffer | null = null;

export function GET(request: NextRequest) {
  if (LIMIT.prekrocen(klicVolajiciho(request.headers) ?? "neznámá")) {
    return NextResponse.json(
      { error: "Zkoušíte to moc často. Zkuste to prosím za chvíli." },
      { status: 429 },
    );
  }

  soubor ??= checklistPdf();

  return new NextResponse(new Uint8Array(soubor), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Klidoo-checklist-prvnich-30-dni.pdf"',
      "Content-Length": String(soubor.length),
      // Obsah se mění jen s nasazením, ne s uživatelem.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
