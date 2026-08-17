import type { EventKind, ExpenseCategory, MemberRole } from "./types";

export const EXPENSE_CATEGORIES: Record<
  ExpenseCategory,
  { label: string; emoji: string; color: string }
> = {
  alimony: { label: "Výživné", emoji: "💶", color: "#2f6f5e" },
  activities: { label: "Kroužky", emoji: "⚽", color: "#7c5cd6" },
  clothing: { label: "Oblečení", emoji: "👕", color: "#d9557a" },
  fun: { label: "Zábava", emoji: "🎉", color: "#e0a24a" },
  school: { label: "Škola", emoji: "🎒", color: "#3f74e0" },
  health: { label: "Zdraví", emoji: "🩺", color: "#c2453d" },
  food: { label: "Jídlo", emoji: "🍎", color: "#7aa63f" },
  travel: { label: "Cestování", emoji: "✈️", color: "#3aa8b8" },
  other: { label: "Ostatní", emoji: "📦", color: "#8a8a86" },
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
  school_trip: { label: "Škola v přírodě", emoji: "🏕️", color: "#7aa63f" },
  parent_meeting: { label: "Třídní schůzky", emoji: "🧑‍🏫", color: "#3f74e0" },
  photo_session: { label: "Focení", emoji: "📸", color: "#d9557a" },
  excursion: { label: "Školní výlet", emoji: "🚌", color: "#e0a24a" },
  medical: { label: "Lékař", emoji: "🩺", color: "#c2453d" },
  birthday: { label: "Narozeniny", emoji: "🎂", color: "#7c5cd6" },
  holiday: { label: "Prázdniny", emoji: "🌴", color: "#3aa8b8" },
  other: { label: "Ostatní", emoji: "📌", color: "#8a8a86" },
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

/** Nabídka barev pro rodiče a děti. */
export const COLOR_PALETTE = [
  "#3f74e0",
  "#d9557a",
  "#2f6f5e",
  "#7c5cd6",
  "#e0a24a",
  "#3aa8b8",
  "#c2453d",
  "#7aa63f",
  "#b5761b",
  "#5b6470",
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
