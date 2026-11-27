"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { Copy, Download, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { Alert, Spinner } from "@/components/ui/misc";
import { BARVY_IKON } from "@/lib/barvy";
import { toDateKey } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { formatUcet, normalizujUcet, spayd } from "@/lib/ucet";
import { textRozpisu, type PolozkaDluhu } from "@/lib/vyrovnani";
import type { SessionContext } from "@/lib/types";

/**
 * QR k zaplacení pro druhého rodiče, který Klidoo nemá.
 *
 * Vznikne obrázek s částkou, účtem, QR Platbou a rozpisem výdajů, který
 * rodič sám pošle (WhatsApp, SMS, e-mail). Kreslí se v prohlížeči —
 * účet ani částka nikam neodcházejí, dokud je rodič sám nepošle.
 */
export function QrKZaslani({
  session,
  polozky,
  castka,
  odecteno = 0,
  onClose,
}: {
  session: SessionContext;
  polozky: PolozkaDluhu[];
  /** Výsledná částka po započtení. */
  castka: number;
  /** Co dlužím já a je odečtené od součtu položek. */
  odecteno?: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const mena = session.family.currency;
  const [iban, setIban] = React.useState<string | null>(session.profile.ucet ?? null);
  const [vstup, setVstup] = React.useState("");
  const [obrazek, setObrazek] = React.useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [zkopirovano, setZkopirovano] = React.useState(false);

  const zprava = `Klidoo: vyrovnani vydaju ${toDateKey(new Date()).slice(5).split("-").reverse().join(".")}.`;
  const text = iban
    ? textRozpisu({ polozky, castka, mena, ucet: formatUcet(iban), odecteno })
    : "";
  // Pole položek je při každém vykreslení rodiče nové — efekt se řídí obsahem.
  const klicPolozek = polozky.map((p) => `${p.expense.id}:${p.podil}`).join(",");
  const polozkyRef = React.useRef(polozky);
  polozkyRef.current = polozky;

  React.useEffect(() => {
    if (!iban) return;
    let zruseno = false;
    let url: string | null = null;
    nakresli({ iban, castka, mena, zprava, polozky: polozkyRef.current, odecteno })
      .then((blob) => {
        if (zruseno) return;
        url = URL.createObjectURL(blob);
        setObrazek({ url, blob });
      })
      .catch(() => !zruseno && setError("QR kód se nepodařilo vytvořit."));
    return () => {
      zruseno = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [iban, castka, mena, zprava, klicPolozek, odecteno]);

  async function ulozUcet() {
    const v = normalizujUcet(vstup);
    if ("chyba" in v) {
      setError(v.chyba);
      return;
    }
    setBusy(true);
    setError(null);
    // Uložit do profilu, ať se příště nevyplňuje. Když to neprojde,
    // QR se vytvoří i tak — jen si ho aplikace nezapamatuje.
    const supabase = createClient();
    await supabase.from("profiles").update({ ucet: v.iban }).eq("id", session.userId);
    setBusy(false);
    setIban(v.iban);
    router.refresh();
  }

  async function sdilet() {
    if (!obrazek) return;
    const soubor = new File([obrazek.blob], "klidoo-vyrovnani.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [soubor] })) {
        await navigator.share({ files: [soubor], title: "Vyrovnání výdajů", text });
        return;
      }
    } catch (e) {
      // Zavřené sdílení není chyba.
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    stahnout();
  }

  function stahnout() {
    if (!obrazek) return;
    const a = document.createElement("a");
    a.href = obrazek.url;
    a.download = "klidoo-vyrovnani.png";
    a.click();
  }

  async function kopirovat() {
    await navigator.clipboard.writeText(text);
    setZkopirovano(true);
    setTimeout(() => setZkopirovano(false), 2000);
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="QR k zaplacení"
      description={`${formatMoney(castka, mena)} · pro druhého rodiče, i bez Klidoo`}
    >
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {!iban ? (
          <>
            <p className="text-sm text-ink-muted">
              Na jaký účet má druhý rodič poslat peníze? Uložíme ho do vašeho profilu.
            </p>
            <Field label="Číslo účtu">
              <Input
                autoComplete="off"
                placeholder="123456789/0800"
                value={vstup}
                onChange={(e) => setVstup(e.target.value)}
              />
            </Field>
            <Button className="w-full" onClick={ulozUcet} disabled={busy || !vstup.trim()}>
              {busy ? <Spinner /> : "Vytvořit QR"}
            </Button>
          </>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              {obrazek ? (
                // Obrázek vzniká v prohlížeči (blob:), next/image tu nemá co optimalizovat.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={obrazek.url} alt="QR platba s rozpisem výdajů" className="w-full" />
              ) : (
                <div className="flex h-64 items-center justify-center">
                  <Spinner />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={sdilet} disabled={!obrazek}>
                <Share2 className="h-4 w-4" /> Poslat
              </Button>
              <Button variant="secondary" onClick={stahnout} disabled={!obrazek}>
                <Download className="h-4 w-4" /> Uložit obrázek
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={kopirovat}>
              <Copy className="h-4 w-4" /> {zkopirovano ? "Rozpis zkopírován" : "Kopírovat rozpis jako text"}
            </Button>

            <p className="text-xs text-ink-subtle">
              Peníze na účet {formatUcet(iban)}. Až přijdou, potvrďte je ve Vyrovnání tlačítkem
              Zaplaceno.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}

/** Obrázek k poslání: částka, účet, QR a rozpis výdajů. */
async function nakresli(v: {
  iban: string;
  castka: number;
  mena: string;
  zprava: string;
  polozky: PolozkaDluhu[];
  odecteno: number;
}): Promise<Blob> {
  const W = 1080;
  const P = 72;
  const MAX_RADKU = 10;
  const radky = v.polozky.slice(0, MAX_RADKU);
  const zbyva = v.polozky.length - radky.length;
  const H =
    1180 +
    radky.length * 64 +
    (zbyva > 0 ? 64 : 0) +
    (v.odecteno > 0 ? 64 : 0) +
    (radky.length ? 90 : 0);

  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) throw new Error("canvas");
  const pismo = (vaha: number, velikost: number) =>
    `${vaha} ${velikost}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);

  // Hlavička
  g.fillStyle = BARVY_IKON.znacka;
  g.fillRect(0, 0, W, 16);
  g.fillStyle = "#3b3633";
  g.font = pismo(600, 40);
  g.fillText("Vyrovnání výdajů za děti", P, 110);

  g.fillStyle = "#1f1b19";
  g.font = pismo(700, 96);
  g.fillText(formatMoney(v.castka, v.mena), P, 230);
  g.fillStyle = "#6b625c";
  g.font = pismo(400, 36);
  g.fillText(`na účet ${formatUcet(v.iban)}`, P, 290);

  // QR
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, spayd(v), { width: 620, margin: 2, errorCorrectionLevel: "M" });
  g.drawImage(qr, (W - 620) / 2, 340, 620, 620);
  g.fillStyle = "#6b625c";
  g.font = pismo(500, 32);
  g.textAlign = "center";
  g.fillText("QR Platba · naskenujte v aplikaci své banky", W / 2, 1010);
  g.textAlign = "left";

  // Rozpis
  let y = 1100;
  if (radky.length) {
    g.strokeStyle = "#e7e1dc";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(P, y - 40);
    g.lineTo(W - P, y - 40);
    g.stroke();
    g.fillStyle = "#3b3633";
    g.font = pismo(600, 32);
    g.fillText("Za co", P, y);
    y += 64;
    for (const p of radky) {
      const [, m, d] = p.expense.spent_on.split("-").map(Number);
      g.fillStyle = "#1f1b19";
      g.font = pismo(400, 32);
      const nazev = `${d}. ${m}.  ${p.expense.title}`;
      g.fillText(nazev.length > 40 ? `${nazev.slice(0, 39)}…` : nazev, P, y);
      g.textAlign = "right";
      g.font = pismo(600, 32);
      g.fillText(formatMoney(p.podil, v.mena), W - P, y);
      g.textAlign = "left";
      y += 64;
    }
    if (zbyva > 0) {
      g.fillStyle = "#6b625c";
      g.font = pismo(400, 30);
      g.fillText(`a ${zbyva} další`, P, y);
      y += 64;
    }
    if (v.odecteno > 0) {
      g.fillStyle = "#6b625c";
      g.font = pismo(400, 32);
      g.fillText("odečteno, co dlužím já", P, y);
      g.textAlign = "right";
      g.fillText(`−${formatMoney(v.odecteno, v.mena)}`, W - P, y);
      g.textAlign = "left";
      y += 64;
    }
  }

  g.fillStyle = "#9a918a";
  g.font = pismo(400, 26);
  g.fillText("Vytvořeno v Klidoo · klidoo.cz", P, H - 48);

  return new Promise((hotovo, chyba) =>
    c.toBlob((b) => (b ? hotovo(b) : chyba(new Error("toBlob"))), "image/png"),
  );
}
