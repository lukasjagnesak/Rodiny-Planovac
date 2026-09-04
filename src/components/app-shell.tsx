"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Bike,
  BookOpen,
  CalendarDays,
  CalendarHeart,
  ChevronDown,
  Globe,
  LayoutDashboard,
  Contact,
  MessageSquare,
  FileText,
  MoreHorizontal,
  Settings,
  Table2,
  Users,
  Wallet,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/format";
import { Avatar } from "@/components/ui/badge";
import { Logo, Znak } from "@/components/ui/logo";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import type { SessionContext } from "@/lib/types";

const NAV = [
  { href: "/prehled", label: "Přehled", Icon: LayoutDashboard },
  { href: "/zpravy", label: "Zprávy", Icon: MessageSquare },
  { href: "/kalendar", label: "Kalendář", Icon: CalendarDays },
  { href: "/krouzky", label: "Kroužky", Icon: Bike },
  { href: "/vydaje", label: "Výdaje", Icon: Wallet },
  { href: "/udalosti", label: "Události", Icon: CalendarHeart },
];

const SECONDARY = [
  { href: "/rozvrh", label: "Rozvrh", Icon: Table2 },
  { href: "/ukoly", label: "Ze školy", Icon: BookOpen },
  { href: "/kontakty", label: "Kontakty", Icon: Contact },
  { href: "/doklady", label: "Doklady", Icon: FileText },
  { href: "/deti", label: "Děti a rodina", Icon: Users },
  { href: "/nastaveni", label: "Nastavení", Icon: Settings },
];

/**
 * Na mobilu se do spodní lišty vejdou čtyři záložky a pátá je „Víc“.
 * Pět položek vedle sebe se na užších telefonech ořízne a zbytek aplikace
 * — rozvrh, kontakty, doklady, pozvánky, nastavení — se stane
 * nedosažitelným. Proto tudy vede cesta úplně všude.
 */
/**
 * Do spodní lišty se vejdou čtyři. Vybírají se podle toho, co rodič
 * otevírá denně — kroužky a události se řeší jednou za čas, takže patří
 * pod „Víc".
 */
const MOBIL_HLAVNI = [NAV[0], NAV[2], NAV[1], NAV[4]];
const MOBIL_ZBYTEK = [NAV[3], ...SECONDARY];

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(`${href}/`);
}

