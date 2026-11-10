// Génère les icônes de l'app (bordeaux, « I! » en Newsreader italique) à partir des polices du dépôt
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");
const font = fs.readFileSync(path.join(root, "fonts/nr-latin-italic.woff2")).toString("base64");
const page = (size, pad) => `<!doctype html><style>@font-face{font-family:N;font-style:italic;font-weight:200 800;src:url(data:font/woff2;base64,${font})}
html,body{margin:0}body{width:${size}px;height:${size}px;display:grid;place-items:center;background:linear-gradient(155deg,#A3234A,#6E1230)}
b{font:italic 600 ${size * (pad ? 0.5 : 0.66)}px/1 N;color:#fff;letter-spacing:-.02em;transform:translate(${size * -0.015}px,${size * -0.025}px)}i{color:#F0C25C;font-style:italic}</style><b>I<i>!</i></b>`;
(async () => {
  const b = await chromium.launch();
  for (const [name, size, pad] of [["icon-512.png", 512, false], ["icon-180.png", 180, false], ["icon-maskable.png", 512, true]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } }); await p.setContent(page(size, pad)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(root, name) }); await p.close();
  }
  await b.close(); console.log("icônes écrites");
})();
