# T-Rex Model & Animation Update Plan

## 1. File Operations (Claude Code)
Instructions to replace the static skeleton with the rigged, animated version.

**Commands to Execute:**
1.  **Backup** current model:
    ```bash
    mv "public/models/tyrannosaurus-rex/skeleton.glb" "public/models/tyrannosaurus-rex/skeleton_OLD.glb"
    ```
2.  **Move & Rename** new model:
    ```bash
    mv "C:/Users/rachura/Downloads/t-rex-skeleton-rigged-and-animated.glb" "public/models/tyrannosaurus-rex/skeleton.glb"
    ```

---

## 2. Code Implementation

### A. Update Store (`src/lib/store.ts`)
Add state to track the dinosaur's animation action.
*   **New State**: `animationAction: 'Idle' | 'Roar' | 'Walk'`
*   **New Action**: `setAnimationAction(action: string)`

### B. Update Specimen Component (`src/components/canvas/Specimen.tsx`)
Currently, `Specimen.tsx` uses `useGLTF` but ignores animations.
*   **Change**: Import `useAnimations` from `@react-three/drei`.
*   **Hook**: `const { actions } = useAnimations(animations, groupRef)`
*   **Effect**: Listen to `store.animationAction` and crossFade between clips.

```typescript
// Example Implementation Logic
const { animations } = useGLTF(modelUrl);
const { actions } = useAnimations(animations, groupRef);
const animationAction = useExhibitStore(state => state.animationAction);

useEffect(() => {
  const action = actions[animationAction];
  if (action) {
    action.reset().fadeIn(0.5).play();
    return () => action.fadeOut(0.5);
  }
}, [animationAction, actions]);
```

### C. Gesture Mapping (`src/lib/useGestureActions.ts`)
Map a specific gesture to the "Roar" action.
*   **Trigger**: "Open Palms" (Explode) is already taken.
*   **Proposal**: Use "Peace Sign" (currently cycles scan mode) or add a new logic.
*   **Decision**: Mapping "Peace Sign" (V for Victory/Roar) to trigger `setAnimationAction('Roar')` for 5 seconds, then back to 'Idle'.

---

## 3. Verification & QC

### QC Agent Prompt Extensions
*   **Visual Check**: "Does the T-Rex move? (Look for breathing/idle motion)"
*   **Interaction**: "Perform Peace Sign. Does T-Rex Roar?"
*   **Asset Check**: "Verify `skeleton.glb` file size is > 5MB (implies rigged model)."
