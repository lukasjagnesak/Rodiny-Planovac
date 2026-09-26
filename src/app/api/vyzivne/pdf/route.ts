import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { HODINA, klicVolajiciho, Limit } from "@/lib/limit";
import { ulozLead } from "@/lib/leady";
import { vyzivnePdf } from "@/lib/vyzivne-pdf";
import { spocitejVyzivne, ETAPY, MAX_DETI, MAX_DALSICH_DETI } from "@/lib/vyzivne";
import { posliMail } from "@/lib/mail";
import { vyzivneVypocetZprava } from "@/lib/mail-sablony";
import { odhlasovaciOdkaz } from "@/lib/odhlaseni";
import { siteUrl } from "@/lib/google";

/**
 * Odeslání výpočtu výživného v PDF.
 *
 * Vlastní koncový bod, ne jen další materiál ve formuláři: dokument se
 * skládá ze zadání, které člověk naklikal, takže ho nejde předpřipravit.
 *
 * Zadání se sem posílá **znovu a výsledek se počítá tady**. Číslo
 * z prohlížeče by šlo podvrhnout a my bychom pak v příloze poslali
 * částku, kterou jsme nespočítali.
 */
const LIMIT = new Limit(10, HODINA);

const MAGNET = "vyzivne-pdf";

const Vstup = z.object({
  email: z.string().trim().max(200).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/),
  // Návnada pro roboty: pole, které živý člověk nevidí a nevyplní.
  web: z.string().max(200).optional(),
  vypocet: z.object({
    deti: z
      .array(z.object({ etapa: z.enum(ETAPY.map((e) => e.id) as [string, ...string[]]) }))
      .min(1)
      .max(MAX_DETI),
    prijemA: z.number().finite().min(0).max(10_000_000),
    prijemB: z.number().finite().min(0).max(10_000_000),
    peceA: z.number().finite().min(0).max(100),
    dalsiDetiA: z.number().int().min(0).max(MAX_DALSICH_DETI),
    dalsiDetiB: z.number().int().min(0).max(MAX_DALSICH_DETI),
  }),
  odkud: z
    .object({
      utm_source: z.string().max(80).nullish(),
      utm_medium: z.string().max(80).nullish(),
      utm_campaign: z.string().max(120).nullish(),
      ref: z.string().max(80).nullish(),
      referrer: z.string().max(500).nullish(),
      landing: z.string().max(200).nullish(),
    })
    .partial()
    .optional(),
});

function shrnuti(vysledek: ReturnType<typeof spocitejVyzivne>): string {
  if (vysledek.bezVyzivneho) {
    return (
      "Podle zadání se výživné nestanovuje — oba rodiče přispívají na dítě " +
      "srovnatelně. U rovnoměrné střídavé péče a podobných příjmů je to obvyklý výsledek."
    );
  }
  const platce = vysledek.platce === "a" ? "rodič A" : "rodič B";
  const castka = new Intl.NumberFormat("cs-CZ").format(vysledek.castka);
  return `Podle zadání vychází výživné ${castka} Kč měsíčně a platí ho ${platce}.`;
}

export async function POST(request: NextRequest) {
  if (LIMIT.prekrocen(klicVolajiciho(request.headers) ?? "neznámá")) {
    return NextResponse.json(
      { error: "Zkoušíte to moc často. Dejte tomu chvilku." },
      { status: 429 },
    );
  }

  const telo = await request.json().catch(() => null);
  const rozbor = Vstup.safeParse(telo);
  if (!rozbor.success) {
    return NextResponse.json({ error: "E-mail nebo zadání nevypadá platně." }, { status: 400 });
  }

  const { email, web, vypocet, odkud } = rozbor.data;
  if (web) return NextResponse.json({ ok: true });

  // Kontakt uložit dřív, než se odesílá. Když pak selže pošta, máme aspoň
  // komu se ozvat ručně — opačné pořadí by o toho člověka přišlo úplně.
  const ulozeni = await ulozLead({
    email,
    magnet: MAGNET,
    utm_source: odkud?.utm_source ?? null,
    utm_medium: odkud?.utm_medium ?? null,
    utm_campaign: odkud?.utm_campaign ?? null,
    ref: odkud?.ref ?? null,
    referrer: odkud?.referrer ?? null,
    landing: odkud?.landing ?? null,
  });

  if (ulozeni === "chyba") {
    return NextResponse.json({ error: "Uložení se nepovedlo." }, { status: 500 });
  }

  let priloha: Buffer;
  try {
    priloha = vyzivnePdf(vypocet);
  } catch (chyba) {
    console.error("[vyzivne-pdf] dokument se nesložil:", chyba);
    return NextResponse.json({ error: "Dokument se nepodařilo vytvořit." }, { status: 500 });
  }

  const zaklad = siteUrl();
  const odeslano = await posliMail(
    email,
    vyzivneVypocetZprava({
      shrnuti: shrnuti(spocitejVyzivne(vypocet)),
      web: zaklad,
      odhlaseni: odhlasovaciOdkaz(zaklad, email),
    }),
    [{ jmeno: "vypocet-vyzivneho.pdf", obsah: priloha, typ: "application/pdf" }],
  );

  if (!odeslano) {
    return NextResponse.json(
      { error: "E-mail se teď nepodařilo odeslat. Zkuste to prosím za chvíli." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
