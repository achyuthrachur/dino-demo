# Fix Stage 2 Issues — Sequential Implementation Plan

> **CRITICAL: Do NOT attempt all fixes at once.**
> Complete each step fully, verify it works (build + deploy to production), then move to the next.
> Each step is isolated and independently testable.

---

## Issue Summary

| # | Issue | Severity |
|---|-------|----------|
| 1 | Skin model offset from skeleton model | High |
| 2 | Explode broken — bone names don't match model (0/9 segments) | High |
| 3 | Skin/skeleton toggle animation jitters in second half | Medium |
| 4 | Tour camera positions need tuning (Skull & Jaws, Arms & Claws) | Medium |

---

## Step 1: Fix Skin ↔ Skeleton Model Alignment

**Problem:** The skin model sits lower and further back than the skeleton. The skin's legs plant on the platform while the skeleton's legs float above. The torso/body of the skin is shifted backward relative to the skeleton.

**Root Cause:** Both models independently compute `centerOffset` via `Box3.setFromObject(scene)` in their components (`TrexSkeleton.tsx:28-32`, `TrexSkin.tsx:112-116`). The two GLB files have vastly different internal geometries and scale chains, so even with identical world positions `[2, 1, 0]`, the bounding box centers differ and the models don't visually align.

**Current values** (`app/_lib/models.ts`):
- Skeleton: position `[2, 1, 0]`, scale `1.15`
- Skin: position `[2, 1, 0]`, scale `5.74`

**File to modify:** `app/_lib/models.ts`

**Approach:**
1. Add temporary `console.log` calls in BOTH `TrexSkeleton.tsx` (after line 32) and `TrexSkin.tsx` (after line 116) that print the computed bounding box `center`, `size`, and `centerOffset` for each model
2. Open the app in browser, check console — the difference between the two centers tells us exactly how much the skin needs to shift
3. Adjust `MODEL_XFORM.skin.position` (primarily Y and Z) to compensate for the measured offset
4. May also need to fine-tune `MODEL_XFORM.skin.scale` (currently `5.74`)
5. The skeleton is the reference — only adjust the SKIN to match it
6. Remove debug logging after alignment is confirmed

**Verify:** Both models visible simultaneously (during toggle mid-transition). Skin should perfectly envelop skeleton — feet, head, and tail all aligned.

**Deploy (`npx vercel --prod --force`) & verify before moving to Step 2.**

---

## Step 2: Fix Explode — Bone Name Mapping

**Problem:** Clicking Explode does nothing. Console shows:
```
[Explode] Bone "Cabeza_Armature.Rexy" not found for segment "skull"
...
[Explode] Initialized 0/9 segments
```

**Root Cause:** The bone names in `SEGMENT_BONES` (`app/_lib/explodePresets.ts:7-17`) use names like `Cabeza_Armature.Rexy`, but the skeleton GLB's actual bone names are different. The explode init in `app/_lib/three/explode.ts:63-70` does exact string matching.

**File to modify:** `app/_lib/explodePresets.ts`

**Approach:**
1. Open the deployed app with `?dev=1` query param
2. Click "Log All Bones" in the DevPanel — prints all 100 bone names to console
3. Copy the full array of available bone names
4. For each of the 9 segments in `SEGMENT_BONES`, find the correct bone name from the available list:
   - `skull` → head/cabeza root bone
   - `neck` → cuello/neck bone
   - `chest` → pecho/spine/chest bone
   - `arm_l` / `arm_r` → clavicula or arm bones with .L/.R
   - `pelvis` → pelvis/hip bone
   - `tail` → cola/tail root bone
   - `leg_l` / `leg_r` → muslo/thigh bones with .L/.R
5. Update `SEGMENT_BONES` with the exact matching names (case-sensitive, exact string)
6. Do NOT change anything else in explodePresets.ts — directions, weights, and max distance are fine

**Verify:** Console shows `[Explode] Initialized 9/9 segments`. Clicking Explode visually separates bones in correct directions.

**Deploy & verify before moving to Step 3.**

