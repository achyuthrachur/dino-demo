# Museum-Style Annotation Leader Lines

## Problem
The tour FactsPanel shows facts in a fixed right-side panel with no visual connection to the skeleton. It doesn't feel like a museum exhibit — facts float independently of the specimen.

## Goal
Draw animated leader lines from the skeleton bones to the fact labels during tour chapters, creating a classic museum callout annotation pattern.

## Visual Design
```
                                  ╭──── Fact 1
  (bone dot) ─────────────── ────┤──── Fact 2
                                  ├──── Fact 3
                                  ╰──── Fact 4
```
- Small glowing dot at the bone anchor point on the skeleton
- Single trunk line from bone → left edge of facts panel
- Short horizontal branches from trunk to each fact bullet
- Accent color (#7CF7C6), 1.5px, with subtle glow
- Animated draw-on entrance (SVG stroke-dashoffset)
- Overview chapters (0, 4) show no lines — they're about the whole skeleton

---

## Architecture

The key challenge: bone positions live in the 3D R3F Canvas, but fact labels are 2D HTML overlays. Solution is a 3-piece bridge:

1. **BoneProjector** — R3F component inside Canvas, projects bone world position → screen XY every frame
2. **Shared mutable ref** — module-level object (no React state/re-renders), written by BoneProjector, read by AnnotationLines
3. **AnnotationLines** — HTML overlay with fullscreen SVG, draws leader lines from projected bone to fact bullets

---

## Implementation Steps

### Step 1: Create `app/_lib/boneProjection.ts`

Shared mutable ref for the projected bone screen position:

```typescript
export interface ProjectedPoint {
  x: number;       // screen pixels from left
  y: number;       // screen pixels from top
  visible: boolean; // false if behind camera or no anchor for this chapter
}

// Module-level mutable — BoneProjector writes, AnnotationLines reads
// No React state = no re-renders = zero overhead
export const projectedAnchor: ProjectedPoint = { x: 0, y: 0, visible: false };
```

### Step 2: Add `anchorBone` to tour chapters

**File: `app/_lib/tour.ts`**

Add optional field to `ChapterDef`:

```typescript
export interface ChapterDef {
  id: string;
  title: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  explodeAmount: number;
  weights: SegmentWeights;
  facts: string[];
  /** Bone name for leader line anchor. Undefined = no leader lines (overview chapters). */
  anchorBone?: string;
}
```

Add to specific chapters:

| Chapter | Add field |
|---------|-----------|
| 0 - Full Skeleton | *(none — overview)* |
| 1 - Skull & Jaws | `anchorBone: 'Cabeza_ArmatureRexy'` |
| 2 - Arms & Claws | `anchorBone: 'Pecho_ArmatureRexy'` |
| 3 - Legs & Tail | `anchorBone: 'Cola1_ArmatureRexy'` |
| 4 - Reassembled | *(none — overview)* |

### Step 3: Add timing constants to `app/_lib/motion.ts`

Add to `DURATION_MS`:

```typescript
// ── Leader Lines ──
leaderDraw: 700,          // trunk line draw-on duration (ms)
leaderBranchStagger: 120, // delay between each branch line draw
leaderBranchDraw: 200,    // each branch draw-on duration
leaderDotPulse: 400,      // anchor dot scale-in + glow
leaderExit: 300,          // fade out on chapter exit
```

Add to `EASING`:

```typescript
animeLeaderDraw: 'out(4)',  // smooth deceleration for line draw
```

### Step 4: Create `app/_components/BoneProjector.tsx`

R3F component that runs inside the Canvas. Renders null (no visuals).

```typescript
'use client';

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useDirector } from '../_lib/director';
import { CHAPTERS } from '../_lib/tour';
import { projectedAnchor } from '../_lib/boneProjection';

// Pre-allocate to avoid per-frame GC
const _worldPos = new THREE.Vector3();

interface Props {
  skeletonScene: THREE.Object3D | null;
}

export function BoneProjector({ skeletonScene }: Props) {
  const { camera, size } = useThree();

  // Cache bone lookups: boneName → THREE.Bone
  const boneCache = useRef<Map<string, THREE.Bone>>(new Map());

  // Find bone by name (cached)
  function findBone(name: string): THREE.Bone | null {
    if (boneCache.current.has(name)) return boneCache.current.get(name)!;
    if (!skeletonScene) return null;

    let found: THREE.Bone | null = null;
    skeletonScene.traverse((child) => {
      if (!found && child.name === name && ((child as THREE.Bone).isBone || child.type === 'Bone')) {
        found = child as THREE.Bone;
      }
    });

    if (found) boneCache.current.set(name, found);
    return found;
  }

  useFrame(() => {
    const { activeChapter, phase } = useDirector.getState();

    // No anchor for home or invalid chapters
    if (phase === 'home' || activeChapter < 0) {
      projectedAnchor.visible = false;
      return;
    }

    const chapter = CHAPTERS[activeChapter];
    if (!chapter?.anchorBone) {
      projectedAnchor.visible = false;
      return;
    }

    const bone = findBone(chapter.anchorBone);
    if (!bone) {
      projectedAnchor.visible = false;
      return;
    }

    // Get bone world position
    bone.getWorldPosition(_worldPos);

    // Project to NDC (-1..1)
    _worldPos.project(camera);

    // Check if behind camera (z > 1 in NDC)
    if (_worldPos.z > 1) {
      projectedAnchor.visible = false;
      return;
    }

    // Convert NDC to screen pixels
    const screenX = (_worldPos.x * 0.5 + 0.5) * size.width;
    const screenY = (_worldPos.y * -0.5 + 0.5) * size.height;

    // Only update if moved more than 1px (reduce jitter)
    const dx = Math.abs(screenX - projectedAnchor.x);
    const dy = Math.abs(screenY - projectedAnchor.y);

    if (dx > 1 || dy > 1 || !projectedAnchor.visible) {
      projectedAnchor.x = screenX;
      projectedAnchor.y = screenY;
    }
    projectedAnchor.visible = true;
  });

  // Clear cache when skeleton changes
  useRef(() => { boneCache.current.clear(); });

  return null;
}
```

**Key patterns reused from `ExplodeController.tsx`:**
- `useFrame` + `useDirector.getState()` for non-reactive per-frame reads
- Pre-allocated `THREE.Vector3` for zero-GC projection
- `skeletonScene` prop + bone traversal

### Step 5: Create `app/_components/AnnotationLines.tsx`

HTML overlay component with fullscreen SVG. Uses its own `requestAnimationFrame` loop to read the projected anchor and draw lines to fact bullet positions.

```typescript
'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { animate } from 'animejs';
import { useDirector } from '../_lib/director';
import { useStore } from '../_lib/store';
import { projectedAnchor } from '../_lib/boneProjection';
import { CHAPTERS } from '../_lib/tour';
import { DURATION_MS, EASING } from '../_lib/motion';

export function AnnotationLines() {
  const mode = useStore((s) => s.mode);
  const activeChapter = useDirector((s) => s.activeChapter);
  const phase = useDirector((s) => s.phase);

  const svgRef = useRef<SVGSVGElement>(null);
  const rafId = useRef<number>(0);
  const prevChapter = useRef(-1);

  // Only show for skeleton mode, chapters with anchors, during touring
  const chapter = activeChapter >= 0 ? CHAPTERS[activeChapter] : null;
  const hasAnchor = !!chapter?.anchorBone;
  const visible = mode === 'skeleton' && hasAnchor && phase === 'touring';

  // Track line elements for animation
  const trunkRef = useRef<SVGPathElement>(null);
  const branchRefs = useRef<SVGPathElement[]>([]);
  const dotRef = useRef<SVGCircleElement>(null);

  // Build SVG paths from projected anchor to fact bullets
  const updatePaths = useCallback(() => {
    if (!svgRef.current || !projectedAnchor.visible) return;

    const { x: ax, y: ay } = projectedAnchor;

    // Query fact bullet positions
    const bullets = document.querySelectorAll('.fact-line .bullet-dot');
    if (bullets.length === 0) return;

    const bulletRects = Array.from(bullets).map(el => el.getBoundingClientRect());

    // Facts panel left edge (first bullet X minus a small offset)
    const panelLeftX = bulletRects[0].left - 12;

    // Vertical range of bullets
    const firstBulletY = bulletRects[0].top + bulletRects[0].height / 2;
    const lastBulletY = bulletRects[bulletRects.length - 1].top + bulletRects[bulletRects.length - 1].height / 2;
    const midBulletY = (firstBulletY + lastBulletY) / 2;

    // Trunk path: bone point → horizontal to panel left → vertical to mid bullets
    // Using an L-shaped path with a rounded corner
    const trunkPath = `M ${ax} ${ay} L ${panelLeftX} ${ay} L ${panelLeftX} ${midBulletY}`;

    // Or: stepped path bone → midpoint → panel
    // Horizontal from bone, then vertical to panel center
    const midX = panelLeftX - 20; // junction point, 20px left of panel
    const trunk = `M ${ax} ${ay} L ${midX} ${ay} L ${midX} ${firstBulletY} L ${midX} ${lastBulletY}`;

    if (trunkRef.current) {
      trunkRef.current.setAttribute('d', trunk);
    }

    // Branch paths: from junction (midX, bulletY) → bullet position
    bulletRects.forEach((rect, i) => {
      const by = rect.top + rect.height / 2;
      const bx = rect.left + rect.width / 2;
      const branchPath = `M ${midX} ${by} L ${bx} ${by}`;

      if (branchRefs.current[i]) {
        branchRefs.current[i].setAttribute('d', branchPath);
      }
    });

    // Anchor dot position
    if (dotRef.current) {
      dotRef.current.setAttribute('cx', String(ax));
      dotRef.current.setAttribute('cy', String(ay));
    }
  }, []);

  // rAF loop for smooth updates
  useEffect(() => {
    if (!visible) {
      projectedAnchor.visible = false; // signal to stop
      return;
    }

    let running = true;
    const loop = () => {
      if (!running) return;
      updatePaths();
      rafId.current = requestAnimationFrame(loop);
    };
    rafId.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafId.current);
    };
  }, [visible, updatePaths]);

  // Animate entrance when chapter changes
  useEffect(() => {
    if (!visible || activeChapter === prevChapter.current) return;
    prevChapter.current = activeChapter;

    // Wait a beat for facts to render, then animate lines in
    const timer = setTimeout(() => {
      // Trunk draw-on
      if (trunkRef.current) {
        const length = trunkRef.current.getTotalLength();
        trunkRef.current.style.strokeDasharray = String(length);
        trunkRef.current.style.strokeDashoffset = String(length);
        animate(trunkRef.current, {
          strokeDashoffset: 0,
          duration: DURATION_MS.leaderDraw,
          ease: EASING.animeLeaderDraw,
        });
      }

      // Branch draw-on (staggered)
      branchRefs.current.forEach((branch, i) => {
        if (!branch) return;
        const length = branch.getTotalLength();
        branch.style.strokeDasharray = String(length);
        branch.style.strokeDashoffset = String(length);
        animate(branch, {
          strokeDashoffset: 0,
          duration: DURATION_MS.leaderBranchDraw,
          delay: DURATION_MS.leaderDraw * 0.6 + i * DURATION_MS.leaderBranchStagger,
          ease: EASING.animeLeaderDraw,
        });
      });

      // Anchor dot pulse
      if (dotRef.current) {
        dotRef.current.style.opacity = '0';
        dotRef.current.style.transform = 'scale(0)';
        animate(dotRef.current, {
          opacity: 1,
          scale: 1,
          duration: DURATION_MS.leaderDotPulse,
          delay: 100,
          ease: 'out(3)',
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [visible, activeChapter]);

  if (!visible) return null;

  // Determine number of branch lines (4 facts per chapter)
  const factCount = chapter?.facts.length ?? 4;

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 14,
      }}
    >
      {/* Glow filter for accent lines */}
      <defs>
        <filter id="leader-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Trunk line */}
      <path
        ref={trunkRef}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
        filter="url(#leader-glow)"
      />

      {/* Branch lines */}
      {Array.from({ length: factCount }).map((_, i) => (
        <path
          key={i}
          ref={(el) => { if (el) branchRefs.current[i] = el; }}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}

      {/* Anchor dot at bone position */}
      <circle
        ref={dotRef}
        r="4"
        fill="var(--accent)"
        opacity="0"
        filter="url(#leader-glow)"
        style={{ transformOrigin: 'center', transformBox: 'fill-box' }}
      />
    </svg>
  );
}
```

**Key implementation notes:**
- Uses `requestAnimationFrame` loop (not React state) for smooth per-frame SVG updates
- Reads `projectedAnchor` (mutable ref) and `.bullet-dot` positions (DOM queries) each frame
- Anime.js `stroke-dashoffset` animation for the draw-on effect
- SVG `<filter>` for the accent glow
- z-index 14 = between Canvas (0) and FactsPanel (15)

### Step 6: Wire into TrexScene and page.tsx

**File: `app/_components/TrexScene.tsx`**

Add import and component:

```typescript
import { BoneProjector } from './BoneProjector';

// In the return JSX, after ExplodeController:
<ExplodeController skeletonScene={skeletonScene} />
<BoneProjector skeletonScene={skeletonScene} />
```

**File: `app/page.tsx`**

Add import and component between UIOverlay and ExhibitHUD:

```typescript
import { AnnotationLines } from './_components/AnnotationLines';

// In the return JSX:
<Scene />
<UIOverlay />
<AnnotationLines />
<ExhibitHUD />
<FactsPanel />
```

### Step 7: Add data attribute to FactsPanel

**File: `app/_components/FactsPanel.tsx`**

Add `data-fact-index` to each fact line for reliable DOM querying:

```tsx
// Line 173-174, change:
{displayChapter.facts.map((fact, i) => (
  <FactLine key={`${displayChapter.id}-${i}`} fact={fact} style={style} />
))}

// To:
{displayChapter.facts.map((fact, i) => (
  <FactLine key={`${displayChapter.id}-${i}`} fact={fact} style={style} index={i} />
))}
```

Also update the `FactLine` component to accept and apply `index`:

```tsx
interface FactLineProps {
  fact: string;
  style: AnimationStyle;
  index: number;
}

function FactLine({ fact, style, index }: FactLineProps) {
  // ... existing code ...
  return (
    <div
      className="fact-line"
      data-fact-index={index}
      style={{ /* ... existing styles ... */ }}
    >
      {/* ... existing children ... */}
    </div>
  );
}
```

### Step 8: Add CSS for leader line glow (optional enhancement)

**File: `styles/globals.css`**

Add after the existing `accent-glow-in` keyframe:

```css
/* Leader line anchor dot pulse */
@keyframes leader-dot-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(124, 247, 198, 0.6); }
  70%  { box-shadow: 0 0 12px 4px rgba(124, 247, 198, 0); }
  100% { box-shadow: 0 0 0 0 rgba(124, 247, 198, 0); }
}
```

---

## Animation Sequencing

When a chapter with an anchor activates:
1. Camera arrives → phase becomes `'touring'`
2. AnnotationLines detects anchor is visible (100ms delay for DOM settle)
3. Trunk line draws from bone point to panel edge (700ms, `out(4)`)
4. Branch lines draw to each bullet (staggered 120ms apart, 200ms each)
5. Anchor dot pulses in (400ms, scale 0→1 + glow)
6. Text animations run simultaneously (existing fossilDecode/museumEtch/boneCascade)

When exiting or switching chapters:
1. Lines fade out (300ms, opacity → 0)
2. Text exit runs (existing)
3. New chapter lines draw in after camera settles

## SVG Path Routing Logic

The trunk line uses a stepped path with a vertical spine:

```
Bone (ax, ay)
    │
    ├── horizontal ──→ junction (midX, ay)
    │                      │
    │                      ├── vertical down to first bullet Y
    │                      │
    │                      ├── vertical down to last bullet Y
    │                      │
    └──────────────── branches fork horizontally to each bullet
```

Where `midX = panelLeftEdge - 20px` (the vertical spine sits just left of the facts panel).

---

## Performance Notes
- `BoneProjector` uses pre-allocated `THREE.Vector3` (zero GC, matches `explode.ts` pattern)
- Only 1 bone projected per frame (trivial cost)
- `AnnotationLines` rAF loop only runs when visible
- SVG path strings only recalculated when anchor moves >1px (jitter threshold)
- `getBoundingClientRect()` on 4 bullets at ~60fps is negligible
- No React state updates in the hot path — all mutable refs

## Verification
1. `npm run build` — no type errors
2. `npm run dev` — navigate chapters:
   - **Ch 0 (Full Skeleton)**: No leader lines (overview)
   - **Ch 1 (Skull & Jaws)**: Line from skull bone → facts
   - **Ch 2 (Arms & Claws)**: Line from chest bone → facts
   - **Ch 3 (Legs & Tail)**: Line from tail bone → facts
   - **Ch 4 (Reassembled)**: No leader lines (overview)
3. Orbit the camera — lines should track the bone position
4. Toggle explode — lines follow the bone as it moves
5. Switch chapters — old lines fade, new lines draw in
6. `npx vercel --prod --force` — test on production
