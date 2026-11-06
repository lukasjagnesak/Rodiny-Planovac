import type { Metadata } from "next";
import Link from "next/link";
import { Sloupec, Nadtitulek } from "@/components/web/prvky";
import { KartaSoukromi } from "@/components/web/karta-soukromi";
import {
  TLACITKO_HLAVNI,
  TLACITKO_VEDLEJSI,
  VyzvaRegistrace,
} from "@/components/web/vyzva-registrace";
import { Ikona } from "@/components/ui/ikona";
import type { NazevIkony } from "@/lib/ikony";
import { ZNACKA } from "@/lib/brand";
import { DEFINICE, TAGLINE } from "@/lib/texty";

const TITULEK = "O Klidoo: proč aplikace pro střídavou péči vznikla";

export const metadata: Metadata = {
  title: { absolute: TITULEK },
  description: DEFINICE,
  alternates: { canonical: "/o-klidoo" },
  openGraph: { title: TITULEK, description: DEFINICE, type: "website", url: "/o-klidoo" },
};

/**
 * O Klidoo. Jen skutečná tvrzení: proč aplikace vznikla (text, který na
 * webu už stál a je autorův), co slibuje a co není. Fotka zakladatele
 * přibude až s jeho souhlasem — fotobanka ani vymyšlená čísla rodin sem
 * nepatří (zadání 2026, D-04).
 */
const CO_NENI: { nazev: string; ikona: NazevIkony }[] = [
  { nazev: "Právní poradna", ikona: "listina" },
  { nazev: "Nástroj ke kontrole druhého rodiče", ikona: "zamek" },
  { nazev: "Náhrada mediace nebo terapie", ikona: "srdce" },
];

export default function OKlidoo() {
  return (
    <>
      <section className="pb-10 pt-10 sm:pb-14 sm:pt-16">
        <Sloupec>
          <Nadtitulek>O {ZNACKA}</Nadtitulek>
          <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.75rem]">
            Klidoo jsem nezačal budovat jako firma. Ale jako táta.
          </h1>
          <div className="mt-6 space-y-4 text-[1.0625rem] leading-relaxed text-ink-muted">
            <p>
              Klidoo vzniklo z vlastní potřeby: dostat předávky, kroužky, účtenky a zprávy o tom,
              kdo koho kdy vyzvedne, z hlavy někam, kde to uvidí oba rodiče.
            </p>
            <p>
              Každá funkce v aplikaci řeší něco, co v provozu dvou domácností opakovaně drhlo. Když
              vám něco chybí nebo něco nefunguje, napište na{" "}
              <a href="mailto:info@klidoo.cz" className="font-medium text-brand underline underline-offset-4">
                info@klidoo.cz
              </a>
              . Odpovídám na to sám.
            </p>
          </div>
        </Sloupec>
      </section>

      <section className="border-y border-line bg-surface py-12 sm:py-16">
        <Sloupec>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {TAGLINE}
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-muted">{DEFINICE}</p>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-muted">
            Smysl je jednoduchý: méně administrativního napětí kolem péče, víc pozornosti dětem.
            Důležité praktické informace pohromadě a dostupné jen těm, komu je sami zpřístupníte.
          </p>

          <h3 className="mt-8 font-display text-lg font-semibold text-ink">Co Klidoo není</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {CO_NENI.map(({ nazev, ikona }) => (
              <li key={nazev} className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3 text-[0.95rem] text-ink">
                <span className="text-ink-subtle">
                  <Ikona nazev={ikona} size={20} />
                </span>
                {nazev}
              </li>
            ))}
          </ul>
        </Sloupec>
      </section>

      <section className="py-12 sm:py-16">
        <Sloupec>
          <KartaSoukromi />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/jak-funguje" className={TLACITKO_VEDLEJSI}>
              Jak Klidoo funguje
            </Link>
            <VyzvaRegistrace stranka="o-klidoo" misto="zaver" className={TLACITKO_HLAVNI}>
              Začít zdarma
            </VyzvaRegistrace>
          </div>
        </Sloupec>
      </section>
    </>
  );
}
