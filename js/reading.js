// reading.js - birthday arithmetic for the Cultural Reading.
//
// Everything here is TRADITION, not science. The sign, number and animal are
// simple calendar arithmetic; the words come ONLY from
// data/astrology_knowledge.json (see kb.js). Nothing is made up here.

let A = null; // the astrology knowledge base, set by useAstrology()

export function useAstrology(kb) {
  A = kb;
}

function need() {
  if (!A) throw new Error("astrology knowledge base not loaded");
  return A;
}

// Western sign from month (1-12) and day: the last sign that has started.
export function westernSign(month, day) {
  const order = [...need().signs].sort((a, b) => a.from[0] - b.from[0] || a.from[1] - b.from[1]);
  let sign = order[order.length - 1]; // before 20 January it is still Capricorn
  for (const s of order) {
    if (month > s.from[0] || (month === s.from[0] && day >= s.from[1])) sign = s;
  }
  return sign;
}

// Numerology "birth number": add all the digits of the date, again and again,
// until one digit is left. 2012-03-14 -> 2+0+1+2+0+3+1+4 = 13 -> 1+3 = 4.
export function birthNumber(year, month, day) {
  let s = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  let n = 0;
  const steps = [];
  do {
    n = [...s].reduce((t, ch) => t + Number(ch), 0);
    steps.push(`${[...s].join("+")} = ${n}`);
    s = String(n);
  } while (n > 9);
  birthNumber.lastSteps = steps;
  return n;
}

function animalOfYear(y) {
  const animals = need().animals;
  return animals[(((y - 4) % 12) + 12) % 12];
}

// Chinese zodiac animal. 2020 was a Rat year, so (year - 4) % 12 = 0 is the Rat.
// The Chinese year starts at the Lunar New Year (between 21 January and
// 20 February), so a birthday in that window may belong to the year before.
export function chineseAnimal(year, month, day) {
  if (month === 1 && day < 21) return { animal: animalOfYear(year - 1), maybe: null, year: year - 1 };
  const nearNewYear = (month === 1 && day >= 21) || (month === 2 && day <= 20);
  return { animal: animalOfYear(year), maybe: nearNewYear ? animalOfYear(year - 1) : null, year };
}

export function elementPredicts(element) {
  return need().element_predicts[element];
}

export function fullReading(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  if (!year || !month || !day) return null;
  const sign = westernSign(month, day);
  const number = birthNumber(year, month, day);
  const numberSteps = birthNumber.lastSteps.slice();
  const chinese = chineseAnimal(year, month, day);
  const num = need().numbers[String(number)];
  return { year, month, day, sign, number, numberText: num.text, numberName: num.name, numberSteps,
           chinese, predicts: elementPredicts(sign.element) };
}
