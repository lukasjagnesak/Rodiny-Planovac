/**
 * Aplikace z App Store a Google Play: rozpoznání, přesměrování
 * marketingových stránek a push notifikace přes APNs a FCM.
 *
 * Nic nejde na síť — APNs JWT se ověřuje vygenerovaným klíčem, FCM
 * běží proti podstrčenému `fetch`.
 *
 * Spouští se přes `npm run test:nativni`.
 */
const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const { jeAplikace, presmerovatVAplikaci } = require("../.test-build/lib/nativni.js");
const { smiMerit } = require("../.test-build/lib/mereni-hranice.js");
const P = require("../.test-build/lib/push-nativni.js");

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

(async () => {
  console.log("── rozpoznání aplikace ──");
  await test("značka KlidooApp v User-Agent", () => {
    assert.ok(jeAplikace("Mozilla/5.0 (iPhone) AppleWebKit Mobile/15E148 KlidooApp"));
    assert.ok(!jeAplikace("Mozilla/5.0 (iPhone) Safari/604.1"));
    assert.ok(!jeAplikace(null));
  });
  await test("značka v Capacitor configu sedí s kódem", () => {
    const cfg = JSON.parse(fs.readFileSync("mobil/capacitor.config.json", "utf8"));
    assert.strictEqual(cfg.appendUserAgent, "KlidooApp");
    assert.strictEqual(cfg.appId, "cz.klidoo.app");
    assert.match(cfg.server.url, /^https:\/\/klidoo\.cz\//);
  });

  console.log("── co je v aplikaci vidět ──");
  const presmeruj = (c) => presmerovatVAplikaci(c, smiMerit);
  await test("ceník, úvod, kalkulačky a články → přehled", () => {
    for (const c of ["/", "/cenik", "/kalkulacka", "/kalkulacka-vyzivneho", "/clanky/neco", "/jak-funguje", "/vyzkouset"]) {
      assert.ok(presmeruj(c), c);
    }
  });
  await test("přihlášení, registrace a právní texty zůstávají", () => {
    for (const c of ["/prihlaseni", "/registrace", "/zasady-ochrany-osobnich-udaju", "/obchodni-podminky", "/bezpecnost"]) {
      assert.ok(!presmeruj(c), c);
    }
  });
  await test("aplikace samotná (přehled, předplatné, auth) se nepřesměrovává", () => {
    for (const c of ["/prehled", "/predplatne", "/kalendar", "/auth/callback", "/auth/aplikace", "/pozvanka/abc"]) {
      assert.ok(!presmeruj(c), c);
    }
  });

  console.log("── rozcestník push ──");
  await test("předpona v endpointu určuje kanál", () => {
    assert.deepStrictEqual(P.druhOdberu("apns:abc"), { druh: "apns", token: "abc" });
    assert.deepStrictEqual(P.druhOdberu("fcm:x:y"), { druh: "fcm", token: "x:y" });
    assert.strictEqual(P.druhOdberu("https://fcm.googleapis.com/wp/123").druh, "web");
  });
  await test("token zařízení: hex pro iPhone, base64url pro Android, nic jiného", () => {
    assert.ok(P.platnyToken("ios", "a".repeat(64)));
    assert.ok(!P.platnyToken("ios", "z".repeat(64)));
    assert.ok(P.platnyToken("android", "dXk3:APA91b" + "x".repeat(40)));
    assert.ok(!P.platnyToken("android", "<script>" + "x".repeat(40)));
    assert.ok(!P.platnyToken("web", "a".repeat(64)));
    assert.ok(!P.platnyToken("ios", "abc"));
  });

  console.log("── APNs ──");
  const ec = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
  const apns = {
    klic: ec.privateKey.export({ type: "pkcs8", format: "pem" }),
    klicId: "ABC123DEFG",
    teamId: "TEAM123456",
    bundleId: "cz.klidoo.app",
    sandbox: true,
  };
  await test("JWT pro APNs: ES256, kid, iss, platný podpis", () => {
    const jwt = P.apnsToken(apns, Date.now());
    const [h, o, p] = jwt.split(".");
    const hlavicka = JSON.parse(Buffer.from(h, "base64url"));
    const obsah = JSON.parse(Buffer.from(o, "base64url"));
    assert.deepStrictEqual(hlavicka, { alg: "ES256", kid: "ABC123DEFG" });
    assert.strictEqual(obsah.iss, "TEAM123456");
    const ok = crypto.verify("sha256", Buffer.from(`${h}.${o}`), { key: ec.publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(p, "base64url"));
    assert.ok(ok);
  });
  await test("tělo APNs: titulek, text, zvuk, odkaz", () => {
    const t = JSON.parse(P.apnsTelo({ titulek: "Zítra předání", telo: "V 17:00", odkaz: "/kalendar", tag: "predani" }));
    assert.deepStrictEqual(t.aps.alert, { title: "Zítra předání", body: "V 17:00" });
    assert.strictEqual(t.aps["thread-id"], "predani");
    assert.strictEqual(t.odkaz, "/kalendar");
  });
  await test("odpověď APNs: 410 a BadDeviceToken → smazat odběr, jiné chyby ne", () => {
    assert.deepStrictEqual(P.vyhodnotApns(200, ""), { ok: true });
    assert.ok(P.vyhodnotApns(410, '{"reason":"Unregistered"}').gone);
    assert.ok(P.vyhodnotApns(400, '{"reason":"BadDeviceToken"}').gone);
    const jina = P.vyhodnotApns(403, '{"reason":"InvalidProviderToken"}');
    assert.ok(!jina.ok && !jina.gone);
  });
  await test("nastavení APNs z prostředí: klíč jako base64, bez něj vypnuto", () => {
    assert.strictEqual(P.apnsNastaveniZProstredi({}), null);
    const n = P.apnsNastaveniZProstredi({
      APNS_KLIC_P8_BASE64: Buffer.from(apns.klic).toString("base64"),
      APNS_KLIC_ID: "K",
      APNS_TEAM_ID: "T",
    });
    assert.strictEqual(n.bundleId, "cz.klidoo.app");
    assert.strictEqual(n.sandbox, false);
    assert.match(n.klic, /BEGIN PRIVATE KEY/);
  });

  console.log("── FCM ──");
  const rsa = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const ucet = {
    project_id: "klidoo-test",
    client_email: "push@klidoo-test.iam.gserviceaccount.com",
    private_key: rsa.privateKey.export({ type: "pkcs8", format: "pem" }),
  };
  const fcm = P.fcmNastaveniZProstredi({ FCM_SERVICE_ACCOUNT_BASE64: Buffer.from(JSON.stringify(ucet)).toString("base64") });
  await test("servisní účet Firebase z prostředí", () => {
    assert.strictEqual(fcm.projekt, "klidoo-test");
    assert.strictEqual(P.fcmNastaveniZProstredi({ FCM_SERVICE_ACCOUNT_BASE64: "nesmysl" }), null);
  });
  await test("JWT pro Google OAuth: RS256, rozsah firebase.messaging, platný podpis", () => {
    const [h, o, p] = P.fcmZadostOToken(fcm).split(".");
    const obsah = JSON.parse(Buffer.from(o, "base64url"));
    assert.strictEqual(obsah.scope, "https://www.googleapis.com/auth/firebase.messaging");
    assert.strictEqual(obsah.iss, ucet.client_email);
    assert.ok(crypto.createVerify("RSA-SHA256").update(`${h}.${o}`).verify(rsa.publicKey, Buffer.from(p, "base64url")));
  });

  function falesnyGoogle(odpovedNaSend) {
    const volani = [];
    const f = async (url, init) => {
      volani.push({ url: String(url), init });
      if (String(url).startsWith("https://oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "ya29.test", expires_in: 3600 }), { status: 200 });
      }
      return odpovedNaSend();
    };
    return { f, volani };
  }
  const zprava = { titulek: "Zítra předání", telo: "V 17:00", odkaz: "/kalendar", tag: "predani" };

  await test("odeslání přes FCM v1: správná adresa, token a tělo", async () => {
    const { f, volani } = falesnyGoogle(() => new Response("{}", { status: 200 }));
    const v = await P.posliFcm(fcm, "token-zarizeni", zprava, f);
    assert.deepStrictEqual(v, { ok: true });
    const send = volani.find((x) => x.url.includes("messages:send"));
    assert.strictEqual(send.url, "https://fcm.googleapis.com/v1/projects/klidoo-test/messages:send");
    assert.strictEqual(send.init.headers.Authorization, "Bearer ya29.test");
    const telo = JSON.parse(send.init.body);
    assert.strictEqual(telo.message.token, "token-zarizeni");
    assert.strictEqual(telo.message.data.odkaz, "/kalendar");
  });
  await test("FCM UNREGISTERED → smazat odběr", async () => {
    const { f } = falesnyGoogle(
      () => new Response(JSON.stringify({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }), { status: 404 }),
    );
    const v = await P.posliFcm(fcm, "stary", zprava, f);
    assert.ok(!v.ok && v.gone);
  });
  await test("FCM výpadek → chyba, odběr zůstává", async () => {
    const { f } = falesnyGoogle(() => new Response(JSON.stringify({ error: { status: "UNAVAILABLE" } }), { status: 503 }));
    const v = await P.posliFcm(fcm, "token", zprava, f);
    assert.ok(!v.ok && !v.gone);
  });

  console.log("── aplikace bez plateb (zdrojový kód) ──");
  const cti = (f) => fs.readFileSync(f, "utf8");
  await test("předplatné: správa plateb, volba tarifu i ceny jen mimo aplikaci", () => {
    const s = cti("src/app/(app)/predplatne/page.tsx");
    assert.ok(/aplikace \? null : jeZaplaceno/.test(s));
    assert.ok(/vAplikaci\(\)/.test(s));
  });
  await test("pruh, zamčený dokument a registrace mají v aplikaci bez nákupu a ceny", () => {
    assert.ok(/bezOdkazu=\{aplikace\}/.test(cti("src/app/(app)/layout.tsx")));
    assert.ok(/aplikace \? null/.test(cti("src/components/ui/zamceno.tsx")));
    assert.ok(/inviteToken \|\| aplikace \? null/.test(cti("src/app/(registrace)/registrace/register-form.tsx")));
  });
  await test("měření třetích stran a lišta souhlasu v aplikaci neběží", () => {
    assert.ok(/!vAplikaciKlient\(\)/.test(cti("src/components/web/mereni-skripty.tsx")));
    assert.ok(/if \(vAplikaciKlient\(\)\) return;/.test(cti("src/components/web/souhlas-lista.tsx")));
  });
  await test("podpisové klíče a konfigurace Firebase nejsou v gitu", () => {
    const ign = cti("mobil/.gitignore");
    for (const v of ["*.jks", "keystore.properties", "*.p8", "google-services.json", "GoogleService-Info.plist"]) {
      assert.ok(ign.includes(v), v);
    }
  });

  console.log(`\n${pocet - selhalo}/${pocet} prošlo`);
  if (selhalo) process.exit(1);
  console.log("Všechno prošlo.");
})();
