// scan.js - camera + MediaPipe Hand Landmarker + the measurement screen.
//
// PRIVACY: frames from the camera go straight from the <video> element into
// the AI model, which runs inside this browser tab. No frame is drawn into an
// image file, stored, or sent anywhere. Only the 21 dots are kept, and only
// until "New Visitor".

import { FilesetResolver, HandLandmarker } from "../vendor/tasks-vision/vision_bundle.js";
import { BONES, measureHand, realHandedness, summarize } from "./measure.js";

const $ = (id) => document.getElementById(id);

const WASM_DIR = new URL("../vendor/tasks-vision/wasm", import.meta.url).href;
const MODEL = new URL("../models/hand_landmarker.task", import.meta.url).href;

const S = {
  landmarker: null, loading: null, stream: null, facing: "environment",
  raf: 0, lastVideoTime: -1, latest: null, captured: null, repeat: null,
};

const MEASURES = [
  { key: "palmRatio", name: "Palm width ÷ hand length", digits: 2,
    explain: "How wide your palm is (across the knuckles) compared with how long your whole hand is. Every hand is different - compare with a friend!" },
  { key: "indexRing", name: "Index finger ÷ ring finger", digits: 2,
    explain: "Scientists study this “2D:4D” ratio. Real studies measure from the skin crease at the finger's base; the AI uses the knuckle joint, so this is only an estimate." },
  { key: "thumbRatio", name: "Thumb length ÷ hand length", digits: 2,
    explain: "How long your thumb is (from its base joint to the tip) compared with your whole hand." },
  { key: "spread", name: "Finger spread", digits: 0, unit: "°",
    explain: "The angle between your index finger and little finger. Spread your fingers wide and capture again - this one changes a lot!" },
];

// ------------------------------------------------------------------ model
async function loadModel() {
  if (S.landmarker) return S.landmarker;
  if (S.loading) return S.loading;
  S.loading = (async () => {
    const files = await FilesetResolver.forVisionTasks(WASM_DIR);
    const make = (delegate) => HandLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate },
      runningMode: "VIDEO", numHands: 1,
      minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.5,
    });
    try {
      S.landmarker = await make("GPU");
    } catch (e) {
      S.landmarker = await make("CPU"); // older phones without WebGL2
    }
    return S.landmarker;
  })();
  try {
    return await S.loading;
  } finally {
    S.loading = null;
  }
}

// ------------------------------------------------------------------ camera
function status(text) { $("scanStatus").textContent = text; }

function showHelp(html) {
  const box = $("camHelp");
  box.innerHTML = html;
  box.hidden = !html;
}

async function startCamera() {
  showHelp("");
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    showHelp("<b>The camera needs a secure (https://) page.</b> Open the app from its https:// link, " +
      "or from <b>localhost</b> on a computer.");
    return;
  }
  $("startCam").disabled = true;
  status("⏳ Waking up the AI… (the first time it downloads about 8 MB)");
  try {
    await loadModel();
  } catch (e) {
    status("");
    showHelp("<b>The AI model could not load.</b> Check the internet connection once, then try again. " +
      "After one successful load it works offline.");
    $("startCam").disabled = false;
    return;
  }
  status("📷 Asking for the camera…");
  try {
    stopCamera();
    S.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: S.facing }, width: { ideal: 960 }, height: { ideal: 1280 } },
    });
  } catch (e) {
    $("startCam").disabled = false;
    status("");
    if (e && (e.name === "NotAllowedError" || e.name === "SecurityError")) {
      showHelp(
        "<b>Camera permission was not given.</b> That's OK - you can still use the Cultural Reading, Experiment and Learn pages.<br>" +
        "To allow it:<br>• <b>Android (Chrome):</b> tap the 🔒 or ⓘ left of the web address → Permissions → Camera → Allow, then reload.<br>" +
        "• <b>iPhone (Safari):</b> tap <b>aA</b> in the address bar → Website Settings → Camera → Allow, then reload. " +
        "(Or Settings → Safari → Camera → Ask.)");
    } else if (e && e.name === "NotFoundError") {
      showHelp("<b>No camera was found</b> on this device.");
    } else if (e && e.name === "NotReadableError") {
      showHelp("<b>The camera is busy.</b> Close other apps that use the camera (video calls, camera app) and try again.");
    } else {
      showHelp("<b>The camera could not start.</b> " + (e && e.message ? e.message : ""));
    }
    return;
  }
  const video = $("video");
  video.srcObject = S.stream;
  await video.play().catch(() => {});
  const settings = S.stream.getVideoTracks()[0].getSettings();
  const front = settings.facingMode === "user" || (S.facing === "user" && !settings.facingMode);
  $("stage").classList.toggle("mirror", front);
  $("stageMsg").textContent = "Show an open palm inside the outline, fingers apart, in good light.";
  $("startCam").hidden = true;
  $("flipCam").hidden = false;
  $("captureBtn").disabled = false;
  $("repeatBtn").disabled = false;
  status("Looking for a hand…");
  S.lastVideoTime = -1;
  loop();
}

