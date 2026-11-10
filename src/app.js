/* ═══════════════════════════════════════════
   0. Contenu, utilitaires
   ═══════════════════════════════════════════ */
const APP_VERSION = "4.0";
const { CATEGORIES, WORDS, PHRASES, PERSONS, CONJ, PASSATO, LESSONS, VERB_FR, PERCORSI, EXPLAINERS = [] } = JSON.parse(document.getElementById("content").textContent);
const EXPL = Object.fromEntries(EXPLAINERS.map((x) => [x.id, x]));
const CARDS = [...WORDS, ...PHRASES];
const BY_ID = Object.fromEntries(CARDS.map((w) => [w.id, w]));
const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const BY_CAT = {}; for (const c of CARDS) (BY_CAT[c.cat] ||= []).push(c);
const LESSON_BY_ID = Object.fromEntries(LESSONS.map((l) => [l.id, l]));
const KINDS = ["word", "phrase", "conj"];
// Données venues du serveur ou d'un fichier : on ne garde que des nombres bornés et des dates valides
const num = (v, dflt = 0, min = -Infinity, max = Infinity) => { const n = Number(v); return v != null && v !== "" && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dflt; };
const validDate = (v) => { const t = v ? new Date(v).getTime() : NaN; return Number.isFinite(t) ? new Date(t).toISOString() : null; };
const BOX_INTERVALS = [0, 1, 3, 7, 14], DAY = 86400000, KEY = "impara-app-v1", BAK = KEY + ".bak";
const SB_URL = "https://ngjvhpvtgbsywxvshwmp.supabase.co";
const API = SB_URL + "/functions/v1/api";
const DEMO = !!window.IMPARA_DEMO;
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Hasard reproductible pour une journée (menu du jour identique toute la journée)
const seeded = (seed) => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const shuffleSeeded = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const stripAccents = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s) => stripAccents(String(s).toLowerCase()).replace(/[^a-z' ]/g, " ").replace(/'/g, " ").replace(/\s+/g, " ").trim();
const stripArticle = (s) => s.replace(/^(l|il|la|lo|le|i|gli|un|una|uno) /, "");
// Vrais synonymes : pour une même question française, les deux mots sont acceptés (et jamais proposés comme mauvaise réponse l'un de l'autre)
const SYNONYMS = [["e10", "x19"], ["l8", "l40"], ["e11", "e25"], ["k5", "r25"]];
const acceptedAnswers = (w) => {
  const all = new Set(), add = (it) => it.split("/").map((p) => norm(p)).filter(Boolean).forEach((p) => { all.add(p); all.add(stripArticle(p)); });
  add(w.it); for (const g of SYNONYMS) if (g.includes(w.id)) for (const id of g) if (id !== w.id && BY_ID[id]) add(BY_ID[id].it);
  return all;
};
const shortClue = (fr) => fr.split("—")[0].split("(")[0].split(";")[0].trim();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plural = (n, s, p) => n > 1 ? p : s;
const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Rome";
const isPhrase = (c) => c.cat === "libro" || c.cat === "dialoghi";
const dayKey = (d = Date.now()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const dayNum = (k) => Math.round(new Date(k + "T12:00:00").getTime() / DAY);
// Jour calendaire d'il y a i jours (sûr aux changements d'heure, contrairement à « maintenant − i × 24 h »)
// Échéance d'une carte : au début du jour visé (une carte notée à 22 h 30 est due dès le lendemain matin), tout de suite si days = 0
const dueIn = (days) => { if (!days) return Date.now(); const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days); return d.getTime(); };
const daysAgo = (i) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); return dayKey(d); };
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const fmtDay = (k) => { const d = new Date(k.length === 10 ? k + "T12:00:00" : k); return `${d.getDate()} ${MONTHS_FR[d.getMonth()]}`; };
const fmtTime = (d) => { d = new Date(d); return `${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`; };
const ago = (d) => { const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`; const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`; const j = Math.round(h / 24); return j === 1 ? "hier" : `il y a ${j} jours`; };
const pct = (a, b, d = 0) => b ? (a / b * 100).toFixed(d).replace(".", ",") + " %" : "0 %";
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const AVERE_P = ["ho", "hai", "ha", "abbiamo", "avete", "hanno"], ESSERE_P = ["sono", "sei", "è", "siamo", "siete", "sono"], RIFL_P = ["mi", "ti", "si", "ci", "vi", "si"];
// Verbes qui prennent les deux auxiliaires selon l'emploi (ho finito / è finito) : les deux sont acceptés
const DOUBLE_AUX = new Set(["cominciare", "iniziare", "finire", "passare", "cambiare", "vivere", "correre", "scendere", "salire", "servire", "continuare", "aumentare", "migliorare"]);
function passatoForms(v, p) {
  const e = p < 3 ? ["o", "a"] : ["i", "e"], stem = v.aux === "avere" ? v.part.slice(0, -1) : v.part;
  const withEssere = (pre = "") => e.map((x) => `${pre}${ESSERE_P[p]} ${stem}${x}`), withAvere = [`${AVERE_P[p]} ${stem}o`];
  const main = v.aux === "avere" ? withAvere : v.aux === "essere" ? withEssere() : withEssere(RIFL_P[p] + " ");
  return { display: main.join(" / "), accepted: DOUBLE_AUX.has(v.inf) && v.aux !== "riflessivo" ? [...main, ...(v.aux === "avere" ? withEssere() : withAvere)] : main };
}
const TENSES = [["presente", "Presente"], ["imperfetto", "Imperfetto"], ["futuro", "Futuro"], ["condizionale", "Condizionale"], ["congiuntivo", "Congiuntivo"], ["imperativo", "Imperativo"], ["passato", "Passato prossimo"]];
const TENSE_LABEL = Object.fromEntries(TENSES);
// Prononciation : voix italienne du téléphone
let itVoice = null;
function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  try {
    speechSynthesis.cancel();
    if (!itVoice) itVoice = speechSynthesis.getVoices().find((v) => /^it/i.test(v.lang)) || null;
    const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ", ")); u.lang = "it-IT"; u.rate = 0.92; if (itVoice) u.voice = itVoice;
    speechSynthesis.speak(u);
  } catch (e) {}
}
if ("speechSynthesis" in window && speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged", () => { itVoice = speechSynthesis.getVoices().find((v) => /^it/i.test(v.lang)) || null; });

/* ═══════════════════════════════════════════
   1. Icônes (SVG inline, trait 1.9)
   ═══════════════════════════════════════════ */
const I = {
  inbox: '<svg class="i" viewBox="0 0 24 24"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 4h14l2 8v8H3v-8z"/></svg>',
  book: '<svg class="i" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/></svg>',
  repeat: '<svg class="i" viewBox="0 0 24 24"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
  ruler: '<svg class="i" viewBox="0 0 24 24"><path d="M3 17l14-14 4 4L7 21z"/><path d="M7 7l2 2M10 4l2 2M13 10l2 2M16 7l2 2M4 16l2 2"/></svg>',
  game: '<svg class="i" viewBox="0 0 24 24"><path d="M6 11h4M8 9v4M15 11h.01M18 13h.01"/><path d="M7 6h10a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5l-2-2H9l-2 2a5 5 0 0 1-5-5v-2a5 5 0 0 1 5-5z"/></svg>',
  cog: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  flame: '<svg class="i" viewBox="0 0 24 24"><path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 11 0 4 3 8 7 8z"/></svg>',
  bell: '<svg class="i" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>',
  bellOff: '<svg class="i" viewBox="0 0 24 24"><path d="M8.6 4.6A6 6 0 0 1 18 8c0 7 3 9 3 9H7"/><path d="M6 8c0 4-1 6-2 8h9"/><path d="M10 21a2 2 0 0 0 4 0"/><path d="M3 3l18 18"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  chev: '<svg class="i" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  chevL: '<svg class="i" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  bolt: '<svg class="i" viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  phone: '<svg class="i" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/></svg>',
  target: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
  pen: '<svg class="i" viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M13 7l3 3"/></svg>',
  grid: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  shuffle: '<svg class="i" viewBox="0 0 24 24"><path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/></svg>',
  link: '<svg class="i" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  dumbbell: '<svg class="i" viewBox="0 0 24 24"><path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/></svg>',
  circle: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
  half: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/></svg>',
  done: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="currentColor" stroke="none"/><path d="M8.5 12l2.5 2.5 4.5-5" stroke="#fff"/></svg>',
  send: '<svg class="i" viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
  eye: '<svg class="i" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  undo: '<svg class="i" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-2"/></svg>',
  refresh: '<svg class="i" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
  route: '<svg class="i" viewBox="0 0 24 24"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H12"/></svg>',
  chart: '<svg class="i" viewBox="0 0 24 24"><path d="M3 20h18"/><path d="M6 17V10M11 17V5M16 17v-7M21 17V8"/></svg>',
  volume: '<svg class="i" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  star: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg>',
  cloud: '<svg class="i" viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 0 1 17.5 18z"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  play: '<svg class="i" viewBox="0 0 24 24"><path d="M7 4l12 8-12 8z" fill="currentColor"/></svg>',
  pause: '<svg class="i" viewBox="0 0 24 24"><path d="M7 5v14M17 5v14" stroke-width="3"/></svg>',
  sparkle: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
};

/* ═══════════════════════════════════════════
   2. Store (persistance locale, copie de sécurité, export / import)
   ═══════════════════════════════════════════ */
const Store = {
  fresh() { return { v: 4, device: null, progress: {}, pos: {}, stats: { streak: 0, lastDay: null, bestQuiz: 0, errors: {} }, grammar: {}, conjBest: {}, percorsi: { active: null, done: {} }, activity: {}, menu: null, lastCat: null, goals: { newCards: 30, lessons: 2 }, settings: { interval_min: 60, start_hour: 8, end_hour: 21, kinds: ["word", "phrase", "conj"], enabled: true }, subscribed: false, ui: { scheme: "auto" }, seenVersion: null }; },
  s: null, saveFailed: false, recovered: false,
  // Fusionne un état lu (ancienne version, sauvegarde importée) avec la forme actuelle : aucune clé attendue ne manque ensuite
  merge(o) {
    const f = this.fresh(), obj = (x) => x && typeof x === "object" && !Array.isArray(x) ? x : {};
    const r = { ...f, ...o, v: 4, progress: obj(o.progress), pos: obj(o.pos), grammar: obj(o.grammar), conjBest: obj(o.conjBest), activity: obj(o.activity), settings: { ...f.settings, ...obj(o.settings) }, stats: { ...f.stats, ...obj(o.stats), errors: obj(o.stats?.errors) }, percorsi: { ...f.percorsi, ...obj(o.percorsi), done: obj(o.percorsi?.done) }, goals: { ...f.goals, ...obj(o.goals) }, ui: { ...f.ui, ...obj(o.ui) } };
    r.lastCat = typeof o.lastCat === "string" ? o.lastCat : typeof o.theme === "string" && CAT[o.theme] ? o.theme : null;
    for (const k of ["theme", "dirty", "syncAt"]) delete r[k]; // reliquats d'anciennes versions
    for (const [id, p] of Object.entries(r.progress)) { if (!p || typeof p !== "object") delete r.progress[id]; else { delete p.updated; delete p.lastOk; } }
    for (const a of Object.values(r.activity)) if (a && typeof a === "object") delete a.updated;
    const st = r.settings; st.interval_min = num(st.interval_min, 60, 15, 720); st.start_hour = num(st.start_hour, 8, 0, 23); st.end_hour = num(st.end_hour, 21, 1, 24); st.kinds = (Array.isArray(st.kinds) ? st.kinds : []).filter((k) => KINDS.includes(k)); if (!st.kinds.length) st.kinds = [...KINDS]; st.enabled = st.enabled !== false;
    return r;
  },
  read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  load() {
    this.s = this.fresh(); this.recovered = false; const raw = this.read(KEY);
    if (raw) {
      try { this.s = this.merge(JSON.parse(raw)); }
      catch (e) { // état illisible : on le met de côté et on repart de la copie de sécurité du jour précédent
        try { localStorage.setItem(KEY + ".corrupt", raw); } catch (e2) {}
        try { const bak = JSON.parse(this.read(BAK) || "null"); if (bak?.data) { this.s = this.merge(JSON.parse(bak.data)); this.recovered = true; } } catch (e2) {}
      }
    }
    const isNew = !this.s.device;
    if (isNew) { this.s.device = crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = rnd(16); return (c === "x" ? r : (r & 3 | 8)).toString(16); }); this.s.seenVersion = APP_VERSION; }
    this.tick(); this.save();
    // Copie de sécurité : l'état tel qu'il était au premier lancement du jour
    if (raw && !this.recovered) { try { const bak = JSON.parse(this.read(BAK) || "null"); if (bak?.day !== dayKey()) localStorage.setItem(BAK, JSON.stringify({ day: dayKey(), data: raw })); } catch (e) {} }
  },
  // Changement de jour (au lancement, au retour au premier plan, avant chaque action) : série et menu du jour
  tick() {
    const today = dayKey(), st = this.s.stats; let last = st.lastDay;
    if (last && !/^\d{4}-\d\d-\d\d$/.test(last)) { const d = new Date(last); last = isNaN(d) ? null : dayKey(d); }
    if (last === today) { st.lastDay = today; return false; }
    st.streak = last === daysAgo(1) ? (st.streak || 0) + 1 : 1; st.lastDay = today;
    if (this.s.menu && this.s.menu.day !== today) this.s.menu = null;
    return true;
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); this.saveFailed = false; }
    catch (e) { if (!this.saveFailed) { this.saveFailed = true; setTimeout(() => toast("Progression non enregistrée : stockage plein ou bloqué. Exporte une sauvegarde dans Réglages."), 0); } }
  },
  export() { return JSON.stringify({ app: "impara", v: 4, exported: new Date().toISOString(), data: this.s }); },
  // Lit une sauvegarde sans l'appliquer (pour l'aperçu avant confirmation)
  parseBackup(text) { const o = JSON.parse(text), d = o?.app === "impara" ? o.data : o; if (!d || typeof d !== "object" || !d.progress || typeof d.progress !== "object") throw new Error("Ce fichier n'est pas une sauvegarde Impara!"); return { data: d, exported: o?.exported || null, seen: Object.values(d.progress).filter((p) => p?.seen).length, lessons: Object.keys(d.grammar || {}).length }; },
  // Applique une sauvegarde : la progression est remplacée, l'identité de l'appareil et ses réglages de notification sont conservés
  restore(d) { const keep = { device: this.s.device, subscribed: this.s.subscribed, settings: this.s.settings, ui: this.s.ui }; this.s = this.merge({ ...d, ...keep }); this.s.menu = null; this.tick(); this.save(); Sync.schedule(); },
  // Notation d'une carte (répétition espacée) + journal d'erreurs + activité du jour.
  // Une bonne réponse ne fait monter la carte que si elle était due (ou nouvelle) : la rejouer dix fois le même jour ne la rend pas « acquise ».
  grade(id, known, errType) {
    if (!BY_ID[id]) return;
    const now = Date.now(), cur = this.s.progress[id] || { box: 0, fails: 0, lapses: 0 }, isNew = !cur.seen, wasDue = isNew || (cur.due || 0) <= now;
    const box = !known ? 0 : wasDue ? Math.min((cur.box || 0) + 1, 4) : (cur.box || 0);
    this.s.progress[id] = { box, due: !known ? now : wasDue ? dueIn(BOX_INTERVALS[box]) : cur.due, seen: true, fails: (cur.fails || 0) + (known ? 0 : 1), lapses: (cur.lapses || 0) + (!known && (cur.box || 0) >= 3 ? 1 : 0) };
    if (!known && errType) this.s.stats.errors[errType] = (this.s.stats.errors[errType] || 0) + 1;
    this.activity({ answers: 1, correct: known ? 1 : 0, newCards: isNew ? 1 : 0 });
    this.save(); Sync.schedule();
  },
  see(id) { if (!BY_ID[id] || this.s.progress[id]?.seen) return; this.s.progress[id] = { box: 0, due: Date.now(), seen: true, fails: 0, lapses: 0 }; this.activity({ newCards: 1 }); this.save(); Sync.schedule(); },
  activity(delta) { const k = dayKey(), a = this.s.activity[k] || { answers: 0, correct: 0, newCards: 0, lessons: 0 }; for (const [f, v] of Object.entries(delta)) a[f] = (a[f] || 0) + v; this.s.activity[k] = a; const keys = Object.keys(this.s.activity).sort(); while (keys.length > 90) delete this.s.activity[keys.shift()]; },
  due() { const now = Date.now(); return CARDS.filter((w) => { const p = this.s.progress[w.id]; return p?.seen && (p.due || 0) <= now; }); },
  seen() { return CARDS.filter((w) => this.s.progress[w.id]?.seen); },
  mastered() { return CARDS.filter((w) => (this.s.progress[w.id]?.box || 0) >= 4).length; },
  weak() { const sc = (w) => { const p = this.s.progress[w.id]; return (p.fails || 0) + (p.lapses || 0) * 2; }; // En difficulté tant que la carte n'est pas consolidée (boîte 3) : la liste se vide quand on progresse
    return CARDS.filter((w) => { const p = this.s.progress[w.id]; return p && (p.box || 0) < 3 && (p.fails >= 2 || p.lapses >= 1 || (p.fails >= 1 && !p.box)); }).sort((a, b) => sc(b) - sc(a)); },
  lessonsDone(track) { return LESSONS.filter((l) => (!track || l.track === track) && (this.s.grammar[l.id] || 0) >= l.quiz.length).length; },
  boxLabel(id) { return ["nouvelle", "vue", "en cours", "presque acquise", "acquise"][this.s.progress[id]?.box || 0]; },
  weekStart() { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dayKey(d); },
  week() { const from = this.weekStart(), out = { answers: 0, correct: 0, newCards: 0, lessons: 0 }; for (const [k, a] of Object.entries(this.s.activity)) if (k >= from) for (const f of Object.keys(out)) out[f] += a[f] || 0; return out; },
  lessonValidated(id) { const a0 = this.s.activity[dayKey()]; if (!a0?.lessonsIds?.includes(id)) { this.activity({ lessons: 1 }); const a = this.s.activity[dayKey()]; a.lessonsIds = [...(a.lessonsIds || []), id]; } this.save(); Sync.schedule(); },
};

/* ═══════════════════════════════════════════
   3. État envoyé au serveur (sans compte) : file d'apprentissage, cartes faibles, scores de conjugaison
   → les notifications s'adaptent à cet appareil
   ═══════════════════════════════════════════ */
const Sync = {
  t: null, last: "",
  state() { return { queue: Menu.queue(), weak: Store.due().filter((w) => (Store.s.progress[w.id]?.fails || 0) > 0 || (Store.s.progress[w.id]?.box || 0) <= 1).slice(0, 80).map((w) => w.id), conjBest: Store.s.conjBest }; },
  schedule() { if (!Store.s.subscribed || DEMO) return; clearTimeout(this.t); this.t = setTimeout(() => this.push(), 5000); },
  // N'envoie que si l'état a changé depuis le dernier envoi réussi
  async push(opts) { if (!Store.s.subscribed || DEMO) return; const st = this.state(), sig = JSON.stringify(st); if (sig === this.last) return; try { await Api.call("/register", st, opts); this.last = sig; } catch (e) {} },
};

/* ═══════════════════════════════════════════
   4. API, démo, notifications push
   ═══════════════════════════════════════════ */
