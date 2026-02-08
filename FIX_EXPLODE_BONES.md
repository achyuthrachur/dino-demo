# FIX: Explode Bone Names (0/9 → 9/9)

## Problem
The explode/tour system is completely broken. `explodePresets.ts` defines bone names with period separators (e.g. `Cabeza_Armature.Rexy`) but the actual `skeleton-rigged.glb` model uses no periods (e.g. `Cabeza_ArmatureRexy`). Result: `initExplodeState()` matches 0/9 segments, all explode animations are no-ops.

## Root Cause
Bone name format mismatch in `SEGMENT_BONES` constant.

## Fix — Single File

### File: `app/_lib/explodePresets.ts`

Find the `SEGMENT_BONES` object and replace ALL 9 bone name values:

```typescript
// BEFORE (wrong — period separators)
export const SEGMENT_BONES: Record<SegmentId, string> = {
  skull:   'Cabeza_Armature.Rexy',
  neck:    'Cuello_Armature.Rexy',
  chest:   'Pecho_Armature.Rexy',
  arm_l:   'Clavicula.L_Armature.Rexy',
  arm_r:   'Clavicula.R_Armature.Rexy',
  pelvis:  'Pelvis_Armature.Rexy',
  tail:    'Cola.1_Armature.Rexy',
  leg_l:   'Muslo.L_Armature.Rexy',
  leg_r:   'Muslo.R_Armature.Rexy',
};

// AFTER (correct — matches actual model bone names)
export const SEGMENT_BONES: Record<SegmentId, string> = {
  skull:   'Cabeza_ArmatureRexy',
  neck:    'Cuello_ArmatureRexy',
  chest:   'Pecho_ArmatureRexy',
  arm_l:   'ClaviculaL_ArmatureRexy',
  arm_r:   'ClaviculaR_ArmatureRexy',
  pelvis:  'Pelvis_ArmatureRexy',
  tail:    'Cola1_ArmatureRexy',
  leg_l:   'MusloL_ArmatureRexy',
  leg_r:   'MusloR_ArmatureRexy',
};
```

### Name Mapping Reference (Spanish → English)

| Segment ID | Bone Name | Translation |
|-----------|-----------|-------------|
| skull | `Cabeza_ArmatureRexy` | Head |
| neck | `Cuello_ArmatureRexy` | Neck |
| chest | `Pecho_ArmatureRexy` | Chest |
| arm_l | `ClaviculaL_ArmatureRexy` | Left Clavicle |
| arm_r | `ClaviculaR_ArmatureRexy` | Right Clavicle |
| pelvis | `Pelvis_ArmatureRexy` | Pelvis |
| tail | `Cola1_ArmatureRexy` | Tail (1st segment) |
| leg_l | `MusloL_ArmatureRexy` | Left Thigh |
| leg_r | `MusloR_ArmatureRexy` | Right Thigh |

## No Other Files Need Changes
The rest of the explode pipeline references segments by ID (not bone names):
- `explode.ts` — lookup uses `SEGMENT_BONES[segId]` → will now find bones
- `ExplodeController.tsx` — calls `applyExplode()` with progress/weights → unchanged
- `tour.ts` — chapters specify segment weights by ID → unchanged
- `director.ts` — animates `explodeProgress` 0→1 → unchanged

## Verification
1. `npm run build` — confirm no type errors
2. `npm run dev` → open `?dev=1` → click "Log All Bones" → console should show `Initialized 9/9 segments`
3. Arrow keys to navigate tour chapters → bones should visibly separate
4. Space key to toggle explode → all segments spread outward
5. `npx vercel --prod --force` → test on production
