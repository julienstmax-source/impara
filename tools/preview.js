// Captures d'écran de toutes les vues (iPhone 390×844 + ordinateur), API Supabase simulée, état seedé.
// Usage : node tools/preview.js [--dark] [--out dossier]
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), args = process.argv.slice(2), DARK = args.includes("--dark");
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : path.join(ROOT, "tools/shots"); fs.mkdirSync(OUT, { recursive: true });
const sfx = DARK ? "-dark" : "";
const types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2", ".json": "application/json" };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/impara\/?/, "") || "index.html"; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(fs.readFileSync(f)); }).listen(8793);
const now = Date.now(), d = (ms) => new Date(now - ms).toISOString();
const dk = (ms) => { const k = new Date(now - ms); return `${k.getFullYear()}-${String(k.getMonth() + 1).padStart(2, "0")}-${String(k.getDate()).padStart(2, "0")}`; };

// — API simulée —
const items = JSON.parse(fs.readFileSync(path.join(ROOT, "items.json"), "utf8"));
const byId = Object.fromEntries(items.map((i) => [i.id, i]));
const fakeSent = [["w:e1", 20], ["p:p3", 80], ["c:presente:andare:2", 150], ["w:l3", 300], ["p:p145", 26 * 60], ["w:q4", 27 * 60], ["c:passato:venire:0", 50 * 60], ["w:t2", 51 * 60], ["p:p12", 75 * 60]]
  .map(([id, min], i) => ({ sent_at: d(min * 60e3), why: ["ripasso", "percorso", "random"][i % 3], item: byId[id] || items[i] }));
const fakeStats = (() => { const by_day = [], by_hour = Array(24).fill(0); let seed = 7; const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; let total = 0; const kinds = { word: 0, phrase: 0, conj: 0 };
  for (let i = 22; i >= 0; i--) { const k = new Date(now - i * 86400e3); const n = k.getDay() === 0 ? 2 : 7 + Math.floor(r() * 6); const row = { day: dk(i * 86400e3), word: 0, phrase: 0, conj: 0 }; for (let j = 0; j < n; j++) { const kd = r() < 0.5 ? "word" : r() < 0.7 ? "phrase" : "conj"; row[kd]++; kinds[kd]++; by_hour[9 + Math.floor(r() * 9)]++; total++; } by_day.push(row); }
  return { device: { enabled: true, interval_min: 30, start_hour: 9, end_hour: 18, tz: "Europe/Rome", kinds: ["word", "phrase", "conj"], last_sent_at: d(17 * 60e3), created_at: d(23 * 86400e3), subscribed: true }, total, first_at: d(23 * 86400e3), distinct: Math.round(total * 0.94), items_total: items.length, coverage: { word: { sent: Math.round(kinds.word * 0.94), total: 571 }, phrase: { sent: Math.round(kinds.phrase * 0.94), total: 294 }, conj: { sent: kinds.conj, total: 4296 } }, by_day, by_hour, by_why: { ripasso: Math.round(total * 0.42), percorso: Math.round(total * 0.31), random: total - Math.round(total * 0.42) - Math.round(total * 0.31) }, top_tags: [{ tag: "Al lavoro", n: 31 }, { tag: "Parole utili", n: 24 }, { tag: "Strada & trasporti", n: 19 }, { tag: "Vivi l'italiano · Unità 8", n: 14 }, { tag: "Presente", n: 12 }, { tag: "Torino & tempo libero", n: 11 }], cron: { last_run: d(3 * 60e3), ok: 6624, failed: 2 } }; })();
