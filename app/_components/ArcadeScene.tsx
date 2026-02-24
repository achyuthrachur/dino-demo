'use client';

import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Sky, Stars, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ARCADE_CONFIG, applyDeadzone, type JoyVector } from '../_lib/arcade/config';

const GLB_PATH = '/models/rexy/rexy_jurassic_world_alive.glb';
const TERRAIN_GLB_PATH = '/models/environments/haytor_dartmoor_terrain.glb';
const TERRAIN_SCALE = 0.2;
const FADE_SECONDS = 0.24;
const WALK_METERS_PER_SECOND = 1.4;
const TURN_RADIANS_PER_SECOND = 1.8;
const ARENA_RADIUS = 18;
const TERRAIN_BOUNDS_INSET = 0.8;
const GROUND_CLEARANCE_OFFSET = 0.04;
const GROUND_RAYCAST_HZ = 20;
const GROUND_IDLE_RAYCAST_HZ = 12;
const GROUND_RAYCAST_MAX_DISTANCE = 400;
const GROUND_RAYCAST_TOP_PADDING = 20;
const GROUND_Y_SMOOTHING_PER_SECOND = 14;
const GROUND_MAX_Y_STEP_PER_SECOND = 4.2;
const MOVE_TURN_DEADZONE = 0.22;
const MOVE_TURN_IDLE_GATE = 0.16;
const MOVE_TURN_WHILE_MOVING_GATE = 0.58;
const TURN_INPUT_SMOOTHING_PER_SECOND = 12;
const THROTTLE_INPUT_SMOOTHING_PER_SECOND = 10;
const WALK_LOOP_START_WORLD_SPEED = 0.12;
const WALK_LOOP_STOP_WORLD_SPEED = 0.04;
const LOCOMOTION_SPEED_SMOOTHING_PER_SECOND = 14;
const CAMERA_YAW_RADIANS_PER_SECOND = 2.2;
const CAMERA_PITCH_RADIANS_PER_SECOND = 2.2;
const CAMERA_DEFAULT_PITCH_RADIANS = THREE.MathUtils.degToRad(55);
const CAMERA_MIN_PITCH_RADIANS = THREE.MathUtils.degToRad(5);
const CAMERA_MAX_PITCH_RADIANS = THREE.MathUtils.degToRad(88);
const CAMERA_DISTANCE_MULTIPLIER = 2.08;
const CAMERA_TARGET_SMOOTHING_PER_SECOND = 9;
const CAMERA_POSITION_SMOOTHING_PER_SECOND = 10;
const CAMERA_INPUT_SMOOTHING_PER_SECOND = 7;
const CAMERA_STICK_DEADZONE = 0.005;
const CAMERA_MAX_YAW_STEP_RADIANS = THREE.MathUtils.degToRad(8);
const CAMERA_MAX_PITCH_STEP_RADIANS = THREE.MathUtils.degToRad(6);
const LOCOMOTION_MIN_TIME_SCALE = 1.0;
const LOCOMOTION_MAX_TIME_SCALE = 1.0;
// Fraction of the minionSpawn clip to use as the walk loop (cuts the stand phase at the end).
// 0.70 = first 70% of frames (walk + roar), discarding the final stand portion.
const MINION_SPAWN_WALK_END_RATIO = 0.70;

const FOREST_FOG_COLOR    = 0x90b0a8;   // blue-grey atmospheric mist
const FOREST_FOG_DENSITY  = 0.013;
const FOREST_GROUND_COLOR = '#1c1208';  // very dark brown — forest floor
const FOREST_BARK_COLOR   = '#261408';  // darker, more realistic bark
const SUN_POSITION: [number, number, number] = [80, 60, 50]; // more angled, dramatic
const PALM_COUNT = 10;
const FOLIAGE_COLORS = [
  '#1e5c1a', '#2a7a30', '#255e25', '#356b2a', '#3a8238', '#4a7a1f',
] as const; // 6 colours for more variety
const STREAM_POINTS: [number, number, number][] = [
  [-90, 0.05, -35], [-50, 0.05, -25], [-15, 0.05, -22],
  [ 25, 0.05,  -8], [ 55, 0.05,  10], [ 80, 0.05,   5],
  [ 90, 0.05, -20],
];

export type ArcadeAnimCueKind = 'minion_spawn' | 'next_round' | 'player_spawn' | 'spawn' | 'victory';

export interface ArcadeAnimCue {
  kind: ArcadeAnimCueKind;
  nonce: number;
}

interface TerrainBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface ArcadeRigProps {
  actorRef: MutableRefObject<THREE.Group | null>;
  moveRef: MutableRefObject<JoyVector>;
  locomotionRef: MutableRefObject<LocomotionState>;
  terrainRootRef: MutableRefObject<THREE.Object3D | null>;
  terrainBoundsRef: MutableRefObject<TerrainBounds | null>;
  resetToken: number;
  animationCue: ArcadeAnimCue | null;
  onModelRadiusChange: (radius: number) => void;
}

interface ArcadeSceneProps {
  moveRef: MutableRefObject<JoyVector>;
  aimRef: MutableRefObject<JoyVector>;
  resetToken: number;
  animationCue: ArcadeAnimCue | null;
}

interface LocomotionState {
  isMoving: boolean;
  speedNorm: number;
  moveDirection: 1 | -1;
}

interface ClipSet {
  minionSpawn: string | null;
  minionSpawnWalkLoop: string | null;
  nextRound: string | null;
  playerSpawn: string | null;
  spawn: string | null;
  spawnWalkLoop: string | null;
  victory: string | null;
  victoryIn: string | null;
  victoryOut: string | null;
  victoryIdle: string | null;
  idleFallback: string | null;
}

function SceneBackground() {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = null;
  }, [scene]);
  return null;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Pre-compute 80 sample points along the stream curve for proximity checks
const STREAM_CURVE = new THREE.CatmullRomCurve3(
  STREAM_POINTS.map(p => new THREE.Vector3(...p))
);
const STREAM_SAMPLES = STREAM_CURVE.getPoints(80);

function nearStream(x: number, z: number, threshold: number): boolean {
  return STREAM_SAMPLES.some(p => Math.hypot(p.x - x, p.z - z) < threshold);
}

function createFoliageAlphaMap(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0,    'rgba(255,255,255,0.98)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.88)');
  grad.addColorStop(0.80, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const rand = seededRandom(123);
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.2})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 2 + rand() * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createGrassBladeMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 8, 64);
  const grad = ctx.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0,   'rgba(255,255,255,1)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(1, 64);
  ctx.lineTo(7, 64);
  ctx.lineTo(4, 0);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createTreeSilhouetteMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(28, 70, 8, 58);
  const blobs: [number, number, number][] = [[32, 42, 26], [18, 52, 18], [46, 50, 17], [32, 24, 17]];
  for (const [cx, cy, r] of blobs) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.7, 'rgba(200,200,200,0.65)');
    g.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const TREE_COUNT = 45;
const LOG_COUNT = 10;
const WALL_COUNT = 36;

function JungleGround() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(400, 400, 100, 100);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const rand = seededRandom(7);
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (rand() - 0.5) * 0.24);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const litterRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = litterRef.current;
    if (!mesh) return;
    const rand = seededRandom(11);
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const colors = ['#2a1808', '#1e1205', '#3a2010', '#251508', '#1a1005'];
    const colorObjs = colors.map(c => new THREE.Color(c));
    for (let i = 0; i < 600; i++) {
      const x = (rand() - 0.5) * 200;
      const z = (rand() - 0.5) * 200;
      const scale = 0.5 + rand() * 1.0;
      pos.set(x, 0.02, z);
      quat.setFromEuler(new THREE.Euler(-Math.PI / 2 + (rand() - 0.5) * 0.1, rand() * Math.PI * 2, 0));
      scl.set(scale, scale, scale);
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
      mesh.setColorAt(i, colorObjs[Math.floor(rand() * colorObjs.length)]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <group>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshStandardMaterial color={FOREST_GROUND_COLOR} roughness={0.96} metalness={0.04} />
      </mesh>
      <instancedMesh ref={litterRef} args={[undefined, undefined, 600]}>
        <circleGeometry args={[0.4, 5]} />
        <meshStandardMaterial vertexColors roughness={1} metalness={0} />
      </instancedMesh>
    </group>
  );
}

const GRASS_COUNT = 10000;

