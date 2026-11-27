"use client";

import * as React from "react";
import { CheckCircle2, FileQuestion, ShieldAlert, ShieldCheck } from "lucide-react";

type Vysledek =
  | { stav: "neplatny" | "nenalezeno"; kod?: string }
  | {
      stav: "nalezeno";
      kod: string;
      druh: "komunikace" | "historie" | "souhrn";
      vytvoril: string;
      vytvoreno: string;
      od: string | null;
      do: string | null;
      shrnuti: Record<string, unknown>;
      souborSedi: boolean | null;
      maOtisk: boolean;
    };

const DRUH: Record<string, string> = {
  komunikace: "Výpis komunikace mezi rodiči",
  historie: "Výpis historie změn",
  souhrn: "Souhrn péče a nákladů",
};

const datum = (k: string | null) =>
  k ? new Date(`${k.slice(0, 10)}T12:00:00`).toLocaleDateString("cs-CZ") : "—";

const kc = (n: unknown) =>
  typeof n === "number" ? `${Math.round(n).toLocaleString("cs-CZ")} Kč` : "—";

/** SHA-256 souboru přímo v prohlížeči — soubor nikam neodchází. */
async function otiskSouboru(soubor: File): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await soubor.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function OvereniVypisu() {
  const [kod, setKod] = React.useState("");
  const [soubor, setSoubor] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [vysledek, setVysledek] = React.useState<Vysledek | null>(null);
  const [chyba, setChyba] = React.useState<string | null>(null);

  // Kód v názvu souboru („komunikace-2026-10-27-K7F3-9QX2.docx") se vyplní sám.
  function vyberSoubor(f: File | null) {
    setSoubor(f);
    const m = f?.name.match(/([2-9A-Z]{4}-[2-9A-Z]{4})\.docx$/i);
    if (m && !kod) setKod(m[1].toUpperCase());
  }

  async function overit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setChyba(null);
    setVysledek(null);
    try {
      const otisk = soubor ? await otiskSouboru(soubor) : null;
      const odpoved = await fetch("/api/overit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kod, otisk }),
      });
      const data = await odpoved.json();
      if (!odpoved.ok) throw new Error(data.chyba ?? "Ověření se nepovedlo.");
      setVysledek(data as Vysledek);
    } catch (e) {
      setChyba(e instanceof Error ? e.message : "Ověření se nepovedlo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={overit} className="card space-y-4 p-5">
        <label className="block">
          <span className="text-sm font-medium text-ink">Kód z výpisu</span>
          <input
            value={kod}
            onChange={(e) => setKod(e.target.value)}
            placeholder="např. K7F3-9QX2"
            autoComplete="off"
            spellCheck={false}
            className="mt-1.5 h-12 w-full rounded-xl border border-line-strong bg-surface px-3 font-mono text-lg uppercase tracking-wider text-ink"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-ink">
            Soubor výpisu <span className="font-normal text-ink-muted">(nepovinné, .docx)</span>
          </span>
          <input
            type="file"
            accept=".docx"
            onChange={(e) => vyberSoubor(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-medium file:text-brand"
          />
          <span className="mt-1 block text-xs text-ink-subtle">
            Soubor se neodesílá. Prohlížeč z něj spočítá otisk a porovná ho s otiskem uloženým
            při vytvoření výpisu.
          </span>
        </label>

        <button
          type="submit"
          disabled={busy || !kod.trim()}
          className="inline-flex h-12 items-center rounded-xl bg-brand px-6 font-semibold text-brand-ink transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? "Ověřuji…" : "Ověřit"}
        </button>
        {chyba ? <p className="text-sm text-danger">{chyba}</p> : null}
      </form>

      {vysledek ? <Vysledek v={vysledek} /> : null}
    </div>
  );
}

function Vysledek({ v }: { v: Vysledek }) {
  if (v.stav !== "nalezeno") {
    return (
      <div className="flex gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-5">
        <FileQuestion className="h-6 w-6 shrink-0 text-danger" aria-hidden />
        <div className="text-sm">
          <p className="font-semibold text-ink">
            {v.stav === "neplatny" ? "Tohle není platný kód" : "Výpis s tímto kódem neexistuje"}
          </p>
          <p className="mt-1 text-ink-muted">
            Kód má osm znaků ve tvaru XXXX-XXXX a je v záhlaví i na konci výpisu. Pokud ho
            opisujete z papíru, zkontrolujte podobné znaky. Výpis bez platného kódu nevznikl
            v Klidoo, nebo z něj byl kód odstraněn.
          </p>
        </div>
      </div>
    );
  }

  const s = v.shrnuti as {
    zprav?: number;
    zaznamu?: number;
    noci?: { a: number; b: number; celkem: number; jmenoA?: string; jmenoB?: string };
    vydajeCelkem?: number;
    podleRodice?: { jmeno: string; zaplatil: number }[];
  };

  return (
    <div className="space-y-3">
      {v.souborSedi === false ? (
        <div className="flex gap-3 rounded-2xl border border-danger/40 bg-danger/5 p-5">
          <ShieldAlert className="h-6 w-6 shrink-0 text-danger" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-ink">Soubor byl po vytvoření změněn</p>
            <p className="mt-1 text-ink-muted">
              Kód je platný, ale nahraný soubor se neshoduje s výpisem, který Klidoo vytvořilo.
              Mohl být upraven — stačí i uložení ve Wordu. Původní obsah popisuje údaj níž.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 rounded-2xl border border-success/40 bg-success/10 p-5">
          {v.souborSedi ? (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden />
          ) : (
            <ShieldCheck className="h-6 w-6 shrink-0 text-success" aria-hidden />
          )}
          <div className="text-sm">
            <p className="font-semibold text-ink">
              {v.souborSedi
                ? "Pravý a nezměněný výpis z Klidoo"
                : "Výpis s tímto kódem vznikl v Klidoo"}
            </p>
            <p className="mt-1 text-ink-muted">
              {v.souborSedi
                ? "Soubor je přesně ten, který Klidoo vytvořilo. Nikdo ho od té doby neupravil."
                : v.maOtisk
                  ? "Pro ověření, že soubor nikdo neupravil, ho nahrajte výš."
                  : "Tištěný souhrn se ověřuje podle čísel: porovnejte je s papírem."}
            </p>
          </div>
        </div>
      )}

      <dl className="divide-y divide-line rounded-2xl border border-line bg-surface text-sm">
        <Radek co="Kód" hodnota={v.kod} />
        <Radek co="Druh" hodnota={DRUH[v.druh] ?? v.druh} />
        <Radek
          co="Vytvořeno"
          hodnota={`${new Date(v.vytvoreno).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })}, vytvořil(a): ${v.vytvoril}`}
        />
        {v.od || v.do ? <Radek co="Období" hodnota={`${datum(v.od)} – ${datum(v.do)}`} /> : null}
        {typeof s.zprav === "number" ? <Radek co="Počet zpráv" hodnota={String(s.zprav)} /> : null}
        {typeof s.zaznamu === "number" ? (
          <Radek co="Počet záznamů" hodnota={String(s.zaznamu)} />
        ) : null}
        {s.noci ? (
          <Radek
            co="Noci"
            hodnota={`${s.noci.jmenoA ?? "Rodič A"} ${s.noci.a}, ${s.noci.jmenoB ?? "Rodič B"} ${s.noci.b} (celkem ${s.noci.celkem})`}
          />
        ) : null}
        {typeof s.vydajeCelkem === "number" ? (
          <Radek co="Výdaje celkem" hodnota={kc(s.vydajeCelkem)} />
        ) : null}
        {s.podleRodice?.length ? (
          <Radek
            co="Zaplatil(a)"
            hodnota={s.podleRodice.map((r) => `${r.jmeno} ${kc(r.zaplatil)}`).join(", ")}
          />
        ) : null}
      </dl>

      <p className="text-xs leading-relaxed text-ink-subtle">
        Ověření potvrzuje, že výpis vytvořila aplikace Klidoo z údajů, které si rodina sama
        zapisuje. Nejde o výpis z úřední evidence. Zprávy a historie změn v Klidoo nejdou
        upravit ani smazat.
      </p>
    </div>
  );
}

function Radek({ co, hodnota }: { co: string; hodnota: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-3 px-4 py-3">
      <dt className="text-ink-muted">{co}</dt>
      <dd className="text-ink">{hodnota}</dd>
    </div>
  );
}
