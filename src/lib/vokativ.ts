/**
 * Oslovení křestním jménem v 5. pádě: „Dobrý večer, Petře".
 *
 * „Dobrý večer, Petr" je chyba, kterou si česky mluvící člověk všimne
 * hned — a v aplikaci, která se ho ptá na děti a peníze, působí jako
 * stroj. Pravidla níž pokrývají běžná česká jména; co pravidlo neví
 * jistě, nechá v 1. pádě — „Dobrý večer, Dagmar" je správně, kdežto
 * vymyšlený tvar by byl horší než žádný.
 */

/** Jména, která pravidlo neodhadne nebo se nemění. Klíč malými písmeny. */
const VYJIMKY: Record<string, string> = {
  pavel: "Pavle",
  karel: "Karle",
  zdeněk: "Zdeňku",
  zbyněk: "Zbyňku",
  hynek: "Hynku",
  přemysl: "Přemysle",
  // Ženská jména na souhlásku se nemění.
  dagmar: "Dagmar",
  ester: "Ester",
  miriam: "Miriam",
  ingrid: "Ingrid",
  karin: "Karin",
  carmen: "Carmen",
  rút: "Rút",
  ruth: "Ruth",
  edit: "Edit",
  nikol: "Nikol",
  noemi: "Noemi",
};

const MEKKE = /[šžčřcjťďňx]$/;

/** 5. pád jednoho křestního jména. Neznámé tvary vrací beze změny. */
export function vokativ(jmeno: string): string {
  const j = jmeno.trim();
  if (j.length < 2) return j;

  const vyjimka = VYJIMKY[j.toLowerCase()];
  if (vyjimka) return vyjimka;

  const male = j.toLowerCase();

  // Jana → Jano, Honza → Honzo, Jirka → Jirko
  if (male.endsWith("a")) return j.slice(0, -1) + "o";
  // Jiří, Lucie, Marie, René, Noe, Ondra… samohláska na konci: beze změny
  if (/[aeiouyáéěíóúůý]$/.test(male)) return j;

  // Marek → Marku, Radek → Radku (pohyblivé e)
  if (/[^aeiouyáéěíóúůý]ek$/.test(male) && j.length > 4) return j.slice(0, -2) + "ku";
  // Daniel → Danieli, Michael → Michaeli, Marcel → Marceli
  if (/[ia]el$/.test(male) || male.endsWith("cel")) return j + "i";
  // Patrik → Patriku, Oldřich → Oldřichu, Ludvík → Ludvíku
  if (/(k|g|h|ch)$/.test(male)) return j + "u";
  // Tomáš → Tomáši, Matěj → Matěji, Max → Maxi
  if (MEKKE.test(male)) return j + "i";
  // Petr → Petře, Alexandr → Alexandře (r po souhlásce)
  if (/[^aeiouyáéěíóúůý]r$/.test(male)) return j.slice(0, -1) + "ře";
  // Jan → Jane, Martin → Martine, Viktor → Viktore
  return j + "e";
}
