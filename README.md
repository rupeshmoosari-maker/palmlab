# 🖐️ AI Palm Lab: Science or Story?

A mobile web app for a Class 8 science exhibition, by **Evan**.

It has two clearly separated sides:

| 🔬 **Science** | ✨ **Story** |
|---|---|
| **Scientific Hand Scan**: an AI finds 21 points on your hand and the app measures real geometry. | **Fun Cultural Reading**: your star sign, birth number and Chinese zodiac animal, clearly labelled as tradition. |

Two more parts tie them together:

- **Mini Experiment** asks visitors 3 questions *before* showing them anything, then checks whether the star-sign tradition "predicted" their answers. It keeps a running count for the whole exhibition and compares it with pure chance.
- **Learn** explains how the AI works, what dermatoglyphics is, why palmistry and astrology aren't science, how AI can be biased, and why nothing is stored.

> **For education and entertainment. AI cannot predict your future.**

---

## What it measures

The AI ([MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker)) returns 21 points: the wrist, plus 4 points on each finger and thumb. From those the app works out:

| Measurement | How | Notes |
|---|---|---|
| Palm width ÷ hand length | index knuckle → little-finger knuckle, divided by wrist → middle fingertip | |
| Index ÷ ring finger | each finger's length from knuckle to tip (3 bones added up) | This is like the "2D:4D" ratio scientists study, but they measure from the skin crease, not the joint, so it's only an estimate. |
| Thumb ÷ hand length | thumb base → tip, divided by hand length | |
| Finger spread | angle between the index-finger and little-finger directions | |
| Left or right hand | the AI's own guess, with how sure it is | Assumes the palm faces the camera. |

All results are **ratios or angles**, so they don't change when the hand is nearer to or further from the camera. They **do** change when the hand tilts.

Two extra tools turn the scan into a real science experiment:

- **🔁 Repeat test**: scans the same hand 5 times and shows how much each number wobbles (Steady / A bit wobbly / Very wobbly). This measures the tool's **precision**.
- **📏 Ruler check**: compares the AI's palm ratio with a ruler measurement. They differ in a predictable way, a **systematic difference**: the AI's points sit on the middle of the knuckle joints, while a ruler measures to the outside of the hand.

## How MediaPipe hand landmarks work (short version)

1. **Palm detector.** A small neural network looks at the whole picture and finds where a palm is. Palms are easier to find than whole hands, because fingers bend into so many shapes.
2. **Landmark model.** A second network looks closely at just that part of the picture and predicts the position of the 21 points.
3. **Training.** Google trained it on tens of thousands of real hand photos where people had marked the points by hand, plus computer-generated hands.
4. **Tracking.** On live video it reuses the last position to find the hand faster in the next frame.

