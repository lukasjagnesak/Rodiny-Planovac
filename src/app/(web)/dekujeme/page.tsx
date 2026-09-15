import type { Metadata } from "next";
import { Sloupec } from "@/components/web/prvky";
import { DekujemeObsah } from "./obsah";

export const metadata: Metadata = {
  title: "Děkujeme",
  robots: { index: false, follow: false },
};

/**
 * Návrat z platby.
 *
 * Existuje kvůli jediné věci: reklamní systémy musí vidět nákup, a jejich
 * skripty běží jen na veřejném webu — do aplikace, kde jsou data dětí,
 * je pouštět nechci. Stránka konverzi nahlásí a pošle člověka dál.
 *
 * Není to potvrzení platby: to řeší webhook ze Stripu. Sem se dá dojít
 * i ručně, takže se tu nic nezapisuje.
 */
export default async function Dekujeme({
  searchParams,
}: {
  searchParams: Promise<{ tarif?: string }>;
}) {
  const { tarif } = await searchParams;

  return (
    <section className="py-16 sm:py-24">
      <Sloupec>
        <DekujemeObsah tarif={tarif ?? null} />
      </Sloupec>
    </section>
  );
}
