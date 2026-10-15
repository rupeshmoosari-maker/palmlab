// readingui.js - the Palm & Star Reading screen and the Sources & Literature screen.
// Two clearly separate views:
//   Scientific view - only the AI's measurements, labelled "Experimental measurement".
//   Cultural view   - traditional meanings from the knowledge bases, every card cited.

import { fullReading } from "./reading.js";
import { composeReading, summaryLine } from "./palmread.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let KB = null;
let getScan = () => null;
let answers = {};          // { heart: { length: "long" }, ... } - this visitor only

// What each measurement is, for the Scientific view.
const SCI = [
  ["palmRatio", "Palm width ÷ hand length", 2, ""],
  ["indexRing", "Index finger ÷ ring finger", 2, ""],
  ["thumbRatio", "Thumb length ÷ hand length", 2, ""],
  ["spread", "Finger spread (index to little finger)", 0, "°"],
  ["palmShape", "Palm width ÷ palm length", 2, ""],
  ["fingerPalm", "Middle finger ÷ palm length", 2, ""],
  ["thumbIndex", "Thumb ÷ index finger", 2, ""],
  ["thumbAngle", "Angle between thumb and index finger", 0, "°"],
  ["gapIndexMiddle", "Angle between index and middle finger", 0, "°"],
  ["gapRingLittle", "Angle between ring and little finger", 0, "°"],
];

function badge(label) {
  const cls = label === "Experimental measurement" ? "b-exp" : label === "Low confidence" ? "b-low" : "b-trad";
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function cite(book, where) {
  return `<p class="cite">📖 ${esc(book.short)}, <i>${esc(book.title)}</i> (${book.year}) - ${esc(where)}</p>`;
}

// ------------------------------------------------------------------ views
function setView(v) {
  const sci = v === "science";
  $("viewScience").hidden = !sci;
  $("viewCulture").hidden = sci;
  $("vtScience").setAttribute("aria-selected", String(sci));
  $("vtCulture").setAttribute("aria-selected", String(!sci));
  $("vtScience").classList.toggle("on", sci);
  $("vtCulture").classList.toggle("on", !sci);
  if (sci) renderScience();
}

function renderScience() {
  const scan = getScan();
  $("sciNone").hidden = !!scan;
  if (!scan) { $("sciCards").innerHTML = ""; return; }
  const rows = SCI.filter(([k]) => typeof scan.m[k] === "number").map(([k, name, d, unit]) =>
    `<div class="card"><div class="k">${esc(name)}</div><div class="v">${scan.m[k].toFixed(d)}${unit}</div>${badge("Experimental measurement")}</div>`);
  rows.push(`<div class="card"><div class="k">Which hand?</div><div class="v">${esc(scan.hand)}</div>${badge("Experimental measurement")}` +
    `<div class="e">${scan.averaged ? "Average of the repeat test." : "From one capture."} The AI's points are joints, not skin creases; tilting the hand changes these numbers.</div></div>`);
  $("sciCards").innerHTML = rows.join("");
}

function renderScanUse() {
  const scan = getScan();
  $("scanUse").innerHTML = scan
    ? `✅ Using your ${esc(scan.hand.toLowerCase())} hand scan${scan.averaged ? " (repeat-test average)" : ""} for hand shape, fingers and thumb.`
    : `No hand scan yet - <a href="#scan">scan your hand</a> to add hand-shape readings, or carry on without.`;
}

// ------------------------------------------------------------------ line picker
function renderPicker() {
  $("linePicker").innerHTML = KB.palm.lines.map((line) => {
    const qs = line.questions.map((q) =>
      `<div class="pq"><p>${esc(q.text)}</p><div class="chips">` +
      q.options.map((o) => {
        const on = answers[line.id] && answers[line.id][q.id] === o.v;
        return `<button class="chip${on ? " on" : ""}" aria-pressed="${on}" data-line="${line.id}" data-q="${q.id}" data-v="${o.v}">${esc(o.label)}</button>`;
      }).join("") + `</div></div>`).join("");
    const n = Object.keys(answers[line.id] || {}).length;
    return `<details class="linebox"><summary>${esc(line.name)}${n ? ` <span class="count">${n} chosen</span>` : ""}</summary>` +
      `<p class="small">📍 ${esc(line.where)}</p>` +
      `<p class="small">Cheiro calls it the <b>${esc(line.names.cheiro)}</b>; Dale calls it the <b>${esc(line.names.dale)}</b>.</p>` +
      qs + `</details>`;
  }).join("");
}

function onChip(e) {
  const b = e.target.closest("button.chip");
  if (!b) return;
  const { line, q, v } = b.dataset;
  answers[line] = answers[line] || {};
  if (answers[line][q] === v) delete answers[line][q]; else answers[line][q] = v;   // tap again to un-choose
  const open = [...document.querySelectorAll("#linePicker details")].map((d) => d.open);
  renderPicker();
  document.querySelectorAll("#linePicker details").forEach((d, i) => { d.open = open[i]; });
}

// ------------------------------------------------------------------ the reading
function validDate(v, today) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= "1920-01-01" && v <= today;
}

