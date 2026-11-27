import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { nactiOznameni, oznacPrectene } from "@/lib/oznameni-server";
import { OznameniScreen } from "@/components/oznameni/oznameni-screen";

export const metadata: Metadata = { title: "Co je nového" };

export default async function OznameniPage() {
  const session = await requireSession();
  const { oznameni, videnoDo } = await nactiOznameni(session);

  // Značka „viděno" se posouvá až po vykreslení, aby si uživatel novinky
  // v tomhle načtení ještě odlišil. Příště už budou obyčejné.
  await oznacPrectene(session);

  return (
    <OznameniScreen session={session} oznameni={oznameni} videnoDo={videnoDo} />
  );
}
