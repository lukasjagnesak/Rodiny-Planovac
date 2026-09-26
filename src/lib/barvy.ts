/**
 * Barvy značky pro místa, kde nejde použít CSS.
 *
 * Paleta žije v `app/globals.css` jako oklch. PDF ale umí jen RGB,
 * takže se tu čísla opakují a převádějí. Aby se ty dva seznamy
 * nerozešly, hlídá je `npm run test:barvy-pdf`: přečte `globals.css`
 * a porovná hodnoty. Když někdo změní odstín v CSS a zapomene tady,
 * test spadne.
 */

export type Oklch = readonly [svetlost: number, sytost: number, odstin: number];

/** Stejné trojice jako v `globals.css`. Svetlost je v procentech. */
export const PALETA = {
  ink: [24, 0.014, 55],
  inkMuted: [52, 0.014, 55],
  inkSubtle: [70, 0.012, 60],
  line: [90, 0.012, 70],
  canvas: [98, 0.012, 75],
  brand: [53, 0.09, 175],
  brandSoft: [94, 0.035, 175],
  parentA: [56, 0.09, 175],
  parentB: [67, 0.11, 35],
} as const satisfies Record<string, Oklch>;

export type NazevBarvy = keyof typeof PALETA;

function naSRGB(kanal: number): number {
  const c = kanal <= 0.0031308 ? 12.92 * kanal : 1.055 * Math.pow(kanal, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, c));
}

/**
 * oklch → sRGB v rozsahu 0–1.
 *
 * Postup podle specifikace CSS Color 4: válcové souřadnice na oklab,
 * oklab na LMS, LMS na lineární sRGB a nakonec gama.
 */
export function oklchNaRgb([svetlost, sytost, odstin]: Oklch): [number, number, number] {
  const L = svetlost / 100;
  const uhel = (odstin * Math.PI) / 180;
  const a = sytost * Math.cos(uhel);
  const b = sytost * Math.sin(uhel);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    naSRGB(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    naSRGB(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    naSRGB(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/** Barva ve tvaru, kterému rozumí PDF: „0.235 0.612 0.588“. */
export function proPdf(nazev: NazevBarvy): string {
  return oklchNaRgb(PALETA[nazev])
    .map((k) => k.toFixed(4))
    .join(" ");
}

/** Šestnáctkově, pro kontrolu okem. */
export function naHex(nazev: NazevBarvy): string {
  return (
    "#" +
    oklchNaRgb(PALETA[nazev])
      .map((k) => Math.round(k * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}