function mock(route) {
  const u = new URL(route.request().url()), r = u.pathname.replace("/functions/v1/api", ""), j = (o, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(o) });
  if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
  if (r === "/vapid") return j({ key: "BNoKey" });
  if (r === "/me" || r === "/register") return j({ exists: true, subscribed: true, enabled: true, interval_min: 30, start_hour: 9, end_hour: 18, kinds: ["word", "phrase", "conj"] });
  if (r === "/today") return j({ sent: fakeSent });
  if (r === "/stats") return j(fakeStats);
  if (r === "/test") return j({ ok: true, report: [{ sent: "w:e1" }] });
  return j({ error: "route inconnue" }, 404);
}
// — état local seedé : 42 cartes vues, 13 acquises, activité sur 14 jours, erreurs typées, percorso en cours —
const SEED = `(() => {
  const now = Date.now(), DAY = 86400000, s = { device: "11111111-1111-4111-8111-111111111111", progress: {}, pos: {}, stats: { streak: 12, lastDay: new Date().toDateString(), bestQuiz: 8, errors: { ausiliare: 7, accordo: 5, preposizione: 4, tempo: 3, ortografia: 3, articolo: 1 } }, grammar: { g1: 4, g2: 4, g3: 4, g4: 3, g5: 4, g6: 1 }, conjBest: { presente: 7, passato: 5 }, percorsi: { active: "lavoro", done: { "lavoro:l1": now - 3 * DAY, "lavoro:l2": now - 2 * DAY, "lavoro:l3": now - DAY } }, activity: {}, menu: null, theme: ${DARK ? '"dark"' : "null"}, goals: { newCards: 30, lessons: 2 }, settings: { interval_min: 30, start_hour: 9, end_hour: 18, kinds: ["word", "phrase", "conj"], enabled: true }, subscribed: true };
  const ids = ["e1","e2","e3","e4","e5","e6","e7","e8","e9","e10","e11","e12","e13","e14","q1","q2","q3","q4","q5","q6","q7","q8","l1","l2","l3","l4","l5","l6","l7","l8","l9","l10","l11","l12","l13","l14","l15","l16","t1","t2","t3","t4"];
  ids.forEach((id, i) => { const box = i < 13 ? 4 : i < 25 ? 2 : i < 34 ? 1 : 0; s.progress[id] = { box, due: now + (box === 4 ? 6 : box === 2 ? -1 : 0) * DAY, seen: true, fails: i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0, lapses: i % 11 === 0 ? 1 : 0, lastOk: box > 0, updated: now - i * 3600e3 }; });
  for (let i = 13; i >= 0; i--) { const k = new Date(now - i * DAY); const key = k.getFullYear() + "-" + String(k.getMonth() + 1).padStart(2, "0") + "-" + String(k.getDate()).padStart(2, "0"); const a = k.getDay() === 0 ? 4 : 10 + ((i * 7) % 13); s.activity[key] = { answers: a, correct: Math.round(a * (0.62 + (i % 4) * 0.08)), newCards: 3 + (i % 5), lessons: i % 4 === 0 ? 1 : 0 }; }
  localStorage.setItem("impara-app-v1", JSON.stringify(s));
})()`;

