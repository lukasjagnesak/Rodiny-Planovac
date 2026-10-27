import { IKONY, type NazevIkony } from "@/lib/ikony";
import { cn } from "@/lib/format";

/**
 * Ikona z vlastní sady Klidoo (lib/ikony). Barvu bere z textu okolo.
 *
 * Vnitřek SVG je pevný text ze sady, ne vstup od uživatele — proto
 * `dangerouslySetInnerHTML` nevadí a CSP ho nezastaví (není to skript).
 */
export function Ikona({
  nazev,
  size = 20,
  className,
  title,
}: {
  nazev: NazevIkony;
  size?: number;
  className?: string;
  /** Popisek pro čtečku; bez něj je ikona jen ozdoba. */
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: IKONY[nazev] }}
    />
  );
}

/**
 * Ikona na barevném podkladu — kategorie výdaje, typ události, doklad.
 * Podklad je barva kategorie v nízké sytosti, ikona v plné.
 */
export function IkonaDlazdice({
  nazev,
  barva,
  size = 36,
  className,
}: {
  nazev: NazevIkony;
  barva?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        barva ? "" : "bg-surface-2 text-ink-muted",
        className,
      )}
      style={
        barva
          ? { width: size, height: size, color: barva, backgroundColor: `${barva}1f` }
          : { width: size, height: size }
      }
      aria-hidden
    >
      <Ikona nazev={nazev} size={Math.round(size * 0.56)} />
    </span>
  );
}
