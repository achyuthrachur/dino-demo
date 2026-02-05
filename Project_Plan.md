# Project Plan: Digital Museum - Infinite Mesozoic

## 1. Project Overview

### Summary
A cinematic, interactive 3D digital museum exhibit featuring high-fidelity dinosaur specimens. The application serves as a "scanning deck" allowing users to explore a registry of Raptors and a T. rex through explode mechanics, X-ray scan modes, and comparative analysis. It features a "Presenter Mode" for gesture-controlled demonstrations (Minority Report style) and a "Museum vs Scientific" data toggle.

### Project Type
Web App / Digital Exhibit

### Core Value Proposition
Provides a "hands-on" curation experience accessible anywhere. It satisfies both casual awe (via cinematic visuals) and scientific curiosity (via data toggles), while empowering educators with touch-free gesture controls.

### Assumptions Made
- **Assets**: We will use placeholder "low-poly" or procedural assets until high-quality CC0 GLB fossils are sourced/verified.
- **Hardware**: Users have WebGL-capable devices. Presenter Mode requires a robust webcam and decent lighting.
- **Licensing**: Strict adherence to CC0/MIT for all assets.

---

## 2. Technical Architecture

### Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14+ (App Router) | React Server Components for heavy initial shell, static export capability. |
| Styling | Tailwind CSS + CSS Variables | Rapid UI development with comprehensive design token control. |
| Components | shadcn/ui + Custom | Accessible primitives (@radix-ui) allowing custom "Sci-Fi Museum" aesthetic. |
| 3D Engine | React Three Fiber (Three.js) | React-declarative 3D scene management, vast ecosystem (@react-three/drei). |
| Motion | Anime.js | High-performance DOM animations for UI/HUD (placards, counters). |
| Gestures | MediaPipe Tasks Vision | Client-side, privacy-focused, robust hand tracking for Presenter Mode. |
| Utils | convert-units, sonner | Unit conversion logic and accessible toast notifications. |
| State | Zustand | Minimal store for complex global states (Explode factor, Scan mode, Presenter active). |

### Directory Structure
```
src/
  app/
    page.tsx                    # Main Exhibit Container
    (routes)/
      sources/                  # Credits & Licenses (Strict Tracking)
      accession/
        [id]/                   # Deep link to specific specimen state
    layout.tsx                  # Global Providers (Theme, Tooltips)
  components/
    canvas/                     # 3D Components
      Scene.tsx                 # Main R3F Canvas
      Specimen.tsx              # Generic Dinosaur Controller
      CameraRig.tsx             # Choreographed camera movements
      ScanEffect.tsx            # Post-processing wrapper
    ui/                         # shadcn/ui components
    exhibit/                    # App-specific UI
      Controls.tsx              # Bottom control bar
      CompareDrawer.tsx         # Slide-out comparison
      PresenterHUD.tsx          # Webcam feedback overlay
      Placard.tsx               # Cinematic text panels
  lib/
    utils.ts                    # Tailwind merge helpers
    store.ts                    # Zustand state
    registry.ts                 # Source of truth for Specimen Data
    gestures.ts                 # MediaPipe logic & mappings
    motion.ts                   # Anime.js easing constants
  styles/
    globals.css                 # Theme variables
```

### Data Models
```typescript
type ConfidenceLevel = 'certain' | 'likely' | 'debated';
type SpecimenType = 'theropod' | 'sauropod' // etc

interface SpecimenData {
  id: string; // e.g., 'velociraptor-mongoliensis'
  displayName: string;
  taxonomyLabel: string; // e.g., 'Dromaeosauridae • Late Cretaceous'
  group: 'raptor' | 'tyrannosaur';
  
  // Model Assets
  models: {
    skeleton: string; // URL to GLB
    skin?: string;    // Optional: toggleable skin mesh
    fossil?: string;  // Optional: rock encasing
  };
  
  // "Growth Shock" Support
  variants?: {
    label: string; // e.g. "Juvenile", "Adult"
    modelOverride: string; // GLB URL
    stats: SpecimenStats;
  }[];

  stats: SpecimenStats;
  
  presentation: {
    color: string; // Hex for UI accents
    scale: number; // Normalization factor to fit view
    camera: {
      idle: [number, number, number]; // Position [x,y,z]
      head: [number, number, number];
      claw?: [number, number, number]; // Special focus points
    };
  };
  
  bones: BoneMetadata[];
  
  content: {
    facts: string[];
    myths: string[];
    sources: SourceCitation[];
  };
}

interface SpecimenStats {
  length: { museum: string; scientific: [number, number] }; // [min, max] in meters
  weight: { museum: string; scientific: [number, number] }; // kg
  location: string;
}

interface BoneMetadata {
  meshName: string; // Matches node name in GLB
  label: string;
  description: string;
  anchor: [number, number, number]; // Vector3 for label line
  explodeVector: [number, number, number]; // Direction to fly
  confidence: ConfidenceLevel;
}
```

---

## 3. Design Specifications

### Color Palette: "Paleontological Noir"
A dramatic, high-contrast "Dark Mode" native palette.

