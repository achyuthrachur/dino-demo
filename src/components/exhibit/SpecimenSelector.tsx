'use client';

// =============================================================================
// SpecimenSelector.tsx - Specimen Carousel/Tabs (with Accessibility)
// =============================================================================

import { useEffect, useRef, useCallback, memo } from 'react';
import { animate, stagger, createScope } from 'animejs';
import { useExhibitStore } from '@/lib/store';
import { RAPTORS, getSpecimenById } from '@/lib/registry';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { SpecimenData } from '@/lib/types';

// -----------------------------------------------------------------------------
// Specimen Card (Memoized)
// -----------------------------------------------------------------------------

interface SpecimenCardProps {
  specimen: SpecimenData;
  isSelected: boolean;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  index?: number;
  total?: number;
}

const SpecimenCard = memo(function SpecimenCard({
  specimen,
  isSelected,
  onClick,
  onKeyDown,
  index,
  total,
}: SpecimenCardProps) {
  return (
    <button
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'specimen-card relative flex flex-col items-center p-3 rounded-lg transition-all duration-300',
        'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isSelected
          ? 'glass-strong ring-2 ring-accent'
          : 'glass hover:glass-strong'
      )}
      aria-label={`${specimen.displayName} specimen`}
      aria-pressed={isSelected}
      aria-describedby={`specimen-desc-${specimen.id}`}
      role="option"
      aria-selected={isSelected}
      aria-posinset={index !== undefined ? index + 1 : undefined}
      aria-setsize={total}
    >
      {/* Specimen icon placeholder */}
      <div
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors',
          isSelected ? 'bg-accent/20' : 'bg-muted/20'
        )}
        style={{
          borderColor: specimen.presentation.color,
          borderWidth: isSelected ? 2 : 1,
        }}
        aria-hidden="true"
      >
        <span
          className="font-display text-lg font-bold"
          style={{ color: specimen.presentation.color }}
        >
          {specimen.displayName.charAt(0)}
        </span>
      </div>

      {/* Name */}
      <span
        id={`specimen-desc-${specimen.id}`}
        className={cn(
          'font-body text-xs text-center transition-colors',
          isSelected ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {specimen.displayName}
      </span>

      {/* Selection indicator */}
      {isSelected && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
          style={{ backgroundColor: specimen.presentation.color }}
          aria-hidden="true"
        />
      )}
    </button>
  );
});

// -----------------------------------------------------------------------------
// Raptor Carousel
// -----------------------------------------------------------------------------

function RaptorCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);
  const setSelectedSpecimen = useExhibitStore((state) => state.setSelectedSpecimen);
  const prefersReducedMotion = useReducedMotion();

  // Entrance animation
  useEffect(() => {
    if (!carouselRef.current || prefersReducedMotion) return;

    const scope = createScope({ root: carouselRef.current }).add(() => {
      animate('.specimen-card', {
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 400,
        delay: stagger(80, { from: 'first' }),
        ease: 'outQuint',
      });
    });

    return () => scope.revert();
  }, [prefersReducedMotion]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, currentIndex: number) => {
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          newIndex = (currentIndex + 1) % RAPTORS.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          newIndex = (currentIndex - 1 + RAPTORS.length) % RAPTORS.length;
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = RAPTORS.length - 1;
          break;
        default:
          return;
      }

      const newSpecimen = RAPTORS[newIndex];
      setSelectedSpecimen(newSpecimen.id);

      // Focus the new card
      const cards = carouselRef.current?.querySelectorAll('.specimen-card');
      if (cards && cards[newIndex]) {
        (cards[newIndex] as HTMLElement).focus();
      }
    },
    [setSelectedSpecimen]
  );

  const currentIndex = RAPTORS.findIndex((s) => s.id === selectedSpecimenId);

  return (
    <div
      ref={carouselRef}
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      role="listbox"
      aria-label="Raptor specimens"
      aria-activedescendant={selectedSpecimenId ? `specimen-${selectedSpecimenId}` : undefined}
    >
      {RAPTORS.map((specimen, index) => (
        <SpecimenCard
          key={specimen.id}
          specimen={specimen}
          isSelected={selectedSpecimenId === specimen.id}
          onClick={() => setSelectedSpecimen(specimen.id)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          index={index}
          total={RAPTORS.length}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// T-Rex Section
// -----------------------------------------------------------------------------

function TRexSection() {
  const selectedSpecimenId = useExhibitStore((state) => state.selectedSpecimenId);
  const setSelectedSpecimen = useExhibitStore((state) => state.setSelectedSpecimen);
  const trex = getSpecimenById('tyrannosaurus-rex');

  if (!trex) return null;

  return (
    <div
      className="flex justify-center"
      role="listbox"
      aria-label="T-Rex specimen"
    >
      <SpecimenCard
        specimen={trex}
        isSelected={selectedSpecimenId === trex.id}
        onClick={() => setSelectedSpecimen(trex.id)}
        index={0}
        total={1}
      />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Specimen Selector Export
// -----------------------------------------------------------------------------

export function SpecimenSelector() {
  const activeTab = useExhibitStore((state) => state.activeTab);
  const setActiveTab = useExhibitStore((state) => state.setActiveTab);
  const setSelectedSpecimen = useExhibitStore((state) => state.setSelectedSpecimen);

  // Update selected specimen when tab changes
  const handleTabChange = (value: string) => {
    const tab = value as 'raptors' | 'trex';
    setActiveTab(tab);

    // Set default specimen for the tab
    if (tab === 'raptors') {
      setSelectedSpecimen('velociraptor-mongoliensis');
    } else {
      setSelectedSpecimen('tyrannosaurus-rex');
    }
  };

  return (
    <section
      className="glass-strong rounded-xl p-4"
      aria-label="Specimen selection"
    >
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="glass w-full mb-4" aria-label="Specimen categories">
          <TabsTrigger
            value="raptors"
            className="flex-1"
            aria-label="View raptor specimens"
          >
            <span className="font-display">Raptors</span>
          </TabsTrigger>
          <TabsTrigger
            value="trex"
            className="flex-1"
            aria-label="View T-Rex specimen"
          >
            <span className="font-display">T. Rex</span>
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <div className="min-h-[100px]" role="region" aria-live="polite">
          {activeTab === 'raptors' ? <RaptorCarousel /> : <TRexSection />}
        </div>
      </Tabs>

      {/* Tab descriptions */}
      <p
        className="font-mono text-xs text-muted-foreground mt-3 text-center"
        aria-live="polite"
      >
        {activeTab === 'raptors'
          ? 'The Evolution of Feathers'
          : 'The Ultimate Predator'}
      </p>

      {/* Screen reader instructions */}
      <p className="sr-only">
        Use arrow keys to navigate between specimens. Press Enter or Space to select.
      </p>
    </section>
  );
}
