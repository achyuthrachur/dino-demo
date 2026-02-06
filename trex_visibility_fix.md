# T-Rex Visibility Fix: "The Black Screen Issue"

> **Diagnosis**: The new "Rigged" T-Rex model uses `SkinnedMesh` technology for animation. The existing custom shaders (Fresnel, X-Ray) only support static `Mesh` objects. This incompatibility causes the dinosaur to be invisible or render as a black void.

---

## 1. The Fix

We must modify `src/components/canvas/Specimen.tsx` to detect "Skinned" meshes and use a compatible material (Standard Material) instead of the custom shaders.

### Instructions for Agent / Developer

**Target File**: `src/components/canvas/Specimen.tsx`

**Step 1: Locate Material Assignment**
Find the `useEffect` block handling scan modes (around line 351).

**Step 2: Replace Logic**
Replace the material assignment switch statement with logic that checks for `isSkinned`.

**Replacement Code**:

```typescript
// Inside useEffect...
clonedScene.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    // Check if it's a rigged mesh
    const isSkinned = child instanceof THREE.SkinnedMesh;

    // Store original material on first encounter
    if (!child.userData.originalMaterial) {
      child.userData.originalMaterial = child.material;
    }

    switch (scanMode) {
      case 'skeleton':
        if (isSkinned) {
          // Fallback for Rigged Model (Supports Animation)
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#d6d3d1'),
            roughness: 0.3,
            metalness: 0.2,
            emissive: new THREE.Color('#f59e0b'),
            emissiveIntensity: 0.1,
          });
        } else {
          // Original Custom Shader (Static Models)
          child.material = fresnelMaterial;
        }
        break;

      case 'skin':
        if (isSkinned) {
           child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(data.presentation.color),
            transparent: true,
            opacity: 0.9,
            wireframe: true, // Stylish wireframe for skin
          });
        } else {
          hologramMaterial.uniforms.uColor.value = new THREE.Color(data.presentation.color);
          child.material = hologramMaterial;
        }
        break;

      case 'xray':
        if (isSkinned) {
           child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#ef4444'),
            transparent: true,
            opacity: 0.5,
            wireframe: true,
            emissive: new THREE.Color('#ef4444'),
            emissiveIntensity: 0.5,
          });
        } else {
          child.material = xrayMaterial;
        }
        break;
    }
    
    // CRITICAL: Skinned meshes need to cast shadows differently / ensure frustum culling doesn't hide them
    if (isSkinned) {
      child.frustumCulled = false; // Prevent disappearing when bounding box is static
    }
  }
});
```

---

## 2. Verify Result

1.  **Reload the page**.
2.  Switch to **T-Rex**.
3.  **Expectation**: You should now see a lit, visible T-Rex skeleton. It might look slightly different (more realistic, less "holographic") than the static models, but it will be visible and ready for animation.
