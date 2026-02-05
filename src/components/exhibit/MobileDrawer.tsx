'use client';

// =============================================================================
// MobileDrawer.tsx - Mobile-friendly Drawer for Sidebar Content
// =============================================================================

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { SpecimenSelector } from './SpecimenSelector';
import { useExhibitStore } from '@/lib/store';
import { ArrowLeftRight } from 'lucide-react';

// -----------------------------------------------------------------------------
// Mobile Menu Button
// -----------------------------------------------------------------------------

export function MobileMenuButton() {
  const [isOpen, setIsOpen] = useState(false);
  const openCompareDrawer = useExhibitStore((state) => state.openCompareDrawer);

  // Close drawer when screen becomes large
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="md:hidden glass fixed top-4 right-4 z-30"
          aria-label="Open specimen menu"
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[300px] sm:w-[350px] glass-strong border-l border-border p-0"
      >
        <SheetTitle className="sr-only">Specimen Selection Menu</SheetTitle>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg font-semibold">Select Specimen</h2>
            <p className="font-mono text-xs text-muted-foreground mt-1">
              Choose a dinosaur to explore
            </p>
          </div>

          {/* Specimen selector */}
          <div className="flex-1 overflow-auto p-4">
            <SpecimenSelector />
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-border space-y-3">
            <Button
              variant="outline"
              className="w-full glass"
              onClick={() => {
                openCompareDrawer('deinonychus-antirrhopus');
                setIsOpen(false);
              }}
              aria-label="Compare specimen sizes"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" aria-hidden="true" />
              Compare Sizes
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// -----------------------------------------------------------------------------
// Mobile Controls Drawer (for expanded controls on small screens)
// -----------------------------------------------------------------------------

interface MobileControlsDrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
}

export function MobileControlsDrawer({
  children,
  isOpen,
  onClose,
}: MobileControlsDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className="glass-strong border-t border-border rounded-t-xl max-h-[70vh]"
      >
        <SheetTitle className="sr-only">Exhibit Controls</SheetTitle>
        <div className="space-y-4 py-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
