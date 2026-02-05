'use client';

// =============================================================================
// XRayMaterial.tsx - Custom X-Ray Shader with Fresnel Effect
// =============================================================================

import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// X-Ray Shader Material
// -----------------------------------------------------------------------------

const XRayShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#ef4444'),
    uFresnelPower: 2.0,
    uFresnelScale: 1.0,
    uOpacity: 0.7,
    uScanLineSpeed: 1.0,
    uScanLineCount: 50.0,
  },
  // Vertex Shader
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying float vFresnel;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;

      // Calculate fresnel
      vec3 viewDir = normalize(vViewPosition);
      vFresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uFresnelPower;
    uniform float uFresnelScale;
    uniform float uOpacity;
    uniform float uScanLineSpeed;
    uniform float uScanLineCount;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying float vFresnel;

    void main() {
      // Fresnel rim lighting
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower) * uFresnelScale;

      // Animated scan lines
      float scanLine = sin((vUv.y + uTime * uScanLineSpeed * 0.1) * uScanLineCount * 3.14159) * 0.5 + 0.5;
      scanLine = smoothstep(0.3, 0.7, scanLine);

      // Combine effects
      vec3 color = uColor;
      float alpha = fresnel * 0.8 + 0.2;
      alpha *= uOpacity;

      // Add scan line glow
      color += uColor * scanLine * 0.3;

      // Edge glow
      color += uColor * fresnel * 0.5;

      gl_FragColor = vec4(color, alpha);
    }
  `
);

// Extend Three.js with our custom material
extend({ XRayShaderMaterial });

// TypeScript declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      xRayShaderMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          uTime?: number;
          uColor?: THREE.Color;
          uFresnelPower?: number;
          uFresnelScale?: number;
          uOpacity?: number;
          uScanLineSpeed?: number;
          uScanLineCount?: number;
          transparent?: boolean;
          side?: THREE.Side;
          depthWrite?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

export { XRayShaderMaterial };

// -----------------------------------------------------------------------------
// Fresnel Glow Material (for skeleton mode)
// -----------------------------------------------------------------------------

const FresnelGlowMaterial = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#d6d3d1'),
    uGlowColor: new THREE.Color('#d97706'),
    uFresnelPower: 3.0,
    uGlowIntensity: 0.3,
  },
  // Vertex Shader
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  /* glsl */ `
    uniform float uTime;
    uniform vec3 uBaseColor;
    uniform vec3 uGlowColor;
    uniform float uFresnelPower;
    uniform float uGlowIntensity;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), uFresnelPower);

      // Subtle pulsing
      float pulse = sin(uTime * 2.0) * 0.1 + 0.9;

      // Base color with fresnel rim
      vec3 color = uBaseColor;
      color = mix(color, uGlowColor, fresnel * uGlowIntensity * pulse);

      // Add subtle ambient occlusion simulation
      float ao = dot(vNormal, vec3(0.0, 1.0, 0.0)) * 0.3 + 0.7;
      color *= ao;

      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ FresnelGlowMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      fresnelGlowMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          uTime?: number;
          uBaseColor?: THREE.Color;
          uGlowColor?: THREE.Color;
          uFresnelPower?: number;
          uGlowIntensity?: number;
        },
        HTMLElement
      >;
    }
  }
}

export { FresnelGlowMaterial };

// -----------------------------------------------------------------------------
// Hologram Material (for skin mode)
// -----------------------------------------------------------------------------

const HologramMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#65a30d'),
    uOpacity: 0.85,
    uScanLineCount: 100.0,
  },
  // Vertex Shader
  /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  /* glsl */ `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uScanLineCount;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);

      // Horizontal scan lines
      float scanLines = sin(vWorldPosition.y * uScanLineCount + uTime * 2.0) * 0.5 + 0.5;
      scanLines = smoothstep(0.4, 0.6, scanLines);

      vec3 color = uColor;

      // Add fresnel rim
      color += uColor * fresnel * 0.5;

      // Scan line effect
      float alpha = uOpacity * (0.7 + scanLines * 0.3);

      // Fresnel affects opacity
      alpha = mix(alpha * 0.5, alpha, fresnel);

      gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ HologramMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      hologramMaterial: React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          uTime?: number;
          uColor?: THREE.Color;
          uOpacity?: number;
          uScanLineCount?: number;
          transparent?: boolean;
          side?: THREE.Side;
          depthWrite?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

export { HologramMaterial };