function FamilySwitcher({ session }: { session: SessionContext }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const switchTo = (id: string) => {
    document.cookie = `${ACTIVE_FAMILY_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOpen(false);
    router.refresh();
  };

  if (session.allFamilies.length <= 1) {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{session.family.name}</p>
        <p className="text-xs text-ink-subtle">
          {session.children.length}{" "}
          {session.children.length === 1 ? "dítě" : session.children.length < 5 ? "děti" : "dětí"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-left hover:bg-surface-2"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {session.family.name}
          </span>
          <span className="block text-xs text-ink-subtle">Přepnout rodinu</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-subtle" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-30 mt-1 w-56 animate-pop-in overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-pop)]">
            {session.allFamilies.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => switchTo(f.id)}
                className={cn(
                  "block w-full truncate px-3 py-2.5 text-left text-sm hover:bg-surface-2",
                  f.id === session.family.id && "font-semibold text-brand",
                )}
              >
                {f.name}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SidebarLink({
  href,
  label,
  Icon,
  odznak = 0,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  odznak?: number;
}) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-soft text-brand"
          : "text-ink-muted hover:bg-surface-2 hover:text-ink",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
      {odznak > 0 ? (
        <span className="ml-auto rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-brand-ink">
          {odznak > 9 ? "9+" : odznak}
        </span>
      ) : null}
    </Link>
  );
}

function TabLink({
  href,
  label,
  Icon,
  odznak = 0,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  odznak?: number;
}) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5"
    >
      <span
        className={cn(
          "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
          active ? "bg-brand-soft text-brand" : "text-ink-subtle",
        )}
      >
        {odznak > 0 ? (
          <span
            aria-label={`${odznak} nepřečtených`}
            className="absolute right-3 top-0.5 h-2 w-2 rounded-full bg-brand ring-2 ring-surface"
          />
        ) : null}
        <Icon className="h-[19px] w-[19px]" />
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[10.5px] font-medium",
          active ? "text-brand" : "text-ink-subtle",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

/** Zvoneček s počtem nepřečtených. Vede na jedno místo se vším novým. */
function Zvonecek({ pocet, className }: { pocet: number; className?: string }) {
  const active = useActive("/oznameni");
  return (
    <Link
      href="/oznameni"
      aria-label={pocet > 0 ? `Co je nového — ${pocet} nových` : "Co je nového"}
      className={cn(
        "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
        active ? "bg-brand-soft text-brand" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Bell className="h-[18px] w-[18px]" />
      {pocet > 0 ? (
        <span className="tnum absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
          {pocet > 9 ? "9+" : pocet}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Zbytek aplikace na mobilu. Otevírá se z páté záložky ve spodní liště
 * a kromě sekcí nabízí i cestu ven na veřejný web — z aplikace se jinak
 * není jak dostat zpátky.
 */
function VicPanel({
  open,
  onClose,
  email,
  navic = [],
}: {
  open: boolean;
  onClose: () => void;
  email?: string;
  navic?: typeof SECONDARY;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Víc" description={email ?? undefined}>
      <nav className="grid grid-cols-2 gap-2">
        {[...MOBIL_ZBYTEK, ...navic].map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-sm font-medium text-ink transition-colors hover:border-brand"
          >
            <Icon className="h-[18px] w-[18px] shrink-0 text-brand" />
            <span className="min-w-0 truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <Link
        href="/"
        onClick={onClose}
        className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink-muted hover:bg-surface-2"
      >
        <Globe className="h-[18px] w-[18px] shrink-0" />
        Zpět na klidoo.cz
      </Link>
    </Sheet>
  );
}

export function AppShell({
  session,
  children,
  novychOznameni = 0,
  neprectenychZprav = 0,
  pruh,
  spravce = false,
}: {
  session: SessionContext;
  children: React.ReactNode;
  novychOznameni?: number;
  /** Kolik zpráv od druhého rodiče jsem ještě neviděl. */
  neprectenychZprav?: number;
  /** Provozovatel navíc vidí přehled návštěvnosti. */
  spravce?: boolean;
  /** Pruh nad obsahem — konec zkušebního období, neprošlá platba. */
  pruh?: React.ReactNode;
}) {
  const me = session.members.find((m) => m.userId === session.userId);
  const druhaSkupina = spravce
    ? [...SECONDARY, { href: "/provoz", label: "Provoz", Icon: Activity }]
    : SECONDARY;
  const [vicOteviren, setVicOteviren] = React.useState(false);

  return (
    <div className="min-h-dvh lg:flex">
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <Znak size={36} />
          <FamilySwitcher session={session} />
          <Zvonecek pocet={novychOznameni} />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <SidebarLink
              key={item.href}
              {...item}
              odznak={item.href === "/zpravy" ? neprectenychZprav : 0}
            />
          ))}
          <div className="my-2 h-px bg-line" />
          {druhaSkupina.map((item) => (
            <SidebarLink key={item.href} {...item} />
          ))}
        </nav>

        <Link
          href="/nastaveni"
          className="mt-2 flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-2"
        >
          <Avatar
            name={me?.name ?? "Já"}
            color={me?.color}
            src={me?.avatarUrl}
            size={32}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">
              {me?.name ?? "Můj účet"}
            </span>
            <span className="block truncate text-xs text-ink-subtle">{session.profile.email}</span>
          </span>
        </Link>
      </aside>

      {/* ── Obsah ────────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobilní horní lišta */}
        <header className="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <Znak size={30} />
          <FamilySwitcher session={session} />
          <Zvonecek pocet={novychOznameni} className="ml-auto" />
          <Link href="/nastaveni" className="shrink-0">
            <Avatar name={me?.name ?? "Já"} color={me?.color} src={me?.avatarUrl} size={32} />
          </Link>
        </header>

        {pruh}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>

      {/* ── Mobilní spodní navigace ─────────────────────────────── */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 px-1 pt-1 backdrop-blur-md lg:hidden">
        {MOBIL_HLAVNI.map((item) => (
          <TabLink
            key={item.href}
            {...item}
            odznak={item.href === "/zpravy" ? neprectenychZprav : 0}
          />
        ))}
        <button
          type="button"
          onClick={() => setVicOteviren(true)}
          aria-haspopup="dialog"
          aria-expanded={vicOteviren}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-1.5"
        >
          <span
            className={cn(
              "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
              vicOteviren ? "bg-brand-soft text-brand" : "text-ink-subtle",
            )}
          >
            <MoreHorizontal className="h-[19px] w-[19px]" />
          </span>
          <span
            className={cn(
              "max-w-full truncate text-[10.5px] font-medium",
              vicOteviren ? "text-brand" : "text-ink-subtle",
            )}
          >
            Víc
          </span>
        </button>
      </nav>

      <VicPanel
        open={vicOteviren}
        onClose={() => setVicOteviren(false)}
        email={session.profile.email ?? undefined}
        navic={spravce ? [{ href: "/provoz", label: "Provoz", Icon: Activity }] : []}
      />
    </div>
  );
}
