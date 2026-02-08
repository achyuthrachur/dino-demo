# Stage 2: Tour Positions, Text Animations & Skin Reveal

> **Purpose:** Implementation specification for the coding agent. Structured as multi-agent work packages.
> **Prerequisite:** Apply fixes from `FIX_STARTUP_AND_BONES.md` first (rendering + bone names).

---

## 1. Agent Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    PM AGENT (Orchestrator)                      │
│  - Sequence: Architect → Frontend A ∥ Frontend B → QA           │
│  - Architect MUST complete before Frontend agents start          │
│  - Frontend A and B can run in parallel                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  ARCHITECT    │   │  FRONTEND A   │   │  FRONTEND B   │
│               │   │               │   │               │
│ Tour data     │   │ Text anim     │   │ Skin reveal   │
│ Camera poses  │   │ library       │   │ transition    │
│ Explode fix   │   │ (3 styles)    │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
                    ┌───────────────┐
                    │   QA AGENT    │
                    │               │
                    │ Test all 5    │
                    │ chapters,     │
                    │ transitions,  │
                    │ build, deploy │
                    └───────────────┘
```

---

## 2. Architect Agent — Explode Fix, Camera Positions & Per-Chapter Explode Spec

### 2.1 Explode System — Current State (BROKEN)

The explode/tour system is **completely non-functional**. Two bugs prevent it from working:

#### Bug 1: Scene Not Rendering

**File:** `app/_components/ExplodeController.tsx`

`useFrame()` is called with priority `100`. In R3F, any `useFrame` callback with priority > 0 **disables the automatic `gl.render(scene, camera)` call**. Since ExplodeController doesn't render itself, the entire 3D scene goes black.

**Fix:** Remove the `, 100` priority argument:
```tsx
// BEFORE (broken)
useFrame(() => { ... }, 100);

// AFTER (fixed)
useFrame(() => { ... });
```

This is safe because the mixer is already frozen (`timeScale = 0`) during tours, so no bone conflicts.

#### Bug 2: Bone Names Don't Match Model

**File:** `app/_lib/explodePresets.ts`

`SEGMENT_BONES` uses Spanish names from a "Rexy" model that don't exist in the loaded `skeleton-rigged.glb`:
```
skull:  'Cabeza_Armature.Rexy'    ← NOT FOUND
neck:   'Cuello_Armature.Rexy'    ← NOT FOUND
chest:  'Pecho_Armature.Rexy'     ← NOT FOUND
arm_l:  'Clavicula.L_Armature.Rexy' ← NOT FOUND
arm_r:  'Clavicula.R_Armature.Rexy' ← NOT FOUND
pelvis: 'Pelvis_Armature.Rexy'    ← NOT FOUND
tail:   'Cola.1_Armature.Rexy'    ← NOT FOUND
leg_l:  'Muslo.L_Armature.Rexy'   ← NOT FOUND
leg_r:  'Muslo.R_Armature.Rexy'   ← NOT FOUND
```

`initExplodeState()` in `app/_lib/three/explode.ts` finds zero matching bones → sets `ready: false` → explode silently does nothing.

**Fix:**
1. `npm run dev` → open `?dev=1`
2. DevPanel → click **"Log All Bones"** → check console for `[Explode] Available bones: [...]`
3. Map each real bone name to the 9 segments in `SEGMENT_BONES`

> **Full fix details:** See `FIX_STARTUP_AND_BONES.md`

---

### 2.2 Explode System Architecture (How It Works Once Fixed)

```
User clicks "Explode" in ExhibitHUD
  → director.toggleExplode()
    → Anime.js animates explodeProgress: 0 → chapter.explodeAmount (800ms)
      → Every frame: ExplodeController reads { explodeProgress, segmentWeights }
        → applyExplode() moves each bone:
              bone.position = restPosition + (direction × progress × weight × 5.0)
