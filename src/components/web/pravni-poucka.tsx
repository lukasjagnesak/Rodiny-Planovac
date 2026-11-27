import Link from "next/link";
import { cn } from "@/lib/format";

/**
 * Poučka pod formuláři: souhlas s podmínkami a informace o zpracování
 * osobních údajů. Jeden text pro celý web, ať se nikde nerozejde.
 *
 * Schválně oddělené od marketingového souhlasu. Tohle je informace
 * (zpracování na základě smlouvy), ne souhlas se zasíláním nabídek —
 * ten je vždy samostatný, nezaškrtnutý checkbox.
 *
 * „Berete na vědomí“ místo „seznámil/a jste se“: stejný právní význam
 * a bez lomítka v rodu.
 */
export function PravniPoucka({
  druh,
  tmavy = false,
  className,
}: {
  /** registrace = účet; odber = formulář s e-mailem (materiál, PDF, newsletter). */
  druh: "registrace" | "odber";
  tmavy?: boolean;
  className?: string;
}) {
  const odkaz = cn(
    "underline underline-offset-2",
    tmavy ? "text-vyzva-ink" : "hover:text-ink",
  );
  return (
    <p
      className={cn(
        "text-xs leading-relaxed",
        tmavy ? "text-[var(--vyzva-ink-muted)]" : "text-ink-subtle",
        className,
      )}
    >
      {druh === "registrace" ? "Registrací souhlasíte s " : "Odběrem souhlasíte s "}
      <Link href="/obchodni-podminky" className={odkaz}>
        {druh === "registrace" ? "obchodními podmínkami" : "podmínkami užívání služby"}
      </Link>{" "}
      a berete na vědomí{" "}
      <Link href="/zasady-ochrany-osobnich-udaju" className={odkaz}>
        informace o zpracování osobních údajů
      </Link>
      .
    </p>
  );
}
