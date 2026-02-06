'use client';

// =============================================================================
// Specimen.tsx - Dinosaur Model Controller with Explode Mechanics
// =============================================================================

import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html, Center, useCursor } from '@react-three/drei';
import * as THREE from 'three';
import type { SpecimenData, BoneMetadata } from '@/lib/types';
import { useExhibitStore } from '@/lib/store';
import { BoneFocus } from './BoneFocus';
import { XRayShaderMaterial, FresnelGlowMaterial, HologramMaterial } from './shaders/XRayMaterial';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SpecimenProps {
  data: SpecimenData;
}

interface BoneLabelProps {
  bone: BoneMetadata;
  visible: boolean;
  accentColor: string;
  onClick?: () => void;
}

interface DiscoveredBone {
  mesh: THREE.Mesh;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  center: THREE.Vector3;
}

// -----------------------------------------------------------------------------
// Available Models Registry
// -----------------------------------------------------------------------------

const AVAILABLE_MODELS: Record<string, boolean> = {
  'tyrannosaurus-rex': true,
};

function isModelAvailable(specimenId: string): boolean {
  return AVAILABLE_MODELS[specimenId] ?? false;
}

// -----------------------------------------------------------------------------
// Bone Label Component
// -----------------------------------------------------------------------------

function BoneLabel({ bone, visible, accentColor, onClick }: BoneLabelProps) {
  const [hovered, setHovered] = useState(false);
  const isBoneFocusActive = useExhibitStore((state) => state.isBoneFocusActive);
  const focusedBoneName = useExhibitStore((state) => state.focusedBoneName);
  useCursor(hovered && visible);

  // Hide label if this bone is focused (BoneFocus will show detail panel instead)
  const isThisBoneFocused = isBoneFocusActive && focusedBoneName === bone.meshName;
  if (!visible || isThisBoneFocused) return null;

  const confidenceColors = {
    certain: '#6b8f71',
    likely: '#c9a962',
    debated: '#b07070',
  };

  return (
    <Html
      position={bone.anchor}
      center
      distanceFactor={8}
      style={{
        transition: 'opacity 0.3s ease, transform 0.2s ease',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      <div
        className="glass rounded-lg px-3 py-2 max-w-[200px] pointer-events-auto cursor-pointer hover:ring-2 hover:ring-accent transition-all"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onClick}
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: confidenceColors[bone.confidence] }}
          />
          <span
            className="font-body text-sm font-semibold"
            style={{ color: accentColor }}
          >
            {bone.label}
          </span>
        </div>
        <p className="font-body text-xs text-muted-foreground leading-tight">
          {bone.description}
        </p>
      </div>
    </Html>
  );
}

// -----------------------------------------------------------------------------
// Placeholder Specimen (when no model available)
// -----------------------------------------------------------------------------

