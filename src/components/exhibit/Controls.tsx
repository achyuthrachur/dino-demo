'use client';

// =============================================================================
// Controls.tsx - Bottom Control Bar (with Accessibility)
// =============================================================================

import { memo } from 'react';
import { useExhibitStore } from '@/lib/store';
import { Slider } from '@/components/ui/slider';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bone,
  Scan,
  Zap,
  Eye,
  EyeOff,
  FlaskConical,
  Building2,
  Hand,
  Focus,
  Skull,
  Footprints,
} from 'lucide-react';
import type { ScanMode, DataMode } from '@/lib/types';

// -----------------------------------------------------------------------------
// Explode Slider (Memoized)
// -----------------------------------------------------------------------------

const ExplodeSlider = memo(function ExplodeSlider() {
  const explodeFactor = useExhibitStore((state) => state.explodeFactor);
  const setExplodeFactor = useExhibitStore((state) => state.setExplodeFactor);

  const percentage = Math.round(explodeFactor * 100);

  return (
    <div className="flex items-center gap-3" role="group" aria-label="Explode view control">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bone className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-mono hidden sm:inline">EXPLODE</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Explode view to separate bones</p>
        </TooltipContent>
      </Tooltip>

      <Slider
        value={[explodeFactor * 100]}
        onValueChange={([value]) => setExplodeFactor(value / 100)}
        max={100}
        step={1}
        className="w-24 sm:w-32"
        aria-label="Explode factor"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={`${percentage}% exploded`}
      />

      <span
        className="font-mono text-xs text-muted-foreground w-8"
        aria-live="polite"
        aria-atomic="true"
      >
        {percentage}%
      </span>
    </div>
  );
});

// -----------------------------------------------------------------------------
// Scan Mode Toggle (Memoized)
// -----------------------------------------------------------------------------

