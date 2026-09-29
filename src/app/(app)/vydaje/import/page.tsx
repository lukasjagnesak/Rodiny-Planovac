import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { ImportScreen } from "@/components/expenses/import-screen";

export const metadata: Metadata = { title: "Import výdajů" };

export default async function ImportPage() {
  const session = await requireSession();
  return <ImportScreen session={session} />;
}
