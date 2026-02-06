# T‑Rex Only Rebuild — Execution Plan (Deep Dive)
*Repo:* Dino Demo (`c:\Users\rachura\OneDrive - Crowe LLP\VS Code Programming Projects\Dino Demo`)  
*Date:* 2026-02-06  
*Scope of this doc:* Planning + task breakdown + multi‑agent workflow + QC. **No code changes performed in this pass.**

---

## 1) Your stated goals (non‑negotiables)
- Remove the entire **raptor** section. Experience is **T‑Rex only**.
- The **3D skeleton must be visible** and **animated**.
- Manual interaction must work: **mouse/touch rotate + zoom**.
- Gesture feature must be verifiable and valuable:
  - Gesture should **add skin** (swap from skeleton → skinned model).
  - Use the additional file: `C:\Users\rachura\Downloads\animated_rexy.glb:1` (this is the skinned/animated version).
- `/story` currently shows nothing and doesn’t scroll: fix it.
- There must be a **way to reach `/story` from the main page**.
- UI should feel **interactive + playful** (not “museum exhibit”).
- **No bone labels.**
- In Story mode, as the user scrolls, **facts should “pop out”** with synchronized 3D beats.

---

## 2) Current architecture (what exists today)

### Routes
- Explore page (`/`): `src/app/page.tsx:1`
- Story tour page (`/story`): `src/app/story/page.tsx:1`
- App layout: `src/app/layout.tsx:18`

### 3D scene (React Three Fiber)
- Canvas + lights + environment: `src/components/canvas/Scene.tsx:1`
- Orbit controls + camera choreography: `src/components/canvas/CameraRig.tsx:43`
- GLB loader + scan modes + animation playback: `src/components/canvas/Specimen.tsx:228`

### State + data
- Zustand store: `src/lib/store.ts:12`
- Specimen registry (includes raptors): `src/lib/registry.ts:1`

### Gestures (MediaPipe Tasks Vision)
- Gesture recognition: `src/lib/gestures.ts:1`
- Presenter webcam HUD: `src/components/exhibit/PresenterHUD.tsx:332`
- Gesture → app actions mapping: `src/lib/useGestureActions.ts:41`

### Story system
- Chapter script: `src/lib/trexStoryScript.ts:1`
- Scroll tour hook (anime.js observers): `src/lib/useTrexScrollTour.ts:1`
- HUD components: `src/components/story/StoryHUD.tsx:1`
- Chapter visibility CSS: `src/styles/globals.css:327`

---

## 3) Ground‑truth asset findings (important)

### Existing T‑Rex assets
Folder: `public/models/tyrannosaurus-rex/`
- `skeleton.glb` is **skinned + animated** (1 animation: `Take 01`) and has a skin rig.  
- `skin.glb` is **not skinned and not animated** (static meshes only).

### New asset you want to use
`C:\Users\rachura\Downloads\animated_rexy.glb:1`
- This file is **skinned + animated** (1 animation: `roaring`) and includes textures.

### Key implication
If the product goal is “skeleton → (gesture) add skin”, then `skin.glb` (current) can’t deliver the “animated skin” requirement. The plan should use:
- Skeleton (animated) GLB, and
- `animated_rexy.glb` as the **skinned** version.

### Risk: alignment
The skeleton and animated skin files appear to be authored at different scales/frames. Expect a visible “pop” on swap unless the two GLBs are normalized (see **Asset Pipeline** below).

---

## 4) Why it currently feels broken (root causes)

### 4.1 `/story` appears blank + no scrolling
Two blockers:
1) **Global scroll is disabled** for the entire app:
   - `src/app/layout.tsx:21` has `overflow-hidden` on `<body>`.
2) Story chapter cards are **hidden by default** until reveal logic runs:
   - `src/styles/globals.css:327` sets `.chapter-section .glass-strong { opacity: 0; transform: translateY(40px); }`

Result: even if `/story` renders, the layout prevents scroll and the content can start out invisible.

### 4.2 Manual zoom/rotate doesn’t “stick”
The camera rig updates the camera every frame and can fight user input:
- Continuous lerp: `src/components/canvas/CameraRig.tsx:211`

Also, the camera distance math is inverted for scaled models:
- `src/components/canvas/CameraRig.tsx:109` divides by `presentation.scale`.
- T‑Rex uses `scale: 0.5` in `src/lib/registry.ts:352`, which pushes the camera farther away than intended.

