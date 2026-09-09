/**
 * Přidání Klidoo na plochu telefonu.
 *
 * Tenhle soubor je jen rozhodování — co komu ukázat. Samotné volání
 * prohlížeče je v komponentě, protože se nedá otestovat jinak než
 * v prohlížeči.
 *
 * Podstatné je, že „jedno ťuknutí a je to" jde jen na Androidu a na
 * počítači. Chrome tam pošle událost `beforeinstallprompt`, kterou si
 * schováme a přehrajeme, až na tlačítko někdo klikne. Apple takovou
 * událost nikdy nezavedl, takže na iPhonu se aplikace na plochu přidat
 * dá, ale výhradně rukou přes nabídku Sdílet. Žádná knihovna to
 * neobejde; kdo tvrdí opak, ukazuje jenom návod, jak to udělat ručně.
 */

export type ZpusobInstalace =
  /** Chrome poslal výzvu, stačí ji přehrát — jedno ťuknutí. */
  | "vyzva"
  /** iPhone nebo iPad: jde to jen ručně přes Sdílet, ukážeme návod. */
  | "navod-ios"
  /** Nedá se nic dělat — už je nainstalováno, nebo prohlížeč nepodporuje. */
  | "nic";

/**
 * Běží aplikace už jako aplikace?
 *
 * `display-mode: standalone` platí na Androidu i na počítači, starší
 * iOS to hlásí přes vlastní `navigator.standalone`. Když je aspoň jedno
 * z toho, nemá smysl nabízet instalaci — člověk ji už má.
 */
export function jeSpustenaJakoAplikace(
  standaloneMedia: boolean,
  iosStandalone: boolean | undefined,
): boolean {
  return standaloneMedia || iosStandalone === true;
}

/**
 * Je to zařízení od Apple?
 *
 * iPad se od iPadOS 13 hlásí jako Mac, a jediné, čím se od skutečného
 * Macu v prohlížeči liší, je dotyková obrazovka. Proto se kouká i na
 * počet dotykových bodů — bez toho by iPad dostal návod pro počítač,
 * kde žádné tlačítko Sdílet není.
 */
export function jeApple(ua: string, maxTouchPoints: number): boolean {
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return /macintosh/i.test(ua) && maxTouchPoints > 1;
}

/**
 * Co nabídnout tomuhle návštěvníkovi.
 *
 * Pořadí kontrol není libovolné. Nejdřív „už to má", protože nabízet
 * instalaci uvnitř nainstalované aplikace je nesmysl, který uvidí každý,
 * kdo si ji nainstaloval. Pak výzva od Chromu, protože ta je vždycky
 * lepší než návod. Návod pro iOS až nakonec, ať se neukáže někomu, kdo
 * má jednodušší cestu.
 */
export function zpusobInstalace(stav: {
  jakoAplikace: boolean;
  maVyzvu: boolean;
  apple: boolean;
}): ZpusobInstalace {
  if (stav.jakoAplikace) return "nic";
  if (stav.maVyzvu) return "vyzva";
  if (stav.apple) return "navod-ios";
  return "nic";
}
