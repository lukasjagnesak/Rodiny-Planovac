import type { Metadata } from "next";
import { ZnovuNastavitSouhlas } from "@/components/web/znovu-souhlas";
import { Hero, Sloupec, Tabulka } from "@/components/web/prvky";
import { PROVOZOVATEL, maIdentifikaci } from "@/lib/provozovatel";
import { ZNACKA } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Zásady ochrany osobních údajů",
  description: `Jaké údaje ${ZNACKA} zpracovává, proč, jak dlouho a jaká máte práva.`,
  alternates: { canonical: "/zasady-ochrany-osobnich-udaju" },
  robots: { index: true, follow: true },
};

/** Odkaz, který znovu vyvolá lištu se souhlasem. */
function OdvolatSouhlas() {
  return <ZnovuNastavitSouhlas />;
}

export default function Zasady() {
  return (
    <>
      <Hero
        nadtitulek="Aktualizováno 2026"
        nadpis="Zásady ochrany osobních údajů"
        perex={`Co ${ZNACKA} o vás a o vašich dětech ví, proč to potřebuje a jak se toho zbavíte.`}
      />

      <Sloupec>
        <article className="proza">
          <h2>Kdo údaje zpracovává</h2>
          {maIdentifikaci() ? (
            <p>
              Správcem osobních údajů je {PROVOZOVATEL.nazev}, IČO {PROVOZOVATEL.ico}, se
              sídlem {PROVOZOVATEL.adresa}. Kontaktní e-mail: {PROVOZOVATEL.email}.
            </p>
          ) : (
            <p>
              Správcem osobních údajů je provozovatel služby {ZNACKA}. Ve všem, co se týká
              vašich údajů, se na nás obraťte na {PROVOZOVATEL.email}.
            </p>
          )}

          <h2>Jaké údaje zpracováváme</h2>
        </article>

        <Tabulka
          hlavicka={["Údaje", "Proč", "Jak dlouho"]}
          radky={[
            [
              "E-mail a heslo",
              "Přihlášení a obnova přístupu — plnění smlouvy",
              "Po dobu existence účtu",
            ],
            [
              "Obsah, který zadáte (děti, kalendář, výdaje, doklady)",
              "Samotná funkce služby — plnění smlouvy",
              "Do smazání rodiny nebo účtu",
            ],
            [
              "E-mail z formuláře na webu",
              "Zaslání materiálu a informací o službě — souhlas",
              "Do odvolání souhlasu, nejdéle 3 roky",
            ],
            [
              "Přístupový token ke Googlu a EduPage",
              "Synchronizace, kterou si sami zapnete — souhlas",
              "Do odpojení propojení",
            ],
            [
              "Údaje o předplatném (stav, období, identifikátor u Stripu)",
              "Plnění smlouvy a účetnictví",
              "Po dobu předplatného, doklady dle zákona o účetnictví",
            ],
            [
              "Technické záznamy (IP, čas požadavku)",
              "Provoz a bezpečnost — oprávněný zájem",
              "Nejdéle 6 měsíců",
            ],
          ]}
        />

        <article className="proza">
          <h2>Údaje o dětech</h2>
          <p>
            Do služby zadáváte údaje o svých dětech. Zpracováváme je proto, abychom vám mohli
            službu poskytnout, a nikomu je nepředáváme. Zpřístupní se jen členům vaší rodiny,
            které do ní sami pozvete. Fotky dokladů a účtenek leží v úložišti, ke kterému má
            přístup pouze vaše rodina — omezení hlídá přímo databáze, ne jen aplikace.
          </p>
          <p>
            Veřejné kalkulačky na tomto webu jména dětí nevyžadují a neukládají. Výpočet
            výživného navíc probíhá celý ve vašem prohlížeči a příjmy se nikam neodesílají.
          </p>

          <h2>Měření návštěvnosti</h2>
          <p>
            Měříme dvěma způsoby a je mezi nimi podstatný rozdíl.
          </p>
          <p>
            <strong>Vlastní měření</strong> běží vždycky a souhlas nevyžaduje, protože
            neukládá nic, čím by šel návštěvník najít. Z adresy a prohlížeče se počítá otisk,
            jehož sůl se každý den mění — po půlnoci je z téhož člověka někdo jiný a zpětně to
            nejde spojit. Nepoužívá cookies a z odkazující stránky si necháváme jen doménu,
            ne celou adresu; u tohohle tématu se v ní občas veze i to, co člověk hledal.
          </p>
          <p>
            <strong>Google Analytics a Meta Pixel</strong> se spustí jedině tehdy, když k tomu
            dáte souhlas v liště, která se ukáže při první návštěvě. Do té doby se nenačte ani
            jejich skript. Slouží k měření reklamních kampaní a ukládají cookies; oba
            zpracovatelé mohou údaje předat do Spojených států na základě rozhodnutí Evropské
            komise o odpovídající ochraně. Souhlas můžete kdykoli odvolat — stačí{" "}
            <OdvolatSouhlas /> a nastavit volbu znovu.
          </p>
          <p>
            Uvnitř aplikace, tedy tam, kde jsou údaje o dětech, kalendář a doklady, žádné
            reklamní ani analytické skripty neběží. Ani se souhlasem.
          </p>

          <h2>Komu údaje předáváme</h2>
          <p>
            Nikomu je neprodáváme. Předáváme je jen zpracovatelům, bez kterých by služba
            nefungovala:
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — databáze, přihlašování a úložiště souborů, servery
              v Evropské unii.
            </li>
            <li>
              <strong>Poskytovatel serveru</strong> — provoz aplikace, servery v Evropské unii.
            </li>
            <li>
              <strong>Google</strong> — pouze pokud si sami zapnete synchronizaci kalendáře, a
              jen v rozsahu, který synchronizace vyžaduje.
            </li>
            <li>
              <strong>Telegram</strong> — pouze pokud si sami zapnete upozornění; předává se
              text upozornění a identifikátor chatu.
            </li>
            <li>
              <strong>Stripe</strong> — zpracování plateb, pokud si předplatné pořídíte.
              Předává se e-mail a název rodiny; číslo karty zadáváte přímo Stripu a k nám
              se nedostane.
            </li>
            <li>
              <strong>Poskytovatel e-mailu</strong> — odesílání pozvánek a zpráv o
              předplatném; předává se e-mailová adresa příjemce a obsah zprávy.
            </li>
            <li>
              <strong>Google</strong> (Analytics, Ads) a <strong>Meta</strong> — jen se
              souhlasem a jen na veřejném webu: měření návštěvnosti a účinnosti reklamy.
              Předává se identifikátor prohlížeče, navštívené stránky veřejného webu a to,
              jestli došlo k registraci nebo platbě. Nikdy nic o dětech ani obsah aplikace.
            </li>
          </ul>

          <h2>Jaká máte práva</h2>
          <p>
            Máte právo na přístup ke svým údajům, na jejich opravu a výmaz, na omezení
            zpracování, na přenositelnost a právo vznést námitku proti zpracování založenému
            na oprávněném zájmu. Souhlas můžete kdykoli odvolat — u obchodních sdělení stačí
            odkaz v patičce e-mailu.
          </p>
          <p>
            Napište na {PROVOZOVATEL.email} a ozveme se nejpozději do měsíce. Pokud budete mít
            pocit, že s vašimi údaji nakládáme špatně, můžete se obrátit na Úřad pro ochranu
            osobních údajů, Pplk. Sochora 27, Praha 7.
          </p>

          <h2>Smazání účtu</h2>
          <p>
            Účet i rodinu si můžete smazat v nastavení. Smazáním rodiny zmizí i její obsah
            včetně nahraných souborů. Zálohy se přepisují průběžně, nejpozději do 30 dnů.
          </p>

          <h2>Cookies a měření</h2>
          <p>
            Technické cookies nutné pro přihlášení nevyžadují souhlas; bez nich by se služba
            nedala používat. Analytické a marketingové cookies (Google Analytics, Meta Pixel,
            Google Ads) nasazujeme jen se souhlasem, o který si říkáme v liště při první
            návštěvě. Odmítnutí je tam stejně dostupné jako souhlas a nemá na fungování webu
            žádný vliv.
          </p>
          <p>
            Pokud přijdete přes odkaz s parametrem kampaně nebo partnerským kódem, uložíme si
            ho na dobu návštěvy do úložiště prohlížeče, abychom věděli, který kanál funguje.
            Ke konkrétní osobě to nepřiřazujeme.
          </p>
        </article>
      </Sloupec>

      <div className="h-16" />
    </>
  );
}
