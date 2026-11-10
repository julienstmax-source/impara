// Assemble index.html (le fichier unique déployé) à partir de src/shell.html + src/content.json + src/app.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const shell = fs.readFileSync(path.join(root, "src/shell.html"), "utf8");
// Le contenu voyage en JSON dans une balise <script type="application/json"> : « < » est échappé pour qu'aucun texte ne puisse la refermer
const content = JSON.stringify(JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"))).replace(/</g, "\\u003c");
const app = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
if (!shell.includes("/*__CONTENT__*/") || !shell.includes("/*__APP__*/")) throw new Error("repères manquants dans src/shell.html");
const out = shell.replace("/*__CONTENT__*/", () => content).replace("/*__APP__*/", () => app.replace(/\n$/, ""));
fs.writeFileSync(path.join(root, "index.html"), out);
console.log(`index.html : ${(out.length / 1024).toFixed(0)} Ko (coque ${(shell.length / 1024).toFixed(0)} Ko, contenu ${(content.length / 1024).toFixed(0)} Ko, app ${(app.length / 1024).toFixed(0)} Ko)`);
