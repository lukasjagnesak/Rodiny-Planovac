"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  BookOpen,
  CalendarDays,
  CalendarHeart,
  ChevronDown,
  LayoutDashboard,
  Settings,
  Table2,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/format";
import { Avatar } from "@/components/ui/badge";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import type { SessionContext } from "@/lib/types";

const NAV = [
  { href: "/prehled", label: "Přehled", Icon: LayoutDashboard },
  { href: "/kalendar", label: "Kalendář", Icon: CalendarDays },
  { href: "/krouzky", label: "Kroužky", Icon: Bike },
  { href: "/vydaje", label: "Výdaje", Icon: Wallet },
  { href: "/udalosti", label: "Události", Icon: CalendarHeart },
];

const SECONDARY = [
  { href: "/rozvrh", label: "Rozvrh", Icon: Table2 },
  { href: "/ukoly", label: "Ze školy", Icon: BookOpen },
  { href: "/deti", label: "Děti a rodina", Icon: Users },
  { href: "/nastaveni", label: "Nastavení", Icon: Settings },
];

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
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
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
    </Link>
  );
}

function TabLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
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
          "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
          active ? "bg-brand-soft text-brand" : "text-ink-subtle",
        )}
      >
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

export function AppShell({
  session,
  children,
}: {
  session: SessionContext;
  children: React.ReactNode;
}) {
  const me = session.members.find((m) => m.userId === session.userId);

  return (
    <div className="min-h-dvh lg:flex">
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 pb-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink">
            <CalendarHeart className="h-5 w-5" />
          </div>
          <FamilySwitcher session={session} />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <SidebarLink key={item.href} {...item} />
          ))}
          <div className="my-2 h-px bg-line" />
          {SECONDARY.map((item) => (
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-ink">
            <CalendarHeart className="h-4 w-4" />
          </div>
          <FamilySwitcher session={session} />
          <Link href="/nastaveni" className="ml-auto shrink-0">
            <Avatar name={me?.name ?? "Já"} color={me?.color} src={me?.avatarUrl} size={32} />
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>

      {/* ── Mobilní spodní navigace ─────────────────────────────── */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 px-1 pt-1 backdrop-blur-md lg:hidden">
        {NAV.map((item) => (
          <TabLink key={item.href} {...item} />
        ))}
      </nav>
    </div>
  );
}
