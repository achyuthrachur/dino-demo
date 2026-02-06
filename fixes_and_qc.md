# Issue Diagnosis & Fixes: Dino Demo

> **Status**: Critical Assets Missing
> **Impact**: App crashes on load with "3D Scene Failed to Load"

---

## 1. Issues Identified

### A. Missing 3D Assets (Critical)
The application expects **14** specific `.glb` files across 5 directories.
**Current State**: Only `1` file exists (`public/models/tyrannosaurus-rex/skeleton.glb`).

**Missing Files:**
1.  `/models/velociraptor-mongoliensis/skeleton.glb` (Default startup model -> **Crash cause**)
2.  `/models/velociraptor-mongoliensis/skin.glb`
3.  `/models/deinonychus-antirrhopus/skeleton.glb`
4.  `/models/deinonychus-antirrhopus/skin.glb`
5.  `/models/utahraptor-ostrommaysorum/skeleton.glb`
6.  `/models/utahraptor-ostrommaysorum/skin.glb`
7.  `/models/microraptor-gui/skeleton.glb`
8.  `/models/microraptor-gui/skin.glb`
9.  `/models/tyrannosaurus-rex/skin.glb`
10. `/models/tyrannosaurus-rex/fossil.glb`
11. `/models/tyrannosaurus-rex/juvenile-skeleton.glb`

### B. URL Configuration
User requested change to `dino-demo-ach.vercel.app`.
*   **Action**: This cannot be set in code. It must be done in the Vercel Dashboard under **Settings > Domains**.

---

## 2. Fix Instructions

### Step 1: Populate Placeholder Assets (Immediate Fix)
To stop the crashing, we must ensure every path in `registry.ts` resolves to a valid GLB file.

**Action**:
1.  Copy the existing `public/models/tyrannosaurus-rex/skeleton.glb` (the only valid file).
2.  create the missing folders in `public/models`.
3.  Paste and rename the file to match **every** missing file listed above.
    *   *Result*: You will see a T-Rex skeleton for every dinosaur, but the app will **load** and allow UI/Animation development.

### Step 2: Update Vercel Project
1.  Go to Vercel Dashboard.
2.  Select Project.
3.  Settings > Domains.
4.  Add `dino-demo-ach.vercel.app`.

---

### C. Gesture Control Failures
User reports gestures (especially 2-hand) are non-functional.
**Diagnosis**:
1.  **Sensitivity**: Hardcoded normalization values (0.1 to 0.8) may not match real-world webcam distances.
2.  **Missing "Pan"**: Current logic only supports Rotate (Pinch-Drag) and Zoom (Pinch-Spread). "Moving things around" (Pan) is unimplemented.
3.  **Feedback**: No visual indicator when a gesture is "locked on".

**Fix Instructions:**
1.  **Calibrate Two-Hand Explode**:
    *   In `src/lib/gestures.ts` -> `detectTwoOpenPalms`.
    *   Adjust `normalizedValue` logic. Current: `(distance - 0.1) / 0.7`.
    *   *Fix*: Log `distance` to console during dev to find natural arm span values. Likely needs to be `(distance - 0.2) / 0.5` for easier triggering.
2.  **Implement Two-Hand Pan**:
    *   Map "Two Closed Fists" moving in unison to X/Y Pan.
    *   *Alternative*: Add keyboard modifiers to mouse controls as fallback.
3.  **Visual Debugger**:
    *   Ensure `PresenterHUD.tsx` draws a literal line between hands when "Explode" is active, turning GREEN when value > 0.

---

## 3. QC Agent Instructions

**Prompt to spawn a QC Agent:**

```text
You are a specialized QC Agent for a 3D Web Application.
Your goal is to systematically verify the "Infinite Mesozoic" digital exhibit.
Target URL: localhost:3000 (ensure server is running)

### Test Sequence:

#### 1. Smoke Test (Startup)
- Load the page.
- Verify no "3D Scene Failed to Load" error screen.
- Verify the "Velociraptor" title is visible.

#### 2. Navigation & State
- Click "T. Rex" tab.
- Verify the model changes (or placeholder loads).
- Verify the URL does not break.
- Click back to "Raptors".
- Click each Raptor card (Velociraptor, Deinonychus, Utahraptor, Microraptor).

#### 3. Interaction Verification (Mouse/Touch)
- **Hover**: Hover over the "Skull" and "Claw" annotations. Check for text popup.
- **Explode**: If an "Explode" slider exists, drag it. Verify the model pieces separate.
- **X-Ray**: Toggle "Scan" or "Skin" mode. Verify visual change.

#### 4. Gesture Control Verification (Crucial)
*Requires Webcam*
- **Enable Presenter Mode**: Click the "Hand" icon or press "P".
- **two-Hand Explode**:
    1.  Hold both hands up, open palms, close together (chest height).
    2.  Slowly pull hands apart.
    3.  **Expected**: Dinosaur bones should expand outward.
    4.  **Fail Condition**: Nothing happens, or jittery movement.
- **One-Hand Rotate**:
    1.  Pinch Thumb & Index finger (Left or Right hand).
    2.  Drag in air left/right.
    3.  **Expected**: Dinosaur rotates.
- **Two-Hand Zoom**:
    1.  Pinch with BOTH hands.
    2.  Pull hands apart.
    3.  **Expected**: Camera zooms in/out.

#### 5. Performance Check
- Open Chrome DevTools > Console.
- Look for red errors (404s, WebGL context lost).
- Report any frame drops during transitions.

### Report Format:
- **Pass/Fail** for each step.
- **Console Logs**: Paste any critical errors.
- **Visuals**: Describe any glitches (e.g., "Model flashed white", "Text overlapped").
```
