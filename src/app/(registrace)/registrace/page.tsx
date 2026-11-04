import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import { CalendarDays, Car, ReceiptText } from "lucide-react";
import { RegisterForm } from "./register-form";
import { ZakladajiciPromo } from "@/components/web/zakladajici";

export const metadata: Metadata = {
  title: "Registrace",
  description:
    "Předávky, kroužky, školní termíny a výdaje na děti přehledně na jednom místě. Bez platební karty.",
};

const VYHODY = [
  { Ikona: CalendarDays, text: "Víte, kdy jsou děti u koho" },
  { Ikona: Car, text: "Přehled kroužků a předávek" },
  { Ikona: ReceiptText, text: "Výdaje a účtenky pohromadě" },
];

/**
 * Registrace jako vstupní stránka z reklam a Instagramu.
 *
 * Na telefonu jde v pořadí úvod → formulář → náhled aplikace a úvod je
 * schválně krátký (nadpis, jedna věta, tři výhody, nabídka), aby byl
 * formulář co nejvýš. Na počítači jsou přínosy a náhled vlevo, formulář
 * vpravo. Pořadí v HTML odpovídá telefonu; mřížka ho na počítači jen
 * rozloží do sloupců, takže čtečka i klávesnice jdou vždy stejně.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ pozvanka?: string }>;
}) {
  const { pozvanka } = await searchParams;
  // Pozvaný druhý rodič nepotřebuje přesvědčovat — jde rovnou na formulář.
  const pozvani = typeof pozvanka === "string" && pozvanka.length > 0;

  return (
    <div className="grid gap-4 pt-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-8 lg:pt-8">
      {pozvani ? null : (
        <section className="lg:col-start-1 lg:row-start-1" aria-labelledby="nadpis-registrace">
          <h1
            id="nadpis-registrace"
            className="font-display text-[1.75rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.6rem] lg:text-5xl"
          >
            Střídavá péče bez zbytečného chaosu.
          </h1>
          <p className="mt-2 max-w-xl text-[0.9375rem] leading-snug text-ink-muted sm:text-lg sm:leading-relaxed">
            Předávky, kroužky, školní termíny a výdaje na děti přehledně na jednom místě. I když
            Klidoo zatím používáte sami.
          </p>
          <ul className="mt-3 space-y-1">
            {VYHODY.map(({ Ikona, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-[0.9375rem] text-ink">
                <Ikona className="h-[18px] w-[18px] shrink-0 text-brand" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
          <ZakladajiciPromo className="mt-3.5 max-w-md" />
        </section>
      )}

      <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <div className="lg:sticky lg:top-6">
          <Suspense fallback={<div className="card h-[34rem] skeleton" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>

      {/* Jeden skutečný snímek aplikace (ukázková rodina), ne kresba.
          Na telefonu až pod formulářem, ať neodsouvá registraci. */}
      {pozvani ? null : (
        <figure className="lg:col-start-1 lg:row-start-2">
          <div className="mx-auto w-[220px] rounded-[2rem] border-[8px] border-ink/85 bg-canvas shadow-lg sm:w-[250px] lg:mx-0">
            <div className="overflow-hidden rounded-[1.45rem]">
              <Image
                src="/ukazky/kalendar.png"
                alt="Kalendář v aplikaci Klidoo: barevně rozlišené dny u každého z rodičů a předávky"
                width={780}
                height={1688}
                sizes="(min-width: 640px) 250px, 220px"
                className="block h-auto w-full"
              />
            </div>
          </div>
          <figcaption className="mt-3 text-center text-sm text-ink-subtle lg:text-left">
            Skutečná obrazovka aplikace s ukázkovou rodinou.
          </figcaption>
        </figure>
      )}
    </div>
  );
}
