import type { Metadata } from "next";
import Link from "next/link";
import { Sloupec, Nadtitulek, Poznamka } from "@/components/web/prvky";
import { PROVOZOVATEL } from "@/lib/provozovatel";
import { CENIK, ZKUSEBNI_DNI, korun } from "@/lib/tarify";
import { ZNACKA } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Obchodní podmínky",
  description: `Obchodní podmínky služby ${ZNACKA} — předplatné, zkušební období, odstoupení od smlouvy a reklamace.`,
  alternates: { canonical: "/obchodni-podminky" },
};

const UCINNOST = "1. září 2026";

/**
 * Obchodní podmínky.
 *
 * Prodej digitálního obsahu spotřebiteli na dálku má povinné náležitosti:
 * identifikaci prodávajícího, cenu, způsob uzavření smlouvy, poučení
 * o odstoupení do 14 dnů a — u služby, která má běžet hned — výslovný
 * souhlas s jejím poskytnutím před uplynutím té lhůty. Bez posledního
 * bodu běží lhůta dál i po zaplacení a zákazník může odstoupit kdykoli
 * v jejím průběhu.
 *
 * Čísla i identifikace se berou z jednoho místa v kódu, aby se podmínky
 * nemohly rozejít s ceníkem.
 */
export default function ObchodniPodminky() {
  const mesicni = CENIK.find((t) => t.id === "mesicni")!;
  const rocni = CENIK.find((t) => t.id === "rocni")!;

  return (
    <>
      <section className="pb-6 pt-10 sm:pt-16">
        <Sloupec>
          <Nadtitulek>Účinné od {UCINNOST}</Nadtitulek>
          <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.5rem]">
            Obchodní podmínky
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-muted">
            Podmínky používání služby {ZNACKA} na adrese klidoo.cz.
          </p>
        </Sloupec>
      </section>

      <Sloupec>
        <article className="proza">
          <h2>1. Kdo službu provozuje</h2>
          <p>
            <strong>{PROVOZOVATEL.nazev}</strong>, IČO {PROVOZOVATEL.ico}, se sídlem{" "}
            {PROVOZOVATEL.adresa}. {PROVOZOVATEL.zapis} Neplátce DPH — uvedené ceny jsou
            konečné.
          </p>
          <p>
            Kontakt: <a href={`mailto:${PROVOZOVATEL.email}`}>{PROVOZOVATEL.email}</a>. Na
            e-maily odpovídáme nejpozději do tří pracovních dnů.
          </p>

          <h2>2. Co je předmětem smlouvy</h2>
          <p>
            {ZNACKA} je webová aplikace pro rodiny, jejichž děti žijí ve dvou domácnostech:
            kalendář střídavé péče, evidence výdajů, kroužků a školních termínů a komunikace
            mezi rodiči. Poskytuje se jako služba dostupná přes internetový prohlížeč, nikoli
            jako software k instalaci.
          </p>
          <p>
            Předplatné se vztahuje na <strong>rodinu</strong>, ne na jednotlivého uživatele.
            Všichni členové rodiny, které do ní zakladatel pozve, službu používají v rámci
            jednoho předplatného a neplatí nic navíc.
          </p>

          <h2>3. Jak vzniká smlouva</h2>
          <p>
            Registrací a založením rodiny vzniká smlouva o poskytování služby na zkušební
            období v délce {ZKUSEBNI_DNI} dní. Zkušební období je bezplatné a nevyžaduje
            platební kartu.
          </p>
          <p>
            Objednáním předplatného v aplikaci a jeho zaplacením vzniká smlouva o placeném
            poskytování služby. Před odesláním objednávky vidíte cenu, délku období i to, kdy
            proběhne první platba.
          </p>

          <h2>4. Cena a placení</h2>
          <ul>
            <li>
              Měsíční předplatné: <strong>{korun(mesicni.cena)}</strong> za rodinu a měsíc.
            </li>
            <li>
              Roční předplatné: <strong>{korun(rocni.cena)}</strong> za rodinu a rok.
            </li>
          </ul>
          <p>
            Platba probíhá kartou přes platební bránu Stripe. Údaje o kartě zadáváte přímo
            poskytovateli brány; my se k nim nedostaneme a neukládáme je.
          </p>
          <p>
            Předplatné se automaticky obnovuje vždy na další období, dokud ho nezrušíte.
            Zrušit ho můžete kdykoli v aplikaci v sekci Nastavení → Předplatné; zrušení se
            projeví ke konci už zaplaceného období a nevzniká tím nárok na vrácení poměrné
            části ceny.
          </p>
          <p>
            Pokud si předplatné pořídíte během zkušebního období, první platba proběhne až
            v den, kdy by zkušební období skončilo. Tři dny předem vám o tom pošleme e-mail.
          </p>
          <p>
            Daňový doklad vystaví po každé platbě automaticky platební brána a přijde vám
            e-mailem.
          </p>

          <h2>5. Odstoupení od smlouvy</h2>
          <p>
            Jako spotřebitel máte právo odstoupit od smlouvy uzavřené na dálku do 14 dnů bez
            udání důvodu. Stačí nám do té doby napsat na{" "}
            <a href={`mailto:${PROVOZOVATEL.email}`}>{PROVOZOVATEL.email}</a>.
          </p>
          <Poznamka druh="pozor">
            <strong>Souhlas s okamžitým zahájením.</strong> Objednáním předplatného výslovně
            žádáte, aby vám byla služba zpřístupněna okamžitě, tedy před uplynutím čtrnáctidenní
            lhůty, a berete na vědomí, že tím právo na odstoupení zaniká. Bez toho by služba
            nemohla běžet hned; s tím ale zaplacené předplatné nevracíme.
          </Poznamka>
          <p>
            Na zkušební období se odstoupení nevztahuje — je bezplatné a skončit ho můžete
            kdykoli tím, že službu přestanete používat, nebo smazáním rodiny či účtu
            v nastavení.
          </p>

          <h2>6. Co se stane, když nezaplatíte</h2>
          <p>
            Po skončení zkušebního nebo zaplaceného období se <strong>nic nemaže</strong>.
            Zamkne se pouze zapisování: kalendář, výdaje, doklady i zprávy zůstávají čitelné
            a stáhnutelné. Po zaplacení pokračujete tam, kde jste skončili.
          </p>
          <p>
            Pokud platba neprojde, brána ji několikrát zopakuje a službu vám mezitím
            neomezujeme.
          </p>

          <h2>7. Vaše povinnosti</h2>
          <ul>
            <li>
              Uvádět pravdivé údaje a chránit své přihlašovací údaje. Za činnost pod svým
              účtem odpovídáte.
            </li>
            <li>
              Nepoužívat službu k obtěžování druhé strany ani k jednání, které je protiprávní.
            </li>
            <li>
              Zadávat údaje o dětech jen v rozsahu, ke kterému máte jako rodič oprávnění.
            </li>
          </ul>
          <p>
            Při závažném porušení těchto pravidel můžeme účet omezit nebo zrušit. Pokud se tak
            stane bez vašeho zavinění, vrátíme poměrnou část zaplaceného předplatného.
          </p>

          <h2>8. Dostupnost a odpovědnost</h2>
          <p>
            Službu poskytujeme s odbornou péčí, ale negarantujeme nepřetržitou dostupnost —
            potřebuje občasnou odstávku kvůli údržbě a závisí na službách třetích stran
            (databáze, platební brána, EduPage, Google). Údaje ze školních systémů přebíráme
            v podobě, v jaké je škola zveřejní, a neručíme za jejich správnost ani úplnost.
          </p>
          <p>
            {ZNACKA} je organizační nástroj, ne právní služba. Vzory dohod a kalkulačky na webu
            jsou orientační a nenahrazují radu advokáta.
          </p>
          <p>
            Neodpovídáme za škodu způsobenou okolnostmi mimo naši kontrolu. U škody způsobené
            naším porušením povinností je náhrada omezena částkou, kterou jste za službu
            zaplatili za posledních 12 měsíců; to neplatí pro škodu způsobenou úmyslně nebo
            z hrubé nedbalosti a pro újmu na zdraví.
          </p>

          <h2>9. Reklamace</h2>
          <p>
            Pokud služba nefunguje, jak má, napište na{" "}
            <a href={`mailto:${PROVOZOVATEL.email}`}>{PROVOZOVATEL.email}</a>. Reklamaci
            vyřídíme do 30 dnů. Nejdřív se vadu pokusíme odstranit; když to nepůjde,
            dohodneme se na slevě nebo vrácení peněz za dotčené období.
          </p>

          <h2>10. Osobní údaje</h2>
          <p>
            Jak s údaji nakládáme, komu je předáváme a jak dlouho je držíme, popisují{" "}
            <Link href="/zasady-ochrany-osobnich-udaju">zásady ochrany osobních údajů</Link>.
          </p>

          <h2>11. Mimosoudní řešení sporů</h2>
          <p>
            Spor se vždycky pokusíme vyřešit dohodou. Pokud se nedohodneme, máte jako
            spotřebitel právo obrátit se na Českou obchodní inspekci (Štěpánská 796/44, 110 00
            Praha 1, <a href="https://adr.coi.cz">adr.coi.cz</a>), která je pro tyto spory
            příslušným orgánem mimosoudního řešení.
          </p>

          <h2>12. Změny podmínek</h2>
          <p>
            Podmínky můžeme změnit — o podstatné změně vás upozorníme e-mailem nejméně 30 dní
            předem. Pokud se změnou nesouhlasíte, můžete do jejího účinku předplatné zrušit;
            zaplacené a nevyčerpané období vám v takovém případě vrátíme poměrně.
          </p>
          <p>Tyto podmínky jsou účinné od {UCINNOST}.</p>
        </article>
      </Sloupec>

      <div className="h-16" />
    </>
  );
}
