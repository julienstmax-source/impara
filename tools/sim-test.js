// Vérifie le simulateur dans un squelette de page équivalent à celui de l'hébergeur (ordinateur clair / sombre, téléphone)
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const frag = fs.readFileSync(path.join(__dirname, "sim/simulateur-impara.html"), "utf8");
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui}[hidden]{display:none!important}</style></head><body>${frag}</body></html>`;
const srv = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); r.end(html); }).listen(8792);
(async () => {
  const b = await chromium.launch(), errors = [], out = path.join(__dirname, "sim");
  for (const [name, vp, mobile, dark] of [["desk", { width: 1280, height: 800 }, false, false], ["desk-dark", { width: 1280, height: 800 }, false, true], ["phone", { width: 390, height: 844 }, true, false]]) {
    const c = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, colorScheme: dark ? "dark" : "light", locale: "fr-FR" });
    const p = await c.newPage(); p.on("pageerror", (e) => errors.push(name + ": " + e.message)); p.on("console", (m) => { if (m.type() === "error") errors.push(name + " console: " + m.text()); });
    await p.goto("http://localhost:8792/", { waitUntil: "networkidle" }); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/shot-${name}.png` });
    if (name === "desk") {
      await p.click(".carta .btn"); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/shot-desk-session.png` });
      await p.click('[data-a="sess-close"]'); await p.waitForTimeout(300); console.log("fin de session →", await p.evaluate(() => location.hash));
      await p.click('.tabs a[href="#/studia"]'); await p.waitForTimeout(250); await p.click('a[href="#/studia/lavoro"]'); await p.waitForTimeout(350); await p.click(".fcard"); await p.waitForTimeout(700); await p.screenshot({ path: `${out}/shot-desk-card.png` });
      await p.click('[data-dev="desktop"]'); await p.waitForTimeout(400); await p.evaluate(() => { location.hash = "#/oggi"; }); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/shot-desk-desktopmode.png` });
      await p.click("#simReset"); await p.waitForTimeout(500); console.log("réinitialisation →", await p.evaluate(() => location.hash + " · cartes vues " + Store.seen().length));
    }
    await c.close();
  }
  console.log("ERREURS :", errors.length ? errors : "aucune"); await b.close(); srv.close(); process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