```css
:root {
  --background: #0c0a09;    /* Warm Black (Stone-950) */
  --foreground: #f2f2f0;    /* Bone White (Stone-50) */
  --color-brand: #e7e5e4;       /* Stone-200 */
  --color-brand-muted: #57534e; /* Stone-600 */
  --color-accent: #d97706;      /* Amber-600 (Focus/Selection) */
  --color-scientific: #65a30d;  /* Lime-600 (Scientific Mode) */
  --color-laser: #ef4444;       /* Red-500 (Scan lines/X-Ray) */
  --card: rgba(28, 25, 23, 0.8);      /* Stone-900 with Alpha */
  --hud-glass: rgba(12, 10, 9, 0.6);
}
```

### Typography
- **Headlines**: **Fraunces** (Editorial/Museum feel).
- **UI/Body**: **Manrope** (Modern, clean sans).
- **Scientific Data**: **JetBrains Mono** (Technical precision).

---

## 4. Animation Specifications ("Motion Bible")

### Easing Families
1.  **Snap** (`cubic-bezier(0, 1, 0, 1)`): Instant feedback, used for cursor interactions and toggles.
2.  **Glide** (`cubic-bezier(0.4, 0, 0.2, 1)`): Smooth camera moves, carousel transitions (300-500ms).
3.  **Impact** (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`): Heavy scaling, "thud" effects for placard entry (spring-like).

### Scheduled Set Pieces
1.  **Carousel "Pedestal Swap"**:
    - **Trigger**: Switching Raptors.
    - **Action**: 
        1. Camera "whip pans" sideways (motion blur).
        2. Old model unmounts, new model mounts instantly during blur.
        3. Placards "card swap" (old slides out, new slides in).
2.  **Claw Mechanics**:
    - **Trigger**: Clicking the Sickle Claw annotation.
    - **Action**: Camera locks to foot -> Foot bones isolate/explode outwards -> Annotation line draws.
3.  **Microraptor Glide**:
    - **Trigger**: Specific "Airflow" toggle.
    - **Action**: SVG streamlines draw over the model pose.
4.  **Growth Shock (T-Rex)**:
    - **Trigger**: Radius Slider or Toggle.
    - **Action**: Ghosted overlay of Juvenile mesh fades in over Adult mesh. Dimensions lerp between values.

**Reduced Motion**: All camera whips become cross-fades; springs disabled.

---

## 5. Components & Interactions

### Components
- **PresenterHUD**: Visualization of MediaPipe hands (bones/box) + Confidence meter.
- **CompareDrawer**: Overlay showing 2D silhouettes of current vs target dino.
- **ScanControls**: ToggleGroup for 'Skeleton' | 'Skin' | 'X-Ray'.

### Presenter Mode: Gesture Mappings
*Safety: Visual confirmation via Toast (`sonner`) and HUD.*

| Gesture | Mapped Action | Parameter |
|---------|---------------|-----------|
| **One-hand Pinch & Drag** | Rotate Specimen | Yaw/Pitch (Clamped) |
| **Two-hand Pinch & Spread** | Zoom | Camera Distance |
| **Two-hand Open Palms (Distance)** | Explode / Reassemble | Explode Factor (0-1) |
| **Open Palm Hold (1s)** | Toggle Callouts | Visibility Boolean |
| **"Peace" Sign (V)** | Toggle Scan Mode | Cycle Material |
| **Kill Switch** | Disable Presenter Mode | **ESC Key** (Hard bind) |

---

## 6. Content Strategy: The Lineup

### Tab 1: Raptors (The Evolution of Feathers)
1.  **Velociraptor mongoliensis** (The Standard)
2.  **Deinonychus antirrhopus** (The Renaissance Starter)
3.  **Utahraptor ostrommaysorum** (The Heavyweight)
4.  **Microraptor gui** (The Glider / Curveball)
    *   *Fallback*: Dromaeosaurus

### Tab 2: Tyrannosaurus Rex
- **Focus**: The "Growth Shock" (Juvenile vs Adult) and Skull Mechanics.

---

## 7. Implementation Tasks

### Phase 1: Foundation
- [ ] Initialize Next.js, Tailwind, shadcn/ui.
- [ ] Install dependencies: `three`, `@react-three/fiber`, `animejs`, `zustand`, `@mediapipe/tasks-vision`, `convert-units`, `sonner`.
- [ ] Create `SpecimenData` types and Mock Registry.

### Phase 2: Core 3D & UI
- [ ] Build `Scene` and `Specimen` loader.
- [ ] Implement Explode logic (Vector3 translation based on slider).
- [ ] Build Main Layout (Tabs, Bottom Dock).

### Phase 3: The "WOW" Animations
- [ ] Implement "Pedestal Swap" Camera Rig.
- [ ] Create "Scan Mode" Shaders (Fresnel/X-ray).
- [ ] Build "Claw Mechanics" interaction.

### Phase 4: Presenter Mode
- [ ] Integrate MediaPipe Tasks Vision.
- [ ] Build `GestureGuard` HUD.
- [ ] Tune Smoothness/Dead-zones for gesture mapping.

### Phase 5: Polish & Data
- [ ] Implement Museum/Scientific toggles (Units/Text).
- [ ] Populate full content (Facts, Myths, Sources).
- [ ] License Audit.

---

## 8. Launch Checklist
- [ ] **Performance**: 60fps on average laptop (optimize high-poly GLBs if needed).
- [ ] **Attribution**: Every CC0 asset listed in `/sources`.
- [ ] **Accessibility**: Presenter Mode has clear visual feedback; reduced motion works.