```

**Key data files:**

| File | What it defines |
|------|----------------|
| `app/_lib/explodePresets.ts` | `SEGMENT_BONES` (name mapping), `SEGMENT_DIRECTIONS` (movement vectors), `EXPLODE_MAX_DISTANCE` (5.0 world units) |
| `app/_lib/three/explode.ts` | `initExplodeState()` scans model for bones, `applyExplode()` moves them per-frame, `resetExplode()` snaps back |
| `app/_components/ExplodeController.tsx` | R3F `useFrame` loop calling `applyExplode()` |
| `app/_lib/director.ts` | `toggleExplode()` animates progress, `goToChapter()` sets weights |
| `app/_lib/tour.ts` | Per-chapter `explodeAmount` and `weights` |

**The 9 explode segments:**

| Segment | Direction Vector | Movement Description |
|---------|-----------------|---------------------|
| `skull` | `[0, 0.6, 1]` | Up + forward — lifts off the neck |
| `neck` | `[0, 0.8, 0.3]` | Mostly up — stretches away from body |
| `chest` | `[0, 0.3, 0]` | Slightly up — ribcage floats |
| `arm_l` | `[-1, 0, 0.3]` | Left + slight forward — arm peels away |
| `arm_r` | `[1, 0, 0.3]` | Right + slight forward — arm peels away |
| `pelvis` | `[0, -0.3, 0]` | Slightly down — drops from spine |
| `tail` | `[0, 0, -1]` | Backward — tail extends away |
| `leg_l` | `[-0.5, -0.7, 0]` | Left + down — leg separates outward |
| `leg_r` | `[0.5, -0.7, 0]` | Right + down — leg separates outward |

**Displacement formula:** `distance = progress × weight × EXPLODE_MAX_DISTANCE(5.0)`

Example: At `progress=0.8` and `weight=1.0` → bone moves `0.8 × 1.0 × 5.0 = 4.0` world units along its direction.

**Weight system:** `chapterWeights({ skull: 1, neck: 0.6 })` sets:
- Named segments: skull=1.0, neck=0.6
- All others: 0.3 (subtle background displacement)

---

### 2.3 Per-Chapter Specification

Each chapter has two states: **Assembled** (default — screenshots show this) and **Exploded** (after pressing Explode button). Below are detailed specs for both states per chapter.

---

#### CHAPTER 0 — "Full Skeleton" (Overview)

**Assembled View (camera):**
```
cameraPos:    [12, 4, 18]     ← KEEP CURRENT
cameraTarget: [2, 2, 0]       ← KEEP CURRENT
```
Wide establishing shot. Full skeleton visible from front-right, slightly elevated. This is the entry point when user clicks "Explore".

**Exploded View:**
```
explodeAmount: 0.6
weights: allWeights(1)   → all 9 segments at weight 1.0
```

| Segment | Weight | Distance | What Happens |
|---------|--------|----------|--------------|
| skull | 1.0 | 3.0 units | Lifts up+forward off neck |
| neck | 1.0 | 3.0 units | Rises mostly upward |
| chest | 1.0 | 3.0 units | Ribcage floats slightly up |
| arm_l | 1.0 | 3.0 units | Peels left+forward |
| arm_r | 1.0 | 3.0 units | Peels right+forward |
| pelvis | 1.0 | 3.0 units | Drops slightly down |
| tail | 1.0 | 3.0 units | Drifts backward |
| leg_l | 1.0 | 3.0 units | Separates left+down |
| leg_r | 1.0 | 3.0 units | Separates right+down |

**Expected visual:** All 9 bone groups float apart uniformly — a "parts diagram" of the full skeleton. Platform sinks slightly (30% of max dist).

---

#### CHAPTER 1 — "Skull & Jaws"

**Reference: Screenshot 1**

**Assembled View — what the camera MUST show:**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│         ┌──── Upper skull (eye sockets,              │
│         │     nasal ridge clearly visible)           │
│         │                                            │
│     ╔═══╧══════════════╗                             │
│     ║  SKULL           ║  ← fills ~70% of frame     │
│     ║  (viewed from    ║     TIGHTEST shot of any    │
│     ║   front-right)   ║     chapter                 │
│     ╚═══╤══════════════╝                             │
│         │                                            │
│         └──── Lower jaw: serrated teeth              │
│               clearly visible, mouth slightly open   │
│                                                      │
│    Neck vertebrae trail                              │
│    away to bottom-left ↙                             │
│                                                      │
│    REST OF BODY: out of frame                        │
└──────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Framing** | Skull fills ~70% of viewport width. Eye sockets, nasal ridge, upper jaw visible. Lower jaw with serrated teeth clearly shown. |
| **Angle** | Front-right, ~30° elevation above skull eye level. Camera sees the right side of the skull face. |
| **Depth** | Very close — tightest shot of all chapters. |
| **Context** | Neck vertebrae trail down and to the left, disappearing out of frame. Body is NOT visible. |
| **Current values** | `cameraPos: [6, 5, 8]`, `cameraTarget: [3, 4, 2]` |

> **Action:** Verify/refine with DevPanel → "Copy Camera". The skull's world-space position depends on model centering.

**Exploded View:**
```
explodeAmount: 0.8   ← HIGHEST of all chapters (most dramatic separation)
weights: chapterWeights({ skull: 1, neck: 0.6 })
```

| Segment | Weight | Distance | What Happens |
|---------|--------|----------|--------------|
| **skull** | **1.0** | **4.0 units** | **Skull lifts dramatically forward+up — floats away from neck. This is the star of this chapter.** |
| **neck** | **0.6** | **2.4 units** | **Neck vertebrae rise moderately, creating visible gap between skull and body** |
| chest | 0.3 | 1.2 units | Subtle upward shift — background |
| arm_l | 0.3 | 1.2 units | Subtle outward shift |
| arm_r | 0.3 | 1.2 units | Subtle outward shift |
| pelvis | 0.3 | 1.2 units | Subtle downward shift |
| tail | 0.3 | 1.2 units | Subtle backward drift |
| leg_l | 0.3 | 1.2 units | Subtle downward/outward |
| leg_r | 0.3 | 1.2 units | Subtle downward/outward |

**Expected visual:** The skull dramatically lifts away and floats forward, isolating it as the focal point. The neck follows partially. Rest of the body shifts subtly, providing contrast. The viewer's eye is drawn to the isolated skull hovering above the body.

---

#### CHAPTER 2 — "Arms & Claws"

**Reference: Screenshot 2**

**Assembled View — what the camera MUST show:**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Skull partially visible ↖                           │
│  at upper-left edge                                  │
│                                                      │
│     ═══ Spine runs horizontally across top ═══       │
│                                                      │
│         ┌── Shoulder blades (scapulae) visible       │
│         │                                            │
│     ╔═══╧══════════════════╗                         │
│     ║  RIBCAGE + ARMS      ║  ← CENTER of frame     │
│     ║                      ║                         │
│     ║  Both tiny arms      ║     Camera slightly     │
│     ║  hanging down,       ║     left of center      │
│     ║  claws visible       ║                         │
│     ╚══════════════════════╝                         │
│                                                      │
│                      Pelvis/hips visible ↘           │
│                      at lower-right                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Framing** | Full rib cage visible from side. Both tiny arms/claws prominently centered. Shoulder blades visible at top. |
| **Angle** | Front-left side view (~45° from front). Camera slightly left and slightly above torso center. |
| **Depth** | Medium distance — torso fills ~60% of viewport. |
| **Context** | Skull partially visible upper-left edge. Pelvis/hips at lower-right. Spine runs horizontally across top of frame. |
| **Current values** | `cameraPos: [8, 3, 10]`, `cameraTarget: [2, 2.5, 0]` |

**Exploded View:**
```
explodeAmount: 0.7
weights: chapterWeights({ arm_l: 1, arm_r: 1, chest: 0.5 })
```

| Segment | Weight | Distance | What Happens |
|---------|--------|----------|--------------|
| **arm_l** | **1.0** | **3.5 units** | **Left arm peels away to the left — dramatically highlights how tiny it is** |
| **arm_r** | **1.0** | **3.5 units** | **Right arm peels away to the right — symmetric separation** |
| **chest** | **0.5** | **1.75 units** | **Ribcage lifts slightly up, exposing arm attachment points** |
| skull | 0.3 | 1.05 units | Subtle forward drift |
| neck | 0.3 | 1.05 units | Subtle upward drift |
| pelvis | 0.3 | 1.05 units | Subtle downward drift |
| tail | 0.3 | 1.05 units | Subtle backward drift |
| leg_l | 0.3 | 1.05 units | Subtle downward/outward |
| leg_r | 0.3 | 1.05 units | Subtle downward/outward |

**Expected visual:** Both tiny arms pop outward from the body in opposite directions (left goes left, right goes right), highlighting how comically small they are relative to the massive ribcage. The chest lifts slightly to reveal the shoulder joints where the arms attach.

---

#### CHAPTER 3 — "Legs & Tail"

**Reference: Screenshot 3**

**Assembled View — what the camera MUST show:**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Torso/ribs fading ↖                                 │
│  to upper-left                                       │
│                                                      │
│              ╔═══════════════════════════════╗        │
│              ║  TAIL stretches to right ───→ ║        │
│              ║  Full tail visible, tip       ║        │
│              ║  reaches right edge           ║        │
│              ╚═══════════════════════════════╝        │
│                                                      │
│     ╔════════════════╗                               │
│     ║  BOTH LEGS     ║  ← grounded stance,           │
│     ║  (left + right ║    weight-bearing              │
│     ║   clearly      ║    posture visible             │
│     ║   visible)     ║                               │
│     ╚═══════╤════════╝                               │
│             │                                        │
│     ╔═══════╧════════╗                               │
│     ║  PLATFORM/BASE ║  ← stone/metal pedestal       │
│     ║  clearly       ║    PROMINENTLY shown           │
│     ║  visible       ║    (only chapter that          │
│     ╚════════════════╝    shows pedestal well)        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

| Property | Specification |
|----------|---------------|
| **Framing** | Full legs visible (both left and right). Feet grounded on pedestal. Tail extends fully to the right edge. |
| **Angle** | **Rear three-quarter view** (~135° from front). Camera BEHIND the dinosaur, slightly elevated (~20° up). |
| **Depth** | Medium-far — full lower body + entire tail + platform visible. |
| **Context** | Platform/pedestal prominently visible at bottom — only chapter that showcases it. Torso/ribs fade into upper-left background. |
| **Current values** | `cameraPos: [14, 3, 14]`, `cameraTarget: [1, 1, -1]` |

> **Important:** This is a REAR view — camera must be BEHIND the model. Current values may need significant adjustment to negative Z or rotated position. Use DevPanel to find the exact rear-view coordinates.

**Exploded View:**
```
explodeAmount: 0.7
weights: chapterWeights({ leg_l: 1, leg_r: 1, tail: 1, pelvis: 0.6 })
```

| Segment | Weight | Distance | What Happens |
|---------|--------|----------|--------------|
| **leg_l** | **1.0** | **3.5 units** | **Left leg separates downward+left — like doing a split** |
| **leg_r** | **1.0** | **3.5 units** | **Right leg separates downward+right — symmetric split** |
| **tail** | **1.0** | **3.5 units** | **Tail floats backward, extending even further from the body** |
| **pelvis** | **0.6** | **2.1 units** | **Pelvis drops down, exposing hip joint structure** |
| skull | 0.3 | 1.05 units | Subtle forward drift |
| neck | 0.3 | 1.05 units | Subtle upward drift |
| chest | 0.3 | 1.05 units | Subtle upward drift |
| arm_l | 0.3 | 1.05 units | Subtle outward drift |
| arm_r | 0.3 | 1.05 units | Subtle outward drift |

**Expected visual:** Legs separate downward and outward like the dinosaur doing a split. Tail floats further backward. Pelvis drops to reveal the hip joint sockets. Platform sinks slightly below. The separation emphasizes the massive, weight-bearing leg structure vs. the relatively light tail.

---

#### CHAPTER 4 — "Reassembled"

**Camera:**
```
cameraPos:    [12, 4, 18]     ← same as Overview (ch 0)
cameraTarget: [2, 2, 0]       ← same as Overview (ch 0)
```

**Explode:**
```
explodeAmount: 0               ← ZERO — fully assembled, no separation
weights: allWeights(1)         ← irrelevant since progress stays at 0
```

All bones animate back to rest positions. This is the "put it all back together" moment. Explode button should have no effect (or be grayed out).

---

### 2.4 Tuning Explode Directions (Post-Fix)

After fixing bone names, the `SEGMENT_DIRECTIONS` in `explodePresets.ts` may need adjustment if segments don't move in visually pleasing directions.

**Current directions:**
```ts
SEGMENT_DIRECTIONS = {
  skull:  [0, 0.6, 1],       // up + forward
  neck:   [0, 0.8, 0.3],     // mostly up
  chest:  [0, 0.3, 0],       // slightly up
  arm_l:  [-1, 0, 0.3],      // left + slight forward
  arm_r:  [1, 0, 0.3],       // right + slight forward
  pelvis: [0, -0.3, 0],      // slightly down
  tail:   [0, 0, -1],        // backward
  leg_l:  [-0.5, -0.7, 0],   // left + down
  leg_r:  [0.5, -0.7, 0],    // right + down
}
```

**Tuning tips:**
- If a segment moves in the wrong direction, the model's local axes may differ from world axes
- `EXPLODE_MAX_DISTANCE` (currently `5.0`) controls overall spread — increase if too subtle, decrease if bones fly too far
- Use the DevPanel explode scrubber to test values interactively
- The platform sinks at 30% of max distance — keeps pedestal visible but lower

### 2.5 Workflow (Sequential Steps)

1. **Fix Bug 1:** Remove `useFrame` priority in `ExplodeController.tsx` → scene renders again
2. **Fix Bug 2:** Run `?dev=1`, click "Log All Bones", update `SEGMENT_BONES` in `explodePresets.ts`
3. **Verify explode:** Click Explore → toggle Explode → bones should separate
4. **Capture camera positions:** For each chapter (1–3), orbit to match screenshot, click "Copy Camera", paste into `tour.ts`
5. **Tune explode feel:** Adjust `explodeAmount`, `weights`, `SEGMENT_DIRECTIONS`, `EXPLODE_MAX_DISTANCE`
6. **Full test:** Click through all 5 chapters, confirm smooth camera transitions and correct explode behavior per spec above

### 2.6 Files Modified

| File | Change |
|------|--------|
| `app/_components/ExplodeController.tsx` | Remove `useFrame` priority (`100` → default) |
| `app/_lib/explodePresets.ts` | Fix `SEGMENT_BONES` with real bone names from model |
| `app/_lib/explodePresets.ts` | (If needed) Tune `SEGMENT_DIRECTIONS` and `EXPLODE_MAX_DISTANCE` |
| `app/_lib/tour.ts` | Update `cameraPos`/`cameraTarget` for chapters 1–3 |
| `app/_lib/tour.ts` | (If needed) Tune `explodeAmount` and `weights` per chapter |

---

## 3. Frontend Agent A — Anime.js Text Animation Library

### 3.1 Overview

Replace Framer Motion in `FactsPanel.tsx` with anime.js v4. Build **three reusable animation styles** that can be swapped per chapter or globally. All styles share the same DOM structure (split-text spans) but apply different animation sequences.

**Library:** `animejs` (already installed — v4.3.5)
**Imports:** `import { animate, stagger, createScope } from 'animejs';`

### 3.2 Shared Utility — `app/_lib/textSplit.ts` (NEW)

```ts
/**
 * Splits a string into an array of per-character data.
 * Used by FactsPanel to render <span> per character for anime.js targeting.
 *
 * splitText("Hello") → [
 *   { char: 'H', index: 0 },
 *   { char: 'e', index: 1 },
 *   ...
 * ]
 *
 * Preserves spaces as non-breaking spans (invisible but maintains layout).
 * Detects numbers for counter-roll animations.
 */