const ScanModeToggle = memo(function ScanModeToggle() {
  const scanMode = useExhibitStore((state) => state.scanMode);
  const setScanMode = useExhibitStore((state) => state.setScanMode);

  const modes: { value: ScanMode; icon: React.ReactNode; label: string }[] = [
    { value: 'skeleton', icon: <Bone className="h-4 w-4" />, label: 'Skeleton' },
    { value: 'skin', icon: <Scan className="h-4 w-4" />, label: 'Skin' },
    { value: 'xray', icon: <Zap className="h-4 w-4" />, label: 'X-Ray' },
  ];

  return (
    <ToggleGroup
      type="single"
      value={scanMode}
      onValueChange={(value) => value && setScanMode(value as ScanMode)}
      className="glass rounded-lg p-1"
      aria-label="View mode selection"
    >
      {modes.map((mode) => (
        <Tooltip key={mode.value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={mode.value}
              className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              aria-label={`${mode.label} view`}
            >
              <span aria-hidden="true">{mode.icon}</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>{mode.label} View</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
});

// -----------------------------------------------------------------------------
// Callouts Toggle (Memoized)
// -----------------------------------------------------------------------------

const CalloutsToggle = memo(function CalloutsToggle() {
  const showCallouts = useExhibitStore((state) => state.showCallouts);
  const toggleCallouts = useExhibitStore((state) => state.toggleCallouts);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          pressed={showCallouts}
          onPressedChange={toggleCallouts}
          className="glass"
          aria-label={showCallouts ? 'Hide bone labels' : 'Show bone labels'}
        >
          {showCallouts ? (
            <Eye className="h-4 w-4" aria-hidden="true" />
          ) : (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          )}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        <p>{showCallouts ? 'Hide' : 'Show'} Bone Labels</p>
      </TooltipContent>
    </Tooltip>
  );
});

// -----------------------------------------------------------------------------
// Data Mode Toggle (Memoized)
// -----------------------------------------------------------------------------

const DataModeToggle = memo(function DataModeToggle() {
  const dataMode = useExhibitStore((state) => state.dataMode);
  const setDataMode = useExhibitStore((state) => state.setDataMode);

  const modes: { value: DataMode; icon: React.ReactNode; label: string }[] = [
    { value: 'museum', icon: <Building2 className="h-4 w-4" />, label: 'Museum' },
    { value: 'scientific', icon: <FlaskConical className="h-4 w-4" />, label: 'Scientific' },
  ];

  return (
    <ToggleGroup
      type="single"
      value={dataMode}
      onValueChange={(value) => value && setDataMode(value as DataMode)}
      className="glass rounded-lg p-1"
      aria-label="Information display mode"
    >
      {modes.map((mode) => (
        <Tooltip key={mode.value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={mode.value}
              className={
                mode.value === 'scientific'
                  ? 'data-[state=on]:bg-scientific data-[state=on]:text-background'
                  : 'data-[state=on]:bg-accent data-[state=on]:text-accent-foreground'
              }
              aria-label={`${mode.label} information mode`}
            >
              <span aria-hidden="true">{mode.icon}</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>{mode.label} Mode</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
});

// -----------------------------------------------------------------------------
// Camera Presets (Memoized)
// -----------------------------------------------------------------------------

const CameraPresets = memo(function CameraPresets() {
  const cameraTarget = useExhibitStore((state) => state.cameraTarget);
  const setCameraTarget = useExhibitStore((state) => state.setCameraTarget);

  const presets: { value: 'idle' | 'head' | 'claw'; icon: React.ReactNode; label: string }[] = [
    { value: 'idle', icon: <Focus className="h-4 w-4" />, label: 'Overview' },
    { value: 'head', icon: <Skull className="h-4 w-4" />, label: 'Head' },
    { value: 'claw', icon: <Footprints className="h-4 w-4" />, label: 'Claw' },
  ];

  return (
    <ToggleGroup
      type="single"
      value={cameraTarget}
      onValueChange={(value) => value && setCameraTarget(value as 'idle' | 'head' | 'claw')}
      className="glass rounded-lg p-1"
      aria-label="Camera position presets"
    >
      {presets.map((preset) => (
        <Tooltip key={preset.value}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={preset.value}
              className="data-[state=on]:bg-accent data-[state=on]:text-accent-foreground"
              aria-label={`Focus on ${preset.label.toLowerCase()}`}
            >
              <span aria-hidden="true">{preset.icon}</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent>
            <p>{preset.label}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
});

// -----------------------------------------------------------------------------
// Presenter Mode Toggle (Memoized)
// -----------------------------------------------------------------------------

const PresenterToggle = memo(function PresenterToggle() {
  const presenterActive = useExhibitStore((state) => state.presenterActive);
  const setPresenterActive = useExhibitStore((state) => state.setPresenterActive);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={presenterActive ? 'default' : 'outline'}
          size="sm"
          onClick={() => setPresenterActive(!presenterActive)}
          className={presenterActive ? 'bg-accent text-accent-foreground glow-accent' : 'glass btn-neon-hover'}
          aria-label={presenterActive ? 'Disable gesture controls' : 'Enable gesture controls'}
          aria-pressed={presenterActive}
        >
          <Hand className="h-4 w-4 mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">Presenter</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Toggle gesture controls</p>
      </TooltipContent>
    </Tooltip>
  );
});

// -----------------------------------------------------------------------------
// Main Controls Export
// -----------------------------------------------------------------------------

export function Controls() {
  return (
    <nav
      className="glass-strong rounded-xl p-3 sm:p-4 border-t border-t-white/5"
      role="toolbar"
      aria-label="Exhibit controls"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Left section - View controls */}
        <div
          className="flex items-center gap-2 sm:gap-3"
          role="group"
          aria-label="View settings"
        >
          <ScanModeToggle />
          <CalloutsToggle />
        </div>

        {/* Center section - Explode slider */}
        <div className="flex items-center gap-3">
          <ExplodeSlider />
        </div>

        {/* Right section - Data mode and camera */}
        <div
          className="flex items-center gap-2 sm:gap-3"
          role="group"
          aria-label="Display and camera settings"
        >
          <CameraPresets />
          <DataModeToggle />
          <PresenterToggle />
        </div>
      </div>
    </nav>
  );
}
