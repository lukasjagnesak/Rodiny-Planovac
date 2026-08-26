import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/session";
import { nactiOznameni } from "@/lib/oznameni-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const { novych } = await nactiOznameni(session);

  return (
    <AppShell session={session} novychOznameni={novych}>
      {children}
    </AppShell>
  );
}
