// Fabrique items.json (les éléments que le serveur envoie en notification) à partir de src/content.json.
// À recharger ensuite dans la table `items` du projet Supabase pour que les notifications suivent le contenu de l'app.
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");
const c = JSON.parse(fs.readFileSync(path.join(root, "src/content.json"), "utf8"));
const AVERE = ["ho", "hai", "ha", "abbiamo", "avete", "hanno"], ESSERE = ["sono", "sei", "è", "siamo", "siete", "sono"], RIFL = ["mi", "ti", "si", "ci", "vi", "si"];
const passato = (v, p) => { const e = p < 3 ? ["o", "a"] : ["i", "e"]; return v.aux === "avere" ? `${AVERE[p]} ${v.part}` : e.map((x) => `${v.aux === "essere" ? "" : RIFL[p] + " "}${ESSERE[p]} ${v.part}${x}`).join(" / "); };
const cat = Object.fromEntries(c.CATEGORIES.map((x) => [x.id, x.label])), fr = (inf) => c.VERB_FR[inf] || inf, items = [];
for (const w of c.WORDS) items.push({ id: `w:${w.id}`, kind: "word", title: w.it, body: w.fr, extra: `${w.ex} — ${w.exFr}`, level: w.lv, tag: cat[w.cat] });
for (const p of c.PHRASES) items.push({ id: `p:${p.id}`, kind: "phrase", title: p.it, body: p.fr, extra: null, level: p.lv, tag: p.cat === "libro" ? `Vivi l'italiano · Unità ${p.unit}` : p.sit });
for (const [tense, data] of Object.entries(c.CONJ)) for (const [inf, forms] of Object.entries(data.verbs)) forms.forEach((f, p) => { if (f !== "—") items.push({ id: `c:${tense}:${inf}:${p}`, kind: "conj", title: `${inf} (${fr(inf)}) → ${tense === "imperativo" && p === 2 ? "Lei" : c.PERSONS[p]}`, body: f, extra: data.label, level: tense === "presente" ? "A1" : tense === "congiuntivo" ? "B1" : "A2", tag: data.label }); });
for (const v of c.PASSATO) for (let p = 0; p < 6; p++) items.push({ id: `c:passato:${v.inf}:${p}`, kind: "conj", title: `${v.inf} (${fr(v.inf)}) → ${c.PERSONS[p]}`, body: passato(v, p), extra: "Passato prossimo", level: "A1", tag: "Passato prossimo" });
fs.writeFileSync(path.join(root, "items.json"), JSON.stringify(items));
console.log(`items.json : ${items.length} éléments`);
