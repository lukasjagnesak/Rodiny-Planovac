import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency = "CZK", compact = false): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    notation: compact && Math.abs(amount) >= 100000 ? "compact" : "standard",
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("cs-CZ").format(value);
}

/** Skloňování: 1 noc, 2–4 noci, 5+ nocí. */
export function pluralCs(count: number, one: string, few: string, many: string): string {
  const n = Math.abs(count);
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export function nights(count: number): string {
  return `${count} ${pluralCs(count, "noc", "noci", "nocí")}`;
}

/** Dny, které jsou v kalendáři zaškrtnuté. Není to totéž co noci. */
export function days(count: number): string {
  return `${count} ${pluralCs(count, "den", "dny", "dní")}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Barva textu s dostatečným kontrastem na daném pozadí. */
export function contrastInk(hex: string): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? "#1a1a18" : "#ffffff";
}

/** Poloprůhledná varianta barvy pro jemné podbarvení buňky kalendáře. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${clean}${a}`;
}
