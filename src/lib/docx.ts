/**
 * Minimální zapisovač souborů .docx.
 *
 * Word je ZIP s několika XML soubory. Skládáme si ho sami ze dvou důvodů:
 * kvůli jednomu materiálu ke stažení nemá smysl tahat do projektu balík,
 * a hlavně PDF by u češtiny znamenalo vkládat vlastní font — standardní
 * fonty v PDF nemají č ř ě ů a text by se rozsypal stejně jako nedávno
 * nadpisy na webu. Word si písmo řeší sám.
 *
 * Položky se ukládají nekomprimované (metoda „stored“). Checklist má pár
 * kilobajtů, takže úspora z deflate nestojí za riziko chyby v hlavičkách.
 */

/** Tabulka pro CRC32 — ZIP ho vyžaduje u každé položky. */
const CRC_TABULKA = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    c = CRC_TABULKA[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface Polozka {
  jmeno: string;
  obsah: Buffer;
}

/** Složí ZIP z položek uložených bez komprese. */
function zip(polozky: Polozka[]): Buffer {
  const lokalni: Buffer[] = [];
  const centralni: Buffer[] = [];
  let offset = 0;

  for (const { jmeno, obsah } of polozky) {
    const nazev = Buffer.from(jmeno, "utf8");
    const kontrola = crc32(obsah);

    const hlavicka = Buffer.alloc(30);
    hlavicka.writeUInt32LE(0x04034b50, 0); // podpis
    hlavicka.writeUInt16LE(20, 4); // potřebná verze
    hlavicka.writeUInt16LE(0x0800, 6); // názvy v UTF-8
    hlavicka.writeUInt16LE(0, 8); // bez komprese
    hlavicka.writeUInt16LE(0, 10); // čas
    hlavicka.writeUInt16LE(0x0021, 12); // datum (1. 1. 1980)
    hlavicka.writeUInt32LE(kontrola, 14);
    hlavicka.writeUInt32LE(obsah.length, 18);
    hlavicka.writeUInt32LE(obsah.length, 22);
    hlavicka.writeUInt16LE(nazev.length, 26);
    hlavicka.writeUInt16LE(0, 28);

    lokalni.push(hlavicka, nazev, obsah);

    const zaznam = Buffer.alloc(46);
    zaznam.writeUInt32LE(0x02014b50, 0);
    zaznam.writeUInt16LE(20, 4); // verze zapisovače
    zaznam.writeUInt16LE(20, 6); // potřebná verze
    zaznam.writeUInt16LE(0x0800, 8);
    zaznam.writeUInt16LE(0, 10);
    zaznam.writeUInt16LE(0, 12);
    zaznam.writeUInt16LE(0x0021, 14);
    zaznam.writeUInt32LE(kontrola, 16);
    zaznam.writeUInt32LE(obsah.length, 20);
    zaznam.writeUInt32LE(obsah.length, 24);
    zaznam.writeUInt16LE(nazev.length, 28);
    zaznam.writeUInt16LE(0, 30); // extra
    zaznam.writeUInt16LE(0, 32); // komentář
    zaznam.writeUInt16LE(0, 34); // disk
    zaznam.writeUInt16LE(0, 36); // vnitřní atributy
    zaznam.writeUInt32LE(0, 38); // vnější atributy
    zaznam.writeUInt32LE(offset, 42);

    centralni.push(zaznam, nazev);
    offset += hlavicka.length + nazev.length + obsah.length;
  }

  const telo = Buffer.concat(lokalni);
  const rejstrik = Buffer.concat(centralni);

  const konec = Buffer.alloc(22);
  konec.writeUInt32LE(0x06054b50, 0);
  konec.writeUInt16LE(0, 4); // číslo disku
  konec.writeUInt16LE(0, 6); // disk s rejstříkem
  konec.writeUInt16LE(polozky.length, 8);
  konec.writeUInt16LE(polozky.length, 10);
  konec.writeUInt32LE(rejstrik.length, 12);
  konec.writeUInt32LE(telo.length, 16);
  konec.writeUInt16LE(0, 20); // komentář

  return Buffer.concat([telo, rejstrik, konec]);
}

/** Ošetří znaky, které by v XML rozbily dokument. */
function xml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type Odstavec =
  | { druh: "nadpis1"; text: string }
  | { druh: "nadpis2"; text: string }
  | { druh: "text"; text: string }
  | { druh: "odrazka"; text: string }
  | { druh: "drobne"; text: string };

function odstavecXml(o: Odstavec): string {
  const styl: Record<Odstavec["druh"], string> = {
    nadpis1: '<w:pStyle w:val="Title"/>',
    nadpis2: '<w:pStyle w:val="Heading1"/>',
    text: "",
    // Zaškrtávací políčko je obyčejný znak — Word ho umí vytisknout
    // a nepotřebuje k tomu žádné pole ani makro.
    odrazka: '<w:ind w:left="360" w:hanging="360"/>',
    drobne: '<w:pStyle w:val="Subtle"/>',
  };

  const obsah = o.druh === "odrazka" ? `☐  ${o.text}` : o.text;
  const tucne = o.druh === "nadpis1" || o.druh === "nadpis2";

  return (
    `<w:p><w:pPr>${styl[o.druh]}<w:spacing w:before="${o.druh === "nadpis2" ? 280 : 80}" w:after="80"/></w:pPr>` +
    `<w:r><w:rPr>` +
    (tucne ? "<w:b/>" : "") +
    `<w:sz w:val="${o.druh === "nadpis1" ? 40 : o.druh === "nadpis2" ? 28 : o.druh === "drobne" ? 16 : 22}"/>` +
    `</w:rPr><w:t xml:space="preserve">${xml(obsah)}</w:t></w:r></w:p>`
  );
}

/** Vyrobí dokument .docx z odstavců. */
export function vytvorDocx(odstavce: Odstavec[]): Buffer {
  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    "<w:body>" +
    odstavce.map(odstavecXml).join("") +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>' +
    "</w:body></w:document>";

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    "</Types>";

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    "</Relationships>";

  return zip([
    { jmeno: "[Content_Types].xml", obsah: Buffer.from(contentTypes, "utf8") },
    { jmeno: "_rels/.rels", obsah: Buffer.from(rels, "utf8") },
    { jmeno: "word/document.xml", obsah: Buffer.from(document, "utf8") },
  ]);
}
