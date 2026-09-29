import * as React from "react";
import { ZNACKA } from "@/lib/brand";
import { formatMoney } from "@/lib/format";
import type { Souhrn } from "@/lib/souhrn";
import type { SessionContext } from "@/lib/types";

/**
 * Vytištěná podoba souhrnu.
 *
 * Píše se to jako listina, ne jako obrazovka: bez barevných ploch, bez
 * ikon, s viditelnými čísly. Advokát to zakládá do spisu a soudce čte
 * na papíře.
 *
 * Dvě věci, které se nesmí ztratit ani při úpravách rozvržení:
 * období musí být v hlavičce vypsané slovy i daty, a dole musí zůstat
 * odstavec o tom, odkud čísla jsou. Dokument, který vypadá jako výpis
 * z úřední evidence a přitom shrnuje záznamy rodičů, je nepoctivý
 * a advokátovi nakonec uškodí.
 */

function datum(klic: string): string {
  return new Date(`${klic}T00:00:00`).toLocaleDateString("cs-CZ");
}

function Sekce({ nadpis, children }: { nadpis: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid border-t border-line pt-4">
      <h2 className="mb-3 font-display text-base font-semibold text-ink">{nadpis}</h2>
      {children}
    </section>
  );
}

function Tabulka({ hlavicka, radky }: { hlavicka: string[]; radky: React.ReactNode[][] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-line">
          {hlavicka.map((h, i) => (
            <th
              key={h}
              className={`py-2 font-medium text-ink-muted ${i === 0 ? "text-left" : "text-right"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {radky.map((radek, i) => (
          <tr key={i} className="border-b border-line last:border-0">
            {radek.map((bunka, j) => (
              <td
                key={j}
                className={`py-2 ${j === 0 ? "text-left text-ink" : "text-right tnum text-ink"}`}
              >
                {bunka}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Prazdno({ text }: { text: string }) {
  return <p className="text-sm text-ink-muted">{text}</p>;
}

export function SouhrnDokument({
  souhrn,
  session,
}: {
  souhrn: Souhrn;
  session: SessionContext;
}) {
  const mena = session.family.currency;
  const rodice = session.members.filter((m) => m.role === "owner" || m.role === "parent");
  const jmenoA = rodice.find((m) => m.side === "a")?.name ?? "Rodič A";
  const jmenoB = rodice.find((m) => m.side === "b")?.name ?? "Rodič B";

  return (
    <article className="card space-y-5 p-5 text-ink sm:p-7 print:border-0 print:p-0 print:shadow-none">
      {/* `div`, ne `header`: pravidlo pro tisk schovává `header` kvůli
          navigaci na webu a schovalo by i hlavičku téhle listiny. */}
      <div className="space-y-1">
        <h1 className="font-display text-lg font-semibold">
          Souhrn péče a nákladů
        </h1>
        <p className="text-sm text-ink-muted">
          Rodina <strong className="text-ink">{session.family.name}</strong> ·{" "}
          {session.children.map((d) => d.name).join(", ") || "bez zapsaných dětí"}
        </p>
        <p className="text-sm text-ink-muted">
          Období <strong className="text-ink">{datum(souhrn.od)} – {datum(souhrn.do)}</strong>
        </p>
      </div>

      <Sekce nadpis="Noci u rodičů">
        {souhrn.noci.celkem === 0 ? (
          <Prazdno text="Za tohle období není zapsaný žádný vzor střídání, ze kterého by šly noci spočítat." />
        ) : (
          <>
            <Tabulka
              hlavicka={["Rodič", "Nocí", "Podíl"]}
              radky={[
                [jmenoA, souhrn.noci.a, `${souhrn.noci.procentA} %`],
                [jmenoB, souhrn.noci.b, `${souhrn.noci.procentB} %`],
                [
                  <strong key="c">Celkem</strong>,
                  <strong key="n">{souhrn.noci.celkem}</strong>,
                  "100 %",
                ],
              ]}
            />
            {souhrn.noci.neprirazeno > 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                {souhrn.noci.neprirazeno} nocí nebylo možné přiřadit — pro tu část období
                chybí vzor střídání.
              </p>
            ) : null}

            {/* Když má každé dítě vlastní rozpis, je součet za rodinu
                nepřesný. Rozpad po dětech to udrží pravdivé. */}
            {souhrn.deti.length > 1 ? (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-medium text-ink-muted">Podle dětí</h3>
                <Tabulka
                  hlavicka={["Dítě", `${jmenoA} — nocí`, `${jmenoB} — nocí`]}
                  radky={souhrn.deti.map((d) => [d.dite.name, d.noci.a, d.noci.b])}
                />
              </div>
            ) : null}
          </>
        )}
      </Sekce>

      <Sekce nadpis="Náklady na děti">
        {souhrn.vydajeCelkem === 0 ? (
          <Prazdno text="Za tohle období nejsou zapsané žádné výdaje." />
        ) : (
          <>
            <p className="mb-3 text-sm">
              Celkem za období:{" "}
              <strong className="tnum">{formatMoney(souhrn.vydajeCelkem, mena)}</strong>
            </p>

            <Tabulka
              hlavicka={["Kategorie", "Položek", "Částka"]}
              radky={souhrn.podleKategorii.map((k) => [
                k.nazev,
                k.pocet,
                formatMoney(k.castka, mena),
              ])}
            />

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-medium text-ink-muted">Kdo výdaje uhradil</h3>
              <Tabulka
                hlavicka={["Rodič", "Položek", "Zaplaceno"]}
                radky={souhrn.podleRodice.map((r) => [
                  r.jmeno,
                  r.pocet,
                  formatMoney(r.zaplatil, mena),
                ])}
              />
              {/* Rozdíl mezi „kdo zaplatil" a „kdo to nese" je přesně to,
                  o čem bývá spor. Proto obojí, ne jen jedno. */}
              <p className="mt-2 text-xs text-ink-muted">
                Uvedené částky jsou to, co který rodič skutečně uhradil. Jak se výdaj dělí
                mezi rodiče, je u každé položky zvlášť a promítá se do dorovnání níž.
              </p>
            </div>

            {souhrn.nevyrovnano ? (
              <p className="mt-4 text-sm">
                Z výdajů, které dosud nebyly vypořádány, zbývá dorovnat{" "}
                <strong className="tnum">
                  {formatMoney(souhrn.nevyrovnano.castka, mena)}
                </strong>
                . Příjemce: <strong>{souhrn.nevyrovnano.jmeno}</strong>.
              </p>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                Nevypořádané výdaje jsou mezi rodiči srovnané.
              </p>
            )}
          </>
        )}
      </Sekce>

      <Sekce nadpis="Doprava na kroužky">
        {souhrn.dopravaCelkem === 0 ? (
          <Prazdno text="Za tohle období nejsou zapsané žádné kroužky." />
        ) : (
          <>
            <Tabulka
              hlavicka={["Rodič", "Tam", "Zpět", "Celkem jízd"]}
              radky={souhrn.doprava.map((d) => [d.jmeno, d.tam, d.zpet, d.celkem])}
            />
            <p className="mt-2 text-xs text-ink-muted">
              Cesta tam a cesta zpět se počítají zvlášť. Zrušené termíny se nepočítají.
              {souhrn.dopravaBezRidice > 0
                ? ` U ${souhrn.dopravaBezRidice} z celkových ${souhrn.dopravaCelkem} jízd není zapsáno, kdo vezl.`
                : ""}
            </p>
          </>
        )}
      </Sekce>

      <div className="break-inside-avoid border-t border-line pt-4 text-xs leading-relaxed text-ink-muted">
        <p>
          Dokument shrnuje záznamy, které si rodina sama vede v aplikaci {ZNACKA}, a to
          za období uvedené v hlavičce. Nejde o výpis z úřední evidence ani o nezávislé
          měření — úplnost čísel odpovídá tomu, jak podrobně rodiče zapisovali.
        </p>
        <p className="mt-1.5">
          Vygenerováno {new Date().toLocaleString("cs-CZ")} · {ZNACKA} · klidoo.cz
        </p>
      </div>
    </article>
  );
}
