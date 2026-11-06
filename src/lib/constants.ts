import type { EdupageDruh, EventKind, ExpenseCategory, MemberRole } from "./types";
import type { NazevIkony } from "./ikony";
import { BARVY_IKON } from "./barvy";

export const EXPENSE_CATEGORIES: Record<
  ExpenseCategory,
  { label: string; ikona: NazevIkony; color: string }
> = {
  alimony: { label: "Výživné", ikona: "bankovka", color: BARVY_IKON.znacka },
  activities: { label: "Kroužky", ikona: "mic", color: BARVY_IKON.terakota },
  clothing: { label: "Oblečení", ikona: "tricko", color: BARVY_IKON.modra },
  fun: { label: "Zábava", ikona: "hvezda", color: BARVY_IKON.jantar },
  school: { label: "Škola", ikona: "batoh", color: BARVY_IKON.znackaTmava },
  health: { label: "Zdraví", ikona: "srdce", color: BARVY_IKON.cervena },
  food: { label: "Jídlo", ikona: "jablko", color: BARVY_IKON.zelena },
  travel: { label: "Cestování", ikona: "letadlo", color: BARVY_IKON.terakotaTmava },
  other: { label: "Ostatní", ikona: "krabice", color: BARVY_IKON.seda },
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

export const EVENT_KINDS: Record<EventKind, { label: string; ikona: NazevIkony; color: string }> = {
  school_trip: { label: "Škola v přírodě", ikona: "stan", color: BARVY_IKON.zelena },
  parent_meeting: { label: "Třídní schůzky", ikona: "tabule", color: BARVY_IKON.znackaTmava },
  photo_session: { label: "Focení", ikona: "fotoaparat", color: BARVY_IKON.terakotaTmava },
  excursion: { label: "Školní výlet", ikona: "autobus", color: BARVY_IKON.modra },
  medical: { label: "Lékař", ikona: "lekar", color: BARVY_IKON.cervena },
  birthday: { label: "Narozeniny", ikona: "dort", color: BARVY_IKON.terakota },
  holiday: { label: "Prázdniny", ikona: "prazdniny", color: BARVY_IKON.jantar },
  other: { label: "Ostatní", ikona: "spendlik", color: BARVY_IKON.seda },
};

/**
 * Druhy položek z EduPage. Barvy jsou tady, ne u obrazovky s úkoly —
 * kreslí se i na přehledu a dvě sady barev pro touž věc by se dřív nebo
 * později rozešly.
 */
export const EDUPAGE_DRUHY: Record<EdupageDruh, { label: string; color: string }> = {
  ukol: { label: "Úkol", color: BARVY_IKON.modra },
  pisemka: { label: "Písemka", color: BARVY_IKON.cervena },
  zprava: { label: "Zpráva", color: BARVY_IKON.znacka },
  akce: { label: "Akce školy", color: BARVY_IKON.jantar },
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
  { label: string; ikona: NazevIkony; color: string }
> = {
  skola: { label: "Škola", ikona: "skola", color: BARVY_IKON.znackaTmava },
  lekar: { label: "Lékaři", ikona: "lekar", color: BARVY_IKON.cervena },
  krouzek: { label: "Kroužky", ikona: "mic", color: BARVY_IKON.terakota },
  rodina: { label: "Rodina a blízcí", ikona: "rodina", color: BARVY_IKON.znacka },
  jine: { label: "Ostatní", ikona: "vizitka", color: BARVY_IKON.seda },
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
  { label: string; ikona: NazevIkony }
> = {
  pojistenec: { label: "Kartička pojištěnce", ikona: "karta_zdravi" },
  obcanka: { label: "Občanský průkaz", ikona: "vizitka" },
  pas: { label: "Cestovní pas", ikona: "pas" },
  ockovani: { label: "Očkovací průkaz", ikona: "strikacka" },
  rodny_list: { label: "Rodný list", ikona: "listina" },
  jine: { label: "Jiný doklad", ikona: "dokument" },
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
  guardian: "Prarodič, nový partner, teta, chůva — může upravovat záznamy.",
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
