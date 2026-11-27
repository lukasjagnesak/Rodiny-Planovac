"use client";

import * as React from "react";
import { zmer } from "@/lib/mereni";
import { zapisRegistraci } from "@/lib/registrace-mereni";

/**
 * Dopočítá registraci těm, kdo přišli přes Google.
 *
 * Ti se do registračního formuláře nikdy nedostanou — z tlačítka
 * odcházejí rovnou na účty Googlu a vracejí se sem. Bez tohohle by
 * v Google Ads svítila nula u každého, kdo použil to přihlášení, které
 * sami nabízíme jako první.
 */
export function ZmerRegistraci({ userId, novy }: { userId: string; novy: boolean }) {
  React.useEffect(() => {
    if (!novy) return;
    if (!zapisRegistraci(userId)) return;
    zmer("registrace", "/vitejte");
  }, [userId, novy]);

  return null;
}