```

- `splitText(text: string): CharData[]` — split any string
- `extractNumbers(text: string): NumberSpan[]` — find numeric substrings + positions for counter-roll
- `isNumericChar(char: string): boolean` — helper

### 3.3 Style A — "Fossil Decode"

> *Text assembles like bone fragments being reconstructed*

**Theme:** Archaeological excavation. Characters are scattered fragments that converge into readable text.

#### Title Animation

Each character wrapped in `<span class="title-char">`. On entrance:

```js
animate('.title-char', {
  translateX: [() => anime.random(-40, 40), 0],   // random horizontal scatter
  translateY: [() => anime.random(-30, 30), 0],   // random vertical scatter
  rotate:     [() => anime.random(-90, 90), 0],   // random rotation
  opacity:    [0, 1],
  scale:      [0.3, 1],
  delay: stagger(30, { from: 'center' }),          // converge from center out
  duration: 600,
  ease: 'out(4)',
});
```

#### Underline — SVG Trace Glow

```jsx
<svg class="underline-svg" width="100%" height="3">
  <line x1="0" y1="1.5" x2="100%" y2="1.5"
        stroke="var(--accent)" stroke-width="2"
        stroke-dasharray={totalLength} stroke-dashoffset={totalLength} />
</svg>
```

```js
animate('.underline-svg line', {
  strokeDashoffset: [totalLength, 0],
  duration: 500,
  ease: 'out(3)',
  delay: 400,  // after title settles
  onComplete: () => {
    // Brief glow pulse via filter or box-shadow
    animate('.underline-svg', {
      filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'],
      duration: 300,
    });
  },
});
```

#### Fact Lines — "Decode" from Random Symbols

Each character starts as a random symbol and "decodes" into the real character:

```js
const SYMBOLS = ['█', '▓', '░', '◆', '◇', '▪', '▫', '⬡', '⬢'];

