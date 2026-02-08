# T‑Rex Scroll Tour (Anime.js) — Project Plan

## Goal
Create a **scroll-driven “Story Tour”** for **T. rex only (first)** where the 3D scene stays pinned while scrolling choreographs:
- UI animations (Anime.js)
- interactive “blurb/snippet” information at each stage
- exhibit state changes (camera preset, scan mode, explode factor)

Keep the existing `src/app/page.tsx` as “Free Explore”. Add a separate route for the tour so we don’t disrupt the current full-screen, non-scroll layout.

## Non-goals (for v1)
- Bone-by-bone rig/armature requirements
- Multi-specimen story routing (T‑Rex only)
- Heavy video/3D cinematic cutscenes (keep performance tight)

## Key Constraints / Notes
- Current T‑Rex GLBs appear to be placeholders (static meshes, no skin/animations). The scroll tour should work **even with mesh-only models**.
- Prefer transform/opacity animations (GPU-friendly). Use blur sparingly (or only on small UI surfaces).
- Provide `prefers-reduced-motion` fallback.

## Proposed Route + Layout
- New route: `src/app/story/page.tsx`
- Layout pattern:
  - **Sticky/pinned canvas**: the existing `<Scene />` (or a wrapper) stays fixed.
  - **Scrollable narrative column**: chapter sections stacked vertically (`min-height: 100vh` each).
  - UI overlays (HUD/cards) animate in/out and update content per chapter.

## Anime.js Features to Use (v4.x, already installed)
- `createTimeline()` + `.seek(progress * duration)` for deterministic choreography.
- `onScroll()` / `ScrollObserver` to sync chapter timelines to scroll progress.
- `stagger()` for snippet lists, chips, and citation cascades.
- `splitText()` for creative headline/body reveals (chars/words/lines) with accessibility options.
- SVG helpers:
  - `createDrawable()` for scan frames/lines
  - `createMotionPath()` for scanner “blips”
  - `morphTo()` for icon transitions (optional)
- Optional (nice-to-have): `createLayout()` for smooth card reflow between chapters.

## Content Strategy (data sources)
Use the existing T‑Rex content from `src/lib/registry.ts`:
- `displayName`, `taxonomyLabel`
- `stats` (length, weight, location)
- `bones[]` (use as “body parts” blurbs even if the model isn’t rigged)
- `content.facts[]`, `content.myths[]`, `content.sources[]`

Create a small “chapter script” that maps each chapter to:
- copy blocks to display
- optional “myth → correction” pairing
- desired exhibit state targets:
  - `cameraTarget` (`idle` | `head` | `claw`)
  - `scanMode` (`skeleton` | `xray` | optional `skin` off for v1)
  - `explodeFactor` (0 → ~0.6)

## Chapter Breakdown (v1)
Each chapter is ~1 viewport tall and has a dedicated timeline tied to scroll progress.

### 1) Boot / Title
- UI: “system boot” HUD + title reveal
- Copy: Exhibit title + T‑Rex taxonomy label
- Animations: splitText headline, drawable “scan frame” border powering on
- State: `cameraTarget=idle`, `scanMode=skeleton`, `explodeFactor=0`

### 2) Scale Snapshot
- UI: stat chips + animated counters
- Copy: length/weight (museum + scientific), location
- Animations: stagger chips, number roll-up

### 3) Skull Focus (Vision + Teeth)
- UI: “Skull” blurb card + callout accent
- Copy: `bones[meshName='skull']` blurb + 1 fact
- Animations: motion-path “scanner blip” that lands on the card; subtle glow pulse
- State: `cameraTarget=head`, `explodeFactor` ramps 0 → 0.25

### 4) Jaw: Myth → Reality (Bite Force)
- UI: two-state card (myth glitches in → reality locks in)
- Copy: 1 myth + 1 corrected fact + jaw blurb
- Animations: splitText + quick distortion/glitch (implemented via per-char transforms), spring settle
- State: `cameraTarget=head`, `explodeFactor` pulses 0.25 → 0.35 → 0.25

### 5) Forelimb (Small but strong)
- UI: “Forelimb” blurb + “strength” meter motif
- Copy: `bones[meshName='forelimb_r']` blurb + 1 fact
- Animations: stagger meter ticks, “neon” emphasis
- State: `cameraTarget=idle`, `explodeFactor` ramps 0.2 → 0.45

### 6) Femur / Locomotion
- UI: “Locomotion” blurb + vector graphics
- Copy: `bones[meshName='femur_r']` blurb
- Animations: drawable vectors, staggered dots
- State: `cameraTarget=idle`, `explodeFactor` ramps 0.3 → 0.55

### 7) Sources / Provenance
- UI: citations panel (2–3 at a time)
- Copy: `content.sources[]` rotated
- Animations: layout reflow (optional) + gentle fade/slide transitions

### 8) Reassemble + CTA
- UI: “Continue exploring” card + restart tour
- Animations: satisfying reassemble (explodeFactor → 0) + title reprise
- State: `cameraTarget=idle`, `scanMode=skeleton`, `explodeFactor=0`

## Engineering Tasks (milestones)

### Milestone A — Scaffolding
- Add `src/app/story/page.tsx` with scrollable chapters + pinned scene
- Create basic `StoryHUD` overlay components (headlines, blurb cards, stat chips)
- Implement `prefers-reduced-motion` behavior (simple fades, no scrub)

### Milestone B — Scroll Sync Engine
- Create a hook like `useTrexScrollTour()`:
  - builds per-chapter timelines (`createTimeline`)
  - binds each to scroll progress (`onScroll().link(timeline)` or manual `.seek`)
  - updates Zustand (`setExplodeFactor`, `setCameraTarget`, `setScanMode`) at controlled frequency

### Milestone C — Chapter Animations + Copy
- Implement splitText headline/body reveals
- Implement myth → correction “glitch then settle”
- Add scanline SVG effects (drawable border, motion-path blip)
- Populate blurbs from the registry data mapping

### Milestone D — Polish + QA
- Performance pass (minimize blur; reduce DOM nodes from splitText on mobile)
- Mobile layout adjustments (shorter chapters, fewer simultaneous effects)
- Accessibility review (focus order, reduced motion, readable contrast)

## Deliverables
- New story route: `/story` (T‑Rex scroll tour)
- Chapter script/data file mapping copy + exhibit state per chapter
- Reusable UI primitives for blurbs/snippets + citations
- Reduced-motion fallback

## Acceptance Criteria
- Scroll scrub feels smooth at 60fps on a modern laptop (no jank from heavy blur)
- Each chapter shows at least 1–3 meaningful, readable snippets (facts/myths/bone blurbs)
- Camera + explode changes are synchronized with scroll (no “random jumps”)
- Works without skin models and without rigged bones

