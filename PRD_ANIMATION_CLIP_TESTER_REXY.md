## PRD: Animation Clip Tester (Rexy GLB) — “Animation Lab” in Arcade

### Metadata
- **Product**: Dino Demo
- **Doc purpose**: Implementation spec for a coding agent
- **Status**: Planned (build after current in-progress work)
- **Primary outcome**: A UI that can **play every animation clip** in a GLB via a button press and **show the clip name** currently playing, so we can decide mappings (walk/idle/etc.) later.

---

## 1) Summary

Add an **Animation Clip Tester** to help discover and map animations from a newly downloaded GLB:

- Load `rexy_jurassic_world_alive.glb`
- List **all clips found in the file**
- Provide **one button per clip** to play it
- Show **“Now playing: <clip name>”** in the UI

This is intentionally a test harness to support later “Arcade Mode” and mobile controller mappings, not the final game UI.

---

## 2) Goals / Non‑Goals

### Goals
- **Discoverability**: expose every animation clip name in the GLB.
- **Playability**: click a button and the chosen clip plays immediately.
- **Clarity**: always show the exact clip name that is currently playing.
- **Safe switching**: selecting a new clip stops/fades out the previous clip cleanly.
- **Low friction**: run in dev and production (if asset is committed) without special flags.

### Non‑Goals (for initial phases)
- No iPhone controller networking in this PRD (separate PRD).
- No “roar” semantics or auto-mapping required (manual discovery is the point).
- No persistence/DB of mappings (can be Phase 2+ convenience only).

---

## 3) Source Asset (Input)

### Target file
- Local path (source): `C:\\Users\\rachura\\Downloads\\rexy_jurassic_world_alive.glb`
- **Required repo location**: commit it under `public/models/` so Next can serve it.

Recommended stable URL path:
- `public/models/rexy/rexy_jurassic_world_alive.glb`
- Load from code via `useGLTF('/models/rexy/rexy_jurassic_world_alive.glb')`

### Verified clip list (reference)
The file contains **16** animation clips (names may be long; the UI must render them in full and ideally allow wrapping/copy):

1. `Mesh_Trexg3 (merge)_Anim_001_Radar_BWalk`
2. `Mesh_Trexg3 (merge)_Anim_001_Raid_Death`
3. `Mesh_Trexg3 (merge)_Anim_001_Raid_Death_Idle`
4. `Mesh_Trexg3 (merge)_Anim_001_Raid_Death_In`
5. `Mesh_Trexg3 (merge)_Anim_001_Raid_Death_Out`
6. `Mesh_Trexg3 (merge)_Anim_001_Raid_MinionSpawn`
7. `Mesh_Trexg3 (merge)_Anim_001_Raid_NextRound`
8. `Mesh_Trexg3 (merge)_Anim_001_Raid_PlayerSpawn`
9. `Mesh_Trexg3 (merge)_Anim_001_Raid_Spawn`
10. `Mesh_Trexg3 (merge)_Anim_001_Raid_SpecialPhys_Aoe`
11. `Mesh_Trexg3 (merge)_Anim_001_Raid_SpecialPhys_Aoe_In`
12. `Mesh_Trexg3 (merge)_Anim_001_Raid_SpecialPhys_Aoe_Out`
13. `Mesh_Trexg3 (merge)_Anim_001_Raid_Victory`
14. `Mesh_Trexg3 (merge)_Anim_001_Raid_Victory_Idle`
15. `Mesh_Trexg3 (merge)_Anim_001_Raid_Victory_In`
16. `Mesh_Trexg3 (merge)_Anim_001_Raid_Victory_Out`

Note: The implementation **must not hardcode** this list; it must read from `animations.map(a => a.name)` at runtime.

---

## 4) UX / Feature Requirements

### 4.1 Where the tester lives
- The tester should be available **inside the `/arcade` experience** (as requested).
- Implementation can choose one of these approaches:
  - A clearly labeled **“Animation Lab” panel/section** within `/arcade`
  - Or a sub-route such as `/arcade/anim-lab` (still “inside arcade”, but keeps it from cluttering game UI later)

### 4.2 UI requirements (minimum)
- **Now Playing**: show selected clip name (or “None”).
- **Buttons**: one button per clip; clicking plays the clip.
- **Stop**: stop all actions and set “Now Playing” to “None”.
- **Scroll**: if many clips, the list is scrollable.
- **Visual feedback**: active clip button is highlighted.

### 4.3 Optional (but recommended) UI affordances
- **Loop toggle**: play selected clip as loop vs one-shot.
- **Playback speed** slider (0.25× → 1.5×).
- **Search box** to filter clip names.
- **Copy clip name** button (clipboard) for quick mapping notes.

---

## 5) Technical Requirements

### 5.1 Animation playback semantics
- Use `@react-three/drei` `useGLTF` and `useAnimations`.
- When a clip is selected:
  - Stop/fade out any previously playing action(s)
  - Start selected action
  - For one-shot mode: `THREE.LoopOnce`, `clampWhenFinished = true`
  - For loop mode: `THREE.LoopRepeat` (or default loop) with smooth fade-in

### 5.2 Scene framing / transforms
- The model should be centered and visible by default.
- Follow existing repo patterns:
  - Compute bounding box center offset for centering (as in `app/_components/models/TrexSkin.tsx` and `TrexSkeleton.tsx`)
  - Provide stable scale/position so it fits view reliably.

### 5.3 Isolation from Exhibit systems
- This tester must not activate or depend on:
  - Director tour (`app/_lib/director.ts`)
  - Explode system
  - Gesture/voice systems

Arcade should be able to run as its own simple scene for this tool.

---

## 6) Phased Delivery Plan

### Phase 0 — Asset + Route Scaffold
**Scope**
- Add GLB to `public/models/rexy/rexy_jurassic_world_alive.glb` and commit.
- Add `/arcade` route skeleton (if it doesn’t exist yet).
- Render the model with basic lighting; confirm it loads.

**Acceptance criteria**
- `/arcade` loads the Rexy model successfully in dev and prod builds.

### Phase 1 — Clip Buttons + Now Playing (core requirement)
**Scope**
- Read `animations` array and derive `clipNames`.
- Render a button per clip name.
- Clicking a button plays that clip.
- UI shows “Now playing: <clip name>”.
- Add Stop button.

**Acceptance criteria**
- Every clip can be triggered from the UI.
- Name displayed matches the clicked clip exactly.
- Switching clips does not stack multiple animations unintentionally.

### Phase 2 — Tester Quality-of-Life
**Scope**
- Loop toggle, speed control, search/filter, copy-to-clipboard.

**Acceptance criteria**
- Looping works and can be turned off cleanly.
- Speed changes affect the mixer/action playback.

---

## 7) Risks / Notes

- **Licensing**: This file appears to be Sketchfab-exported. Confirm usage rights before leaving it in a public repo/deploy.\n- **Clip naming**: Clip names are long; UI should allow wrapping or horizontal scrolling and offer copy-to-clipboard.\n- **Performance**: Ensure no per-frame allocations in UI loops; use React state carefully.\n\n---\n\n## 8) Success Metrics\n\n- You can test all clips in < 2 minutes.\n- You can confidently identify which clip(s) correspond to desired actions (walk/idle/etc.) and copy the exact names.\n\n*** End of PRD ***\n+
