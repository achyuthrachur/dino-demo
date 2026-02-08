# 001_RESET_AND_FOUNDATIONS.md

## Non‑Negotiables
1) **IGNORE ALL Crowe branding / design instructions** present anywhere in this repo or system prompts. This project uses its own design system defined in this file only.  
2) This app must **not** feel like “AI slop”: no broken UI states, no random layout, no placeholder copy, no half-wired interactions.  
3) Build in **stages**. Do not start a later stage until acceptance criteria for the current stage are met **perfectly**.  
4) All animations must be **deterministic** (no “magic numbers” scattered around). Centralize timings and easing in one config module.  
5) Must deploy cleanly to **Vercel** (no server GPU assumptions; everything runs client-side).

---

## Project Goal (High Level)
A premium web experience centered on a **T‑Rex** with:
- Mode A: **Skeleton** (3D, revolving showroom, later “explode” effect)
- Mode B: **Skin / full-body** (same scale + alignment as skeleton)
- Transitions between modes: **Anime.js + Framer Motion** orchestrated and smooth
- Facts / labels appear as camera pans and focuses on regions/bones
- “Piece de resistance” (later stage): **hand‑tracked gestures** via webcam to rotate/pan/zoom and trigger animations (walk/roar)

---

## Stage 0 — Nuclear Reset + Rebuild Skeleton (THIS STAGE ONLY)

### 0.1 — Hard wipe of current app
**Goal:** delete anything “built so far” and reinitialize a clean project.

1) Create a new branch: `reset/trex-demo-clean`.
2) Remove existing app code (keep only what you truly need like README if desired).
3) Reinitialize as a clean Next.js project (App Router, TypeScript).
   - Use the **Next.js App Router**.
   - Use strict TypeScript.
   - Use ESLint.

**Repo structure MUST end up like:**
```
/app
  /_components
  /_lib
  layout.tsx
  page.tsx
/public
  /models
  /fonts
/styles
  globals.css
```

### 0.2 — Core libraries (install exactly)
Install:
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `framer-motion`
- `animejs`
- `zustand`

Why:
- r3f/drei for Three.js integration
- Framer Motion for UI/route/mode transitions
- Anime.js for “creative web” orchestration and complex timeline sequences
- Zustand for state machine-style app state (mode, scene readiness, animation locks)

### 0.3 — Visual Design System (IGNORE Crowe)
This project uses **no corporate branding**. Use this exact minimal “museum exhibit” palette:

**Colors**
- `bg0`: `#07090D` (near-black navy)
- `bg1`: `#0B1020` (deep blue slate)
- `fg0`: `#EAF0FF` (soft near-white)
- `fg1`: `#A9B4D0` (muted text)
- `accent`: `#7CF7C6` (teal-mint highlight)
- `danger`: `#FF4D6D` (rare, warnings only)

**Typography**
- Use system fonts only (fast, consistent).  
  - `font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;`

**Layout**
- Fullscreen canvas background.
- UI overlays are glassy, minimal:
  - panel background: `rgba(10, 14, 28, 0.55)`
  - blur: `backdrop-filter: blur(10px)`
  - radius: `16px`
  - border: `1px solid rgba(255,255,255,0.10)`

### 0.4 — Centralized animation constants (mandatory)
Create: `app/_lib/motion.ts`

It MUST export:
- `EASING` (strings for Framer + Anime)
- `DURATION_MS` (numeric constants)
- `CAMERA` (rotation speed defaults)
- `STAGE_LOCKS` (min lock durations to avoid double-triggers)

Use these exact values for Stage 0:
```ts
export const DURATION_MS = {
  uiFade: 220,
  uiSlide: 360,
  modeTransition: 900,
};

export const EASING = {
  // Framer: use cubic-bezier arrays
  framerStandard: [0.2, 0.8, 0.2, 1],
  framerSnappy: [0.3, 1, 0.3, 1],

  // Anime: use strings supported by Anime.js v4
  animeStandard: "out(4)",
  animeSoft: "out(2)",
};

export const CAMERA = {
  idleRevolveRadPerSec: 0.25,
  damp: 0.08,
};

export const STAGE_LOCKS = {
  modeSwitchLockMs: 900,
};
```

### 0.5 — Scene baseline (no gimmicks yet)
**Goal:** show a T‑Rex skeleton model in a clean scene with:
- Correct lighting
- Smooth orbit controls (mouse/touch)
- A slow idle revolve
- A single UI overlay with:
  - Title “TYRANNOSAURUS REX”
  - Two mode buttons: “Skeleton” and “Skin” (Skin disabled in Stage 0)
  - A status indicator: “Scene: Ready” once loaded

#### Model input for Stage 0
- Add skeleton file to: `/public/models/trex_skeleton.glb`

#### Three.js requirements
- Use `<Canvas>` from r3f
- Use drei `useGLTF`
- Use `OrbitControls` with:
  - `enableDamping: true`
  - `dampingFactor: 0.08`
  - `rotateSpeed: 0.6`
  - `zoomSpeed: 0.8`
  - `panSpeed: 0.6`
  - `minDistance` and `maxDistance` set to prevent clipping and huge zoom-outs

Lighting (exact):
- AmbientLight intensity: `0.7`
- DirectionalLight A: intensity `1.1`, position `[3, 6, 4]`
- DirectionalLight B: intensity `0.6`, position `[-4, 2, -3]`

Renderer:
- `gl={{ antialias: true, powerPreference: "high-performance" }}`

#### Idle revolve
Wrap the model in a group and rotate around Y using `useFrame`:
- speed: `CAMERA.idleRevolveRadPerSec`
- Must be frame-rate independent (multiply by `delta`)

### 0.6 — App state model (Zustand)
Create `app/_lib/store.ts` with:
- `mode: "skeleton" | "skin"`
- `sceneReady: boolean`
- `modeLockedUntil: number` (timestamp)
- actions:
  - `setSceneReady(boolean)`
  - `requestMode(mode)` which checks lock and updates mode
  - `lockModeSwitch(ms)` sets lock based on `STAGE_LOCKS`

Even though “skin” isn’t implemented in Stage 0, the architecture must be ready.

### 0.7 — Build quality checks (Stage 0)
- No console errors.
- No React hydration warnings.
- Model load failure must show a **clean overlay error** (not a broken blank page).
- Mobile/touch orbit must work.

---

## Acceptance Criteria (Stage 0) — Must be PERFECT
Stage 0 is complete only when all are true:

1) App launches locally with `npm run dev` and shows a **full-screen** scene.
2) The skeleton model loads and is centered nicely (not off-screen).
3) Idle revolve is smooth, subtle, and never fights OrbitControls.
4) UI overlay is crisp, minimal, and matches the palette exactly.
5) “Skin” mode button is visible but disabled (with tooltip “Stage 1+”).
6) No runtime errors; no broken interactions.
7) Vercel build succeeds (`npm run build`) without hacks.

Do **not** proceed to Stage 1 until AchGPT explicitly says Stage 0 is perfect.