### 4.3 Gestures can’t rotate/zoom the model (events emitted, nothing consumes them)
Gestures dispatch events:
- `src/lib/useGestureActions.ts:91` emits `gesture:rotate`
- `src/lib/useGestureActions.ts:113` emits `gesture:zoom`

But there is no listener/bridge in the codebase that applies those events to OrbitControls/camera.

### 4.4 Presenter mode currently disables manual controls (and gestures don’t replace them yet)
OrbitControls disables pan/zoom/rotate whenever `presenterActive` is true:
- `src/components/canvas/CameraRig.tsx:241`

Since gestures don’t currently steer OrbitControls, turning Presenter mode on can make the camera effectively “dead”.

### 4.5 The app is still structurally “multi‑specimen”
Raptors are hardwired into:
- Store defaults: `src/lib/store.ts:69`
- Registry exports: `src/lib/registry.ts:469`
- UI tabs/carousel: `src/components/exhibit/SpecimenSelector.tsx:247`

To become “T‑Rex only”, these need to be simplified end‑to‑end.

---

## 5) Product direction (proposed)
The current UI leans “museum HUD”. Your request is “playful, interactive”.

### Proposed framing: “Rex Lab / Dino Deck”
- Explore mode: fewer controls, bigger playful interactions (Roar button, Skin toggle, “Story Mode” big CTA).
- Story mode: high-energy scroll beats: scan frame, roar moment, skin reveal moment, bite force meter, etc.
- No labels. Instead use:
  - momentary highlights (glow/outline),
  - camera beats,
  - short punchy facts cards.

---

## 6) Execution roadmap (milestones + deliverables)
This is sequenced to unblock visibility first, then simplify scope, then build the new skin swap mechanic, then polish.

### Milestone 0 — Unblock core usability (must come first)
**Goal:** Rex visible + scroll works + manual orbit/zoom works.
- Fix `/story` scrolling + initial visibility.
  - Make scrolling route‑aware (don’t globally lock scroll).
  - Ensure at least chapter 0 is visible on first paint.
- Fix camera behavior:
  - Stop “always-on” camera enforcement once user interacts.
  - Correct scale framing (or move to bounds-based framing).

**Deliverable:**  
1) `/story` shows content immediately, scrolls on desktop + mobile.  
2) `/` can rotate and zoom with mouse/touch without snapping back.

### Milestone 1 — Remove raptors (T‑Rex only)
**Goal:** No raptor UI, no raptor registry, no raptor default state.
- Registry: remove raptor entries and `RAPTORS` export.
- Store: remove `activeTab` and any raptor default IDs.
- UI: replace specimen selector with:
  - T‑Rex variants (optional), Skin toggle, and a prominent “Story Mode” button.
- Remove compare drawer (or repurpose) since “compare sizes” doesn’t fit single‑specimen.

**Deliverable:**  
The entire app is built around `tyrannosaurus-rex` only.

### Milestone 2 — Skeleton ↔ Animated Skin swap (your core feature)
**Goal:** skeleton visible by default; a gesture (and a button fallback) reveals the skinned animated Rex.
- Add `animated_rexy.glb` into `public/models/tyrannosaurus-rex/` as the skin target.
- Normalize skeleton and skin alignment (Blender recommended; see **Asset Pipeline**).
- Implement swap with crossfade (best UX):
  - Keep both models loaded; fade skeleton out while skin fades in.
  - Ensure animation plays in both modes (loop idle or “breathe”; roar on demand).

**Deliverable:**  
“Add Skin” is a satisfying reveal; no popping/jump cuts.

### Milestone 3 — Gestures that actually work (and are testable)
**Goal:** Presenter mode is real: camera control + skin toggle gesture.
- Implement an event bridge:
  - `gesture:rotate` → OrbitControls rotation
  - `gesture:zoom` → OrbitControls dolly/zoom
- Pick and implement “Add Skin” gesture:
  - Recommended: `palm_hold` (easy to discover + stable)
  - Alternative: `peace_sign`
- Add strong on-screen feedback:
  - gesture detected label,
  - “locked in” indicator,
  - confidence meter meaningful thresholds.

**Deliverable:**  
You can verify gestures in under 30 seconds on localhost.

### Milestone 4 — Story becomes the “wow” piece
**Goal:** facts pop + animations drive the 3D experience.
- Make Story chapters:
  - visually playful, less “terminal museum”, more “interactive comic panels”
  - synchronized: chapter entry triggers camera/scan/skin/roar beats
- Ensure `/story` is discoverable from `/` (big CTA) and reversible (back button).

