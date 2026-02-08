# Fix: Model Positioning + UI Bar Redesign

## Part 1 — Model Vertical Positioning

### Problem

Both models still sit too low. The skeleton's feet clip behind the UI panel, and the skin floats slightly below center.

### Current Values (`app/_lib/models.ts`)

```ts
skeleton: { position: [2, -1, 0], scale: 1.15 }
skin:     { position: [2,  1, 0], scale: 5 }
```

### Target Values

Raise both models by increasing their Y positions. The skeleton needs a bigger bump than the skin.

```ts
export const MODEL_XFORM: Record<'skeleton' | 'skin', ModelTransform> = {
  skeleton: {
    position: [2, 1, 0],    // was -1 → raise to 1 (big lift)
    rotation: [0, 0, 0],
    scale: 1.15,
  },
  skin: {
    position: [2, 2, 0],    // was 1 → raise to 2 (small lift)
    rotation: [0, 0, 0],
    scale: 5,
  },
};
```

> **Tuning:** Skeleton Y between `0` and `2`, Skin Y between `1.5` and `3`. Both models should be vertically centered in the viewport with feet visible above the UI bar.

### How It Works

Both models use a two-group hierarchy:

```
<group position={xform.position} scale={xform.scale}>     ← MODEL_XFORM (what you're editing)
  <group position={centerOffset}>                          ← auto-calculated bounding box center
    <primitive object={scene} />                           ← raw model geometry
  </group>
</group>
```

The inner group auto-centers the geometry. The outer group applies an offset *after* centering — positive Y moves up, negative Y moves down.

---

## Part 2 — Collapse UI Panel to Single-Line Bar

### Problem

The bottom panel stacks title, mode buttons, animate button, and mode badge across 4 rows. It's too tall and covers the model. Collapse everything into one horizontal bar.

### Current Layout (stacked)

```
┌───────────────────────────────────┐
│       TYRANNOSAURUS REX           │
│                                   │
│      [Skeleton]  [Skin]           │
│                                   │
│          [Animate]                │
│                                   │
│        Mode: Skeleton             │
└───────────────────────────────────┘
```

### Target Layout (single-line bar)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TYRANNOSAURUS REX     [Skeleton] [Skin]     [Animate]    Mode: Skin   │
└─────────────────────────────────────────────────────────────────────────┘
```

### File to Edit: `app/_components/UIOverlay.tsx`

#### Step 1 — Make the outer container a horizontal flexbox

Change the `<motion.div>` wrapper styles from `textAlign: 'center'` to a horizontal flex row:

```tsx
style={{
  position: 'fixed',
  bottom: '1.5rem',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 10,
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem',
}}
```

#### Step 2 — Shrink the title

Remove `marginBottom` from the `<h1>` and reduce the font size:

```tsx
<h1
  style={{
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
  }}
>
  TYRANNOSAURUS REX
</h1>
```

#### Step 3 — Inline the mode buttons

Remove `marginBottom` from the mode button container — it's already `display: flex`:

```tsx
<div style={{ display: 'flex', gap: '0.5rem' }}>
  {/* Skeleton button */}
  {/* Skin button */}
</div>
```

#### Step 4 — Inline the Animate button

Remove the wrapping `<motion.div>` margin and make it sit inline. Change:

```tsx
style={{ marginBottom: '1rem' }}
```

To:

```tsx
style={{ /* no margin needed */ }}
```

#### Step 5 — Inline the mode badge

Remove the `position: relative` and `height` from the mode badge container. It just needs to sit in the flex row:

```tsx
<div style={{ fontSize: '0.8rem', color: 'var(--fg1)', whiteSpace: 'nowrap' }}>
```

#### Step 6 — Reduce glass panel padding

In `styles/globals.css`, slim down the panel padding for the bar feel:

```css
.glass-panel {
  background: rgba(10, 14, 28, 0.55);
  backdrop-filter: blur(10px);
  border-radius: 12px;                         /* was 16px */
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.75rem 1.5rem;                     /* was 1.5rem all around */
}
```

---

## Verification

1. `npm run dev` — check both modes locally
2. Confirm the bar is a single horizontal strip pinned to the bottom
3. Toggle Skeleton / Skin — both models should be vertically centered with feet visible
4. `npx vercel --prod --force` — deploy and verify at https://dino-demo-ach.vercel.app
