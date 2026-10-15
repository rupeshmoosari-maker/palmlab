// app.js - screens, the Cultural Reading, the Mini Experiment and "New Visitor".

import { initScan, resetScan, stopCamera, preloadModel, lastCapture } from "./scan.js";
import { fullReading, useAstrology } from "./reading.js";
import { loadKB } from "./kb.js";
import { initReadingUI, onShowReading, resetReadingUI } from "./readingui.js";
import { QUESTIONS, compare, readTally, addToTally, clearTally, chanceRange, verdict } from "./experiment.js";

const $ = (id) => document.getElementById(id);
const SCREENS = ["home", "scan", "reading", "experiment", "learn", "sources"];

// Everything about the current visitor lives here and nowhere else.
let visitor = { answers: {}, counted: false };

// ------------------------------------------------------------------ screens
function show() {
  const name = SCREENS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
  for (const s of SCREENS) $(s).hidden = s !== name;
  $("homeBtn").hidden = name === "home";
  if (name !== "scan") stopCamera();          // never leave the camera running in the background
  if (name === "scan") preloadModel();
  if (name === "experiment") renderTally();
  if (name === "reading" && kbReady) onShowReading();
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ reading
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function validDate(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= "1920-01-01" && v <= todayISO();
}

// ------------------------------------------------------------------ experiment
function renderQuiz() {
  $("quiz").innerHTML = QUESTIONS.map((q, i) =>
    `<div class="q"><p>${i + 1}. ${q.text}</p><div class="row">` +
    [q.a, q.b].map((o) =>
      `<button class="btn choice${visitor.answers[q.key] === o.value ? " on" : ""}" data-q="${q.key}" data-v="${o.value}">${o.label}</button>`).join("") +
    `</div></div>`).join("");
  $("expDob").hidden = QUESTIONS.some((q) => !visitor.answers[q.key]);
}

function reveal() {
  const v = $("dob2").value;
  if (!validDate(v)) { alert("Please choose a real date of birth first."); return; }
  const r = fullReading(v);
  const res = compare(visitor.answers, r.predicts);
  if (!visitor.counted) {
    addToTally(res);
    visitor.counted = true;              // one visitor counts once, even if they press again
  }
  const rows = res.rows.map((x) =>
    `<tr><td>${x.question}</td><td>${x.said}</td><td>${x.predicted}</td>` +
    `<td class="${x.match ? "match" : "nomatch"}">${x.match ? "✓ match" : "✗ no"}</td></tr>`).join("");
  $("expOut").innerHTML =
    `<p class="warnbanner">⚠️ Traditional interpretation only. Not scientifically validated.</p>` +
    `<div class="card"><div class="emoji">${r.sign.symbol}</div><div class="k">${r.sign.name} - a ${r.sign.element} sign</div>` +
    `<div class="e">Popular astrology says ${r.sign.element} signs are <b>${r.predicts.subject}</b>, <b>${r.predicts.energy}</b> and like working <b>${r.predicts.work === "group" ? "in a group" : "alone"}</b>.</div></div>` +
    `<div class="tablewrap"><table><tr><th>Question</th><th>You said</th><th>Tradition said</th><th></th></tr>${rows}</table></div>` +
    `<p class="note"><b>${res.matches} of 3 matched.</b> Guessing with a coin would match 1.5 of 3 on average - ` +
    `so one visitor can't tell us anything. Only many visitors together can.</p>` +
    `<h3>🎭 The Barnum effect</h3>` +
    `<p>Traditional readings use sentences like “You may enjoy a challenge…” or “You may notice how others feel…”. ` +
    `Sentences like these are <b>vague and positive</b>, so they feel accurate for almost anyone. ` +
    `Psychologist Bertram Forer showed this in 1948: he gave every student the <i>same</i> “personal” description, ` +
    `and on average they rated it about 4.3 out of 5 for accuracy.</p>` +
    `<p>That is why scientists test predictions with <b>specific</b> questions and compare against <b>chance</b>, like this experiment does.</p>`;
  $("expOut").hidden = false;
  renderTally();
  $("expOut").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderTally() {
  const t = readTally();
  if (!t.answers) {
    $("tallyOut").innerHTML = "<p>No visitors yet. Be the first!</p>";
    return;
  }
  const pct = (100 * t.matches) / t.answers;
  const r = chanceRange(t.answers);
  $("tallyOut").innerHTML =
    `<p><b>${t.visitors}</b> visitors · <b>${t.answers}</b> answers · <b>${t.matches}</b> matched = <b>${pct.toFixed(0)}%</b></p>` +
    `<div class="bar" role="img" aria-label="Matches ${pct.toFixed(0)} percent; chance range ${r.low.toFixed(0)} to ${r.high.toFixed(0)} percent">` +
    `<div class="band" style="left:${r.low}%;width:${r.high - r.low}%"></div><div class="half"></div>` +
    `<div class="mark" style="left:calc(${pct}% - 2px)"></div></div>` +
    `<p class="small">Orange line = our result. Shaded band = where pure chance usually lands (${r.low.toFixed(0)}–${r.high.toFixed(0)}%) for this many answers. ` +
    `The band gets narrower as more visitors take part.</p>` +
    `<p class="note">${verdict(t)}</p>`;
}

// ------------------------------------------------------------------ new visitor
function newVisitor() {
  visitor = { answers: {}, counted: false };
  resetScan();
  $("dob").value = "";
  $("dob2").value = "";
  if (kbReady) resetReadingUI();
  $("expOut").hidden = true;
  $("expOut").innerHTML = "";
  renderQuiz();
  document.querySelectorAll("details:not(.staff)").forEach((d, i) => { d.open = i === 0; });
  if (location.hash && location.hash !== "#home") location.hash = "#home"; else show();
}

// ------------------------------------------------------------------ start
let kbReady = false;

function init() {
  // Buttons that do not need the reading data work straight away.
  const today = todayISO();
  $("dob").max = today;
  $("dob2").max = today;
  initScan();
  renderQuiz();
  $("quiz").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-q]");
    if (!b) return;
    visitor.answers[b.dataset.q] = b.dataset.v;
    renderQuiz();
  });
  $("revealBtn").addEventListener("click", () => {
    if (!kbReady) { alert("Still loading the reading data - try again in a moment."); return; }
    reveal();
  });
  $("clearTally").addEventListener("click", () => {
    if (confirm("Clear all the exhibition counts on this device?")) { clearTally(); renderTally(); }
  });
  $("resetBtn").addEventListener("click", newVisitor);
  $("homeBtn").addEventListener("click", () => { location.hash = "#home"; });
  window.addEventListener("hashchange", show);
  show();

  // Offline support: after one visit, the app (and the AI model) work without internet.
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

  // The knowledge bases: every reading is built only from them.
  $("readBtn").disabled = true;
  loadKB().then((kb) => {
    useAstrology(kb.astro);
    initReadingUI(kb, lastCapture, todayISO);
    kbReady = true;
    $("readBtn").disabled = false;
    if (location.hash === "#reading") onShowReading();
  }).catch(() => {
    document.querySelector("main").insertAdjacentHTML("afterbegin",
      '<p class="note warn"><b>Could not load the reading data.</b> Connect to the internet once and reload.</p>');
  });
}

init();