function palmCardHTML(c) {
  const many = c.readings.length > 1;
  const notice = c.relation === "agree"
    ? `<p class="agree">🤝 <b>The books agree.</b> ${esc(c.notice || "")}</p>`
    : (c.relation === "disagree" || c.relation === "differ")
      ? `<p class="clash">⚖️ <b>Traditions disagree.</b> ${esc(c.notice || "")}</p>` : "";
  const readings = c.readings.map((r) =>
    `<div class="reading-src"><p><b>${esc(r.meaning)}</b></p><p>${esc(r.text)}</p>${cite(r.book, r.where)}</div>`).join("");
  return `<div class="card palmcard"><div class="k">🖐️ ${esc(c.feature)} - ${esc(c.variation)}</div>` +
    `${badge(c.confidence)}${c.measured ? ` ${badge("Experimental measurement")}` : ""}` +
    notice + `<div class="${many ? "sidebyside" : ""}">${readings}</div>` +
    (c.confidence === "Low confidence"
      ? `<p class="small">Low confidence: ${esc(c.stretch || "the measurement was close to the cut-off.")}</p>` : "") +
    `</div>`;
}

function birthCardsHTML(r) {
  const astro = KB.astro.traditions;
  const c = r.chinese;
  return [
    `<div class="card"><div class="emoji">${r.sign.symbol}</div><div class="k">Star sign: ${esc(r.sign.name)}</div>${badge("Traditional interpretation")}` +
      `<p>${esc(r.sign.text)}</p><p class="cite">📖 ${esc(astro.western.name)}</p></div>`,
    `<div class="card"><div class="emoji">🔢</div><div class="k">Birth number ${r.number}: ${esc(r.numberName)}</div>${badge("Traditional interpretation")}` +
      `<p>${esc(r.numberText)}</p><p class="small">${c.animal.emoji} Chinese zodiac: <b>${esc(c.animal.name)}</b> - ${esc(c.animal.text)}` +
      (c.maybe ? ` (or ${esc(c.maybe.name)}, depending on the Lunar New Year date)` : "") + `</p>` +
      `<p class="cite">📖 ${esc(astro.numerology.name)}; ${esc(astro.chinese.name)}</p></div>`,
  ].join("");
}

