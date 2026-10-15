// reading.js - the "Fun Cultural Reading".
//
// Everything here is TRADITION, not science. The sign, number and animal are
// simple calendar arithmetic; the words that go with them are the kind of
// friendly, general sentences that traditions use. They are kept positive on
// purpose: nothing about health, death, accidents, money, marriage or exams.

export const SIGNS = [
  // name, symbol, from (month, day), element, reading
  { name: "Capricorn", symbol: "♑", from: [12, 22], element: "Earth",
    text: "Tradition says Capricorns are patient climbers who finish what they start. You may enjoy making a plan and ticking it off step by step." },
  { name: "Aquarius", symbol: "♒", from: [1, 20], element: "Air",
    text: "Tradition says Aquarians are inventors with original ideas. You may enjoy asking “what if?” and trying things a new way." },
  { name: "Pisces", symbol: "♓", from: [2, 19], element: "Water",
    text: "Tradition says Pisceans are kind dreamers with big imaginations. You may notice how other people feel and enjoy stories and music." },
  { name: "Aries", symbol: "♈", from: [3, 21], element: "Fire",
    text: "Tradition says Aries people are brave starters who like to go first. You may enjoy a challenge and cheering others on." },
  { name: "Taurus", symbol: "♉", from: [4, 20], element: "Earth",
    text: "Tradition says Taureans are calm and steady, and they love good food and nature. You may be the friend others can rely on." },
  { name: "Gemini", symbol: "♊", from: [5, 21], element: "Air",
    text: "Tradition says Geminis are curious talkers who love learning new facts. You may enjoy puzzles, jokes and big conversations." },
  { name: "Cancer", symbol: "♋", from: [6, 21], element: "Water",
    text: "Tradition says Cancerians are caring and loyal to family and friends. You may make people feel at home." },
  { name: "Leo", symbol: "♌", from: [7, 23], element: "Fire",
    text: "Tradition says Leos are warm and confident, with a big heart. You may enjoy leading a team or performing on a stage." },
  { name: "Virgo", symbol: "♍", from: [8, 23], element: "Earth",
    text: "Tradition says Virgos are careful and helpful and notice small details. You may enjoy making things neat and correct." },
  { name: "Libra", symbol: "♎", from: [9, 23], element: "Air",
    text: "Tradition says Librans are fair and friendly and love balance. You may be good at helping two sides agree." },
  { name: "Scorpio", symbol: "♏", from: [10, 23], element: "Water",
    text: "Tradition says Scorpios are determined and loyal, with deep feelings. You may enjoy solving mysteries." },
  { name: "Sagittarius", symbol: "♐", from: [11, 22], element: "Fire",
    text: "Tradition says Sagittarians are cheerful explorers who love adventure. You may enjoy travel, sport and big questions." },
];

// Western sign from month (1-12) and day.
export function westernSign(month, day) {
  // Walk backwards through the start dates: the sign is the last one that has started.
  const order = [...SIGNS].sort((a, b) => a.from[0] - b.from[0] || a.from[1] - b.from[1]);
  let sign = order[order.length - 1]; // before Jan 20 it is still Capricorn
  for (const s of order) {
    if (month > s.from[0] || (month === s.from[0] && day >= s.from[1])) sign = s;
  }
  return sign;
}

export const NUMBERS = {
  1: "Number 1 is called the leader: someone who likes to start new things.",
  2: "Number 2 is called the peacemaker: someone who is good at teamwork.",
  3: "Number 3 is called the creator: someone who enjoys art, words and fun.",
  4: "Number 4 is called the builder: someone who likes order and hard work.",
  5: "Number 5 is called the adventurer: someone who loves change and freedom.",
  6: "Number 6 is called the helper: someone who cares for others.",
  7: "Number 7 is called the thinker: someone who likes deep questions.",
  8: "Number 8 is called the organiser: someone who likes big goals.",
  9: "Number 9 is called the dreamer: someone who wants to make the world kinder.",
};

// Numerology "birth number": add all the digits of the date, again and again,
// until one digit is left. 2012-03-14 -> 2+0+1+2+0+3+1+4 = 13 -> 1+3 = 4.
export function birthNumber(year, month, day) {
  let s = `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  let n = 0;
  do {
    n = [...s].reduce((t, ch) => t + Number(ch), 0);
    s = String(n);
  } while (n > 9);
  return n;
}

export const ANIMALS = [
  { name: "Rat", emoji: "🐀", text: "The Rat is said to be quick-thinking and clever." },
  { name: "Ox", emoji: "🐂", text: "The Ox is said to be strong, patient and hard-working." },
  { name: "Tiger", emoji: "🐅", text: "The Tiger is said to be brave and full of energy." },
  { name: "Rabbit", emoji: "🐇", text: "The Rabbit is said to be gentle, kind and polite." },
  { name: "Dragon", emoji: "🐉", text: "The Dragon is said to be confident and full of ideas." },
  { name: "Snake", emoji: "🐍", text: "The Snake is said to be wise and calm." },
  { name: "Horse", emoji: "🐎", text: "The Horse is said to be lively and love freedom." },
  { name: "Goat", emoji: "🐐", text: "The Goat is said to be creative and caring." },
  { name: "Monkey", emoji: "🐒", text: "The Monkey is said to be playful and smart." },
  { name: "Rooster", emoji: "🐓", text: "The Rooster is said to be honest and hard-working." },
  { name: "Dog", emoji: "🐕", text: "The Dog is said to be loyal and fair." },
  { name: "Pig", emoji: "🐖", text: "The Pig is said to be generous and friendly." },
];

// Chinese zodiac animal. 2020 was a Rat year, so (year - 4) % 12 = 0 is the Rat.
// The Chinese year starts at the Lunar New Year (between 21 January and
// 20 February), so a birthday in that window may belong to the year before.
function animalOfYear(y) {
  return ANIMALS[(((y - 4) % 12) + 12) % 12];
}

export function chineseAnimal(year, month, day) {
  // Before 21 January the new year has certainly not started yet.
  if (month === 1 && day < 21) return { animal: animalOfYear(year - 1), maybe: null };
  const nearNewYear = (month === 1 && day >= 21) || (month === 2 && day <= 20);
  // In the window it depends on that year's exact Lunar New Year date.
  return { animal: animalOfYear(year), maybe: nearNewYear ? animalOfYear(year - 1) : null };
}

// What the TRADITION would "predict" for each element, used by the experiment.
// These are common stereotypes from popular astrology, written down BEFORE
// the visitor's answers are seen.
export const ELEMENT_PREDICTS = {
  Fire:  { subject: "creative", energy: "energetic", work: "group" },
  Earth: { subject: "logical",  energy: "calm",      work: "alone" },
  Air:   { subject: "logical",  energy: "energetic", work: "group" },
  Water: { subject: "creative", energy: "calm",      work: "alone" },
};

export function fullReading(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return null;
  const sign = westernSign(month, day);
  const number = birthNumber(year, month, day);
  const chinese = chineseAnimal(year, month, day);
  return { year, month, day, sign, number, numberText: NUMBERS[number], chinese,
           predicts: ELEMENT_PREDICTS[sign.element] };
}
