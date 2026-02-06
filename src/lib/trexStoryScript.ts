// ---------------------------------------------------------------------------
// trexStoryScript.ts
// Chapter script for the 8-chapter T-Rex scroll tour.
// Each chapter maps to copy blocks, exhibit state targets, and animation cues.
// ---------------------------------------------------------------------------

export interface ChapterState {
  cameraTarget: 'idle' | 'head' | 'claw';
  scanMode: 'skeleton' | 'skin' | 'xray';
  explodeFactor: number;
}

export interface ChapterData {
  id: string;
  title: string;
  subtitle?: string;
  body: string[];
  /** Optional myth text (shows with glitch) */
  myth?: string;
  /** Optional correction (replaces myth) */
  correction?: string;
  /** Stat chips to display */
  stats?: Array<{ label: string; value: string; unit?: string }>;
  /** Source citations */
  sources?: Array<{ title: string; author?: string; year?: number; url?: string }>;
  /** CTA text */
  cta?: { label: string; href: string };
  /** Target exhibit state at this chapter */
  state: ChapterState;
  /** Animation hints */
  animation:
    | 'splitText'
    | 'staggerChips'
    | 'blurbCard'
    | 'mythGlitch'
    | 'drawable'
    | 'citations'
    | 'reassemble';
}

// ---------------------------------------------------------------------------
// Chapter definitions
// ---------------------------------------------------------------------------

export const TREX_CHAPTERS: ChapterData[] = [
  // Chapter 1 ---------------------------------------------------------------
  {
    id: 'boot',
    title: 'Tyrannosaurus Rex',
    subtitle: 'Tyrannosaurus rex',
    body: ['Digital Museum Exhibit', 'Scroll to explore the ultimate predator'],
    state: {
      cameraTarget: 'idle',
      scanMode: 'skeleton',
      explodeFactor: 0,
    },
    animation: 'splitText',
  },

  // Chapter 2 ---------------------------------------------------------------
  {
    id: 'scale',
    title: 'Built to Dominate',
    body: ['The largest terrestrial predator ever known.'],
    stats: [
      { label: 'Length', value: '40', unit: 'feet' },
      { label: 'Weight', value: '9', unit: 'tons' },
      { label: 'Location', value: 'Western North America' },
    ],
    state: {
      cameraTarget: 'idle',
      scanMode: 'skeleton',
      explodeFactor: 0,
    },
    animation: 'staggerChips',
  },

  // Chapter 3 ---------------------------------------------------------------
  {
    id: 'skull',
    title: 'Skull',
    subtitle: 'Vision + Teeth',
    body: [
      'The massive skull measured up to 1.5 meters long with 60 serrated teeth, some over 30 cm including the root.',
      'T. rex had forward-facing eyes providing excellent binocular vision and depth perception.',
    ],
    state: {
      cameraTarget: 'head',
      scanMode: 'skeleton',
      explodeFactor: 0.25,
    },
    animation: 'blurbCard',
  },

  // Chapter 4 ---------------------------------------------------------------
  {
    id: 'jaw',
    title: 'Lower Jaw',
    subtitle: 'Bite Force',
    body: [
      'Bite force estimates reach 12,800 pounds - the strongest bite of any terrestrial animal ever.',
    ],
    myth: 'T. rex could not see you if you stood still.',
    correction: 'T. rex had excellent vision comparable to modern eagles.',
    state: {
      cameraTarget: 'head',
      scanMode: 'xray',
      explodeFactor: 0.3,
    },
    animation: 'mythGlitch',
  },

  // Chapter 5 ---------------------------------------------------------------
  {
    id: 'forelimb',
    title: 'Right Forelimb',
    subtitle: 'Small but Powerful',
    body: [
      'Despite their small size, T. rex arms were muscular and could lift over 400 pounds each.',
      'Each arm could curl approximately 430 pounds.',
    ],
    myth: 'T. rex arms were useless.',
    correction: 'Each arm could curl approximately 430 pounds.',
    state: {
      cameraTarget: 'idle',
      scanMode: 'skeleton',
      explodeFactor: 0.45,
    },
    animation: 'blurbCard',
  },

  // Chapter 6 ---------------------------------------------------------------
  {
    id: 'femur',
    title: 'Right Femur',
    subtitle: 'Locomotion',
    body: [
      'The massive thigh bone indicates powerful leg muscles that could propel this predator at speeds up to 25 mph.',
      'Growth studies show T. rex gained up to 2 kg per day during its teenage growth spurt.',
    ],
    state: {
      cameraTarget: 'idle',
      scanMode: 'skeleton',
      explodeFactor: 0.55,
    },
    animation: 'drawable',
  },

  // Chapter 7 ---------------------------------------------------------------
  {
    id: 'sources',
    title: 'Provenance',
    subtitle: 'Sources & Citations',
    body: ['Scientific data from peer-reviewed research and museum collections.'],
    sources: [
      {
        title: 'Tyrannosaurus rex, the Tyrant King',
        author: 'Larson, P. & Carpenter, K.',
        year: 2008,
      },
      {
        title: 'Field Museum - SUE the T. rex',
        url: 'https://www.fieldmuseum.org/exhibitions/sue-t-rex',
      },
      {
        title: 'Estimating bite force in extinct animals',
        author: 'Bates, K.T. & Falkingham, P.L.',
        year: 2012,
      },
    ],
    state: {
      cameraTarget: 'idle',
      scanMode: 'skeleton',
      explodeFactor: 0.3,
    },
    animation: 'citations',
  },

  // Chapter 8 ---------------------------------------------------------------
  {
    id: 'reassemble',
    title: 'Continue Exploring',
    body: ['The T. rex awaits your command.'],
    cta: { label: 'Free Explore Mode', href: '/' },
    state: {
      cameraTarget: 'idle',
      scanMode: 'skeleton',
      explodeFactor: 0,
    },
    animation: 'reassemble',
  },
];
