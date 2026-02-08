'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useDirector } from '../_lib/director';
import { useStore } from '../_lib/store';
import { CHAPTERS } from '../_lib/tour';
import { projectedAnchor } from '../_lib/boneProjection';
import { DURATION_MS } from '../_lib/motion';

const ACCENT = '#7CF7C6';
const TRUNK_WIDTH = 1.5;
const BRANCH_WIDTH = 1;
const TRUNK_OPACITY = 0.7;
const BRANCH_OPACITY = 0.5;
const DOT_RADIUS = 4;
const JUNCTION_GAP = 20; // px gap between panel left edge and spine

/**
 * Fullscreen SVG overlay that draws animated leader lines from a projected
 * skeleton bone to the FactsPanel bullet dots — museum callout style.
 */
export function AnnotationLines() {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafId = useRef(0);
  const animFrameId = useRef(0);
  const prevChapter = useRef(-1);
  const isAnimating = useRef(false);

  // Subscribe to director for chapter changes
  const activeChapter = useDirector((s) => s.activeChapter);
  const phase = useDirector((s) => s.phase);
  const mode = useStore((s) => s.mode);

  const chapter = activeChapter >= 0 ? CHAPTERS[activeChapter] : null;
  const shouldShow = mode === 'skeleton' && phase === 'touring' && !!chapter?.anchorBone;

  // Build SVG paths from bone projection to fact bullets
  const updatePaths = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    if (!projectedAnchor.visible) {
      // Hide all paths when anchor not visible
      const paths = svg.querySelectorAll('.leader-trunk, .leader-branch');
      paths.forEach((p) => (p as SVGElement).setAttribute('opacity', '0'));
      const dot = svg.querySelector('.leader-dot') as SVGElement;
      if (dot) dot.setAttribute('opacity', '0');
      return;
    }

    const bx = projectedAnchor.x;
    const by = projectedAnchor.y;

    // Find fact panel bullet dots
    const bullets = document.querySelectorAll('.fact-line .bullet-dot');
    if (bullets.length === 0) return;

    // Get bullet positions
    const bulletPositions: { cx: number; cy: number }[] = [];
    bullets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      bulletPositions.push({
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      });
    });

    if (bulletPositions.length === 0) return;

    // Find panel left edge for junction point
    const panel = document.querySelector('.glass-panel') as HTMLElement;
    if (!panel) return;
    const panelRect = panel.getBoundingClientRect();
    const junctionX = panelRect.left - JUNCTION_GAP;

    // Spine Y range: first bullet Y to last bullet Y
    const firstY = bulletPositions[0].cy;
    const lastY = bulletPositions[bulletPositions.length - 1].cy;

    // Update trunk path: bone → junction at bone's Y level → vertical spine
    const trunk = svg.querySelector('.leader-trunk') as SVGPathElement;
    if (trunk) {
      // Trunk: horizontal from bone to junction X, then vertical to span all bullets
      const d = `M ${bx} ${by} L ${junctionX} ${by} L ${junctionX} ${firstY} L ${junctionX} ${lastY}`;
      trunk.setAttribute('d', d);
    }

    // Update branch paths: horizontal from spine to each bullet
    bulletPositions.forEach((bp, i) => {
      const branch = svg.querySelector(`.leader-branch-${i}`) as SVGPathElement;
      if (branch) {
        const d = `M ${junctionX} ${bp.cy} L ${bp.cx} ${bp.cy}`;
        branch.setAttribute('d', d);
      }
    });

    // Update dot position
    const dot = svg.querySelector('.leader-dot') as SVGCircleElement;
    if (dot) {
      dot.setAttribute('cx', String(bx));
      dot.setAttribute('cy', String(by));
    }
  }, []);

  // rAF loop for real-time tracking
  useEffect(() => {
    if (!shouldShow) {
      // Clear SVG when hidden
      if (svgRef.current) {
        svgRef.current.innerHTML = '';
      }
      prevChapter.current = -1;
      return;
    }

    let running = true;

    const loop = () => {
      if (!running) return;
      if (!isAnimating.current) {
        updatePaths();
      }
      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafId.current);
    };
  }, [shouldShow, updatePaths]);

  // Animate entrance when chapter changes
  useEffect(() => {
    if (!shouldShow) return;
    if (activeChapter === prevChapter.current) return;

    prevChapter.current = activeChapter;

    // Small delay for DOM to settle (facts panel renders)
    const settleTimer = window.setTimeout(() => {
      buildAndAnimate();
    }, 100);

    return () => {
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(animFrameId.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, activeChapter]);

  const buildAndAnimate = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear previous SVG content
    svg.innerHTML = '';

    // Count bullets currently in DOM
    const bullets = document.querySelectorAll('.fact-line .bullet-dot');
    const count = bullets.length;
    if (count === 0) return;

    // SVG glow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
    filter.setAttribute('id', 'leader-glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'blur');

    const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
    const mergeBlur = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeBlur.setAttribute('in', 'blur');
    const mergeOrig = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
    mergeOrig.setAttribute('in', 'SourceGraphic');

    merge.appendChild(mergeBlur);
    merge.appendChild(mergeOrig);
    filter.appendChild(blur);
    filter.appendChild(merge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // Create trunk path
    const trunk = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    trunk.classList.add('leader-trunk');
    trunk.setAttribute('fill', 'none');
    trunk.setAttribute('stroke', ACCENT);
    trunk.setAttribute('stroke-width', String(TRUNK_WIDTH));
    trunk.setAttribute('opacity', String(TRUNK_OPACITY));
    trunk.setAttribute('filter', 'url(#leader-glow)');
    trunk.setAttribute('stroke-linecap', 'round');
    trunk.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(trunk);

    // Create branch paths
    for (let i = 0; i < count; i++) {
      const branch = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      branch.classList.add(`leader-branch-${i}`, 'leader-branch');
      branch.setAttribute('fill', 'none');
      branch.setAttribute('stroke', ACCENT);
      branch.setAttribute('stroke-width', String(BRANCH_WIDTH));
      branch.setAttribute('opacity', String(BRANCH_OPACITY));
      branch.setAttribute('filter', 'url(#leader-glow)');
      branch.setAttribute('stroke-linecap', 'round');
      svg.appendChild(branch);
    }

    // Create anchor dot
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.classList.add('leader-dot');
    dot.setAttribute('r', String(DOT_RADIUS));
    dot.setAttribute('fill', ACCENT);
    dot.setAttribute('opacity', '0');
    dot.setAttribute('filter', 'url(#leader-glow)');
    svg.appendChild(dot);

    // Set initial geometry so dash calculations work
    updatePaths();

    // Animate entrance
    animateEntrance(svg, count);
  }, [updatePaths]);

  const animateEntrance = useCallback((svg: SVGSVGElement, branchCount: number) => {
    isAnimating.current = true;

    const trunk = svg.querySelector('.leader-trunk') as SVGPathElement;
    const dot = svg.querySelector('.leader-dot') as SVGCircleElement;
    const branches: SVGPathElement[] = [];
    for (let i = 0; i < branchCount; i++) {
      const b = svg.querySelector(`.leader-branch-${i}`) as SVGPathElement;
      if (b) branches.push(b);
    }

    // -- Trunk draw-on --
    if (trunk) {
      const len = trunk.getTotalLength() || 500;
      trunk.style.strokeDasharray = String(len);
      trunk.style.strokeDashoffset = String(len);
      trunk.setAttribute('opacity', String(TRUNK_OPACITY));
    }

    // -- Branches hidden initially --
    branches.forEach((b) => {
      const bLen = b.getTotalLength() || 100;
      b.style.strokeDasharray = String(bLen);
      b.style.strokeDashoffset = String(bLen);
      b.setAttribute('opacity', String(BRANCH_OPACITY));
    });

    // -- Dot hidden initially --
    if (dot) {
      dot.setAttribute('opacity', '0');
      dot.setAttribute('r', '0');
    }

    const startTime = performance.now();
    const trunkDuration = DURATION_MS.leaderDraw;
    const branchStartFraction = 0.6; // branches start at 60% of trunk
    const branchStagger = DURATION_MS.leaderBranchStagger;
    const branchDraw = DURATION_MS.leaderBranchDraw;
    const dotDuration = DURATION_MS.leaderDotPulse;

    const animate = (now: number) => {
      const elapsed = now - startTime;

      // Update geometry every frame during animation too
      updatePaths();

      // Recalculate trunk length (may change as bone moves)
      if (trunk) {
        const len = trunk.getTotalLength() || 500;
        trunk.style.strokeDasharray = String(len);
        const trunkProgress = easeOut4(Math.min(1, elapsed / trunkDuration));
        trunk.style.strokeDashoffset = String(len * (1 - trunkProgress));
      }

      // Branches: staggered draw-on starting at 60% trunk
      const branchStartMs = trunkDuration * branchStartFraction;
      branches.forEach((b, i) => {
        const bStart = branchStartMs + i * branchStagger;
        const bElapsed = elapsed - bStart;
        if (bElapsed <= 0) return;
        const bLen = b.getTotalLength() || 100;
        b.style.strokeDasharray = String(bLen);
        const bProgress = easeOut4(Math.min(1, bElapsed / branchDraw));
        b.style.strokeDashoffset = String(bLen * (1 - bProgress));
      });

      // Dot: scale in at the start
      if (dot) {
        const dotProgress = easeOut4(Math.min(1, elapsed / dotDuration));
        dot.setAttribute('r', String(DOT_RADIUS * dotProgress));
        dot.setAttribute('opacity', String(dotProgress * 0.9));
      }

      // Check if all animations complete
      const lastBranchEnd = branchStartMs + (branches.length - 1) * branchStagger + branchDraw;
      const totalDuration = Math.max(trunkDuration, lastBranchEnd, dotDuration);

      if (elapsed < totalDuration) {
        animFrameId.current = requestAnimationFrame(animate);
      } else {
        isAnimating.current = false;
        // Remove dasharray so lines track cleanly
        if (trunk) {
          trunk.style.strokeDasharray = '';
          trunk.style.strokeDashoffset = '';
        }
        branches.forEach((b) => {
          b.style.strokeDasharray = '';
          b.style.strokeDashoffset = '';
        });
      }
    };

    animFrameId.current = requestAnimationFrame(animate);
  }, [updatePaths]);

  if (!shouldShow) return null;

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 14,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    />
  );
}

/** out(4) easing: fast start, smooth deceleration */
function easeOut4(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}
