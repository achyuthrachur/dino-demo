'use client';

// =============================================================================
// PresenterHUD.tsx - Webcam Feedback with Real MediaPipe Gesture Recognition
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useExhibitStore } from '@/lib/store';
import {
  getGestureRecognizer,
  HAND_CONNECTIONS,
  type DetectedHand,
  type GestureState,
} from '@/lib/gestures';
import { useGestureActions } from '@/lib/useGestureActions';
import { Button } from '@/components/ui/button';
import {
  Hand,
  Video,
  VideoOff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type HUDStatus = 'idle' | 'loading' | 'initializing' | 'active' | 'error';

// -----------------------------------------------------------------------------
// Confidence Meter
// -----------------------------------------------------------------------------

interface ConfidenceMeterProps {
  confidence: number;
}

function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const getColor = () => {
    if (confidence > 0.8) return 'bg-scientific';
    if (confidence > 0.5) return 'bg-warning';
    return 'bg-laser';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground">CONF</span>
      <div className="w-20 h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ${getColor()}`}
          style={{ width: `${confidence * 100}%` }}
        />
      </div>
      <span className="font-mono text-xs text-foreground w-8">
        {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hand Count Indicator
// -----------------------------------------------------------------------------

function HandCountIndicator({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${
            i < count ? 'bg-scientific/20 text-scientific' : 'bg-muted/30 text-muted-foreground'
          }`}
        >
          <Hand className="w-2.5 h-2.5" />
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Gesture Instructions
// -----------------------------------------------------------------------------

function GestureInstructions({ currentGesture }: { currentGesture: string | null }) {
  const gestures = [
    { gesture: 'Pinch & Drag', action: 'Rotate', icon: '👌', id: 'pinch_drag' },
    { gesture: 'Two-hand Pinch', action: 'Zoom', icon: '🤏', id: 'pinch_spread' },
    { gesture: 'Open Palms', action: 'Explode', icon: '🖐️', id: 'open_palms' },
    { gesture: 'Two Fists', action: 'Pan', icon: '✊', id: 'closed_fists' },
    { gesture: 'Peace Sign', action: 'Scan Mode', icon: '✌️', id: 'peace_sign' },
    { gesture: 'Palm Hold', action: 'Callouts', icon: '✋', id: 'palm_hold' },
  ];

  return (
    <div className="glass rounded-lg p-3 mt-3">
      <h4 className="font-mono text-xs text-muted-foreground uppercase mb-2">
        Gesture Controls
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {gestures.map(({ gesture, action, icon, id }) => (
          <div
            key={gesture}
            className={`flex items-center gap-2 p-1 rounded transition-all duration-200 ${
              currentGesture === id ? 'bg-accent/20 ring-1 ring-accent' : ''
            }`}
          >
            <span className="text-lg">{icon}</span>
            <div className="flex flex-col">
              <span className={`font-mono text-xs ${
                currentGesture === id ? 'text-accent' : 'text-foreground'
              }`}>
                {action}
              </span>
              <span className="font-body text-xs text-muted-foreground">
                {gesture}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Hand Landmark Drawing
// -----------------------------------------------------------------------------

// Particle trail buffer for holographic effect
const TRAIL_LENGTH = 8;
const trailBuffers: Map<number, Array<{ x: number; y: number }>> = new Map();

function drawHandLandmarks(
  ctx: CanvasRenderingContext2D,
  hands: DetectedHand[],
  width: number,
  height: number,
  activeGesture?: GestureState | null
) {
  // Clear with slight fade for trail effect
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';

  const neonColors = ['#f59e0b', '#84cc16']; // Neon amber and neon acid

  hands.forEach((hand, handIndex) => {
    const color = neonColors[handIndex % neonColors.length];
    const landmarks = hand.landmarks;

    // Draw neon connections with glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;

    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (start && end) {
        ctx.beginPath();
        ctx.moveTo((1 - start.x) * width, start.y * height);
        ctx.lineTo((1 - end.x) * width, end.y * height);
        ctx.stroke();
      }
    });

    // Draw fingertip particle trails
    const fingertipIndices = [4, 8, 12, 16, 20];
    fingertipIndices.forEach((tipIdx) => {
      const tip = landmarks[tipIdx];
      if (!tip) return;

      const trailKey = handIndex * 100 + tipIdx;
      if (!trailBuffers.has(trailKey)) {
        trailBuffers.set(trailKey, []);
      }
      const trail = trailBuffers.get(trailKey)!;

      const tx = (1 - tip.x) * width;
      const ty = tip.y * height;
      trail.push({ x: tx, y: ty });
      if (trail.length > TRAIL_LENGTH) trail.shift();

      // Draw trail particles (fading)
      trail.forEach((point, i) => {
        const alpha = (i / trail.length) * 0.6;
        const radius = (i / trail.length) * 4 + 1;

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 12;
        ctx.fill();
      });

      // Draw bright fingertip dot
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 16;
      ctx.fill();

      // Outer ring pulse
      ctx.beginPath();
      ctx.arc(tx, ty, 8, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.stroke();
    });

    // Draw non-fingertip landmarks (smaller, dimmer)
    landmarks.forEach((landmark, index) => {
      if (fingertipIndices.includes(index)) return;
      ctx.beginPath();
      ctx.arc(
        (1 - landmark.x) * width,
        landmark.y * height,
        2,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.shadowBlur = 4;
      ctx.fill();
    });

    // Draw connector line from palm center to model center (top of canvas)
    const palmBase = landmarks[0]; // wrist
    const middleFinger = landmarks[9]; // middle finger base
    if (palmBase && middleFinger) {
      const palmX = (1 - (palmBase.x + middleFinger.x) / 2) * width;
      const palmY = ((palmBase.y + middleFinger.y) / 2) * height;

      // Draw holographic connector line to model
      const gradient = ctx.createLinearGradient(palmX, palmY, width / 2, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.moveTo(palmX, palmY);
      ctx.lineTo(width / 2, 0);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.shadowBlur = 6;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw handedness label with neon glow
    ctx.shadowBlur = 6;
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    const wrist = landmarks[0];
    if (wrist) {
      ctx.fillText(
        hand.handedness.toUpperCase(),
        (1 - wrist.x) * width - 20,
        wrist.y * height + 20
      );
    }

    // Reset shadow
    ctx.shadowBlur = 0;
  });

  // Draw explode debugger line between hands when open_palms gesture is active
  if (hands.length === 2 && activeGesture?.type === 'open_palms') {
    const wrist1 = hands[0].landmarks[0];
    const wrist2 = hands[1].landmarks[0];

    const x1 = (1 - wrist1.x) * width;
    const y1 = wrist1.y * height;
    const x2 = (1 - wrist2.x) * width;
    const y2 = wrist2.y * height;

    // Green when value > 0, dim when inactive
    const explodeValue = activeGesture.value ?? 0;
    const lineColor = explodeValue > 0 ? '#84cc16' : '#f59e0b';
    const lineAlpha = 0.4 + explodeValue * 0.6;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2 + explodeValue * 3;
    ctx.globalAlpha = lineAlpha;
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 12 + explodeValue * 8;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw explode value label at midpoint
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.fillStyle = lineColor;
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 8;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`EXPLODE ${Math.round(explodeValue * 100)}%`, midX, midY - 10);
    ctx.textAlign = 'start';
    ctx.shadowBlur = 0;
  }

  // Clean up trails for hands no longer detected
  if (hands.length === 0) {
    trailBuffers.clear();
  }
}

// -----------------------------------------------------------------------------
// Main Presenter HUD Export
// -----------------------------------------------------------------------------

export function PresenterHUD() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const presenterActive = useExhibitStore((state) => state.presenterActive);
  const setPresenterActive = useExhibitStore((state) => state.setPresenterActive);
  const setPresenterConfidence = useExhibitStore(
    (state) => state.setPresenterConfidence
  );
  const presenterConfidence = useExhibitStore((state) => state.presenterConfidence);

  const [status, setStatus] = useState<HUDStatus>('idle');
  const [currentGesture, setCurrentGesture] = useState<GestureState | null>(null);
  const [handCount, setHandCount] = useState(0);

  // Gesture action hook
  const { handleGesture, reset: resetGestureActions } = useGestureActions();

  // Gesture recognizer instance
  const gestureRecognizer = getGestureRecognizer();

  // Start webcam and MediaPipe
  const startWebcam = useCallback(async () => {
    try {
      setStatus('loading');

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Initialize MediaPipe
      setStatus('initializing');
      const initialized = await gestureRecognizer.initialize();

      if (!initialized) {
        throw new Error('Failed to initialize MediaPipe');
      }

      setStatus('active');
      toast.success('Presenter mode activated', {
        description: 'MediaPipe gesture tracking enabled',
      });

      // Start gesture detection loop
      startDetectionLoop();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to start presenter mode:', error);
      }
      setStatus('error');
      toast.error('Failed to start presenter mode', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [gestureRecognizer]);

  // Detection loop
  const startDetectionLoop = useCallback(() => {
    const detect = () => {
      if (!videoRef.current || !canvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      // Ensure canvas matches video dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Detect hands
      const timestamp = performance.now();
      const hands = gestureRecognizer.detectHands(video, timestamp);

      // Update hand count
      setHandCount(hands.length);

      // Recognize gesture
      const gesture = gestureRecognizer.recognizeGesture(hands);

      // Draw hand landmarks (with gesture state for visual debugger)
      drawHandLandmarks(ctx, hands, canvas.width, canvas.height, gesture);
      setCurrentGesture(gesture);
      setPresenterConfidence(gesture.confidence);

      // Trigger gesture actions
      handleGesture(gesture);

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    animationFrameRef.current = requestAnimationFrame(detect);
  }, [gestureRecognizer, handleGesture, setPresenterConfidence]);

  // Stop webcam and cleanup
  const stopWebcam = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop video stream
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    // Reset state
    setStatus('idle');
    setCurrentGesture(null);
    setHandCount(0);
    resetGestureActions();
  }, [resetGestureActions]);

  // Handle presenter mode toggle
  useEffect(() => {
    if (presenterActive) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => stopWebcam();
  }, [presenterActive, startWebcam, stopWebcam]);

  // ESC key to disable presenter mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && presenterActive) {
        setPresenterActive(false);
        toast.info('Presenter mode disabled', {
          description: 'Press the Presenter button to re-enable',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presenterActive, setPresenterActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gestureRecognizer.dispose();
    };
  }, [gestureRecognizer]);

  if (!presenterActive) return null;

  return (
    <div className="fixed top-4 right-4 z-50 w-64 sm:w-72 max-w-[calc(100vw-2rem)]">
      <div className="glass-strong rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Hand className="h-4 w-4 text-accent" />
            <span className="font-display text-sm font-semibold">
              Presenter Mode
            </span>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <HandCountIndicator count={handCount} />

            {status === 'loading' && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {status === 'initializing' && (
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
            )}
            {status === 'active' && (
              <CheckCircle className="h-4 w-4 text-scientific" />
            )}
            {status === 'error' && (
              <AlertCircle className="h-4 w-4 text-laser" />
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setPresenterActive(false)}
            >
              <VideoOff className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Video feed */}
        <div className="relative aspect-[4/3] bg-background">
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform scale-x-[-1]"
            muted
            playsInline
          />

          {/* Canvas overlay for hand visualization */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Gesture detection indicator */}
          {currentGesture && currentGesture.type !== 'none' && (
            <div className="absolute top-2 left-2 glass rounded-lg px-2 py-1">
              <span className="font-mono text-xs text-scientific">
                {currentGesture.type.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          )}

          {/* Loading overlay */}
          {(status === 'loading' || status === 'initializing') && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span className="font-mono text-xs text-muted-foreground">
                  {status === 'loading' ? 'Starting camera...' : 'Loading MediaPipe...'}
                </span>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <AlertCircle className="h-8 w-8 text-laser" />
                <span className="font-body text-sm text-foreground">
                  Camera access denied
                </span>
                <Button size="sm" onClick={startWebcam} className="mt-2">
                  <Video className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Confidence meter */}
        <div className="p-3 border-t border-border">
          <ConfidenceMeter confidence={presenterConfidence} />
        </div>

        {/* Gesture instructions */}
        <div className="px-3 pb-3">
          <GestureInstructions currentGesture={currentGesture?.type || null} />
        </div>

        {/* ESC hint */}
        <div className="px-3 pb-3">
          <p className="font-mono text-xs text-muted-foreground text-center">
            Press <kbd className="px-1 py-0.5 bg-muted rounded text-foreground">ESC</kbd> to exit
          </p>
        </div>
      </div>
    </div>
  );
}
