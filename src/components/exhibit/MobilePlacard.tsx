'use client';

// =============================================================================
// MobilePlacard.tsx - Compact Specimen Info for Mobile Screens
// =============================================================================

import { useState } from 'react';
import { useExhibitStore } from '@/lib/store';
import { getSpecimenById } from '@/lib/registry';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';

export function MobilePlacard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);
  const dataMode = useExhibitStore((state) => state.dataMode);
  const specimen = selectedSpecimenId ? getSpecimenById(selectedSpecimenId) : null;

  if (!specimen) return null;

  const { stats } = specimen;

  // Format stats based on display mode
  const formatStat = (stat: { museum: string; scientific: [number, number] }, unit?: string) => {
    if (dataMode === 'museum') {
      return stat.museum;
    }
    const [min, max] = stat.scientific;
    return `${min}–${max}${unit || ''}`;
  };

  return (
    <div className="md:hidden fixed top-20 left-4 right-4 z-10">
      {/* Compact bar */}
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetTrigger asChild>
          <button
            className="w-full glass-strong rounded-xl p-3 flex items-center justify-between"
            aria-label="View specimen details"
            aria-expanded={isExpanded}
          >
            <div className="flex items-center gap-3">
              {/* Color indicator */}
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: specimen.presentation.color }}
                aria-hidden="true"
              />
              {/* Name */}
              <div className="text-left">
                <h2 className="font-display text-sm font-semibold text-foreground truncate max-w-[200px]">
                  {specimen.displayName}
                </h2>
                <p className="font-mono text-xs text-muted-foreground">
                  {specimen.taxonomyLabel}
                </p>
              </div>
            </div>

            {/* Toggle indicator */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4" />
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </div>
          </button>
        </SheetTrigger>

        <SheetContent
          side="top"
          className="glass-strong border-b border-border rounded-b-xl pt-20"
        >
          <SheetTitle className="sr-only">
            {specimen.displayName} Details
          </SheetTitle>

          <div className="space-y-4 pb-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: specimen.presentation.color }}
                  aria-hidden="true"
                />
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {dataMode === 'museum' ? 'Museum' : 'Scientific'} Data
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {specimen.displayName}
              </h2>
              <p className="font-mono text-sm text-muted-foreground italic">
                {specimen.taxonomyLabel}
              </p>
            </div>

            {/* Quick facts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-lg p-2">
                <span className="font-mono text-xs text-muted-foreground block">Length</span>
                <span
                  className={`font-body text-sm ${
                    dataMode === 'scientific' ? 'text-scientific' : 'text-foreground'
                  }`}
                >
                  {formatStat(stats.length, dataMode === 'scientific' ? ' m' : '')}
                </span>
              </div>
              <div className="glass rounded-lg p-2">
                <span className="font-mono text-xs text-muted-foreground block">Weight</span>
                <span
                  className={`font-body text-sm ${
                    dataMode === 'scientific' ? 'text-scientific' : 'text-foreground'
                  }`}
                >
                  {formatStat(stats.weight, dataMode === 'scientific' ? ' kg' : '')}
                </span>
              </div>
              <div className="glass rounded-lg p-2 col-span-2">
                <span className="font-mono text-xs text-muted-foreground block">Location</span>
                <span className="font-body text-sm text-foreground">{stats.location}</span>
              </div>
            </div>

            {/* Facts */}
            {specimen.content.facts.length > 0 && (
              <div>
                <h3 className="font-mono text-xs text-accent uppercase tracking-wider mb-2">
                  Did You Know?
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed pl-3 border-l-2 border-accent/30">
                  {specimen.content.facts[0]}
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