// For each fact line (staggered by 150ms between lines):
factChars.forEach((charEl, i) => {
  const realChar = charEl.dataset.char;  // stored in data attribute
  let cycle = 0;
  const maxCycles = 3;

  const interval = setInterval(() => {
    charEl.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    cycle++;
    if (cycle >= maxCycles) {
      clearInterval(interval);
      charEl.textContent = realChar;
    }
  }, 40);

  // Stagger start per character
  setTimeout(() => { /* start interval */ }, i * 20);
});

// Simultaneously fade in opacity
animate('.fact-char', {
  opacity: [0, 1],
  delay: stagger(20),
  duration: 200,
  ease: 'out(2)',
});
```

#### Numbers — Counter Roll

Detect numeric spans and animate their value:

```js
animate(numberElement, {
  innerHTML: [0, finalValue],
  round: 1,
  duration: 1000,
  ease: 'out(3)',
});
```

Format with commas during animation: `Number(val).toLocaleString()`.

#### Bullet Dots — Ring Pulse

```js
// Dot appears
animate('.bullet-dot', {
  scale: [0, 1],
  opacity: [0, 1],
  duration: 200,
  delay: stagger(150),
});

// Ring expands and fades (behind dot)
animate('.bullet-ring', {
  scale: [1, 2.5],
  opacity: [0.6, 0],
  duration: 400,
  delay: stagger(150),
  ease: 'out(3)',
});
```

#### Exit — Dissolve Scatter

```js
animate('.fact-char, .title-char', {
  translateX: () => anime.random(-30, 30),
  translateY: () => anime.random(-20, 20),
  opacity: 0,
  duration: 300,
  delay: stagger(10, { from: 'last' }),
  ease: 'in(3)',
});
```

---

### 3.4 Style B — "Museum Etch"

> *Text appears as if laser-etched into glass*

**Theme:** Precision museum technology. A glowing cursor sweeps across, revealing text in its wake.

#### Title Animation

A bright accent-colored cursor bar (`|`) advances left→right, revealing characters behind it:

```js
// Cursor element positioned absolutely, advances across title width
animate('.etch-cursor', {
  left: ['0%', '100%'],
  duration: 500,
  ease: 'linear',
});

