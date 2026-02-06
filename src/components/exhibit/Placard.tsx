'use client';

// =============================================================================
// Placard.tsx - Cinematic Text Panels
// =============================================================================

import { motion, AnimatePresence } from 'framer-motion';
import type { SpecimenData } from '@/lib/types';
import { useExhibitStore } from '@/lib/store';

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------

const placardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, staggerChildren: 0.1 }
  },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
} as const;

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 25 } }
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PlacardProps {
  specimen: SpecimenData;
}

// -----------------------------------------------------------------------------
// Stats Display
// -----------------------------------------------------------------------------

function StatsDisplay({ specimen }: PlacardProps) {
  const dataMode = useExhibitStore((state) => state.dataMode);
  const { stats } = specimen;

  const formatValue = (stat: { museum: string; scientific: [number, number] }) => {
    if (dataMode === 'museum') {
      return stat.museum;
    }
    const [min, max] = stat.scientific;
    return `${min}–${max}`;
  };

  const formatUnit = (type: 'length' | 'weight') => {
    if (dataMode === 'museum') return '';
    return type === 'length' ? ' m' : ' kg';
  };

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div className="stat-item">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Length
        </span>
        <span
          className={`font-display text-2xl ${
            dataMode === 'scientific' ? 'text-scientific' : 'text-foreground'
          }`}
        >
          {formatValue(stats.length)}
          <span className="text-sm">{formatUnit('length')}</span>
        </span>
      </div>

      <div className="stat-item">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Weight
        </span>
        <span
          className={`font-display text-2xl ${
            dataMode === 'scientific' ? 'text-scientific' : 'text-foreground'
          }`}
        >
          {formatValue(stats.weight)}
          <span className="text-sm">{formatUnit('weight')}</span>
        </span>
      </div>

      <div className="stat-item col-span-2">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Location
        </span>
        <span className="font-body text-sm text-foreground">{stats.location}</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Facts Section
// -----------------------------------------------------------------------------

function FactsSection({ specimen }: PlacardProps) {
  return (
    <div className="mt-6">
      <h3 className="font-mono text-xs text-accent uppercase tracking-wider mb-3">
        Did You Know?
      </h3>
      <motion.ul
        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
        className="space-y-2"
      >
        {specimen.content.facts.slice(0, 3).map((fact, i) => (
          <motion.li
            key={i}
            variants={itemVariants}
            className="font-body text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-accent/30"
          >
            {fact}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Myths Section
// -----------------------------------------------------------------------------

function MythsSection({ specimen }: PlacardProps) {
  if (specimen.content.myths.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="font-mono text-xs text-laser uppercase tracking-wider mb-3">
        Myth Busters
      </h3>
      <ul className="space-y-2">
        {specimen.content.myths.slice(0, 2).map((myth, i) => (
          <li
            key={i}
            className="font-body text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-laser/30"
          >
            {myth}
          </li>
        ))}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Placard Export
// -----------------------------------------------------------------------------

export function Placard({ specimen }: PlacardProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={specimen.id}
        className="glass-strong rounded-xl p-6 max-w-sm w-full"
        variants={placardVariants}
        initial="hidden"
        animate="show"
        exit="exit"
      >
        {/* Header */}
        <div className="border-b border-border pb-4">
          <h1
            className="font-display text-3xl font-bold tracking-tight"
            style={{ color: specimen.presentation.color }}
          >
            {specimen.displayName}
          </h1>
          <p className="font-mono text-sm text-muted-foreground mt-1 italic">
            {specimen.taxonomyLabel}
          </p>
        </div>

        {/* Stats */}
        <StatsDisplay specimen={specimen} />

        {/* Facts */}
        <FactsSection specimen={specimen} />

        {/* Myths */}
        <MythsSection specimen={specimen} />

        {/* Sources indicator */}
        <div className="mt-6 pt-4 border-t border-border">
          <span className="font-mono text-xs text-muted-foreground">
            {specimen.content.sources.length} sources cited
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
