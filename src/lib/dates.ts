import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cs } from "date-fns/locale";

export const WEEK_OPTS = { weekStartsOn: 1 as const, locale: cs };

/** Datum jako `YYYY-MM-DD` v lokálním čase (ne UTC — jinak se dny posouvají). */
export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function fromDateKey(key: string): Date {
  return parseISO(`${key}T00:00:00`);
}

/** Dny jednoho měsíce. */
export function monthDays(anchor: Date): Date[] {
  return eachDayOfInterval({ start: startOfMonth(anchor), end: endOfMonth(anchor) });
}

/** Celá mřížka měsíce včetně dnů z okolních měsíců (pondělí–neděle). */
export function monthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor), WEEK_OPTS);
  const end = endOfWeek(endOfMonth(anchor), WEEK_OPTS);
  return eachDayOfInterval({ start, end });
}

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, WEEK_OPTS);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export const DOW_SHORT = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
export const DOW_LONG = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
/** Pořadí pro zobrazení týdne od pondělí. */
export const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function formatDay(date: Date | string): string {
  const d = typeof date === "string" ? fromDateKey(date.slice(0, 10)) : date;
  return format(d, "d. M. yyyy", { locale: cs });
}

export function formatDayShort(date: Date | string): string {
  const d = typeof date === "string" ? fromDateKey(date.slice(0, 10)) : date;
  return format(d, "d. M.", { locale: cs });
}

export function formatDayLong(date: Date | string): string {
  const d = typeof date === "string" ? fromDateKey(date.slice(0, 10)) : date;
  return format(d, "EEEE d. MMMM yyyy", { locale: cs });
}

export function formatMonth(date: Date): string {
  return format(date, "LLLL yyyy", { locale: cs });
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    // `HH:MM:SS` z Postgresu → `HH:MM`
    if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
    return format(parseISO(value), "H:mm", { locale: cs });
  }
  return format(value, "H:mm", { locale: cs });
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? parseISO(value) : value;
  return format(d, "d. M. yyyy H:mm", { locale: cs });
}

/** „za 3 dny“, „dnes“, „zítra“ — pro seznam nadcházejících událostí. */
export function relativeDayLabel(target: Date | string, today = new Date()): string {
  const d = typeof target === "string" ? parseISO(target) : target;
  const diff = differenceInCalendarDays(d, today);
  if (diff === 0) return "dnes";
  if (diff === 1) return "zítra";
  if (diff === 2) return "pozítří";
  if (diff === -1) return "včera";
  if (diff > 0 && diff < 7) return `za ${diff} dny`;
  if (diff >= 7 && diff < 14) return "příští týden";
  if (diff < 0) return `před ${Math.abs(diff)} dny`;
  return formatDayShort(d);
}

export function isSameDayKey(a: Date, key: string): boolean {
  return toDateKey(a) === key;
}

export { addDays, differenceInCalendarDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, parseISO };
