import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Hero, Sloupec } from "@/components/web/prvky";
import { OvereniVypisu } from "@/components/web/overeni-vypisu";
import { ZNACKA } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Ověření výpisu",
  description: `Ověřte, že výpis nebo souhrn z ${ZNACKA} je pravý a nikdo ho neupravil.`,
  alternates: { canonical: "/overit" },
};

/**
 * Ověření výpisu pro soud, OSPOD a advokáty.
 *
 * Každý výpis z Klidoo má kód. Kdo ho dostal na stůl, tady zjistí, že
 * vznikl v Klidoo, kdy a kdo ho vytvořil, co obsahoval — a u souboru,
 * jestli ho od té doby někdo neupravil.
 */
export default function OveritStranka() {
  return (
    <>
      <Hero
        nadtitulek={
          <>
            <ShieldCheck size={16} aria-hidden />
            Pro soudy, OSPOD a advokáty
          </>
        }
        nadpis="Ověření výpisu"
        perex="Zadejte kód z výpisu. U souboru ve Wordu ho můžete i nahrát — ověří se, že ho od vytvoření nikdo neupravil. Soubor se kontroluje jen ve vašem prohlížeči a nikam se neodesílá."
        kompaktni
      />
      <Sloupec>
        <OvereniVypisu />
      </Sloupec>
      <div className="h-16" />
    </>
  );
}
