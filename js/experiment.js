// experiment.js - the Mini Experiment: does the star sign predict what
// visitors say about themselves?
//
// HOW IT IS FAIR. The visitor answers the three questions FIRST, before seeing
// any reading, so the reading cannot nudge their answers. Each question has
// two choices, so a blind guess is right half the time. If astrology really
// predicted these things, the matches over many visitors should be clearly
// MORE than half.
//
// WHAT IS KEPT. Only three counts, on this one device (the browser's local
// storage): visitors, answers, matches. No names, no birthdays, no photos.

export const QUESTIONS = [
  { key: "subject", text: "Do you prefer logical subjects or creative subjects?",
    a: { value: "logical", label: "🧮 Logical" }, b: { value: "creative", label: "🎨 Creative" } },
  { key: "energy", text: "Do you describe yourself as more calm or energetic?",
    a: { value: "calm", label: "🌊 Calm" }, b: { value: "energetic", label: "⚡ Energetic" } },
  { key: "work", text: "Do you prefer working alone or in a group?",
    a: { value: "alone", label: "🧍 Alone" }, b: { value: "group", label: "👥 Group" } },
];

export function compare(answers, predicts) {
  const rows = QUESTIONS.map((q) => ({
    question: q.text, said: answers[q.key], predicted: predicts[q.key],
    match: answers[q.key] === predicts[q.key],
  }));
  return { rows, matches: rows.filter((r) => r.match).length, total: rows.length };
}

const KEY = "palmlab.tally.v1";

export function readTally(storage = globalThis.localStorage) {
  try {
    const t = JSON.parse(storage.getItem(KEY) || "null");
    if (t && Number.isFinite(t.visitors)) return t;
  } catch (e) { /* private mode or blocked storage: start from zero */ }
  return { visitors: 0, answers: 0, matches: 0 };
}

export function addToTally(result, storage = globalThis.localStorage) {
  const t = readTally(storage);
  t.visitors += 1;
  t.answers += result.total;
  t.matches += result.matches;
  try { storage.setItem(KEY, JSON.stringify(t)); } catch (e) { /* still shown for this visit */ }
  return t;
}

export function clearTally(storage = globalThis.localStorage) {
  try { storage.removeItem(KEY); } catch (e) { /* nothing to clear */ }
}

// The range that pure chance usually lands in (about 95 times out of 100)
// for this many answers: 50% plus or minus about two "standard errors".
export function chanceRange(answers) {
  if (!answers) return null;
  const half = 1.96 * Math.sqrt(0.25 / answers) * 100;
  return { low: Math.max(0, 50 - half), high: Math.min(100, 50 + half) };
}

export function verdict(tally) {
  if (tally.answers < 30) return "Too few answers yet - chance can easily look like a pattern. Keep collecting!";
  const pct = (100 * tally.matches) / tally.answers;
  const r = chanceRange(tally.answers);
  if (pct > r.high) return "Matches are ABOVE the chance range. Interesting! Scientists would now repeat the test with new people before believing it.";
  if (pct < r.low) return "Matches are BELOW the chance range - the tradition did worse than guessing.";
  return "Matches are INSIDE the chance range: the star sign did no better than tossing a coin.";
}
