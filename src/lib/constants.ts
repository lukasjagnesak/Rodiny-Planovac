import type { EventKind, ExpenseCategory, MemberRole } from "./types";

export const EXPENSE_CATEGORIES: Record<
  ExpenseCategory,
  { label: string; emoji: string; color: string }
> = {
  alimony: { label: "Výživné", emoji: "💶", color: "#4a7c6f" },
  activities: { label: "Kroužky", emoji: "⚽", color: "#8a6f9e" },
  clothing: { label: "Oblečení", emoji: "👕", color: "#9a5b6b" },
  fun: { label: "Zábava", emoji: "🎉", color: "#b58a3c" },
  school: { label: "Škola", emoji: "🎒", color: "#5f7a8c" },
  health: { label: "Zdraví", emoji: "🩺", color: "#a8443a" },
  food: { label: "Jídlo", emoji: "🍎", color: "#4f7a45" },
  travel: { label: "Cestování", emoji: "✈️", color: "#3f7d84" },
  other: { label: "Ostatní", emoji: "📦", color: "#8a8074" },
};

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "alimony",
  "activities",
  "clothing",
  "school",
  "health",
  "fun",
  "food",
  "travel",
  "other",
];

export const EVENT_KINDS: Record<EventKind, { label: string; emoji: string; color: string }> = {
  school_trip: { label: "Škola v přírodě", emoji: "🏕️", color: "#4f7a45" },
  parent_meeting: { label: "Třídní schůzky", emoji: "🧑‍🏫", color: "#5f7a8c" },
  photo_session: { label: "Focení", emoji: "📸", color: "#9a5b6b" },
  excursion: { label: "Školní výlet", emoji: "🚌", color: "#b58a3c" },
  medical: { label: "Lékař", emoji: "🩺", color: "#a8443a" },
  birthday: { label: "Narozeniny", emoji: "🎂", color: "#8a6f9e" },
  holiday: { label: "Prázdniny", emoji: "🌴", color: "#3f7d84" },
  other: { label: "Ostatní", emoji: "📌", color: "#8a8074" },
};

export const EVENT_KIND_ORDER: EventKind[] = [
  "medical",
  "parent_meeting",
  "school_trip",
  "excursion",
  "photo_session",
  "birthday",
  "holiday",
  "other",
];

export const KONTAKT_DRUHY: Record<
  import("./types").KontaktDruh,
  { label: string; emoji: string; color: string }
> = {
  skola: { label: "Škola", emoji: "🎒", color: "#5f7a8c" },
  lekar: { label: "Lékaři", emoji: "🩺", color: "#a8443a" },
  krouzek: { label: "Kroužky", emoji: "⚽", color: "#8a6f9e" },
  rodina: { label: "Rodina a blízcí", emoji: "👨‍👩‍👧", color: "#4a7c6f" },
  jine: { label: "Ostatní", emoji: "📇", color: "#8a8074" },
};

export const KONTAKT_DRUH_ORDER: import("./types").KontaktDruh[] = [
  "skola",
  "lekar",
  "krouzek",
  "rodina",
  "jine",
];

export const DOKLAD_DRUHY: Record<
  import("./types").DokladDruh,
  { label: string; emoji: string }
> = {
  pojistenec: { label: "Kartička pojištěnce", emoji: "🏥" },
  obcanka: { label: "Občanský průkaz", emoji: "🪪" },
  pas: { label: "Cestovní pas", emoji: "🛂" },
  ockovani: { label: "Očkovací průkaz", emoji: "💉" },
  rodny_list: { label: "Rodný list", emoji: "📜" },
  jine: { label: "Jiný doklad", emoji: "📄" },
};

export const DOKLAD_DRUH_ORDER: import("./types").DokladDruh[] = [
  "pojistenec",
  "obcanka",
  "pas",
  "ockovani",
  "rodny_list",
  "jine",
];

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Správce",
  parent: "Rodič",
  guardian: "Pečující osoba",
  viewer: "Jen pro čtení",
};

export const ROLE_HINTS: Record<MemberRole, string> = {
  owner: "Může vše včetně správy členů a smazání rodiny.",
  parent: "Může přidávat a upravovat kalendář, kroužky i výdaje.",
  guardian: "Např. prarodič nebo partner — může upravovat záznamy.",
  viewer: "Vidí data, ale nemůže nic měnit.",
};

/**
 * Nabídka barev pro rodiče a děti.
 *
 * Prvními dvěma jsou výchozí barvy stran, zbytek drží stejnou zemitou
 * linku — aby si nikdo nevybral odstín, který v kalendáři vyčnívá.
 */
export const COLOR_PALETTE = [
  "#2c8671",
  "#cf7b66",
  "#5f7a8c",
  "#8a6f9e",
  "#c39553",
  "#45845d",
  "#b1604c",
  "#006b58",
  "#8a7a5c",
  "#706761",
];

export const PRICE_PERIODS: Record<string, string> = {
  season: "za pololetí",
  month: "měsíčně",
  lesson: "za lekci",
};

/** Nabídka připomínek v minutách před událostí. */
export const REMINDER_CHOICES = [
  { value: 60, label: "hodinu předem" },
  { value: 180, label: "3 hodiny předem" },
  { value: 1440, label: "den předem" },
  { value: 2880, label: "2 dny předem" },
  { value: 10080, label: "týden předem" },
];

export const NAV_ITEMS = [
  { href: "/prehled", label: "Přehled", icon: "LayoutDashboard" },
  { href: "/kalendar", label: "Kalendář", icon: "CalendarDays" },
  { href: "/krouzky", label: "Kroužky", icon: "Bike" },
  { href: "/vydaje", label: "Výdaje", icon: "Wallet" },
  { href: "/udalosti", label: "Události", icon: "CalendarHeart" },
] as const;
