/**
 * Omezení počtu volání na veřejných koncových bodech.
 *
 * Bydlí v paměti procesu, ne v databázi. Zní to jako kompromis, ale pro
 * tenhle případ je to správně: obrana má být levnější než útok, a zápis
 * do Supabase u každého pokusu by z limitu udělal to, před čím chrání.
 * Aplikace běží v jednom kontejneru, takže jeden proces vidí všechna
 * volání; po nasazení se počítadla vynulují, což zaútočícímu dá jedno
 * okno navíc a nikomu jinému nevadí.
 *
 * Klíč je otisk návštěvníka, obvykle IP. Za Caddy chodí ve `X-Real-IP`
 * a `X-Forwarded-For` — bez nich by všichni sdíleli jeden klíč a limit
 * by zavřel dveře celému internetu najednou.
 */

interface Okno {
  pocet: number;
  od: number;
}

/**
 * Jedna sada počítadel. Každý koncový bod má vlastní, aby se stahování
 * checklistu nezapočítávalo do pokusů o odeslání formuláře.
 */
export class Limit {
  private okna = new Map<string, Okno>();
  private posledniUklid = Date.now();

  constructor(
    /** Kolik volání se vejde do okna. */
    private readonly max: number,
    /** Jak je okno dlouhé, v milisekundách. */
    private readonly oknoMs: number,
  ) {}

  /**
   * Zaznamená pokus. `true` znamená, že limit je překročený a volání
   * se má odmítnout.
   */
  prekrocen(klic: string): boolean {
    const ted = Date.now();
    this.uklid(ted);

    const okno = this.okna.get(klic);
    if (!okno || ted - okno.od > this.oknoMs) {
      this.okna.set(klic, { pocet: 1, od: ted });
      return false;
    }

    okno.pocet += 1;
    return okno.pocet > this.max;
  }

  /** Kolik klíčů se zrovna sleduje. Jen pro testy a rozvahu o paměti. */
  get velikost(): number {
    return this.okna.size;
  }

  /**
   * Vyhodí okna, kterým vypršela platnost.
   *
   * Bez tohohle by mapa rostla, dokud se aplikace nerestartuje —
   * u koncového bodu měření, kam chodí každý návštěvník, by to za týden
   * byly statisíce mrtvých klíčů. Uklízí se nejvýš jednou za okno, takže
   * to nestojí čas u každého volání.
   */
  private uklid(ted: number): void {
    if (ted - this.posledniUklid < this.oknoMs) return;
    this.posledniUklid = ted;
    for (const [klic, okno] of this.okna) {
      if (ted - okno.od > this.oknoMs) this.okna.delete(klic);
    }
  }
}

/**
 * Kdo volá. Vrací `null`, když to nejde zjistit — volající se pak musí
 * rozhodnout, jestli takový požadavek pustí, nebo ne.
 *
 * Bere se první adresa z `X-Forwarded-For`; ta poslední patří proxy,
 * ne člověku.
 */
export function klicVolajiciho(hlavicky: Headers): string | null {
  const forwarded = hlavicky.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || hlavicky.get("x-real-ip") || null;
}

/** Minuta a hodina v milisekundách — ať se v konfiguraci nepočítá. */
export const MINUTA = 60 * 1000;
export const HODINA = 60 * MINUTA;
