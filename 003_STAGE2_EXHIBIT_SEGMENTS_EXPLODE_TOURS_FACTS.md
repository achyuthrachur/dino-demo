# 003_STAGE2_EXHIBIT_SEGMENTS_EXPLODE_TOURS_FACTS.md

> **Stage 2 Objective:** Turn Skeleton mode into a premium “interactive exhibit” with **exhibit-segment explode choreography**, **chapter-based camera tours**, and **fact overlays** — **without** a slow idle revolve. Everything must be deterministic, reversible, and performance-safe.

> **Important constraint:** Skeleton is treated as **exhibit segments** (≈10–30 parts), not individual bones. This stage must work with the current ~13-mesh skeleton GLB.

---

## Non-Negotiables (carryover)
1) **IGNORE ALL Crowe branding / design instructions**.
2) **No AI-slop**: no placeholder UI, no jank, no “almost working.”
3) Deterministic motion: **all constants in config**, no scattered magic numbers.
4) Reversible interactions: any action can be cleanly reset to “Home.”
5) Vercel-friendly: client-only, no heavy runtime allocations.

---

## Deliverables (Stage 2)
A) Skeleton exhibit chapters (4–6) with:
- camera pose (position + target)
- explode preset per chapter
- facts payload

B) Explode choreography system:
- “Explode / Assemble” toggle
- chapter actions can apply explode presets automatically
- dev-only explode scrub (0..1)

C) No slow revolve:
- Model is static unless the user or a chapter animation moves camera or object transforms.
- OrbitControls are allowed in “idle,” but must be disabled during choreographed animations.

D) Director state machine:
- prevents conflicting actions (mode switch, tour, explode) from overlapping
- deterministic lock/unlock behavior

---

## Stage 2 Summary of User Experience
- The landing skeleton view is stable (no idle spin).
- User picks a chapter (e.g., “Skull & Teeth”) → camera glides + segments separate subtly + facts appear.
- User can:
  - go next/prev chapter
  - explode/assemble globally
  - reset to Home (assembled, camera home, facts hidden)
- Everything feels like a curated exhibit, not a tech demo.

---

## 0) Files / Modules to Create (exact)
Create the following files (and only these, unless already present):

### Config & orchestration
- `app/_lib/tour.ts`
- `app/_lib/explodePresets.ts`
- `app/_lib/director.ts`

### Three helpers
- `app/_lib/three/bounds.ts`
- `app/_lib/three/explode.ts`
- `app/_lib/three/camera.ts`

### Components
- `app/_components/ExhibitHUD.tsx` (new)
- `app/_components/FactsPanel.tsx` (new)
- `app/_components/DevPanel.tsx` (new, dev-only)
- `app/_components/TrexScene.tsx` (update)
- `app/_components/CameraRig.tsx` (update)

---

## 1) Centralized Constants (MANDATORY)

### 1.1 Update `app/_lib/motion.ts`
Add Stage 2 constants EXACTLY. Do not remove or rename existing Stage 0/1 constants.

```ts
export const DURATION_MS = {
  ...DURATION_MS,

  // Stage 2 choreography
  explode: 720,
  explodeStagger: 24,
  chapterCamera: 980,
  chapterSettle: 140,      // small settle delay before facts animate
  factsIn: 360,
  factsOut: 220,

  // Director locks
  directorLock: 1100,
};

export const EASING = {
  ...EASING,

  // Framer
  framerExhibit: [0.18, 1, 0.25, 1],
  framerFacts: [0.22, 1, 0.36, 1],

  // Anime
  animeExhibit: "out(5)",
  animeSettle: "out(3)",
};

export const EXPLODE = {
  // Exhibit segments explode tuning
  distance: 38,            // base outward translation magnitude
  distanceChapterBoost: 14, // additional distance for “focused chapter”
  maxPartYawRad: 0.18,     // subtle twist per segment
  maxPartPitchRad: 0.12,
  maxPartRollRad: 0.08,

  // How aggressively we apply per-part offsets in different presets
  presets: {
    overview: 0.85,        // global explode look
    focus: 1.0,            // chapter-focused separation
    subtle: 0.55,          // minimal separation for gentle chapters
  },
};
```

### 1.2 Remove idle revolve
In any code from Stage 0/1 that applies a continuous Y rotation, REMOVE it entirely.
- There must be **zero** automatic rotation unless user is orbiting or a chapter is animating camera.

---

## 2) Exhibit Chapters (Tour System)

### 2.1 Create `app/_lib/tour.ts`
Define chapters as data. These values are intentionally explicit placeholders; they WILL be tuned in dev mode by copying camera poses.

