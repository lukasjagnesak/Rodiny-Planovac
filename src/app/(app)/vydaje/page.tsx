import type { Metadata } from "next";
import { endOfMonth, parseISO, startOfMonth, subMonths } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/session";
import { toDateKey } from "@/lib/dates";
import { ExpensesScreen } from "@/components/expenses/expenses-screen";
import type { Expense } from "@/lib/types";

export const metadata: Metadata = { title: "Výdaje" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; novy?: string }>;
}) {
  const { m, novy } = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();

  const anchor = m && /^\d{4}-\d{2}$/.test(m) ? parseISO(`${m}-01T00:00:00`) : new Date();

  // Načítáme 6 měsíců zpět kvůli grafu vývoje.
  const chartFrom = toDateKey(startOfMonth(subMonths(anchor, 5)));
  const to = toDateKey(endOfMonth(anchor));

  const { data } = await supabase
    .from("expenses")
    .select("*, receipts(*)")
    .eq("family_id", session.family.id)
    .gte("spent_on", chartFrom)
    .lte("spent_on", to)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <ExpensesScreen
      session={session}
      expenses={(data ?? []) as Expense[]}
      monthKey={toDateKey(startOfMonth(anchor)).slice(0, 7)}
      prefillDate={novy ?? null}
    />
  );
}