// Characters reveal as cursor passes
animate('.title-char', {
  opacity: [0, 1],
  delay: stagger(20),         // timed to match cursor speed
  duration: 50,               // near-instant reveal
  ease: 'linear',
});
```

The cursor is a 2px-wide div with:
- `background: var(--accent)`
- `box-shadow: 0 0 8px var(--accent), 0 0 16px var(--accent)` (glow)
- `height: 100%` of the title line

#### Underline

The cursor leaves a glowing trace line. As cursor reaches the end, the line stays and glow fades to subtle.

#### Fact Lines

Each line gets its own cursor sweep, staggered 200ms apart:

```js
factLines.forEach((line, i) => {
  setTimeout(() => {
    animate(line.querySelectorAll('.fact-char'), {
      opacity: [0, 1],
      delay: stagger(15),
      duration: 30,
    });
    // Cursor for this line
    animate(line.querySelector('.etch-cursor'), {
      left: ['0%', '100%'],
      opacity: [1, 1, 0],  // visible during sweep, fade at end
      duration: 400,
      ease: 'linear',
    });
  }, i * 200);
});
```

#### Numbers

After etch completes, number spans briefly glow brighter:

```js
animate('.number-span', {
  color: ['var(--fg0)', 'var(--accent)', 'var(--fg0)'],
  duration: 600,
  delay: 800,  // after etch finishes
});
```

#### Bullets

Small diamond (`◆`) burns in with brightness flash:

```js
animate('.bullet-dot', {
  scale: [0, 1],
  filter: ['brightness(3)', 'brightness(1)'],
  duration: 300,
  delay: stagger(200),
});
```

#### Exit

Cursor sweeps back right→left, erasing text behind it:

```js
animate('.title-char, .fact-char', {
  opacity: [1, 0],
  delay: stagger(10, { from: 'last' }),
  duration: 50,
});
```

---

### 3.5 Style C — "Bone Cascade"

> *Facts drop from above with physical weight*

**Theme:** Gravity and impact. Text elements fall into place like bones dropping onto a surface.

#### Title Animation

```js
animate('.chapter-title', {
  translateY: [-60, 8, 0],    // overshoot down, bounce back
  opacity: [0, 1],
  duration: 500,
  ease: 'out(3)',              // spring-like settle
});
```

#### Underline

Expands from center simultaneously:

```js
animate('.underline-bar', {
  scaleX: [0, 1],
  opacity: [0, 1],
  duration: 400,
  delay: 200,
  ease: 'out(4)',
  // transform-origin: center
});
```

#### Fact Lines

Each line drops from above with staggered timing:

```js
animate('.fact-line', {
  translateY: [-30, 3, 0],     // drop + tiny bounce
  opacity: [0, 1],
  delay: stagger(120),
  duration: 400,
  ease: 'out(3)',
});
```

#### Numbers

Brief horizontal shake on landing for emphasis:

```js
animate('.number-span', {
  translateX: [0, -3, 3, -2, 0],   // shake sequence
  duration: 300,
  delay: 600,                       // after drop lands
  ease: 'out(2)',
});
```

#### Bullets

Pop in with scale overshoot:

```js
animate('.bullet-dot', {
  scale: [0, 1.3, 1],
  opacity: [0, 1],
  duration: 300,
  delay: stagger(120),
  ease: 'out(3)',
});
```

#### Exit

Lines fall downward off-screen, staggered top to bottom:

```js
animate('.fact-line', {
  translateY: [0, 50],
  opacity: [1, 0],
  delay: stagger(60),
  duration: 250,
  ease: 'in(3)',
});

