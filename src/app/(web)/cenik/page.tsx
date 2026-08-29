import type { Metadata } from "next";
import Link from "next/link";
import { Check, CreditCard, Users } from "lucide-react";
import { Sloupec, Nadtitulek, DalsiCteni } from "@/components/web/prvky";
import { CENIK, CO_JE_V_CENE, ZKUSEBNI_SLIB, korun } from "@/lib/tarify";
import { ZNACKA } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Ceník",
  description:
    "30 dní zdarma se všemi funkcemi a bez zadání karty. Potom 199 Kč měsíčně nebo 1 990 Kč ročně za celou rodinu — druhý rodič neplatí nic.",
  alternates: { canonical: "/cenik" },
};

/**
 * Ceník.
 *
 * Existuje hlavně proto, že rodič, který nikde nevidí cenu, si ji domyslí
 * — a domyslí si buď „zadarmo", nebo „draho". Obojí je horší než číslo.
 * Zároveň je cena povinná informace před uzavřením smlouvy na dálku.
 */

const OTAZKY = [
  {
    otazka: "Co se stane po 30 dnech?",
    odpoved:
      "Nic se nesmaže. Kalendář, výdaje i doklady zůstanou čitelné, zamkne se jen zapisování. Jakmile předplatné zaplatíš, můžeš zase psát — v tom stavu, ve kterém jsi skončil.",
  },
  {
    otazka: "Musím zadávat kartu, abych to mohl zkusit?",
    odpoved:
      "Ne. Zkušební období se zapne samo při založení rodiny a nic se z ničeho nestrhává. Kartu zadáváš, až když se rozhodneš pokračovat.",
  },
  {
    otazka: "Platí druhý rodič taky?",
    odpoved:
      "Ne. Předplatné platí rodina, ne uživatel. Druhý rodič, prarodiče i chůva mají přístup v ceně — aplikace, do které vidí jen jeden rodič, nedává smysl.",
  },
  {
    otazka: "Jak předplatné zruším?",
    odpoved:
      "V aplikaci v sekci Předplatné jedním kliknutím, bez psaní podpoře. Do konce zaplaceného období všechno běží dál a pak se přepne do režimu čtení.",
  },
  {
    otazka: "Proč je roční tarif levnější?",
    odpoved:
      "Ročním předplatným ušetříš dva měsíce. Střídavá péče je běh na roky, ne na týdny, takže se to většině rodin vyplatí.",
  },
];

