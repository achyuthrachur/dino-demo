import type { Metadata } from 'next';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Infinite Mesozoic | Digital Museum',
  description:
    'A cinematic, interactive 3D digital museum exhibit featuring high-fidelity dinosaur specimens',
  keywords: ['dinosaur', 'museum', '3D', 'paleontology', 'interactive exhibit'],
  openGraph: {
    title: 'Infinite Mesozoic | Digital Museum',
    description: 'Interactive 3D dinosaur exhibit',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider delayDuration={300}>
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              classNames: {
                toast: 'glass-strong',
                title: 'font-display',
                description: 'font-body text-muted-foreground',
              },
            }}
          />
        </TooltipProvider>
      </body>
    </html>
  );
}