animate('.chapter-title', {
  translateY: [0, -40],
  opacity: [1, 0],
  duration: 200,
});
```

---

### 3.6 Implementation Architecture

#### New File: `app/_lib/textAnimations.ts`

```ts
export interface AnimationConfig {
  root: HTMLElement;           // Container element with split-text spans
  onComplete?: () => void;    // Called when entrance completes
}

export function fossilDecode(config: AnimationConfig): () => void;  // returns cleanup fn
export function museumEtch(config: AnimationConfig): () => void;
export function boneCascade(config: AnimationConfig): () => void;

// Exit animations
export function fossilDecodeExit(root: HTMLElement): Promise<void>;
export function museumEtchExit(root: HTMLElement): Promise<void>;
export function boneCascadeExit(root: HTMLElement): Promise<void>;
```

Each function:
- Creates an anime.js scope via `createScope({ root })`
- Runs the animation sequence
- Returns a cleanup function that calls `scope.revert()`
- Exit functions return a Promise that resolves when animation completes

#### Modified File: `app/_components/FactsPanel.tsx`

```tsx
// Structure:
<div ref={panelRef} className="facts-panel glass-panel">
  <h3 className="chapter-title">
    {splitText(title).map(c => <span className="title-char" key={c.index}>{c.char}</span>)}
  </h3>
  <div className="underline-svg">...</div>
  {facts.map((fact, i) => (
    <div className="fact-line" key={i}>
      <span className="bullet-dot" /><span className="bullet-ring" />
      {splitText(fact).map(c => (
        <span className="fact-char" data-char={c.char} key={c.index}>
          {c.char}
        </span>
      ))}
    </div>
  ))}
</div>
```

- `useEffect` on `activeChapter` change: run exit animation (await), update content, run entrance
- Style selection: pass `animationStyle: 'fossilDecode' | 'museumEtch' | 'boneCascade'` as prop or read from store
- Cleanup scope on unmount

#### New Motion Constants: `app/_lib/motion.ts`

Add to `DURATION_MS`:

```ts
// Fossil Decode
titleScatter: 600,
titleCharStagger: 30,
factDecodeChar: 40,
factDecodeIterations: 3,

// Museum Etch
etchCursorSpeed: 500,
etchCharStagger: 20,

