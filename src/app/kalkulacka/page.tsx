import type { Metadata } from "next";
import { Kalkulacka } from "@/components/kalkulacka/kalkulacka";
import { ZNACKA } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Kalkulačka střídavé péče — kolik nocí u koho",
  description:
    "Spočítej, u koho jsou děti který den a kolik nocí za rok stráví u každého rodiče. " +
    "Sudý a lichý týden, střídání po týdnu, schéma 2-2-3 i vlastní rozpis. Zdarma a bez registrace.",
  alternates: { canonical: "/kalkulacka" },
  openGraph: {
    title: "Kalkulačka střídavé péče",
    description: "Kolik nocí stráví děti u každého rodiče? Spočítej si to za minutu.",
    type: "website",
  },
};

/** Otázky, na které lidé v tomhle okamžiku hledají odpověď. */
const OTAZKY = [
  {
    otazka: "Jak se počítají noci ve střídavé péči?",
    odpoved:
      "Noc ze dne na den patří tomu rodiči, u kterého dítě ten večer usíná. Kalkulačka to " +
      "počítá stejně — proto ti u střídání po týdnu nevyjde přesně půl na půl každý měsíc, " +
      "ale za rok se to srovná.",
  },
  {
    otazka: "Proč u sudých a lichých týdnů někdy vyjdou dva týdny po sobě?",
    odpoved:
      "Protože některé roky mají 53 kalendářních týdnů. Na přelomu takového roku naváže " +
      "lichý týden na lichý a jeden rodič má děti dva týdny v kuse. Není to chyba výpočtu, " +
      "je to vlastnost číslování týdnů — a je dobré na to myslet dopředu.",
  },
  {
    otazka: "Co je schéma 2-2-3?",
    odpoved:
      "Dva dny u jednoho rodiče, dva u druhého a víkend se střídá. Děti tak nejsou od " +
      "žádného rodiče déle než tři dny, což se doporučuje u menších dětí. Cyklus se opakuje " +
      "po dvou týdnech.",
  },
  {
    otazka: "Můžeme mít rozpis, který nesedí na celé týdny?",
    odpoved:
      "Ano. Vyber Vlastní rozpis dnů a naklikej, který den patří komu. Rozpis může být " +
      "jednotýdenní, nebo dvoutýdenní — když se sudý a lichý týden liší.",
  },
  {
    otazka: "Ukládáte jména dětí?",
    odpoved:
      "Ne. Ke kalkulačce je nezadáváš a nikam se neukládají. Samotný výpočet navíc " +
      "probíhá u tebe v prohlížeči — na server se něco pošle až ve chvíli, kdy si rozpis " +
      "sám uložíš.",
  },
];

export default function KalkulackaPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Kalkulačka střídavé péče
        </h1>
        <p className="mt-2 text-base text-ink-muted">
          Zadej, jak se u vás střídáte, a hned uvidíš rozpis dnů i to, kolik nocí stráví děti
          u každého z rodičů. Zdarma, bez registrace.
        </p>
      </header>

      <Kalkulacka />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Časté otázky</h2>
        <div className="space-y-3">
          {OTAZKY.map(({ otazka, odpoved }) => (
            <details
              key={otazka}
              className="rounded-2xl border border-line bg-surface px-4 py-3.5"
            >
              <summary className="cursor-pointer font-medium text-ink">{otazka}</summary>
              <p className="mt-2 text-sm text-ink-muted">{odpoved}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Co je {ZNACKA}</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Aplikace pro rodiny, které žijí ve dvou domácnostech. Kromě kalendáře péče řeší
          kroužky a kdo kam veze, výdaje s fotkami účtenek a rozdělením mezi rodiče, školní i
          lékařské termíny a připomínky do telefonu. Druhý rodič má přístup vždycky zdarma —
          bez něj by to celé nedávalo smysl.
        </p>
      </section>

      {/* Strukturovaná data, aby otázky mohly vyjet přímo ve vyhledávání. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: OTAZKY.map(({ otazka, odpoved }) => ({
              "@type": "Question",
              name: otazka,
              acceptedAnswer: { "@type": "Answer", text: odpoved },
            })),
          }),
        }}
      />
    </div>
  );
}
