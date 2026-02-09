import type { HandLandmarks } from './config';
import { INPUT } from '../motion';

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let landmarker: any = null;
let videoEl: HTMLVideoElement | null = null;
let rafId = 0;
let running = false;
let latestHands: HandLandmarks[] = [];

export function getLatestHands(): HandLandmarks[] {
  return latestHands;
}

export function getVideoElement(): HTMLVideoElement | null {
  return videoEl;
}

export async function startHandTracker(): Promise<void> {
  if (running) return;

  // Dynamic import to avoid SSR issues with MediaPipe WASM
  const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: INPUT.minHandConfidence,
    minHandPresenceConfidence: INPUT.minHandConfidence,
    minTrackingConfidence: INPUT.minHandConfidence,
  });

  videoEl = document.createElement('video');
  videoEl.setAttribute('playsinline', '');
  videoEl.setAttribute('autoplay', '');
  videoEl.style.display = 'none';
  document.body.appendChild(videoEl);

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240, facingMode: 'user' },
  });
  videoEl.srcObject = stream;
  await videoEl.play();

  running = true;
  detect();
}

function detect() {
  if (!running || !landmarker || !videoEl) return;

  if (videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const result = landmarker.detectForVideo(videoEl, performance.now());
    const hands: HandLandmarks[] = [];

    if (result.landmarks) {
      for (let i = 0; i < result.landmarks.length; i++) {
        hands.push({
          landmarks: result.landmarks[i],
          worldLandmarks: result.worldLandmarks?.[i] ?? result.landmarks[i],
          handedness:
            result.handednesses?.[i]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right',
          confidence: result.handednesses?.[i]?.[0]?.score ?? 0,
        });
      }
    }

    latestHands = hands;
  }

  rafId = requestAnimationFrame(detect);
}

export function stopHandTracker(): void {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  if (videoEl) {
    const stream = videoEl.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    videoEl.srcObject = null;
    videoEl.remove();
    videoEl = null;
  }

  if (landmarker) {
    landmarker.close();
    landmarker = null;
  }

  latestHands = [];
}
