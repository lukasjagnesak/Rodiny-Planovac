"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/misc";
import { ACTIVE_FAMILY_COOKIE } from "@/lib/members";
import { zmer } from "@/lib/mereni";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("accept_invite", { invite_token: token });

    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }

    zmer("druhy_rodic");

    document.cookie = `${ACTIVE_FAMILY_COOKIE}=${data}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.push("/prehled");
    router.refresh();
  }

  return (
    <div className="w-full space-y-3">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button size="lg" className="w-full" onClick={accept} disabled={busy}>
        {busy ? <Spinner /> : "Přijmout pozvánku"}
      </Button>
    </div>
  );
}
