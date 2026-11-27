/**
 * Volání nativních pluginů z webu, který běží v aplikaci z obchodu.
 *
 * Web neimportuje balíčky Capacitoru — obal je do stránky vkládá sám
 * jako `window.Capacitor.Plugins`. Na běžném webu tu nic není a všechny
 * funkce tiše nic nedělají.
 */

type Posluchac = { remove: () => Promise<void> | void };

interface CapacitorOkno {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;
}

function cap(): CapacitorOkno | null {
  if (typeof window === "undefined") return null;
  const c = (window as unknown as { Capacitor?: CapacitorOkno }).Capacitor;
  return c?.isNativePlatform?.() ? c : null;
}

export function jeNativni(): boolean {
  return cap() !== null;
}

/** "ios" | "android" | null */
export function platforma(): "ios" | "android" | null {
  const p = cap()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : null;
}

export function plugin<T = Record<string, (...args: never[]) => Promise<unknown>>>(jmeno: string): T | null {
  return (cap()?.Plugins?.[jmeno] as T | undefined) ?? null;
}

export type { Posluchac };
