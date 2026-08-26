import { withAlpha } from "./format";
import type { CustodySide, FamilyMember, MemberView, Profile } from "./types";

/** Název cookie, ve které si držíme právě aktivní rodinu. */
export const ACTIVE_FAMILY_COOKIE = "rp_family";

/** Výchozí barvy podle strany, pokud si člen žádnou nenastavil. */
export const SIDE_COLOR: Record<CustodySide, string> = { a: "#4a7c6f", b: "#c4674f" };

/** Neutrální barva pro dny, které nemají přiřazenou stranu. */
export const SIDE_NEUTRAL = "#8a8074";

export function toMemberView(m: FamilyMember & { profile: Profile | null }): MemberView {
  const profile = m.profile;
  const fallbackColor = m.custody_side ? SIDE_COLOR[m.custody_side] : "#5b6470";
  return {
    id: m.id,
    userId: m.user_id,
    name: m.display_name || profile?.full_name || profile?.email || "Člen rodiny",
    email: profile?.email ?? null,
    role: m.role,
    side: m.custody_side,
    color: m.color || profile?.color || fallbackColor,
    avatarUrl: profile?.avatar_url ?? null,
    hasTelegram: Boolean(profile?.telegram_chat_id),
  };
}

/** Jméno člena podle user_id — pro popisky typu „veze táta“. */
export function memberName(members: MemberView[], userId: string | null): string {
  if (!userId) return "Nepřiřazeno";
  return members.find((m) => m.userId === userId)?.name ?? "Neznámý";
}

export function memberColor(members: MemberView[], userId: string | null): string {
  if (!userId) return "#8a8a86";
  return members.find((m) => m.userId === userId)?.color ?? "#8a8a86";
}

/** Členové stojící na dané straně kalendáře péče. */
export function sideMembers(members: MemberView[], side: CustodySide): MemberView[] {
  return members.filter((m) => m.side === side);
}

export function sideLabel(members: MemberView[], side: CustodySide | null): string {
  if (!side) return "Nenastaveno";
  const found = sideMembers(members, side);
  if (found.length > 0) return found.map((m) => m.name).join(" a ");
  return side === "a" ? "Rodič A" : "Rodič B";
}

export function sideColor(members: MemberView[], side: CustodySide | null): string {
  if (!side) return SIDE_NEUTRAL;
  const found = sideMembers(members, side);
  return found[0]?.color ?? SIDE_COLOR[side];
}

/**
 * Světlá výplň pro velké plochy — dny v kalendáři, pruhy, karty.
 *
 * Plná barva rodiče je na plochu moc silná a mřížka se v ní ztrácí,
 * proto má paleta pro každou stranu vlastní tlumený odstín. Když si
 * ale člen barvu přepsal, žádný takový token neexistuje a musí se
 * odvodit průhledností.
 */
export function sideBg(members: MemberView[], side: CustodySide | null): string {
  if (!side) return "var(--surface-2)";
  const barva = sideColor(members, side);
  if (barva.toLowerCase() === SIDE_COLOR[side]) {
    return side === "a" ? "var(--parent-a-bg)" : "var(--parent-b-bg)";
  }
  return withAlpha(barva, 0.14);
}

/** Barva textu, která je na `sideBg` čitelná. */
export function sideText(members: MemberView[], side: CustodySide | null): string {
  if (!side) return "var(--ink-muted)";
  const barva = sideColor(members, side);
  if (barva.toLowerCase() === SIDE_COLOR[side]) {
    return side === "a" ? "var(--parent-a-text)" : "var(--parent-b-text)";
  }
  return barva;
}
