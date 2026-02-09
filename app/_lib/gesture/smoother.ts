import type { GestureKind, GestureState } from './config';
import { EMPTY_GESTURE } from './config';
import { INPUT } from '../motion';

export class GestureSmoother {
  private confirmedKind: GestureKind = 'none';
  private candidateKind: GestureKind = 'none';
  private candidateFrames = 0;
  private releaseFrames = 0;

  private smoothDx = 0;
  private smoothDy = 0;
  private smoothDz = 0;

  update(raw: GestureState): GestureState {
    // Acquisition: raw kind must match for N consecutive frames
    if (raw.kind !== 'none' && raw.kind !== this.confirmedKind) {
      if (raw.kind === this.candidateKind) {
        this.candidateFrames++;
      } else {
        this.candidateKind = raw.kind;
        this.candidateFrames = 1;
      }

      if (this.candidateFrames >= INPUT.stableFramesRequired) {
        // Transition: zero deltas to prevent jump
        this.confirmedKind = this.candidateKind;
        this.candidateKind = 'none';
        this.candidateFrames = 0;
        this.smoothDx = 0;
        this.smoothDy = 0;
        this.smoothDz = 0;
      }

      this.releaseFrames = 0;
    } else if (raw.kind === this.confirmedKind) {
      // Sustaining current gesture
      this.candidateKind = 'none';
      this.candidateFrames = 0;
      this.releaseFrames = 0;
    } else if (raw.kind === 'none' && this.confirmedKind !== 'none') {
      // Release: must be none for several frames before reverting
      this.releaseFrames++;
      // ~7 frames at 30fps ≈ 230ms, close to gestureRelease
      if (this.releaseFrames > 7) {
        this.confirmedKind = 'none';
        this.smoothDx = 0;
        this.smoothDy = 0;
        this.smoothDz = 0;
      }
    }

    // Apply EMA smoothing based on gesture kind
    if (this.confirmedKind === 'none') {
      return { ...EMPTY_GESTURE };
    }

    const alpha = this.getAlpha();

    // Only smooth if raw kind matches confirmed (otherwise zero)
    if (raw.kind === this.confirmedKind) {
      this.smoothDx = this.smoothDx * (1 - alpha) + raw.dx * alpha;
      this.smoothDy = this.smoothDy * (1 - alpha) + raw.dy * alpha;
      this.smoothDz = this.smoothDz * (1 - alpha) + raw.dz * alpha;
    }

    return {
      kind: this.confirmedKind,
      confidence: raw.confidence,
      dx: this.smoothDx,
      dy: this.smoothDy,
      dz: this.smoothDz,
    };
  }

  private getAlpha(): number {
    switch (this.confirmedKind) {
      case 'rotate':
        return INPUT.smoothingAlphaRotate;
      case 'pan':
        return INPUT.smoothingAlphaPan;
      case 'zoom':
        return INPUT.smoothingAlphaZoom;
      default:
        return 0.2;
    }
  }

  reset(): void {
    this.confirmedKind = 'none';
    this.candidateKind = 'none';
    this.candidateFrames = 0;
    this.releaseFrames = 0;
    this.smoothDx = 0;
    this.smoothDy = 0;
    this.smoothDz = 0;
  }
}
