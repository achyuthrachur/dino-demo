# Fix: Skin ↔ Skeleton Model Alignment

## Measured World-Space Bounding Boxes

| | Center X | Center Y | Center Z | Size X | Size Y | Size Z |
|---|---------|---------|---------|--------|--------|--------|
| **Skeleton** | 2.000 | 1.000 | 0.000 | 10.434 | 8.389 | 16.765 |
| **Skin** | 2.000 | 1.459 | 0.861 | 4.812 | 8.388 | 19.722 |
| **Offset** | 0 | +0.459 | +0.861 | — | — | — |

## Diagnosis

- **Y axis**: Skin center is 0.459 units too high → skin needs to move DOWN
- **Z axis**: Skin center is 0.861 units too far forward → skin needs to move BACK
- **X axis**: Aligned, no change needed
- **Heights match**: 8.389 vs 8.388 — scale is correct, do NOT change scale

## The Fix

`TrexSkin.tsx` already supports a `centerCorrection` field that adjusts the inner group's `centerOffset`. Corrections are in the skin model's **local (pre-scale) space**.

Convert world-space offsets to local-space corrections by dividing by skin scale (`5.74`):

```
Y correction = -0.459 / 5.74 = -0.080
Z correction = -0.861 / 5.74 = -0.150
```

### File: `app/_lib/models.ts`

1. Add `centerCorrection` to the `ModelTransform` interface (if not already there):

```ts
export interface ModelTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  centerCorrection?: [number, number, number];
}
```

2. Add `centerCorrection` to the skin transform:

```ts
skin: {
  position: [2, 1, 0],
  rotation: [0, 0, 0],
  scale: 5.74,
  centerCorrection: [0, -0.08, -0.15],
},
```

### Test on dev server

1. `npm run dev`
2. Open `http://localhost:3000`
3. Both models should now overlap in world space
4. Toggle skeleton ↔ skin — no lateral/vertical shift during transition
5. If still slightly off, fine-tune correction values by ±0.02 increments

### After alignment is confirmed

1. Remove ALL debug `console.log` lines from `TrexSkeleton.tsx` and `TrexSkin.tsx`
2. Remove the `requestAnimationFrame` debug blocks from both files
3. Remove the `const size = ...` lines added for debugging
4. `npx next build` to verify clean build
5. `npx vercel --prod --force` to deploy
6. Verify at https://dino-demo-ach.vercel.app
