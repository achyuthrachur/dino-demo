# Fix: Models Not Rendering + Bone Name Mismatch

## Problem

Two issues prevent the app from working on startup:

1. **Models invisible** — The 3D Canvas loads but no dinosaur appears. The UI bar renders fine.
2. **Bone warnings flood the console** — 9 warnings like `[Explode] Bone "Cabeza_Armature.Rexy" not found for segment "skull"`. The explode/tour feature is completely broken.

---

## Issue 1 — Models Not Rendering

### Root Cause

`app/_components/ExplodeController.tsx` line 48 passes a render priority of `100` to `useFrame`:

```tsx
useFrame(() => { ... }, 100);
```

In React Three Fiber, any `useFrame` callback with priority > 0 **disables R3F's automatic `gl.render(scene, camera)` call**. Since ExplodeController doesn't render anything itself, the scene is never drawn to the screen.

### Fix

**File:** `app/_components/ExplodeController.tsx`

Remove the `, 100` priority argument from `useFrame`:

```tsx
// Before (line 37-48)
useFrame(() => {
    if (!explodeState.current?.ready) return;
    const { explodeProgress, segmentWeights, phase } = useDirector.getState();
    if (phase === 'home' && explodeProgress <= 0.001) {
      return;
    }
    applyExplode(explodeState.current, explodeProgress, segmentWeights);
  }, 100);  // ← THIS DISABLES AUTO-RENDERING

// After
useFrame(() => {
    if (!explodeState.current?.ready) return;
    const { explodeProgress, segmentWeights, phase } = useDirector.getState();
    if (phase === 'home' && explodeProgress <= 0.001) {
      return;
    }
    applyExplode(explodeState.current, explodeProgress, segmentWeights);
  });  // ← default priority 0, auto-rendering preserved
```

**Why this is safe:** The animation mixer is already stopped when touring (`TrexSkeleton.tsx` lines 56-63 set `mixer.timeScale = 0` when `directorPhase !== 'home'`), so there's no risk of the mixer overwriting bone positions during explode.

---

## Issue 2 — Bone Name Mismatch

### Root Cause

`app/_lib/explodePresets.ts` defines bone names using Spanish names from a rigged model called "Rexy":

```ts
skull:   'Cabeza_Armature.Rexy',
neck:    'Cuello_Armature.Rexy',
chest:   'Pecho_Armature.Rexy',
arm_l:   'Clavicula.L_Armature.Rexy',
arm_r:   'Clavicula.R_Armature.Rexy',
pelvis:  'Pelvis_Armature.Rexy',
tail:    'Cola.1_Armature.Rexy',
leg_l:   'Muslo.L_Armature.Rexy',
leg_r:   'Muslo.R_Armature.Rexy',
```

But `TrexSkeleton.tsx` loads `/models/trex_skeleton.glb` — a different model that doesn't have these bones. The `initExplodeState` function (in `app/_lib/three/explode.ts`) traverses the loaded model, finds zero matching bones, sets `ready: false`, and the entire explode/tour system silently fails.

### Fix — Option A: Update bone names to match the loaded model

1. Run `npm run dev` and open `http://localhost:3000/?dev=1`
2. In the DevPanel (bottom-right), click **"Log All Bones"**
3. Check the browser console for `[DevPanel] All bones:` — this lists every bone name in the loaded model
4. Update `SEGMENT_BONES` in `app/_lib/explodePresets.ts` to use the actual bone names, mapping them to the 9 segments (skull, neck, chest, arm_l, arm_r, pelvis, tail, leg_l, leg_r)

### Fix — Option B: Switch to the rigged model

If `/models/trex_skeleton.glb` is a static mesh with no bones, switch to the rigged model that matches the existing presets:

**File:** `app/_components/models/TrexSkeleton.tsx` line 19

```tsx
// Before
const { scene, animations } = useGLTF('/models/trex_skeleton.glb');

// After
const { scene, animations } = useGLTF('/models/tyrannosaurus-rex/skeleton-rigged.glb');
```

The untracked file `public/models/tyrannosaurus-rex/skeleton-rigged.glb` likely contains the armature with the Spanish-named bones that match `explodePresets.ts`.

> **Note:** If switching models, verify that the model's scale and centering still look correct. You may need to re-tune the `MODEL_XFORM.skeleton` values in `app/_lib/models.ts`.

---

## Files Summary

| File | Change |
|------|--------|
| `app/_components/ExplodeController.tsx:48` | Remove `, 100` from `useFrame` |
| `app/_lib/explodePresets.ts:7-17` | Update `SEGMENT_BONES` to match actual model bones |
| OR `app/_components/models/TrexSkeleton.tsx:19` | Switch model path to `skeleton-rigged.glb` |

---

## Verification

1. `npm run build` — builds without errors
2. `npm run dev` — models visible, Skeleton/Skin toggle works, no console errors
3. Open `?dev=1` — click "Log All Bones" to confirm bones are found
4. Click **Explore** — tour chapters navigate, explode works
5. `npx vercel --prod --force` — deploy and verify at https://dino-demo-ach.vercel.app
