// Construit l'aperçu interactif (simulateur iPhone / ordinateur) : un fragment HTML autonome publié comme artefact.
// Même app, mode démonstration (window.IMPARA_DEMO) : notifications et serveur simulés, polices intégrées.
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");
const shell = fs.readFileSync(path.join(root, "src/shell.html"), "utf8");
const content = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"))).replace(/</g, "\\u003c");
const app = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const css = /<style>([\s\S]*?)<\/style>/.exec(shell)[1].replace(/url\(\.\/fonts\/([\w-]+\.woff2)\)/g, (_, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, "fonts", f)).toString("base64")})`);
const DARK = "--sim-bg:#15171C; --sim-fg:#C2C6D0; --sim-fg-2:#9BA1AF; --sim-card:#1F2229; --sim-line:#2E323B;";
const simCss = `
/* ───────── Simulateur ───────── */
:root{--sim-bg:#D9DCE3; --sim-fg:#2B2F38; --sim-fg-2:#5F6675; --sim-card:#FFFFFF; --sim-line:#C9CDD6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${DARK}}}
:root[data-theme="dark"]{${DARK}}
body{background:var(--sim-bg);color:var(--sim-fg)}
.sim{height:100%;display:flex;flex-direction:column;font-family:var(--sans)}
.sim-bar{display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid var(--sim-line);flex:none;min-height:50px}
.sim-bar h1{font-size:16px;font-weight:800;letter-spacing:-.01em;color:var(--brand-ink);white-space:nowrap}
.sim-bar .sub{font-size:13px;color:var(--sim-fg-2);font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sim-seg{display:flex;background:var(--sim-card);border:1px solid var(--sim-line);border-radius:9px;padding:2px;margin-left:auto;flex:none}
.sim-seg button{padding:6px 12px;border-radius:7px;font-size:13px;font-weight:700;color:var(--sim-fg-2)}
.sim-seg button.on{background:var(--brand);color:#fff}
.sim-btn{padding:7px 12px;border-radius:9px;font-size:13px;font-weight:700;color:var(--sim-fg);background:var(--sim-card);border:1px solid var(--sim-line);flex:none}
.sim-stage{flex:1;min-height:0;display:grid;place-items:center;padding:14px;overflow:hidden}
.sim-fit{position:relative}
.phone{position:absolute;top:0;left:0;width:390px;height:844px;transform-origin:0 0;background:#0B0B0D;border-radius:56px;padding:12px;box-shadow:0 30px 60px -30px rgba(0,0,0,.55),0 0 0 2px #2A2A2E inset}
.phone .screen{position:relative;width:100%;height:100%;border-radius:44px;overflow:hidden;background:var(--bg);--sat:50px;--sab:22px}
.phone .status{position:absolute;top:0;left:0;right:0;height:50px;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:12px 26px 0 34px;font-size:15px;font-weight:700;color:var(--ink);background:none;border-radius:0;pointer-events:none;font-feature-settings:"tnum" 1}
.phone .status svg{width:66px;height:14px;fill:var(--ink)}
.phone .island{position:absolute;top:12px;left:50%;transform:translateX(-50%);width:122px;height:36px;border-radius:20px;background:#000;z-index:31}
.phone .home{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:136px;height:5px;border-radius:3px;background:var(--ink);opacity:.85;z-index:30;pointer-events:none}
.phone.desktop{width:1240px;height:780px;border-radius:16px;padding:10px;background:#1B1B1F}
.phone.desktop .screen{border-radius:8px;--sat:0px;--sab:0px}
.phone.desktop :is(.status,.island,.home){display:none}
@media (max-width:719px){
  .sim-bar{display:none}
  .sim-stage{padding:0}
  .sim-fit{width:100%!important;height:100%!important}
  .phone{position:static;width:100%;height:100%;border-radius:0;padding:0;transform:none!important;box-shadow:none}
  .phone .screen{border-radius:0;--sat:0px;--sab:0px}
  .phone :is(.status,.island,.home){display:none}
}
`;
const simJs = `
(function () {
  const stage = document.querySelector(".sim-stage"), fit = document.querySelector(".sim-fit"), phone = document.getElementById("phone");
  let dev = "phone";
  function layout() {
    if (matchMedia("(max-width:719px)").matches) { phone.style.transform = ""; return; }
    const w = dev === "phone" ? 390 : 1240, h = dev === "phone" ? 844 : 780, r = stage.getBoundingClientRect();
    const s = Math.min(1, (r.width - 28) / w, (r.height - 28) / h);
    phone.style.transform = "scale(" + s + ")"; fit.style.width = w * s + "px"; fit.style.height = h * s + "px";
  }
  document.querySelectorAll(".sim-seg button").forEach((b) => { b.addEventListener("click", () => { dev = b.dataset.dev; phone.classList.toggle("desktop", dev === "desktop"); document.querySelectorAll(".sim-seg button").forEach((x) => x.classList.toggle("on", x === b)); layout(); }); });
  addEventListener("resize", layout); layout(); setTimeout(layout, 50);
  const clock = document.getElementById("simClock"); const tick = () => { const d = new Date(); clock.textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); }; tick(); setInterval(tick, 15000);
  document.getElementById("simReset").addEventListener("click", () => { if (window.ImparaReset) window.ImparaReset(); });
})();
`;
const html = `<title>Simulateur Impara!</title>
<style>${css}${simCss}</style>
<div class="sim">
  <header class="sim-bar">
    <h1>Impara!</h1>
    <span class="sub">Aperçu interactif : notifications et serveur simulés, la progression reste dans ce navigateur.</span>
    <div class="sim-seg" role="group" aria-label="Appareil"><button type="button" class="on" data-dev="phone">iPhone</button><button type="button" data-dev="desktop">Ordinateur</button></div>
    <button type="button" class="sim-btn" id="simReset">Réinitialiser</button>
  </header>
  <div class="sim-stage"><div class="sim-fit"><div class="phone" id="phone">
    <div class="screen"><div class="island"></div>
    <div class="status"><span id="simClock">9:41</span><svg viewBox="0 0 66 14"><rect x="0" y="9" width="3" height="5" rx="1"/><rect x="5" y="7" width="3" height="7" rx="1"/><rect x="10" y="4" width="3" height="10" rx="1"/><rect x="15" y="1" width="3" height="13" rx="1"/><path d="M30 5.5a8 8 0 0 1 10 0l-1.3 1.4a6 6 0 0 0-7.4 0zM32.4 8.1a4.5 4.5 0 0 1 5.2 0l-1.3 1.4a2.6 2.6 0 0 0-2.6 0zM35 11.8l1.5-1.6a1 1 0 0 0-3 0z"/><rect x="44" y="2" width="19" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/><rect x="45.5" y="3.5" width="16" height="7" rx="2"/><rect x="64" y="5" width="2" height="4" rx="1" opacity=".5"/></svg></div>
    <div id="app"><div id="view"></div></div>
    <div class="home"></div></div>
  </div></div></div>
</div>
<script>window.IMPARA_DEMO = true;</script>
<script type="application/json" id="content">${content}</script>
<script>
${app}
</script>
<script>${simJs}</script>
`;
fs.mkdirSync(path.join(root, "tools/sim"), { recursive: true });
fs.writeFileSync(path.join(root, "tools/sim/simulateur-impara.html"), html);
console.log(`simulateur : ${(html.length / 1024).toFixed(0)} Ko`);