const Demo = {
  sent: null,
  item(kind) {
    if (kind === "conj") { const t = pick(Object.keys(CONJ)), [inf, forms] = pick(Object.entries(CONJ[t].verbs)); let p = rnd(6); while (forms[p] === "—") p = rnd(6); return { id: `c:${t}:${inf}:${p}`, kind, title: `${inf} (${VERB_FR[inf] || inf}) → ${PERSONS[p]}`, body: forms[p], extra: CONJ[t].label, level: "A2", tag: CONJ[t].label }; }
    const w = pick(kind === "phrase" ? PHRASES : WORDS);
    return { id: `${kind === "phrase" ? "p" : "w"}:${w.id}`, kind, title: w.it, body: w.fr, extra: w.ex ? `${w.ex} — ${w.exFr}` : null, level: w.lv, tag: isPhrase(w) ? (w.sit || `Vivi l'italiano · Unità ${w.unit}`) : (CAT[w.cat]?.label || "") };
  },
  seed() { const now = Date.now(), mins = [20, 80, 140, 26 * 60, 28 * 60 + 15, 31 * 60, 50 * 60, 52 * 60 + 30, 74 * 60], kinds = ["word", "phrase", "conj", "word", "phrase", "word", "conj", "word", "phrase"]; this.sent = mins.map((m, i) => ({ sent_at: new Date(now - m * 60000).toISOString(), item: this.item(kinds[i]) })); },
  async call(path) {
    await new Promise((r) => setTimeout(r, 120)); if (!this.sent) this.seed();
    const s = Store.s.settings;
    if (path === "/vapid") return { key: "demo" };
    if (path === "/me") return { exists: true, subscribed: true, enabled: s.enabled, interval_min: s.interval_min, start_hour: s.start_hour, end_hour: s.end_hour, kinds: s.kinds };
    if (path === "/today") return { sent: this.sent };
    if (path === "/register") return { subscribed: true, enabled: s.enabled };
    if (path === "/test") { const it = this.item(pick(s.kinds.length ? s.kinds : ["word"])); this.sent.unshift({ sent_at: new Date().toISOString(), item: it }); return { ok: true, report: [{ sent: it.id }] }; }
    if (path === "/stats") return this.stats();
    return {};
  },
  // Statistiques serveur plausibles (23 jours d'envois, déterministes)
  stats() {
    const s = Store.s.settings, r = seeded(4242), by_day = [], by_hour = Array(24).fill(0), kinds = { word: 0, phrase: 0, conj: 0 }, why = { ripasso: 0, percorso: 0, random: 0 };
    for (let i = 22; i >= 0; i--) { const d = daysAgo(i), wd = new Date(d + "T12:00:00").getDay(); const n = wd === 0 ? 2 + Math.floor(r() * 3) : 6 + Math.floor(r() * 7); const row = { day: d, word: 0, phrase: 0, conj: 0 }; for (let j = 0; j < n; j++) { const k = r() < 0.47 ? "word" : r() < 0.7 ? "phrase" : "conj"; row[k]++; kinds[k]++; const h = s.start_hour + Math.floor(r() * Math.max(1, s.end_hour - s.start_hour)); by_hour[h % 24]++; const w = r(); why[w < 0.4 ? "ripasso" : w < 0.7 ? "percorso" : "random"]++; } by_day.push(row); }
    const total = kinds.word + kinds.phrase + kinds.conj;
    return { device: { enabled: s.enabled, interval_min: s.interval_min, start_hour: s.start_hour, end_hour: s.end_hour, tz: tz(), kinds: s.kinds, last_sent_at: new Date(Date.now() - 17 * 60000).toISOString(), created_at: new Date(Date.now() - 23 * DAY).toISOString(), subscribed: true },
      total, first_at: by_day[0].day + "T08:00:00Z", distinct: Math.round(total * 0.93), items_total: WORDS.length + PHRASES.length + 4296,
      coverage: { word: { sent: Math.round(kinds.word * 0.93), total: WORDS.length }, phrase: { sent: Math.round(kinds.phrase * 0.93), total: PHRASES.length }, conj: { sent: kinds.conj, total: 4296 } },
      by_day, by_hour, by_why: why, top_tags: [["Al lavoro", 31], ["Parole utili", 24], ["Strada & trasporti", 19], ["Vivi l'italiano · Unità 8", 14], ["Presente", 12], ["Torino & tempo libero", 11]].map(([tag, n]) => ({ tag, n })),
      cron: { last_run: new Date(Date.now() - 3 * 60000).toISOString(), ok: 23 * 288, failed: 2 } };
  },
};
const Api = {
  // Appel au serveur de notifications : délai maximal, messages d'erreur lisibles, rien quand l'appareil est hors ligne
  async call(path, body, { keepalive = false, timeout = 12000 } = {}) {
    if (DEMO) return Demo.call(path, body);
    if (navigator.onLine === false) throw new Error("Hors ligne");
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(API + path + (body ? "" : `?device=${Store.s.device}`), { ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device: Store.s.device, ...body }) } : {}), signal: ctl.signal, keepalive });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Erreur ${r.status}`);
      return data;
    } catch (e) { throw new Error(e.name === "AbortError" ? "Le serveur ne répond pas" : e instanceof TypeError ? "Serveur injoignable" : e.message); }
    finally { clearTimeout(t); }
  },
};
const Push = {
  reg: null,
  isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  standalone: () => window.navigator.standalone === true || matchMedia("(display-mode: standalone)").matches,
  supported: () => DEMO || ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window),
  permission: () => DEMO ? "granted" : (typeof Notification !== "undefined" ? Notification.permission : "default"),
  init() {
    if (DEMO || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").then((r) => { this.reg = r; }).catch((e) => console.warn("SW", e));
    navigator.serviceWorker.addEventListener("message", (e) => { if (e.data?.type === "open-oggi") { if (Router.path === "/sessione" && G.sess && !G.sess.finished) toast("Nouvelle notification : elle t'attend dans Oggi"); else Router.go("/oggi"); Today.refresh(true); } if (e.data?.type === "update-ready") { G.update = true; if (Router.path === "/oggi") render(); } });
  },
  b64(b64) { const pad = "=".repeat((4 - b64.length % 4) % 4); const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); },
  async enable() {
    if (DEMO) { Store.s.subscribed = true; Store.s.settings.enabled = true; Store.save(); return; }
    if (!this.supported()) throw new Error(this.isIOS && !this.standalone() ? "Installe d'abord l'app sur l'écran d'accueil." : "Ce navigateur ne gère pas les notifications.");
    const reg = this.reg || await Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error("Service worker indisponible : recharge la page.")), 6000))]);
    if (await Notification.requestPermission() !== "granted") throw new Error("Notifications refusées. Autorise-les dans les réglages du téléphone.");
    const { key } = await Api.call("/vapid");
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.b64(key) });
    const me = await Api.call("/register", { subscription: sub.toJSON(), tz: tz(), ...Store.s.settings, enabled: true, ...Sync.state() });
    Store.s.subscribed = !!me.subscribed; Store.s.pushEndpoint = sub.endpoint; Store.s.settings.enabled = true; Store.save();
  },
  async sync() { await Api.call("/register", { tz: tz(), ...Store.s.settings, ...Sync.state() }); },
  async me() {
    try {
      const me = await Api.call("/me"), d = Store.s.settings;
      if (!me.exists) { if (Store.s.subscribed) { Store.s.subscribed = false; Store.save(); render(); } return; } // appareil inconnu du serveur : on repropose l'activation
      Store.s.subscribed = !!me.subscribed;
      if (Store.s.settingsDirty && me.subscribed) { await this.sync(); Store.s.settingsDirty = false; } // réglages changés hors ligne : ce sont eux qui font foi
      else Store.s.settings = { ...d, interval_min: num(me.interval_min, d.interval_min, 15, 720), start_hour: num(me.start_hour, d.start_hour, 0, 23), end_hour: num(me.end_hour, d.end_hour, 1, 24), kinds: Array.isArray(me.kinds) && me.kinds.some((k) => KINDS.includes(k)) ? me.kinds.filter((k) => KINDS.includes(k)) : d.kinds, enabled: typeof me.enabled === "boolean" ? me.enabled : d.enabled };
      Store.save(); render();
      if (me.subscribed) { Today.refresh(true); Sync.schedule(); this.heal(); }
    } catch (e) {}
  },
  // L'abonnement push peut expirer côté navigateur sans prévenir : on le vérifie au lancement et on le renvoie au serveur s'il a changé
  async heal() {
    if (DEMO || this.permission() !== "granted" || !("serviceWorker" in navigator)) return;
    try {
      const reg = this.reg || await navigator.serviceWorker.ready; let sub = await reg.pushManager.getSubscription();
      if (!sub) { const { key } = await Api.call("/vapid"); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.b64(key) }); }
      if (sub.endpoint !== Store.s.pushEndpoint) { await Api.call("/register", { subscription: sub.toJSON() }); Store.s.pushEndpoint = sub.endpoint; Store.save(); }
    } catch (e) {}
  },
  // App gardée en mémoire plusieurs jours : on demande de temps en temps au service worker s'il existe une version plus récente
  checkUpdate() { if (DEMO || Date.now() - (this.checked || 0) < 6 * 3600e3) return; this.checked = Date.now(); try { navigator.serviceWorker?.controller?.postMessage({ type: "check-update" }); } catch (e) {} },
};
const Today = {
  loading: false, sent: [], error: null, at: 0,
  items() { const k = dayKey(); return this.sent.filter((s) => dayKey(s.sent_at) === k); },
  older() { const k = dayKey(); return this.sent.filter((s) => dayKey(s.sent_at) !== k); },
  async refresh(force) {
    if (!Store.s.subscribed && !force) return;
    if (this.loading || (!force && Date.now() - this.at < 20000)) return;
    this.loading = true; this.error = null; render();
    try { const d = await Api.call("/today"); this.sent = (Array.isArray(d?.sent) ? d.sent : []).filter((x) => x && x.item && typeof x.item === "object" && validDate(x.sent_at)); this.at = Date.now(); if (!Store.s.subscribed && this.sent.length) { Store.s.subscribed = true; Store.save(); } }
    catch (e) { this.error = e.message; }
    this.loading = false; render();
  },
};
// Statistiques des notifications (serveur) — rafraîchies tant que l'onglet Notifiche est visible
const Stats = {
  data: null, at: 0, loading: false, error: null, timer: null,
  async refresh(force) {
    if (!Store.s.subscribed && !DEMO) return;
    if (this.loading || (!force && Date.now() - this.at < 30000)) return;
    this.loading = true; this.error = null; render();
    try { this.data = cleanStats(await Api.call("/stats")); this.at = Date.now(); } catch (e) { this.error = e.message; }
    this.loading = false; render();
  },
  visible() { return Router.path === "/progressi" && G.st.tab === "notifiche" && !document.hidden; },
  watch() { if (this.timer) return; this.timer = setInterval(() => { if (!this.visible()) { clearInterval(this.timer); this.timer = null; return; } this.refresh(); }, 60000); },
  unwatch() { clearInterval(this.timer); this.timer = null; },
};
function cleanStats(d) {
  d = d && typeof d === "object" ? d : {}; const o = (x) => x && typeof x === "object" ? x : {}, dev = o(d.device), cov = o(d.coverage), cron = o(d.cron), n = (v) => num(v, 0, 0);
  return { device: { subscribed: !!dev.subscribed, enabled: !!dev.enabled, interval_min: n(dev.interval_min), start_hour: num(dev.start_hour, 0, 0, 23), end_hour: num(dev.end_hour, 24, 1, 24), kinds: (Array.isArray(dev.kinds) ? dev.kinds : []).filter((k) => KINDS.includes(k)), last_sent_at: validDate(dev.last_sent_at), created_at: validDate(dev.created_at) },
    total: n(d.total), distinct: n(d.distinct), items_total: n(d.items_total), first_at: validDate(d.first_at),
    coverage: Object.fromEntries(KINDS.map((k) => [k, { sent: n(o(cov[k]).sent), total: n(o(cov[k]).total) }])),
    by_day: (Array.isArray(d.by_day) ? d.by_day : []).filter((r) => /^\d{4}-\d\d-\d\d$/.test(r?.day)).map((r) => ({ day: r.day, word: n(r.word), phrase: n(r.phrase), conj: n(r.conj) })),
    by_hour: Array.from({ length: 24 }, (_, h) => n(d.by_hour?.[h])),
    by_why: Object.fromEntries(Object.entries(o(d.by_why)).map(([k, v]) => [String(k), n(v)])),
    top_tags: (Array.isArray(d.top_tags) ? d.top_tags : []).map((t) => ({ tag: String(t?.tag ?? ""), n: n(t?.n) })),
    cron: { ok: n(cron.ok), failed: n(cron.failed), last_run: validDate(cron.last_run) } };
}
let toastT = null;
function toast(msg) { let el = document.getElementById("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.getElementById("app").appendChild(el); } el.textContent = msg; el.style.display = "block"; clearTimeout(toastT); toastT = setTimeout(() => { el.style.display = "none"; }, 3200); }
let settingsT = null;
function settingsChanged() {
  Store.s.settingsDirty = !!Store.s.subscribed; Store.save(); render(); clearTimeout(settingsT);
  if (!Store.s.subscribed) return;
  settingsT = setTimeout(async () => { try { await Push.sync(); Store.s.settingsDirty = false; Store.save(); toast("Réglages enregistrés"); } catch (e) { toast(`Réglages gardés sur cet appareil ; ils seront envoyés au prochain lancement (${e.message.toLowerCase()})`); } }, 700);
}

/* ═══════════════════════════════════════════
   5. Distracteurs plausibles (QCM) — avec le type d'erreur qu'ils testent
   ═══════════════════════════════════════════ */
const Distract = (() => {
  const FUNC = new Set("il lo la i gli le l un una uno di a da in con su per tra fra e è che non mi ti si ci vi ne come dove quando perché cosa chi se ma o più molto poco anche già mai sempre qui là lì questo questa questi queste quello quella quelli quelle c'è".split(" "));
  const ART = { il: ["lo", "la", "i"], lo: ["il", "gli", "la"], la: ["il", "le", "lo"], i: ["gli", "le", "il"], gli: ["i", "le"], le: ["la", "i", "gli"], un: ["una", "uno"], una: ["un", "uno"], uno: ["un", "una"] };
  const PREP = { a: ["in", "da", "per"], di: ["da", "a", "del"], da: ["di", "a", "in"], in: ["a", "su", "da"], con: ["per", "a"], su: ["in", "sopra"], per: ["a", "di", "con"], tra: ["in"], fra: ["in"] };
  const ARTP = { al: ["alla", "allo", "ai", "nel"], allo: ["al", "alla"], alla: ["al", "alle", "nella"], ai: ["al", "agli", "alle"], agli: ["ai", "alle"], alle: ["alla", "ai"], del: ["della", "dello", "dei", "dal"], dello: ["del", "della"], della: ["del", "delle", "dalla"], dei: ["del", "degli", "delle"], degli: ["dei", "delle"], delle: ["della", "dei"], dal: ["dalla", "dai", "del"], dalla: ["dal", "dalle", "della"], dai: ["dal", "dagli"], dalle: ["dalla", "dai"], nel: ["nella", "nei", "al"], nello: ["nel", "nella"], nella: ["nel", "nelle", "alla"], nei: ["nel", "negli"], negli: ["nei", "nelle"], nelle: ["nella", "nei"], sul: ["sulla", "sui", "nel"], sulla: ["sul", "sulle"], sui: ["sul", "sugli"], sulle: ["sulla", "sui"] };
  const PAIRS = { molto: ["molti", "molta"], molti: ["molto", "molte"], molta: ["molto", "molte"], bene: ["buono", "buona"], buono: ["bene", "buona"], buona: ["bene", "buono"], qualche: ["alcuni", "alcune"], alcuni: ["qualche", "alcune"], tutto: ["tutti", "tutta"], tutti: ["tutto", "tutte"], ogni: ["tutti", "ognuno"], mai: ["sempre"], sempre: ["mai", "spesso"], spesso: ["sempre", "raramente"], prima: ["dopo"], dopo: ["prima"], grande: ["grandi"], piccolo: ["piccola", "piccoli"], bello: ["bella", "belli"], bella: ["bello", "belle"], mio: ["mia", "miei"], mia: ["mio", "mie"], tuo: ["tua", "tuoi"], tua: ["tuo", "tue"], suo: ["sua", "suoi"], sua: ["suo", "sue"], nostro: ["nostra", "nostri"], vostro: ["vostra", "vostri"], questo: ["questa", "questi", "quello"], questa: ["questo", "queste", "quella"], quello: ["quella", "quelli", "questo"], quella: ["quello", "quelle", "questa"], più: ["meno"], meno: ["più"], anche: ["neanche"], troppo: ["poco"], poco: ["poca", "pochi"], oggi: ["domani", "ieri"], domani: ["oggi", "dopodomani"], ieri: ["oggi", "domani"], adesso: ["dopo", "allora"], ancora: ["già"], già: ["ancora"], "c'è": ["ci sono"], ci: ["c'è"] };
  let FORMS = null; // index forme → verbes, construit au premier QCM plutôt qu'au démarrage
  const forms = () => { if (FORMS) return FORMS; FORMS = new Map(); for (const [tense, data] of Object.entries(CONJ)) for (const [inf, forms] of Object.entries(data.verbs)) forms.forEach((f, p) => { if (f === "—") return; const k = f.toLowerCase().replace(/^(mi|ti|si|ci|vi) /, ""); if (!FORMS.has(k)) FORMS.set(k, []); FORMS.get(k).push({ inf, tense, p }); }); return FORMS; };
  const isVerbForm = (w) => forms().has(w);
  const bare = (f) => f.replace(/^(mi|ti|si|ci|vi) /, "");
  const verbAlts = (w) => { const out = []; for (const h of forms().get(w) || []) { const forms = CONJ[h.tense].verbs[h.inf]; [1, 2, 5].forEach((d) => { const f = forms[(h.p + d) % 6]; if (f && f !== "—") out.push({ v: bare(f), w: 3, t: "persona" }); }); for (const t of Object.keys(CONJ)) if (t !== h.tense && CONJ[t].verbs[h.inf] && CONJ[t].verbs[h.inf][h.p] !== "—") out.push({ v: bare(CONJ[t].verbs[h.inf][h.p]), w: 3, t: "tempo" }); } return out; };
  const endingSwaps = (t) => { if (t.length < 5) return []; const m = { o: ["a", "i"], a: ["o", "e"], e: ["i", "a"], i: ["e", "o"] }[t.slice(-1)]; return m ? m.map((e) => ({ v: t.slice(0, -1) + e, w: 2, t: "accordo" })) : []; };
  const doubleSwap = (t) => { const m = t.match(/([bcdfglmnprstvz])\1/); if (m) return [{ v: t.replace(m[0], m[1]), w: 1, t: "ortografia" }]; const m2 = t.length >= 5 && t.match(/([aeiou])([bcdfglmnprstvz])([aeiou])/); return m2 ? [{ v: t.replace(m2[0], m2[1] + m2[2] + m2[2] + m2[3]), w: 1, t: "ortografia" }] : []; };
  const infSwap = (t) => { const m = t.match(/^(.+?)(are|ere|ire)$/); return m ? ["are", "ere", "ire"].filter((e) => e !== m[2]).map((e) => ({ v: m[1] + e, w: 2, t: "verbo" })) : []; };
  const auxSwap = (t, next) => { if (!/(ato|uto|ito|at[aie]|ut[aie]|it[aie]|tto|sso|sto|nto|rso|lto)$/.test(next || "")) return []; const pa = AVERE_P.indexOf(t), pe = ESSERE_P.indexOf(t); if (pa >= 0) return [{ v: ESSERE_P[pa], w: 3, t: "ausiliare" }]; if (pe >= 0) return [{ v: AVERE_P[pe], w: 3, t: "ausiliare" }]; return []; };
  const keepCase = (orig, repl) => /^[A-ZÀ-Ý]/.test(orig) ? repl[0].toUpperCase() + repl.slice(1) : repl;
  const clean = (t) => t.replace(/[^\p{L}']/gu, "").toLowerCase();
  function mutate(it) {
    const parts = it.split(/(\s+)/), toks = parts.filter((_, i) => i % 2 === 0).map(clean), out = [];
    const emit = (i, r) => { const p = [...parts], tok = p[i * 2], m = tok.match(/^([^\p{L}']*)([\p{L}']+)(.*)$/u); if (m) { p[i * 2] = m[1] + keepCase(m[2], r.v) + m[3]; out.push({ v: p.join(""), w: r.w, t: r.t }); } };
    toks.forEach((w, i) => {
      if (!w) return;
      verbAlts(w).forEach((r) => emit(i, r));
      auxSwap(w, toks[i + 1]).forEach((r) => emit(i, r));
      (ART[w] || []).forEach((v) => emit(i, { v, w: 2, t: "articolo" }));
      (PREP[w] || []).forEach((v) => emit(i, { v, w: 2, t: "preposizione" }));
      (ARTP[w] || []).forEach((v) => emit(i, { v, w: 2, t: "preposizione" }));
      (PAIRS[w] || []).forEach((v) => emit(i, { v, w: 2, t: "lessico" }));
      if (!FUNC.has(w) && !isVerbForm(w)) { infSwap(w).forEach((r) => emit(i, r)); endingSwaps(w).forEach((r) => emit(i, r)); doubleSwap(w).forEach((r) => emit(i, r)); }
    });
    return out;
  }
  function lev(a, b) { const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1); for (let i = 1; i <= m; i++) { cur[0] = i; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); [prev, cur] = [cur, prev]; } return prev[n]; }
  function similar(card, pool) {
    const a = norm(stripArticle(norm(card.it)));
    return pool.filter((o) => o.id !== card.id && norm(o.it) !== norm(card.it)).map((o) => { const b = norm(stripArticle(norm(o.it))); let s = -lev(a, b) / Math.max(a.length, b.length, 1); if (o.cat === card.cat) s += 0.35; if (o.lv === card.lv) s += 0.08; if (a[0] === b[0]) s += 0.12; if (Math.abs(a.length - b.length) <= 2) s += 0.1; if (card.unit && o.unit === card.unit) s += 0.2; if (card.sit && o.sit === card.sit) s += 0.2; return { o, s: s + Math.random() * 0.12 }; }).sort((x, y) => y.s - x.s).map((x) => x.o);
  }
  function uniq(list, banned) { const seen = new Set(banned), out = []; for (const x of list) { const k = norm(x.v ?? x); if (!k || seen.has(k)) continue; seen.add(k); out.push(x); } return out; }
  const weighted = (list) => [...list].sort((x, y) => (y.w + Math.random() * 1.6) - (x.w + Math.random() * 1.6));
  function options(card) {
    const phrase = isPhrase(card), pool = phrase ? PHRASES : WORDS, banned = [...acceptedAnswers(card)];
    const muts = uniq(weighted(mutate(card.it).filter((m) => phrase || m.t === "articolo" || m.t === "ortografia")), banned);
    const sims = uniq(similar(card, pool).map((o) => ({ v: o.it, t: "lessico" })), banned);
    const picks = [];
    const take = (src, n) => { for (const x of src) { if (picks.length >= 3 || n <= 0) break; if (!picks.some((p) => norm(p.v) === norm(x.v))) { picks.push(x); n--; } } };
    if (phrase) { take(muts, 2 + rnd(2)); take(sims.slice(0, 6), 3); take(muts, 3); }
    else { take(sims.slice(0, 5), 1 + rnd(2)); take(muts, 1); take(sims.slice(0, 8), 3); take(muts, 3); }
    return shuffle([{ id: card.id, label: card.it }, ...picks.map((x, i) => ({ id: "~" + i, label: x.v, t: x.t }))]);
  }
  function conjOptions(id, correct) {
    correct = String(correct ?? ""); if (!correct) return [];
    const [, tense, inf, ps] = id.split(":"), p = +ps, alts = [];
    if (tense === "passato") {
      const v = PASSATO.find((x) => x.inf === inf);
      if (v) {
        const aux = v.aux === "avere" ? AVERE_P[p] : v.aux === "essere" ? ESSERE_P[p] : `${RIFL_P[p]} ${ESSERE_P[p]}`;
        const stem = v.aux === "avere" ? v.part.slice(0, -1) : v.part;
        alts.push({ v: v.aux === "avere" ? `${ESSERE_P[p]} ${stem}${p < 3 ? "o" : "i"}` : `${AVERE_P[p]} ${stem}o`, w: 3, t: "ausiliare" });
        alts.push({ v: passatoForms(v, (p + 1) % 6).display, w: 2, t: "persona" }, { v: passatoForms(v, (p + 3) % 6).display, w: 2, t: "persona" });
        alts.push({ v: `${aux} ${stem}${v.aux === "avere" ? (p < 3 ? "i" : "a") : (p < 3 ? "i" : "o")}`, w: 2, t: "accordo" });
      }
    } else {
      const forms = CONJ[tense]?.verbs[inf];
      if (forms) { [1, 3, 5].forEach((d) => { const f = forms[(p + d) % 6]; if (f && f !== "—") alts.push({ v: f, w: 2, t: "persona" }); }); for (const t of Object.keys(CONJ)) if (t !== tense && CONJ[t].verbs[inf] && CONJ[t].verbs[inf][p] !== "—") alts.push({ v: CONJ[t].verbs[inf][p], w: 3, t: "tempo" }); }
    }
    const picks = uniq(weighted(alts), correct.split(" / ").map(norm)).slice(0, 3);
    if (picks.length < 3) return [];
    return shuffle([{ id, label: correct }, ...picks.map((a, i) => ({ id: "~" + i, label: a.v, t: a.t }))]);
  }
  return { options, conjOptions };
})();
const ERR_LABEL = { verbo: "Forme verbale", persona: "Personne du verbe", tempo: "Temps du verbe", ausiliare: "Auxiliaire", articolo: "Article", preposizione: "Préposition", accordo: "Accord", ortografia: "Orthographe", lessico: "Vocabulaire", scrittura: "Écriture" };

/* ═══════════════════════════════════════════
   6. Routeur (hash)
   ═══════════════════════════════════════════ */
const Router = {
  path: "/oggi", params: {}, depth: 0, pushing: false,
  parse() { const seg = (location.hash || "#/oggi").replace(/^#\/?/, "").split("/").filter(Boolean); this.path = "/" + (seg[0] || "oggi"); this.params = { a: seg[1], b: seg[2] }; if (!Views[this.path] || (this.path === "/sessione" && !G.sess)) { if (this.path === "/sessione") history.replaceState(null, "", "#/oggi"); this.path = "/oggi"; this.params = {}; } },
  replace(p) { if (location.hash === "#" + p) return render({ top: true }); this.replacing = true; location.replace("#" + p); },
  go(p) { if (location.hash !== "#" + p) { this.pushing = true; location.hash = "#" + p; } else { G.key = ""; G.fresh(this.path, this.params); render({ top: true }); } },
  back(fallback) { if (!DEMO && this.depth > 0) history.back(); else this.go(fallback); },
};
window.addEventListener("hashchange", () => {
  if (Router.pushing) Router.depth++; else if (!Router.replacing) Router.depth = Math.max(0, Router.depth - 1);
  Router.pushing = Router.replacing = false; Router.parse(); G.fresh(Router.path, Router.params); render({ top: true });
});

/* ═══════════════════════════════════════════
   7. Composants
   ═══════════════════════════════════════════ */
const UI = {
  // Compteur cliquable : il mène à la liste qu'il compte
  stat: (n, label, href, cls = "") => `<a class="stat ${cls}" href="#${href}"><b>${n}</b><span>${label}</span></a>`,
  stats: (cells) => `<div class="stats">${cells.join("")}</div>`,
  // Actions principales d'un écran d'exercice, ancrées en bas à portée de pouce
  dock: (html) => `<div class="dock">${html}</div>`,
  ring(pct, cls = "") { const r = 14, c = 2 * Math.PI * r; return `<svg class="ring ${cls}" viewBox="0 0 34 34"><circle class="bg" cx="17" cy="17" r="${r}"/><circle class="fg" cx="17" cy="17" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, pct)))}"/></svg>`; },
  row({ href, a, data = "", ic, icCls = "", title, sub, end, chev = true, cls = "" }) {
    const tag = href ? `a href="#${href}"` : `button type="button" data-a="${a}" ${data}`;
    return `<${tag} class="row ${cls}">${ic ? (ic.startsWith('<svg class="ring') ? ic : `<span class="ic ${icCls}">${ic}</span>`) : ""}<span class="tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ""}</span><span class="end">${end || ""}${chev ? I.chev : ""}</span></${href ? "a" : "button"}>`;
  },
  spk: (text, cls = "") => `<button type="button" class="spk ${cls}" data-a="speak" data-text="${esc(text)}" aria-label="Écouter">${I.volume}</button>`,
  flash({ id, flipped, lv, it, ex, fr, exFr, action }) {
    return `<div class="scene" data-key="${esc(id)}"><button type="button" class="fcard ${flipped ? "flip" : ""}" data-a="${action}" data-kbd=" " aria-pressed="${!!flipped}" aria-label="Carte : ${esc(flipped ? fr : it)}. Touche pour ${flipped ? "revenir à l'italien" : "voir la traduction"}">
      <div class="face front"><span class="lv">${esc(lv)}</span><div class="word" lang="it">${esc(it)}</div>${ex ? `<div class="ex" lang="it">${esc(ex)}</div>` : ""}<span class="tap">Touche pour voir la traduction</span></div>
      <div class="face back"><span class="lv">Français</span><div class="fr">${esc(fr)}</div>${exFr ? `<div class="ex">${esc(exFr)}</div>` : ""}<span class="tap">Touche pour revenir</span></div>
    </button>${this.spk(it, "onscene")}</div>`;
  },
  meta: (left, right) => `<div class="meta"><span>${left}</span><span class="score">${right}</span></div>`,
  prog: (pct) => `<div class="prog"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`,
  big: (n, of) => `${n}<span style="font-size:22px;color:var(--muted)">/${of}</span>`,
  result(big, title, sub, buttons) { return `<div class="result"><div class="big">${big}</div><div class="t">${title}</div>${sub ? `<div class="s">${sub}</div>` : ""}</div><div class="btnrow">${buttons}</div>`; },
  opts(opts, action, state, serif = true) {
    return `<div class="opts">${opts.map((o, i) => { let c = "opt"; if (state) { if (o.id === state.correct) c += " right"; else if (o.id === state.picked) c += " wrong"; } return `<button class="${c}" data-a="${action}" data-id="${esc(o.id)}" data-kbd="${i + 1}" ${state ? "disabled" : ""}><span class="n">${"ABCD"[i]}</span><span ${serif ? 'class="it" lang="it"' : ""}>${esc(o.label)}</span></button>`; }).join("")}</div>`;
  },
  tin: (value, state, placeholder = "Scrivi qui") => `<input id="inp" class="tin ${state ? (state.ok ? "right" : "wrong") : ""}" value="${esc(value)}" placeholder="${placeholder}" aria-label="Ta réponse en italien" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="done" ${state ? "readonly" : ""}>`,
  fb: (ok, html) => `<div class="fb ${ok ? "good" : "bad"}" role="status">${html}</div>`,
  exLine: (w) => w?.ex ? `<br><span class="it">${esc(w.ex)}</span> <span style="color:var(--muted)">— ${esc(w.exFr)}</span>` : "",
  next: (action, last) => `<button class="btn brand block" data-a="${action}" data-enter="1">${last ? "Résultat" : "Suivant"}</button>`,
  verify: (action, block = true) => `<button class="btn brand${block ? " block" : ""}" data-a="${action}" data-enter="1">Vérifier</button>`,
  fmtInterval: (m) => m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60}`,
};
/* Graphiques : barres fines, bouts arrondis, 2 px d'espace entre segments, légende dès 2 séries, infobulles */
const Chart = {
  // series : [{ key, label, color }] ; rows : [{ label, tipTitle, values: {key: n}, win? }]
  vbars(series, rows, { labelEvery = 1, max } = {}) {
    const totals = rows.map((r) => series.reduce((a, s) => a + (r.values[s.key] || 0), 0)); max = max || Math.max(1, ...totals);
    const cols = rows.map((r, i) => { const t = totals[i]; const segs = series.filter((s) => r.values[s.key] > 0).map((s) => `<i class="vseg" style="flex:${r.values[s.key]};background:${s.color}"></i>`).join(""); const tip = `${r.tipTitle || r.label}\n` + (series.length > 1 ? series.filter((s) => r.values[s.key]).map((s) => `${s.label} : ${r.values[s.key]}`).join("\n") : `${t}`); return `<div class="vcol ${r.win ? "win" : ""}" data-tip="${esc(tip.trim())}" tabindex="0" role="img" aria-label="${esc(tip.replace(/\n/g, ", "))}"><div class="vstack" style="height:${Math.round(t / max * 100)}%;--d:${(i * 0.02).toFixed(2)}s">${segs}</div></div>`; }).join("");
    const labs = rows.map((r, i) => `<small>${i % labelEvery === 0 ? esc(r.label) : ""}</small>`).join("");
    return `<div class="vbars">${cols}</div><div class="vlab">${labs}</div>${series.length > 1 ? this.legend(series) : ""}`;
  },
  legend: (series) => `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.label)}${s.n != null ? ` <span style="color:var(--muted)">${s.n}</span>` : ""}</span>`).join("")}</div>`,
  hstack(parts) { const total = parts.reduce((a, p) => a + p.n, 0) || 1; parts = parts.filter((p) => p.n > 0); return `<div class="hstack">${parts.map((p) => `<i style="flex:${p.n};background:${p.color}" data-tip="${esc(p.label)} : ${p.n} (${pct(p.n, total)})"></i>`).join("")}</div>${this.legend(parts)}`; },
  hbars(rows, { color = "var(--c2)", cls = "", max } = {}) { max = max || Math.max(1, ...rows.map((r) => r.n)); return rows.map((r, i) => `<div class="hbar ${cls}" data-tip="${esc(r.tip || `${r.label} : ${r.n}`)}"><span>${esc(r.label)}</span><div class="track"><i style="width:${Math.max(1, Math.round(r.n / max * 100))}%;background:${r.color || color};--d:${(i * 0.04).toFixed(2)}s"></i></div><b>${r.text ?? r.n}</b></div>`).join(""); },
  kpi: (n, unit, sub) => `<div class="kpi"><b>${n}</b><span>${unit}</span></div>${sub ? `<div class="kpi-sub">${sub}</div>` : ""}`,
};
const Tip = {
  el: null, cur: null,
  show(target) {
    if (!target.dataset.tip) return; if (!this.el) { this.el = document.createElement("div"); this.el.className = "tip"; this.el.setAttribute("role", "tooltip"); }
    const host = document.getElementById("app"); host.appendChild(this.el); this.el.textContent = target.dataset.tip; this.cur = target;
    const h = host.getBoundingClientRect(), r = target.getBoundingClientRect(), w = this.el.offsetWidth; const x = Math.max(w / 2 + 6, Math.min(h.width - w / 2 - 6, r.left - h.left + r.width / 2));
    this.el.style.left = x + "px"; this.el.style.top = (r.top - h.top) + "px";
  },
  hide() { if (this.el?.parentNode) this.el.remove(); this.cur = null; },
};
const G = { key: "", st: {}, sess: null, fresh(path, params) { const k = path + "/" + (params.a || "") + "/" + (params.b || ""); if (k !== this.key) { this.key = k; this.st = {}; Stats.unwatch(); Xp.stop(); } } };
const inputValue = () => document.getElementById("inp")?.value ?? "";