export function stopCamera() {
  cancelAnimationFrame(S.raf);
  S.raf = 0;
  if (S.stream) S.stream.getTracks().forEach((t) => t.stop());
  S.stream = null;
  S.latest = null;
  const video = $("video");
  if (video) video.srcObject = null;
  const c = $("overlay");
  if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
  if ($("startCam")) {
    $("startCam").hidden = false;
    $("startCam").disabled = false;
    $("flipCam").hidden = true;
    $("captureBtn").disabled = true;
    $("repeatBtn").disabled = true;
    $("guide").style.display = "";
    $("stageMsg").innerHTML = "Tap <b>Start camera</b>, then show an open palm inside the outline.";
  }
}

// ------------------------------------------------------------------ live loop
function loop() {
  const video = $("video");
  if (!S.stream) return;
  if (video.readyState >= 2 && video.currentTime !== S.lastVideoTime && S.landmarker) {
    S.lastVideoTime = video.currentTime;
    const w = video.videoWidth, h = video.videoHeight;
    const res = S.landmarker.detectForVideo(video, performance.now());
    const lms = res.landmarks && res.landmarks[0];
    if (lms) {
      const cat = res.handedness && res.handedness[0] && res.handedness[0][0];
      S.latest = { landmarks: lms.map((p) => ({ x: p.x, y: p.y })), w, h,
                   hand: realHandedness(cat && cat.categoryName), sure: cat ? cat.score : null,
                   mirror: $("stage").classList.contains("mirror") };
      $("guide").style.display = "none";
      status(`✅ ${S.latest.hand} hand found - hold still and tap Capture`);
    } else {
      S.latest = null;
      $("guide").style.display = "";
      status("Looking for a hand… open palm, fingers apart, good light.");
    }
    draw(lms, w, h);
  }
  S.raf = requestAnimationFrame(loop);
}

function draw(lms, w, h) {
  const c = $("overlay");
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const g = c.getContext("2d");
  g.clearRect(0, 0, w, h);
  if (!lms) return;
  const r = Math.max(4, Math.round(Math.min(w, h) / 90));
  g.lineWidth = r * 0.8;
  g.strokeStyle = "rgba(255,255,255,0.9)";
  for (const [a, b] of BONES) {
    g.beginPath();
    g.moveTo(lms[a].x * w, lms[a].y * h);
    g.lineTo(lms[b].x * w, lms[b].y * h);
    g.stroke();
  }
  lms.forEach((p, i) => {
    g.beginPath();
    g.arc(p.x * w, p.y * h, i === 0 ? r * 1.4 : r, 0, Math.PI * 2);
    g.fillStyle = i === 0 ? "#ffd400" : (i % 4 === 0 ? "#ff4fa3" : "#29e3d4");
    g.fill();
  });
}

// ------------------------------------------------------------------ capture
function fmt(v, m) { return v.toFixed(m.digits) + (m.unit || ""); }