**Deliverable:**  
Scrolling feels like a guided interactive experience.

---

## 7) Asset pipeline (recommended so swaps don’t look broken)
Owner: 3D/Assets Agent

### Why this is needed
Skeleton and skinned Rex models often come from different sources and don’t share:
- origin/pivot,
- facing direction,
- scale,
- animation naming,
- material conventions.

### Target constraints (for clean swapping)
- Both GLBs:
  - same origin (0,0,0),
  - same forward axis,
  - consistent scale (1 unit = 1 meter recommended),
  - similar bounding box footprint.
- Animation naming:
  - Skeleton: `Idle` (loop), `Roar` (one-shot)
  - Skin: `Idle` (loop), `Roar` (one-shot)
  - If source clips are `Take 01` and `roaring`, rename in Blender.

### Steps (Blender)
1) Import `public/models/tyrannosaurus-rex/skeleton.glb:1`
2) Import `C:\Users\rachura\Downloads\animated_rexy.glb:1`
3) Align:
   - match feet to ground plane,
   - match facing direction,
   - scale so silhouettes overlap.
4) Apply transforms (Ctrl+A: Location/Rotation/Scale).
5) Ensure animations are preserved and named consistently.
6) Export two GLBs:
   - `skeleton.glb` (animated skeleton)
   - `skin-animated.glb` (animated skinned Rex)

Optional optimization:
- Run glTF compression (Draco/Meshopt) later once everything works.

---

## 8) Multi‑agent workflow (planning, allocation, QC)
This is how to execute without stepping on each other.

### Roles
- **Coordinator/Lead**
  - owns backlog, scope, sequencing, and merges
  - keeps “Definition of Done” tight
- **R3F/Camera Agent**
  - orbit + camera behavior; prevents camera-vs-user fighting
  - model framing, animation playback correctness
- **Gesture Agent**
  - MediaPipe calibration; gesture→camera bridge; UX feedback
- **Story Agent**
  - `/story` scroll engine; chapter choreography; 3D beat timing
- **UI/Playfulness Agent**
  - redesign Explore/Story UI to feel playful (without clutter)
- **3D/Assets Agent**
  - GLB normalization, animation naming, texture sanity
- **QA Agent**
  - smoke + regression + performance + gesture verification scripts

### Work slicing rules
- One PR per milestone per agent (avoid mega-PRs).
- Every PR must include:
  - what changed,
  - how to test,
  - screenshots/short screen recording for visual changes.

### Integration gates (must pass before proceeding)
- **Gate A (after Milestone 0):** `/story` scrolls and is visible; `/` orbit+zoom works.
- **Gate B (after Milestone 2):** skeleton↔skin swap aligned; no pop; animations run.
- **Gate C (after Milestone 3):** gestures rotate+zoom; skin toggle gesture works.
- **Gate D (after Milestone 4):** story chapters pop and drive 3D beats.

---

## 9) QC plan (what “working” means)
Owner: QA Agent

### Smoke (required every PR)
1) Load `/`
   - Rex visible within 3 seconds
   - drag rotates; wheel zooms; no snapping back
2) Load `/story`
   - chapter 1 card visible immediately
   - scroll advances chapters; UI animates; no frozen page

### Gesture verification (requires webcam)
1) Enable Presenter mode
2) Confirm hand tracking indicator shows 0/1/2 hands
3) Confirm rotate gesture rotates the Rex
4) Confirm zoom gesture zooms
5) Perform “Add Skin” gesture: Rex swaps to skinned model

### Console/network checks
- No 404s for `/models/...`
- No repeating WebGL errors

### Performance spot check
- No severe stutter when swapping skeleton↔skin.

---

## 10) Open decisions (need your answer to finalize)
1) Which gesture should toggle “Add Skin”?
   - Recommended: `palm_hold`
   - Alternative: `peace_sign`
2) Should “explode” remain in the product?
   - With skinned models, bone-by-bone explode is usually not meaningful unless the asset is authored for it.
3) Explore UI tone:
   - “Dino Deck” (arcade) vs “Rex Lab” (science toy) vs “Cinematic trailer”

---

## 11) First actions to execute (start here)
1) Milestone 0 fixes (scroll + visibility + camera usability).
2) Milestone 1 deletion/simplification to T‑Rex only.
3) Milestone 2 asset pipeline + swap mechanic.
4) Milestone 3 gesture bridge + skin gesture.
5) Milestone 4 story polish + playful UI.

