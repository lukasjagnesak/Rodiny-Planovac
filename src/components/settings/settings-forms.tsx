"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Monitor, Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, ColorPicker, Segmented, Spinner } from "@/components/ui/misc";
import { COLOR_PALETTE } from "@/lib/constants";
import type { GoogleAccount, SessionContext } from "@/lib/types";

const CURRENCIES = ["CZK", "EUR", "USD", "PLN"];

export function SettingsForms({
  session,
}: {
  session: SessionContext;
  google: GoogleAccount | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(session.profile.full_name);
  const [phone, setPhone] = React.useState(session.profile.phone ?? "");
  const [color, setColor] = React.useState(session.profile.color);
  const [familyName, setFamilyName] = React.useState(session.family.name);
  const [currency, setCurrency] = React.useState(session.family.currency);
  const [saving, setSaving] = React.useState<"profile" | "family" | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const isOwner = session.myMembership.role === "owner";

  async function saveProfile() {
    setSaving("profile");
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim(), phone: phone.trim() || null, color })
      .eq("id", session.userId);

    setSaving(null);
    if (error) setError(error.message);
    else {
      setMessage("Profil uložen.");
      router.refresh();
    }
  }

  async function saveFamily() {
    setSaving("family");
    setError(null);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("families")
      .update({ name: familyName.trim(), currency })
      .eq("id", session.family.id);

    setSaving(null);
    if (error) setError(error.message);
    else {
      setMessage("Nastavení rodiny uloženo.");
      router.refresh();
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/prihlaseni");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {/* ── Můj profil ─────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Můj profil" description={session.profile.email ?? undefined} />
        <CardBody className="space-y-4 pt-3">
          <Field label="Jméno">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>

          <Field label="Telefon" hint="nepovinné">
            <Input
              type="tel"
              placeholder="+420 777 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Field label="Moje barva" hint="používá se v kalendáři a u dopravy">
            <ColorPicker value={color} palette={COLOR_PALETTE} onChange={setColor} />
          </Field>

          <Button onClick={saveProfile} disabled={saving === "profile"}>
            {saving === "profile" ? <Spinner /> : "Uložit profil"}
          </Button>
        </CardBody>
      </Card>

      {/* ── Vzhled ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader title="Vzhled" description="Světlý nebo tmavý režim" />
        <CardBody className="pt-3">
          <ThemeSwitcher />
        </CardBody>
      </Card>

      {/* ── Rodina ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader
          title="Rodina"
          description={isOwner ? undefined : "Upravit může jen správce rodiny"}
        />
        <CardBody className="space-y-4 pt-3">
          <Field label="Název rodiny">
            <Input
              value={familyName}
              disabled={!isOwner}
              onChange={(e) => setFamilyName(e.target.value)}
            />
          </Field>

          <Field label="Měna">
            <Select
              value={currency}
              disabled={!isOwner}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          {isOwner ? (
            <Button onClick={saveFamily} disabled={saving === "family"}>
              {saving === "family" ? <Spinner /> : "Uložit rodinu"}
            </Button>
          ) : null}
        </CardBody>
      </Card>

      <Button variant="secondary" className="w-full" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Odhlásit se
      </Button>
    </div>
  );
}

/** Přepínač tématu — volba se ukládá do localStorage a čte se v layoutu. */
function ThemeSwitcher() {
  const [theme, setTheme] = React.useState<"light" | "dark" | "system">("system");

  React.useEffect(() => {
    const stored = localStorage.getItem("rp-theme");
    setTheme(stored === "dark" || stored === "light" ? stored : "system");
  }, []);

  function apply(next: "light" | "dark" | "system") {
    setTheme(next);
    const root = document.documentElement;
    root.classList.remove("dark", "light");

    if (next === "system") {
      localStorage.removeItem("rp-theme");
    } else {
      localStorage.setItem("rp-theme", next);
      root.classList.add(next);
    }
  }

  return (
    <Segmented
      value={theme}
      onChange={apply}
      options={[
        {
          value: "light",
          label: (
            <span className="flex items-center gap-1.5">
              <Sun className="h-4 w-4" /> Světlý
            </span>
          ),
        },
        {
          value: "dark",
          label: (
            <span className="flex items-center gap-1.5">
              <Moon className="h-4 w-4" /> Tmavý
            </span>
          ),
        },
        {
          value: "system",
          label: (
            <span className="flex items-center gap-1.5">
              <Monitor className="h-4 w-4" /> Systém
            </span>
          ),
        },
      ]}
    />
  );
}
