/**
 * Překlep v doméně e-mailu („gmai.com“, „seznam.cy“).
 *
 * Registrace e-mailem nečeká na potvrzovací odkaz, takže překlep by
 * jinak vytvořil účet na adresu, kam nikdy nic nedojde (ani obnova
 * hesla). Nabízíme opravu, nic neměníme sami.
 */
const ZNAME = [
  "gmail.com",
  "seznam.cz",
  "email.cz",
  "centrum.cz",
  "post.cz",
  "atlas.cz",
  "volny.cz",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "yahoo.com",
  "outlook.cz",
  "live.com",
];

function vzdalenost(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      // Prohozená sousední písmena („gmial“) počítáme jako jednu chybu.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Opravená adresa, nebo `null`, když doména vypadá v pořádku. */
export function navrhOpravy(email: string): string | null {
  const v = email.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const domena = v.slice(at + 1);
  if (!domena || ZNAME.includes(domena)) return null;
  // Správný název, špatná koncovka („gmail.cz“): stejný poskytovatel.
  const nazev = domena.split(".")[0];
  const stejnyNazev = ZNAME.find((z) => z.split(".")[0] === nazev);
  if (stejnyNazev) return `${v.slice(0, at)}@${stejnyNazev}`;
  let nejlepsi: string | null = null;
  let min = 3;
  for (const z of ZNAME) {
    const vz = vzdalenost(domena, z);
    if (vz < min) {
      min = vz;
      nejlepsi = z;
    }
  }
  // Jedna chyba vždy; dvě jen u delších domén, ať se nenabízí nesmysly.
  if (!nejlepsi || (min === 2 && domena.length < 8)) return null;
  return `${v.slice(0, at)}@${nejlepsi}`;
}