(async () => {
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "fr-FR", colorScheme: DARK ? "dark" : "light" });
  await ctx.addInitScript(() => { try { Object.defineProperty(Notification, "permission", { get: () => "granted" }); } catch (e) {} });
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.route("https://ngjvhpvtgbsywxvshwmp.supabase.co/**", mock);
  await page.goto("http://localhost:8793/impara/", { waitUntil: "networkidle" });
  await page.evaluate(SEED); await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(500);
  const go = async (h, wait = 350) => { await page.evaluate((h) => { location.hash = h; }, h); await page.waitForTimeout(wait); };
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}${sfx}.png` }); };
  const click = async (sel) => { await page.click(sel); await page.waitForTimeout(220); };
  const scrollTo = async (y) => { await page.evaluate((y) => { document.querySelector(".main").scrollTop = y; }, y); await page.waitForTimeout(120); };

  await go("#/oggi", 700); await shot("01-oggi"); await scrollTo(600); await shot("01b-oggi-suite");
  await go("#/studia"); await shot("02-studia");
  await go("#/studia/lavoro"); await shot("03-flashcard"); await click(".fcard"); await shot("03b-flashcard-retro");
  await go("#/ripasso"); await shot("04-ripasso");
  await go("#/grammatica"); await shot("05-grammatica"); await scrollTo(700); await shot("05b-grammatica-suite");
  await go("#/grammatica/g8"); await shot("06-lezione"); await click('[data-a="xp-open"]'); await page.waitForTimeout(500); await shot("06b-spiegazione");
  await click('[data-a="xp-play"]'); await click('[data-a="xp-next"]'); await page.waitForTimeout(600); await shot("06c-spiegazione-2");
  await scrollTo(900); await shot("06d-lezione-tables"); await scrollTo(0); await click('[data-a="xp-close"]'); await click('[data-a="l-quiz"]'); await shot("06e-quiz");
  await go("#/grammatica/coniuga"); await shot("07-coniuga-menu"); await click('[data-a="c-start"]'); await shot("07b-coniuga");
  await go("#/giochi"); await shot("08-giochi");
  await go("#/giochi/scelta"); await shot("09-scelta");
  await go("#/giochi/scrivi"); await shot("09b-scrivi");
  await go("#/giochi/cruci", 600); await shot("09c-cruci");
  await go("#/giochi/abbina"); await shot("09d-abbina");
  await go("#/percorsi"); await shot("10-percorsi");
  await go("#/percorsi/lavoro"); await shot("10b-percorso");
  await go("#/progressi", 900); await shot("11-progressi-io"); await scrollTo(620); await shot("11b-progressi-io-suite");
  await click('[data-a="prog-tab"][data-tab="notifiche"]'); await page.waitForTimeout(900); await shot("12-progressi-notifiche"); await scrollTo(640); await shot("12b-progressi-notifiche-suite");
  await click('[data-a="prog-tab"][data-tab="contenuto"]'); await page.waitForTimeout(900); await shot("13-progressi-contenuto");
  await go("#/impostazioni"); await shot("14-impostazioni"); await scrollTo(600); await shot("14b-impostazioni-suite");
  await go("#/oggi"); await click('[data-a="menu-primo"]'); await page.waitForTimeout(400); await shot("15-sessione");
  const fc = await page.$('[data-a="sess-seen"]'); if (fc) { for (let i = 0; i < 8; i++) { const bt = await page.$('[data-a="sess-seen"]'); if (!bt) break; await bt.click(); await page.waitForTimeout(60); } await page.waitForTimeout(300); await shot("15b-sessione-quiz"); }
  const mcq = await page.$('[data-a="s-mcq"]'); if (mcq) { await mcq.click(); await page.waitForTimeout(250); await shot("15c-sessione-reponse"); }

  // Ordinateur
  const c2 = await b.newContext({ viewport: { width: 1280, height: 820 }, locale: "fr-FR", colorScheme: DARK ? "dark" : "light" });
  await c2.addInitScript(() => { try { Object.defineProperty(Notification, "permission", { get: () => "granted" }); } catch (e) {} });
  const p2 = await c2.newPage(); p2.on("pageerror", (e) => errors.push("desk pageerror: " + e.message));
  await p2.route("https://ngjvhpvtgbsywxvshwmp.supabase.co/**", mock);
  await p2.goto("http://localhost:8793/impara/", { waitUntil: "networkidle" }); await p2.evaluate(SEED); await p2.reload({ waitUntil: "networkidle" }); await p2.waitForTimeout(600);
  await p2.screenshot({ path: `${OUT}/20-desk-oggi${sfx}.png` });
  await p2.evaluate(() => { location.hash = "#/grammatica/g25"; }); await p2.waitForTimeout(300); await p2.click('[data-a="xp-open"]'); await p2.waitForTimeout(600); await p2.screenshot({ path: `${OUT}/21-desk-lezione${sfx}.png` });
  await p2.evaluate(() => { location.hash = "#/progressi"; }); await p2.waitForTimeout(300); await p2.click('[data-a="prog-tab"][data-tab="notifiche"]'); await p2.waitForTimeout(1000); await p2.screenshot({ path: `${OUT}/22-desk-notifiche${sfx}.png` });
  await p2.evaluate(() => { location.hash = "#/studia/casa"; }); await p2.waitForTimeout(400); await p2.screenshot({ path: `${OUT}/23-desk-flashcard${sfx}.png` });
  const metrics = await page.evaluate(() => ({ dom: document.querySelectorAll("*").length, storage: (localStorage.getItem("impara-app-v1") || "").length, html: document.documentElement.outerHTML.length }));
  console.log("metrics:", JSON.stringify(metrics)); console.log("ERRORS:", errors.length ? errors : "none");
  await b.close(); srv.close();
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
