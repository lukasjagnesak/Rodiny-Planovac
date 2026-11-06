/**
 * Integrace Supabase → Mailchimp proti simulátoru Mailchimp API.
 *
 * Simulátor stojí místo `fetch`, takže se testuje i skutečný klient
 * (URL, metody, těla, chybové stavy). Na síť se nesahá — žádný test
 * nemůže poslat e-mail skutečnému člověku.
 *
 * Spouští se přes `npm run test:mailchimp`.
 */
const fs = require("fs");
const assert = require("assert");
const { vytvorKlienta, hashClena, datacentrum } = require("../.test-build/lib/mailchimp/klient.js");
const {
  zpracujFrontu,
  rozhodni,
  migrace,
  odstup,
  TAGY,
} = require("../.test-build/lib/mailchimp/synchronizace.js");
const { overPodpis, podepis, rozparsuj, tokenSedi } = require("../.test-build/lib/mailchimp/webhook.js");
const { MARKETING_SOUHLAS } = require("../.test-build/lib/marketing-souhlas.js");

let selhalo = 0;
let pocet = 0;
async function test(popis, fn) {
  pocet++;
  try {
    await fn();
    console.log("  ✓ " + popis);
  } catch (e) {
    selhalo++;
    console.log("  ✗ " + popis + "\n      " + (e && e.message));
  }
}

// ── Hodiny: každá operace posune čas o sekundu, aby šlo porovnávat ─────
let ted = Date.parse("2026-11-06T10:00:00Z");
const tik = () => new Date((ted += 1000)).toISOString();