export default function Cenik() {
  return (
    <>
      <section className="pb-8 pt-10 sm:pb-12 sm:pt-16">
        <Sloupec siroky>
          <Nadtitulek>Ceník</Nadtitulek>
          <h1 className="mt-3 max-w-3xl font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.75rem]">
            {ZKUSEBNI_SLIB.dni} dní zdarma. Se vším všudy.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Žádná osekaná verze na vyzkoušení: měsíc máš přesně to, co si potom případně
            předplatíš. Bez zadání karty, takže se nemá co samo strhnout.
          </p>

          <ul className="mt-7 grid gap-2.5 sm:grid-cols-2">
            {ZKUSEBNI_SLIB.body.map((bod) => (
              <li key={bod} className="flex items-start gap-2.5 text-[0.95rem] text-ink-muted">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
                <span>{bod}</span>
              </li>
            ))}
          </ul>
        </Sloupec>
      </section>

      {/* ── Tarify ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-12 sm:py-16">
        <Sloupec siroky>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Potom 199 Kč měsíčně za celou rodinu
          </h2>
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-ink-muted">
            Cena je za jednu rodinu, ne za člověka. Kolik vás do ní přibude, na cenu nemá vliv.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {CENIK.map((tarif) => {
              const rocni = tarif.id === "rocni";
              return (
                <div
                  key={tarif.id}
                  className={
                    rocni
                      ? "relative rounded-2xl border-2 border-brand bg-bg p-6"
                      : "relative rounded-2xl border border-line-strong bg-bg p-6"
                  }
                >
                  {rocni ? (
                    <span className="absolute right-5 top-5 rounded-pill bg-brand px-2.5 py-1 text-xs font-semibold text-brand-ink">
                      ušetříš {tarif.usetri} %
                    </span>
                  ) : null}

                  <h3 className="font-display text-lg font-semibold text-ink">{tarif.nazev}</h3>
                  <p className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">
                    {korun(tarif.cena)}
                    <span className="text-base font-normal text-ink-subtle"> / {tarif.obdobi}</span>
                  </p>
                  {rocni ? (
                    <p className="mt-1 text-sm text-ink-subtle">
                      vychází na {korun(tarif.mesicne)} měsíčně
                    </p>
                  ) : null}
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-muted">{tarif.popis}</p>

                  <Link
                    href="/registrace"
                    className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
                  >
                    Začít {ZKUSEBNI_SLIB.dni} dní zdarma
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <p className="flex items-start gap-2.5 text-sm text-ink-subtle">
              <Users size={16} className="mt-0.5 shrink-0" aria-hidden />
              Druhý rodič, prarodiče i chůva jsou v ceně. Platí jedna domácnost.
            </p>
            <p className="flex items-start gap-2.5 text-sm text-ink-subtle">
              <CreditCard size={16} className="mt-0.5 shrink-0" aria-hidden />
              Platba kartou přes Stripe. Číslo karty se k nám nedostane.
            </p>
          </div>
        </Sloupec>
      </section>

      {/* ── Co je v ceně ──────────────────────────────────────────── */}
      <section className="py-12 sm:py-16">
        <Sloupec siroky>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Co je v ceně
          </h2>
          <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {CO_JE_V_CENE.map(({ nazev, popis }) => (
              <div key={nazev}>
                <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
                  <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />
                  {nazev}
                </h3>
                <p className="mt-1.5 pl-6 text-[0.95rem] leading-relaxed text-ink-muted">{popis}</p>
              </div>
            ))}
          </div>
        </Sloupec>
      </section>

      {/* ── Otázky ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface py-12 sm:py-16">
        <Sloupec>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Časté otázky k placení
          </h2>
          <dl className="mt-7 space-y-6">
            {OTAZKY.map(({ otazka, odpoved }) => (
              <div key={otazka}>
                <dt className="font-display font-semibold text-ink">{otazka}</dt>
                <dd className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-muted">{odpoved}</dd>
              </div>
            ))}
          </dl>
        </Sloupec>
      </section>

      <section className="py-12 sm:py-16">
        <Sloupec siroky>
          <div className="rounded-2xl border border-line-strong bg-surface p-7 text-center sm:p-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              Zkus to měsíc
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-relaxed text-ink-muted">
              Založení rodiny trvá pár minut a kalendář na celý rok je hotový hned. Kartu po tobě
              nikdo nechce.
            </p>
            <Link
              href="/registrace"
              className="mt-6 inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover"
            >
              Založit rodinu zdarma
            </Link>
          </div>

          <DalsiCteni
            odkazy={[
              {
                href: "/jak-funguje-stridava-pece",
                nazev: "Jak funguje střídavá péče",
                popis: "Modely střídání, co říká zákon a na čem se rodiny nejčastěji zaseknou.",
              },
              {
                href: "/kalkulacka",
                nazev: "Kalkulačka střídavé péče",
                popis: "Rozpis nocí na celý rok bez registrace.",
              },
            ]}
          />
        </Sloupec>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Product",
              name: ZNACKA,
              description:
                "Sdílený kalendář střídavé péče, výdaje a kroužky pro rodiny se dvěma domovy.",
              offers: CENIK.map((tarif) => ({
                "@type": "Offer",
                name: tarif.nazev,
                price: tarif.cena,
                priceCurrency: "CZK",
                url: "https://klidoo.cz/cenik",
                availability: "https://schema.org/InStock",
              })),
            },
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: OTAZKY.map(({ otazka, odpoved }) => ({
                "@type": "Question",
                name: otazka,
                acceptedAnswer: { "@type": "Answer", text: odpoved },
              })),
            },
          ]),
        }}
      />
    </>
  );
}