/* ═══════════════════════════════════════════
   8. Percorsi et Menù del giorno
   ═══════════════════════════════════════════ */
const Percorsi = {
  stepKey: (p, s) => `${p.id}:${s.id}`,
  isDone(p, s) { return !!Store.s.percorsi.done[this.stepKey(p, s)] || (s.type === "lesson" && (Store.s.grammar[s.lesson] || 0) >= (LESSON_BY_ID[s.lesson]?.quiz.length ?? Infinity)) || (s.type === "conj" && (Store.s.conjBest[s.tense] || 0) >= 6); },
  active() { return PERCORSI.find((p) => p.id === Store.s.percorsi.active) || null; },
  next(p) { return p.steps.find((s) => !this.isDone(p, s)) || null; },
  progress(p) { return p.steps.filter((s) => this.isDone(p, s)).length; },
  cardsOf(s) { if (s.type === "vocab") return (BY_CAT[s.cat] || []).slice(s.from, s.to); if (s.type === "phrases") return PHRASES.filter((x) => x.sit === s.sit); return []; },
  cardsUpTo(p, s) { const out = []; for (const st of p.steps) { if (st === s) break; out.push(...this.cardsOf(st)); } return out; },
  markDone(p, s) { Store.s.percorsi.done[this.stepKey(p, s)] = true; if (!Store.s.percorsi.active) Store.s.percorsi.active = p.id; Sync.schedule(); Store.save(); },
  start(p, s) {
    if (s.type === "vocab" || s.type === "phrases") Sess.learn({ ids: this.cardsOf(s).map((c) => c.id), title: s.title, back: `/percorsi/${p.id}`, onDone: { type: "step", path: p.id, step: s.id } });
    else if (s.type === "lesson") Router.go(`/grammatica/${s.lesson}`);
    else if (s.type === "conj") Router.go(`/grammatica/coniuga/${s.tense}`);
    else if (s.type === "check") Sess.check({ ids: this.cardsUpTo(p, s).map((c) => c.id), n: s.n, title: s.title, back: `/percorsi/${p.id}`, onDone: { type: "step", path: p.id, step: s.id } });
  },
  // Appelé quand une leçon est validée ou un temps réussi : coche l'étape correspondante
  hook(kind, value) { for (const p of PERCORSI) for (const s of p.steps) if (!this.isDone(p, s) && ((kind === "lesson" && s.type === "lesson" && s.lesson === value) || (kind === "conj" && s.type === "conj" && s.tense === value))) this.markDone(p, s); },
};
const GAMES = [["scelta", "target", "Scelta multipla", "10 questions, 4 réponses proches"], ["scrivi", "pen", "Scrivi!", "Écris le mot italien"], ["cruci", "grid", "Cruciverba", "Le curseur avance tout seul"], ["anagramma", "shuffle", "Anagramma", "Remets les lettres en ordre"], ["abbina", "link", "Abbina le coppie", "Relie mot et traduction"]];
const Menu = {
  unseenPool() {
    const unseen = (cs) => cs.filter((c) => !Store.s.progress[c.id]?.seen);
    const p = Percorsi.active(); const out = [];
    if (p) { for (const s of p.steps) { if (Percorsi.isDone(p, s)) continue; out.push(...unseen(Percorsi.cardsOf(s))); if (out.length >= 40) break; } }
    if (Store.s.lastCat) out.push(...unseen(BY_CAT[Store.s.lastCat] || []));
    if (out.length < 12) for (const c of CATEGORIES) { out.push(...unseen(BY_CAT[c.id] || []).slice(0, 6)); if (out.length >= 40) break; }
    const seen = new Set(); return out.filter((c) => !seen.has(c.id) && seen.add(c.id));
  },
  queue() { return this.unseenPool().slice(0, 40).map((c) => c.id); },
  today() {
    const k = dayKey(); if (Store.s.menu && Store.s.menu.day === k) return Store.s.menu;
    const r = seeded(dayNum(k) * 7919), due = Store.due();
    const antipasto = due.length ? { title: "Ripasso veloce", sub: `${Math.min(8, due.length)} ${plural(Math.min(8, due.length), "carte à revoir", "cartes à revoir")}`, n: Math.min(8, due.length) } : Store.seen().length ? { title: "Cartes vues au hasard", sub: "5 cartes pour réveiller la mémoire", n: 5 } : { title: "Niente da ripassare", sub: "Premier jour : rien à réviser encore", n: 0, href: "/ripasso" };
    const pool = this.unseenPool(), primoIds = pool.slice(0, 6).map((c) => c.id);
    const primoFrom = Percorsi.active() ? Percorsi.active().title : Store.s.lastCat ? CAT[Store.s.lastCat]?.label : "thèmes mélangés";
    const p = Percorsi.active(); let secondo;
    const nextLesson = (p && p.steps.find((s) => s.type === "lesson" && !Percorsi.isDone(p, s))) || null;
    const firstOpen = LESSONS.find((l) => (Store.s.grammar[l.id] || 0) < l.quiz.length);
    if (dayNum(k) % 3 === 2 || !(nextLesson || firstOpen)) { const t = TENSES.map((x) => x[0]).sort((a, b) => (Store.s.conjBest[a] || 0) - (Store.s.conjBest[b] || 0))[0]; secondo = { title: `Coniuga · ${TENSE_LABEL[t]}`, sub: `Meilleur score ${Store.s.conjBest[t] || 0} / 8`, href: `/grammatica/coniuga/${t}`, tense: t }; }
    else { const l = nextLesson ? LESSON_BY_ID[nextLesson.lesson] : firstOpen; secondo = { title: l.title, sub: l.ref, href: `/grammatica/${l.id}`, lesson: l.id }; }
    const g = GAMES[dayNum(k) % GAMES.length];
    const dolceCard = shuffleSeeded(CARDS.filter((c) => c.cat === "espressioni" || c.cat === "dialoghi"), r)[0];
    const menu = { day: k, done: {}, counts: { ripasso: 0 }, courses: [
      { id: "antipasto", name: "Antipasto", ...antipasto, action: "menu-antipasto" },
      primoIds.length ? { id: "primo", name: "Primo", title: `${primoIds.length} parole nuove`, sub: primoFrom, ids: primoIds, action: "menu-primo" } : { id: "primo", name: "Primo", title: "Tutto visto", sub: "Plus aucune carte nouvelle : place au ripasso", ids: [], href: "/ripasso" },
      { id: "secondo", name: "Secondo", ...secondo },
      { id: "contorno", name: "Contorno", title: g[2], sub: g[3], href: `/giochi/${g[0]}`, game: g[0] },
      { id: "dolce", name: "Dolce", title: dolceCard.it, sub: dolceCard.fr, card: dolceCard.id, action: "menu-dolce" },
    ] };
    if (!primoIds.length) menu.done.primo = true;
    if (!antipasto.n) menu.done.antipasto = true; // rien à réviser le premier jour : le menu commence au Primo
    Store.s.menu = menu; Store.save(); return menu;
  },
  // Le parcours suivi change : le menu est recomposé, ce qui est déjà fait aujourd'hui le reste
  rebuild() { const old = Store.s.menu; Store.s.menu = null; const m = this.today(); if (old?.day === m.day) { m.done = { ...m.done, ...old.done }; m.counts = old.counts; } Store.save(); },
  done(id) { const m = Store.s.menu; if (!m || m.day !== dayKey() || m.done[id]) return; m.done[id] = true; Store.save(); if (Object.keys(m.done).length === 5) toast("Menù del giorno terminé. Complimenti!"); },
  course(id) { const m = Store.s.menu; return m?.day === dayKey() ? m.courses.find((c) => c.id === id) : null; },
};

/* ═══════════════════════════════════════════
   9. Sessions d'exercices (reçus du jour, apprentissage, contrôle)
   ═══════════════════════════════════════════ */
const Sess = {
  rounds(cards, { n = 12, typeEvery = 2, conjItems = [] } = {}) {
    const src = shuffle(cards).slice(0, n);
    const rs = src.map((w, idx) => idx % typeEvery === 1
      ? { type: "type", w, lead: "Écris en italien", prompt: w.fr, accepted: [...acceptedAnswers(w)], display: w.it }
      : { type: "mcq", w, lead: "Comment dit-on en italien", q: w.fr, opts: Distract.options(w), a: w.id, display: w.it });
    conjItems.forEach((it, i) => { const opts = i % 2 === 0 ? Distract.conjOptions(it.id, it.body) : []; rs.push(opts.length === 4 ? { type: "mcq", lead: "Choisis la bonne forme", q: it.title, opts, a: it.id, display: it.body, conj: it.id } : { type: "type", lead: `${it.extra} — écris la forme`, prompt: it.title, accepted: String(it.body || "").split(" / ").map(norm), display: it.body, conj: it.id }); });
    return shuffle(rs).slice(0, n);
  },
  open(sess) { G.sess = { idx: 0, score: 0, answered: null, input: "", ...sess }; Router.go("/sessione"); },
  today(scope) {
    const src = (scope === "week" ? Today.sent : Today.items()).map((s) => s.item).filter(Boolean);
    const uniq = [], seen = new Set(); src.forEach((i) => { if (!seen.has(i.id)) { seen.add(i.id); uniq.push(i); } });
    if (!uniq.length) { toast("Rien à réviser pour l'instant"); return; }
    const cards = uniq.filter((i) => i.kind !== "conj").map((i) => BY_ID[i.id.replace(/^[wp]:/, "")] || { id: i.id, it: i.title, fr: i.body, ex: "", exFr: "", cat: i.kind === "phrase" ? "dialoghi" : "" });
    const conj = uniq.filter((i) => i.kind === "conj");
    this.open({ kind: "today", scope, title: scope === "week" ? "Esercizi della settimana" : "Esercizi di oggi", back: "/oggi", phase: "quiz", rounds: this.rounds(cards, { n: 12, conjItems: conj }) });
  },
  learn({ ids, title, back, onDone }) {
    const cards = ids.map((id) => BY_ID[id]).filter(Boolean);
    if (!cards.length) { toast("Rien de nouveau ici"); return; }
    this.open({ kind: "learn", title, back, onDone, phase: "cards", cards: cards.map((c) => c.id), ci: 0, flipped: false, rounds: this.rounds(cards, { n: Math.min(8, cards.length), typeEvery: 3 }) });
  },
  check({ ids, n, title, back, onDone }) {
    const cards = ids.map((id) => BY_ID[id]).filter(Boolean);
    if (cards.length < 4) { toast("Fais d'abord les étapes précédentes"); return; }
    this.open({ kind: "check", title, back, onDone, phase: "quiz", pass: 0.8, pool: cards.map((c) => c.id), n, rounds: this.rounds(cards, { n: Math.min(n, cards.length), typeEvery: 4 }) });
  },
  finish() {
    const s = G.sess; if (!s || s.finished) return; s.finished = true;
    const n = s.rounds.length, ok = n ? s.score / n >= (s.pass || 0) : true;
    s.passed = ok;
    if (s.onDone?.type === "step" && ok) { const p = PERCORSI.find((x) => x.id === s.onDone.path), st = p?.steps.find((x) => x.id === s.onDone.step); if (p && st) Percorsi.markDone(p, st); }
    if (s.onDone?.type === "menu") Menu.done(s.onDone.course);
  },
};