// Bone Cascade
cascadeDrop: 500,

// Shared across styles
underlineTrace: 500,
factLineStagger: 150,
factCharStagger: 20,
counterRoll: 1000,
bulletPulse: 400,
exitDuration: 300,
```

---

## 4. Frontend Agent B — Skin-on-Skeleton Transition

### 4.1 Concept

When switching from skeleton → skin mode, instead of a simple opacity crossfade, the skin **gradually appears over the skeleton** — like flesh growing onto bones.

### 4.2 Technique — Clipping Plane Reveal

Use Three.js clipping planes for a directional reveal that sweeps vertically.

#### How It Works

1. Both skeleton and skin models render simultaneously during transition
2. Skin model materials get a `clippingPlanes` array with a single horizontal plane
3. The clipping plane starts below the model (everything clipped = invisible)
4. Anime.js animates the plane's Y position from bottom → top over ~1.8 seconds
5. As the plane sweeps up, skin appears from feet to head
6. Skeleton opacity fades with a slight delay behind the clipping plane
7. At the reveal boundary: edge glow effect (optional, via emissive boost near clip edge)

#### Implementation

**New File: `app/_lib/three/skinReveal.ts`**

```ts
import * as THREE from 'three';

const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
// Normal (0, -1, 0) = clips everything ABOVE the plane
// Constant = Y position of the plane

export function setupSkinClipping(skinScene: THREE.Object3D): void {
  // Traverse all meshes in skin scene
  // Set material.clippingPlanes = [clipPlane]
  // Set material.clipShadows = true
  // Enable renderer.localClippingEnabled = true
}

export function setSkinRevealProgress(
  progress: number,    // 0 = fully hidden, 1 = fully visible
  modelBounds: { minY: number; maxY: number }
): void {
  // Map progress (0→1) to Y position (minY → maxY + margin)
  const y = modelBounds.minY + progress * (modelBounds.maxY - modelBounds.minY + 1);
  clipPlane.constant = y;
}

export function removeSkinClipping(skinScene: THREE.Object3D): void {
  // Remove clipping planes from all materials
}
```

**Modified File: `app/_components/TrexScene.tsx`**

Replace the current opacity crossfade in `TrexScene.tsx` with:

```ts
// On skeleton → skin transition:
// 1. Setup clipping on skin materials
setupSkinClipping(skinScene);

// 2. Animate reveal progress with anime.js
const target = { progress: 0 };
animate(target, {
  progress: 1,
  duration: 1800,             // DURATION_MS.skinRevealDuration
  ease: 'out(4)',             // slow start, smooth finish
  onUpdate: () => {
    setSkinRevealProgress(target.progress, skinBounds);
    // Skeleton opacity trails behind: starts fading at 30% progress
    const skelFade = Math.max(0, (target.progress - 0.3) / 0.7);
    setSceneOpacity(skeletonScene, 1 - skelFade);
  },
  onComplete: () => {
    removeSkinClipping(skinScene);
    setSceneOpacity(skeletonScene, 0);
    setTransitionPhase('idle');
  },
});

// On skin → skeleton transition (reverse):
// Clipping plane sweeps top → bottom, skeleton fades in behind it
```

#### Edge Glow (Optional Enhancement)

Near the clipping boundary, boost emissive intensity on skin materials to create a faint accent-colored glow line:

```ts
// In useFrame or onUpdate:
skinScene.traverse((child) => {
  if (child.isMesh && child.material) {
    const mesh = child as THREE.Mesh;
    const worldY = mesh.getWorldPosition(tmpVec).y;
    const distFromClip = Math.abs(worldY - currentClipY);
    if (distFromClip < 0.5) {
      // Boost emissive near clip edge
      mesh.material.emissive.setHex(0x7CF7C6);
      mesh.material.emissiveIntensity = (0.5 - distFromClip) * 2;
    } else {
      mesh.material.emissiveIntensity = 0;
    }
  }
});
```

### 4.3 Renderer Setup

The Canvas in `Scene.tsx` must enable local clipping:

```tsx
<Canvas gl={{ localClippingEnabled: true, ... }}>
```

### 4.4 Motion Constants

Add to `app/_lib/motion.ts`:

```ts
skinRevealDuration: 1800,
skinRevealEase: 'out(4)',
skinEdgeGlow: 200,
skinFadeDelay: 0.3,         // skeleton starts fading at 30% reveal
```

### 4.5 Files Modified

| File | Change |
|------|--------|
| `app/_lib/three/skinReveal.ts` (new) | Clipping plane setup, progress control, cleanup |
| `app/_components/TrexScene.tsx` | Replace crossfade with directional reveal |
| `app/_components/Scene.tsx` | Add `localClippingEnabled: true` to Canvas gl prop |
| `app/_lib/motion.ts` | Add skin reveal duration tokens |

---

## 5. Motion Constants — Complete Addition

Add all new tokens to `app/_lib/motion.ts` inside `DURATION_MS`:

```ts
export const DURATION_MS = {
  // ... existing tokens ...

  // ── Text Animation: Fossil Decode ──
  titleScatter: 600,
  titleCharStagger: 30,
  factDecodeChar: 40,
  factDecodeIterations: 3,

  // ── Text Animation: Museum Etch ──
  etchCursorSpeed: 500,
  etchCharStagger: 20,

  // ── Text Animation: Bone Cascade ──
  cascadeDrop: 500,

  // ── Text Animation: Shared ──
  underlineTrace: 500,
  factLineStagger: 150,
  factCharStagger: 20,
  counterRoll: 1000,
  bulletPulse: 400,
  exitDuration: 300,

  // ── Skin Reveal ──
  skinRevealDuration: 1800,
  skinEdgeGlow: 200,
} as const;

