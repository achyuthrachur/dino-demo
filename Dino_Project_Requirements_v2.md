# Project Requirements Document (PRD): Infinite Mesozoic - Digital Archive v2

> **Status:** Updated & Active (v2)
> **Project Type:** Personal Portfolio / Interactive Experience
> **Visual Goal:** "WOW" Factor / Cinematic / High-Fidelity
> **Brand Constraints:** ⛔ STRICTLY NO CROWE BRANDING (No corporate blues, no corporate fonts).
> **Tech Constraint:** ⚠️ **MUST USE FRAMER MOTION** for UI/UX.

---

## 1. Project Overview

### Summary
A cinematic, interactive 3D digital museum exhibit featuring high-fidelity dinosaur specimens. This is a "scanning deck" allowing users to explore a registry of Raptors and a T. rex through explode mechanics, X-ray scan modes, and comparative analysis. It features a "Presenter Mode" for gesture-controlled demonstrations (Minority Report style).

### Core Philosophy: "Personal Project"
This project is a playground for advanced graphics, animation, and interaction design. It prioritizes:
- **Visual Impact** over corporate safety.
- **Experimental UX** (Gestures, 3D interaction) over standard forms.
- **Performance** (60fps WebGL) over broad compatibility.

### The "WOW" Factor Elements
1.  **Pedestal Swaps**: Cinematic camera whip-pans with motion blur when switching specimens.
2.  **X-Ray/Scan Shaders**: Dynamic localized reveals of skeleton vs skin using custom shaders.
3.  **Holographic UI**: Glassmorphism, neon accents, and floating "HUD" elements that feel integrated into the 3D space.
4.  **Gesture Control**: "Minority Report" style hand tracking to rotate/explode models without touching the screen.

---

## 2. Technical Architecture

### Stack (Updated)
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4 + CSS Variables
- **3D Engine**: React Three Fiber (Three.js) + `@react-three/drei`
- **UI Animation**: **Framer Motion** (Mandatory)
  - Used for: Page transitions, shared layout animations (hero to detail), complex staggered UI entrances, and hover effects.
- **3D Animation**: Anime.js / React Spring
  - Used for: Interpolating 3D vector values (camera position, bone rotation) where Framer Motion might be less performant or harder to hook into the Three.js loop.
- **Gestures**: MediaPipe Tasks Vision (Hand tracking)
- **State**: Zustand

### Missing / To-Be-Built Features
Based on the current codebase analysis, the following need implementation or refinement:

1.  **Integrate Framer Motion** (New Requirement)
    - *Status*: Not installed.
    - *Requirement*: Install `framer-motion`. Replace CSS entry animations with `motion.div` StaggerChildren. Implement `<AnimatePresence>` for tab switching (Raptors vs T-Rex).

2.  **Advanced Shaders (The "Scan" Effect)**
    - *Status*: Basic structure exists (`ScanEffect.tsx`).
    - *Requirement*: Needs a custom shader material that can transition between "Fossil", "Skin", and "X-Ray" modes interactively, with a glowing "scan line" effect.

3.  **"Pedestal Swap" Camera Rig**
    - *Status*: `CameraRig.tsx` exists.
    - *Requirement*: Implement the coordinated "Whip Pan + Model Swap" sequence. The old model should slide out while the new one slides in, synced with camera movement.

4.  **Presenter Mode Polish**
    - *Status*: `gestures.ts` and `PresenterHUD.tsx` exist.
    - *Requirement*: visual feedback for gestures needs to be "holographic" and immediate. Needs a "Connector Line" drawn between the user's hand and the 3D model when "grabbing".

5.  **Comparision Drawer**
    - *Status*: `CompareDrawer.tsx` exists.
    - *Requirement*: Complete the 2D silhouette comparison overlay. Ensure it animates smoothly from the side/bottom using **Framer Motion**.

---

## 3. Design Specifications

### Aesthetic: "Neon Paleontology" / "Cyberpunk Archive"

**Color Palette:**
```css
@theme {
  /* The Void */
  --color-background: #050505;

  /* The Bone */
  --color-foreground: #f2f2f0;

  /* The Energy (Neon Accents) */
  --color-neon-amber: #f59e0b;
  --color-neon-blue: #0ea5e9;
  --color-neon-acid: #84cc16;
  --color-neon-danger: #ef4444;

  /* Glass */
  --color-glass-surface: rgba(255, 255, 255, 0.05);
  --color-glass-border: rgba(255, 255, 255, 0.1);
  --shadow-neon: 0 0 20px var(--color-neon-amber);
}
```

### Typography
- **Headlines**: **Fraunces**
- **UI Data**: **JetBrains Mono**
- **Body**: **Manrope**

### Animation ("Motion Bible" - Framer Motion Edition)

**1. Page/Tab Transitions (`<AnimatePresence>`)**
```jsx
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  {children}
</motion.div>
```

**2. Staggered Entrances (Lists/Cards)**
```jsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
```

**3. Interactive Elements (Hover/Tap)**
```jsx
<motion.button
  whileHover={{ scale: 1.05, boxShadow: "0 0 15px var(--color-neon-blue)" }}
  whileTap={{ scale: 0.95 }}
>
  Click Me
</motion.button>
```

---

## 4. Implementation Checklist

### Phase 0: Dependencies
- [ ] Install `framer-motion`.
- [ ] Configure `LazyMotion` (optional) for bundle size optimization.

### Phase 1: Visual Overhaul (The "WOW")
- [ ] **Refine Global CSS**: darker "Void" palette.
- [ ] **UI Polish**: Glassmorphism + Neon.

### Phase 2: Animation Migration
- [ ] **Refactor SpecimenSelector**: Replace Anime.js entrance with Framer Motion variants.
- [ ] **Refactor Placard**: Use Framer Motion for text reveal.
- [ ] **Add Layout Animations**: Use `layoutId` for smooth transitions between "Grid View" and "Detail View" (if applicable).

### Phase 3: Core Features (Simultaneous)
- [ ] **Scan Shaders** (WebGL)
- [ ] **Camera Polishing** (React Three Fiber)
- [ ] **Presenter Mode** (MediaPipe)

---

## 5. Success Metrics
1.  **Visual Impact**: Does it look like a high-end video game menu?
2.  **Fluidity**: 60fps stable.
3.  **Interaction**: Hand motion feels 1:1 responsive.
