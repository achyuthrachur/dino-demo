'use client';

// =============================================================================
// CompareDrawer.tsx - Slide-out Comparison Panel
// =============================================================================

import { useMemo } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X, ArrowLeftRight } from 'lucide-react';
import { useExhibitStore } from '@/lib/store';
import { getSpecimenById, SPECIMENS } from '@/lib/registry';
import type { SpecimenData } from '@/lib/types';

// -----------------------------------------------------------------------------
// Silhouette Visualization
// -----------------------------------------------------------------------------

interface SilhouetteProps {
  specimen: SpecimenData;
  maxLength: number;
}

function Silhouette({ specimen, maxLength }: SilhouetteProps) {
  const [minLen, maxLen] = specimen.stats.length.scientific;
  const avgLength = (minLen + maxLen) / 2;
  const widthPercent = (avgLength / maxLength) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Silhouette bar */}
      <div
        className="h-8 rounded-full transition-all duration-500"
        style={{
          width: `${Math.max(widthPercent, 10)}%`,
          backgroundColor: specimen.presentation.color,
          opacity: 0.8,
        }}
      />

      {/* Name */}
      <span className="font-display text-sm" style={{ color: specimen.presentation.color }}>
        {specimen.displayName}
      </span>

      {/* Length */}
      <span className="font-mono text-xs text-muted-foreground">
        {avgLength.toFixed(1)} m
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Comparison Stats Table
// -----------------------------------------------------------------------------

interface ComparisonTableProps {
  current: SpecimenData;
  target: SpecimenData;
}

function ComparisonTable({ current, target }: ComparisonTableProps) {
  const stats = [
    {
      label: 'Length',
      current: current.stats.length.scientific,
      target: target.stats.length.scientific,
      unit: 'm',
    },
    {
      label: 'Weight',
      current: current.stats.weight.scientific,
      target: target.stats.weight.scientific,
      unit: 'kg',
    },
  ];

  return (
    <div className="mt-6">
      <table className="w-full">
        <thead>
          <tr className="text-xs font-mono text-muted-foreground uppercase">
            <th className="text-left pb-2">Stat</th>
            <th className="text-center pb-2" style={{ color: current.presentation.color }}>
              {current.displayName}
            </th>
            <th className="text-center pb-2" style={{ color: target.presentation.color }}>
              {target.displayName}
            </th>
          </tr>
        </thead>
        <tbody>
          {stats.map((stat) => {
            const currentAvg = (stat.current[0] + stat.current[1]) / 2;
            const targetAvg = (stat.target[0] + stat.target[1]) / 2;
            const diff = ((targetAvg - currentAvg) / currentAvg) * 100;

            return (
              <tr key={stat.label} className="border-t border-border">
                <td className="py-3 font-body text-sm text-foreground">{stat.label}</td>
                <td className="py-3 text-center">
                  <span className="font-mono text-sm">
                    {stat.current[0]}–{stat.current[1]} {stat.unit}
                  </span>
                </td>
                <td className="py-3 text-center">
                  <span className="font-mono text-sm">
                    {stat.target[0]}–{stat.target[1]} {stat.unit}
                  </span>
                  <span
                    className={`ml-2 text-xs ${
                      diff > 0 ? 'text-scientific' : 'text-laser'
                    }`}
                  >
                    {diff > 0 ? '+' : ''}
                    {diff.toFixed(0)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Specimen Picker
// -----------------------------------------------------------------------------

interface SpecimenPickerProps {
  currentId: string;
  onSelect: (id: string) => void;
}

function SpecimenPicker({ currentId, onSelect }: SpecimenPickerProps) {
  const availableSpecimens = SPECIMENS.filter((s) => s.id !== currentId);

  return (
    <div className="mt-6">
      <h4 className="font-mono text-xs text-muted-foreground uppercase mb-3">
        Compare with:
      </h4>
      <div className="flex flex-wrap gap-2">
        {availableSpecimens.map((specimen) => (
          <Button
            key={specimen.id}
            variant="outline"
            size="sm"
            onClick={() => onSelect(specimen.id)}
            className="glass"
          >
            <span
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: specimen.presentation.color }}
            />
            {specimen.displayName}
          </Button>
        ))}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Compare Drawer Export
// -----------------------------------------------------------------------------

export function CompareDrawer() {
  const isOpen = useExhibitStore((state) => state.isCompareDrawerOpen);
  const compareTargetId = useExhibitStore((state) => state.compareTargetId);
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);
  const closeCompareDrawer = useExhibitStore((state) => state.closeCompareDrawer);
  const openCompareDrawer = useExhibitStore((state) => state.openCompareDrawer);

  const currentSpecimen = selectedSpecimenId ? getSpecimenById(selectedSpecimenId) : null;
  const targetSpecimen = compareTargetId ? getSpecimenById(compareTargetId) : null;

  // Calculate max length for scaling silhouettes
  const maxLength = useMemo(() => {
    return Math.max(...SPECIMENS.map((s) => s.stats.length.scientific[1]));
  }, []);

  const handleSelectTarget = (id: string) => {
    openCompareDrawer(id);
  };

  if (!currentSpecimen) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeCompareDrawer()}>
      <DrawerContent className="glass-strong max-h-[85vh]">
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader className="flex items-center justify-between">
            <div>
              <DrawerTitle className="font-display text-xl flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-accent" />
                Size Comparison
              </DrawerTitle>
              <DrawerDescription className="font-mono text-xs">
                Compare dinosaur specimens side by side
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <div className="p-6">
            {/* Silhouette comparison */}
            <div className="bg-card/50 rounded-lg p-6">
              <div className="space-y-4">
                <Silhouette specimen={currentSpecimen} maxLength={maxLength} />
                {targetSpecimen && (
                  <Silhouette specimen={targetSpecimen} maxLength={maxLength} />
                )}
              </div>
            </div>

            {/* Stats table */}
            {targetSpecimen && (
              <ComparisonTable current={currentSpecimen} target={targetSpecimen} />
            )}

            {/* Specimen picker */}
            <SpecimenPicker
              currentId={currentSpecimen.id}
              onSelect={handleSelectTarget}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