```ts
export type Vec3 = [number, number, number];

export type ChapterId =
  | "home"
  | "skull"
  | "ribcage"
  | "pelvis_tail"
  | "legs";

export type Chapter = {
  id: ChapterId;
  title: string;
  subtitle: string;

  // Camera
  cameraPos: Vec3;
  cameraTarget: Vec3;

  // Explode preset
  explodePreset: "overview" | "focus" | "subtle";
  explodeAmount: number; // 0..1

  // Facts (short, punchy)
  facts: {
    heading: string;
    bullets: string[]; // 2–4 bullets, no more
  };
};

export const CHAPTERS: Chapter[] = [
  {
    id: "home",
    title: "Exhibit Home",
    subtitle: "Assembled skeleton overview",
    cameraPos: [0, 160, 420],
    cameraTarget: [0, 90, 0],
    explodePreset: "subtle",
    explodeAmount: 0,
    facts: {
      heading: "TYRANNOSAURUS REX",
      bullets: [
        "Select a chapter to tour exhibit segments.",
        "Use Explode for a separated-view of major structures.",
      ],
    },
  },
  {
    id: "skull",
    title: "Skull & Teeth",
    subtitle: "Bite architecture",
    cameraPos: [95, 150, 265],
    cameraTarget: [65, 120, 40],
    explodePreset: "focus",
    explodeAmount: 0.95,
    facts: {
      heading: "Skull & Teeth",
      bullets: [
        "Cinematic focus: segment separation highlights form.",
        "This is skeleton exhibit mode (skin/roar is Stage 1).",
        "Use Reset to return to Home.",
      ],
    },
  },
  {
    id: "ribcage",
    title: "Ribcage & Spine",
    subtitle: "Mass and support",
    cameraPos: [-80, 170, 280],
    cameraTarget: [-15, 110, 10],
    explodePreset: "overview",
    explodeAmount: 0.85,
    facts: {
      heading: "Ribcage & Spine",
      bullets: [
        "Exhibit segments separate to reveal internal structure.",
        "Camera motion is choreographed; orbit returns after.",
      ],
    },
  },
  {
    id: "pelvis_tail",
    title: "Pelvis & Tail",
    subtitle: "Balance and movement",
    cameraPos: [-140, 140, -40],
    cameraTarget: [-35, 95, -80],
    explodePreset: "subtle",
    explodeAmount: 0.60,
    facts: {
      heading: "Pelvis & Tail",
      bullets: [
        "Subtle separation keeps silhouette readable.",
        "Tail emphasis adds depth without chaos.",
      ],
    },
  },
  {
    id: "legs",
    title: "Legs & Claws",
    subtitle: "Power and traction",
    cameraPos: [40, 120, 220],
    cameraTarget: [20, 70, 55],
    explodePreset: "focus",
    explodeAmount: 0.90,
    facts: {
      heading: "Legs & Claws",
      bullets: [
        "Focus preset emphasizes load-bearing structure.",
        "Reset returns camera + assembly cleanly.",
      ],
    },
  },
];
```

---

## 3) Explode System (Exhibit Segments)

### 3.1 Create `app/_lib/explodePresets.ts`
Because meshes are generic (`Object_0..`), Stage 2 uses **stable indices** based on traversal order.

```ts
export type PresetName = "overview" | "focus" | "subtle";

/**
 * Per-segment weights (0..1). Length MUST match mesh count.
 * If mesh count differs, clamp/extend using last value.
 *
 * Start with all 1s and tune later in DevPanel after you inspect which
 * indices correspond to which exhibit segment.
 */
export function presetWeights(meshCount: number, preset: PresetName): number[] {
  const base = new Array(meshCount).fill(1);

  if (preset === "subtle") return base.map(() => 0.75);
  if (preset === "focus") return base.map(() => 1.0);
  return base.map(() => 0.92);
}
```

### 3.2 Create `app/_lib/three/explode.ts`
**Key requirements:**
- Cache everything at load; **no allocations in `useFrame`.**
- Build `segments` once:
  - mesh reference
  - base position/rotation
  - explode direction vector
  - deterministic rotation deltas seeded by mesh index

API requirements:

