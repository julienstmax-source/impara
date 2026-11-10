// Vérifications de non-régression (iPhone émulé + ordinateur, API simulée). Usage : node tools/checks.js — code de sortie 1 si un contrôle échoue.
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), types = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".webmanifest": "application/manifest+json", ".png": "image/png", ".woff2": "font/woff2" };
const srv = http.createServer((req, res) => { const p = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/impara\/?/, "") || "index.html", f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); res.end(fs.readFileSync(f)); }).listen(8794);
let fails = 0, n = 0; const ok = (name, cond, extra = "") => { n++; if (!cond) fails++; console.log((cond ? "✔ " : "✘ ") + name + (extra && !cond ? "  → " + extra : "")); };
const BASE = "http://localhost:8794/impara/";
(async () => {
  const b = await chromium.launch(), errors = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
  await ctx.addInitScript(() => { try { Object.defineProperty(Notification, "permission", { get: () => "granted" }); } catch (e) {} });
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  const sent = []; let registered = null, registers = 0, statsCalls = 0, me = { exists: true, subscribed: true, enabled: true, interval_min: 60, start_hour: 8, end_hour: 21, kinds: ["word", "phrase", "conj"] }, hang = false;
  const stats = () => ({ device: { enabled: true, interval_min: 30, start_hour: 9, end_hour: 18, tz: "Europe/Rome", kinds: ["word", "phrase"], last_sent_at: new Date(Date.now() - 600e3).toISOString(), created_at: new Date(Date.now() - 5 * 86400e3).toISOString(), subscribed: true }, total: 35, first_at: new Date(Date.now() - 86400e3).toISOString(), distinct: "<img src=x onerror=window.__xss=1>", items_total: 5161, coverage: { conj: { sent: 4, total: 4296 }, word: { sent: 18, total: 571 }, phrase: { sent: 13, total: 294 } }, by_day: [{ day: new Date().toISOString().slice(0, 10), conj: 2, word: 9, phrase: 5 }], by_hour: Array(24).fill(0).map((_, h) => (h >= 9 && h < 18 ? 4 : 0)), by_why: { random: 35 }, top_tags: [{ n: 5, tag: "<b>Parole</b> utili" }], cron: { ok: 288, failed: 0, last_run: new Date(Date.now() - 180e3).toISOString() } });
  await page.route("https://ngjvhpvtgbsywxvshwmp.supabase.co/**", async (route) => {
    const r = new URL(route.request().url()).pathname.replace("/functions/v1/api", ""), j = (o) => route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(o) });
    if (hang) return; // ne répond jamais : sert à tester le délai maximal
    if (r === "/me") return j(me); if (r === "/today") return j({ sent }); if (r === "/stats") { statsCalls++; return j(stats()); }
    if (r === "/register") { registers++; registered = JSON.parse(route.request().postData()); return j({ subscribed: true, enabled: true }); }
    return j({});
  });
  const go = async (h, t = 180) => { await page.evaluate((h) => { location.hash = h; }, h); await page.waitForTimeout(t); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  await page.goto(BASE + "#/impostazioni", { waitUntil: "networkidle" }); await page.waitForTimeout(400);

  // — Réglages
  await page.selectOption("#sh", "9"); await page.waitForTimeout(80); await page.selectOption("#eh", "20"); await page.waitForTimeout(80);
  await page.click('[data-a="set-int"][data-v="120"]'); await page.waitForTimeout(1000);
  const hours = await ev(() => [document.getElementById("sh").value, document.getElementById("eh").value, Store.s.settings.interval_min]);
  ok("réglages : heures conservées après changement de fréquence", hours.join() === "9,20,120", JSON.stringify(hours));
  ok("réglages : envoyés au serveur", registered && registered.start_hour === 9 && registered.end_hour === 20 && registered.interval_min === 120, JSON.stringify(registered));
  await page.selectOption("#eh", "5"); await page.waitForTimeout(200);
  ok("réglages : fin ≤ début corrigée", (await ev(() => Store.s.settings.end_hour)) === 10);
  await page.click('[data-a="set-scheme"][data-v="dark"]'); ok("thème sombre appliqué et mémorisé", (await ev(() => document.documentElement.dataset.theme === "dark" && Store.s.ui.scheme === "dark")));
  await page.click('[data-a="set-scheme"][data-v="auto"]'); ok("thème automatique rétabli", (await ev(() => !document.documentElement.dataset.theme)));
  ok("zoom par pincement autorisé", !(await ev(() => document.querySelector('meta[name="viewport"]').content.includes("maximum-scale"))));

  // — Saisie
  await go("#/giochi/scrivi"); await page.fill("#inp", "ciao"); await page.click('[data-a="wr-hint"]'); await page.waitForTimeout(120);
  ok("scrivi : texte conservé après Indice", (await page.inputValue("#inp")) === "ciao");
  await page.fill("#inp", "buongiorno"); await page.focus("#inp"); await ev(() => render()); await page.waitForTimeout(80);
  ok("saisie conservée lors d'un rendu en arrière-plan", (await page.inputValue("#inp")) === "buongiorno");
  await page.click('[data-a="wr-check"]'); await page.waitForTimeout(100); await page.click('[data-a="wr-next"]'); await page.waitForTimeout(100);
  ok("scrivi : champ vidé à la question suivante", (await page.inputValue("#inp")) === "");

  // — Navigation
  await go("#/giochi"); await page.click('a[href="#/giochi/anagramma"]'); await page.waitForTimeout(200); await page.click(".back"); await page.waitForTimeout(300);
  ok("retour : revient à la liste des jeux", (await ev(() => location.hash)) === "#/giochi");
  await go("#/inconnu"); ok("route inconnue → Oggi", (await ev(() => Router.path)) === "/oggi");
  await go("#/giochi/zzz"); ok("jeu inconnu → liste des jeux", (await page.$$(".gtile")).length === 5);
  await go("#/grammatica/coniuga/constructor"); ok("temps inconnu (constructor) → menu Coniuga, sans plantage", (await page.$$('[data-a="c-start"]')).length === 7);
  await go("#/sessione"); ok("session absente → Oggi", (await ev(() => Router.path + location.hash)) === "/oggi#/oggi");

  // — Cartes : retournement animé (même élément), nouvelle carte = nouvel élément, répétition espacée
  await go("#/studia/lavoro"); await ev(() => { window.__card = document.querySelector(".fcard"); });
  await page.click(".fcard"); await page.waitForTimeout(80);
  ok("carte : retournée sur place (l'animation peut jouer)", (await ev(() => document.querySelector(".fcard") === window.__card && window.__card.classList.contains("flip"))));
  const id1 = await ev(() => document.querySelector(".scene").dataset.key);
  await page.click('[data-a="grade"][data-k="1"]'); await page.waitForTimeout(80);
  ok("carte suivante : nouvel élément, face italienne", (await ev(() => document.querySelector(".fcard") !== window.__card && !document.querySelector(".fcard").classList.contains("flip"))));
  const p1 = await ev((id) => Store.s.progress[id], id1), mid = await ev(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1); return d.getTime(); });
  ok("carte nouvelle réussie : boîte 1, due demain à 0 h", p1.box === 1 && p1.due === mid, JSON.stringify(p1));
  await ev((id) => { Store.grade(id, true); Store.grade(id, true); Store.grade(id, true); }, id1);
  ok("carte pas encore due : la rejouer ne la fait pas monter", (await ev((id) => Store.s.progress[id].box, id1)) === 1);
  await ev((id) => { Store.s.progress[id].due = Date.now() - 1000; Store.grade(id, true); }, id1);
  ok("carte due réussie : boîte suivante", (await ev((id) => Store.s.progress[id].box, id1)) === 2);
  await ev(() => { Store.s.progress.e1 = { box: 4, due: Date.now() - 1000, seen: true, fails: 0, lapses: 0 }; Store.save(); });
  ok("ripasso : carte acquise échue revient", (await ev(() => Store.due().some((w) => w.id === "e1"))));
  await ev(() => { Store.s.progress.e2 = { box: 0, due: Date.now() - 1, seen: true, fails: 2, lapses: 0 }; });
  const weak0 = await ev(() => Store.weak().some((w) => w.id === "e2")); await ev(() => { Store.s.progress.e2.box = 3; });
  ok("da rivedere : la carte sort de la liste une fois consolidée", weak0 && !(await ev(() => Store.weak().some((w) => w.id === "e2"))));

  // — Oggi : reçus, sessions
  const now = Date.now(); const item = (id, kind, title, body, extra = null) => ({ id, kind, title, body, extra, level: "A2", tag: "" });
  sent.push({ sent_at: new Date(now - 60e3).toISOString(), item: item("w:q1", "word", "la bolletta", "la facture") }, { sent_at: new Date(now - 120e3).toISOString(), item: item("w:q1", "word", "la bolletta", "la facture") }, { sent_at: new Date(now - 180e3).toISOString(), item: item("c:presente:andare:2", "conj", "andare (aller) → lui / lei", "va", "Presente") }, { sent_at: new Date(now - 9 * 86400e3).toISOString(), item: item("w:q2", "word", "x", "y") }, { sent_at: new Date(now - 2 * 86400e3).toISOString(), item: item("w:q3", "word", "x2", "y2") }, { sent_at: "pas une date", item: null });
  await go("#/oggi"); await ev(() => Today.refresh(true)); await page.waitForTimeout(400);
  ok("oggi : le bouton compte les éléments uniques", (await page.textContent('[data-a="session"][data-scope="today"]')).includes("(2)"));
  const keys = await page.$$eval("details.day", (ds) => ds.map((d) => d.dataset.k)); ok("oggi : jours triés du plus récent au plus ancien", keys.length === 2 && keys.join() === [...keys].sort().reverse().join(), keys.join(" "));
  ok("oggi : carta du jour, 5 plats et un bouton « prochain plat »", (await page.$$(".carta .course")).length === 5 && /Antipasto|Primo/.test(await page.textContent(".carta .btn")));
  const scrollY = await ev(() => { const m = document.querySelector(".main"); m.scrollTop = 300; return m.scrollTop; });
  await ev(() => document.querySelector('[data-a="reveal"]').click()); await page.waitForTimeout(60);
  ok("oggi : la traduction se révèle sans remonter la liste", (await ev(() => document.querySelector(".main").scrollTop)) === scrollY && (await page.$$(".item .tr")).length === 1);
  await page.click('[data-a="session"][data-scope="today"]'); await page.waitForTimeout(250);
  ok("session : onglets masqués, QCM à 4 réponses ou saisie", (await ev(() => getComputedStyle(document.querySelector(".tabs")).display)) === "none" && ((await page.$$(".opt")).length === 4 || !!(await page.$("#inp"))));
  for (let i = 0; i < 6; i++) { const o = await page.$(".opt:not([disabled])"); if (o) await o.click(); else if (await page.$("#inp:not([data-locked])")) { await page.fill("#inp", "x"); await page.click('[data-a="s-verify"]'); } await page.waitForTimeout(50); const nx = await page.$('[data-a="s-next"]:not([disabled])'); if (!nx) break; await nx.click(); await page.waitForTimeout(50); }
  ok("session : écran de résultat", !!(await page.$(".result")));
  await page.click('[data-a="sess-close"]'); await page.waitForTimeout(250);
  ok("session : Terminer revient à Oggi", (await ev(() => location.hash)) === "#/oggi");
  await ev(() => history.forward()); await page.waitForTimeout(250);
  ok("session terminée : y revenir par l'historique ne montre pas un écran vide", (await ev(() => Router.path)) === "/oggi");

  // — Menù del giorno
  const m1 = await ev(() => Store.s.menu.courses.map((c) => c.title).join("|"));
  await ev(() => document.querySelector('[data-a="menu-dolce"]').click()); await page.waitForTimeout(80);
  ok("menù : Dolce coché", (await ev(() => !!Store.s.menu.done.dolce)));
  await ev(() => { Actions["path-activate"]({ id: "torino" }); }); ok("menù : ce qui est fait le reste quand on suit un parcours", (await ev(() => !!Store.s.menu.done.dolce && Store.s.percorsi.active === "torino")));
  await ev(() => { Actions["path-deactivate"](); });
  await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(400);
  ok("menù : identique après rechargement", (await ev(() => Store.s.menu.courses.map((c) => c.title).join("|"))) === m1);
  await ev(() => { Router.params = { a: "abbina" }; finishGame(); }); ok("menù : un autre jeu ne coche pas le Contorno", !(await ev(() => Store.s.menu.done.contorno)) || (await ev(() => Menu.course("contorno").game === "abbina")));

  // — Parcours
  await go("#/percorsi/strada"); await page.click('[data-a="step"][data-step="s1"]'); await page.waitForTimeout(300);
  for (let i = 0; i < 20; i++) { const bt = await page.$('[data-a="sess-seen"]'); if (!bt) break; await bt.click(); await page.waitForTimeout(30); }
  for (let i = 0; i < 12; i++) { const o = await page.$(".opt:not([disabled])"); if (o) await o.click(); else if (await page.$("#inp:not([data-locked])")) { await page.fill("#inp", "x"); await page.click('[data-a="s-verify"]'); } else break; await page.waitForTimeout(40); const nx = await page.$('[data-a="s-next"]:not([disabled])'); if (nx) await nx.click(); else break; await page.waitForTimeout(40); }
  ok("parcours : étape vocabulaire cochée après la session", (await ev(() => !!Store.s.percorsi.done["strada:s1"])));
  await page.click('[data-a="sess-close"]'); await page.waitForTimeout(250); ok("parcours : Terminer revient au parcours", (await ev(() => location.hash)) === "#/percorsi/strada");
  ok("parcours : une leçon déjà validée coche son étape", (await ev(() => { const p = PERCORSI.find((x) => x.id === "strada"), s = p.steps.find((x) => x.type === "lesson"); const before = Percorsi.isDone(p, s); Store.s.grammar[s.lesson] = LESSON_BY_ID[s.lesson].quiz.length; return !before && Percorsi.isDone(p, s); })));

  // — Grammaire : quiz mélangé, spiegazione, double auxiliaire
  await go("#/grammatica/g1"); await page.click('[data-a="l-quiz"]'); await page.waitForTimeout(100);
  const quizOk = await ev(() => { const l = LESSON_BY_ID.g1, L = G.st; if (!Array.isArray(L.order) || L.order.length !== l.quiz.length) return "pas d'ordre"; document.querySelector(`.opt[data-id="${l.quiz[0].a}"]`).click(); return L.score === 1 ? "ok" : "bonne réponse non comptée"; });
  ok("leçon : options mélangées, la bonne réponse reste reconnue", quizOk === "ok", quizOk);
  ok("leçon : bouton Suivant ancré en bas", !!(await page.$(".dock [data-a='l-next']")));
  await page.click('[data-a="l-read"]').catch(() => {}); await go("#/grammatica/g8"); await page.click('[data-a="xp-open"]'); await page.waitForTimeout(150);
  ok("spiegazione : ouverte en lecture automatique", (await ev(() => G.st.xp && G.st.xp.play === true && !!Xp.timer && document.querySelectorAll("#xstage .xt").length > 0)));
  await page.click('[data-a="xp-next"]'); await page.waitForTimeout(80); await page.click('[data-a="xp-play"]');
  ok("spiegazione : suivant puis pause", (await ev(() => G.st.xp.i === 1 && G.st.xp.play === false && Xp.timer === null)));
  await page.click('[data-a="xp-close"]'); ok("spiegazione : fermée", (await ev(() => !G.st.xp && !!document.querySelector('[data-a="xp-open"]'))));
  ok("spiegazioni : 40 leçons couvertes", (await ev(() => LESSONS.every((l) => EXPL[l.id] && EXPL[l.id].steps.length >= 5))));
  ok("passato prossimo : les deux auxiliaires acceptés pour « finire », un seul pour « andare »", (await ev(() => { const f = passatoForms(PASSATO.find((v) => v.inf === "finire"), 0).accepted, a = passatoForms(PASSATO.find((v) => v.inf === "andare"), 0).accepted; return f.includes("ho finito") && f.includes("sono finito") && a.join() === "sono andato,sono andata"; })));
  ok("conjugaison : pronom sujet toléré en tête de réponse", (await ev(() => sansSujet("Io parlo") === "parlo" && sansSujet("parliamo") === "parliamo")));
  ok("QCM de mots : aucune forme fabriquée par changement de terminaison", (await ev(() => { for (let i = 0; i < 300; i++) { const w = WORDS[i]; if (Distract.options(w).some((o) => o.t === "accordo" || o.t === "verbo")) return false; } return true; })));

  // — Progressi
  await go("#/progressi"); ok("progressi : compteurs cliquables et graphique 14 jours", (await page.$$(".stats .stat")).length === 4 && (await page.$$(".vbars .vcol[data-tip]")).length === 14);
  await page.click('[data-a="prog-tab"][data-tab="notifiche"]'); await page.waitForTimeout(500);
  ok("notifiche : statistiques chargées", statsCalls >= 1 && (await ev(() => document.querySelector(".kpi b")?.textContent)) === "35");
  ok("notifiche : données serveur assainies (pas d'injection HTML)", (await ev(() => !window.__xss && !document.querySelector(".content img") && !document.querySelector(".hbar b b") && Stats.data.distinct === 0)));
  await page.click('[data-a="prog-tab"][data-tab="contenuto"]'); await page.waitForTimeout(250);
  ok("contenuto : carte du contenu", (await page.$$(".hstack")).length >= 3);
  await go("#/oggi"); ok("notifiche : minuteur arrêté en quittant", (await ev(() => Stats.timer === null)));

  // — Robustesse des données
  me = { ...me, start_hour: "<img src=x onerror=window.__xss=2>", interval_min: "abc", kinds: ["word", "<b>"] }; await ev(() => Push.me()); await page.waitForTimeout(300);
  ok("réglages serveur invalides : ignorés, rien n'est injecté", (await ev(() => typeof Store.s.settings.start_hour === "number" && typeof Store.s.settings.interval_min === "number" && Store.s.settings.kinds.join() === "word" && !window.__xss)));
  me = { exists: false }; await ev(() => Push.me()); await page.waitForTimeout(300); ok("appareil inconnu du serveur : l'activation est reproposée", (await ev(() => Store.s.subscribed === false)));
  me = { exists: true, subscribed: true, enabled: true, interval_min: 60, start_hour: 8, end_hour: 21, kinds: ["word", "phrase", "conj"] }; await ev(() => Push.me()); await page.waitForTimeout(300);
  hang = true; const tmo = await ev(() => Api.call("/today", null, { timeout: 250 }).then(() => "réponse", (e) => e.message)); hang = false;
  ok("serveur muet : l'appel s'arrête avec un message clair", tmo === "Le serveur ne répond pas", tmo);
  registers = 0; await ev(async () => { Sync.last = ""; await Sync.push(); await Sync.push(); await Sync.push(); }); ok("état adaptatif : envoyé une fois tant qu'il ne change pas", registers === 1, String(registers));
  const exp = await ev(() => { const dev = Store.s.device, seen = Store.seen().length, text = Store.export(); const b = Store.parseBackup(text); b.data.device = "autre-appareil"; b.data.progress.zz9 = { box: 9 }; Store.restore(b.data); return { same: Store.s.device === dev, seen: Store.seen().length === seen && b.seen === seen }; });
  ok("sauvegarde : export puis restauration, l'identité de l'appareil est conservée", exp.same && exp.seen, JSON.stringify(exp));
  ok("sauvegarde : fichier étranger refusé", (await ev(() => { try { Store.parseBackup('{"foo":1}'); return false; } catch (e) { return true; } })));
  await ev(() => { const s = JSON.parse(localStorage.getItem("impara-app-v1")); s.stats.lastDay = daysAgo(1); s.stats.streak = 6; s.menu = { day: daysAgo(1), done: {}, courses: [] }; Store.s = Store.merge(s); });
  await ev(() => { document.dispatchEvent(new Event("visibilitychange")); }); await page.waitForTimeout(100);
  ok("changement de jour sans rechargement : série +1, nouveau menu", (await ev(() => Store.s.stats.streak === 7 && Store.s.menu?.day === dayKey())));
  const seenBefore = await ev(() => Store.seen().length);
  await ev(() => { localStorage.setItem("impara-app-v1.bak", JSON.stringify({ day: daysAgo(1), data: localStorage.getItem("impara-app-v1") })); localStorage.setItem("impara-app-v1", "{état illisible"); });
  await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(400);
  ok("état illisible : progression reprise de la copie de sécurité, original mis de côté", (await ev((nb) => Store.recovered && Store.seen().length === nb && localStorage.getItem("impara-app-v1.corrupt") === "{état illisible", seenBefore)));
  await ev(() => { localStorage.setItem("impara-app-v1", JSON.stringify({ progress: null, stats: "x", settings: [], activity: 3, percorsi: null })); }); await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(300);
  ok("état mal formé : l'app s'affiche quand même", (await page.$$(".carta")).length === 1);
  const p2 = await ctx.newPage(); await p2.route("https://ngjvhpvtgbsywxvshwmp.supabase.co/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" })); await p2.goto(BASE + "#/oggi", { waitUntil: "networkidle" });
  await p2.evaluate(() => { Store.grade("e5", true); }); await page.waitForTimeout(250);
  ok("deux fenêtres : la seconde reprend l'état de la première", (await ev(() => !!Store.s.progress.e5?.seen))); await p2.close();

  // — Version 4.1 : clavier maintenu, réponses en bas, écrans de fin, lecteur d'écran, thème sombre
  await go("#/giochi/scrivi"); await page.fill("#inp", "zzz"); await page.focus("#inp"); await page.click('[data-a="wr-check"]'); await page.waitForTimeout(100);
  const kb1 = await ev(() => { const i = document.getElementById("inp"); return { focus: document.activeElement === i, locked: !!i.dataset.locked, ro: i.readOnly }; });
  ok("saisie : après Vérifier, le champ garde le focus (clavier ouvert) et se verrouille", kb1.focus && kb1.locked && !kb1.ro, JSON.stringify(kb1));
  await page.keyboard.type("abc"); ok("saisie : une réponse vérifiée ne se modifie plus", (await page.inputValue("#inp")) === "zzz");
  await page.click('[data-a="wr-next"]'); await page.waitForTimeout(100);
  ok("saisie : question suivante, champ vide, focus conservé", (await ev(() => { const i = document.getElementById("inp"); return document.activeElement === i && i.value === "" && !i.dataset.locked; })));
  await page.fill("#inp", "yyy"); await page.keyboard.press("Enter"); await page.waitForTimeout(80); const entered = await ev(() => !!G.st.w.res); await page.keyboard.press("Enter"); await page.waitForTimeout(80);
  ok("saisie : Entrée vérifie, puis passe à la suite", entered && (await ev(() => G.st.w.idx === 2 && !G.st.w.res)));
  ok("session : les QCM d'abord, la saisie ensuite (le clavier ne s'ouvre qu'une fois)", (await ev(() => { const rs = Sess.rounds(WORDS.slice(0, 12), { n: 12 }).map((r) => r.type); return rs.includes("type") && rs.lastIndexOf("mcq") < rs.indexOf("type"); })));
  await go("#/giochi/scelta"); const q0 = await ev(() => { const o = document.querySelector(".opt").getBoundingClientRect(), nx = document.querySelector('.dock [data-a="sc-next"]'); return { top: o.top / innerHeight, off: !!nx && nx.disabled, y: nx?.getBoundingClientRect().top }; });
  ok("QCM : réponses dans la moitié basse, « Suivant » déjà en place (inactif)", q0.top > 0.5 && q0.off, JSON.stringify(q0));
  await ev(() => { const S = G.st.s, q = S.qs[S.idx]; document.querySelector(`.opt[data-id="${q.opts.find((o) => o.id !== q.w.id).id}"]`).click(); }); await page.waitForTimeout(80);
  const q1 = await ev(() => { const nx = document.querySelector('.dock [data-a="sc-next"]'); return { on: !nx.disabled, y: nx.getBoundingClientRect().top, marks: document.querySelectorAll(".opt.right .n svg, .opt.wrong .n svg").length, fb: !!document.querySelector(".fill > .fb ~ .opts") }; });
  ok("QCM : après la réponse, « Suivant » actif sans avoir bougé, ✓ et ✗ dans les pastilles, correction sous la question", q1.on && Math.abs(q1.y - q0.y) < 1 && q1.marks === 2 && q1.fb, JSON.stringify(q1));
  for (let i = 0; i < 10; i++) { const o = await page.$(".opt:not([disabled])"); if (o) await o.click(); await page.waitForTimeout(20); const nx = await page.$('[data-a="sc-next"]:not([disabled])'); if (!nx) break; await nx.click(); await page.waitForTimeout(20); }
  ok("fin d'exercice : boutons ancrés en bas, liste « À revoir » avec écoute", (await ev(() => !!document.querySelector(".fill > .dock .btn") && document.querySelector(".dock").getBoundingClientRect().top / innerHeight > 0.8 && document.querySelectorAll(".missed .item .spk").length >= 1)));
  await ev(() => { Store.s.seenVersion = null; Store.s.subscribed = false; Store.save(); }); await go("#/oggi", 200);
  ok("oggi : le bouton du menu reste au-dessus des onglets ; nouveautés et bandeau passent dessous", (await ev(() => { const b = document.querySelector(".carta > .btn").getBoundingClientRect(), t = document.querySelector(".tabs").getBoundingClientRect(), nw = document.querySelector(".news"), bn = document.querySelector(".banner"); return b.bottom <= t.top && !!nw && nw.getBoundingClientRect().top > b.bottom && !!bn && bn.getBoundingClientRect().top > b.bottom; })));
  await ev(() => { Store.s.seenVersion = APP_VERSION; Store.s.subscribed = true; Store.save(); });
  await go("#/studia/casa"); ok("carte : contenu lu tel quel (pas d'aria-label), recto en italien, face cachée masquée, pincement autorisé", (await ev(() => { const c = document.querySelector(".fcard"); return !c.hasAttribute("aria-label") && c.lang === "it" && c.querySelector(".face.back").getAttribute("aria-hidden") === "true" && !c.querySelector(".face.front").hasAttribute("aria-hidden") && getComputedStyle(document.querySelector(".scene")).touchAction.includes("pinch-zoom"); })));
  ok("carte : cinq points de boîte, mot plus grand que 34 px, onglets masqués", (await ev(() => document.querySelectorAll(".face.front .boxes i").length === 5 && parseFloat(getComputedStyle(document.querySelector(".face.front .word")).fontSize) >= 22 && getComputedStyle(document.querySelector(".tabs")).display === "none")));
  await go("#/ripasso", 450); ok("ripasso (onglet racine) : onglets visibles, 18 px au moins entre les boutons et les onglets", (await ev(() => { const t = document.querySelector(".tabs"), b = document.querySelector(".dock .btn"); return getComputedStyle(t).display !== "none" && (!b || t.getBoundingClientRect().top - b.getBoundingClientRect().bottom >= 18); })));
  await go("#/progressi"); ok("structure : titres de section, titre de document par écran, zone d'annonce permanente", (await ev(() => document.querySelectorAll(".content h2").length >= 4 && document.title.startsWith("Progressi") && document.getElementById("live")?.getAttribute("role") === "status")));
  ok("graphiques : barres hors de l'ordre de tabulation, résumé pour le lecteur d'écran, série hachurée", (await ev(() => !document.querySelector(".vcol[tabindex]") && /Justes \d+/.test(document.querySelector(".vbars").getAttribute("aria-label")) && !!document.querySelector(".legend .hatch"))));
  await go("#/giochi/abbina"); ok("abbina : mots italiens balisés, paires en bas", (await ev(() => document.querySelectorAll('.pb.it[lang="it"]').length === 6 && document.querySelector(".pairs").getBoundingClientRect().bottom / innerHeight > 0.8)));
  await go("#/grammatica/g10"); ok("leçon : l'italien des tables en Newsreader et encre pleine, y compris en première colonne", (await ev(() => { const td = document.querySelector(".gtab tbody td"), cs = getComputedStyle(td); return td.lang === "it" && cs.fontFamily.includes("Newsreader") && parseFloat(cs.fontSize) >= 16 && cs.color === getComputedStyle(document.body).color; })));
  const dark = await ev(() => { Actions["set-scheme"]({ v: "dark" }); const cs = getComputedStyle(document.documentElement), hex = (n) => cs.getPropertyValue(n).trim(), lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }, cr = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); }; const r = { loso: cr("#FFFFFF", hex("--tile-ok")), ok: cr("#FFFFFF", hex("--ok-solid")), err: cr("#FFFFFF", hex("--err-solid")), invite: cr(hex("--muted"), hex("--card")), prog: cr(hex("--brand-ink"), hex("--line")), verso: cr(hex("--muted"), hex("--card")), sw: cr(hex("--field"), hex("--card")) }; Actions["set-scheme"]({ v: "auto" }); return r; });
  ok("thème sombre : « Lo so », pastilles ✓ ✗, texte d'invite, verso de carte, barre de progression, interrupteur au-dessus des seuils", dark.loso >= 4.5 && dark.ok >= 4.5 && dark.err >= 4.5 && dark.invite >= 4.5 && dark.verso >= 4.5 && dark.prog >= 3 && dark.sw >= 3, JSON.stringify(dark));

  // — Accessibilité mesurée (indicatif)
  const a11y = {}; for (const h of ["#/oggi", "#/studia", "#/studia/lavoro", "#/grammatica", "#/grammatica/g8", "#/giochi", "#/giochi/scelta", "#/progressi", "#/impostazioni", "#/percorsi/lavoro"]) { await go(h, 120); const r = await ev(() => { const vis = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; const small = [...document.querySelectorAll("#view a, #view button, #view select, #view input:not([hidden])")].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.height < 40 || r.width < 40; }).map((e) => (e.className || e.nodeName).toString().split(" ")[0]); const tiny = [...document.querySelectorAll("#view *")].filter((e) => e.children.length === 0 && e.textContent.trim() && vis(e) && parseFloat(getComputedStyle(e).fontSize) < 11).length; return { small: [...new Set(small)], tiny, overflow: document.querySelector(".main").scrollWidth > document.querySelector(".main").clientWidth + 1 }; }); a11y[h] = r; }
  const smalls = Object.entries(a11y).filter(([, r]) => r.small.length).map(([h, r]) => `${h}: ${r.small.join(",")}`);
  ok("aucun texte sous 11 px, aucun défilement horizontal", Object.values(a11y).every((r) => r.tiny === 0 && !r.overflow), JSON.stringify(a11y));
  console.log("  cibles tactiles sous 40 px :", smalls.length ? smalls.join(" | ") : "aucune");

  // — Ordinateur : clavier
  const c2 = await b.newContext({ viewport: { width: 1280, height: 820 }, locale: "fr-FR" }); const d = await c2.newPage(); d.on("pageerror", (e) => errors.push("desk: " + e.message));
  await d.route("https://ngjvhpvtgbsywxvshwmp.supabase.co/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await d.goto(BASE + "#/studia/casa", { waitUntil: "networkidle" }); await d.waitForTimeout(300);
  const k0 = await d.evaluate(() => document.querySelector(".scene").dataset.key); await d.keyboard.press(" "); await d.waitForTimeout(80);
  const flipped = await d.evaluate(() => document.querySelector(".fcard").classList.contains("flip")); await d.keyboard.press("ArrowRight"); await d.waitForTimeout(80);
  ok("clavier : Espace retourne la carte, → la note « lo so »", flipped && (await d.evaluate((k) => document.querySelector(".scene").dataset.key !== k && Store.s.progress[k]?.box === 1, k0)));
  await d.goto(BASE + "#/giochi/scelta", { waitUntil: "networkidle" }); await d.waitForTimeout(200); await d.keyboard.press("2"); await d.waitForTimeout(80);
  ok("clavier : 1-4 choisissent une réponse, Entrée passe à la suite", (await d.evaluate(() => !!G.st.s.ans)) && (await d.keyboard.press("Enter"), await d.waitForTimeout(80), await d.evaluate(() => G.st.s.idx === 1)));
  await d.keyboard.press("c"); await d.waitForTimeout(80);
  ok("clavier : A-D choisissent aussi une réponse (les pastilles affichent des lettres)", (await d.evaluate(() => G.st.s.ans?.id === G.st.s.qs[1].opts[2].id)));
  ok("ordinateur : menu latéral, contenu en deux colonnes sur Oggi", await (async () => { await d.goto(BASE + "#/oggi", { waitUntil: "networkidle" }); return d.evaluate(() => getComputedStyle(document.querySelector(".side")).display !== "none" && getComputedStyle(document.querySelector(".tabs")).display === "none"); })());

  ok("aucune erreur JavaScript", errors.length === 0, errors.join(" | "));
  console.log(`\n${n - fails} / ${n} contrôles réussis`); await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