/* ═══════════════════════════════════════════
   9b. Spiegazioni animate — moteur pas à pas (jetons `texte^id*cls`, glissement FLIP, lecture auto)
   ═══════════════════════════════════════════ */
const Xp = {
  timer: null,
  current() { return Router.path === "/grammatica" ? EXPL[Router.params.a] : null; },
  parse(line) { return String(line).trim().split(/\s+/).map((t) => { const m = /^([^\^*]+)(?:\^([a-z0-9]{1,6}))?((?:\*[a-z]+)*)$/.exec(t); return m ? { text: m[1].replace(/_/g, " "), id: m[2] || null, cls: m[3] ? m[3].split("*").filter(Boolean) : [] } : { text: t.replace(/_/g, " "), id: null, cls: [] }; }); },
  lines(st) { return (Array.isArray(st.l) ? st.l : [st.l]).map((l) => this.parse(l)); },
  say(st) { return st.s || this.lines(st)[0].filter((t) => !t.cls.some((c) => c === "lab" || c === "fr" || c === "ko")).map((t) => t.text).join(" "); },
  dur(st) { return Math.min(7000, 2400 + st.c.length * 26); },
  token: (t, enter) => `<span class="xt ${t.cls.join(" ")}${t.text.endsWith("'") ? " el" : ""}${enter ? " in" : ""}" ${t.id ? `data-k="${t.id}"` : ""}>${esc(t.text)}</span>`,
  stageHtml(st, enter) { return this.lines(st).map((toks) => `<div class="xl">${toks.map((t) => this.token(t, enter)).join("")}</div>`).join(""); },
  restHtml(x, X, capIn) {
    const st = x.steps[X.i], n = x.steps.length, last = X.i + 1 >= n;
    return `<p class="cap ${capIn ? "in" : ""}" aria-live="polite">${esc(st.c)}</p>
      <div class="ctl"><button class="btn" data-a="xp-prev" ${X.i === 0 ? "disabled" : ""} aria-label="Étape précédente">${I.chevL}</button><button class="btn" data-a="xp-play" aria-label="${X.play ? "Pause" : "Lecture automatique"}" aria-pressed="${!!X.play}">${X.play ? I.pause : I.play}</button><div class="dots" aria-hidden="true">${x.steps.map((_, i) => `<i class="${i === X.i ? "on" : i < X.i ? "seen" : ""}"></i>`).join("")}</div>${UI.spk(this.say(st))}<button class="btn brand" data-a="xp-next" aria-label="${last ? "Recommencer" : "Étape suivante"}">${last ? I.refresh : I.chev}</button></div>`;
  },
  html(x, X) { return `<section class="xs" aria-label="Spiegazione animata"><div class="xhead"><span class="t">${esc(x.title)}</span><span id="xcount">${X.i + 1} / ${x.steps.length}</span><button type="button" class="h3btn" data-a="xp-close" aria-label="Fermer la spiegazione">${I.x}</button></div><div class="stage" id="xstage">${this.stageHtml(x.steps[X.i], X.i === 0 && !reducedMotion())}</div><div id="xrest">${this.restHtml(x, X)}</div></section>`; },
  open() { const x = this.current(); if (!x) return; G.st.xp = { i: 0, play: false }; render(); this.play(true); },
  close() { this.stop(); G.st.xp = null; render(); },
  // Passage à l'étape i : les jetons qui gardent leur id glissent, les autres entrent/sortent en fondu
  go(i, fromTimer) {
    const x = this.current(), X = G.st.xp; if (!x || !X) return this.stop();
    const n = x.steps.length; i = ((i % n) + n) % n;
    const stage = document.getElementById("xstage"), rest = document.getElementById("xrest");
    const prevStep = x.steps[X.i]; X.i = i; const st = x.steps[i];
    if (!stage || !rest) return;
    const focused = document.activeElement?.closest?.("#xrest [data-a]")?.dataset.a;
    const anim = !reducedMotion();
    const sRect = stage.getBoundingClientRect(), old = new Map();
    stage.querySelectorAll(".xt[data-k]").forEach((el) => old.set(el.dataset.k, { r: el.getBoundingClientRect(), text: el.textContent }));
    const newIds = new Set(this.lines(st).flat().map((t) => t.id).filter(Boolean));
    const ghosts = anim ? [...stage.querySelectorAll(".xt")].filter((el) => !el.dataset.k || !newIds.has(el.dataset.k)).map((el) => { const r = el.getBoundingClientRect(), g = el.cloneNode(true); g.classList.remove("in", "morph"); g.classList.add("out"); g.removeAttribute("data-k"); g.style.left = `${r.left - sRect.left}px`; g.style.top = `${r.top - sRect.top}px`; return g; }) : [];
    stage.innerHTML = this.stageHtml(st);
    if (anim) {
      stage.querySelectorAll(".xt").forEach((el) => {
        const o = el.dataset.k && old.get(el.dataset.k);
        if (!o) { el.classList.add("in"); return; }
        const r = el.getBoundingClientRect(), dx = o.r.left + o.r.width / 2 - (r.left + r.width / 2), dy = o.r.top - r.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.7,.2,1)" });
        if (o.text !== el.textContent) el.classList.add("morph");
      });
      ghosts.forEach((g) => stage.appendChild(g)); setTimeout(() => ghosts.forEach((g) => g.remove()), 320);
    }
    rest.innerHTML = this.restHtml(x, X, anim && prevStep !== st); const c = document.getElementById("xcount"); if (c) c.textContent = `${i + 1} / ${n}`;
    if (focused) rest.querySelector(`[data-a="${focused}"]:not([disabled])`)?.focus();
    if (X.play) { if (i + 1 >= n && fromTimer) { X.play = false; rest.innerHTML = this.restHtml(x, X, false); this.stop(); } else this.schedule(); }
  },
  schedule() { clearTimeout(this.timer); const x = this.current(), X = G.st.xp; if (!x || !X) return; this.timer = setTimeout(() => { if (!document.getElementById("xstage") || !G.st.xp?.play) return this.stop(); this.go(G.st.xp.i + 1, true); }, this.dur(x.steps[X.i])); },
  play(on) { const X = G.st.xp; if (!X) return; X.play = on; const x = this.current(), rest = document.getElementById("xrest"); if (x && rest) rest.innerHTML = this.restHtml(x, X, false); if (on) { if (X.i + 1 >= x.steps.length) this.go(0); else this.schedule(); } else this.stop(); },
  stop() { clearTimeout(this.timer); this.timer = null; if (G.st.xp) G.st.xp.play = false; },
};

/* ═══════════════════════════════════════════
   10. Vues
   ═══════════════════════════════════════════ */
const NAV =[["/oggi", "inbox", "Oggi"], ["/studia", "book", "Studia"], ["/ripasso", "repeat", "Ripasso"], ["/grammatica", "ruler", "Grammatica"], ["/giochi", "game", "Giochi"]];
const Views = {};

const IT_DAYS = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"], IT_MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const itDate = (d = new Date()) => `${IT_DAYS[d.getDay()]} ${d.getDate() === 1 ? "1º" : d.getDate()} ${IT_MONTHS[d.getMonth()]}`;
const NEWS = ["Menù del giorno : un seul bouton, le prochain plat", "Cartes : boutons en bas, ou glisse à droite (lo so) et à gauche", "Réglages : sauvegarde de ta progression, thème clair ou sombre", "Ouverture immédiate, même sans réseau"];
const courseVal = (c) => { const n = (k, one, many) => `${k} ${k === 1 ? one : many}`; return c.id === "antipasto" ? n(c.n, "carta", "carte") : c.id === "primo" ? n(c.ids.length, "parola", "parole") : c.id === "secondo" ? (c.tense ? "8 forme" : c.lesson ? "lezione" : "") : c.id === "contorno" ? "gioco" : "una frase"; };