```ts
import * as THREE from "three";
import { EXPLODE } from "@/app/_lib/motion";

export type Segment = {
  mesh: THREE.Mesh;
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  dir: THREE.Vector3; // normalized
  yaw: number;
  pitch: number;
  roll: number;
};

export function collectSegments(root: THREE.Object3D): Segment[] {
  // Traverse meshes.
  // Compute overall center using Box3 from root.
  // For each mesh, compute mesh center using Box3 from mesh.
  // dir = normalize(meshCenter - overallCenter) (fallback if near-zero)
  //
  // Deterministic seed deltas by index:
  // yaw   = (((i*97)%19) - 9) / 9  * EXPLODE.maxPartYawRad
  // pitch = (((i*53)%17) - 8) / 8  * EXPLODE.maxPartPitchRad
  // roll  = (((i*29)%13) - 6) / 6  * EXPLODE.maxPartRollRad
}

export function applyExplode(
  segments: Segment[],
  amount01: number,
  weights: number[],
  distance: number,
  staggerPerIndex: number
) {
  // For each segment i:
  // baseT = clamp01(amount01)
  // staggeredT = clamp01(baseT - i*staggerPerIndex)
  // t = staggeredT * clamp01(weights[i] ?? weights[last])
  // pos = basePos + dir * (distance*t)
  // rot = baseRot + (yaw/pitch/roll)*t
  //
  // NO per-frame allocations.
}
```

Stagger tuning:
- `staggerPerIndex = 0.02` (exact)

Distance:
- default: `EXPLODE.distance`
- chapter focus: `EXPLODE.distance + EXPLODE.distanceChapterBoost`

---

## 4) Camera Tours (Choreographed Camera Rig)

### 4.1 Update `app/_components/CameraRig.tsx`
CameraRig is the single authority for camera position + target and OrbitControls gating.

Expose:
- `animateTo(pos, target, durationMs, easing)`
- `setOrbitEnabled(boolean)`

Implementation constraints:
- Anime animates **plain objects** only.
- Apply camera changes on Anime `update`.

Exact timings:
- chapter camera: `DURATION_MS.chapterCamera`
- easing: `EASING.animeExhibit`

---

## 5) Director State Machine

### 5.1 Create `app/_lib/director.ts`
State:
- `status: "idle" | "touring" | "exploding" | "resetting"`
- `activeChapterId`
- `explodeAmount`
- `explodeOn`
- `lockedUntil`

Actions:
- `requestChapter(id)`
- `toggleExplode()`
- `resetHome()`
- `setExplodeAmount(amount01)` (dev only)

Rules:
- If `Date.now() < lockedUntil` or `status !== "idle"`: reject.
- Accepted action sets:
  - `lockedUntil = now + DURATION_MS.directorLock`
  - `status` accordingly
- Only return to idle in Anime `complete` callbacks.

No queueing in Stage 2.

---

## 6) UI

### 6.1 Create `app/_components/ExhibitHUD.tsx`
Contains:
- Title panel (top-left)
- Chapter rail (bottom-left)
- Explode toggle + Reset (bottom-left)
- Hint line

Styling is the same “museum glass” style from Stage 0.

Buttons:
- active chapter highlighted using accent border + subtle fill
- disabled when director not idle

### 6.2 Create `app/_components/FactsPanel.tsx`
Framer Motion:
- appears after chapter camera settles (`DURATION_MS.chapterSettle`)
- bullets stagger 60ms

---

## 7) Dev Mode Panel (`?dev=1`)

### 7.1 Create `app/_components/DevPanel.tsx`
Show:
- segment list with highlight toggles
- per-index weight sliders (0..1)
- explode scrub slider
- camera pose readout
- copy buttons for poses and weights

Must not affect production when dev mode is off.

---

## 8) Integrate in `TrexScene.tsx` (Update)

### 8.1 On skeleton load
- `segments = collectSegments(skeletonScene)`
- `weights = presetWeights(segments.length, "subtle")`
- explodeAmount = 0
- activeChapter = home
- OrbitControls enabled

### 8.2 Chapter click (exact flow)
1) director accepts `requestChapter`
2) hide facts immediately (if visible)
3) disable orbit
4) animate camera to chapter pose
5) animate explodeAmount to chapter amount (with preset weights)
6) after settle delay, show facts
7) unlock director, re-enable orbit

### 8.3 Explode toggle
- toggles between 0 and a target amount:
  - if activeChapter is home: `EXPLODE.presets.overview`
  - else: chapter explodeAmount
- does not move camera

### 8.4 Reset
- facts out
- explode -> 0 (420ms)
- camera -> home (720ms)
- orbit enabled
- activeChapter = home

---

## 9) Keyboard
- Right/Left: next/prev chapter (wrap)
- Space: explode toggle
- Esc: reset

Ignore input while director locked.

---

## 10) Acceptance Criteria (Stage 2)
1) No idle revolve.
2) Chapters animate camera + explode and restore orbit afterward.
3) Explode can repeat endlessly without drift.
4) Reset is bulletproof.
5) Dev tools work and are dev-only.
6) No console errors; Vercel build succeeds.

---

## Definition of Done
AchGPT will say: **“Stage 2 is perfect.”**
Only then proceed to Stage 3 (hand tracking gestures).