function PlaceholderSpecimen({ data }: { data: SpecimenData }) {
  const groupRef = useRef<THREE.Group>(null);
  const explodeFactor = useExhibitStore((state) => state.explodeFactor);
  const showCallouts = useExhibitStore((state) => state.showCallouts);
  const scanMode = useExhibitStore((state) => state.scanMode);
  const focusBone = useExhibitStore((state) => state.focusBone);

  // Slow rotation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  const materialProps = useMemo(() => {
    switch (scanMode) {
      case 'xray':
        return {
          color: '#ef4444',
          wireframe: true,
          opacity: 0.8,
          transparent: true,
          emissive: '#ef4444',
          emissiveIntensity: 0.3,
        };
      case 'skin':
        return {
          color: data.presentation.color,
          wireframe: false,
          opacity: 0.95,
          transparent: true,
          emissive: '#000000',
          emissiveIntensity: 0,
        };
      default:
        return {
          color: '#d6d3d1',
          wireframe: false,
          opacity: 1,
          transparent: false,
          emissive: '#000000',
          emissiveIntensity: 0,
        };
    }
  }, [scanMode, data.presentation.color]);

  return (
    <group ref={groupRef} scale={data.presentation.scale}>
      {/* Body */}
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.5, 2, 8, 16]} />
        <meshStandardMaterial {...materialProps} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Head */}
      <mesh position={[1.5 + explodeFactor * 0.8, 1.2 + explodeFactor * 0.3, 0]}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial {...materialProps} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Tail */}
      <mesh
        position={[-1.5 - explodeFactor * 1.0, 0.8, 0]}
        rotation={[0, 0, -0.3]}
      >
        <coneGeometry args={[0.3, 1.5, 8]} />
        <meshStandardMaterial {...materialProps} roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Legs */}
      {[-0.4, 0.4].map((z, i) => (
        <mesh
          key={i}
          position={[0.2, 0.4 - explodeFactor * 0.3, z + (i === 0 ? -1 : 1) * explodeFactor * 0.3]}
        >
          <cylinderGeometry args={[0.1, 0.15, 0.8, 8]} />
          <meshStandardMaterial {...materialProps} roughness={0.7} metalness={0.1} />
        </mesh>
      ))}

      {/* Bone labels */}
      {data.bones.map((bone) => (
        <BoneLabel
          key={bone.meshName}
          bone={bone}
          visible={showCallouts}
          accentColor={data.presentation.color}
          onClick={() => focusBone(bone.meshName)}
        />
      ))}

      {/* Bone focus components for claw mechanics */}
      {data.bones.map((bone) => (
        <BoneFocus
          key={`focus-${bone.meshName}`}
          bone={bone}
          accentColor={data.presentation.color}
        />
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------------
// Real GLB Model Specimen
// -----------------------------------------------------------------------------

interface ModelSpecimenProps {
  data: SpecimenData;
  modelUrl: string;
}

function ModelSpecimen({ data, modelUrl }: ModelSpecimenProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(modelUrl);

  const explodeFactor = useExhibitStore((state) => state.explodeFactor);
  const showCallouts = useExhibitStore((state) => state.showCallouts);
  const scanMode = useExhibitStore((state) => state.scanMode);

  // Discovered bones from the model
  const [discoveredBones, setDiscoveredBones] = useState<Map<string, DiscoveredBone>>(new Map());

  // Model center for explode calculations
  const modelCenter = useRef(new THREE.Vector3());

  // Clone the scene and discover bones
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const bones = new Map<string, DiscoveredBone>();
    const boundingBox = new THREE.Box3();

    // First pass: calculate model bounds
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeBoundingBox();
        const meshBox = child.geometry.boundingBox?.clone();
        if (meshBox) {
          meshBox.applyMatrix4(child.matrixWorld);
          boundingBox.union(meshBox);
        }
      }
    });

    boundingBox.getCenter(modelCenter.current);

    // Second pass: store bone data
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Calculate mesh center
        const meshCenter = new THREE.Vector3();
        child.geometry.computeBoundingBox();
        child.geometry.boundingBox?.getCenter(meshCenter);
        meshCenter.applyMatrix4(child.matrixWorld);

        bones.set(child.uuid, {
          mesh: child,
          originalPosition: child.position.clone(),
          originalRotation: child.rotation.clone(),
          center: meshCenter,
        });

        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    setDiscoveredBones(bones);
    return clone;
  }, [scene]);

  // Apply explode animation
  useFrame(() => {
    if (!groupRef.current || explodeFactor === 0) return;

    discoveredBones.forEach((bone) => {
      const { mesh, originalPosition, center } = bone;

      // Calculate explode direction from model center
      const direction = center.clone().sub(modelCenter.current).normalize();

      // Apply explode offset
      const explodeDistance = explodeFactor * 2;
      mesh.position.copy(
        originalPosition.clone().add(direction.multiplyScalar(explodeDistance))
      );
    });
  });

  // Reset positions when explode factor is 0
  useEffect(() => {
    if (explodeFactor === 0) {
      discoveredBones.forEach((bone) => {
        bone.mesh.position.copy(bone.originalPosition);
      });
    }
  }, [explodeFactor, discoveredBones]);

  // Create custom shader material instances
  const xrayMaterial = useMemo(() => {
    const mat = new XRayShaderMaterial();
    mat.transparent = true;
    mat.side = THREE.DoubleSide;
    mat.depthWrite = false;
    return mat;
  }, []);

  const fresnelMaterial = useMemo(() => {
    const mat = new FresnelGlowMaterial();
    return mat;
  }, []);

  const hologramMaterial = useMemo(() => {
    const mat = new HologramMaterial();
    mat.transparent = true;
    mat.side = THREE.DoubleSide;
    mat.depthWrite = false;
    mat.uniforms.uColor.value = new THREE.Color(data.presentation.color);
    return mat;
  }, [data.presentation.color]);

  // Update shader time uniform each frame
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (scanMode === 'xray') {
      xrayMaterial.uniforms.uTime.value = t;
    } else if (scanMode === 'skin') {
      hologramMaterial.uniforms.uTime.value = t;
    } else {
      fresnelMaterial.uniforms.uTime.value = t;
    }
  });

  // Apply scan mode materials (using custom shaders)
  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Store original material on first encounter
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }

        switch (scanMode) {
          case 'skeleton':
            child.material = fresnelMaterial;
            break;

          case 'skin':
            hologramMaterial.uniforms.uColor.value = new THREE.Color(data.presentation.color);
            child.material = hologramMaterial;
            break;

          case 'xray':
            child.material = xrayMaterial;
            break;
        }
      }
    });
  }, [clonedScene, scanMode, data.presentation.color, xrayMaterial, fresnelMaterial, hologramMaterial]);

  // Handle bone click for claw mechanics
  const focusBone = useExhibitStore((state) => state.focusBone);

  const handleBoneClick = useCallback(
    (bone: BoneMetadata) => {
      focusBone(bone.meshName);
    },
    [focusBone]
  );

  return (
    <group ref={groupRef}>
      <Center scale={data.presentation.scale}>
        <primitive object={clonedScene} />
      </Center>

      {/* Bone labels from registry data */}
      {data.bones.map((bone) => (
        <BoneLabel
          key={bone.meshName}
          bone={bone}
          visible={showCallouts}
          accentColor={data.presentation.color}
          onClick={() => handleBoneClick(bone)}
        />
      ))}

      {/* Bone focus components for claw mechanics */}
      {data.bones.map((bone) => (
        <BoneFocus
          key={`focus-${bone.meshName}`}
          bone={bone}
          accentColor={data.presentation.color}
        />
      ))}
    </group>
  );
}

// -----------------------------------------------------------------------------
// Main Specimen Export
// -----------------------------------------------------------------------------

export function Specimen({ data }: SpecimenProps) {
  const scanMode = useExhibitStore((state) => state.scanMode);

  // Determine which model to use based on scan mode
  const modelUrl = useMemo(() => {
    if (scanMode === 'skin' && data.models.skin) {
      return data.models.skin;
    }
    return data.models.skeleton;
  }, [data.models, scanMode]);

  // Check if real model is available for this specimen
  const hasRealModel = isModelAvailable(data.id);

  if (hasRealModel) {
    return <ModelSpecimen data={data} modelUrl={modelUrl} />;
  }

  return <PlaceholderSpecimen data={data} />;
}

// -----------------------------------------------------------------------------
// Preload T-Rex model
// -----------------------------------------------------------------------------

useGLTF.preload('/models/tyrannosaurus-rex/skeleton.glb');
