// Mesure le démarrage (parse + premier rendu) et le coût d'un rendu, CPU ralenti ×4 (≈ téléphone). Usage : node tools/perf.js [index.html]
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, ".."), file = process.argv[2] || path.join(ROOT, "index.html");
let html = fs.readFileSync(file, "utf8");
html = html.replace("<head>", "<head><script>window.__t0=performance.now()</script>").replace(/\n<\/script>\n<\/body>/, "\n;window.__t1=performance.now();window.__api={render:typeof render==='function'?render:null,Router:typeof Router!=='undefined'?Router:null};\n</script>\n</body>");
const types = { ".png": "image/png", ".woff2": "font/woff2", ".js": "application/javascript", ".webmanifest": "application/manifest+json" };
const srv = http.createServer((req, res) => { const p = new URL(req.url, "http://x").pathname; if (p === "/" || p.endsWith("/index.html")) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(html); } const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); res.end(fs.readFileSync(f)); }).listen(8795);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const runs = [];
  for (let i = 0; i < 5; i++) {
    const page = await ctx.newPage(); await page.route("https://ngjvhpvtgbsywxvshwmp.supabase.co/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    const cdp = await ctx.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.goto("http://localhost:8795/", { waitUntil: "load" });
    const m = await page.evaluate(() => { const r = window.__api.render, R = window.__api.Router; const t = (fn, n = 20) => { const a = performance.now(); for (let i = 0; i < n; i++) fn(); return (performance.now() - a) / n; };
      const out = { boot: window.__t1 - window.__t0 }; out.renderOggi = t(() => r()); location.hash = "#/studia"; return new Promise((res) => setTimeout(() => { out.renderStudia = t(() => r()); location.hash = "#/progressi"; setTimeout(() => { out.renderProgressi = t(() => r()); out.dom = document.querySelectorAll("*").length; res(out); }, 80); }, 80)); });
    runs.push(m); await page.close();
  }
  const med = (k) => runs.map((r) => r[k]).sort((a, b) => a - b)[2].toFixed(1);
  console.log(`${path.basename(path.dirname(file))}/${path.basename(file)} — taille ${(html.length / 1024).toFixed(0)} Ko · démarrage ${med("boot")} ms · rendu Oggi ${med("renderOggi")} ms · Studia ${med("renderStudia")} ms · Progressi ${med("renderProgressi")} ms (médianes, CPU ×4)`);
  await b.close(); srv.close();
})().catch((e) => { console.error(e); srv.close(); process.exit(1); });