function JungleGrass() {
  const meshARef = useRef<THREE.InstancedMesh>(null);
  const meshBRef = useRef<THREE.InstancedMesh>(null);

  const grassTex = useMemo(() => createGrassBladeMap(), []);
  const timeUniformRef = useRef({ value: 0 });

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: grassTex,
      alphaMap: grassTex,
      color: '#5a9e4a',
      transparent: true,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const uTime = timeUniformRef.current;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float heightFactor = uv.y;
         float windPhase = instanceMatrix[3][0] * 0.07 + instanceMatrix[3][2] * 0.07;
         float wind = sin(uTime * 2.2 + windPhase) * 0.2 * heightFactor;
         transformed.x += wind;`,
      );
    };
    return mat;
  }, [grassTex]);

  useFrame((_, dt) => { timeUniformRef.current.value += dt; });

  useEffect(() => {
    const meshA = meshARef.current;
    const meshB = meshBRef.current;
    if (!meshA || !meshB) return;

    const rand = seededRandom(55);
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    for (let i = 0; i < GRASS_COUNT; i++) {
      const x = (rand() - 0.5) * 200;
      const z = (rand() - 0.5) * 200;
      if (nearStream(x, z, 4)) {
        pos.set(0, -1000, 0);
        quat.identity();
        scl.set(1, 1, 1);
      } else {
        const scale = 0.8 + rand() * 0.5;
        const yRot = rand() * Math.PI * 2;
        const xTilt = THREE.MathUtils.degToRad(5 + rand() * 15);
        pos.set(x, 0.3, z);
        quat.setFromEuler(new THREE.Euler(xTilt, yRot, 0));
        scl.set(scale, scale, scale);
      }
      matrix.compose(pos, quat, scl);
      meshA.setMatrixAt(i, matrix);
      if (pos.y > -500) {
        const e = new THREE.Euler().setFromQuaternion(quat);
        quat.setFromEuler(new THREE.Euler(e.x, e.y + Math.PI / 2, e.z));
        matrix.compose(pos, quat, scl);
      }
      meshB.setMatrixAt(i, matrix);
    }

    meshA.instanceMatrix.needsUpdate = true;
    meshB.instanceMatrix.needsUpdate = true;
    meshA.material = material;
    meshB.material = material;
  }, [material]);

  return (
    <group>
      <instancedMesh ref={meshARef} args={[undefined, undefined, GRASS_COUNT]} castShadow={false}>
        <planeGeometry args={[0.22, 0.9]} />
        <meshStandardMaterial color="#5a9e4a" roughness={1} metalness={0} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={meshBRef} args={[undefined, undefined, GRASS_COUNT]} castShadow={false}>
        <planeGeometry args={[0.22, 0.9]} />
        <meshStandardMaterial color="#5a9e4a" roughness={1} metalness={0} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

const BUSH_COUNT = 40;

function JungleTrees() {
  const trunkRef      = useRef<THREE.InstancedMesh>(null);
  const mainCrownRef  = useRef<THREE.InstancedMesh>(null);
  const satCrownRef   = useRef<THREE.InstancedMesh>(null);
  const palmTrunkRef  = useRef<THREE.InstancedMesh>(null);
  const palmCanopyRef = useRef<THREE.InstancedMesh>(null);
  const bushRef       = useRef<THREE.InstancedMesh>(null);
  const logRef        = useRef<THREE.InstancedMesh>(null);

  const foliageAlpha = useMemo(() => createFoliageAlphaMap(), []);

  useEffect(() => {
    const trunk     = trunkRef.current;
    const mainCrown = mainCrownRef.current;
    const satCrown  = satCrownRef.current;
    const palmTrunk  = palmTrunkRef.current;
    const palmCanopy = palmCanopyRef.current;
    const bush       = bushRef.current;
    const log        = logRef.current;
    if (!trunk || !mainCrown || !satCrown || !palmTrunk || !palmCanopy || !bush || !log) return;

    const rand = seededRandom(42);
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const positions: [number, number][] = [];

    const colorObjs = FOLIAGE_COLORS.map(c => new THREE.Color(c));

    // Normal trees
    for (let i = 0; i < TREE_COUNT; i++) {
      let x = 0, z = 0, attempts = 0;
      do {
        const angle = rand() * Math.PI * 2;
        const radius = 22 + rand() * 63;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        attempts++;
      } while (
        attempts < 20 &&
        (nearStream(x, z, 5) ||
          positions.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6))
      );
      positions.push([x, z]);

      const trunkH = 5 + rand() * 6;
      const trunkR = 0.25 + rand() * 0.2;
      const trunkLeanX = (rand() - 0.5) * 0.12;
      const trunkLeanZ = (rand() - 0.5) * 0.12;

      // Trunk
      pos.set(x, trunkH / 2, z);
      quat.setFromEuler(new THREE.Euler(trunkLeanX, rand() * Math.PI * 2, trunkLeanZ));
      scl.set(trunkR, trunkH, trunkR);
      matrix.compose(pos, quat, scl);
      trunk.setMatrixAt(i, matrix);

      const color = colorObjs[i % colorObjs.length];

      // Main crown (ellipsoidal)
      const crownW = 2.5 + rand() * 2.2;
      const crownH = crownW * (0.45 + rand() * 0.7);
      const crownY = trunkH - 0.8;
      pos.set(x, crownY, z);
      quat.identity();
      scl.set(crownW, crownH, crownW);
      matrix.compose(pos, quat, scl);
      mainCrown.setMatrixAt(i, matrix);
      mainCrown.setColorAt(i, color);

      // Satellite crown (smaller, offset)
      const satScale = crownW * (0.35 + rand() * 0.3);
      const satOffX = (rand() - 0.5) * crownW * 0.9;
      const satOffY = -crownH * 0.3;
      const satOffZ = (rand() - 0.5) * crownW * 0.9;
      pos.set(x + satOffX, crownY + satOffY, z + satOffZ);
      scl.set(satScale, satScale, satScale);
      matrix.compose(pos, quat, scl);
      satCrown.setMatrixAt(i, matrix);
      satCrown.setColorAt(i, color);
    }

    // Palm trees
    const palmRand = seededRandom(88);
    const palmPositions: [number, number][] = [];
    for (let i = 0; i < PALM_COUNT; i++) {
      let x = 0, z = 0, attempts = 0;
      do {
        const angle = palmRand() * Math.PI * 2;
        const radius = 22 + palmRand() * 63;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        attempts++;
      } while (
        attempts < 20 &&
        (nearStream(x, z, 5) ||
          palmPositions.some(([px, pz]) => Math.hypot(px - x, pz - z) < 8))
      );
      palmPositions.push([x, z]);

      pos.set(x, 6, z);
      quat.setFromEuler(new THREE.Euler(0, palmRand() * Math.PI * 2, 0));
      scl.set(1, 1, 1);
      matrix.compose(pos, quat, scl);
      palmTrunk.setMatrixAt(i, matrix);

      pos.set(x, 12, z);
      quat.identity();
      matrix.compose(pos, quat, scl);
      palmCanopy.setMatrixAt(i, matrix);
    }

    // Bush clusters
    const bushRand = seededRandom(77);
    for (let i = 0; i < BUSH_COUNT; i++) {
      const baseIdx = Math.floor(bushRand() * TREE_COUNT);
      const [bx, bz] = positions[baseIdx] ?? [0, 0];
      const ox = (bushRand() - 0.5) * 8;
      const oz = (bushRand() - 0.5) * 8;
      const bxf = bx + ox;
      const bzf = bz + oz;
      pos.set(bxf, 0.8, bzf);
      quat.setFromEuler(new THREE.Euler(0, bushRand() * Math.PI * 2, 0));
      const s = 0.7 + bushRand() * 0.6;
      scl.set(s, s, s);
      matrix.compose(pos, quat, scl);
      bush.setMatrixAt(i, matrix);
    }

    // Fallen logs
    const logRand = seededRandom(301);
    for (let i = 0; i < LOG_COUNT; i++) {
      const angle = logRand() * Math.PI * 2;
      const r = 15 + logRand() * 55;
      const lx = Math.cos(angle) * r;
      const lz = Math.sin(angle) * r;
      pos.set(lx, 0.12, lz);
      const xTilt = Math.PI / 2 + (logRand() - 0.5) * 0.3;
      quat.setFromEuler(new THREE.Euler(xTilt, logRand() * Math.PI * 2, 0));
      scl.set(1, 1, 1);
      matrix.compose(pos, quat, scl);
      log.setMatrixAt(i, matrix);
    }

    trunk.instanceMatrix.needsUpdate    = true;
    mainCrown.instanceMatrix.needsUpdate = true;
    satCrown.instanceMatrix.needsUpdate  = true;
    if (mainCrown.instanceColor) mainCrown.instanceColor.needsUpdate = true;
    if (satCrown.instanceColor)  satCrown.instanceColor.needsUpdate  = true;
    palmTrunk.instanceMatrix.needsUpdate  = true;
    palmCanopy.instanceMatrix.needsUpdate = true;
    bush.instanceMatrix.needsUpdate       = true;
    log.instanceMatrix.needsUpdate        = true;
  }, []);

  return (
    <group>
      {/* Normal tree trunks */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, TREE_COUNT]} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.45, 5, 8]} />
        <meshStandardMaterial color={FOREST_BARK_COLOR} roughness={0.95} metalness={0.02} />
      </instancedMesh>
      {/* Main crowns — ellipsoidal spheres with foliage alpha */}
      <instancedMesh ref={mainCrownRef} args={[undefined, undefined, TREE_COUNT]} castShadow receiveShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial alphaMap={foliageAlpha} alphaTest={0.25} vertexColors roughness={0.88} metalness={0} side={THREE.DoubleSide} />
      </instancedMesh>
      {/* Satellite crowns */}
      <instancedMesh ref={satCrownRef} args={[undefined, undefined, TREE_COUNT]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial alphaMap={foliageAlpha} alphaTest={0.25} vertexColors roughness={0.88} metalness={0} side={THREE.DoubleSide} />
      </instancedMesh>
      {/* Palm trunks */}
      <instancedMesh ref={palmTrunkRef} args={[undefined, undefined, PALM_COUNT]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.15, 12, 6]} />
        <meshStandardMaterial color="#4a3020" roughness={0.95} metalness={0.02} />
      </instancedMesh>
      {/* Palm canopies */}
      <instancedMesh ref={palmCanopyRef} args={[undefined, undefined, PALM_COUNT]} castShadow>
        <sphereGeometry args={[1.5, 7, 7]} />
        <meshStandardMaterial color="#1a5c2a" roughness={0.88} metalness={0} />
      </instancedMesh>
      {/* Bushes */}
      <instancedMesh ref={bushRef} args={[undefined, undefined, BUSH_COUNT]} castShadow>
        <sphereGeometry args={[1.2, 7, 6]} />
        <meshStandardMaterial color="#2a6b20" roughness={0.9} metalness={0} />
      </instancedMesh>
      {/* Fallen logs */}
      <instancedMesh ref={logRef} args={[undefined, undefined, LOG_COUNT]} castShadow>
        <cylinderGeometry args={[0.12, 0.22, 8, 7]} />
        <meshStandardMaterial color="#1a0d05" roughness={0.98} metalness={0} />
      </instancedMesh>
    </group>
  );
}

const WATER_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const WATER_FRAG = `
uniform float uTime;
varying vec2 vUv;
void main() {
  float ripple = sin(vUv.x * 10.0 + uTime * 2.5) * 0.04 + sin(vUv.y * 8.0 + uTime * 1.8) * 0.03;
  vec3 c = vec3(0.165, 0.498, 0.678) + ripple * 0.3;
  gl_FragColor = vec4(c, 0.78);
}
`;

const ROCK_COUNT = 30;
const LILY_COUNT = 15;

function JungleStream() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);
  const lilyRef = useRef<THREE.InstancedMesh>(null);

  const streamGeo = useMemo(() => {
    const pts = STREAM_CURVE.getPoints(120);
    const vertexCount = pts.length * 2;
    const positions = new Float32Array(vertexCount * 3);
    const normals   = new Float32Array(vertexCount * 3);
    const uvs       = new Float32Array(vertexCount * 2);
    const indices: number[] = [];

    for (let i = 0; i < pts.length; i++) {
      const curr = pts[i];
      const next = pts[Math.min(i + 1, pts.length - 1)];
      const prev = pts[Math.max(i - 1, 0)];
      const dir = new THREE.Vector3().subVectors(next, prev).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(1.8);

      const left  = new THREE.Vector3().copy(curr).sub(perp);
      const right = new THREE.Vector3().copy(curr).add(perp);
      const v = i / (pts.length - 1);

      const li = i * 2;
      const ri = i * 2 + 1;

      positions[li * 3]     = left.x;
      positions[li * 3 + 1] = left.y;
      positions[li * 3 + 2] = left.z;
      positions[ri * 3]     = right.x;
      positions[ri * 3 + 1] = right.y;
      positions[ri * 3 + 2] = right.z;

      normals[li * 3 + 1] = 1;
      normals[ri * 3 + 1] = 1;

      uvs[li * 2]     = 0;
      uvs[li * 2 + 1] = v;
      uvs[ri * 2]     = 1;
      uvs[ri * 2 + 1] = v;

      if (i < pts.length - 1) {
        const a = li, b = ri, c = li + 2, d = ri + 2;
        indices.push(a, b, c, b, d, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal',   new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }, []);

  useEffect(() => {
    const rock = rockRef.current;
    const lily = lilyRef.current;
    if (!rock || !lily) return;

    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    const rand = seededRandom(66);
    const streamPts = STREAM_CURVE.getPoints(120);

    for (let i = 0; i < ROCK_COUNT; i++) {
      const pt = streamPts[Math.floor(rand() * streamPts.length)];
      const side = rand() > 0.5 ? 1 : -1;
      pos.set(pt.x + side * (2 + rand() * 1.5), 0.2, pt.z + (rand() - 0.5) * 2);
      quat.setFromEuler(new THREE.Euler(rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5));
      const s = 0.3 + rand() * 0.5;
      scl.set(s, s * 0.6, s);
      matrix.compose(pos, quat, scl);
      rock.setMatrixAt(i, matrix);
    }

    for (let i = 0; i < LILY_COUNT; i++) {
      const pt = streamPts[Math.floor(rand() * streamPts.length)];
      pos.set(pt.x + (rand() - 0.5) * 2, 0.07, pt.z + (rand() - 0.5) * 2);
      quat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, rand() * Math.PI * 2));
      scl.set(1, 1, 1);
      matrix.compose(pos, quat, scl);
      lily.setMatrixAt(i, matrix);
    }

    rock.instanceMatrix.needsUpdate = true;
    lily.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, dt) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value += dt;
    }
  });

  return (
    <group>
      {/* Water ribbon */}
      <mesh geometry={streamGeo}>
        <shaderMaterial
          ref={matRef}
          vertexShader={WATER_VERT}
          fragmentShader={WATER_FRAG}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Rocks along banks */}
      <instancedMesh ref={rockRef} args={[undefined, undefined, ROCK_COUNT]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} metalness={0.05} />
      </instancedMesh>
      {/* Lily pads */}
      <instancedMesh ref={lilyRef} args={[undefined, undefined, LILY_COUNT]}>
        <circleGeometry args={[0.4, 8]} />
        <meshStandardMaterial color="#2d6e2d" roughness={0.8} metalness={0} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

const LEAF_COUNT = 200;

function JungleLeaves() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const rand = seededRandom(99);
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();

    for (let i = 0; i < LEAF_COUNT; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 22 + rand() * 63;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      pos.set(x, 0.05, z);
      quat.setFromEuler(new THREE.Euler(
        (rand() - 0.5) * THREE.MathUtils.degToRad(70),
        rand() * Math.PI * 2,
        (rand() - 0.5) * THREE.MathUtils.degToRad(70),
      ));
      const s = 0.7 + rand() * 0.6;
      scl.set(s, s, s);
      matrix.compose(pos, quat, scl);
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, LEAF_COUNT]}>
      <planeGeometry args={[0.8, 2]} />
      <meshStandardMaterial color="#2a6b1a" roughness={0.9} metalness={0} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

const DUST_COUNT = 500;

function JungleDust() {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const positionsRef = useRef<Float32Array | null>(null);
  const driftRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    const rand = seededRandom(33);
    const positions = new Float32Array(DUST_COUNT * 3);
    const drift = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3]     = (rand() - 0.5) * 240;
      positions[i * 3 + 1] = rand() * 5;
      positions[i * 3 + 2] = (rand() - 0.5) * 240;
      drift[i * 3]     = (rand() - 0.5) * 0.006;
      drift[i * 3 + 1] = (rand() - 0.5) * 0.003;
      drift[i * 3 + 2] = (rand() - 0.5) * 0.006;
    }
    positionsRef.current = positions;
    driftRef.current = drift;
    if (geoRef.current) {
      geoRef.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }
  }, []);

  useFrame(() => {
    const geo = geoRef.current;
    const positions = positionsRef.current;
    const drift = driftRef.current;
    if (!geo || !positions || !drift) return;

    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3]     += drift[i * 3];
      positions[i * 3 + 1] += drift[i * 3 + 1];
      positions[i * 3 + 2] += drift[i * 3 + 2];

      if (positions[i * 3]     >  120) positions[i * 3]     = -120;
      if (positions[i * 3]     < -120) positions[i * 3]     =  120;
      if (positions[i * 3 + 1] >    5) positions[i * 3 + 1] =  0;
      if (positions[i * 3 + 1] <    0) positions[i * 3 + 1] =  5;
      if (positions[i * 3 + 2] >  120) positions[i * 3 + 2] = -120;
      if (positions[i * 3 + 2] < -120) positions[i * 3 + 2] =  120;
    }

    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial size={0.06} color="#fffde7" transparent opacity={0.6} depthWrite={false} />
    </points>
  );
}

function ForestWall() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const silhouetteTex = useMemo(() => createTreeSilhouetteMap(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const rand = seededRandom(200);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    for (let i = 0; i < WALL_COUNT; i++) {
      const angle = (i / WALL_COUNT) * Math.PI * 2 + (rand() - 0.5) * 0.15;
      const r = 90 + rand() * 25;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = 14 + rand() * 8;
      const w = 18 + rand() * 10;
      // Build rotation, apply scale, then set translation directly
      matrix.makeRotationY(angle + Math.PI);
      matrix.scale(new THREE.Vector3(w, h, 1));
      matrix.setPosition(x, h / 2, z);
      mesh.setMatrixAt(i, matrix);
      color.setStyle(FOLIAGE_COLORS[i % FOLIAGE_COLORS.length]);
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, WALL_COUNT]} castShadow={false}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        map={silhouetteTex}
        alphaMap={silhouetteTex}
        alphaTest={0.2}
        vertexColors
        roughness={1}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

function ArcadeEnvironment() {
  const { scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2(FOREST_FOG_COLOR, FOREST_FOG_DENSITY);
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  return (
    <group>
      <JungleGround />
      <JungleGrass />
      <JungleTrees />
      <JungleStream />
      <JungleLeaves />
      <JungleDust />
      <ForestWall />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#7CF7C6" wireframe />
    </mesh>
  );
}

interface TerrainGroundProps {
  terrainRootRef: MutableRefObject<THREE.Object3D | null>;
  terrainBoundsRef: MutableRefObject<TerrainBounds | null>;
}

function TerrainGround({ terrainRootRef, terrainBoundsRef }: TerrainGroundProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const { scene } = useGLTF(TERRAIN_GLB_PATH);

  const transform = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());

    const offsetX = -center.x * TERRAIN_SCALE;
    const offsetY = -box.min.y * TERRAIN_SCALE;
    const offsetZ = -center.z * TERRAIN_SCALE;

    return {
      offset: [offsetX, offsetY, offsetZ] as [number, number, number],
      bounds: {
        minX: (box.min.x - center.x) * TERRAIN_SCALE,
        maxX: (box.max.x - center.x) * TERRAIN_SCALE,
        minY: 0,
        maxY: (box.max.y - box.min.y) * TERRAIN_SCALE,
        minZ: (box.min.z - center.z) * TERRAIN_SCALE,
        maxZ: (box.max.z - center.z) * TERRAIN_SCALE,
      } satisfies TerrainBounds,
    };
  }, [scene]);

  useEffect(() => {
    const terrainRoot = groupRef.current;
    if (!terrainRoot) return;
    terrainRootRef.current = terrainRoot;
    terrainBoundsRef.current = transform.bounds;

    return () => {
      if (terrainRootRef.current === terrainRoot) {
        terrainRootRef.current = null;
      }
      terrainBoundsRef.current = null;
    };
  }, [terrainBoundsRef, terrainRootRef, transform.bounds]);

  useEffect(() => {
    const anisotropy = Math.max(1, Math.min(16, gl.capabilities.getMaxAnisotropy()));
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const textured = material as THREE.Material & { map?: THREE.Texture | null };
        if (!textured.map) continue;
        textured.map.anisotropy = anisotropy;
        textured.map.needsUpdate = true;
      }
    });
  }, [gl, scene]);

  return (
    <group ref={groupRef} position={transform.offset} scale={[TERRAIN_SCALE, TERRAIN_SCALE, TERRAIN_SCALE]}>
      <primitive object={scene} />
    </group>
  );
}

function normalizeClipName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pickClip(animations: THREE.AnimationClip[], matcher: (normalized: string) => boolean): string | null {
  for (const clip of animations) {
    const normalized = normalizeClipName(clip.name);
    if (normalized.includes('death')) continue;
    if (matcher(normalized)) return clip.name;
  }
  return null;
}

function buildClipSet(animations: THREE.AnimationClip[]): ClipSet {
  const minionSpawn = pickClip(animations, (normalized) => normalized.includes('raidminionspawn'));
  const nextRound = pickClip(animations, (normalized) => normalized.includes('raidnextround'));
  const playerSpawn = pickClip(animations, (normalized) => normalized.includes('raidplayerspawn'));
  const spawn = pickClip(
    animations,
    (normalized) =>
      normalized.includes('raidspawn') &&
      !normalized.includes('minion') &&
      !normalized.includes('player') &&
      !normalized.includes('walkloop'),
  );
  const spawnWalkLoop = pickClip(
    animations,
    (normalized) =>
      normalized.includes('radarbwalk') ||
      (normalized.includes('raidspawn') &&
        !normalized.includes('minion') &&
        !normalized.includes('player') &&
        normalized.includes('walkloop')),
  );
  const minionSpawnWalkLoop = pickClip(
    animations,
    (normalized) => normalized.includes('raidminionspawn') && normalized.includes('walkroarloop'),
  );
  const victoryIn = pickClip(animations, (normalized) => normalized.includes('raidvictoryin'));
  const victoryOut = pickClip(animations, (normalized) => normalized.includes('raidvictoryout'));
  const victoryIdle = pickClip(animations, (normalized) => normalized.includes('raidvictoryidle'));
  const victory = pickClip(
    animations,
    (normalized) =>
      normalized.includes('raidvictory') &&
      !normalized.includes('idle') &&
      !normalized.includes('in') &&
      !normalized.includes('out'),
  );

  return {
    minionSpawn,
    minionSpawnWalkLoop,
    nextRound,
    playerSpawn,
    spawn,
    spawnWalkLoop,
    victory,
    victoryIn,
    victoryOut,
    victoryIdle,
    idleFallback: victoryIdle ?? nextRound ?? spawn,
  };
}

function isWalkCycleClipName(normalizedClipName: string): boolean {
  if (normalizedClipName.includes('raidminionspawn')) return true;
  if (normalizedClipName.includes('radarbwalk')) return true;
  return (
    normalizedClipName.includes('raidspawn') &&
    !normalizedClipName.includes('minion') &&
    !normalizedClipName.includes('player')
  );
}

function getTrackNodeName(trackName: string): string {
  const dotIndex = trackName.lastIndexOf('.');
  return dotIndex >= 0 ? trackName.slice(0, dotIndex) : trackName;
}

function shapeCameraStick(value: number): number {
  return value;
}

function buildRestPositionMap(root: THREE.Object3D): Map<string, THREE.Vector3> {
  const map = new Map<string, THREE.Vector3>();
  root.traverse((object) => {
    if (!object.name) return;
    map.set(object.name.toLowerCase(), object.position.clone());
  });
  return map;
}

function sampleVectorTrackAtTime(
  times: ArrayLike<number>,
  values: ArrayLike<number>,
  sampleTime: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const keyCount = times.length;
  if (keyCount === 0) {
    return out.set(0, 0, 0);
  }

  if (sampleTime <= times[0]) {
    return out.set(values[0] ?? 0, values[1] ?? 0, values[2] ?? 0);
  }

  const lastIndex = keyCount - 1;
  if (sampleTime >= times[lastIndex]) {
    const base = lastIndex * 3;
    return out.set(values[base] ?? 0, values[base + 1] ?? 0, values[base + 2] ?? 0);
  }

  let low = 0;
  let high = lastIndex;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (times[mid] <= sampleTime) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const t0 = times[low];
  const t1 = times[high];
  const alpha = t1 - t0 > 1e-6 ? (sampleTime - t0) / (t1 - t0) : 0;
  const i0 = low * 3;
  const i1 = high * 3;
  out.set(
    THREE.MathUtils.lerp(values[i0] ?? 0, values[i1] ?? 0, alpha),
    THREE.MathUtils.lerp(values[i0 + 1] ?? 0, values[i1 + 1] ?? 0, alpha),
    THREE.MathUtils.lerp(values[i0 + 2] ?? 0, values[i1 + 2] ?? 0, alpha),
  );
  return out;
}

function findRootMotionTrack(clip: THREE.AnimationClip): THREE.VectorKeyframeTrack | null {
  const positionTracks = clip.tracks.filter(
    (track): track is THREE.VectorKeyframeTrack =>
      track instanceof THREE.VectorKeyframeTrack && track.name.toLowerCase().endsWith('.position'),
  );
  if (positionTracks.length === 0) return null;

  const preferred = positionTracks.find((track) => track.name.toLowerCase().includes('pelvis'));
  if (preferred) return preferred;

  const fallback = positionTracks.find(
    (track) => track.name.toLowerCase().includes('root') || track.name.toLowerCase().includes('hips'),
  );
  return fallback ?? positionTracks[0];
}

function freezeQuaternionTrack(track: THREE.QuaternionKeyframeTrack): THREE.KeyframeTrack {
  const values = track.values.slice();
  const x0 = values[0] ?? 0;
  const y0 = values[1] ?? 0;
  const z0 = values[2] ?? 0;
  const w0 = values[3] ?? 1;
  for (let i = 0; i < values.length; i += 4) {
    values[i] = x0;
    values[i + 1] = y0;
    values[i + 2] = z0;
    values[i + 3] = w0;
  }
  return new THREE.QuaternionKeyframeTrack(track.name, track.times.slice(), values, track.getInterpolation());
}

function neutralizeTrackRootMotion(
  track: THREE.VectorKeyframeTrack,
  restPositionsByNodeName: Map<string, THREE.Vector3>,
  rootMotionTrack: THREE.VectorKeyframeTrack,
): THREE.KeyframeTrack {
  if (!track.name.toLowerCase().endsWith('.position')) {
    return track.clone();
  }

  const trackValues = track.values.slice();
  const firstTrackX = trackValues[0] ?? 0;
  const firstTrackY = trackValues[1] ?? 0;
  const firstTrackZ = trackValues[2] ?? 0;
  const nodeName = getTrackNodeName(track.name).toLowerCase();
  const restPosition = restPositionsByNodeName.get(nodeName) ?? new THREE.Vector3(0, 0, 0);

  const rootFirstX = rootMotionTrack.values[0] ?? 0;
  const rootFirstY = rootMotionTrack.values[1] ?? 0;
  const rootFirstZ = rootMotionTrack.values[2] ?? 0;
  const rootSample = new THREE.Vector3();

  for (let i = 0; i < trackValues.length; i += 3) {
    const keyframeIndex = i / 3;
    const sampleTime = track.times[keyframeIndex] ?? 0;
    sampleVectorTrackAtTime(rootMotionTrack.times, rootMotionTrack.values, sampleTime, rootSample);

    const localDeltaX = (trackValues[i] ?? 0) - firstTrackX;
    const localDeltaY = (trackValues[i + 1] ?? 0) - firstTrackY;
    const localDeltaZ = (trackValues[i + 2] ?? 0) - firstTrackZ;

    const rootDeltaX = rootSample.x - rootFirstX;
    const rootDeltaY = rootSample.y - rootFirstY;
    const rootDeltaZ = rootSample.z - rootFirstZ;

    trackValues[i] = restPosition.x + localDeltaX - rootDeltaX;
    trackValues[i + 1] = restPosition.y + localDeltaY - rootDeltaY;
    trackValues[i + 2] = restPosition.z + localDeltaZ - rootDeltaZ;
  }

  return new THREE.VectorKeyframeTrack(track.name, track.times.slice(), trackValues, track.getInterpolation());
}

function estimateClipFps(clip: THREE.AnimationClip): number {
  let minDelta = Number.POSITIVE_INFINITY;
  for (const track of clip.tracks) {
    const keyframeTrack = track as THREE.KeyframeTrack & { times: ArrayLike<number> };
    const times = keyframeTrack.times;
    for (let i = 1; i < times.length; i += 1) {
      const delta = (times[i] ?? 0) - (times[i - 1] ?? 0);
      if (delta > 1e-4 && delta < minDelta) {
        minDelta = delta;
      }
    }
  }

  if (!Number.isFinite(minDelta)) return 30;
  const fps = 1 / minDelta;
  return Math.max(24, Math.min(120, fps));
}

function createRotationOnlyClip(sourceClip: THREE.AnimationClip, nextName: string): THREE.AnimationClip | null {
  const clipped = sourceClip.clone();
  clipped.name = nextName;
  clipped.tracks = clipped.tracks
    .filter((track) => {
      if (track instanceof THREE.VectorKeyframeTrack && track.name.toLowerCase().endsWith('.position')) {
        return false;
      }
      return true;
    })
    .map((track) => track.clone());

  if (clipped.tracks.length === 0) return null;
  clipped.resetDuration();
  clipped.optimize();
  if (clipped.duration <= 0.05) return null;
  return clipped;
}

function createSpawnWalkLoopClip(baseClip: THREE.AnimationClip): THREE.AnimationClip | null {
  const fps = estimateClipFps(baseClip);
  const totalFrames = Math.max(3, Math.round(baseClip.duration * fps));
  const startFrame = Math.max(0, Math.floor(totalFrames * 0.30));
  const endFrame = Math.max(startFrame + 2, Math.floor(totalFrames * 0.70));
  const baseName = `${baseClip.name}__walk_loop`;

  if (endFrame - startFrame >= 2) {
    const loopClip = THREE.AnimationUtils.subclip(baseClip, baseName, startFrame, endFrame, fps);
    if (loopClip && loopClip.duration > 0.05) {
      loopClip.resetDuration();
      loopClip.optimize();
      return loopClip;
    }
  }

  // Fallback: use entire clip with all tracks intact
  const fallback = baseClip.clone();
  fallback.name = baseName;
  fallback.resetDuration();
  fallback.optimize();
  return fallback;
}

// Create a subclip of the minionSpawn animation covering only the walk+roar
// portion (frames 0 → MINION_SPAWN_WALK_END_RATIO). This lets the walk loop
// omit the long stand-still phase at the end of the full spawn sequence.
function createMinionSpawnWalkRoarLoop(baseClip: THREE.AnimationClip): THREE.AnimationClip | null {
  const fps = estimateClipFps(baseClip);
  const totalFrames = Math.max(3, Math.round(baseClip.duration * fps));
  const endFrame = Math.max(2, Math.floor(totalFrames * MINION_SPAWN_WALK_END_RATIO));
  const clipName = `${baseClip.name}__walk_roar_loop`;
  const loopClip = THREE.AnimationUtils.subclip(baseClip, clipName, 0, endFrame, fps);
  if (loopClip && loopClip.duration > 0.1) {
    loopClip.resetDuration();
    loopClip.optimize();
    return loopClip;
  }
  return null;
}

function prepareAnimationsForArcade(
  animations: THREE.AnimationClip[],
  restPositionsByNodeName: Map<string, THREE.Vector3>,
): THREE.AnimationClip[] {
  // If the GLB already ships a dedicated walk-loop clip, do NOT generate a
  // synthetic subclip from the spawn animation. The synthetic clip's normalised
  // name is identical to the real clip's name ("raidspawnwalkloop"), so it
  // would shadow the real clip in buildClipSet — producing a non-seamless,
  // visually broken 30-70% subclip of the spawn animation instead of the
  // designer-authored looping walk cycle.
  const hasDedicatedWalkLoop = animations.some((clip) => {
    const n = normalizeClipName(clip.name);
    return (
      n.includes('radarbwalk') ||
      (n.includes('raidspawn') && !n.includes('minion') && !n.includes('player') && n.includes('walkloop'))
    );
  });

  const prepared: THREE.AnimationClip[] = [];
  for (const clip of animations) {
    const normalized = normalizeClipName(clip.name);
    if (!isWalkCycleClipName(normalized)) {
      const cloned = clip.clone();
      const rootMotionTrack = findRootMotionTrack(cloned);
      if (rootMotionTrack) {
        // Strip the pelvis/root position track so the mesh never drifts during
        // or after sequence animations. Rotation tracks are kept so the
        // animations still play correctly in place.
        cloned.tracks = cloned.tracks.filter((t) => t !== rootMotionTrack);
        cloned.resetDuration();
      }
      prepared.push(cloned);
      continue;
    }

    const cloned = clip.clone();
    const rootMotionTrack = findRootMotionTrack(cloned);
    if (!rootMotionTrack) {
      prepared.push(cloned);
      continue;
    }
    const rootTrackNodeName = getTrackNodeName(rootMotionTrack.name).toLowerCase();
    cloned.tracks = cloned.tracks.map((track) =>
      track instanceof THREE.VectorKeyframeTrack
        ? neutralizeTrackRootMotion(track, restPositionsByNodeName, rootMotionTrack)
        : track instanceof THREE.QuaternionKeyframeTrack &&
            getTrackNodeName(track.name).toLowerCase() === rootTrackNodeName
          ? freezeQuaternionTrack(track)
          : track.clone(),
    );

    prepared.push(cloned);

    // Only generate a synthetic walk loop as a fallback when the GLB has no
    // dedicated walk-loop animation.
    const isPrimarySpawnClip =
      normalized.includes('raidspawn') && !normalized.includes('minion') && !normalized.includes('player');
    if (isPrimarySpawnClip && !hasDedicatedWalkLoop) {
      const walkLoopClip = createSpawnWalkLoopClip(cloned);
      if (walkLoopClip) {
        prepared.push(walkLoopClip);
      }
    }

    // For the minionSpawn clip, also create a walk+roar subclip that omits the
    // long stand-still phase at the end so the walk loop is walk→roar→walk→roar.
    if (normalized.includes('raidminionspawn')) {
      const walkRoarClip = createMinionSpawnWalkRoarLoop(cloned);
      if (walkRoarClip) {
        prepared.push(walkRoarClip);
      }
    }
  }
  return prepared;
}

interface RexyArcadeModelProps {
  locomotionRef: MutableRefObject<LocomotionState>;
  animationCue: ArcadeAnimCue | null;
  resetToken: number;
  onBoundsRadiusChange?: (radius: number) => void;
}

function RexyArcadeModel({
  locomotionRef,
  animationCue,
  resetToken,
  onBoundsRadiusChange,
}: RexyArcadeModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(GLB_PATH);
  const restPositionsByNodeName = useMemo(() => buildRestPositionMap(scene), [scene]);
  const preparedAnimations = useMemo(
    () => prepareAnimationsForArcade(animations, restPositionsByNodeName),
    [animations, restPositionsByNodeName],
  );
  const { actions, mixer } = useAnimations(preparedAnimations, groupRef);

  const clipSet = useMemo(() => buildClipSet(preparedAnimations), [preparedAnimations]);
  const clipDurations = useMemo(
    () => new Map(preparedAnimations.map((clip) => [clip.name, clip.duration] as const)),
    [preparedAnimations],
  );

  const currentActionRef = useRef<THREE.AnimationAction | null>(null);
  const currentActionLoopRef = useRef(false);
  const locomotionActionRef = useRef<THREE.AnimationAction | null>(null);
  const fadeStopTimerRef = useRef<number | null>(null);
  const sequenceTimersRef = useRef<number[]>([]);
  const sequenceTokenRef = useRef(0);
  const sequenceActiveRef = useRef(false);
  const walkCycleActiveRef = useRef(false);
  const wasMovingRef = useRef(false);
  const clipSetRef = useRef(clipSet);

  useEffect(() => {
    clipSetRef.current = clipSet;
  }, [clipSet]);

  const transform = useMemo(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Number.isFinite(sphere.radius) && sphere.radius > 0.001 ? sphere.radius : 6;
    return {
      offset: [-center.x, -box.min.y, -center.z] as [number, number, number],
      radius,
    };
  }, [scene]);

  useEffect(() => {
    onBoundsRadiusChange?.(transform.radius);
  }, [onBoundsRadiusChange, transform.radius]);

  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      if (mesh.geometry && !mesh.geometry.boundingSphere) {
        mesh.geometry.computeBoundingSphere();
      }
    });
  }, [scene]);

  const clearFadeStopTimer = useCallback(() => {
    if (fadeStopTimerRef.current !== null) {
      window.clearTimeout(fadeStopTimerRef.current);
      fadeStopTimerRef.current = null;
    }
  }, []);

  const clearSequenceTimers = useCallback(() => {
    sequenceTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    sequenceTimersRef.current = [];
  }, []);

  const playClip = useCallback(
    (clipName: string | null, loop: boolean): THREE.AnimationAction | null => {
      if (!clipName) return null;
      const nextAction = actions[clipName];
      if (!nextAction) return null;

      clearFadeStopTimer();

      const previousAction = currentActionRef.current;
      const sameAction = previousAction === nextAction;
      const alreadyRunning = nextAction.isRunning();

      if (sameAction && loop && alreadyRunning && currentActionLoopRef.current) {
        return nextAction;
      }

      nextAction.enabled = true;
      nextAction.setEffectiveWeight(1);
      nextAction.setEffectiveTimeScale(1);
      nextAction.clampWhenFinished = !loop;
      nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);

      if (previousAction && previousAction !== nextAction) {
        previousAction.fadeOut(FADE_SECONDS);
        nextAction.reset();
        nextAction.crossFadeFrom(previousAction, FADE_SECONDS, false);
        nextAction.play();
        const actionToStop = previousAction;
        fadeStopTimerRef.current = window.setTimeout(() => {
          actionToStop.stop();
          fadeStopTimerRef.current = null;
        }, FADE_SECONDS * 1000 + 40);
      } else {
        // stop() fully deactivates the action and clears stale finished/clamped
        // state from a previous LoopOnce run before resetting and replaying.
        // fadeIn() on a previously-finished action can leave a stale weight
        // interpolant that prevents the loop from running correctly.
        nextAction.stop();
        nextAction.reset();
        nextAction.play();
        // Re-apply loop settings after play() — Three.js stop() calls reset()
        // internally which sets _startTime=0; reaffirming here ensures the
        // mixer picks up the correct mode on its very next update tick.
        nextAction.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        nextAction.clampWhenFinished = !loop;
      }

      currentActionRef.current = nextAction;
      currentActionLoopRef.current = loop;
      return nextAction;
    },
    [actions, clearFadeStopTimer],
  );

  const stopWalkCycle = useCallback(() => {
    walkCycleActiveRef.current = false;
    locomotionActionRef.current = null;
  }, []);


  const resolveWalkClipName = useCallback(
    (activeClipSet: ClipSet): string | null => {
      // Return the first candidate that actually has an action in the mixer.
      // Without this validation, a name that doesn't exist in `actions` causes
      // playClip to return null silently, currentActionRef is never updated,
      // missingOrWrongAction stays true every frame → infinite silent retry →
      // locomotion moves the actor while no animation plays (visible slide).
      for (const name of [
        activeClipSet.minionSpawnWalkLoop,
        activeClipSet.minionSpawn,
        activeClipSet.spawnWalkLoop,
        activeClipSet.spawn,
      ]) {
        if (name && actions[name]) return name;
      }
      return null;
    },
    [actions],
  );

  const startWalkCycle = useCallback(() => {
    const activeClipSet = clipSetRef.current;
    const walkClip = resolveWalkClipName(activeClipSet);
    if (!walkClip) {
      playClip(activeClipSet.idleFallback, true);
      return;
    }

    walkCycleActiveRef.current = true;
    locomotionActionRef.current = playClip(walkClip, true);
  }, [playClip, resolveWalkClipName]);

  // Safety net: if the walk clip fires a 'finished' event (meaning it somehow
  // ran as LoopOnce rather than LoopRepeat), immediately restart the walk cycle.
  useEffect(() => {
    const handleFinished = (e: { action: THREE.AnimationAction }) => {
      if (!walkCycleActiveRef.current) return;
      const walkClipName = resolveWalkClipName(clipSetRef.current);
      if (!walkClipName) return;
      if (e.action.getClip().name !== walkClipName) return;
      startWalkCycle();
    };
    mixer.addEventListener('finished', handleFinished);
    return () => { mixer.removeEventListener('finished', handleFinished); };
  }, [mixer, resolveWalkClipName, startWalkCycle]);

  const syncBaseline = useCallback(() => {
    if (sequenceActiveRef.current) return;
    const activeClipSet = clipSetRef.current;

    if (locomotionRef.current.isMoving) {
      if (!resolveWalkClipName(activeClipSet)) {
        stopWalkCycle();
        playClip(activeClipSet.idleFallback, true);
        return;
      }
      if (!walkCycleActiveRef.current) {
        startWalkCycle();
      }
      return;
    }

    stopWalkCycle();
    playClip(activeClipSet.idleFallback, true);
  }, [locomotionRef, playClip, resolveWalkClipName, startWalkCycle, stopWalkCycle]);

  useFrame((_, delta) => {
    const isMoving = locomotionRef.current.isMoving;
    if (isMoving !== wasMovingRef.current && !sequenceActiveRef.current) {
      wasMovingRef.current = isMoving;
      syncBaseline();
    }
    if (sequenceActiveRef.current) return;
    if (!isMoving) return;

    const activeClipSet = clipSetRef.current;
    const walkClipName = resolveWalkClipName(activeClipSet);
    if (!walkClipName) return;

    const activeAction = currentActionRef.current;

    // Per-frame enforcement: if the walk action has ended (enabled=false when
    // clampWhenFinished=false, or paused=true when clampWhenFinished=true), do a
    // full stop→setLoop→play restart. stop() calls reset() internally which sets
    // _loopCount=-1 and _startTime=null — without this, _setEndings() is never
    // re-called for the new loop iteration and the tracks use LoopOnce boundary
    // settings, causing the animation to visually slide/freeze at the wrap point.
    if (activeAction && activeAction.getClip().name === walkClipName && walkCycleActiveRef.current) {
      if (!activeAction.enabled || activeAction.paused) {
        activeAction.stop();
        activeAction.setLoop(THREE.LoopRepeat, Infinity);
        activeAction.clampWhenFinished = false;
        activeAction.setEffectiveWeight(1);
        activeAction.setEffectiveTimeScale(1);
        activeAction.play();
      }
    }

    const missingOrWrongAction =
      !activeAction || !activeAction.isRunning() || activeAction.getClip().name !== walkClipName;
    if (missingOrWrongAction) {
      startWalkCycle();
      return;
    }

    const locomotionAction = locomotionActionRef.current ?? activeAction;
    locomotionActionRef.current = locomotionAction;
    const speedNorm = THREE.MathUtils.clamp(locomotionRef.current.speedNorm, 0, 1);
    const targetTimeScale = THREE.MathUtils.lerp(LOCOMOTION_MIN_TIME_SCALE, LOCOMOTION_MAX_TIME_SCALE, speedNorm);
    const currentScale = locomotionAction.getEffectiveTimeScale();
    const smoothedScale = THREE.MathUtils.damp(currentScale, targetTimeScale, 10, delta);
    locomotionAction.setEffectiveTimeScale(smoothedScale);
  });

  const runSequence = useCallback(
    (clips: Array<string | null>) => {
      const sequence = clips.filter((clipName): clipName is string => Boolean(clipName));
      if (sequence.length === 0) {
        syncBaseline();
        return;
      }

      sequenceTokenRef.current += 1;
      const token = sequenceTokenRef.current;
      sequenceActiveRef.current = true;
      clearSequenceTimers();
      stopWalkCycle();

      let elapsedMs = 0;
      const overlapMs = FADE_SECONDS * 550;
      for (const clipName of sequence) {
        const startMs = elapsedMs;
        sequenceTimersRef.current.push(
          window.setTimeout(() => {
            if (sequenceTokenRef.current !== token) return;
            playClip(clipName, false);
          }, startMs),
        );

        const durationMs = Math.max(120, (clipDurations.get(clipName) ?? 0.8) * 1000);
        elapsedMs += Math.max(120, durationMs - overlapMs);
      }

      sequenceTimersRef.current.push(
        window.setTimeout(() => {
          if (sequenceTokenRef.current !== token) return;
          sequenceActiveRef.current = false;
          syncBaseline();
        }, elapsedMs + 40),
      );
    },
    [clearSequenceTimers, clipDurations, playClip, stopWalkCycle, syncBaseline],
  );

  useEffect(() => {
    wasMovingRef.current = locomotionRef.current.isMoving;
    syncBaseline();
  }, [clipSet, locomotionRef, syncBaseline]);

  useEffect(() => {
    if (!animationCue) return;

    switch (animationCue.kind) {
      case 'minion_spawn':
        runSequence([clipSet.minionSpawn]);
        break;
      case 'next_round':
        runSequence([clipSet.nextRound]);
        break;
      case 'player_spawn':
        runSequence([clipSet.playerSpawn]);
        break;
      case 'spawn':
        runSequence([clipSet.spawn]);
        break;
      case 'victory': {
        const victorySequence: Array<string | null> = [];
        if (clipSet.victoryIn) victorySequence.push(clipSet.victoryIn);
        victorySequence.push(clipSet.victory ?? clipSet.victoryIdle);
        if (clipSet.victoryOut) victorySequence.push(clipSet.victoryOut);
        runSequence(victorySequence);
        break;
      }
      default:
        break;
    }
  }, [
    animationCue,
    clipSet.minionSpawn,
    clipSet.nextRound,
    clipSet.playerSpawn,
    clipSet.spawn,
    clipSet.victory,
    clipSet.victoryIdle,
    clipSet.victoryIn,
    clipSet.victoryOut,
    runSequence,
  ]);

  useEffect(() => {
    sequenceTokenRef.current += 1;
    sequenceActiveRef.current = false;
    clearSequenceTimers();
    stopWalkCycle();
    clearFadeStopTimer();
    Object.values(actions).forEach((action) => {
      action?.stop();
    });
    currentActionRef.current = null;
    currentActionLoopRef.current = false;
    wasMovingRef.current = locomotionRef.current.isMoving;
    syncBaseline();
  }, [actions, clearFadeStopTimer, clearSequenceTimers, locomotionRef, resetToken, stopWalkCycle, syncBaseline]);

  useEffect(() => {
    return () => {
      sequenceTokenRef.current += 1;
      clearSequenceTimers();
      stopWalkCycle();
      clearFadeStopTimer();
      Object.values(actions).forEach((action) => action?.stop());
      currentActionRef.current = null;
      currentActionLoopRef.current = false;
    };
  }, [actions, clearFadeStopTimer, clearSequenceTimers, stopWalkCycle]);

  return (
    <group ref={groupRef}>
      <group position={transform.offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

function ArcadeRig({
  actorRef,
  moveRef,
  locomotionRef,
  terrainRootRef,
  terrainBoundsRef,
  resetToken,
  animationCue,
  onModelRadiusChange,
}: ArcadeRigProps) {
  const headingYawRef = useRef(0);
  const bodyYawRef = useRef(0);
  const smoothedTurnInputRef = useRef(0);
  const smoothedThrottleInputRef = useRef(0);
  const forwardDirectionRef = useRef(new THREE.Vector3());
  const targetVelocityRef = useRef(new THREE.Vector3());
  const velocityRef = useRef(new THREE.Vector3());
  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirectionDownRef = useRef(new THREE.Vector3(0, -1, 0));
  const intersectionsRef = useRef<THREE.Intersection[]>([]);
  const targetGroundYRef = useRef(0);
  const lastGoodGroundYRef = useRef<number | null>(null);
  const raycastAccumulatorRef = useRef(1 / GROUND_RAYCAST_HZ);
  const forceGroundSnapRef = useRef(true);

  const clampToPlayableXZ = useCallback(
    (group: THREE.Group): boolean => {
      const startX = group.position.x;
      const startZ = group.position.z;
      const bounds = terrainBoundsRef.current;

      if (bounds) {
        const innerMinX = bounds.minX + TERRAIN_BOUNDS_INSET;
        const innerMaxX = bounds.maxX - TERRAIN_BOUNDS_INSET;
        const innerMinZ = bounds.minZ + TERRAIN_BOUNDS_INSET;
        const innerMaxZ = bounds.maxZ - TERRAIN_BOUNDS_INSET;

        const minX = innerMinX <= innerMaxX ? innerMinX : (bounds.minX + bounds.maxX) * 0.5;
        const maxX = innerMinX <= innerMaxX ? innerMaxX : minX;
        const minZ = innerMinZ <= innerMaxZ ? innerMinZ : (bounds.minZ + bounds.maxZ) * 0.5;
        const maxZ = innerMinZ <= innerMaxZ ? innerMaxZ : minZ;

        group.position.x = THREE.MathUtils.clamp(group.position.x, minX, maxX);
        group.position.z = THREE.MathUtils.clamp(group.position.z, minZ, maxZ);
      } else {
        const radial = Math.hypot(group.position.x, group.position.z);
        if (radial > ARENA_RADIUS && radial > 1e-5) {
          const scale = ARENA_RADIUS / radial;
          group.position.x *= scale;
          group.position.z *= scale;
        }
      }

      return Math.abs(group.position.x - startX) > 1e-6 || Math.abs(group.position.z - startZ) > 1e-6;
    },
    [terrainBoundsRef],
  );

  const sampleGroundHeight = useCallback(
    (x: number, z: number, actorY: number): boolean => {
      const terrainRoot = terrainRootRef.current;
      if (!terrainRoot) return false;

      const bounds = terrainBoundsRef.current;
      const raycaster = raycasterRef.current;
      const rayOrigin = rayOriginRef.current;
      const hits = intersectionsRef.current;

      const originYFromBounds = bounds ? bounds.maxY + GROUND_RAYCAST_TOP_PADDING : actorY + GROUND_RAYCAST_TOP_PADDING;
      const originY = Math.max(originYFromBounds, actorY + GROUND_RAYCAST_TOP_PADDING);
      const rayDistance = bounds
        ? Math.max(GROUND_RAYCAST_MAX_DISTANCE, bounds.maxY - bounds.minY + GROUND_RAYCAST_TOP_PADDING * 3)
        : GROUND_RAYCAST_MAX_DISTANCE;

      rayOrigin.set(x, originY, z);
      raycaster.near = 0;
      raycaster.far = rayDistance;
      raycaster.set(rayOrigin, rayDirectionDownRef.current);
      hits.length = 0;
      raycaster.intersectObject(terrainRoot, true, hits);

      const hit = hits[0];
      if (!hit) return false;
      const nextGroundY = hit.point.y + GROUND_CLEARANCE_OFFSET;
      targetGroundYRef.current = nextGroundY;
      lastGoodGroundYRef.current = nextGroundY;
      return true;
    },
    [terrainBoundsRef, terrainRootRef],
  );

  useEffect(() => {
    locomotionRef.current.isMoving = false;
    locomotionRef.current.speedNorm = 0;
    locomotionRef.current.moveDirection = 1;
    headingYawRef.current = 0;
    bodyYawRef.current = 0;
    smoothedTurnInputRef.current = 0;
    smoothedThrottleInputRef.current = 0;
    targetVelocityRef.current.set(0, 0, 0);
    velocityRef.current.set(0, 0, 0);
    raycastAccumulatorRef.current = 1 / GROUND_RAYCAST_HZ;
    targetGroundYRef.current = 0;
    lastGoodGroundYRef.current = null;
    forceGroundSnapRef.current = true;
    if (actorRef.current) {
      actorRef.current.position.set(0, 0, 0);
      actorRef.current.rotation.set(0, 0, 0);
    }
  }, [actorRef, locomotionRef, resetToken]);

  useFrame((_, delta) => {
    const group = actorRef.current;
    if (!group) return;

    const move = moveRef.current;
    const rawTurnInput = applyDeadzone(move.x, MOVE_TURN_DEADZONE);
    const rawThrottleInput = applyDeadzone(move.y, ARCADE_CONFIG.deadzone);
    const throttleMagnitude = Math.abs(rawThrottleInput);
    const requiredTurnMagnitude = throttleMagnitude > 0.25 ? MOVE_TURN_WHILE_MOVING_GATE : MOVE_TURN_IDLE_GATE;
    const targetTurnInput = Math.abs(rawTurnInput) >= requiredTurnMagnitude ? rawTurnInput : 0;

    smoothedTurnInputRef.current = THREE.MathUtils.damp(
      smoothedTurnInputRef.current,
      targetTurnInput,
      TURN_INPUT_SMOOTHING_PER_SECOND,
      delta,
    );
    smoothedThrottleInputRef.current = THREE.MathUtils.damp(
      smoothedThrottleInputRef.current,
      rawThrottleInput,
      THROTTLE_INPUT_SMOOTHING_PER_SECOND,
      delta,
    );

    headingYawRef.current += smoothedTurnInputRef.current * TURN_RADIANS_PER_SECOND * delta;
    bodyYawRef.current = THREE.MathUtils.damp(bodyYawRef.current, headingYawRef.current, 9, delta);
    group.rotation.y = bodyYawRef.current;

    if (Math.abs(smoothedThrottleInputRef.current) > 0.001) {
      forwardDirectionRef.current.set(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
      targetVelocityRef.current
        .copy(forwardDirectionRef.current)
        .multiplyScalar(smoothedThrottleInputRef.current * WALK_METERS_PER_SECOND);
    } else {
      targetVelocityRef.current.set(0, 0, 0);
    }
    const alpha = 1 - Math.exp(-ARCADE_CONFIG.smoothingPerSecond * delta);
    velocityRef.current.lerp(targetVelocityRef.current, alpha);
    group.position.addScaledVector(velocityRef.current, delta);

    const planarSpeed = Math.hypot(velocityRef.current.x, velocityRef.current.z);
    const wasMoving = locomotionRef.current.isMoving;
    const isMoving = wasMoving
      ? planarSpeed > WALK_LOOP_STOP_WORLD_SPEED
      : planarSpeed > WALK_LOOP_START_WORLD_SPEED;
    locomotionRef.current.isMoving = isMoving;
    const speedNormTarget = THREE.MathUtils.clamp(planarSpeed / WALK_METERS_PER_SECOND, 0, 1);
    locomotionRef.current.speedNorm = THREE.MathUtils.damp(
      locomotionRef.current.speedNorm,
      speedNormTarget,
      LOCOMOTION_SPEED_SMOOTHING_PER_SECOND,
      delta,
    );
    if (Math.abs(smoothedThrottleInputRef.current) > 0.02) {
      locomotionRef.current.moveDirection = smoothedThrottleInputRef.current >= 0 ? 1 : -1;
    }

    const didClampXZ = clampToPlayableXZ(group);

    raycastAccumulatorRef.current += delta;
    const raycastHz = locomotionRef.current.isMoving ? GROUND_RAYCAST_HZ : GROUND_IDLE_RAYCAST_HZ;
    const raycastIntervalSeconds = 1 / raycastHz;
    const shouldSampleGround =
      forceGroundSnapRef.current ||
      (locomotionRef.current.isMoving && raycastAccumulatorRef.current >= raycastIntervalSeconds);

    let didHitGround = false;
    if (shouldSampleGround) {
      raycastAccumulatorRef.current = 0;
      didHitGround = sampleGroundHeight(group.position.x, group.position.z, group.position.y);
      if (!didHitGround && didClampXZ) {
        didHitGround = sampleGroundHeight(group.position.x, group.position.z, group.position.y);
      }
    }

    if (!didHitGround && lastGoodGroundYRef.current !== null) {
      targetGroundYRef.current = lastGoodGroundYRef.current;
    }

    const hasGroundTarget = Number.isFinite(targetGroundYRef.current);
    if (hasGroundTarget) {
      if (forceGroundSnapRef.current && (didHitGround || lastGoodGroundYRef.current !== null)) {
        group.position.y = targetGroundYRef.current;
        forceGroundSnapRef.current = false;
      } else {
        const smoothedY = THREE.MathUtils.damp(
          group.position.y,
          targetGroundYRef.current,
          GROUND_Y_SMOOTHING_PER_SECOND,
          delta,
        );
        const maxYStep = GROUND_MAX_Y_STEP_PER_SECOND * delta;
        group.position.y += THREE.MathUtils.clamp(smoothedY - group.position.y, -maxYStep, maxYStep);
      }
    }
  });

  return (
    <group ref={actorRef}>
      <RexyArcadeModel
        locomotionRef={locomotionRef}
        animationCue={animationCue}
        resetToken={resetToken}
        onBoundsRadiusChange={onModelRadiusChange}
      />
    </group>
  );
}

interface ArcadeFollowCameraProps {
  actorRef: MutableRefObject<THREE.Group | null>;
  aimRef: MutableRefObject<JoyVector>;
  radius: number;
  resetToken: number;
}

function ArcadeFollowCamera({ actorRef, aimRef, radius, resetToken }: ArcadeFollowCameraProps) {
  const { camera } = useThree();
  const yawRef = useRef(0);
  const pitchRef = useRef(CAMERA_DEFAULT_PITCH_RADIANS);
  const smoothedInputXRef = useRef(0);
  const smoothedInputYRef = useRef(0);
  const smoothedTargetRef = useRef(new THREE.Vector3());
  const orbitOffsetRef = useRef(new THREE.Vector3());
  const desiredPositionRef = useRef(new THREE.Vector3());
  const lookAtRef = useRef(new THREE.Vector3());

  useEffect(() => {
    yawRef.current = 0;
    pitchRef.current = CAMERA_DEFAULT_PITCH_RADIANS;
    smoothedInputXRef.current = 0;
    smoothedInputYRef.current = 0;
    smoothedTargetRef.current.set(0, 0, 0);
    const safeRadius = Math.max(0.1, Math.min(radius, 120));
    const distance = Math.max(10, Math.min(safeRadius * CAMERA_DISTANCE_MULTIPLIER, 36));
    const horizontalDistance = distance * Math.cos(pitchRef.current);
    const verticalDistance = distance * Math.sin(pitchRef.current);
    camera.position.set(0, verticalDistance, horizontalDistance);
    camera.near = Math.max(0.01, distance / 4500);
    camera.far = Math.max(2500, distance * 30);
    camera.lookAt(0, safeRadius * 0.12, 0);
    camera.updateProjectionMatrix();
  }, [camera, radius, resetToken]);

  useFrame((_, delta) => {
    const cameraInputX = shapeCameraStick(applyDeadzone(aimRef.current.x, CAMERA_STICK_DEADZONE));
    const cameraInputY = shapeCameraStick(applyDeadzone(aimRef.current.y, CAMERA_STICK_DEADZONE));
    smoothedInputXRef.current = THREE.MathUtils.damp(
      smoothedInputXRef.current,
      cameraInputX,
      CAMERA_INPUT_SMOOTHING_PER_SECOND,
      delta,
    );
    smoothedInputYRef.current = THREE.MathUtils.damp(
      smoothedInputYRef.current,
      cameraInputY,
      CAMERA_INPUT_SMOOTHING_PER_SECOND,
      delta,
    );
    const yawStep = THREE.MathUtils.clamp(
      smoothedInputXRef.current * CAMERA_YAW_RADIANS_PER_SECOND * delta,
      -CAMERA_MAX_YAW_STEP_RADIANS,
      CAMERA_MAX_YAW_STEP_RADIANS,
    );
    const pitchStep = THREE.MathUtils.clamp(
      smoothedInputYRef.current * CAMERA_PITCH_RADIANS_PER_SECOND * delta,
      -CAMERA_MAX_PITCH_STEP_RADIANS,
      CAMERA_MAX_PITCH_STEP_RADIANS,
    );

    yawRef.current += yawStep;
    pitchRef.current = THREE.MathUtils.clamp(
      pitchRef.current + pitchStep,
      CAMERA_MIN_PITCH_RADIANS,
      CAMERA_MAX_PITCH_RADIANS,
    );

    const actorPosition = actorRef.current?.position;
    if (actorPosition) {
      const followAlpha = 1 - Math.exp(-CAMERA_TARGET_SMOOTHING_PER_SECOND * delta);
      smoothedTargetRef.current.lerp(actorPosition, followAlpha);
    }

    const safeRadius = Math.max(0.1, Math.min(radius, 120));
    const distance = Math.max(10, Math.min(safeRadius * CAMERA_DISTANCE_MULTIPLIER, 36));
    const horizontalDistance = distance * Math.cos(pitchRef.current);
    const verticalDistance = distance * Math.sin(pitchRef.current);

    orbitOffsetRef.current.set(
      Math.sin(yawRef.current) * horizontalDistance,
      verticalDistance,
      Math.cos(yawRef.current) * horizontalDistance,
    );
    desiredPositionRef.current.copy(smoothedTargetRef.current).add(orbitOffsetRef.current);
    const positionAlpha = 1 - Math.exp(-CAMERA_POSITION_SMOOTHING_PER_SECOND * delta);
    camera.position.lerp(desiredPositionRef.current, positionAlpha);

    lookAtRef.current.copy(smoothedTargetRef.current);
    lookAtRef.current.y += safeRadius * 0.12;
    camera.lookAt(lookAtRef.current);
  });

  return null;
}

function ForestAudio() {
  useEffect(() => {
    const audio = new Audio('/audio/Forest_Sounds.mov');
    audio.loop   = true;
    audio.volume = 0.35;
    const attempt = audio.play();
    if (attempt !== undefined) {
      attempt.catch(() => {
        const resume = () => audio.play().catch(() => {});
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('keydown',     resume, { once: true });
      });
    }
    return () => { audio.pause(); audio.src = ''; };
  }, []);
  return null;
}

function ArcadeSceneImpl({
  moveRef,
  aimRef,
  resetToken,
  animationCue,
}: ArcadeSceneProps) {
  const [modelRadius, setModelRadius] = useState(6);
  const actorRef = useRef<THREE.Group>(null);
  const locomotionRef = useRef<LocomotionState>({
    isMoving: false,
    speedNorm: 0,
    moveDirection: 1,
  });
  const terrainRootRef = useRef<THREE.Object3D | null>(null);
  const terrainBoundsRef = useRef<TerrainBounds | null>(null);

  return (
    <>
      <ForestAudio />
      <Canvas
        shadows="soft"
        camera={{ position: [0, 18, 10], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance', localClippingEnabled: true }}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
        }}
      >
        <SceneBackground />
        <Environment preset="forest" environmentIntensity={0.55} />
        <Sky
          distance={4500}
          sunPosition={SUN_POSITION}
          turbidity={6}
          rayleigh={0.8}
          mieCoefficient={0.003}
          mieDirectionalG={0.92}
        />
        <ambientLight intensity={0.35} color="#d4ead8" />
        <directionalLight
          intensity={2.5} position={SUN_POSITION} color="#fffbe6"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.5} shadow-camera-far={200}
          shadow-camera-left={-80} shadow-camera-right={80}
          shadow-camera-top={80} shadow-camera-bottom={-80}
          shadow-bias={-0.0005}
        />
        <hemisphereLight args={['#a8d8ea', '#4a7c59', 0.8]} />

        <Suspense fallback={<LoadingFallback />}>
          <ArcadeEnvironment />
          <ArcadeFollowCamera actorRef={actorRef} aimRef={aimRef} radius={modelRadius} resetToken={resetToken} />
          <ArcadeRig
            actorRef={actorRef}
            moveRef={moveRef}
            locomotionRef={locomotionRef}
            terrainRootRef={terrainRootRef}
            terrainBoundsRef={terrainBoundsRef}
            resetToken={resetToken}
            animationCue={animationCue}
            onModelRadiusChange={setModelRadius}
          />
        </Suspense>
      </Canvas>
    </>
  );
}

export const ArcadeScene = memo(ArcadeSceneImpl);

useGLTF.preload(GLB_PATH);
// useGLTF.preload(TERRAIN_GLB_PATH); // disabled while terrain is commented out