Views["/oggi"] = () => {
  const st = G.st, items = Today.items(), older = Today.older(), s = Store.s.settings, perm = Push.permission();
  // Ce qui demande une action passe en bandeau ; l'état normal tient sur une ligne
  let alert = "", status = "";
  if (G.update) alert += `<div class="banner">${I.refresh}<div class="t">Une mise à jour est prête<small>Elle s'installe en rechargeant l'app.</small></div><button class="act" data-a="update-app">Recharger</button></div>`;
  if (Store.recovered) alert += `<div class="banner warn">${I.cloud}<div class="t">Progression restaurée depuis la copie d'hier<small>L'enregistrement d'aujourd'hui était illisible.</small></div></div>`;
  if (!Push.supported()) alert += Push.isIOS && !Push.standalone()
    ? `<div class="banner warn">${I.phone}<div class="t">Installe l'app pour recevoir les notifications<ol class="steps"><li>Dans Safari, touche <b>Partager</b></li><li>Choisis <b>Sur l'écran d'accueil</b>, puis Ajouter</li><li>Ouvre Impara! depuis l'icône et active les notifications ici</li></ol></div></div>`
    : `<div class="banner warn">${I.bellOff}<div class="t">Ce navigateur ne gère pas les notifications<small>Utilise Safari (iPhone) ou Chrome / Edge (ordinateur).</small></div></div>`;
  else if (perm === "denied") alert += `<div class="banner warn">${I.bellOff}<div class="t">Notifications bloquées<small>${Push.isIOS ? "Réglages → Notifications → Impara!" : "Cadenas dans la barre d'adresse → Notifications"}</small></div></div>`;
  else if (!Store.s.subscribed) alert += `<div class="banner">${I.bell}<div class="t">Reçois un mot ou une phrase toutes les ${UI.fmtInterval(s.interval_min)}<small>de ${s.start_hour}h à ${s.end_hour}h, réglable ensuite</small></div><button class="act" data-a="enable">Activer</button></div>`;
  else if (!s.enabled) alert += `<div class="banner warn">${I.bellOff}<div class="t">Notifications en pause</div><a class="act" href="#/impostazioni">Reprendre</a></div>`;
  else status = `<div class="nline">${I.bell}<span>Toutes les ${UI.fmtInterval(s.interval_min)}, de ${s.start_hour}h à ${s.end_hour}h</span><button type="button" class="link" data-a="test">Tester</button></div>`;
  const news = Store.s.seenVersion !== APP_VERSION ? `<section class="news" aria-label="Nouveautés"><b>Nouveautés de la version ${APP_VERSION}</b><ul>${NEWS.map((n) => `<li>${n}</li>`).join("")}</ul><button type="button" class="link" data-a="news-ok">Compris</button></section>` : "";

  // Menù del giorno : la carte d'une trattoria, un plat après l'autre, et un seul bouton — le prochain plat
  const m = Menu.today(), doneN = Object.keys(m.done).length, nextC = m.courses.find((c) => !m.done[c.id]);
  const tag = (c, cls, inner) => c.href ? `<a class="${cls}" href="#${c.href}">${inner}</a>` : `<button type="button" class="${cls}" data-a="${c.action}">${inner}</button>`;
  const carta = `<section class="carta" aria-label="Menù del giorno"><header><h2 class="it">Menù del giorno</h2><span>${doneN} / 5</span></header>
    <ol>${m.courses.map((c) => { const done = !!m.done[c.id], val = courseVal(c); return `<li>${tag(c, `course${done ? " done" : c === nextC ? " next" : ""}`, `<i class="c-name it">${c.name}</i><span class="c-line"><b${c.id === "dolce" ? ' class="it" lang="it"' : ""}>${esc(c.title)}</b><span class="c-dots" aria-hidden="true"></span><span class="c-val">${done ? `${I.check}<span class="sr">fait</span>` : esc(val)}</span></span>${c.sub ? `<small>${esc(c.sub)}</small>` : ""}`)}</li>`; }).join("")}</ol>
    ${nextC ? tag(nextC, "btn brand block", `${doneN ? "Continuer" : "Commencer"} · ${nextC.name}`) : `<p class="carta-end it">Menù terminato. Complimenti!</p>`}</section>`;

  const due = Store.due().length, week = Store.week();
  const stats = UI.stats([UI.stat(due, "à réviser", "/ripasso", due ? "hot" : ""), UI.stat(Store.mastered(), plural(Store.mastered(), "carte acquise", "cartes acquises"), "/progressi"), UI.stat(`${week.newCards}<small>/${Store.s.goals.newCards}</small>`, "nouvelles cette semaine", "/progressi")]);

  const itemRow = (x) => {
    const it = x.item; if (!it) return ""; const t = new Date(x.sent_at), k = it.id + x.sent_at, open = !!st.open?.[k], conj = it.kind === "conj";
    const body = conj ? `${esc(it.body)}<br><i>${esc(it.extra || "")}</i>` : `${esc(it.body)}${it.extra ? `<br><i>${esc(it.extra)}</i>` : ""}`;
    return `<div class="item"><button type="button" class="item-main" data-a="reveal" data-id="${esc(k)}" aria-expanded="${open}"><span class="k ${esc(it.kind)}"></span><span class="tx"><span class="w it" lang="it">${esc(it.title)}</span>${open ? `<span class="tr">${body}</span>` : `<span class="hint">${conj ? "Touche pour la forme" : "Touche pour la traduction"}</span>`}</span><time>${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}</time></button>${UI.spk(conj ? it.body : it.title)}</div>`;
  };
  const byDay = {}; older.forEach((x) => (byDay[dayKey(x.sent_at)] ||= []).push(x));
  const longDay = (k) => { const [y, mo, d] = k.split("-").map(Number); return new Date(y, mo - 1, d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); };
  const days = Object.keys(byDay).sort().reverse().slice(0, 7);
  const nToday = Math.min(12, new Set(items.map((x) => x.item?.id).filter(Boolean)).size);
  const received = !Store.s.subscribed ? "" : `<div>
      <div class="h3"><span>Reçus aujourd'hui</span><button type="button" class="h3btn" data-a="refresh" aria-label="Actualiser" ${Today.loading ? "disabled" : ""}>${I.refresh}</button></div>
      ${status}
      ${Today.error ? `<div class="banner warn">${I.cloud}<div class="t">${esc(Today.error)}<small>Les notifications déjà reçues restent visibles ; le reste de l'app fonctionne sans serveur.</small></div><button class="act" data-a="refresh">Réessayer</button></div>` : ""}
      ${items.length ? `<div class="list">${items.map(itemRow).join("")}</div><div class="btnrow"><button class="btn brand block" data-a="session" data-scope="today">Esercizi di oggi (${nToday})</button></div>`
        : Today.error ? "" : `<div class="list"><div class="empty">${Today.loading && !Today.at ? "Chargement…" : `${I.inbox}<br>Rien reçu pour l'instant. La prochaine notification suit ton rythme, ou touche <b>Tester</b>.`}</div></div>`}
      ${days.map((k, i) => `<details class="day" data-k="${k}" ${(st.days?.[k] ?? i === 0) ? "open" : ""}><summary><span>${esc(longDay(k))}</span><span>${byDay[k].length}</span></summary><div class="list">${byDay[k].map(itemRow).join("")}</div></details>`).join("")}
      ${days.length ? `<div class="btnrow"><button class="btn block" data-a="session" data-scope="week">Esercizi sulla settimana</button></div>` : ""}
    </div>`;
  return `<p class="date it" lang="it">${itDate()}</p>${news}${alert}<div class="cols${received ? "" : " one"}"><div>${carta}${stats}</div>${received}</div>`;
};

Views["/sessione"] = () => {
  const s = G.sess;
  if (!s) return `<div class="empty">${I.inbox}<br>Aucune session en cours.</div><div class="btnrow"><a class="btn brand block" href="#/oggi">Oggi</a></div>`;
  const n = s.rounds.length;
  if (s.phase === "cards") {
    const w = BY_ID[s.cards[s.ci]];
    return `<div class="fill">${UI.meta(esc(s.title), `${s.ci + 1} / ${s.cards.length}`)}${UI.prog(s.ci / s.cards.length * 100)}
      ${UI.flash({ id: w.id, flipped: s.flipped, lv: w.lv, it: w.it, ex: w.ex, fr: w.fr, exFr: w.exFr, action: "sess-flip" })}
      <div class="under"><span>Carte ${Store.boxLabel(w.id)}</span><span>${esc(CAT[w.cat]?.label || "")}</span></div>
      ${UI.dock(`<button class="btn brand block" data-a="sess-seen" data-enter="1" data-kbd="ArrowRight">${s.ci + 1 >= s.cards.length ? "Passer au quiz" : "Vu, suivante"}</button>`)}</div>`;
  }
  if (s.idx >= n) {
    Sess.finish();
    const title = s.kind === "check" ? (s.passed ? "Controllo superato" : "Non ancora") : s.score === n ? "Perfetto!" : s.score >= n * .6 ? "Molto bene" : "Si impara ripetendo";
    const sub = s.kind === "check" ? (s.passed ? "Étape validée." : "Il faut 80 % : revois les cartes et réessaie.") : s.onDone?.type === "step" ? "Étape validée." : "Les bonnes réponses font avancer tes cartes.";
    const again = s.kind === "today" ? `<button class="btn brand" data-a="session" data-scope="${s.scope}">Encore</button>` : s.kind === "check" && !s.passed ? `<button class="btn brand" data-a="sess-retry">Réessayer</button>` : "";
    return UI.result(UI.big(s.score, n), title, sub, `${again}<button class="btn ${again ? "" : "brand"}" data-a="sess-close" data-enter="1">Terminer</button>`);
  }
  const r = s.rounds[s.idx], a = s.answered;
  const body = r.type === "mcq" ? `<div class="q sans">${esc(r.q)}</div>${UI.opts(r.opts, "s-mcq", a && { picked: a.pick, correct: r.a })}` : `<div class="q sans">${esc(r.prompt)}</div>${UI.tin(s.input, a)}${a ? "" : `<div class="btnrow">${UI.verify("s-verify")}</div>`}`;
  const fb = a ? UI.fb(a.ok, `${a.ok ? "Esatto." : `Peccato — la réponse : <b lang="it">${esc(r.display)}</b>`}${UI.exLine(r.w)} ${UI.spk(r.display)}`) : "";
  return `<div class="fill">${UI.meta(`${esc(s.title)} · ${s.idx + 1} / ${n}`, `${s.score} pt`)}${UI.prog(s.idx / n * 100)}<p class="lead">${esc(r.lead)}</p>${body}${fb}${a ? UI.dock(UI.next("s-next", s.idx + 1 >= n)) : ""}</div>`;
};

Views["/studia"] = () => {
  const cat = Router.params.a, c = CAT[cat];
  if (!c) {
    const p = Percorsi.active();
    const hero = p ? `<a class="hero" href="#/percorsi/${p.id}"><span class="ic">${I.route}</span><span><b>${esc(p.title)}</b><small>Étape ${Math.min(Percorsi.progress(p) + 1, p.steps.length)} / ${p.steps.length} · ${esc(Percorsi.next(p)?.title || "terminé")}</small></span>${I.chev}</a>` : `<a class="hero" href="#/percorsi"><span class="ic">${I.route}</span><span><b>Percorsi</b><small>Des parcours guidés : Al lavoro, Vivere a Torino, Calcio, Verso il B1…</small></span>${I.chev}</a>`;
    return `${hero}<div class="h3"><span>Thèmes</span><span>${CARDS.length} cartes</span></div><div class="list">${CATEGORIES.map((c) => { const ws = BY_CAT[c.id] || []; const done = ws.filter((w) => (Store.s.progress[w.id]?.box || 0) >= 4).length, seen = ws.filter((w) => Store.s.progress[w.id]?.seen).length; return UI.row({ href: `/studia/${c.id}`, ic: UI.ring(ws.length ? done / ws.length : 0), title: esc(c.label), sub: esc(c.desc), end: `${seen}/${ws.length}` }); }).join("")}</div>`;
  }
  const ws = BY_CAT[cat] || []; if (!ws.length) return `<div class="empty">Aucune carte dans ce thème.</div>`;
  if (Store.s.lastCat !== cat) { Store.s.lastCat = cat; Store.save(); Sync.schedule(); }
  const i = (Store.s.pos[cat] || 0) % ws.length, w = ws[i], unseen = ws.filter((x) => !Store.s.progress[x.id]?.seen).length;
  return `<div class="fill">${UI.meta(`${esc(c.label)}${w.unit ? ` · Unità ${w.unit}` : w.sit ? ` · ${esc(w.sit)}` : ""}`, `${i + 1} / ${ws.length}`)}
    ${UI.flash({ id: w.id, flipped: G.st.flipped, lv: w.lv, it: w.it, ex: w.ex, fr: w.fr, exFr: w.exFr, action: "flip" })}
    <div class="under"><span>Carte ${Store.boxLabel(w.id)}</span>${unseen ? `<button type="button" class="link" data-a="learn-cat" data-cat="${cat}">${I.bolt}Apprendre ${Math.min(8, unseen)} ${plural(Math.min(8, unseen), "nouvelle", "nouvelles")}</button>` : `<span>Tout le thème est vu</span>`}</div>
    ${UI.dock(`<div class="btnrow"><button class="btn" data-a="grade" data-id="${w.id}" data-k="0" data-kbd="ArrowLeft">Non lo so</button><button class="btn ok" data-a="grade" data-id="${w.id}" data-k="1" data-kbd="ArrowRight">Lo so</button></div>`)}</div>`;
};

Views["/percorsi"] = () => {
  const id = Router.params.a, p = PERCORSI.find((x) => x.id === id);
  if (!p) return `<p class="p" style="margin:6px 0 10px">Un parcours = des étapes dans l'ordre : vocabulaire, phrases, leçons, contrôles. Le parcours suivi guide le Menù del giorno et les notifications.</p><div class="list">${PERCORSI.map((p) => { const done = Percorsi.progress(p), active = Store.s.percorsi.active === p.id; return UI.row({ href: `/percorsi/${p.id}`, ic: UI.ring(done / p.steps.length, p.color === "brand" ? "brand" : ""), title: esc(p.title) + (active ? ` <span class="chip">suivi</span>` : ""), sub: esc(p.desc), end: `${done}/${p.steps.length}` }); }).join("")}</div>`;
  const active = Store.s.percorsi.active === p.id, next = Percorsi.next(p);
  const icon = (s) => ({ vocab: I.book, phrases: I.inbox, lesson: I.ruler, conj: I.bolt, check: I.star })[s.type];
  const typeLabel = (s) => ({ vocab: `${s.to - s.from} mots`, phrases: "phrases", lesson: "leçon", conj: "conjugaison", check: `contrôle · ${s.n} questions` })[s.type];
  return `<div class="hero static"><span class="ic">${I.route}</span><span><b>${esc(p.title)}</b><small>${esc(p.desc)} · ${Percorsi.progress(p)}/${p.steps.length}</small></span></div>
    ${UI.prog(Percorsi.progress(p) / p.steps.length * 100)}
    <div class="btnrow">${active ? `<button class="btn" data-a="path-deactivate">Ne plus suivre</button>` : `<button class="btn" data-a="path-activate" data-id="${p.id}">Suivre ce parcours</button>`}${next ? `<button class="btn brand" data-a="step" data-path="${p.id}" data-step="${next.id}">${Percorsi.progress(p) ? "Continuer" : "Commencer"}</button>` : ""}</div>
    <div class="h3"><span>Étapes</span></div>
    <div class="list">${p.steps.map((s, i) => { const done = Percorsi.isDone(p, s), cur = s === next; return `<button type="button" class="row step ${done ? "done" : ""} ${cur ? "cur" : ""}" data-a="step" data-path="${p.id}" data-step="${s.id}"><span class="num">${done ? I.check : i + 1}</span><span class="ic ${done ? "ok" : cur ? "" : "muted"}">${icon(s)}</span><span class="tx"><b>${esc(s.title)}</b><small>${typeLabel(s)}</small></span><span class="end">${I.chev}</span></button>`; }).join("")}</div>`;
};

Views["/ripasso"] = () => {
  const st = G.st; st.queue ??= shuffle(Store.due()).map((w) => w.id);
  if (!st.queue.length) return `<div class="result">${I.check.replace('class="i"', 'class="i" style="width:34px;height:34px;color:var(--ok)"')}<div class="t">${st.done ? "File terminée" : "Rien à réviser pour le moment"}</div><div class="s">Les cartes reviennent ici au bon moment : 1, 3, 7 puis 14 jours.</div></div><div class="btnrow"><a class="btn brand" href="#/grammatica">Grammatica</a><a class="btn" href="#/giochi">Giochi</a></div>`;
  const w = BY_ID[st.queue[0]];
  return `<div class="fill">${UI.meta("Ripasso", `${st.queue.length} ${plural(st.queue.length, "carte", "cartes")}`)}
    ${UI.flash({ id: w.id, flipped: st.flipped, lv: w.lv, it: w.it, ex: w.ex, fr: w.fr, exFr: w.exFr, action: "rflip" })}
    <div class="under"><span>Carte ${Store.boxLabel(w.id)}</span><span>${esc(CAT[w.cat]?.label || "")}</span></div>
    ${UI.dock(`<div class="btnrow"><button class="btn" data-a="rgrade" data-k="0" data-kbd="ArrowLeft">Non lo so</button><button class="btn ok" data-a="rgrade" data-k="1" data-kbd="ArrowRight">Lo so</button></div>`)}</div>`;
};

Views["/grammatica"] = () => {
  const id = Router.params.a, lesson = LESSONS.find((l) => l.id === id);
  if (id === "coniuga") return Views.coniuga();
  if (lesson) return Views.lesson(lesson);
  const status = (l) => (Store.s.grammar[l.id] || 0) >= l.quiz.length ? { ic: I.done, cls: "ok" } : Store.s.grammar[l.id] ? { ic: I.half, cls: "gold" } : { ic: I.circle, cls: "muted" };
  const rows = (track) => `<div class="list">${LESSONS.filter((l) => l.track === track).map((l) => { const s = status(l); return UI.row({ href: `/grammatica/${l.id}`, ic: s.ic, icCls: s.cls, title: esc(l.title), sub: esc(l.ref) }); }).join("")}</div>`;
  const count = (track) => LESSONS.filter((l) => l.track === track).length;
  const sec = (track, label) => `<div class="h3"><span>${label}</span><span>${Store.lessonsDone(track)}/${count(track)}</span></div>${rows(track)}`;
  return `<a class="hero" href="#/grammatica/coniuga"><span class="ic">${I.dumbbell}</span><span><b>Coniuga!</b><small>${TENSES.map((t) => t[1]).join(", ").toLowerCase()}</small></span>${I.chev}</a>
    ${sec("ripasso", "Ripasso del libro (A1)")}${sec("avanti", "Avanti (A2 → B1)")}${sec("b1", "Verso il B1")}`;
};
Views.lesson = (l) => {
  const L = G.st; L.phase ??= "read"; L.q ??= 0; L.score ??= 0; L.answered ??= null;
  const n = l.quiz.length, best = Store.s.grammar[l.id] || 0;
  if (L.phase === "done") return UI.result(UI.big(L.score, n), L.score === n ? "Lezione superata" : L.score >= n - 1 ? "Quasi perfetto" : "Rileggi e riprova", L.score === n ? "Leçon validée." : "Un sans-faute valide la leçon.", `<button class="btn" data-a="l-read">Relire</button><button class="btn brand" data-a="l-quiz">Refaire le quiz</button>`);
  if (L.phase === "quiz") {
    const q = l.quiz[L.q], a = L.answered, opts = (L.order?.[L.q] || q.opts.map((_, i) => i)).map((i) => ({ id: String(i), label: q.opts[i] }));
    return `<div class="fill">${UI.meta(esc(l.title), `${L.q + 1} / ${n}`)}${UI.prog(L.q / n * 100)}<div class="q" lang="it">${esc(q.q)}</div>
      ${UI.opts(opts, "l-ans", a !== null && { picked: String(a), correct: String(q.a) })}
      ${a !== null ? UI.fb(a === q.a, `${a === q.a ? "Esatto. " : "Peccato. "}${esc(q.why)}`) + UI.dock(UI.next("l-next", L.q + 1 >= n)) : ""}</div>`;
  }
  const x = EXPL[l.id], X = L.xp;
  const explainer = !x ? "" : X ? Xp.html(x, X) : `<button type="button" class="xbtn" data-a="xp-open"><span class="ic">${I.sparkle}</span><span><b>Spiegazione animata</b><small>${x.steps.length} étapes · ${esc(x.title)}</small></span><span class="end">${I.play}</span></button>`;
  return `<div class="lesson">${UI.meta(esc(l.ref), best >= n ? `<span style="color:var(--ok)">Validée</span>` : `${best} / ${n}`)}<h2 class="h2">${esc(l.title)}</h2><p>${esc(l.intro)}</p>${explainer}
    ${l.tables.map((t) => `<div class="gscroll"><table class="gtab"><thead><tr>${t.h.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${t.r.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`).join("")}
    ${l.exs.map((e) => `<div class="gex"><span class="it" lang="it">${esc(e.it)}</span>${UI.spk(e.it, "inline")}<small>${esc(e.fr)}</small></div>`).join("")}
    <div class="btnrow"><button class="btn brand block" data-a="l-quiz">Mini-quiz (${n} questions)</button></div></div>`;
};
function startConiuga(t) {
  const rs = t === "passato"
    ? shuffle(PASSATO.flatMap((v) => [0, 1, 2, 3, 4, 5].map((p) => ({ v, p })))).slice(0, 8).map(({ v, p }) => { const f = passatoForms(v, p); return { prompt: v.inf, fr: VERB_FR[v.inf], person: PERSONS[p], display: f.display, accepted: f.accepted.map(norm) }; })
    : shuffle(Object.entries(CONJ[t].verbs).flatMap(([inf, forms]) => forms.map((f, p) => ({ inf, f, p })).filter((x) => x.f !== "—"))).slice(0, 8).map(({ inf, f, p }) => ({ prompt: inf, fr: VERB_FR[inf], person: t === "imperativo" && p === 2 ? "Lei" : PERSONS[p], display: f, accepted: f.split(" / ").map(norm) }));
  G.st.conj = { tense: t, rounds: rs, idx: 0, input: "", result: null, score: 0, finished: false };
}
Views.coniuga = () => {
  const C = G.st.conj, want = Router.params.b;
  if (!C && want && Object.hasOwn(TENSE_LABEL, want)) { startConiuga(want); return Views.coniuga(); }
  if (!C) return `<div class="h3"><span>Choisis un temps</span></div><div class="list">${TENSES.map(([id, label]) => UI.row({ a: "c-start", data: `data-t="${id}"`, ic: UI.ring((Store.s.conjBest[id] || 0) / 8), title: label, sub: `Meilleur score ${Store.s.conjBest[id] || 0} / 8` })).join("")}</div><p class="p" style="margin-top:12px">Un verbe et une personne : écris la forme. Les accents sont pardonnés, « vai / va' » accepte les deux.</p>`;
  const label = TENSE_LABEL[C.tense], n = C.rounds.length;
  if (C.finished) return UI.result(UI.big(C.score, n), C.score >= 7 ? "Coniugatore nato" : C.score >= 4 ? "Molto bene" : "La pratica rende perfetti", `${label} — meilleur score ${Store.s.conjBest[C.tense] || 0} / ${n}${C.step ? " · étape validée" : ""}`, `<button class="btn brand" data-a="c-start" data-t="${C.tense}">Encore</button><button class="btn" data-a="c-menu">Autre temps</button>`);
  const r = C.rounds[C.idx];
  return `<div class="fill">${UI.meta(label, `${C.idx + 1} / ${n} · ${C.score} pt`)}${UI.prog(C.idx / n * 100)}
    <div class="q" lang="it">${esc(r.prompt)} <span class="gloss" lang="fr">${esc(r.fr || "")}</span></div><p class="lead tight">à la personne <b lang="it">${esc(r.person)}</b></p>
    ${UI.tin(C.input, C.result, "Scrivi la forma")}
    ${C.result ? UI.fb(C.result.ok, `${C.result.ok ? "Perfetto." : `La réponse : <b lang="it">${esc(r.display)}</b>`} ${UI.spk(r.display)}`) + UI.dock(UI.next("c-next", C.idx + 1 >= n)) : `<div class="btnrow">${UI.verify("c-check")}</div>`}</div>`;
};

Views["/giochi"] = () => {
  const g = Router.params.a, map = { scelta: Views.scelta, scrivi: Views.scrivi, cruci: Views.cruci, anagramma: Views.anagramma, abbina: Views.abbina };
  if (Object.hasOwn(map, g)) return map[g]();
  return `<div class="h3"><span>Cinq jeux, du français vers l'italien</span></div><div class="grid2">${GAMES.map(([id, ic, t, d]) => `<a class="gtile" href="#/giochi/${id}"><span class="ic">${I[ic]}</span><span><b>${t}</b><small>${d}</small></span></a>`).join("")}</div><p class="p" style="margin-top:12px">Les bonnes réponses comptent dans la répétition espacée.</p>`;
};
Views.scelta = () => {
  const S = G.st.s ??= { qs: shuffle(WORDS).slice(0, 10).map((w) => ({ w, opts: Distract.options(w) })), idx: 0, score: 0, ans: null, fin: false };
  if (S.fin) return UI.result(UI.big(S.score, 10), S.score >= 8 ? "Eccellente" : S.score >= 5 ? "Bene" : "Coraggio", `Meilleur score ${Store.s.stats.bestQuiz || 0} / 10`, `<button class="btn brand" data-a="g-again">Encore</button><a class="btn" href="#/giochi">Giochi</a>`);
  const q = S.qs[S.idx], a = S.ans;
  return `<div class="fill">${UI.meta(`Domanda ${S.idx + 1} / 10`, `${S.score} pt`)}${UI.prog(S.idx * 10)}<p class="lead">Comment dit-on en italien</p><div class="q sans">${esc(q.w.fr)}</div>
    ${UI.opts(q.opts, "sc-ans", a && { picked: a.id, correct: q.w.id })}
    ${a ? UI.fb(a.ok, `${a.ok ? "Bravissimo." : `Peccato — c'était <b>${esc(q.w.it)}</b>.`}${UI.exLine(q.w)} ${UI.spk(q.w.it)}`) + UI.dock(UI.next("sc-next", S.idx + 1 >= 10)) : ""}</div>`;
};
Views.scrivi = () => {
  const S = G.st.w ??= { qs: shuffle(WORDS).slice(0, 8), idx: 0, input: "", res: null, score: 0, hint: false, fin: false };
  if (S.fin) return UI.result(UI.big(S.score, 8), S.score >= 7 ? "Da madrelingua" : S.score >= 4 ? "Molto bene" : "Si impara scrivendo", "", `<button class="btn brand" data-a="g-again">Encore</button><a class="btn" href="#/giochi">Giochi</a>`);
  const w = S.qs[S.idx], t = w.it.replace(/[!?.]/g, "").trim(), hint = t[0] + " " + t.slice(1).replace(/\p{L}/gu, "_").split("").join(" ");
  return `<div class="fill">${UI.meta(`Parola ${S.idx + 1} / 8`, `${S.score} pt`)}${UI.prog(S.idx * 12.5)}<p class="lead">Écris en italien</p><div class="q sans">${esc(w.fr)}</div>
    ${UI.tin(S.input, S.res)}
    ${S.hint && !S.res ? `<p class="lead hintline" lang="it">${esc(hint)}</p>` : ""}
    ${S.res ? UI.fb(S.res.ok, `${S.res.ok ? "Perfetto." : `La réponse : <b lang="it">${esc(w.it)}</b>`}${UI.exLine(w)} ${UI.spk(w.it)}`) + UI.dock(UI.next("wr-next", S.idx + 1 >= 8)) : `<div class="btnrow"><button class="btn" data-a="wr-hint">Indice</button>${UI.verify("wr-check", false)}</div>`}</div>`;
};
// Cruciverba
let SIMPLE_POOL_ = null; // mots simples pour les grilles et anagrammes, calculés au premier jeu
const simplePool = () => SIMPLE_POOL_ ||= WORDS.map((w) => { let t = w.it.toLowerCase().replace(/[!?.]/g, "").trim().replace(/^(l')/, "").replace(/^(il|la|lo|le|i|gli|un|una|uno) /, ""); if (!/^[a-zà-ù]+$/.test(t)) return null; const word = stripAccents(t).toUpperCase(); if (word.length < 4 || word.length > 11) return null; return { id: w.id, word, display: t, clue: shortClue(w.fr) }; }).filter(Boolean);
function buildCrosswordOnce() {
  const pool = shuffle(simplePool()).slice(0, 60), grid = {}, placed = [];
  const put = (w, r, c, dir) => { for (let i = 0; i < w.word.length; i++) grid[dir === "A" ? `${r},${c + i}` : `${r + i},${c}`] = w.word[i]; placed.push({ ...w, r, c, dir }); };
  const bounds = () => { const ks = Object.keys(grid).map((k) => k.split(",").map(Number)); return { r0: Math.min(...ks.map((k) => k[0])), r1: Math.max(...ks.map((k) => k[0])), c0: Math.min(...ks.map((k) => k[1])), c1: Math.max(...ks.map((k) => k[1])) }; };
  const canPlace = (word, r, c, dir) => { const b = bounds(); const rEnd = dir === "A" ? r : r + word.length - 1, cEnd = dir === "A" ? c + word.length - 1 : c; if (Math.max(b.c1, cEnd) - Math.min(b.c0, c) + 1 > 11 || Math.max(b.r1, rEnd) - Math.min(b.r0, r) + 1 > 12) return false; let inter = 0; for (let i = 0; i < word.length; i++) { const rr = dir === "A" ? r : r + i, cc = dir === "A" ? c + i : c, cur = grid[`${rr},${cc}`]; if (cur) { if (cur !== word[i]) return false; inter++; } else { if (dir === "A" && (grid[`${rr - 1},${cc}`] || grid[`${rr + 1},${cc}`])) return false; if (dir === "D" && (grid[`${rr},${cc - 1}`] || grid[`${rr},${cc + 1}`])) return false; } } if (dir === "A" && (grid[`${r},${c - 1}`] || grid[`${r},${c + word.length}`])) return false; if (dir === "D" && (grid[`${r - 1},${c}`] || grid[`${r + word.length},${c}`])) return false; return inter > 0; };
  put(pool[0], 0, 0, "A");
  for (const w of pool.slice(1)) { if (placed.length >= 8) break; let done = false; for (const key of shuffle(Object.keys(grid))) { const [r, c] = key.split(",").map(Number), ch = grid[key]; for (let i = 0; i < w.word.length && !done; i++) { if (w.word[i] !== ch) continue; if (canPlace(w.word, r - i, c, "D")) { put(w, r - i, c, "D"); done = true; } else if (canPlace(w.word, r, c - i, "A")) { put(w, r, c - i, "A"); done = true; } } if (done) break; } }
  const ks = Object.keys(grid).map((k) => k.split(",").map(Number)); const minR = Math.min(...ks.map((k) => k[0])), minC = Math.min(...ks.map((k) => k[1])), maxR = Math.max(...ks.map((k) => k[0])), maxC = Math.max(...ks.map((k) => k[1]));
  const shifted = placed.map((p) => ({ ...p, r: p.r - minR, c: p.c - minC })).sort((a, b) => a.r - b.r || a.c - b.c); let num = 0; const numAt = {}; shifted.forEach((p) => { const k = `${p.r},${p.c}`; if (!numAt[k]) numAt[k] = ++num; p.num = numAt[k]; });
  const solution = {}; shifted.forEach((p) => { for (let i = 0; i < p.word.length; i++) solution[p.dir === "A" ? `${p.r},${p.c + i}` : `${p.r + i},${p.c}`] = p.word[i]; });
  return { rows: maxR - minR + 1, cols: maxC - minC + 1, solution, numAt, across: shifted.filter((p) => p.dir === "A").sort((a, b) => a.num - b.num), down: shifted.filter((p) => p.dir === "D").sort((a, b) => a.num - b.num) };
}
function buildCrossword() { let best = null; for (let i = 0; i < 12; i++) { const cw = buildCrosswordOnce(), n = cw.across.length + cw.down.length; if (!best || n > best.n) best = { cw, n }; if (n >= 7) break; } return best.cw; }
const cellsOf = (p) => Array.from({ length: p.word.length }, (_, i) => p.dir === "A" ? `${p.r},${p.c + i}` : `${p.r + i},${p.c}`);
const Cw = {
  get C() { return G.st.c; },
  entries() { return [...this.C.cw.across, ...this.C.cw.down]; },
  active() { const a = this.C.active; return a ? this.entries().find((p) => p.id === a.id && p.dir === a.dir) : null; },
  entryFor(key) { const act = this.active(); if (act && cellsOf(act).includes(key)) return act; const here = this.entries().filter((p) => cellsOf(p).includes(key)); return here.find((p) => p.dir === "A") || here[0]; },
  cellClass(key, actCells) { const C = this.C; if (C.revealed) return "right"; if (C.checked) return stripAccents((C.cells[key] || "").toUpperCase()) === C.cw.solution[key] ? "right" : "wrong"; return actCells.has(key) ? "act" : ""; },
  focus(key) { this.C.focus = key; const el = app.querySelector(`.cell input[data-key="${key}"]`); if (el) { el.focus(); try { el.select(); } catch (e) {} } },
  paint() { const C = this.C, act = this.active(), cells = new Set(act ? cellsOf(act) : []); app.querySelectorAll(".cell input").forEach((el) => { const k = el.dataset.key; if (el.value !== (C.cells[k] || "")) el.value = C.cells[k] || ""; el.className = this.cellClass(k, cells); }); app.querySelectorAll(".clue").forEach((b) => b.classList.toggle("on", !!act && b.dataset.id === act.id && b.dataset.dir === act.dir)); },
  input(key, raw) {
    const C = this.C, v = raw.replace(/[^\p{L}]/gu, "").slice(-1).toUpperCase(), wasChecked = C.checked || C.revealed; C.cells[key] = v; C.checked = false; C.revealed = false;
    if (wasChecked) { this.C.focus = key; render(); }
    if (!v) { this.paint(); return; }
    const p = this.entryFor(key); if (!p) { this.paint(); return; }
    const ks = cellsOf(p), i = ks.indexOf(key); if (i < ks.length - 1) { this.paint(); this.focus(ks[i + 1]); return; }
    const E = this.entries(), idx = E.findIndex((x) => x.id === p.id && x.dir === p.dir);
    for (let j = 1; j <= E.length; j++) { const q = E[(idx + j) % E.length]; const empty = cellsOf(q).find((k) => !(C.cells[k] || "").length); if (empty) { C.active = { id: q.id, dir: q.dir }; this.paint(); this.focus(empty); return; } }
    this.paint();
  },
};
Views.cruci = () => {
  const C = G.st.c ??= { cw: buildCrossword(), cells: {}, checked: false, revealed: false, active: null, focus: null, graded: new Set() };
  const cw = C.cw, act = Cw.active(), actCells = new Set(act ? cellsOf(act) : []);
  const cs = Math.max(22, Math.min(40, Math.floor((Math.min(app.querySelector(".main")?.clientWidth || window.innerWidth, 640) - 30 - (cw.cols - 1) * 3) / cw.cols)));
  const allOk = C.checked && Object.keys(cw.solution).every((k) => stripAccents((C.cells[k] || "").toUpperCase()) === cw.solution[k]);
  let grid = "";
  for (let r = 0; r < cw.rows; r++) for (let c = 0; c < cw.cols; c++) { const key = `${r},${c}`; if (!cw.solution[key]) { grid += `<div class="cell"></div>`; continue; } grid += `<div class="cell">${cw.numAt[key] ? `<span class="n">${cw.numAt[key]}</span>` : ""}<input class="${Cw.cellClass(key, actCells)}" data-key="${key}" maxlength="2" value="${esc(C.cells[key] || "")}" autocapitalize="characters" autocorrect="off" spellcheck="false" aria-label="Case ${r + 1}-${c + 1}"></div>`; }
  const clue = (p) => `<button class="clue ${act && act.id === p.id && act.dir === p.dir ? "on" : ""}" data-a="cw-clue" data-id="${p.id}" data-dir="${p.dir}"><b>${p.num}</b>${esc(p.clue)} <span style="color:var(--muted)">(${p.word.length})</span></button>`;
  return `<p class="p" style="margin:4px 0 6px">Touche une définition : le curseur se place, puis avance à chaque lettre. Double-touche une case croisée pour changer de sens.</p>
    <div class="cwscroll"><div class="cw" style="grid-template-columns:repeat(${cw.cols},var(--cs));--cs:${cs}px">${grid}</div></div>
    <div class="clues"><div><h4>Orizzontali</h4>${cw.across.map(clue).join("")}</div><div><h4>Verticali</h4>${cw.down.map(clue).join("")}</div></div>
    ${C.checked ? UI.fb(allOk, allOk ? (C.cheated ? "Grille complète, avec l'aide de la solution." : "Cruciverba perfetto.") : "Les cases rouges sont à corriger.") : ""}
    <div class="btnrow"><button class="btn brand" data-a="cw-verify">Vérifier</button><button class="btn" data-a="cw-reveal">${I.eye} Solution</button><button class="btn" data-a="cw-new">Nouvelle grille</button></div>`;
};
function anaRound(A) { const pool = simplePool().filter((p) => p.word.length <= 9 && !A.used.has(p.id)); const w = pick(pool.length ? pool : simplePool()); let letters = shuffle(w.word.split("")); if (letters.join("") === w.word) letters.reverse(); A.w = w; A.letters = letters.map((ch) => ({ ch, used: false })); A.picked = []; A.status = null; }
Views.anagramma = () => {
  const A = G.st.a ??= (() => { const a = { used: new Set(), count: 1, score: 0, fin: false }; anaRound(a); return a; })();
  if (A.fin) return UI.result(UI.big(A.score, 8), A.score >= 7 ? "Maestro delle lettere" : A.score >= 4 ? "Bene" : "Ci si allena", "", `<button class="btn brand" data-a="g-again">Encore</button><a class="btn" href="#/giochi">Giochi</a>`);
  const built = A.picked.map((i) => A.letters[i].ch).join(""), locked = A.status === "ok" || A.status === "rev";
  return `<div class="fill">${UI.meta(`Anagramma ${A.count} / 8`, `${A.score} pt`)}${UI.prog((A.count - 1) * 12.5)}<p class="lead">Indice</p><div class="q sans">${esc(A.w.clue)}</div>
    <div class="slots">${A.w.word.split("").map((_, i) => `<span class="slot ${A.status === "ok" ? "ok" : A.status === "ko" ? "ko" : ""}">${A.status === "rev" ? A.w.word[i] : (built[i] || "")}</span>`).join("")}</div>
    <div class="letters">${A.letters.map((l, i) => `<button class="lb" data-a="an-pick" data-i="${i}" ${l.used || locked ? "disabled" : ""}>${l.ch}</button>`).join("")}</div>
    ${A.status === "ok" ? UI.fb(true, `Perfetto — <b>${esc(A.w.display)}</b><br><span class="it">${esc(BY_ID[A.w.id]?.ex || "")}</span>`) : A.status === "ko" ? UI.fb(false, "Ce n'est pas ça. Corrige avec la flèche.") : A.status === "rev" ? `<div class="fb">C'était <b>${esc(A.w.display)}</b>.</div>` : ""}
    ${locked ? UI.dock(UI.next("an-next", A.count >= 8)) : `<div class="btnrow"><button class="btn" data-a="an-undo" aria-label="Effacer la dernière lettre">${I.undo}</button><button class="btn" data-a="an-clear">Effacer</button><button class="btn" data-a="an-reveal">Solution</button></div>`}</div>`;
};
// Jamais deux étiquettes françaises identiques dans une manche (il casello / il pedaggio = « le péage »)
function abbinaRound(prev) { const seen = new Set(), ws = shuffle(CARDS).filter((w) => { const k = norm(shortClue(w.fr)); return !seen.has(k) && seen.add(k); }).slice(0, 6); return { left: shuffle(ws.map((w) => ({ id: w.id, label: w.it }))), right: shuffle(ws.map((w) => ({ id: w.id, label: shortClue(w.fr) }))), selL: null, selR: null, matched: new Set(), err: null, tries: 0, round: (prev?.round || 0) + 1 }; }
Views.abbina = () => {
  const B = G.st.b ??= abbinaRound(); const done = B.matched.size === 6;
  const cls = (side, id) => { let c = "pb"; if (side === "l") c += " it"; if (B.matched.has(id)) c += " done"; else if (B.err && B.err[side] === id) c += " err"; else if ((side === "l" ? B.selL : B.selR) === id) c += " sel"; return c; };
  return `${UI.meta(`Manche ${B.round}`, `${B.matched.size} / 6 · ${B.tries} ${plural(B.tries, "essai", "essais")}`)}${UI.prog(B.matched.size / 6 * 100)}<p class="lead" style="margin-bottom:10px">Touche un mot italien puis sa traduction</p>
    <div class="pairs"><div class="pcol">${B.left.map((o) => `<button class="${cls("l", o.id)}" data-a="ab-l" data-id="${o.id}" ${B.matched.has(o.id) ? "disabled" : ""}>${esc(o.label)}</button>`).join("")}</div><div class="pcol">${B.right.map((o) => `<button class="${cls("r", o.id)}" data-a="ab-r" data-id="${o.id}" ${B.matched.has(o.id) ? "disabled" : ""}>${esc(o.label)}</button>`).join("")}</div></div>
    ${done ? UI.fb(true, `Tutto abbinato${B.tries === 6 ? ", sans aucune erreur." : ` en ${B.tries} essais.`}`) + `<div class="btnrow"><button class="btn brand" data-a="ab-new">Encore</button><a class="btn" href="#/giochi">Giochi</a></div>` : ""}`;
};

/* Progressi — tableau de bord vivant : Io (progression locale) · Notifiche (serveur) · Contenuto (carte du contenu) */
const KIND_SERIES = [{ key: "word", label: "Mots", color: "var(--c2)" }, { key: "phrase", label: "Phrases", color: "var(--c1)" }, { key: "conj", label: "Verbes", color: "var(--c3)" }];
const WHY_LABEL = { ripasso: "Cartes faibles", percorso: "Parcours suivi", random: "Au hasard" }, WHY_COLOR = { ripasso: "var(--c1)", percorso: "var(--c2)", random: "var(--c4)" };
const animOnce = (tab) => { G.st.animDone ??= {}; if (G.st.animDone[tab]) return ""; setTimeout(() => { if (G.st.animDone) G.st.animDone[tab] = true; }, 900); return "anim"; };
const ContentMap = {
  _c: null,
  get() {
    if (this._c) return this._c;
    const wordCats = CATEGORIES.filter((c) => WORDS.some((w) => w.cat === c.id));
    const byLevel = (ws) => ({ A1: ws.filter((w) => w.lv === "A1").length, A2: ws.filter((w) => w.lv === "A2").length, B1: ws.filter((w) => w.lv === "B1").length });
    const infs = Object.keys(CONJ.presente.verbs), end = (inf) => inf.endsWith("are") ? "-are" : inf.endsWith("ere") ? "-ere" : inf.endsWith("ire") ? "-ire" : "autres";
    const endings = {}; infs.forEach((i) => { endings[end(i)] = (endings[end(i)] || 0) + 1; });
    const aux = { avere: 0, essere: 0, riflessivo: 0 }; PASSATO.forEach((v) => { aux[v.aux === "avere" ? "avere" : v.aux === "essere" ? "essere" : "riflessivo"]++; });
    const sits = {}; PHRASES.filter((p) => p.cat === "dialoghi").forEach((p) => { sits[p.sit] = (sits[p.sit] || 0) + 1; });
    const units = Array.from({ length: 12 }, (_, i) => PHRASES.filter((p) => p.cat === "libro" && p.unit === i + 1).length);
    const conjForms = Object.values(CONJ).reduce((n, t) => n + Object.values(t.verbs).reduce((m, f) => m + f.filter((x) => x !== "—").length, 0), 0) + PASSATO.length * 6;
    return (this._c = { wordCats: wordCats.map((c) => ({ c, ws: WORDS.filter((w) => w.cat === c.id), lv: byLevel(WORDS.filter((w) => w.cat === c.id)) })), levels: byLevel(WORDS), endings, aux, sits: Object.entries(sits).sort((a, b) => b[1] - a[1]), units, conjForms, verbs: infs.length });
  },
};
Views["/progressi"] = () => {
  const tab = G.st.tab || "io";
  const segs = [["io", "Io"], ["notifiche", "Notifiche"], ["contenuto", "Contenuto"]];
  const head = `<div class="seg top" role="tablist">${segs.map(([k, l]) => `<button role="tab" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}" data-a="prog-tab" data-tab="${k}">${l}</button>`).join("")}</div>`;
  return head + (tab === "notifiche" ? Views.progNotifiche() : tab === "contenuto" ? Views.progContenuto() : Views.progIo());
};
Views.progIo = () => {
  const seen = Store.seen().length, mastered = Store.mastered(), due = Store.due().length, week = Store.week(), g = Store.s.goals, anim = animOnce("io");
  const days = Array.from({ length: 14 }, (_, i) => daysAgo(13 - i));
  const rows = days.map((k) => { const a = Store.s.activity[k] || {}; return { label: "LMMJVSD"[(new Date(k + "T12:00:00").getDay() + 6) % 7], tipTitle: fmtDay(k), values: { ok: a.correct || 0, ko: Math.max(0, (a.answers || 0) - (a.correct || 0)) } }; });
  const totalAns = rows.reduce((n, r) => n + r.values.ok + r.values.ko, 0), totalOk = rows.reduce((n, r) => n + r.values.ok, 0);
  const boxes = [0, 0, 0, 0]; CARDS.forEach((w) => { const p = Store.s.progress[w.id]; boxes[!p?.seen ? 0 : p.box >= 4 ? 3 : p.box >= 2 ? 2 : 1]++; });
  const errs = Object.entries(Store.s.stats.errors).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const weak = Store.weak().slice(0, 10);
  const streak = Store.s.stats.streak || 1;
  return `<div class="${anim}">${UI.stats([UI.stat(seen, plural(seen, "carte vue", "cartes vues"), "/studia"), UI.stat(mastered, plural(mastered, "acquise", "acquises"), "/studia"), UI.stat(due, "à réviser", "/ripasso", due ? "hot" : ""), UI.stat(streak, plural(streak, "jour de suite", "jours de suite"), "/progressi")])}
    <div class="h3"><span>Objectifs de la semaine</span><button type="button" class="h3btn" data-a="goals-edit" aria-label="Modifier les objectifs">${I.cog}</button></div>
    <div class="list"><div class="goal"><div class="inl"><span>Nouvelles cartes</span><b>${week.newCards} / ${g.newCards}</b></div>${UI.prog(week.newCards / g.newCards * 100)}</div><div class="goal"><div class="inl"><span>Leçons validées</span><b>${week.lessons} / ${g.lessons}</b></div>${UI.prog(week.lessons / g.lessons * 100)}</div><div class="goal"><div class="inl"><span>Réponses · précision</span><b>${week.answers} · ${week.answers ? Math.round(week.correct / week.answers * 100) : 0} %</b></div></div></div>
    <div class="h3"><span>Réponses, 14 jours</span><span>${totalAns} · ${totalAns ? Math.round(totalOk / totalAns * 100) : 0} % justes</span></div>
    <div class="card">${Chart.vbars([{ key: "ok", label: "Justes", color: "var(--c3)" }, { key: "ko", label: "Fausses", color: "var(--c1)" }], rows)}</div>
    <div class="h3"><span>Où en sont les ${CARDS.length} cartes</span></div>
    <div class="card">${Chart.hstack([{ label: "Jamais vues", n: boxes[0], color: "var(--line-2)" }, { label: "Vues", n: boxes[1], color: "color-mix(in srgb,var(--c2) 40%,var(--card))" }, { label: "En cours", n: boxes[2], color: "color-mix(in srgb,var(--c2) 70%,var(--card))" }, { label: "Acquises", n: boxes[3], color: "var(--c2)" }])}</div>
    <div class="h3"><span>Types d'erreurs</span></div>
    <div class="card">${errs.length ? Chart.hbars(errs.map(([k, v]) => ({ label: ERR_LABEL[k] || k, n: v })), { color: "var(--c1)" }) : `<p class="p">Pas encore d'erreur enregistrée : les QCM notent le type de piège choisi (auxiliaire, accord, préposition…).</p>`}</div>
    <div class="h3"><span>Da rivedere</span><span>${Store.weak().length}</span></div>
    ${weak.length ? `<div class="list">${weak.map((w) => { const p = Store.s.progress[w.id]; return `<div class="item"><button type="button" class="item-main" data-a="reveal" data-id="w${w.id}"><span class="k ${isPhrase(w) ? "phrase" : "word"}"></span><span class="tx"><span class="w it">${esc(w.it)}</span>${G.st.open?.["w" + w.id] ? `<span class="tr">${esc(w.fr)}</span>` : `<span class="hint">${p.fails} ${plural(p.fails, "erreur", "erreurs")}${p.lapses ? ` · ${p.lapses} ${plural(p.lapses, "oubli", "oublis")}` : ""} · touche pour la traduction</span>`}</span></button>${UI.spk(w.it)}</div>`; }).join("")}</div><div class="btnrow"><button class="btn brand block" data-a="learn-weak">Réviser ces cartes</button></div>` : `<div class="list"><div class="empty">Aucune carte en difficulté pour l'instant.</div></div>`}
    <div class="h3"><span>Maîtrise par thème</span></div>
    <div class="list">${CATEGORIES.filter((c) => BY_CAT[c.id]?.length).map((c) => { const ws = BY_CAT[c.id], m = ws.filter((w) => (Store.s.progress[w.id]?.box || 0) >= 4).length, sn = ws.filter((w) => Store.s.progress[w.id]?.seen).length; return UI.row({ href: `/studia/${c.id}`, ic: UI.ring(m / ws.length), title: esc(c.label), sub: `${sn} vues · ${m} acquises`, end: `${Math.round(m / ws.length * 100)} %` }); }).join("")}</div></div>`;
};
Views.progNotifiche = () => {
  if (!Store.s.subscribed && !DEMO) return `<div class="list"><div class="empty">${I.bell}<br>Active les notifications sur cet appareil pour suivre ici ce que le serveur t'envoie : rythme, heures, couverture du contenu.</div></div><div class="btnrow"><button class="btn brand block" data-a="enable">Activer les notifications</button></div>`;
  const S = Stats; if (!S.data && !S.loading && !S.error) { setTimeout(() => S.refresh(true), 0); return `<div class="card sk">Chargement des statistiques…</div>`; }
  S.watch();
  if (!S.data) return S.loading ? `<div class="card sk">Chargement des statistiques…</div>` : `<div class="banner warn">${I.cloud}<div class="t">Statistiques indisponibles<small>${esc(S.error || "")}</small></div><button class="act" data-a="stats-refresh">Réessayer</button></div>`;
  const d = S.data, dev = d.device || {}, anim = animOnce("notifiche"), now = Date.now();
  // État et prochaine notification estimée
  const win = (h) => dev.start_hour < dev.end_hour ? h >= dev.start_hour && h < dev.end_hour : true;
  let next = null; if (dev.subscribed && dev.enabled && dev.interval_min) { let t = Math.max(now, (dev.last_sent_at ? new Date(dev.last_sent_at).getTime() : 0) + dev.interval_min * 60000); for (let k = 0; k < 48 && !win(new Date(t).getHours()); k++) t = new Date(t).setHours(new Date(t).getHours() + 1, 0, 0, 0); next = t; }
  const status = !dev.subscribed ? `<span class="status off">${I.bellOff}Pas d'abonnement</span>` : dev.enabled ? `<span class="status">${I.bell}Actives</span>` : `<span class="status warn">${I.bellOff}En pause</span>`;
  const nextTxt = next ? (dayKey(next) === dayKey() ? `prochaine vers ${fmtTime(next)}` : `prochaine demain vers ${fmtTime(next)}`) : "";
  // 30 jours
  const byDay = Object.fromEntries((d.by_day || []).map((r) => [r.day, r]));
  const days = Array.from({ length: 30 }, (_, i) => daysAgo(29 - i)).map((k) => { const r = byDay[k] || {}; return { label: String(new Date(k + "T12:00:00").getDate()), tipTitle: fmtDay(k), values: { word: r.word || 0, phrase: r.phrase || 0, conj: r.conj || 0 } }; });
  const last7 = days.slice(-7).reduce((n, r) => n + r.values.word + r.values.phrase + r.values.conj, 0), prev7 = days.slice(-14, -7).reduce((n, r) => n + r.values.word + r.values.phrase + r.values.conj, 0);
  const hours = (d.by_hour || Array(24).fill(0)).map((n, h) => ({ label: h % 6 === 0 ? `${h}h` : "", tipTitle: `${h}h – ${h + 1}h`, values: { n }, win: win(h) }));
  const cov = d.coverage || {}, ratio = (k) => (cov[k]?.sent || 0) / Math.max(1, cov[k]?.total || 1);
  const covRows = KIND_SERIES.map((s) => ({ label: s.label, n: ratio(s.key), color: s.color, text: pct(cov[s.key]?.sent || 0, cov[s.key]?.total || 0, 1), tip: `${s.label} : ${cov[s.key]?.sent || 0} reçus sur ${cov[s.key]?.total || 0} (${pct(cov[s.key]?.sent || 0, cov[s.key]?.total || 0, 1)})` }));
  const covMax = Math.max(0.001, ...KIND_SERIES.map((s) => ratio(s.key)));
  const why = Object.entries(d.by_why || {}).map(([k, n]) => ({ label: WHY_LABEL[k] || k, n, color: WHY_COLOR[k] || "var(--line-2)" }));
  const tags = (d.top_tags || []).slice(0, 6).map((t) => ({ label: t.tag, n: t.n }));
  const cron = d.cron || {}, cronOk = cron.last_run && now - new Date(cron.last_run).getTime() < 20 * 60000;
  return `<div class="${anim}">
    <div class="card"><div class="h4"><span>Cet appareil</span>${status}</div>
      <div class="kv"><div><small>Fréquence</small><b>${dev.interval_min ? `toutes les ${UI.fmtInterval(dev.interval_min)}` : "—"}</b></div><div><small>Plage horaire</small><b>${dev.start_hour != null ? `${dev.start_hour}h – ${dev.end_hour}h` : "—"}</b></div><div><small>Dernière envoyée</small><b>${dev.last_sent_at ? ago(dev.last_sent_at) : "jamais"}</b></div><div><small>Prochaine</small><b>${nextTxt ? nextTxt.replace("prochaine ", "") : "—"}</b></div></div>
      <div class="kpi-sub">Contenu : ${(dev.kinds || []).map((k) => KIND_SERIES.find((s) => s.key === k)?.label.toLowerCase() || k).join(", ") || "—"} · abonné depuis le ${dev.created_at ? fmtDay(dev.created_at) : "—"}</div></div>
    <div class="h3"><span>Notifications reçues</span><button type="button" class="h3btn" data-a="stats-refresh" aria-label="Actualiser" ${S.loading ? "disabled" : ""}>${I.refresh}</button></div>
    <div class="card">${Chart.kpi(d.total || 0, plural(d.total || 0, "notification", "notifications"), `${d.distinct || 0} ${plural(d.distinct || 0, "élément différent", "éléments différents")} · ${pct(d.distinct || 0, d.items_total || 0, 1)} du contenu${d.first_at ? ` · depuis le ${fmtDay(d.first_at)}` : ""}<br>7 derniers jours : <b>${last7}</b>${prev7 ? ` (${last7 >= prev7 ? "+" : "−"}${Math.abs(last7 - prev7)} vs les 7 d'avant)` : ""}`)}</div>
    <div class="card"><div class="h4"><span>Par jour, 30 jours</span></div>${Chart.vbars(KIND_SERIES, days, { labelEvery: 7 })}</div>
    <div class="card"><div class="h4"><span>Par heure d'envoi</span><span>plage ${dev.start_hour}h – ${dev.end_hour}h en fond</span></div>${Chart.vbars([{ key: "n", label: "Envois", color: "var(--c2)" }], hours)}</div>
    <div class="card"><div class="h4"><span>Couverture du contenu</span><span>${d.items_total || 0} éléments</span></div>${Chart.hbars(covRows, { cls: "c3", max: covMax })}<p class="kpi-sub">Part de chaque type déjà reçue au moins une fois. Les verbes sont nombreux (${cov.conj?.total || 0} formes) : la barre monte lentement, c'est normal.</p></div>
    <div class="card"><div class="h4"><span>D'où viennent les envois</span></div>${why.length ? Chart.hstack(why) : `<p class="p">Pas encore d'envoi.</p>`}<p class="kpi-sub">Cartes faibles et parcours suivi sont envoyés par cet appareil au serveur ; le reste est tiré au hasard dans le contenu.</p></div>
    <div class="card"><div class="h4"><span>Thèmes les plus reçus</span></div>${tags.length ? Chart.hbars(tags, { color: "var(--c4)" }) : `<p class="p">Pas encore d'envoi.</p>`}</div>
    <div class="card"><div class="h4"><span>Serveur</span><span class="status ${cronOk ? "" : "warn"}">${cronOk ? I.check : I.clock}${cronOk ? "En marche" : "Pas de passage récent"}</span></div>
      <div class="kv"><div><small>Passages réussis</small><b>${cron.ok ?? 0}</b></div><div><small>Échecs</small><b>${cron.failed ?? 0}</b></div><div><small>Dernier passage</small><b>${cron.last_run ? ago(cron.last_run) : "—"}</b></div><div><small>Cadence</small><b>toutes les 5 min</b></div></div></div>
    <div class="live"><i class="${S.visible() ? "" : "off"}"></i>Actualisé ${ago(S.at)} · se rafraîchit chaque minute sur cet onglet</div></div>`;
};
Views.progContenuto = () => {
  const M = ContentMap.get(), anim = animOnce("contenuto");
  const LV = [{ key: "A1", label: "A1", color: "color-mix(in srgb,var(--c2) 40%,var(--card))" }, { key: "A2", label: "A2", color: "color-mix(in srgb,var(--c2) 70%,var(--card))" }, { key: "B1", label: "B1", color: "var(--c2)" }];
  const seenOf = (ws) => ws.filter((w) => Store.s.progress[w.id]?.seen).length;
  const themeMax = Math.max(...M.wordCats.map((x) => x.ws.length));
  const lessonsBy = [["ripasso", "Ripasso del libro"], ["avanti", "Avanti A2 → B1"], ["b1", "Verso il B1"]].map(([t, label]) => ({ label, n: LESSONS.filter((l) => l.track === t).length, done: Store.lessonsDone(t) })), lessonsMax = Math.max(...lessonsBy.map((r) => r.n));
  const lessonsHtml = lessonsBy.map((r, i) => `<div class="hbar c3" data-tip="${esc(`${r.label} : ${r.n} leçons, ${r.done} validées`)}"><span>${esc(r.label)}</span><div class="track" style="background:transparent"><div class="hstack" style="width:${Math.round(r.n / lessonsMax * 100)}%;height:10px;--d:${(i * 0.04).toFixed(2)}s">${r.done ? `<i style="flex:${r.done};background:var(--c4)"></i>` : ""}${r.n - r.done ? `<i style="flex:${r.n - r.done};background:color-mix(in srgb,var(--c4) 28%,var(--card))"></i>` : ""}</div></div><b>${r.done} / ${r.n}</b></div>`).join("") + Chart.legend([{ label: "Validées", color: "var(--c4)" }, { label: "À faire", color: "color-mix(in srgb,var(--c4) 28%,var(--card))" }]);
  return `<div class="${anim}">
    ${UI.stats([UI.stat(WORDS.length, "mots", "/studia"), UI.stat(PHRASES.length, "phrases", "/studia/dialoghi"), UI.stat(M.verbs, "verbes", "/grammatica/coniuga"), UI.stat(LESSONS.length, "leçons", "/grammatica")])}
    <div class="card"><div class="h4"><span>Mots par niveau</span><span>${WORDS.length} mots</span></div>${Chart.hstack(LV.map((l) => ({ ...l, n: M.levels[l.key] })))}</div>
    <div class="h3"><span>Mots par thème</span><span>${seenOf(WORDS)} vus</span></div>
    <div class="card">${M.wordCats.map((x, i) => { const segs = LV.filter((l) => x.lv[l.key] > 0).map((l) => `<i style="flex:${x.lv[l.key]};background:${l.color}"></i>`).join(""); const tip = `${x.c.label} : ${x.ws.length} mots\nA1 ${x.lv.A1} · A2 ${x.lv.A2} · B1 ${x.lv.B1}\n${seenOf(x.ws)} vus`; return `<div class="hbar c3" data-tip="${esc(tip)}"><span>${esc(x.c.label)}</span><div class="track" style="background:transparent"><div class="hstack" style="width:${Math.round(x.ws.length / themeMax * 100)}%;height:10px;--d:${(i * 0.03).toFixed(2)}s">${segs}</div></div><b>${x.ws.length}</b></div>`; }).join("")}${Chart.legend(LV.filter((l) => M.levels[l.key] > 0))}</div>
    <div class="h3"><span>Phrases</span><span>${PHRASES.length}</span></div>
    <div class="card"><div class="h4"><span>Vivi l'italiano, par unité</span><span>${M.units.reduce((a, b) => a + b, 0)} phrases</span></div>${Chart.vbars([{ key: "n", label: "Phrases", color: "var(--c1)" }], M.units.map((n, i) => ({ label: String(i + 1), tipTitle: `Unità ${i + 1}`, values: { n } })))}</div>
    <div class="card"><div class="h4"><span>Dialoghi, par situation</span><span>${M.sits.reduce((a, s) => a + s[1], 0)} phrases</span></div>${Chart.hbars(M.sits.map(([sit, n]) => ({ label: sit, n })), { color: "var(--c1)" })}</div>
    <div class="h3"><span>Verbes</span><span>${M.verbs} verbes · ${M.conjForms} formes</span></div>
    <div class="card"><div class="h4"><span>Terminaisons</span></div>${Chart.hstack([{ label: "-are", n: M.endings["-are"] || 0, color: "var(--c3)" }, { label: "-ere", n: M.endings["-ere"] || 0, color: "color-mix(in srgb,var(--c3) 65%,var(--card))" }, { label: "-ire", n: M.endings["-ire"] || 0, color: "color-mix(in srgb,var(--c3) 38%,var(--card))" }])}
      <div class="h4" style="margin-top:12px"><span>Auxiliaire au passato prossimo</span></div>${Chart.hstack([{ label: "avere", n: M.aux.avere, color: "var(--c2)" }, { label: "essere", n: M.aux.essere, color: "var(--c1)" }, { label: "réfléchis", n: M.aux.riflessivo, color: "var(--c4)" }])}
      <div class="h4" style="margin-top:12px"><span>Temps, meilleur score Coniuga</span></div>${Chart.hbars(TENSES.map(([id, label]) => ({ label, n: Store.s.conjBest[id] || 0, text: `${Store.s.conjBest[id] || 0} / 8`, tip: `${label} : meilleur score ${Store.s.conjBest[id] || 0} / 8` })), { color: "var(--c3)", max: 8, cls: "c3" })}</div>
    <div class="h3"><span>Leçons et parcours</span></div>
    <div class="card">${lessonsHtml}</div>
    <div class="list" style="margin-top:8px">${PERCORSI.map((p) => UI.row({ href: `/percorsi/${p.id}`, ic: UI.ring(Percorsi.progress(p) / p.steps.length, "brand"), title: esc(p.title), sub: `${p.steps.length} étapes · ${p.steps.filter((s) => s.type === "vocab").length} vocab, ${p.steps.filter((s) => s.type === "phrases").length} phrases, ${p.steps.filter((s) => s.type === "lesson").length} leçons`, end: `${Percorsi.progress(p)} / ${p.steps.length}` })).join("")}</div></div>`;
};

Views["/impostazioni"] = () => {
  const s = Store.s.settings, ui = Store.s.ui, imp = G.st.imp;
  const opts = (sel) => Array.from({ length: 25 }, (_, h) => h).filter((h) => sel === "start" ? h <= 23 : h >= 1).map((h) => `<option value="${h}" ${h === (sel === "start" ? s.start_hour : s.end_hour) ? "selected" : ""}>${h}h</option>`).join("");
  const seg = (items, cur, a, extra = "") => `<div class="seg">${items.map(([v, l]) => `<button class="${(Array.isArray(cur) ? cur.includes(v) : cur === v) ? "on" : ""}" data-a="${a}" data-v="${v}" ${extra} aria-pressed="${Array.isArray(cur) ? cur.includes(v) : cur === v}">${l}</button>`).join("")}</div>`;
  return `<div class="h3"><span>Notifications</span></div><div class="list">
      <div class="field"><div class="inl"><label>${Store.s.subscribed ? (s.enabled ? "Actives sur cet appareil" : "En pause") : "Non activées sur cet appareil"}</label>${Store.s.subscribed ? `<button class="sw ${s.enabled ? "on" : ""}" data-a="set-enabled" role="switch" aria-checked="${s.enabled}" aria-label="Notifications"></button>` : `<button class="btn brand" data-a="enable">Activer</button>`}</div></div>
      <div class="field"><label>Fréquence</label>${seg([[30, "30 min"], [60, "1 h"], [120, "2 h"], [180, "3 h"], [240, "4 h"]], s.interval_min, "set-int")}</div>
      <div class="field"><label>Plage horaire</label><div class="hours"><select id="sh" aria-label="Début">${opts("start")}</select><span>à</span><select id="eh" aria-label="Fin">${opts("end")}</select></div></div>
      <div class="field"><label>Contenu</label>${seg([["word", "Mots"], ["phrase", "Phrases"], ["conj", "Verbes"]], s.kinds, "set-kind")}</div>
    </div>
    <div class="btnrow"><button class="btn block" data-a="test" ${Store.s.subscribed ? "" : "disabled"}>${I.send} Envoyer une notification de test</button></div>
    <div class="h3"><span>Objectifs hebdomadaires</span></div><div class="list">
      <div class="field"><label>Nouvelles cartes par semaine</label>${seg([20, 30, 50, 80].map((n) => [n, n]), Store.s.goals.newCards, "set-goal", 'data-k="newCards"')}</div>
      <div class="field"><label>Leçons validées par semaine</label>${seg([1, 2, 3, 5].map((n) => [n, n]), Store.s.goals.lessons, "set-goal", 'data-k="lessons"')}</div>
    </div>
    <div class="h3"><span>Apparence</span></div><div class="list"><div class="field"><label>Thème</label>${seg([["auto", "Automatique"], ["light", "Clair"], ["dark", "Sombre"]], ui.scheme, "set-scheme")}</div></div>
    <div class="h3"><span>Sauvegarde</span></div><div class="list"><div class="field">
      <p class="p">Ta progression (${Store.seen().length} ${plural(Store.seen().length, "carte vue", "cartes vues")}, ${Store.lessonsDone()} ${plural(Store.lessonsDone(), "leçon validée", "leçons validées")}) n'existe que sur cet appareil. Exporte-la pour la mettre à l'abri ou la reprendre ailleurs.${Store.s.lastExport ? ` Dernier export : ${fmtDay(Store.s.lastExport)}.` : ""}</p>
      ${imp ? `<div class="banner warn" style="margin:10px 0 0">${I.cloud}<div class="t">Sauvegarde${imp.exported ? ` du ${fmtDay(imp.exported)}` : ""} : ${imp.seen} ${plural(imp.seen, "carte vue", "cartes vues")}, ${imp.lessons} ${plural(imp.lessons, "leçon", "leçons")}<small>Elle remplace la progression de cet appareil. Les réglages de notification restent ceux d'ici.</small></div></div><div class="btnrow"><button class="btn" data-a="import-cancel">Annuler</button><button class="btn brand" data-a="import-confirm">Remplacer</button></div>`
        : `<div class="btnrow"><button class="btn" data-a="export">Exporter</button><button class="btn" data-a="import-pick">Importer</button></div>`}
      <input type="file" id="impfile" accept="application/json,.json" hidden></div></div>
    <p class="p note">Impara! ${APP_VERSION} · appareil ${Store.s.device.slice(0, 8)} · <button type="button" class="link" data-a="news-show">voir les nouveautés</button><br>Chaque réglage est enregistré aussitôt ; les notifications s'adaptent à tes cartes faibles et au parcours suivi.</p>`;
};

/* ═══════════════════════════════════════════
   11. Rendu — le DOM existant est mis à jour sur place (pas remplacé) : transitions, focus et défilement sont conservés
   ═══════════════════════════════════════════ */
const app = document.getElementById("view");
const Dom = {
  tpl: document.createElement("template"),
  patch(root, html, typing) {
    this.tpl.innerHTML = html; this.kids(root, this.tpl.content);
    // La valeur affichée des champs suit l'état — sauf la réponse en cours de saisie, que l'état ne connaît pas encore
    root.querySelectorAll("input:not([type=file])").forEach((el) => { const v = el.getAttribute("value") ?? ""; if (el.value !== v && (el.id !== "inp" || !typing || el.readOnly || el._sync)) el.value = v; el._sync = false; });
    root.querySelectorAll("select").forEach((el) => { const v = el.querySelector("option[selected]")?.value; if (v != null && el.value !== v) el.value = v; });
  },
  kids(from, to) {
    let a = from.firstChild, b = to.firstChild;
    while (b) {
      const nb = b.nextSibling;
      if (!a) from.appendChild(b);
      else if (a.isEqualNode(b)) a = a.nextSibling;
      else if (a.nodeType === b.nodeType && a.nodeName === b.nodeName && (a.nodeType !== 1 || (a.id === b.id && a.dataset.key === b.dataset.key))) { if (a.nodeType === 1) this.el(a, b); else a.nodeValue = b.nodeValue; a = a.nextSibling; }
      else { const next = a.nextSibling; from.replaceChild(b, a); a = next; }
      b = nb;
    }
    while (a) { const next = a.nextSibling; from.removeChild(a); a = next; }
  },
  el(a, b) {
    if (a.nodeName === "INPUT" && a.getAttribute("value") !== b.getAttribute("value")) a._sync = true; // l'état a changé la valeur : elle s'impose au texte tapé
    if (a !== Swipe.on?.sc) { for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name); for (const at of b.attributes) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value); }
    this.kids(a, b);
  },
};
const TITLES = { "/oggi": "Oggi", "/studia": "Studia", "/ripasso": "Ripasso", "/grammatica": "Grammatica", "/giochi": "Giochi", "/impostazioni": "Réglages", "/progressi": "Progressi", "/percorsi": "Percorsi", "/sessione": "Esercizi" };
function titleFor() {
  const p = Router.path, a = Router.params.a;
  if (p === "/studia" && a) return CAT[a]?.label || "Studia";
  if (p === "/grammatica" && a) return a === "coniuga" ? "Coniuga!" : (LESSONS.find((l) => l.id === a)?.title || "Grammatica");
  if (p === "/giochi" && a) return GAMES.find((g) => g[0] === a)?.[2] || "Giochi";
  if (p === "/percorsi" && a) return PERCORSI.find((x) => x.id === a)?.title || "Percorsi";
  if (p === "/sessione") return G.sess?.title || "Esercizi";
  return TITLES[p] || "Impara!";
}
function render({ top = false } = {}) {
  const path = Router.path, pa = Router.params.a;
  const view = Views[path] || Views["/oggi"];
  const sub = !!pa || ["/impostazioni", "/sessione", "/progressi", "/percorsi"].includes(path);
  const parent = path === "/impostazioni" || path === "/progressi" ? "/oggi" : path === "/sessione" ? (G.sess?.back || "/oggi") : path === "/percorsi" ? (pa ? "/percorsi" : "/studia") : path;
  const backAct = path === "/sessione" ? "sess-close" : path === "/grammatica" && pa === "coniuga" && G.st.conj && !Router.params.b ? "c-menu" : "back";
  let body; try { body = view(); } catch (e) { console.error(e); body = `<div class="banner warn">${I.cloud}<div class="t">Cet écran n'a pas pu s'afficher<small>${esc(e.message)}</small></div></div><div class="btnrow"><a class="btn" href="#/oggi">Oggi</a><button class="btn brand" data-a="update-app">Recharger</button></div>`; }
  const due = Store.due().length, streak = Store.s.stats.streak || 1;
  const cls = `${body.startsWith('<div class="fill"') ? " fill" : ""}${path === "/oggi" || path === "/progressi" ? " wide" : ""}`;
  const nav = (h, ic, l, extra = "") => `<a href="#${h}" class="${path === h ? "on" : ""}" ${path === h ? 'aria-current="page"' : ""}>${I[ic]}${l}${extra}</a>`;
  Dom.patch(app, `<div class="shell${path === "/sessione" ? " focus" : ""}">
    <aside class="side"><div class="logo">Impara!</div>${NAV.map(([h, ic, l]) => nav(h, ic, l)).join("")}${nav("/percorsi", "route", "Percorsi")}${nav("/progressi", "chart", "Progressi")}<div class="grow"></div>${nav("/impostazioni", "cog", "Réglages")}</aside>
    <div class="main">
      <header class="bar${sub ? "" : " root"}">${sub ? `<button class="back" data-a="${backAct}" data-to="${parent}" aria-label="Retour">${I.chevL}<span>Retour</span></button>` : ""}<h1>${esc(titleFor())}</h1>${!sub ? `<a class="streak" href="#/progressi" aria-label="${streak} ${plural(streak, "jour", "jours")} de suite">${I.flame}${streak} ${plural(streak, "jour", "jours")}</a><a class="iconbtn" href="#/impostazioni" aria-label="Réglages">${I.cog}</a>` : ""}</header>
      <main class="content${cls}">${body}</main>
    </div>
    <nav class="tabs" aria-label="Sections">${NAV.map(([h, ic, l]) => nav(h, ic, l, h === "/ripasso" && due ? `<span class="dot" aria-label="${due} à réviser">${due > 99 ? "99+" : due}</span>` : "")).join("")}</nav>
  </div>`, !top);
  const main = app.querySelector(".main");
  if (top) { main.scrollTop = 0; if (render.key !== G.key && !reducedMotion()) app.querySelector(".content").animate?.([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.7,.2,1)" }); }
  render.key = G.key;
  const touch = "ontouchstart" in window, inp = document.getElementById("inp"), ae = document.activeElement;
  if (inp && !inp.readOnly) { if (!touch && ae !== inp) inp.focus(); }
  else if (!touch && (ae === document.body || !ae)) app.querySelector("[data-enter]")?.focus({ preventScroll: true });
  if (path === "/giochi" && pa === "cruci" && G.st.c?.focus) { const el = app.querySelector(`.cell input[data-key="${G.st.c.focus}"]`); if (el && document.activeElement !== el) el.focus(); }
}
const HOST_THEME = document.documentElement.dataset.theme || null; // thème imposé par la page hôte (simulateur), rétabli en mode automatique
function applyScheme() {
  const s = Store.s.ui.scheme, root = document.documentElement;
  if (s === "light" || s === "dark") root.dataset.theme = s; else if (HOST_THEME) root.dataset.theme = HOST_THEME; else delete root.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { const dark = s === "dark" || (s !== "light" && (m.media || "").includes("dark")); m.content = dark ? "#121419" : "#EEF0F3"; });
}

/* ═══════════════════════════════════════════
   12. Actions (délégation par data-a)
   ═══════════════════════════════════════════ */
// Réponse validée : le clavier du téléphone se replie pour laisser voir la correction
const doneTyping = () => { if ("ontouchstart" in window) document.getElementById("inp")?.blur(); };
const sansSujet = (v) => norm(v).replace(/^(io|tu|lui|lei|noi|voi|loro) /, "");
const errTypeOf = (round, pickId) => round.opts?.find((o) => o.id === pickId)?.t || "lessico";
function finishGame() { if (Menu.course("contorno")?.game === Router.params.a) Menu.done("contorno"); }
const Actions = {
  back: (d) => Router.back(d.to),
  refresh: () => Today.refresh(true),
  speak: (d) => speak(d.text),
  async enable(d, el) { el.disabled = true; el.textContent = "Activation…"; try { await Push.enable(); toast("Notifications activées"); Today.refresh(true); } catch (e) { toast(e.message); } render(); },
  async test(d, el) { el.disabled = true; try { const r = await Api.call("/test", {}); const rep = r.report?.[0]; toast(rep?.sent ? "Notification envoyée" : rep?.error ? "Erreur : " + rep.error : "Envoyé"); setTimeout(() => Today.refresh(true), 1500); } catch (e) { toast("Erreur : " + e.message); } render(); },
  "set-int": (d) => { Store.s.settings.interval_min = +d.v; settingsChanged(); },
  "set-kind": (d) => { const ks = Store.s.settings.kinds, k = ks.includes(d.v) ? ks.filter((x) => x !== d.v) : [...ks, d.v]; if (!k.length) { toast("Garde au moins un type de contenu"); return; } Store.s.settings.kinds = k; settingsChanged(); },
  "set-enabled": () => { Store.s.settings.enabled = !Store.s.settings.enabled; settingsChanged(); },
  "set-goal": (d) => { Store.s.goals[d.k] = +d.v; Sync.schedule(); Store.save(); render(); },
  "goals-edit": () => Router.go("/impostazioni"),
  "news-ok": () => { Store.s.seenVersion = APP_VERSION; Store.save(); render(); },
  "news-show": () => { Store.s.seenVersion = null; Store.save(); Router.go("/oggi"); },
  "set-scheme": (d) => { Store.s.ui.scheme = d.v; Store.save(); applyScheme(); render(); },
  "update-app": () => location.reload(),
  // Sauvegarde : feuille de partage sur téléphone (Fichiers, AirDrop…), téléchargement sur ordinateur
  async export() {
    if (DEMO) { toast("L'export est désactivé dans cet aperçu : il fonctionne dans l'app."); return; }
    const text = Store.export(), name = `impara-sauvegarde-${dayKey()}.json`, done = () => { Store.s.lastExport = dayKey(); Store.save(); render(); };
    if ("ontouchstart" in window && navigator.canShare) { try { const file = new File([text], name, { type: "application/json" }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Sauvegarde Impara!" }); return done(); } } catch (e) { if (e.name === "AbortError") return; } }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("Sauvegarde exportée"); done();
  },
  "import-pick": () => document.getElementById("impfile")?.click(),
  "import-cancel": () => { G.st.imp = null; render(); },
  "import-confirm": () => { const imp = G.st.imp; if (!imp) return; Store.restore(imp.data); G.st.imp = null; toast("Progression restaurée"); render({ top: true }); },
  "prog-tab": (d) => { G.st.tab = d.tab; render({ top: true }); },
  "stats-refresh": () => Stats.refresh(true),
  "xp-open": () => Xp.open(),
  "xp-close": () => Xp.close(),
  "xp-prev": () => { Xp.go((G.st.xp?.i || 0) - 1); },
  "xp-next": () => { Xp.go((G.st.xp?.i || 0) + 1); },
  "xp-play": () => Xp.play(!G.st.xp?.play),
  reveal: (d) => { G.st.open ??= {}; G.st.open[d.id] = !G.st.open[d.id]; render(); },
  session: (d) => Sess.today(d.scope),
  "sess-close": () => { const b = G.sess?.back || "/oggi"; G.sess = null; if (Router.path !== "/sessione") return Router.go(b); if (!DEMO && Router.depth > 0) history.back(); else Router.replace(b); },
  "sess-retry": () => { const s = G.sess; if (!s) return; Sess.check({ ids: s.pool || [], n: s.n || s.rounds.length, title: s.title, back: s.back, onDone: s.onDone }); },
  "sess-flip": () => { G.sess.flipped = !G.sess.flipped; render(); },
  "sess-seen": () => { const s = G.sess; Store.see(s.cards[s.ci]); s.flipped = false; if (s.ci + 1 >= s.cards.length) s.phase = "quiz"; else s.ci++; render({ top: true }); },
  "s-mcq": (d) => { const s = G.sess; if (!s || s.answered) return; const r = s.rounds[s.idx], ok = d.id === r.a; sessionAnswer(ok, { pick: d.id }, ok ? null : errTypeOf(r, d.id)); },
  "s-verify": () => { const s = G.sess, r = s.rounds[s.idx], v = inputValue(); if (!v.trim() || s.answered) return; s.input = v; doneTyping(); sessionAnswer(r.accepted.includes(norm(v)) || (!!r.conj && r.accepted.includes(sansSujet(v))), {}, "scrittura"); },
  "s-next": () => { const s = G.sess; s.idx++; s.answered = null; s.input = ""; render({ top: true }); },
  "menu-antipasto": () => { const c = Menu.course("antipasto"), due = Store.due(); const ids = (due.length ? shuffle(due) : shuffle(Store.seen())).slice(0, c?.n || 8).map((w) => w.id); if (!ids.length) { toast("Aucune carte vue pour l'instant : commence par le Primo"); return; } Sess.open({ kind: "menu", title: "Antipasto · ripasso", back: "/oggi", onDone: { type: "menu", course: "antipasto" }, phase: "quiz", rounds: Sess.rounds(ids.map((id) => BY_ID[id]), { n: ids.length, typeEvery: 3 }) }); },
  "menu-primo": () => { const c = Menu.course("primo"); if (!c?.ids?.length) { toast("Tout est déjà vu !"); return; } Sess.learn({ ids: c.ids, title: "Primo · parole nuove", back: "/oggi", onDone: { type: "menu", course: "primo" } }); },
  "menu-dolce": () => { const c = Menu.course("dolce"); if (!c) return; if (c.card) { Store.see(c.card); speak(c.title); } Menu.done("dolce"); toast(c.sub || ""); render(); },
  "learn-cat": (d) => { const ids = CARDS.filter((w) => w.cat === d.cat && !Store.s.progress[w.id]?.seen).slice(0, 8).map((w) => w.id); if (!ids.length) { toast("Tout ce thème est déjà vu"); return; } Sess.learn({ ids, title: `${CAT[d.cat].label} · nouvelles`, back: `/studia/${d.cat}` }); },
  "learn-weak": () => { const ids = Store.weak().slice(0, 12).map((w) => w.id); Sess.open({ kind: "menu", title: "Da rivedere", back: "/progressi", phase: "quiz", rounds: Sess.rounds(ids.map((id) => BY_ID[id]), { n: ids.length, typeEvery: 2 }) }); },
  "path-activate": (d) => { Store.s.percorsi.active = d.id; Sync.schedule(); Menu.rebuild(); toast("Parcours suivi : il guide le Menù et les notifications"); render(); },
  "path-deactivate": () => { Store.s.percorsi.active = null; Sync.schedule(); Menu.rebuild(); render(); },
  step: (d) => { const p = PERCORSI.find((x) => x.id === d.path), s = p?.steps.find((x) => x.id === d.step); if (p && s) Percorsi.start(p, s); },
  flip: () => { G.st.flipped = !G.st.flipped; render(); },
  grade: (d) => { const cat = Router.params.a; Store.s.pos[cat] = (Store.s.pos[cat] || 0) + 1; Store.grade(d.id, d.k === "1"); G.st.flipped = false; render(); },
  rflip: () => { G.st.flipped = !G.st.flipped; render(); },
  rgrade: (d) => { const q = G.st.queue, cur = q.shift(); Store.grade(cur, d.k === "1"); if (d.k !== "1") q.push(cur); G.st.flipped = false; G.st.done = true; const m = Store.s.menu; if (m?.day === dayKey()) { m.counts.ripasso = (m.counts.ripasso || 0) + 1; if (m.counts.ripasso >= (Menu.course("antipasto")?.n || 8)) Menu.done("antipasto"); } render(); },
  "l-read": () => { G.st.phase = "read"; render({ top: true }); },
  "l-quiz": () => { Xp.stop(); const l = LESSONS.find((x) => x.id === Router.params.a); Object.assign(G.st, { phase: "quiz", q: 0, score: 0, answered: null, order: l.quiz.map((q) => shuffle(q.opts.map((_, i) => i))) }); render({ top: true }); },
  "l-ans": (d) => { const L = G.st, l = LESSONS.find((x) => x.id === Router.params.a); if (L.answered !== null) return; L.answered = +d.id; if (L.answered === l.quiz[L.q].a) L.score++; render(); },
  "l-next": () => { const L = G.st, l = LESSONS.find((x) => x.id === Router.params.a); if (L.q + 1 >= l.quiz.length) { Store.s.grammar[l.id] = Math.max(Store.s.grammar[l.id] || 0, L.score); Sync.schedule(); if (L.score === l.quiz.length) { Store.lessonValidated(l.id); Percorsi.hook("lesson", l.id); } if (Menu.course("secondo")?.lesson === l.id) Menu.done("secondo"); Store.save(); L.phase = "done"; } else { L.q++; L.answered = null; } render({ top: true }); },
  "c-start": (d) => { startConiuga(d.t); render({ top: true }); },
  "c-menu": () => { G.st.conj = null; if (Router.params.b) Router.replace("/grammatica/coniuga"); else render({ top: true }); },
  "c-check": () => { const C = G.st.conj, v = inputValue(); if (!v.trim() || C.result) return; C.input = v; doneTyping(); const acc = C.rounds[C.idx].accepted, ok = acc.includes(norm(v)) || acc.includes(sansSujet(v)); C.result = { ok }; if (ok) C.score++; Store.activity({ answers: 1, correct: ok ? 1 : 0 }); if (!ok) { Store.s.stats.errors.verbo = (Store.s.stats.errors.verbo || 0) + 1; Sync.schedule(); } Store.save(); render(); },
  "c-next": () => { const C = G.st.conj; if (C.idx + 1 >= C.rounds.length) { C.step = C.score >= 6 && PERCORSI.some((p) => p.steps.some((s) => s.type === "conj" && s.tense === C.tense && !Percorsi.isDone(p, s))); Store.s.conjBest[C.tense] = Math.max(Store.s.conjBest[C.tense] || 0, C.score); Sync.schedule(); if (C.score >= 6) Percorsi.hook("conj", C.tense); if (Menu.course("secondo")?.tense === C.tense) Menu.done("secondo"); Store.save(); C.finished = true; } else { C.idx++; C.input = ""; C.result = null; } render({ top: true }); },
  "g-again": () => { G.st = {}; render({ top: true }); },
  "sc-ans": (d) => { const S = G.st.s; if (S.ans) return; const q = S.qs[S.idx], ok = d.id === q.w.id; S.ans = { id: d.id, ok }; if (ok) S.score++; Store.grade(q.w.id, ok, ok ? null : errTypeOf(q, d.id)); render(); },
  "sc-next": () => { const S = G.st.s; if (S.idx + 1 >= 10) { S.fin = true; Store.s.stats.bestQuiz = Math.max(Store.s.stats.bestQuiz || 0, S.score); Sync.schedule(); Store.save(); finishGame(); } else { S.idx++; S.ans = null; } render({ top: true }); },
  "wr-hint": () => { G.st.w.input = inputValue(); G.st.w.hint = true; render(); },
  "wr-check": () => { const S = G.st.w, v = inputValue(); if (!v.trim() || S.res) return; S.input = v; doneTyping(); const ok = acceptedAnswers(S.qs[S.idx]).has(norm(v)); S.res = { ok }; if (ok) S.score++; Store.grade(S.qs[S.idx].id, ok, "scrittura"); render(); },
  "wr-next": () => { const S = G.st.w; if (S.idx + 1 >= 8) { S.fin = true; finishGame(); } else { S.idx++; S.input = ""; S.res = null; S.hint = false; } render({ top: true }); },
  "cw-clue": (d) => { const C = G.st.c; C.active = { id: d.id, dir: d.dir }; const ks = cellsOf(Cw.active()); Cw.paint(); Cw.focus(ks.find((k) => !(C.cells[k] || "").length) || ks[0]); },
  "cw-verify": () => { const C = G.st.c; C.checked = true; Cw.entries().forEach((p) => { if (!C.graded.has(p.id) && cellsOf(p).every((k) => stripAccents((C.cells[k] || "").toUpperCase()) === C.cw.solution[k])) { C.graded.add(p.id); Store.grade(p.id, true); } }); if (!C.cheated && C.graded.size === Cw.entries().length) finishGame(); render(); },
  "cw-reveal": () => { const C = G.st.c; Object.keys(C.cw.solution).forEach((k) => { C.cells[k] = C.cw.solution[k]; }); Cw.entries().forEach((p) => C.graded.add(p.id)); C.revealed = true; C.cheated = true; C.checked = false; render(); },
  "cw-new": () => { G.st.c = null; render({ top: true }); },
  "an-pick": (d) => { const A = G.st.a, i = +d.i; if (A.status === "ok" || A.status === "rev" || A.letters[i].used) return; A.letters[i].used = true; A.picked.push(i); A.status = null; if (A.picked.length === A.w.word.length) { const g = A.picked.map((x) => A.letters[x].ch).join(""); if (g === A.w.word) { A.status = "ok"; A.score++; Store.grade(A.w.id, true); } else A.status = "ko"; } render(); },
  "an-undo": () => { const A = G.st.a; if (!A.picked.length || A.status === "ok") return; A.letters[A.picked.pop()].used = false; A.status = null; render(); },
  "an-clear": () => { const A = G.st.a; if (A.status === "ok") return; A.letters.forEach((l) => l.used = false); A.picked = []; A.status = null; render(); },
  "an-reveal": () => { const A = G.st.a; Store.grade(A.w.id, false, "ortografia"); A.status = "rev"; render(); },
  "an-next": () => { const A = G.st.a; A.used.add(A.w.id); if (A.count >= 8) { A.fin = true; finishGame(); } else { A.count++; anaRound(A); } render({ top: true }); },
  "ab-l": (d) => { if (G.st.b.err) return; G.st.b.selL = d.id; render(); abbinaCheck(); },
  "ab-r": (d) => { if (G.st.b.err) return; G.st.b.selR = d.id; render(); abbinaCheck(); },
  "ab-new": () => { G.st.b = abbinaRound(G.st.b); render({ top: true }); },
};
function sessionAnswer(ok, extra, errType) { const s = G.sess, r = s.rounds[s.idx]; s.answered = { ok, ...extra }; if (ok) s.score++; if (r.w && BY_ID[r.w.id]) Store.grade(r.w.id, ok, errType); else { Store.activity({ answers: 1, correct: ok ? 1 : 0 }); if (!ok && errType) { Store.s.stats.errors[errType] = (Store.s.stats.errors[errType] || 0) + 1; Sync.schedule(); } Store.save(); } render(); }
function abbinaCheck() { const B = G.st.b; if (!B.selL || !B.selR) return; B.tries++; if (B.selL === B.selR) { B.matched.add(B.selL); Store.grade(B.selL, true); B.selL = B.selR = null; if (B.matched.size === 6) finishGame(); render(); } else { B.err = { l: B.selL, r: B.selR }; render(); setTimeout(() => { if (G.st.b !== B) return; B.err = null; B.selL = B.selR = null; render(); }, 550); } }

// Glisser une carte : à droite « lo so », à gauche « non lo so » — les mêmes boutons que les flèches du clavier
const Swipe = {
  on: null, block: 0,
  down(e) { const sc = e.target.closest?.(".scene"); if (!sc || e.pointerType === "mouse" || !app.querySelector('[data-kbd="ArrowRight"]')) return; this.on = { sc, x: e.clientX, y: e.clientY, dx: 0, lock: null }; },
  move(e) {
    const s = this.on; if (!s) return; const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (!s.lock) { if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; s.lock = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; }
    if (s.lock !== "x") return; s.dx = dx; s.sc.style.transition = "none"; s.sc.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
    s.sc.dataset.swipe = dx > 70 && app.querySelector('[data-kbd="ArrowRight"]') ? "right" : dx < -70 && app.querySelector('[data-kbd="ArrowLeft"]') ? "left" : "";
  },
  up() {
    const s = this.on; if (!s) return; this.on = null; const key = s.sc.dataset.swipe === "right" ? "ArrowRight" : s.sc.dataset.swipe === "left" ? "ArrowLeft" : null;
    s.sc.style.transition = ""; s.sc.style.transform = ""; delete s.sc.dataset.swipe;
    if (s.lock === "x") { this.block = Date.now(); if (key) app.querySelector(`[data-kbd="${key}"]`)?.click(); }
  },
};
app.addEventListener("pointerdown", (e) => Swipe.down(e));
app.addEventListener("pointermove", (e) => Swipe.move(e));
["pointerup", "pointercancel"].forEach((t) => app.addEventListener(t, () => Swipe.up()));
app.addEventListener("click", (e) => {
  if (Date.now() - Swipe.block < 350 && e.target.closest(".scene")) { e.preventDefault(); return; } // fin de glissement : pas de retournement
  const el = e.target.closest("[data-a]");
  if (el) { const fn = Actions[el.dataset.a]; if (fn) { e.preventDefault(); if (Store.tick()) Store.save(); fn(el.dataset, el); } return; }
  const a = e.target.closest('a[href^="#/"]'); if (a) { e.preventDefault(); Router.go(a.getAttribute("href").slice(1)); }
});
app.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.id === "inp") { e.preventDefault(); app.querySelector("[data-enter]")?.click(); }
  if (e.target.matches(".cell input") && e.key === "Backspace") { const key = e.target.dataset.key, C = G.st.c; if ((C.cells[key] || "").length) return; e.preventDefault(); const p = Cw.entryFor(key); if (!p) return; const ks = cellsOf(p), i = ks.indexOf(key); if (i > 0) { C.cells[ks[i - 1]] = ""; Cw.paint(); Cw.focus(ks[i - 1]); } }
});
// Raccourcis clavier (ordinateur) : Entrée valide, ← → notent la carte, Espace la retourne, 1-4 choisissent une réponse
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.nodeName)) return;
  const onBody = e.target === document.body;
  if (e.key === "Enter") { if (onBody) { e.preventDefault(); app.querySelector("[data-enter]")?.click(); } return; }
  if (e.key === " " && !onBody) return;
  const el = app.querySelector(`[data-kbd="${e.key}"]`); if (el && !el.disabled) { e.preventDefault(); el.click(); }
});
app.addEventListener("input", (e) => { if (e.target.matches(".cell input")) Cw.input(e.target.dataset.key, e.target.value); });
app.addEventListener("change", async (e) => {
  if (e.target.id === "impfile") { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { G.st.imp = Store.parseBackup(await f.text()); render(); } catch (err) { toast(err instanceof SyntaxError ? "Fichier illisible : ce n'est pas une sauvegarde Impara!" : err.message); } return; }
  if (e.target.id === "sh" || e.target.id === "eh") { const s = Store.s.settings; s.start_hour = +document.getElementById("sh").value; s.end_hour = +document.getElementById("eh").value; if (s.end_hour <= s.start_hour) { s.end_hour = Math.min(24, s.start_hour + 1); toast("La fin doit être après le début"); } settingsChanged(); }
});
app.addEventListener("toggle", (e) => { if (e.target.matches("details.day")) { G.st.days ??= {}; G.st.days[e.target.dataset.k] = e.target.open; } }, true);
app.addEventListener("focusin", (e) => { if (e.target.matches(".cell input")) { const key = e.target.dataset.key, act = Cw.active(); if (act && cellsOf(act).includes(key)) return; const p = Cw.entryFor(key); if (p) { G.st.c.active = { id: p.id, dir: p.dir }; Cw.paint(); } } });
app.addEventListener("dblclick", (e) => { if (e.target.matches(".cell input")) { const key = e.target.dataset.key, here = Cw.entries().filter((p) => cellsOf(p).includes(key)); const a = G.st.c.active; if (here.length > 1 && a) { const o = here.find((p) => !(p.id === a.id && p.dir === a.dir)); if (o) { G.st.c.active = { id: o.id, dir: o.dir }; Cw.paint(); } } } });
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") { if (Store.tick()) { Store.save(); render(); } if (Router.path === "/oggi") Today.refresh(); if (Stats.visible()) { Stats.refresh(); Stats.watch(); } Push.checkUpdate(); }
  else { clearTimeout(Sync.t); Sync.push({ keepalive: true }); if (G.st.xp?.play) Xp.play(false); else Xp.stop(); }
});
window.addEventListener("online", () => { if (Router.path === "/oggi") Today.refresh(true); });
// Deux fenêtres ouvertes : celle qui n'écrit pas reprend l'état de l'autre au lieu de l'écraser à sa prochaine action
window.addEventListener("storage", (e) => { if (e.key !== KEY || !e.newValue) return; try { Store.s = Store.merge(JSON.parse(e.newValue)); applyScheme(); if (Router.path !== "/sessione") render(); } catch (err) {} });
// Infobulles des graphiques : survol / clavier, et touche sur mobile (un second toucher ferme)
app.addEventListener("pointerover", (e) => { const t = e.target.closest("[data-tip]"); if (t && e.pointerType !== "touch") Tip.show(t); });
app.addEventListener("pointerout", (e) => { const t = e.target.closest("[data-tip]"); if (t && e.pointerType !== "touch" && !t.contains(e.relatedTarget)) { const f = document.activeElement; if (f?.dataset?.tip && f !== t) Tip.show(f); else Tip.hide(); } });
app.addEventListener("focusin", (e) => { const t = e.target.closest("[data-tip]"); if (t) Tip.show(t); });
app.addEventListener("focusout", (e) => { if (e.target.closest("[data-tip]")) Tip.hide(); });
app.addEventListener("click", (e) => { const t = e.target.closest("[data-tip]"); if (!t) { Tip.hide(); return; } if (e.pointerType && e.pointerType !== "touch") return; if (Tip.cur === t) Tip.hide(); else Tip.show(t); });
app.addEventListener("scroll", () => { const f = document.activeElement; if (f?.dataset?.tip && app.contains(f)) Tip.show(f); else if (Tip.cur) Tip.hide(); }, true);

/* ═══════════════════════════════════════════
   13. Démarrage
   ═══════════════════════════════════════════ */
Store.load();
applyScheme();
try { navigator.storage?.persist?.(); localStorage.removeItem("impara-auth-v1"); } catch (e) {} // demande au navigateur de ne pas effacer la progression pour faire de la place
if (DEMO) window.ImparaReset = () => { try { localStorage.removeItem(KEY); } catch (e) {} Store.load(); Demo.sent = null; Today.sent = []; Today.at = 0; G.key = ""; G.st = {}; G.sess = null; Router.go("/oggi"); render({ top: true }); Push.me(); };
if (location.hash === "#oggi" || !location.hash) location.replace("#/oggi");
Router.parse(); G.fresh(Router.path, Router.params);
Push.init();
render();
Push.me();