Everything runs **inside the browser** (WebAssembly, using the phone's graphics chip when it can). No picture leaves the phone.

## The Mini Experiment

- **Hypothesis:** "A person's star sign predicts whether they prefer logical or creative subjects, are calm or energetic, and like working alone or in a group."
- **Prediction table:** written down *before* anyone answers (in `js/reading.js`, `ELEMENT_PREDICTS`), using popular astrology's element stereotypes. Fire = creative, energetic, group. Earth = logical, calm, alone. Air = logical, energetic, group. Water = creative, calm, alone.
- **Fair test:** visitors answer first and see the prediction after, so the reading can't influence their answers.
- **Chance level:** each question has 2 choices, so guessing matches **50%** of the time. The app shows the band where chance usually lands (about 95 times out of 100) for the number of answers so far. With 100 answers that's about 40–60%.
- **Result:** if the tradition worked, the matches should sit clearly **above** the band. The app won't give a verdict until 30 answers are in.
- **Barnum effect:** explained after each result, with Forer's 1948 experiment as the example.

Only three numbers are kept (visitors, answers, matches), in this device's browser storage. Use **For the presenter → Clear the counts** before the exhibition starts.

---

## Run it on a computer

You need Python (any version 3.x) or any other simple web server.

```bash
cd palmlab
python -m http.server 8776
```

Open **http://localhost:8776** in Chrome or Edge. The camera works on `localhost` because browsers treat it as secure.

## Test it

Open **http://localhost:8776/tests/selftest.html**. It runs about 30 checks on the maths, zodiac dates, numerology, Chinese zodiac and the experiment counts, and should end with **ALL PASS**.

To also test the real AI on a photo:

1. Save a photo of an open **right** palm as `tests/fixtures/right_palm.png`. The folder isn't uploaded to GitHub. We used *Right Hand Palm.png* from Wikimedia Commons, CC BY-SA 4.0.
2. Open `tests/selftest.html?img=fixtures/right_palm.png`.

The AI must call it **Right**, and a mirrored copy must come out **Left**.

## Put it online (free HTTPS) with GitHub Pages

Phones only allow the camera on **https://** pages.

1. Push this folder to a GitHub repository.
2. On GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. After about a minute the app is at `https://<your-user>.github.io/<repo-name>/`.

Other free hosts work too, because the app is just files with no build step:
- **Netlify:** drag the folder onto app.netlify.com/drop.
- **Vercel:** `vercel deploy` in the folder.

## Use it as a desktop app (Windows, Mac, Chromebook)

The site is an installable web app. On a laptop it works with the built-in webcam, opens in its own window like any program, and works offline after the first load.

- **Edge:** open the link → **⋯ menu → Apps → Install this site as an app**.
- **Chrome:** open the link → the **install icon** at the right of the address bar, or **⋮ menu → Cast, save and share → Install page as app**.

It then appears on the desktop or Start menu as **AI Palm Lab**. Before the exhibition, open it once with internet and start the camera once, so the AI files are saved for offline use.

On a laptop:
- the webcam picture is **mirrored** like a selfie;
- the camera view turns **wide** to fit the webcam;
- visitors can scan their own hand, so the **front camera** set-up is the easy one.

A desktop shortcut can also open it directly in an app window:
```
msedge.exe --app=https://<your-user>.github.io/<repo-name>/
```
`icons/palmlab.ico` is the icon for that shortcut.

### When you change a file

The app saves itself on the phone for offline use (`sw.js`). After changing any file, raise the number in `const VERSION = "palmlab-v1"` in `sw.js` (v2, v3, …) so phones fetch the new version.

## Exhibition-day checklist

- [ ] Open the link on the exhibition phone or tablet **once with internet**, and open the Scan screen once. After that it works offline, even on bad school Wi-Fi.
- [ ] **Clear the counts** (Mini Experiment → For the presenter).
- [ ] Good, even light; a plain background behind the hand helps.
- [ ] The rear camera needs someone to hold the phone over the visitor's palm. A tablet on a stand, or **Switch camera** to the front camera, lets visitors scan themselves.
- [ ] Press **🔄 New Visitor** between visitors.
- [ ] A ruler for the Ruler check.

---

## Limitations

- **2D, not 3D.** One camera picture flattens the hand. Tilting it changes every ratio, which the Repeat test shows.
- **Joints, not skin creases.** Landmarks are estimated joint centres, so the "2D:4D" and palm-width numbers aren't the same as a scientist's caliper measurements.
- **Left/right assumes the palm faces the camera.** Show the back of the hand and it swaps.
- **The AI can be wrong.** It struggles in poor light, with blur, rings, bandages, overlapping fingers or very small hands. Its training photos may not include every age, skin tone or hand shape equally.
- **The AI isn't perfectly consistent.** Our own test found its index-to-ring ratio changed by about 4–5% between a photo and its mirror image.
- **The Chinese zodiac** depends on the exact Lunar New Year date. For birthdays from 21 January to 20 February the app says the animal *may* be the previous year's.
- **The experiment** uses popular-astrology stereotypes for only 3 traits, with answers people give about themselves. It's a classroom test, not a published study.

## Ethical safeguards

- **No photos stored or sent.** Camera frames go straight into the on-device AI and are thrown away. Only 21 points are kept, until **New Visitor**.
- **No personal data.** The birthday is used only to calculate the sign, then forgotten. The only stored data is three anonymous counts.
- **Science and story kept separate,** with a warning above every traditional reading: "Traditional interpretation only. Not scientifically validated."
- **No frightening or harmful predictions.** Nothing about death, illness, accidents, money, marriage or exams; the self-test checks the text for those words.
- **No medical or personality claims** from the hand measurements; the scan screen says so.
- **Honest about AI:** the Learn page explains bias and mistakes, and the app shows the points so people can check them.
- **Camera permission** is asked only when you tap Start camera, and the camera turns off when you leave the screen.

## Files

```
index.html               all screens
css/style.css            look and feel (mobile first)
js/app.js                screens, reading, experiment, New Visitor
js/scan.js               camera + AI + drawing + repeat test + ruler check
js/measure.js            the geometry (pure maths, easy to read)
js/reading.js            zodiac, numerology, Chinese zodiac, reading texts
js/experiment.js         questions, matching, the visitor count, chance range
sw.js                    offline support
vendor/tasks-vision/     MediaPipe Tasks Vision 0.10.14 (Apache License 2.0)
models/                  hand_landmarker.task (Google, Apache License 2.0)
tests/selftest.html      self-test page
```

## Credits

- Hand landmark model and library: **MediaPipe** by Google, Apache License 2.0. Bundled unchanged from `@mediapipe/tasks-vision@0.10.14`.
- Carlson, S. (1985). *A double-blind test of astrology.* Nature 318, 419–425.
- Forer, B. R. (1949). *The fallacy of personal validation.* Journal of Abnormal and Social Psychology 44, 118–123. The classroom experiment was done in 1948.