function capture() {
  if (!S.latest) {
    status("🖐️ No hand in view yet - show your open palm first.");
    return null;
  }
  const snap = S.latest;
  const m = measureHand(snap.landmarks, snap.w, snap.h);
  S.captured = { ...snap, m };
  renderCapture();
  return S.captured;
}

function renderCapture() {
  const c = S.captured;
  const cards = MEASURES.map((m) =>
    `<div class="card"><div class="k">${m.name}</div><div class="v">${fmt(c.m[m.key], m)}</div><div class="e">${m.explain}</div></div>`);
  cards.push(`<div class="card"><div class="k">Which hand?</div><div class="v">${c.hand === "Unknown" ? "Not sure" : c.hand + " hand"}</div>` +
    `<div class="e">The AI was ${c.sure != null ? Math.round(c.sure * 100) + "%" : "not"} sure. It assumes the <b>palm</b> faces the camera - ` +
    `show the back of your hand and it gets left and right the wrong way round!</div></div>`);
  $("measureCards").innerHTML = cards.join("");
  drawDiagram(c);
  $("scanResults").hidden = false;
  $("rulerBox").hidden = false;
}

function drawDiagram(c) {
  const pts = c.landmarks.map((p) => ({ x: (c.mirror ? 1 - p.x : p.x) * c.w, y: p.y * c.h }));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 240, H = 280, pad = 20;
  const k = Math.min((W - 2 * pad) / (maxX - minX || 1), (H - 2 * pad) / (maxY - minY || 1));
  const ox = (W - (maxX - minX) * k) / 2, oy = (H - (maxY - minY) * k) / 2;
  const P = pts.map((p) => ({ x: ox + (p.x - minX) * k, y: oy + (p.y - minY) * k }));
  let s = "";
  for (const [a, b] of BONES) {
    s += `<line x1="${P[a].x.toFixed(1)}" y1="${P[a].y.toFixed(1)}" x2="${P[b].x.toFixed(1)}" y2="${P[b].y.toFixed(1)}" stroke="#5b2bd6" stroke-width="4" stroke-linecap="round"/>`;
  }
  P.forEach((p, i) => {
    s += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${i === 0 ? 8 : 6}" fill="${i === 0 ? "#ffb400" : i % 4 === 0 ? "#e5267f" : "#0fb5a8"}"/>`;
    s += `<text x="${(p.x + 8).toFixed(1)}" y="${(p.y - 6).toFixed(1)}" font-size="10" fill="#1b1530">${i}</text>`;
  });
  $("handDiagram").innerHTML = s;
}

// ------------------------------------------------------------------ repeat test
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function repeatTest() {
  if (S.repeat) return;
  S.repeat = [];
  $("repeatBox").hidden = false;
  $("repeatBtn").disabled = true;
  $("captureBtn").disabled = true;
  $("repeatTable").innerHTML = "";
  $("repeatVerdict").textContent = "";
  let tries = 0;
  while (S.repeat.length < 5 && tries < 40 && S.stream) {
    $("repeatProgress").textContent = `Scan ${S.repeat.length + 1} of 5… keep your hand in view`;
    await sleep(900);
    tries++;
    const c = capture();
    if (c) S.repeat.push(c.m);
  }
  const done = S.repeat;
  S.repeat = null;
  $("repeatBtn").disabled = !S.stream;
  $("captureBtn").disabled = !S.stream;
  if (done.length < 2) {
    $("repeatProgress").textContent = "The hand was not in view long enough. Try again.";
    return;
  }
  $("repeatProgress").textContent = `Done: ${done.length} scans of the same hand.`;
  // Ratios wobble in % of their size. The spread is an ANGLE that can be
  // close to 0 degrees, where a % would look huge for a 1-degree change, so it
  // wobbles in degrees instead (2 degrees counts like 3%, 5 like 8%).
  let rows = "<tr><th>Measurement</th><th>Average</th><th>Lowest–highest</th><th>Wobble</th></tr>";
  let level = 0;
  for (const m of MEASURES) {
    const vals = done.map((d) => d[m.key]);
    const s = summarize(vals);
    let wobble;
    if (m.unit === "°") {
      const sdDeg = (s.wobblePct / 100) * s.mean;
      level = Math.max(level, sdDeg < 2 ? 0 : sdDeg < 5 ? 1 : 2);
      wobble = `±${sdDeg.toFixed(1)}°`;
    } else {
      level = Math.max(level, s.wobblePct < 3 ? 0 : s.wobblePct < 8 ? 1 : 2);
      wobble = `${s.wobblePct.toFixed(1)}%`;
    }
    rows += `<tr><td>${m.name}</td><td>${fmt(s.mean, m)}</td><td>${fmt(s.min, m)}–${fmt(s.max, m)}</td><td>${wobble}</td></tr>`;
  }
  $("repeatTable").innerHTML = rows;
  $("repeatVerdict").innerHTML = [
    "✅ <b>Steady:</b> the ratios changed by less than 3% and the spread by less than 2°. The tool is repeatable for this hand.",
    "🟡 <b>A bit wobbly:</b> some ratios changed by 3–8% (or the spread by 2–5°). Small hand movements and tilting change the 2D picture.",
    "🔴 <b>Very wobbly:</b> some ratios changed by more than 8% (or the spread by more than 5°). Check the light, keep the hand flat and facing the camera, and try again.",
  ][level];
  S.lastRepeatMean = Object.fromEntries(MEASURES.map((m) => [m.key, summarize(done.map((d) => d[m.key])).mean]));
}

