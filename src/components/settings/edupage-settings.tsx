"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, GraduationCap, RefreshCw, Search, Trash2, Unlink } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, Spinner } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import { normalizujSubdomenu } from "@/lib/edupage-adresa";
import type { Child, EdupageDite } from "@/lib/types";

interface Account {
  email: string;
  subdomena: string | null;
  je_rodic: boolean;
  last_sync_at: string | null;
  last_sync_error: string | null;
}

export function EdupageSettings({
  account,
  edupageDeti,
  deti,
  configured,
}: {
  account: Account | null;
  /** Děti nalezené v EduPage a jejich párování. */
  edupageDeti: EdupageDite[];
  /** Děti vedené v plánovači. */
  deti: Child[];
  configured: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [heslo, setHeslo] = React.useState("");
  const [subdomena, setSubdomena] = React.useState("");
  // Adresa se čistí hned při psaní: celý odkaz z prohlížeče projde,
  // název školy se zastaví tady, ne až anglickou hláškou od EduPage.
  const adresa = React.useMemo(() => normalizujSubdomenu(subdomena), [subdomena]);
  const potizAdresy = subdomena.trim() ? adresa.chyba : null;
  const [rucniId, setRucniId] = React.useState("");
  const [busy, setBusy] = React.useState<
    "connect" | "sync" | "disconnect" | "deti" | "parovani" | null
  >(null);
  // Když hledání dětí selže, ukážeme názvy polí, která škola v datech
  // opravdu má. Bez nich se hledání nedá doladit jinak než hádáním.
  const [klice, setKlice] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function connect() {
    setBusy("connect");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/edupage/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, heslo, subdomena: adresa.subdomena }),
    });
    const data = await response.json();

    setBusy(null);
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setHeslo("");
    setMessage(
      data.jeRodic
        ? "Účet propojen — je to rodičovský účet."
        : "Účet propojen.",
    );
    router.refresh();
  }

  /** Zeptá se EduPage, jaké děti účet vidí. */
  async function najdiDeti() {
    setBusy("deti");
    setError(null);
    setMessage(null);
    // Výpis z minulého pokusu musí zmizet hned. Když se hledání pokazí,
    // starý rámeček by tvrdil, že platí — a hledá se pak chyba jinde.
    setKlice([]);

    const response = await fetch("/api/edupage/deti", { method: "POST" });
    const data = await response.json();

    setBusy(null);
    if (!response.ok) {
      setError(data.error);
      return;
    }

    if (data.nalezeno === 0) {
      // Není to chyba spojení, ale výsledek je k ničemu — proto varování,
      // ne zelené potvrzení.
      setError(
        data.potize
          ? `Hledání dětí selhalo: ${data.potize}`
          : "V účtu se žádné dítě najít nepodařilo. Zadej ID ručně — jak na to je níž.",
      );
      setKlice(Array.isArray(data.klice) ? data.klice : []);
    } else {
      setKlice([]);
      setMessage(`Nalezeno ${data.nalezeno} dětí, nových ${data.pridano}. Teď je přiřaď.`);
    }
    router.refresh();
  }

  /** Přiřadí dítě z EduPage k dítěti v plánovači. */
  async function paruj(edupageId: number, childId: string, jmeno: string | null) {
    setBusy("parovani");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/edupage/deti", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edupageId, childId: childId || null, jmeno }),
    });
    const data = await response.json();

    setBusy(null);
    if (!response.ok) {
      setError(data.error);
      return;
    }
    router.refresh();
  }

  async function pridejRucne() {
    const cislo = Number(rucniId.trim());
    // Záporná ID jsou platná, EduPage je tak u dětí rodiče opravdu vede.
    if (!Number.isInteger(cislo) || cislo === 0) {
      setError("ID dítěte musí být celé číslo různé od nuly.");
      return;
    }
    await paruj(cislo, "", null);
    setRucniId("");
    setMessage("Dítě přidáno. Teď mu vyber, komu v plánovači odpovídá.");
  }

  async function odeber(edupageId: number) {
    setBusy("parovani");
    await fetch(`/api/edupage/deti?edupageId=${edupageId}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  async function sync() {
    setBusy("sync");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/edupage/sync", { method: "POST" });
    const data = await response.json();

    setBusy(null);
    if (!response.ok) {
      setError(data.error);
      return;
    }
    // U víc dětí se říká, co přišlo kterému. „Staženo 47 položek" vypadá
    // úplně stejně, ať přišly od obou dětí, nebo jen od jednoho — a přesně
    // to schovalo chybu v přepínání účtů na několik týdnů.
    const souhrn = (data.souhrn ?? []) as {
      jmeno: string;
      udalosti: number;
      ulozeno: number;
    }[];
    const rozpad =
      souhrn.length > 1
        ? " " + souhrn.map((s) => `${s.jmeno}: ${s.udalosti}`).join(", ") + "."
        : "";
    setMessage(
      (data.zprav > 0
        ? `Staženo ${data.pocet} položek, z toho ${data.zprav} zpráv.`
        : `Staženo ${data.pocet} položek.`) + rozpad,
    );
    if (data.chyby?.length > 0) setError(data.chyby.join(" · "));
    router.refresh();
  }

  async function disconnect() {
    setBusy("disconnect");
    await fetch("/api/edupage/connect", { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">EduPage</h1>
        <p className="text-sm text-ink-muted">
          Stáhne úkoly, písemky a školní akce, ať je vidí oba rodiče na jednom místě.
        </p>
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      {!configured ? (
        <Card>
          <CardBody>
            <Alert tone="warning">
              Propojení není na serveru zapnuté. Chybí <code>EDUPAGE_SIDECAR_URL</code> nebo{" "}
              <code>EDUPAGE_SIDECAR_SECRET</code> — postup je v README.
            </Alert>
          </CardBody>
        </Card>
      ) : account ? (
        <>
          <Card>
            <CardBody className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{account.email}</p>
                <p className="text-sm text-ink-muted">
                  {account.je_rodic ? "Rodičovský účet" : "Účet žáka"}
                  {account.last_sync_at
                    ? ` · naposledy ${formatDateTime(account.last_sync_at)}`
                    : " · zatím nestaženo"}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Děti"
              description={
                account.je_rodic
                  ? "Rodičovský účet vidí data dítěte až po přepnutí na něj. Přiřaď, kdo je kdo."
                  : "Žákovský účet stahuje sám sebe. Přiřaď, kterému dítěti odpovídá."
              }
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={najdiDeti}
                  disabled={busy === "deti"}
                >
                  {busy === "deti" ? <Spinner /> : <Search className="h-4 w-4" />}
                  Najít
                </Button>
              }
            />
            <CardBody className="space-y-3 pt-3">
              {edupageDeti.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Zatím nic. Zkus <strong className="text-ink">Najít</strong> — a když se
                  nenajde nic, přidej ID ručně níž.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {edupageDeti.map((d) => (
                    <li key={d.edupage_id} className="flex flex-wrap items-center gap-2 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {d.jmeno ?? `Dítě ${d.edupage_id}`}
                        </span>
                        <span className="tnum block text-xs text-ink-subtle">
                          ID {d.edupage_id}
                        </span>
                      </span>

                      <Select
                        className="w-44"
                        value={d.child_id ?? ""}
                        disabled={busy === "parovani"}
                        onChange={(e) => paruj(d.edupage_id, e.target.value, d.jmeno)}
                      >
                        <option value="">— nestahovat —</option>
                        {deti.map((dite) => (
                          <option key={dite.id} value={dite.id}>
                            {dite.name}
                          </option>
                        ))}
                      </Select>

                      <button
                        type="button"
                        onClick={() => odeber(d.edupage_id)}
                        disabled={busy === "parovani"}
                        aria-label="Odebrat"
                        className="rounded-lg p-2 text-ink-subtle hover:bg-surface-2 hover:text-danger disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {deti.length === 0 ? (
                <Alert tone="warning">
                  V plánovači zatím nemáš žádné dítě, takže není k čemu přiřazovat.
                </Alert>
              ) : null}

              {klice.length > 0 ? (
                <div className="rounded-xl border border-line bg-surface-2 p-3">
                  <p className="text-sm font-medium text-ink">
                    Co škola v datech má
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Struktura se mezi školami liší a v téhle se děti nenašly.
                    Níž je jen tvar dat — názvy polí a typy, žádné hodnoty ani
                    osobní údaje. Pošli ho, ať jde hledání doladit.
                  </p>
                  <code className="mt-2 block max-h-64 overflow-auto whitespace-pre-line rounded-lg bg-surface p-2 text-[11px] leading-relaxed text-ink-muted">
                    {klice.join("\n")}
                  </code>
                </div>
              ) : null}

              <div className="rounded-xl bg-surface-2 p-3">
                <Field label="Přidat ID ručně" hint="když se hledání nechytne">
                  <div className="flex gap-2">
                    <Input
                      inputMode="text"
                      placeholder="-1890"
                      value={rucniId}
                      onChange={(e) => setRucniId(e.target.value)}
                    />
                    <Button
                      variant="secondary"
                      onClick={pridejRucne}
                      disabled={busy === "parovani" || !rucniId}
                    >
                      Přidat
                    </Button>
                  </div>
                </Field>
                <p className="mt-2 text-xs text-ink-muted">
                  ID najdeš v EduPage: přepni se na dítě a v adrese stránky bude{" "}
                  <code>studentid=…</code>.
                </p>
              </div>
            </CardBody>
          </Card>

          {account.last_sync_error ? (
            <Alert tone="danger">Poslední stažení selhalo: {account.last_sync_error}</Alert>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={sync} disabled={busy === "sync"}>
              {busy === "sync" ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
              {busy === "sync" ? "Stahuji…" : "Stáhnout úkoly"}
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={disconnect}
              disabled={busy === "disconnect"}
            >
              <Unlink className="h-4 w-4" /> Odpojit
            </Button>
          </div>

          <p className="text-sm text-ink-muted">
            Rozvrh hodin se stahuje zvlášť —{" "}
            <Link href="/rozvrh" className="text-brand hover:underline">
              na stránce Rozvrh
            </Link>
            , kde se vybírá dítě, kterému patří.
          </p>
        </>
      ) : (
        <Card>
          <CardHeader
            title="Propojit účet"
            description="Přihlašuješ se stejnými údaji jako do EduPage."
          />
          <CardBody className="space-y-4 pt-3">
            <Field label="E-mail" required>
              <Input
                type="email"
                autoComplete="off"
                placeholder="rodic@example.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Heslo" required>
              <Input
                type="password"
                autoComplete="off"
                value={heslo}
                onChange={(e) => setHeslo(e.target.value)}
              />
            </Field>

            <Field
              label="Adresa školy v EduPage"
              hint="nepovinné — bez ní školu najdeme podle e-mailu"
            >
              <Input
                placeholder="zskomenskeho"
                value={subdomena}
                onChange={(e) => setSubdomena(e.target.value)}
              />
              {potizAdresy ? (
                <p className="mt-1 text-xs text-danger">{potizAdresy}</p>
              ) : (
                <p className="mt-1 text-xs text-ink-subtle">
                  Část adresy před <code>.edupage.org</code>, ne název školy. Můžeš sem
                  vložit i celý odkaz z prohlížeče.
                </p>
              )}
            </Field>

            <Button onClick={connect} disabled={busy === "connect" || !email || !heslo}>
              {busy === "connect" ? <Spinner /> : <GraduationCap className="h-4 w-4" />}
              Propojit
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Co je dobré vědět" />
        <CardBody className="space-y-2.5 pt-3 text-sm text-ink-muted">
          <p>
            <strong className="text-ink">Heslo se ukládá zašifrovaně</strong> a používá se jen
            při stahování. Každý rodič si propojuje svůj vlastní účet — nikdo nemusí své školní
            heslo nikomu dávat.
          </p>
          <p>
            <strong className="text-ink">Stahují se i zprávy.</strong> Zprávy od učitelů a
            školní novinky z EduPage se vypisují mezi úkoly a dají se filtrovat.
          </p>
          <p>
            <strong className="text-ink">Stahuje se i rozvrh.</strong> Čte se čtrnáct dní
            dopředu, aby se poznalo, jestli škola jede na sudý a lichý týden. Hodiny, které
            sis zapsal ručně, stažení nepřepíše.
          </p>
          <p>
            <strong className="text-ink">EduPage nemá veřejné rozhraní.</strong> Data se
            načítají stejnou cestou jako v mobilní aplikaci, takže se stahování může rozbít,
            kdykoli EduPage něco změní.
          </p>
          <p>
            <strong className="text-ink">Dvoufázové ověření to zastaví.</strong> Účet chráněný
            druhým faktorem nebo přihlášení přes Google či Microsoft touto cestou nefunguje.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