export const EASING = {
  // ... existing tokens ...

  // ── Text Animation ──
  animeDecode: 'out(2)',
  animeEtch: 'linear',
  animeCascade: 'out(3)',

  // ── Skin Reveal ──
  animeSkinReveal: 'out(4)',
} as const;
```

---

## 6. File Manifest — All Agents

| File | Agent | Action |
|------|-------|--------|
| `app/_components/ExplodeController.tsx` | Architect | Remove `useFrame` priority 100 |
| `app/_lib/explodePresets.ts` | Architect | Fix `SEGMENT_BONES` to match model |
| `app/_lib/tour.ts` | Architect | Update `cameraPos`/`cameraTarget` for ch 1–3 |
| `app/_lib/textAnimations.ts` (**new**) | Frontend A | Three animation style functions |
| `app/_lib/textSplit.ts` (**new**) | Frontend A | Per-character span splitting utility |
| `app/_components/FactsPanel.tsx` | Frontend A | Rewrite with anime.js (replace Framer Motion) |
| `app/_lib/motion.ts` | Frontend A + B | Add all new duration/easing tokens |
| `app/_lib/three/skinReveal.ts` (**new**) | Frontend B | Clipping plane reveal logic |
| `app/_components/TrexScene.tsx` | Frontend B | Replace crossfade with directional reveal |
| `app/_components/Scene.tsx` | Frontend B | Enable `localClippingEnabled` on Canvas |

---

## 7. Verification — QA Agent

### Pre-flight
- [ ] `npm run build` — no TypeScript or build errors
- [ ] No console warnings about missing bones

### Tour System — Camera Positions
- [ ] Click **Explore** — enters tour mode, chapter 0 (Overview) loads with wide establishing shot
- [ ] **Ch 1 (Skull):** Camera zooms tight on skull from front-right, skull fills ~70% of frame, teeth visible
- [ ] **Ch 2 (Arms):** Camera shows mid-body from front-left, ribs and tiny arms centered, spine across top
- [ ] **Ch 3 (Legs):** Camera BEHIND model (rear three-quarter), legs+tail+platform all visible
- [ ] **Ch 4 (Reassembled):** Camera returns to wide overview position
- [ ] All chapter transitions are smooth (no jump cuts)
- [ ] **Exit** returns to home with smooth camera animation

### Tour System — Explode Behavior
- [ ] No console warnings about missing bones (`[Explode] Bone "..." not found`)
- [ ] Console shows `[Explode] Initialized 9/9 segments`
- [ ] **Ch 0 explode:** All 9 segments separate uniformly (parts diagram)
- [ ] **Ch 1 explode:** Skull lifts dramatically forward+up, neck follows partially, rest subtle
- [ ] **Ch 2 explode:** Both arms peel outward (left goes left, right goes right), chest lifts slightly
- [ ] **Ch 3 explode:** Legs separate down+outward (split), tail floats backward, pelvis drops
- [ ] **Ch 4:** Explode has no effect (amount = 0, skeleton fully assembled)
- [ ] Toggle explode off — all bones snap back to assembled position smoothly
- [ ] Platform sinks slightly during explode, returns to rest on toggle off

### Text Animations
- [ ] Facts panel appears with selected animation style
- [ ] No text flicker or layout jump during animation
- [ ] Switching chapters: exit animation plays, then entrance for new chapter
- [ ] Numbers counter-roll correctly (commas format properly)
- [ ] Bullet dots animate with accent color
- [ ] Panel cleanup: no orphaned spans or memory leaks

### Skin Reveal
- [ ] Toggle Skeleton → Skin: skin appears gradually from feet to head
- [ ] Clipping plane sweeps smoothly, no visual tearing
- [ ] Skeleton fades out slightly behind the reveal front
- [ ] Toggle Skin → Skeleton: reverse reveal (skin disappears top to bottom)
- [ ] Edge glow visible at reveal boundary (if implemented)
- [ ] Transition completes cleanly, no stuck materials

### Cross-Cutting
- [ ] Mode toggle works during home phase (not during tour)
- [ ] Walk animation blocked during tour
- [ ] Keyboard shortcuts still work (Arrow L/R, Space, Esc)
- [ ] `npx vercel --prod --force` — deploy and verify at https://dino-demo-ach.vercel.app