// ------------------------------------------------------------------ ruler check
function rulerCheck() {
  const L = parseFloat($("rulerLen").value), W = parseFloat($("rulerWid").value);
  const out = $("rulerOut");
  if (!(L > 0 && W > 0)) { out.textContent = "Type both ruler measurements in centimetres first."; return; }
  const ai = (S.lastRepeatMean || (S.captured && S.captured.m) || {}).palmRatio;
  if (!ai) { out.textContent = "Capture a reading first."; return; }
  const ruler = W / L;
  const diff = ((ai - ruler) / ruler) * 100;
  out.innerHTML =
    `Ruler: ${W} ÷ ${L} = <b>${ruler.toFixed(2)}</b>. AI: <b>${ai.toFixed(2)}</b>. ` +
    `Difference: <b>${diff >= 0 ? "+" : ""}${diff.toFixed(0)}%</b>.<br>` +
    "Why they differ: the AI's dots sit on the <b>middle of the knuckle joints</b>, inside the hand, while a ruler measures " +
    "to the <b>outside edge</b> of the hand - so the AI's palm width usually comes out smaller. A scientist would " +
    "write this down as a <b>systematic difference</b> between the two methods.";
}

// ------------------------------------------------------------------ wiring
export function initScan() {
  $("startCam").addEventListener("click", startCamera);
  $("flipCam").addEventListener("click", () => {
    S.facing = S.facing === "environment" ? "user" : "environment";
    startCamera();
  });
  $("captureBtn").addEventListener("click", () => {
    if (capture()) $("scanResults").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("repeatBtn").addEventListener("click", repeatTest);
  $("rulerBtn").addEventListener("click", rulerCheck);
}

// Called when the scan screen opens: start downloading the model in the
// background so the first tap on "Start camera" is quick. Visitors who never
// open this screen never download it.
export function preloadModel() {
  loadModel().catch(() => {});
}

export function resetScan() {
  stopCamera();
  S.captured = null;
  S.lastRepeatMean = null;
  $("scanResults").hidden = true;
  $("repeatBox").hidden = true;
  $("rulerBox").hidden = true;
  $("measureCards").innerHTML = "";
  $("handDiagram").innerHTML = "";
  $("rulerLen").value = "";
  $("rulerWid").value = "";
  $("rulerOut").textContent = "";
  showHelp("");
  status("");
}

// For the self-test page: run one picture through the same model.
export async function detectImage(img) {
  const files = await FilesetResolver.forVisionTasks(WASM_DIR);
  const lm = await HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL, delegate: "CPU" }, runningMode: "IMAGE", numHands: 1,
  });
  const res = lm.detect(img);
  lm.close();
  return res;
}
