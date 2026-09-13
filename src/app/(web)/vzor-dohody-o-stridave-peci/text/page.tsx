import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Poznamka, Sloupec } from "@/components/web/prvky";
import { NastrojeDokumentu } from "@/components/web/kopirovat";
import { ZNACKA } from "@/lib/brand";
import { VZOR_DOHODY } from "./vzor";

const TITULEK = "Vzor dohody o střídavé péči — celý text";
const POPISEK =
  "Úplný text vzorové dohody o střídavé péči k okopírování do Wordu. " +
  "S poznámkami u míst, kde se nejčastěji chybuje.";

export const metadata: Metadata = {
  title: TITULEK,
  description: POPISEK,
  alternates: { canonical: "/vzor-dohody-o-stridave-peci/text" },
};

export default function VzorText() {
  return (
    <>
      <Hero
        nadtitulek="Vzor k okopírování"
        nadpis="Dohoda o střídavé péči — text"
        perex="Zkopírujte do Wordu, doplňte údaje v hranatých závorkách a poznámky smažte. Než to podáte k soudu, nechte text projít advokátem."
      >
        <NastrojeDokumentu text={VZOR_DOHODY} />
      </Hero>

      <Sloupec>
        <Poznamka druh="pozor">
          <strong className="text-ink">Tohle není právní služba.</strong> Vzor pokrývá běžnou
          situaci a nezná vaše poměry. Pasáže o výživném, trvalém bydlišti a mimořádných
          výdajích si nechte projít advokátem specializovaným na rodinné právo — oprava textu
          před podáním stojí zlomek toho, co pozdější spor.
        </Poznamka>

        <div className="my-8 overflow-x-auto rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <pre className="tnum whitespace-pre-wrap break-words font-sans text-[0.9rem] leading-relaxed text-ink">
            {VZOR_DOHODY}
          </pre>
        </div>

        <div className="my-12 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-display text-xl font-semibold text-ink">
            Článek V. je ten, kvůli kterému se rodiče vracejí
          </h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-muted">
            Mimořádné výdaje se dohodnou snadno a evidují těžko. Za rok si nikdo nepamatuje,
            kdo zaplatil lyžák a kdo brusle. {ZNACKA} to drží za vás — výdaj, účtenka,
            rozdělení podle vašeho klíče a průběžné vyúčtování.
          </p>
          <Link
            href="/registrace"
            className="mt-5 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
          >
            Vyzkoušet zdarma
          </Link>
        </div>
      </Sloupec>
    </>
  );
}
