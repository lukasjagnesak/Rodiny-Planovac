"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

/**
 * Vodorovný karusel pro sekce, kde je dlaždic víc, než se dá přečíst.
 *
 * Šest funkcí pod sebou znamená na telefonu šest obrazovek scrollování —
 * a kdo přijde na web se zájmem, ale bez trpělivosti, dočte první dvě
 * a odejde. Vedle sebe se dají projet palcem za pár vteřin.
 *
 * Postavené na `scroll-snap`, ne na knihovně. Prohlížeč to umí sám,
 * takže setrvačnost, chování na dotek i čtečka obrazovky fungují bez
 * dvaceti kilobajtů javascriptu navíc a bez toho, aby se karusel
 * rozbil, když se skript nenačte.
 *
 * Poslední dlaždice schválně nekončí u okraje: kus další je vidět, aby
 * bylo poznat, že se dá posunout. Karusel, u kterého to poznat není,
 * je jen ořezaný seznam.
 */
export function Karusel({
  popis,
  className,
  children,
}: {
  /** Co karusel obsahuje — pro čtečku obrazovky. */
  popis: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pas = React.useRef<HTMLDivElement>(null);
  const [muzeVlevo, setMuzeVlevo] = React.useState(false);
  const [muzeVpravo, setMuzeVpravo] = React.useState(true);

  const prepocti = React.useCallback(() => {
    const el = pas.current;
    if (!el) return;
    // Jednička navíc kvůli zaokrouhlování při zoomu — bez ní zůstane
    // šipka aktivní i na konci a klikání nic nedělá.
    setMuzeVlevo(el.scrollLeft > 1);
    setMuzeVpravo(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  React.useEffect(() => {
    prepocti();
    const el = pas.current;
    if (!el) return;
    const zmena = new ResizeObserver(prepocti);
    zmena.observe(el);
    return () => zmena.disconnect();
  }, [prepocti]);

  function posun(smer: -1 | 1) {
    const el = pas.current;
    if (!el) return;
    // O celou viditelnou šířku, ne o jednu dlaždici: na širokém displeji
    // jich je vedle sebe víc a posun po jedné vypadá, že se nic nestalo.
    el.scrollBy({ left: smer * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={pas}
        onScroll={prepocti}
        role="region"
        aria-label={popis}
        tabIndex={0}
        className={cn(
          "bez-posuvniku flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1",
          // Dlaždice smí přetéct přes okraj sloupce až k okraji displeje,
          // aby bylo vidět, že seznam pokračuje. Odsazení to vrací zpět.
          "-mx-5 px-5 sm:mx-0 sm:px-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        )}
      >
        {React.Children.map(children, (dite, i) => (
          <div
            key={i}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%]"
          >
            {dite}
          </div>
        ))}
      </div>

      {/* Šipky jsou jen tam, kde není dotek — na mobilu se posouvá prstem
          a dvě tlačítka navíc by jen ubrala místo. */}
      <div className="mt-5 hidden gap-2 sm:flex">
        <Sipka smer={-1} aktivni={muzeVlevo} onClick={() => posun(-1)} />
        <Sipka smer={1} aktivni={muzeVpravo} onClick={() => posun(1)} />
      </div>
    </div>
  );
}

function Sipka({
  smer,
  aktivni,
  onClick,
}: {
  smer: -1 | 1;
  aktivni: boolean;
  onClick: () => void;
}) {
  const Ikona = smer === -1 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!aktivni}
      aria-label={smer === -1 ? "Předchozí" : "Další"}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors",
        "hover:border-brand hover:text-brand",
        "disabled:pointer-events-none disabled:opacity-35",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
      )}
    >
      <Ikona className="h-5 w-5" />
    </button>
  );
}
