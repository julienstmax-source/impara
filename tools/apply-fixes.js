// Applique un fichier de corrections de contenu à src/content.json en vérifiant chaque valeur « avant ».
// Usage : node tools/apply-fixes.js fichier.json [--dry]
// Formats acceptés (champ "fixes") :
//   { id, field, old, new }                         → carte de WORDS / PHRASES
//   { target, id?, path: [...], old, new }          → LESSONS / EXPLAINERS (id = leçon), PASSATO (id = infinitif), CONJ / VERB_FR / PERCORSI (path depuis la racine)
const fs = require("fs"), path = require("path");
const file = process.argv[2], dry = process.argv.includes("--dry");
const cPath = path.join(__dirname, "../src/content.json"), c = JSON.parse(fs.readFileSync(cPath, "utf8"));
const fixes = JSON.parse(fs.readFileSync(file, "utf8")).fixes || [];
let ok = 0; const bad = [];
for (const f of fixes) {
  let obj, key;
  if (f.field) { obj = [...c.WORDS, ...c.PHRASES].find((x) => x.id === f.id); key = f.field; }
  else {
    let root = c[f.target];
    if (f.target === "LESSONS" || f.target === "EXPLAINERS") root = root.find((x) => x.id === f.id);
    else if (f.target === "PASSATO") root = root.find((x) => x.inf === f.id);
    const p = [...f.path]; key = p.pop(); obj = root; for (const k of p) obj = obj?.[k];
  }
  if (!obj) { bad.push([f, "introuvable"]); continue; }
  const cur = obj[key] === undefined ? null : obj[key];
  if (JSON.stringify(cur) !== JSON.stringify(f.old)) { bad.push([f, `valeur actuelle différente : ${JSON.stringify(cur)}`]); continue; }
  obj[key] = f.new; ok++;
}
for (const [f, why] of bad) console.error("REFUSÉ", f.id || f.target, JSON.stringify(f.path || f.field), "—", why);
if (!dry && !bad.length) fs.writeFileSync(cPath, JSON.stringify(c));
console.log(`${ok} correction(s) ${dry ? "vérifiée(s)" : bad.length ? "NON écrites (corrige les refus)" : "appliquée(s)"}, ${bad.length} refus`);
process.exit(bad.length ? 1 : 0);