function whyHTML(r, dobStr, out) {
  const li = [];
  if (r) {
    const s = r.sign;
    const mon = (m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
    li.push(`📅 Birthday ${esc(dobStr)} falls between ${s.from[1]} ${mon(s.from[0])} and ${s.to[1]} ${mon(s.to[0])} → <b>${esc(s.name)}</b> (${esc(s.element)} sign).`);
    li.push(`🔢 Birth number: ${r.numberSteps.map(esc).join(" → ")} → <b>${r.number}</b>.`);
    li.push(`🐉 Chinese zodiac: year ${r.chinese.year} → <b>${esc(r.chinese.animal.name)}</b> (2020 was a Rat year; count on in steps of 12).`);
  }
  for (const c of out.palmCards) li.push(`🖐️ <b>${esc(c.feature)} - ${esc(c.variation)}</b>: ${esc(c.why)}.`);
  let h = `<ul>${li.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  if (out.notShown.length) h += `<p class="small">Also matched, but left off to keep the reading short: ${out.notShown.map(esc).join("; ")}.</p>`;
  if (out.withheld.length) {
    h += `<p><b>Left out on purpose:</b></p><ul>` +
      out.withheld.map((w) => `<li>${esc(w.feature)} - ${esc(w.variation)}: ${esc(w.note)}</li>`).join("") + `</ul>`;
  }
  h += `<p class="small">Nothing in this reading was written by an AI. Every sentence comes from <code>data/palmistry_knowledge.json</code> or <code>data/astrology_knowledge.json</code>.</p>`;
  return h;
}

function makeReading(today) {
  const dobStr = $("dob").value;
  const hasDob = validDate(dobStr, today);
  if (dobStr && !hasDob) { alert("Please choose a real date of birth, or clear it."); return; }
  const scan = getScan();
  const r = hasDob ? fullReading(dobStr) : null;
  const out = composeReading({ measures: scan && scan.m, answers, dob: hasDob }, KB.palm);
  const total = (r ? 2 : 0) + out.palmCards.length;
  if (total === 0) {
    alert("Add your date of birth, a hand scan, or choose something about your palm lines first.");
    return;
  }
  const birthHTML = r ? birthCardsHTML(r) : "";
  const cardsHTML = birthHTML + out.palmCards.map(palmCardHTML).join("");
  $("readingSummary").textContent = summaryLine(r, out.palmCards) +
    (total < 2 ? " Only one card matched - add your birthday or more palm lines for a fuller reading." : "");
  $("readingCards").innerHTML = cardsHTML;
  $("whyOut").innerHTML = whyHTML(r, dobStr, out);
  $("whyBox").open = false;
  $("readingOut").hidden = false;
  $("readingOut").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ------------------------------------------------------------------ sources screen
function renderSources() {
  const P = KB.palm;
  const books = Object.values(P.sources).map((b) =>
    `<div class="card"><div class="k">📖 ${esc(b.title)} (${b.year})</div><p>${esc(b.author)}</p>` +
    `<p class="small">Tradition: ${esc(b.tradition)}. ${esc(b.note)}</p>` +
    `<p><a href="${esc(b.url)}" target="_blank" rel="noopener">Read it free on Project Gutenberg ↗</a></p></div>`).join("");
  const names = P.lines.map((l) =>
    `<tr><td>${esc(l.name)}</td><td>${esc(l.names.cheiro)}</td><td>${esc(l.names.dale)}</td></tr>`).join("");
  const rel = (kind) => P.entries.filter((e) => e.relation === kind || (kind === "disagree" && e.relation === "differ"));
  const clashes = rel("disagree").map((e) => `<li><b>${esc(e.feature)} - ${esc(e.variation)}:</b> ${esc(e.relation_note)}</li>`).join("");
  const agrees = rel("agree").map((e) => `<li><b>${esc(e.feature)} - ${esc(e.variation)}:</b> ${esc(e.relation_note)}</li>`).join("");
  const left = P.left_out.map((x) => `<li><b>${esc(x.topic)}.</b> ${esc(x.detail)}</li>`).join("");
  const labels = Object.entries(P.labels).map(([k, v]) => `<li>${badge(k)} ${esc(v)}</li>`).join("");
  $("sourcesOut").innerHTML =
    `<h3>The two books</h3>${books}` +
    `<h3>Traditions don't agree - not even on names</h3>` +
    `<p>Interpretations differ between palmistry traditions, and even between two books of the same time.</p>` +
    `<div class="tablewrap"><table><tr><th>Line</th><th>Cheiro</th><th>Dale</th></tr>${names}</table></div>` +
    `<h3>⚖️ Where the books disagree</h3><ul>${clashes}</ul>` +
    `<h3>🤝 Where they agree</h3><ul>${agrees}</ul>` +
    `<p class="small">When two books agree, that still does not make a meaning true - they could be repeating the same older writers.</p>` +
    `<h3>🚫 What this app leaves out, and why</h3><ul>${left}</ul>` +
    `<h3>🏷️ The three labels</h3><ul class="labels">${labels}</ul>` +
    `<h3>Astrology and numerology</h3><ul>` +
    Object.values(KB.astro.traditions).map((t) => `<li><b>${esc(t.name)}.</b> ${esc(t.note)}</li>`).join("") + `</ul>` +
    `<p class="small">All meanings in this app are short summaries in our own words, not copied passages.</p>`;
}

// ------------------------------------------------------------------ wiring
export function initReadingUI(kb, scanGetter, todayISO) {
  KB = kb;
  getScan = scanGetter;
  renderPicker();
  renderSources();
  $("linePicker").addEventListener("click", onChip);
  $("vtScience").addEventListener("click", () => setView("science"));
  $("vtCulture").addEventListener("click", () => setView("culture"));
  $("readBtn").addEventListener("click", () => makeReading(todayISO()));
}

export function onShowReading() {
  renderScanUse();
  if (!$("viewScience").hidden) renderScience();
}

export function resetReadingUI() {
  answers = {};
  if (!KB) return;
  renderPicker();
  $("readingOut").hidden = true;
  $("readingCards").innerHTML = "";
  $("readingSummary").textContent = "";
  $("whyOut").innerHTML = "";
  setView("culture");
}
