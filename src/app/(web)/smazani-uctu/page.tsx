import type { Metadata } from "next";
import Link from "next/link";
import { Hero, Sloupec } from "@/components/web/prvky";
import { PROVOZOVATEL } from "@/lib/provozovatel";
import { ZNACKA } from "@/lib/brand";

/**
 * Smazání účtu a údajů. Google Play vyžaduje veřejnou adresu, kde se
 * dá o smazání požádat i bez aplikace; App Store chce, aby šlo smazat
 * přímo v aplikaci — to je Nastavení → Smazat účet.
 */
export const metadata: Metadata = {
  title: "Smazání účtu a údajů",
  description: `Jak smazat účet ${ZNACKA} a co se s údaji stane.`,
  alternates: { canonical: "/smazani-uctu" },
};

export default function SmazaniUctu() {
  return (
    <>
      <Hero
        nadtitulek="Účet a údaje"
        nadpis={`Jak smazat účet ${ZNACKA}`}
        perex="Smazat účet můžete sami v aplikaci, kdykoli a bez udání důvodu. Kdo se do aplikace nedostane, napíše nám."
      />
      <Sloupec>
        <article className="proza">
          <h2>V aplikaci nebo na webu</h2>
          <ol>
            <li>Přihlaste se do {ZNACKA} (aplikace v telefonu nebo klidoo.cz).</li>
            <li>
              Otevřete <strong>Nastavení</strong> a sjeďte úplně dolů.
            </li>
            <li>
              Zvolte <strong>Smazat účet</strong> a potvrďte opsáním svého e-mailu.
            </li>
          </ol>
          <p>Účet se smaže hned. Vrátit to nejde.</p>

          <h2>Bez přihlášení</h2>
          <p>
            Napište z e-mailu, se kterým jste se registrovali, na{" "}
            <a href={`mailto:${PROVOZOVATEL.email}?subject=Smaz%C3%A1n%C3%AD%20%C3%BA%C4%8Dtu`}>
              {PROVOZOVATEL.email}
            </a>{" "}
            s předmětem „Smazání účtu“. Abychom nesmazali účet někomu jinému, odpovíme na tutéž
            adresu a požádáme o potvrzení. Smazání provedeme nejpozději do 30 dnů, obvykle
            během pár dní.
          </p>

          <h2>Co se smaže</h2>
          <ul>
            <li>Váš profil, přihlášení, nastavení notifikací a propojení (Google, EduPage).</li>
            <li>
              Rodiny, ve kterých po vás nikdo nezůstane, i s celým obsahem: kalendář, děti,
              výdaje, účtenky, doklady a zprávy.
            </li>
            <li>Kontakt pro e-maily s tipy a nabídkami, pokud jste je odebírali.</li>
          </ul>

          <h2>Co zůstane</h2>
          <ul>
            <li>
              Rodina, ve které jsou další lidé (třeba druhý rodič), zůstane jim. Bez vás, ale
              s tím, co jste do ní zapsali — je to i jejich kalendář a jejich výdaje.
            </li>
            <li>
              Daňové doklady k zaplacenému předplatnému, které musíme ze zákona uchovat
              (zákon o účetnictví, až 10 let).
            </li>
            <li>Anonymní záznam o tom, kdy byl udělen a odvolán souhlas s e-maily, bez vazby na vás.</li>
          </ul>

          <p>
            Podrobnosti o tom, jak s údaji zacházíme, jsou v{" "}
            <Link href="/zasady-ochrany-osobnich-udaju">zásadách ochrany osobních údajů</Link>.
          </p>
        </article>
      </Sloupec>
    </>
  );
}
