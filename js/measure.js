// measure.js - turns MediaPipe's 21 hand points into simple geometry.
//
// MediaPipe gives each point as x and y between 0 and 1 (a fraction of the
// picture's width and height). A picture is usually wider than it is tall, so
// before measuring anything we turn the fractions back into pixels - otherwise
// a sideways distance and an up-down distance would not be on the same scale.
//
// The 21 points (MediaPipe's numbering):
//   0 wrist
//   1-4   thumb   (1 = base ... 4 = tip)
//   5-8   index   (5 = knuckle, 8 = tip)
//   9-12  middle
//   13-16 ring
//   17-20 little finger
//
// Every result is a RATIO or an ANGLE, so it does not change when the hand is
// nearer to or further from the camera. It DOES change when the hand is tilted -
// that is what the repeat test on the scan screen shows.

export const POINTS = {
  WRIST: 0,
  THUMB: [1, 2, 3, 4],
  INDEX: [5, 6, 7, 8],
  MIDDLE: [9, 10, 11, 12],
  RING: [13, 14, 15, 16],
  PINKY: [17, 18, 19, 20],
};

// Lines to draw between points, to make the hand "skeleton".
export const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export function toPixels(landmarks, width, height) {
  return landmarks.map((p) => ({ x: p.x * width, y: p.y * height }));
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Length along a finger: knuckle to joint to joint to tip, added up.
export function fingerLength(pts, ids) {
  let total = 0;
  for (let i = 1; i < ids.length; i++) total += distance(pts[ids[i - 1]], pts[ids[i]]);
  return total;
}

// Angle in degrees between two directions (each from a start point to an end point).
export function angleBetween(a1, a2, b1, b2) {
  const u = { x: a2.x - a1.x, y: a2.y - a1.y };
  const v = { x: b2.x - b1.x, y: b2.y - b1.y };
  const lu = Math.hypot(u.x, u.y);
  const lv = Math.hypot(v.x, v.y);
  if (!lu || !lv) return 0;
  const cos = Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / (lu * lv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// The five measurements shown on the scan screen.
export function measureHand(landmarks, width, height) {
  const p = toPixels(landmarks, width, height);
  const handLength = distance(p[0], p[12]);          // wrist to middle fingertip
  const palmWidth = distance(p[5], p[17]);           // index knuckle to little-finger knuckle
  const indexLen = fingerLength(p, POINTS.INDEX);
  const ringLen = fingerLength(p, POINTS.RING);
  const thumbLen = fingerLength(p, POINTS.THUMB);
  const middleLen = fingerLength(p, POINTS.MIDDLE);
  const palmLength = distance(p[0], p[9]);           // wrist to middle-finger knuckle
  return {
    palmRatio: palmWidth / handLength,
    indexRing: indexLen / ringLen,
    thumbRatio: thumbLen / handLength,
    // index finger direction against little finger direction
    spread: angleBetween(p[5], p[8], p[17], p[20]),

    // Extra shape numbers used only to pick palmistry-book entries
    // (the Cultural view). They are still just geometry.
    palmShape: palmWidth / palmLength,               // nearer 1 = squarer palm
    fingerPalm: middleLen / palmLength,              // long or short fingers for the palm
    thumbIndex: thumbLen / indexLen,                 // thumb length against the index finger
    thumbAngle: angleBetween(p[2], p[4], p[5], p[8]),        // thumb held out from the hand
    gapIndexMiddle: angleBetween(p[5], p[8], p[9], p[12]),   // space between 1st and 2nd fingers
    gapRingLittle: angleBetween(p[13], p[16], p[17], p[20]), // space between 3rd and 4th fingers
  };
}

// Left or right? MediaPipe's own name is used as it is. (Its documentation
// says it assumes a mirrored selfie picture, but our self-test runs it on a
// real photo of a RIGHT palm and it answers "Right" - and "Left" for the
// mirrored copy - so no swapping is needed for an ordinary camera picture.)
// This assumes the PALM faces the camera; the back of the hand flips it.
export function realHandedness(mediapipeName) {
  return mediapipeName === "Left" || mediapipeName === "Right" ? mediapipeName : "Unknown";
}

// For the repeat test: average, smallest, largest and how much the readings
// wobble (spread as a % of the average - smaller means steadier).
export function summarize(values) {
  const n = values.length;
  if (!n) return null;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  return { n, mean, min, max, wobblePct: mean ? (sd / mean) * 100 : 0 };
}
