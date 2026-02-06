'use client';

// =============================================================================
// SpecimenSelector.tsx - T-Rex Controls (Simplified)
// =============================================================================

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Main Specimen Selector Export (T-Rex Only)
// -----------------------------------------------------------------------------

export function SpecimenSelector() {
  const router = useRouter();

  return (
    <motion.section
      className="glass-strong rounded-xl p-6 space-y-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      aria-label="T-Rex controls"
    >
      {/* T-Rex Info */}
      <div className="text-center space-y-2">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-3"
          style={{
            background: 'linear-gradient(135deg, #84cc16 0%, #65a30d 100%)',
            boxShadow: '0 0 20px rgba(132, 204, 22, 0.3)',
          }}
        >
          <span className="font-display text-4xl font-bold text-background">
            T
          </span>
        </div>

        <h3 className="font-display text-xl font-bold text-foreground">
          Tyrannosaurus Rex
        </h3>

        <p className="font-mono text-xs text-muted-foreground">
          The Ultimate Predator
        </p>
      </div>

      {/* Story Mode Button */}
      <Button
        variant="default"
        size="lg"
        className={cn(
          "w-full bg-gradient-to-r from-scientific to-accent",
          "hover:shadow-lg hover:shadow-scientific/30",
          "transition-all duration-300",
          "font-display text-base"
        )}
        onClick={() => router.push('/story')}
      >
        <BookOpen className="h-5 w-5 mr-2" />
        Story Mode
      </Button>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 pt-2">
        <div className="glass rounded-lg p-3 text-center">
          <div className="font-mono text-xs text-muted-foreground">Length</div>
          <div className="font-display text-lg font-bold" style={{ color: '#84cc16' }}>
            40 ft
          </div>
        </div>
        <div className="glass rounded-lg p-3 text-center">
          <div className="font-mono text-xs text-muted-foreground">Weight</div>
          <div className="font-display text-lg font-bold" style={{ color: '#84cc16' }}>
            9 tons
          </div>
        </div>
      </div>
    </motion.section>
  );
}