---

## Step 3: Fix Skin Reveal Animation Jitter

**Problem:** The skeleton→skin transition is smooth for the first half, then stutters/jitters through the second half. The "melt" effect stalls partway through.

**Root Cause:** The current easing `out(2.5)` front-loads most of the motion — the clipping plane sweeps quickly through the first 50% of the Y range, then barely moves for the remaining distance. Combined with the skeleton fade starting at 35% progress (`fadeDelay: 0.35`), both the clipping sweep and the opacity crossfade pile up in the 30-50% time range. The second half feels "stuck" because the easing curve has nearly flattened. Additionally, any skin/skeleton misalignment (Step 1) makes this worse by revealing mismatched geometry mid-transition.

**Current values** (`app/_lib/motion.ts`):
- `skinRevealDuration`: `2800` (line 43)
- `animeSkinReveal`: `'out(2.5)'` (line 66)
- `fadeDelay`: `0.35` (line 76)

**File to modify:** `app/_lib/motion.ts`

**Approach (do this AFTER Step 1 alignment fix is deployed — alignment affects perceived smoothness):**
1. Change `animeSkinReveal` from `'out(2.5)'` to `'inOut(2)'` — distributes motion evenly across the full duration instead of front-loading it
2. Increase `skinRevealDuration` from `2800` to `3500` — gives the full sweep more breathing room
3. Adjust `fadeDelay` from `0.35` to `0.4` — delays skeleton fade so there's more simultaneous overlap between both models being visible
4. If `inOut(2)` still feels uneven, try `'linear'` with a shorter duration (~2500ms) as a fallback

**Verify:** Toggle skeleton↔skin repeatedly (both directions). Transition should be smooth and even from start to finish — no stutter, no stall, no jitter at any point.

**Deploy & verify before moving to Step 4.**

---

## Step 4: Tune Tour Camera Positions

**Problem:** Skull & Jaws and Arms & Claws chapters don't frame the subject correctly per the user's reference screenshots.

**Current values** (`app/_lib/tour.ts`):
- Skull & Jaws (line 37-38): `cameraPos: [4, 5, 5]`, `cameraTarget: [2, 4, 1]`
- Arms & Claws (line 51-52): `cameraPos: [-2, 3, 8]`, `cameraTarget: [2, 2, 0]`

**Reference framing (from user screenshots):**
- **Skull & Jaws:** Close-up from front-right. Skull fills ~60% of viewport. Model is center-left, facts panel visible on right. Slight upward viewing angle.
- **Arms & Claws:** View from behind-right looking at the arms/claws area. Slight downward angle. Full body visible but arms are prominent in lower-right of frame.

**File to modify:** `app/_lib/tour.ts`

**Approach:**
1. Open app with `?dev=1`
2. Use OrbitControls to manually frame the skull matching the Skull & Jaws reference screenshot
3. Click "Copy Camera" in DevPanel to capture the exact `position` and `target`
4. Update `skull` chapter's `cameraPos` and `cameraTarget` in `tour.ts` (lines 37-38)
5. Repeat for Arms & Claws — navigate to desired angle, copy camera, update `arms` chapter (lines 51-52)
6. Review other chapters (overview, legs_tail, reassembled) and adjust only if they also feel wrong

**Verify:** Enter tour mode, navigate all 5 chapters with arrow keys. Each chapter frames its subject correctly with smooth camera dolly transitions between them.

**Deploy to production for final verification.**

---

## Final Verification Checklist

After all 4 steps are complete and deployed:

- [ ] Skin model aligns perfectly with skeleton (no offset)
- [ ] Explode initializes 9/9 segments, bones visually separate
- [ ] Skeleton ↔ Skin toggle is smooth from start to finish (both directions)
- [ ] Skull & Jaws chapter frames the skull close-up from front-right
- [ ] Arms & Claws chapter frames the arms from behind-right
- [ ] All tour chapters have smooth camera transitions
- [ ] No console errors or warnings
- [ ] Production verified at https://dino-demo-ach.vercel.app
