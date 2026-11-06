/**
 * Pošle pozvánku e-mailem. Vrací jen ano/ne — když SMTP mlčí, uživateli
 * zůstává odkaz ke zkopírování a hláška o chybějícím nastavení by mu
 * nic neřekla.
 */
export async function posliPozvanku(token: string): Promise<boolean> {
  try {
    const odpoved = await fetch("/api/pozvanka/odeslat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = (await odpoved.json()) as { poslano?: boolean };
    return Boolean(data.poslano);
  } catch {
    return false;
  }
}
