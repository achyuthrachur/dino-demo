# Project Requirements Document (PRD): Infinite Mesozoic - Digital Archive

> **Status:** Updated & Active
> **Project Type:** Personal Portfolio / Interactive Experience
> **Visual Goal:** "WOW" Factor / Cinematic / High-Fidelity
> **Brand Constraints:** ⛔ STRICTLY NO CROWE BRANDING (No corporate blues, no corporate fonts).

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

### Stack (Confirmed)
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4 (using `@theme` directives) + CSS Variables
- **3D Engine**: React Three Fiber (Three.js) + `@react-three/drei`
- **Animation**: Anime.js (Complex sequences) + Tailwind Animate (UI transitions)
  - *Note*: Framer Motion and React Spring are **NOT** in the project, despite initial plans. We are sticking to Anime.js + CSS for performance.
- **State**: Zustand

### Missing / To-Be-Built Features
Based on the current codebase analysis, the following need implementation or refinement:

1.  **Advanced Shaders (The "Scan" Effect)**
    - *Status*: Basic structure exists (`ScanEffect.tsx`).
    - *Requirement*: Needs a custom shader material that can transition between "Fossil", "Skin", and "X-Ray" modes interactively, with a glowing "scan line" effect.

2.  **"Pedestal Swap" Camera Rig**
    - *Status*: `CameraRig.tsx` exists.
    - *Requirement*: Implement the coordinated "Whip Pan + Model Swap" sequence. The old model should slide out while the new one slides in, synced with camera movement.

3.  **Presenter Mode Polish**
    - *Status*: `gestures.ts` and `PresenterHUD.tsx` exist.
    - *Requirement*: visual feedback for gestures needs to be "holographic" and immediate. Needs a "Connector Line" drawn between the user's hand and the 3D model when "grabbing".

4.  **Comparision Drawer**
    - *Status*: `CompareDrawer.tsx` exists.
    - *Requirement*: Complete the 2D silhouette comparison overlay. Ensure it animates smoothly from the side/bottom.

---

## 3. Design Specifications

### Aesthetic: "Neon Paleontology" / "Cyberpunk Archive"

**Color Palette (Updated for WOW):**
Move away from "Stone/Bone" only. Introduce vibrant, luminescent accents to contrast with the dark void.

```css
@theme {
  /* The Void */
  --color-background: #050505; /* Darker than before, true black void */

  /* The Bone */
  --color-foreground: #f2f2f0;

  /* The Energy (Neon Accents) */
  --color-neon-amber: #f59e0b; /* Amber-500: Active state */
  --color-neon-blue: #0ea5e9;  /* Sky-500: Information / Data */
  --color-neon-acid: #84cc16;  /* Lime-500: Scientific Mode */
  --color-neon-danger: #ef4444; /* Red-500: X-Ray / Warning */

  /* Glass */
  --color-glass-surface: rgba(255, 255, 255, 0.05);
  --color-glass-border: rgba(255, 255, 255, 0.1);
  --shadow-neon: 0 0 20px var(--color-neon-amber);
}
```

### Typography (Custom)
- **Headlines**: **Fraunces** (Editorial, sharp, elegant). *Keep this, it's distinctive.*
- **UI Data**: **JetBrains Mono** (Technical, coding feel).
- **Body**: **Manrope** or **Space Grotesk** (Modern, geometric).

**Strict Rule**: Do NOT use Crowe corporate fonts (e.g., standard Arial/Helvetica implementations if they are mandated, or any specific Crowe licensed fonts). Use Google Fonts as defined above.

### Animation ("Motion Bible")
- **Entrance**: UI elements should stagger in with a mix of opacity and slight Y-axis slide.
- **Interactions**: Buttons should have a "glitch" or "glow" effect on hover, not just a color change.
- **3D Transitions**: Heavy usage of "Spring" physics. No linear tweens for camera movement.

---

## 4. Implementation Checklist (Remaining Work)

### Phase 1: Visual Overhaul (The "WOW")
- [ ] **Refine Global CSS**: Update `src/styles/globals.css` to use the darker "Void" palette with neon accents.
- [ ] **UI Polish**: Add "glassmorphism" backdrops to all HUD elements (`PresenterHUD`, `Controls`, `Placard`).
- [ ] **Typography Check**: Verify varying font weights are used effectively (Bold headers, light technical specs).

### Phase 2: Core Enhancements
- [ ] **Finish Scan Shader**: Write the custom GLSL or `MeshStandardMaterial` setup for the X-Ray effect.
- [ ] **Camera Polish**: Tune the `CameraRig` for the "Pedestal Swap" cinematic effect.
- [ ] **Gesture visualizer**: Add a particle trail or glowing cursor following the hand in Presenter Mode.

### Phase 3: Content & Data
- [ ] **Registry Population**: Ensure all dinosaurs in `registry.ts` have valid GLB paths (even if using placeholders for now).
- [ ] **Fact Check**: Verify the "Museum" vs "Scientific" data stats in `registry.ts`.

---

## 5. Success Metrics
1.  **Visual Impact**: Does it look like a high-end video game menu?
2.  **Fluidity**: Does the 3D scene run at 60fps?
3.  **Interaction**: Does the hand tracking feel magical?