// ── Simulátor Mailchimpu ───────────────────────────────────────────────
function simulator() {
  const clenove = new Map(); // hash → {email, status, last_changed, tags:Set, merge}
  const zapomenute = new Set();
  const poruchy = []; // fronta vynucených odpovědí: {status} nebo {sit: true}
  const s = {
    clenove,
    zapomenute,
    poruchy,
    zapisu: 0,
    pozadavku: 0,
    uvitani: 0, // kolikrát se klidoo_welcome NOVĚ přidal (= spuštění automatizace)
    hostitele: new Set(),
    dalsiPorucha: (p) => poruchy.push(p),
  };

  const json = (status, data) =>
    new Response(data === undefined ? null : JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  const chyba = (status, title, detail = "") => json(status, { status, title, detail });
  const naClena = (c) => ({
    email_address: c.email,
    status: c.status,
    last_changed: c.last_changed,
    tags: [...c.tags].map((name) => ({ name })),
    merge_fields: c.merge,
  });

  s.fetch = async (url, init = {}) => {
    s.pozadavku++;
    const u = new URL(url);
    s.hostitele.add(u.host);
    if (!init.headers || !String(init.headers.Authorization).startsWith("Basic ")) {
      return chyba(401, "API Key Missing");
    }
    const porucha = poruchy.shift();
    if (porucha) {
      if (porucha.sit) throw new TypeError("fetch failed");
      return chyba(porucha.status, porucha.title ?? "Porucha");
    }

    const m = u.pathname.match(/^\/3\.0\/lists\/([^/]+)\/members\/([0-9a-f]{32})(\/tags|\/actions\/delete-permanent)?$/);
    if (!m) return chyba(404, "Resource Not Found");
    const [, , hash, pripona] = m;
    const metoda = init.method ?? "GET";
    const telo = init.body ? JSON.parse(init.body) : {};
    const c = clenove.get(hash);

    if (metoda !== "GET") s.zapisu++;

    if (metoda === "GET") return c ? json(200, naClena(c)) : chyba(404, "Resource Not Found");

    if (metoda === "PUT" && !pripona) {
      if (zapomenute.has(hash)) return chyba(400, "Forgotten Email Not Subscribed");
      if (!c) {
        const status = telo.status ?? telo.status_if_new;
        if (!status) return chyba(400, "Invalid Resource", "status_if_new required");
        const novy = { email: telo.email_address, status, last_changed: tik(), tags: new Set(), merge: telo.merge_fields ?? {} };
        clenove.set(hash, novy);
        return json(200, naClena(novy));
      }
      if (telo.status && telo.status !== c.status) {
        // Compliance: odhlášeného nebo cleaned nejde přímo přihlásit.
        if ((c.status === "unsubscribed" || c.status === "cleaned") && telo.status === "subscribed") {
          return chyba(400, "Member In Compliance State");
        }
        if (c.status === "cleaned") return chyba(400, "Member In Compliance State");
        c.status = telo.status;
      }
      Object.assign(c.merge, telo.merge_fields ?? {});
      c.last_changed = tik();
      return json(200, naClena(c));
    }

    if (metoda === "PATCH" && !pripona) {
      if (!c) return chyba(404, "Resource Not Found");
      if (telo.email_address && telo.email_address.toLowerCase() !== c.email) {
        const novyHash = hashClena(telo.email_address);
        if (clenove.has(novyHash)) return chyba(400, "Member Exists");
        clenove.delete(hash);
        c.email = telo.email_address.toLowerCase();
        clenove.set(novyHash, c);
      }
      if (telo.status) c.status = telo.status;
      c.last_changed = tik();
      return json(200, naClena(c));
    }

    if (metoda === "POST" && pripona === "/tags") {
      if (!c) return chyba(404, "Resource Not Found");
      for (const t of telo.tags) {
        if (t.status === "active") {
          if (t.name === "klidoo_welcome" && !c.tags.has(t.name) && telo.is_syncing === false) s.uvitani++;
          c.tags.add(t.name);
        } else c.tags.delete(t.name);
      }
      return json(204);
    }

    if (metoda === "POST" && pripona === "/actions/delete-permanent") {
      if (!c) return chyba(404, "Resource Not Found");
      clenove.delete(hash);
      zapomenute.add(hash);
      return json(204);
    }

    if (metoda === "DELETE") {
      if (!c) return chyba(404, "Resource Not Found");
      c.status = "archived";
      return json(204);
    }
    return chyba(405, "Method Not Allowed");
  };

  s.klient = vytvorKlienta({ apiKlic: "testovaci0000000000000000000000-us21", audienceId: "aud123", fetch: s.fetch });
  s.clen = (email) => clenove.get(hashClena(email));
  return s;
}

// ── Úložiště v paměti (chová se jako SQL funkce z migrace 0044) ───────
function uloziste() {
  const kontakty = new Map();
  const fronta = [];
  const historie = [];
  let id = 0;
  const u = {
    kontakty,
    fronta,
    historie,
    ted: () => ted,
    pridej(userId, data) {
      kontakty.set(userId, {
        userId,
        email: data.email,
        jmeno: data.jmeno ?? "Jana Nováková",
        registrace: "2026-11-01T08:00:00Z",
        premium: false,
        souhlas: false,
        souhlasAt: null,
        odvolanoAt: null,
        zdroj: "registrace",
        mcStatus: null,
        mcEmail: null,
        mcOdhlasenoAt: null,
        uctEmailSync: null,
        welcomeAt: null,
        ...data,
      });
    },
    zarad(userId) {
      if (fronta.some((f) => f.userId === userId && f.druh === "sync" && f.stav === "ceka")) return;
      fronta.push({ id: ++id, userId, druh: "sync", mcEmail: null, pokusy: 0, stav: "ceka", dalsi: 0, chyba: null });
    },
    souhlas(userId, ano) {
      const k = kontakty.get(userId);
      if (ano) Object.assign(k, { souhlas: true, souhlasAt: tik() });
      else Object.assign(k, { souhlas: false, odvolanoAt: tik() });
      historie.push({ userId, udalost: ano ? "udelen" : "odvolan" });
      u.zarad(userId);
    },
    /** Jako webhook `subscribe` po potvrzení double opt-in. */
    potvrdDoi(userId, sim) {
      const k = kontakty.get(userId);
      sim.clen(k.mcEmail ?? k.email).status = "subscribed";
      sim.clen(k.mcEmail ?? k.email).last_changed = tik();
      k.mcStatus = "subscribed";
      u.zarad(userId);
    },
    smazUcet(userId) {
      const k = kontakty.get(userId);
      kontakty.delete(userId);
      if (k.mcEmail || k.mcStatus) fronta.push({ id: ++id, userId, druh: "smazat", mcEmail: k.mcEmail ?? k.email, pokusy: 0, stav: "ceka", dalsi: 0 });
    },
    cekajici: () => fronta.filter((f) => f.stav === "ceka").length,

    async vezmiUlohy(limit) {
      const vzate = fronta.filter((f) => f.stav === "ceka" && f.dalsi <= ted).slice(0, limit);
      for (const f of vzate) {
        f.stav = "zpracovava";
        f.pokusy++;
      }
      return vzate.map((f) => ({ id: f.id, userId: f.userId, druh: f.druh, mcEmail: f.mcEmail, pokusy: f.pokusy }));
    },
    async nactiStav(userId) {
      const k = kontakty.get(userId);
      return k ? { ...k } : null;
    },
    async ulozKontakt(userId, z) {
      const k = kontakty.get(userId);
      if (!k) return;
      if (z.mcStatus !== undefined) k.mcStatus = z.mcStatus;
      if (z.mcEmail !== undefined) k.mcEmail = z.mcEmail;
      if (z.uctEmailSync !== undefined) k.uctEmailSync = z.uctEmailSync;
      if (z.posledniChyba !== undefined) k.posledniChyba = z.posledniChyba;
      if (z.odhlasenoVMailchimpu) {
        k.mcOdhlasenoAt = z.odhlasenoVMailchimpu;
        k.mcStatus = "unsubscribed";
        if (k.souhlas) {
          k.souhlas = false;
          k.odvolanoAt = tik();
          historie.push({ userId, udalost: "odhlasen_v_mailchimpu" });
        }
      }
    },
    async zaberUvitani(userId) {
      const k = kontakty.get(userId);
      if (!k || k.welcomeAt || !k.souhlas) return false;
      k.welcomeAt = tik();
      return true;
    },
    async uvolniUvitani(userId) {
      const k = kontakty.get(userId);
      if (k) k.welcomeAt = null;
    },
    async hotovo(uloha) {
      const f = fronta.find((x) => x.id === uloha.id);
      f.stav = "hotovo";
      f.mcEmail = null;
    },
    async odloz(uloha, chyba, zaMs) {
      const f = fronta.find((x) => x.id === uloha.id);
      Object.assign(f, { stav: "ceka", dalsi: ted + zaMs, chyba });
    },
    async vzdej(uloha, chyba) {
      const f = fronta.find((x) => x.id === uloha.id);
      Object.assign(f, { stav: "vzdano", chyba });
    },
  };
  return u;
}

const DOI = { doubleOptIn: true, smazatTrvale: true };
const beh = (sim, ul, n = DOI) => zpracujFrontu(sim.klient, ul, n);

(async () => {
  console.log("── klient ──");
  await test("datacentrum z klíče a hash podle dokumentace (MD5 malých písmen)", () => {
    assert.strictEqual(datacentrum("abc-us21"), "us21");
    assert.throws(() => datacentrum("bezpripony"));
    assert.strictEqual(hashClena(" Jana@X.cz "), require("crypto").createHash("md5").update("jana@x.cz").digest("hex"));
  });

  console.log("── 1–2) registrace se souhlasem a bez ──");
  await test("1) souhlas → kontakt jako pending (double opt-in), uvítání až po potvrzení", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz" });
    ul.souhlas("u1", true);
    const v = await beh(sim, ul);
    assert.strictEqual(v.hotovo, 1);
    const c = sim.clen("jana@x.cz");
    assert.strictEqual(c.status, "pending");
    assert.deepStrictEqual(c.merge, { FNAME: "Jana", KLIDOO_ID: "u1", REGDATE: "2026-11-01", SOURCE: "registrace" });
    assert.strictEqual(sim.uvitani, 0, "uvítání nesmí odejít před potvrzením");
    ul.potvrdDoi("u1", sim);
    await beh(sim, ul);
    assert.strictEqual(sim.uvitani, 1);
    assert.ok(c.tags.has(TAGY.registrovany));
    assert.ok(ul.kontakty.get("u1").welcomeAt);
  });
  await test("1b) bez double opt-in → rovnou subscribed a uvítání", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz" });
    ul.souhlas("u1", true);
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    assert.strictEqual(sim.clen("jana@x.cz").status, "subscribed");
    assert.strictEqual(sim.uvitani, 1);
  });
  await test("2) bez souhlasu → do Mailchimpu nic nezapíše", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u2", { email: "petr@x.cz" });
    ul.zarad("u2");
    await beh(sim, ul);
    assert.strictEqual(sim.zapisu, 0);
    assert.strictEqual(sim.clenove.size, 0);
  });

  console.log("── 3–4) aktualizace a opakování ──");
  await test("3) změna jména → jen merge fields, stav se nemění a status se neposílá", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    ul.kontakty.get("u1").jmeno = "Johana Nová";
    ul.zarad("u1");
    let telo;
    const puvodni = sim.fetch;
    sim.klient = vytvorKlienta({
      apiKlic: "x-us21",
      audienceId: "aud123",
      fetch: (url, init) => {
        if (init?.method === "PUT") telo = JSON.parse(init.body);
        return puvodni(url, init);
      },
    });
    await beh(sim, ul);
    assert.strictEqual(sim.clen("jana@x.cz").merge.FNAME, "Johana");
    assert.strictEqual(telo.status, undefined, "u existujícího kontaktu se status neposílá");
    assert.strictEqual(sim.clen("jana@x.cz").status, "subscribed");
  });
  await test("4) tatáž úloha dvakrát / dvojí zpracování → žádná duplicita, uvítání jednou", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    ul.zarad("u1");
    assert.strictEqual(ul.cekajici(), 1, "fronta drží jednu čekající úlohu");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    assert.strictEqual(sim.clenove.size, 1);
    assert.strictEqual(sim.uvitani, 1);
  });

  console.log("── 5) změna e-mailu ──");
  await test("5) nová adresa účtu → kontakt se přesune, nevznikne druhý", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "stara@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    ul.kontakty.get("u1").email = "nova@x.cz";
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    assert.strictEqual(sim.clenove.size, 1);
    assert.strictEqual(sim.clen("nova@x.cz").status, "subscribed");
    assert.strictEqual(ul.kontakty.get("u1").mcEmail, "nova@x.cz");
    assert.strictEqual(sim.uvitani, 1);
  });
  await test("5b) nová adresa už v Audience je → starý kontakt odhlásit, nový nepřepsat na subscribed", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "stara@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    sim.clenove.set(hashClena("nova@x.cz"), { email: "nova@x.cz", status: "unsubscribed", last_changed: tik(), tags: new Set(), merge: {} });
    ul.kontakty.get("u1").email = "nova@x.cz";
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    assert.strictEqual(sim.clen("stara@x.cz").status, "unsubscribed");
    assert.strictEqual(sim.clen("nova@x.cz").status, "unsubscribed");
  });
  await test("5c) adresa změněná přímo v Mailchimpu (upemail) se nepřepisuje zpět", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "ucet@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    await sim.klient.zmenEmail("ucet@x.cz", "osobni@x.cz");
    ul.kontakty.get("u1").mcEmail = "osobni@x.cz"; // webhook upemail
    ul.kontakty.get("u1").jmeno = "Jana Jiná";
    ul.zarad("u1");
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    assert.ok(sim.clen("osobni@x.cz"));
    assert.ok(!sim.clen("ucet@x.cz"));
  });

  console.log("── 6–8) odvolání a odhlášení ──");
  await test("6) odvolání v Klidoo → unsubscribed v Mailchimpu", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz" });
    ul.souhlas("u1", true);
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    ul.souhlas("u1", false);
    await beh(sim, ul);
    assert.strictEqual(sim.clen("jana@x.cz").status, "unsubscribed");
    assert.strictEqual(ul.kontakty.get("u1").mcStatus, "unsubscribed");
  });
  await test("7) odhlášení přímo v Mailchimpu (webhook nedorazil) → souhlas v Klidoo končí", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz" });
    ul.souhlas("u1", true);
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    Object.assign(sim.clen("jana@x.cz"), { status: "unsubscribed", last_changed: tik() });
    ul.zarad("u1");
    await beh(sim, ul);
    assert.strictEqual(sim.clen("jana@x.cz").status, "unsubscribed");
    assert.strictEqual(ul.kontakty.get("u1").souhlas, false);
    assert.ok(ul.historie.some((h) => h.udalost === "odhlasen_v_mailchimpu"));
  });
  await test("8) úprava profilu po odhlášení → žádné opětovné přihlášení ani zápis", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz" });
    ul.souhlas("u1", true);
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    Object.assign(sim.clen("jana@x.cz"), { status: "unsubscribed", last_changed: tik() });
    ul.zarad("u1");
    await beh(sim, ul);
    const zapisuPred = sim.zapisu;
    ul.kontakty.get("u1").jmeno = "Jana Přejmenovaná";
    ul.zarad("u1");
    await beh(sim, ul);
    assert.strictEqual(sim.clen("jana@x.cz").status, "unsubscribed");
    assert.strictEqual(sim.zapisu, zapisuPred, "po odhlášení se do Mailchimpu nezapisuje");
  });
  await test("8b) i kdyby souhlas zůstal (souběh), odhlášený se znovu nepřihlásí bez nového souhlasu", () => {
    const stav = { souhlas: true, souhlasAt: "2026-01-01T00:00:00Z", mcOdhlasenoAt: null };
    const a = rozhodni(stav, { status: "unsubscribed", lastChanged: "2026-02-01T00:00:00Z", tagy: [] }, true);
    assert.strictEqual(a.druh, "respektovat-odhlaseni");
    const b = rozhodni(stav, { status: "cleaned", lastChanged: null, tagy: [] }, true);
    assert.strictEqual(b.druh, "nic");
  });
  await test("8c) nový souhlas PO odhlášení → jen pending (potvrzovací e-mail), nikdy rovnou subscribed", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz" });
    ul.souhlas("u1", true);
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    Object.assign(sim.clen("jana@x.cz"), { status: "unsubscribed", last_changed: tik() });
    ul.kontakty.get("u1").souhlas = false;
    ul.souhlas("u1", true);
    await beh(sim, ul, { doubleOptIn: false, smazatTrvale: true });
    assert.strictEqual(sim.clen("jana@x.cz").status, "pending");
  });
  await test("8d) kdo se přihlásil přímo u Mailchimpu, toho chybějící souhlas v Klidoo neodhlásí", () => {
    const a = rozhodni({ souhlas: false, odvolanoAt: null }, { status: "subscribed", lastChanged: "2026-01-01T00:00:00Z", tagy: [] }, true);
    assert.strictEqual(a.druh, "nic");
  });

  console.log("── 9–12) výpadky a chyby ──");
  await test("9) rate limit 429 → úloha odložena, běh se přeruší, zbytek zpět do fronty", async () => {
    const sim = simulator();
    const ul = uloziste();
    for (const i of [1, 2, 3]) {
      ul.pridej("u" + i, { email: `u${i}@x.cz`, souhlas: true, souhlasAt: tik() });
      ul.zarad("u" + i);
    }
    sim.dalsiPorucha({ status: 429, title: "Too Many Requests" });
    const v = await beh(sim, ul);
    assert.strictEqual(v.preruseno, "Mailchimp rate limit");
    assert.strictEqual(v.zpracovano, 1);
    assert.strictEqual(v.odlozeno, 3);
    assert.strictEqual(ul.fronta.filter((f) => f.stav === "vzdano").length, 0);
  });
  await test("10) Mailchimp nedostupný (503 i síť) → exponenciální odstup, po 8 pokusech vzdát a ohlásit", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    for (let i = 0; i < 8; i++) {
      sim.dalsiPorucha(i % 2 ? { status: 503 } : { sit: true });
      const v = await beh(sim, ul);
      if (i < 7) {
        assert.strictEqual(v.odlozeno, 1);
        const f = ul.fronta[0];
        assert.strictEqual(f.dalsi - ted, odstup(i + 1));
        ted = f.dalsi;
      } else {
        assert.strictEqual(v.vzdano, 1);
        assert.ok(v.hlaseni.length === 1);
      }
    }
    assert.deepStrictEqual([odstup(1), odstup(2), odstup(3)], [60000, 120000, 240000]);
    assert.strictEqual(odstup(30), 6 * 60 * 60 * 1000);
  });
  await test("11) chybný API klíč (401) → běh stojí, hlášení správci, nic se nevzdá", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "a@x.cz", souhlas: true, souhlasAt: tik() });
    ul.pridej("u2", { email: "b@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    ul.zarad("u2");
    sim.dalsiPorucha({ status: 401, title: "API Key Invalid" });
    const v = await beh(sim, ul);
    assert.strictEqual(v.preruseno, "Mailchimp odmítl API klíč");
    assert.match(v.hlaseni[0], /API klíč/);
    assert.ok(!v.hlaseni[0].includes("testovaci"), "klíč se nesmí objevit v hlášení");
    assert.strictEqual(v.vzdano, 0);
    assert.strictEqual(ul.cekajici(), 2);
  });
  await test("12) po obnovení služby se odložené úlohy dokončí", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    sim.dalsiPorucha({ status: 503 });
    await beh(sim, ul);
    assert.strictEqual(sim.clenove.size, 0);
    const nic = await beh(sim, ul);
    assert.strictEqual(nic.zpracovano, 0, "před uplynutím odstupu se nezkouší");
    ted += odstup(1);
    const v = await beh(sim, ul);
    assert.strictEqual(v.hotovo, 1);
    assert.strictEqual(sim.clen("jana@x.cz").status, "pending");
  });
  await test("12b) trvalá chyba (trvale smazaný kontakt) → vzdát hned, bez opakování", async () => {
    const sim = simulator();
    const ul = uloziste();
    sim.zapomenute.add(hashClena("jana@x.cz"));
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    const v = await beh(sim, ul);
    assert.strictEqual(v.vzdano, 1);
    assert.match(ul.kontakty.get("u1").posledniChyba, /Forgotten/);
  });

  console.log("── 13) uvítací sekvence jen jednou ──");
  await test("13) odvolání a nový souhlas → uvítání podruhé neodejde", async () => {
    const sim = simulator();
    const ul = uloziste();
    const n = { doubleOptIn: false, smazatTrvale: true };
    ul.pridej("u1", { email: "jana@x.cz" });
    ul.souhlas("u1", true);
    await beh(sim, ul, n);
    ul.souhlas("u1", false);
    await beh(sim, ul, n);
    ul.souhlas("u1", true);
    await beh(sim, ul, n);
    ul.zarad("u1");
    await beh(sim, ul, n);
    assert.strictEqual(sim.uvitani, 1);
  });
  await test("13b) selže přidání uvítacího tagu → záznam se uvolní a příště se to povede jednou", async () => {
    const sim = simulator();
    const ul = uloziste();
    const n = { doubleOptIn: false, smazatTrvale: true };
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    const puvodni = sim.fetch;
    let tagovani = 0;
    sim.klient = vytvorKlienta({
      apiKlic: "x-us21",
      audienceId: "aud123",
      fetch: async (url, init) => {
        if (String(url).endsWith("/tags") && JSON.parse(init.body).tags[0].name === TAGY.uvitani && tagovani++ === 0) {
          return new Response(JSON.stringify({ title: "Service Unavailable" }), { status: 503 });
        }
        return puvodni(url, init);
      },
    });
    await beh(sim, ul, n);
    assert.strictEqual(ul.kontakty.get("u1").welcomeAt, null);
    ted += odstup(1);
    await beh(sim, ul, n);
    assert.strictEqual(sim.uvitani, 1);
    assert.ok(ul.kontakty.get("u1").welcomeAt);
  });

  console.log("── smazání účtu ──");
  await test("smazání účtu → kontakt trvale vymazán, adresa ve frontě se zahodí", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    await beh(sim, ul);
    ul.smazUcet("u1");
    await beh(sim, ul);
    assert.strictEqual(sim.clenove.size, 0);
    assert.ok(sim.zapomenute.has(hashClena("jana@x.cz")));
    assert.ok(ul.fronta.every((f) => f.mcEmail === null));
  });
  await test("smazání s archivací → status archived", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("u1", { email: "jana@x.cz", souhlas: true, souhlasAt: tik() });
    ul.zarad("u1");
    await beh(sim, ul);
    ul.smazUcet("u1");
    await beh(sim, ul, { doubleOptIn: true, smazatTrvale: false });
    assert.strictEqual(sim.clen("jana@x.cz").status, "archived");
  });

  console.log("── 14) webhook ──");
  const telo =
    "type=unsubscribe&fired_at=2026-11-06+10%3A00%3A00&data%5Baction%5D=unsub&data%5Bid%5D=8a25ff1d98" +
    "&data%5Blist_id%5D=aud123&data%5Bemail%5D=Jana%40x.cz&data%5Bmerges%5D%5BKLIDOO_ID%5D=" +
    "11111111-2222-3333-4444-555555555555";
  await test("14a) token: chybějící, špatný i jinak dlouhý se odmítne", () => {
    assert.ok(tokenSedi("tajne123", "tajne123"));
    assert.ok(!tokenSedi("tajne123", "tajne124"));
    assert.ok(!tokenSedi("tajne123", "tajne"));
    assert.ok(!tokenSedi("tajne123", null));
    assert.ok(!tokenSedi(undefined, "cokoli"), "bez tokenu v .env se nepřijme nic");
  });
  await test("14b) podpis HMAC: platný projde, upravené tělo, cizí klíč a starý čas ne", () => {
    const tajemstvi = "whsec_test";
    const t = Math.floor(ted / 1000);
    const hlavicka = `t=${t},v1=${podepis(tajemstvi, t, telo)}`;
    assert.strictEqual(overPodpis(tajemstvi, hlavicka, telo, ted), "ok");
    assert.strictEqual(overPodpis(tajemstvi, hlavicka, telo + "&x=1", ted), "neplatny");
    assert.strictEqual(overPodpis("jiny", hlavicka, telo, ted), "neplatny");
    assert.strictEqual(overPodpis(tajemstvi, hlavicka, telo, ted + 301000), "stary");
    assert.strictEqual(overPodpis(tajemstvi, null, telo, ted), "chybi");
    assert.strictEqual(overPodpis(tajemstvi, "nesmysl", telo, ted), "neplatny");
  });
  await test("14c) tělo se rozparsuje, klíč pro deduplikaci je stejný pro opakované doručení", () => {
    const u = rozparsuj(telo);
    assert.strictEqual(u.typ, "unsubscribe");
    assert.strictEqual(u.email, "jana@x.cz");
    assert.strictEqual(u.listId, "aud123");
    assert.strictEqual(u.klidooId, "11111111-2222-3333-4444-555555555555");
    assert.strictEqual(u.firedAt.toISOString(), "2026-11-06T10:00:00.000Z");
    assert.strictEqual(rozparsuj(telo).klic, u.klic);
    const up = rozparsuj("type=upemail&data%5Blist_id%5D=aud123&data%5Bold_email%5D=a%40x.cz&data%5Bnew_email%5D=b%40x.cz");
    assert.strictEqual(up.email, "a@x.cz");
    assert.strictEqual(up.novyEmail, "b@x.cz");
    assert.strictEqual(rozparsuj("type=unsubscribe"), null, "bez adresy se událost nezpracuje");
    assert.strictEqual(rozparsuj(telo.replace("11111111-2222", "nesmysl")).klidooId, null);
  });

  console.log("── 15) jednorázová migrace ──");
  await test("15) dry-run jen čte; ostrý běh jen zařadí; opakování je bezpečné", async () => {
    const sim = simulator();
    const ul = uloziste();
    ul.pridej("novy", { email: "novy@x.cz", souhlas: true, souhlasAt: tik() });
    ul.pridej("existuje", { email: "existuje@x.cz", souhlas: true, souhlasAt: tik() });
    ul.pridej("odhlaseny", { email: "odhlaseny@x.cz", souhlas: true, souhlasAt: tik() });
    ul.pridej("cleaned", { email: "cleaned@x.cz", souhlas: true, souhlasAt: tik() });
    ul.pridej("bez", { email: "bez@x.cz", souhlas: false });
    sim.clenove.set(hashClena("existuje@x.cz"), { email: "existuje@x.cz", status: "subscribed", last_changed: tik(), tags: new Set(), merge: {} });
    sim.clenove.set(hashClena("odhlaseny@x.cz"), { email: "odhlaseny@x.cz", status: "unsubscribed", last_changed: tik(), tags: new Set(), merge: {} });
    sim.clenove.set(hashClena("cleaned@x.cz"), { email: "cleaned@x.cz", status: "cleaned", last_changed: tik(), tags: new Set(), merge: {} });
    const vsichni = [...ul.kontakty.values()];

    const dry = await migrace(sim.klient, vsichni, true, async (id) => ul.zarad(id));
    assert.deepStrictEqual(
      { z: dry.zpusobilych, n: dry.novych, e: dry.existujicich, o: dry.preskoceno.odhlaseno, c: dry.preskoceno.cleaned, q: dry.zarazeno },
      { z: 2, n: 1, e: 1, o: 1, c: 1, q: 0 },
    );
    assert.strictEqual(sim.zapisu, 0, "dry-run nic nezapisuje");
    assert.strictEqual(ul.cekajici(), 0);

    const ostra = await migrace(sim.klient, vsichni, false, async (id) => ul.zarad(id));
    assert.strictEqual(ostra.zarazeno, 2);
    await migrace(sim.klient, vsichni, false, async (id) => ul.zarad(id));
    assert.strictEqual(ul.cekajici(), 2, "opakování nic nezdvojí");
    await beh(sim, ul);
    assert.strictEqual(sim.clen("odhlaseny@x.cz").status, "unsubscribed");
    assert.strictEqual(sim.clen("cleaned@x.cz").status, "cleaned");
    assert.ok(!sim.clen("bez@x.cz"));
    assert.strictEqual(sim.clenove.size, 4);
  });

  console.log("── pojistky ──");
  await test("žádný test nesáhl mimo simulátor ani na jiného hostitele", () => {
    // Všechny klienty v testech používají podstrčený fetch a hostitele us21.
    const sim = simulator();
    return sim.klient.nactiClena("x@x.cz").then(() => assert.deepStrictEqual([...sim.hostitele], ["us21.api.mailchimp.com"]));
  });
  await test("text souhlasu v kódu = text v migraci 0044 (verze sedí)", () => {
    const sql = fs.readFileSync("supabase/migrations/0044_marketing_souhlasy.sql", "utf8");
    const norm = (t) => t.replace(/ /g, " ");
    assert.ok(sql.includes(`'${MARKETING_SOUHLAS.verze}'`));
    assert.ok(norm(sql).includes(norm(MARKETING_SOUHLAS.text)));
  });
  await test("text souhlasu odpovídá zadání a nikde se nepředvyplňuje", () => {
    assert.match(MARKETING_SOUHLAS.text, /kdykoliv odvolat/);
    const form = fs.readFileSync("src/app/(registrace)/registrace/register-form.tsx", "utf8");
    assert.ok(form.includes("React.useState(false);\n  // Marketingový") || /\[marketing, setMarketing\] = React\.useState\(false\)/.test(form));
    assert.ok(!/defaultChecked/.test(form));
  });
  await test("klíč Mailchimpu není v klientském kódu (žádné NEXT_PUBLIC_MAILCHIMP)", () => {
    const { execSync } = require("child_process");
    const nalezy = execSync("grep -rl 'NEXT_PUBLIC_MAILCHIMP' src .env.example || true").toString().trim();
    assert.strictEqual(nalezy, "");
    const klientske = execSync("grep -rl '\"use client\"' src").toString().split("\n").filter(Boolean);
    for (const f of klientske) {
      const obsah = fs.readFileSync(f, "utf8");
      assert.ok(!/mailchimp\/(server|beh)/.test(obsah), `${f} importuje serverovou část Mailchimpu`);
    }
  });

  console.log(`\n${pocet - selhalo}/${pocet} prošlo`);
  if (selhalo) process.exit(1);
  console.log("Všechno prošlo.");
})();
