'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../_lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_MS, EASING } from '../_lib/motion';
import { getVideoElement, getLatestHands } from '../_lib/gesture/handTracker';

const PREVIEW_W = 192;
const PREVIEW_H = 144;

// Landmark connections for drawing hand skeleton
const CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [5, 9], [9, 10], [10, 11], [11, 12],  // middle
  [9, 13], [13, 14], [14, 15], [15, 16], // ring
  [13, 17], [17, 18], [18, 19], [19, 20], // pinky
  [0, 17],                                // palm base
];

export function CameraPreview() {
  const gestureEnabled = useStore((s) => s.gestureEnabled);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const drawLoop = useCallback(() => {
    const video = getVideoElement();
    const canvas = canvasRef.current;
    if (!canvas || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    // Draw mirrored video
    ctx.save();
    ctx.translate(PREVIEW_W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, PREVIEW_W, PREVIEW_H);
    ctx.restore();

    // Draw hand landmarks overlay
    const hands = getLatestHands();
    for (const hand of hands) {
      const lm = hand.landmarks;

      // Draw connections
      ctx.strokeStyle = 'rgba(124, 247, 198, 0.6)';
      ctx.lineWidth = 1.5;
      for (const [a, b] of CONNECTIONS) {
        // Mirror x: (1 - x) because video is flipped
        const ax = (1 - lm[a].x) * PREVIEW_W;
        const ay = lm[a].y * PREVIEW_H;
        const bx = (1 - lm[b].x) * PREVIEW_W;
        const by = lm[b].y * PREVIEW_H;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // Draw landmark dots
      ctx.fillStyle = '#7CF7C6';
      for (let i = 0; i < lm.length; i++) {
        const x = (1 - lm[i].x) * PREVIEW_W;
        const y = lm[i].y * PREVIEW_H;
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  useEffect(() => {
    if (gestureEnabled) {
      // Small delay to let video element initialize
      const timeout = setTimeout(() => {
        rafRef.current = requestAnimationFrame(drawLoop);
      }, 500);
      return () => {
        clearTimeout(timeout);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [gestureEnabled, drawLoop]);

  return (
    <AnimatePresence>
      {gestureEnabled && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{
            duration: DURATION_MS.uiSlide / 1000,
            ease: [...EASING.framerCinematic] as [number, number, number, number],
          }}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1rem',
            zIndex: 16,
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(124, 247, 198, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <canvas
            ref={canvasRef}
            width={PREVIEW_W}
            height={PREVIEW_H}
            style={{
              display: 'block',
              width: PREVIEW_W,
              height: PREVIEW_H,
              background: '#0B1020',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 8,
              fontSize: '0.6rem',
              fontWeight: 600,
              color: 'var(--accent)',
              letterSpacing: '0.06em',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            }}
          >
            CAMERA
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
