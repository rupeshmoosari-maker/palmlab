// palmread.js - builds the Cultural Reading from the knowledge bases.
//
// THE RULE: every sentence a visitor sees comes from data/*.json. This file
// only CHOOSES entries (from the AI's measurements and the visitor's answers
// about their palm lines) and arranges them - it never writes a claim of its
// own. "Why this reading?" lists exactly what chose each card.

export const LABELS = ["Experimental measurement", "Traditional interpretation", "Low confidence"];

// A last safety net: a card containing any of these is never shown, even if
// someone later adds such an entry to the JSON by mistake.
export const FORBIDDEN = /\b(death|dead|die|dies|dying|disease|illness|ill|sick|cancer|accident|injur\w*|marr(y|ied|iage)|wives|husband|divorce|exam\w*|money|financ\w*|loss|lose|poverty|poor|rich|riches|wealth|pregnan\w*|child-bearing|suicide|insan\w*|murder\w*|crime|prison|imprisonment)\b/i;

export function isSafe(text) {
  return !FORBIDDEN.test(String(text || ""));
}

// ------------------------------------------------------------------ matching
function test(value, rule) {
  return rule.op === ">=" ? value >= rule.value : value <= rule.value;
}

// Measured entries: which ones does this hand fit, and how firmly?
export function matchMeasured(m, palmKB) {
  if (!m) return [];
  const out = [];
  for (const e of palmKB.entries) {
    const r = e.match;
    if (!r || !r.measure || typeof m[r.measure] !== "number") continue;
    const value = m[r.measure];
    if (!test(value, r)) continue;
    const near = Math.abs(value - r.value) < (r.margin || 0);
    out.push({ entry: e, kind: "measured", value, near,
      why: `${e.measure_label || r.measure} = ${fmt(value)} (cut-off ${r.op} ${r.value})` +
           (near ? " - close to the cut-off" : "") });
  }
  return out;
}

// Line entries from the visitor's answers: { heart: { length: "long" }, ... }
export function matchLines(answers, palmKB) {
  const out = [];
  if (!answers) return out;
  for (const e of palmKB.entries) {
    const r = e.match;
    if (!r || !r.line) continue;
    const said = answers[r.line] && answers[r.line][r.q];
    if (!said) continue;
    const ok = Array.isArray(r.v) ? r.v.includes(said) : r.v === said;
    if (!ok) continue;
    const line = palmKB.lines.find((l) => l.id === r.line);
    const q = line && line.questions.find((x) => x.id === r.q);
    const opt = q && q.options.find((o) => o.v === said);
    out.push({ entry: e, kind: "line",
      why: `You said your ${line ? line.name.toLowerCase() : r.line}: "${opt ? opt.label : said}"` });
  }
  return out;
}

function fmt(v) {
  return Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2);
}

// The label a card carries.
export function confidenceOf(match) {
  if (match.kind === "measured" && (match.near || match.entry.stretch)) return "Low confidence";
  return "Traditional interpretation";
}

// One card from one matched entry: its readings (one per book), the
// contradiction or agreement notice, and its source citations.
export function cardFor(match, palmKB) {
  const e = match.entry;
  const readings = (e.readings || []).filter((r) => isSafe(r.text) && isSafe(r.meaning)).map((r) => ({
    ...r, book: palmKB.sources[r.source],
  }));
  if (!readings.length) return null;
  return {
    id: e.id, feature: e.feature, variation: e.variation,
    confidence: confidenceOf(match),
    relation: e.relation || "single",
    notice: e.relation === "disagree" || e.relation === "differ" ? e.relation_note
          : e.relation === "agree" ? e.relation_note : null,
    readings, why: match.why, stretch: e.stretch || null,
    measured: match.kind === "measured" ? { value: match.value, label: e.measure_label } : null,
  };
}

// ------------------------------------------------------------------ the reading
// Pick 2-4 cards: the star sign and birth number when a birthday is given,
// then palm cards - the visitor's own line answers first (they are surer than
// a borderline measurement), firm measurements next, low-confidence ones last.
export function composeReading({ measures, answers, dob }, palmKB, maxCards = 4) {
  const lineMatches = matchLines(answers, palmKB);
  const measuredMatches = matchMeasured(measures, palmKB);
  const withheld = [...lineMatches, ...measuredMatches]
    .filter((x) => x.entry.withheld)
    .map((x) => ({ feature: x.entry.feature, variation: x.entry.variation, note: x.entry.withheld_note, why: x.why }));

  const palmCards = [];
  const rank = (m) => (m.kind === "line" ? 0 : confidenceOf(m) === "Low confidence" ? 2 : 1);
  const candidates = [...lineMatches, ...measuredMatches].filter((x) => !x.entry.withheld).sort((a, b) => rank(a) - rank(b));
  const seen = new Set();
  for (const m of candidates) {
    if (seen.has(m.entry.feature + "|" + m.entry.variation)) continue;
    const c = cardFor(m, palmKB);
    if (c) { palmCards.push(c); seen.add(m.entry.feature + "|" + m.entry.variation); }
  }

  const birth = dob ? 2 : 0;                 // sign + number
  const palmRoom = Math.max(0, maxCards - birth);
  const chosenPalm = palmCards.slice(0, Math.max(palmRoom, dob ? 0 : maxCards));
  const notShown = palmCards.slice(chosenPalm.length).map((c) => `${c.feature}: ${c.variation}`);
  return { palmCards: chosenPalm, notShown, withheld, allPalmMatches: palmCards.length };
}

// A one-paragraph summary, assembled only from the "meaning" words of the
// chosen cards and the sign's traits - no new words about the person.
export function summaryLine(birth, palmCards) {
  const bits = [];
  if (birth) {
    bits.push(`${birth.sign.name}: ${birth.sign.traits.join(", ")}`);
    bits.push(`birth number ${birth.number}, ${birth.numberName}`);
  }
  for (const c of palmCards) {
    bits.push(`${c.feature.toLowerCase()} (${c.variation}): ${c.readings.map((r) => r.meaning).join(" / ")}`);
  }
  return bits.length ? "Traditionally - " + bits.join("; ") + "." : "";
}
