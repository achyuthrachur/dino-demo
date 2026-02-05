// =============================================================================
// Dino Demo - TypeScript Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Enum-like Union Types
// -----------------------------------------------------------------------------

/** Confidence level for fossil specimen data accuracy */
export type ConfidenceLevel = 'certain' | 'likely' | 'debated';

/** Classification of dinosaur body type */
export type SpecimenType = 'theropod' | 'sauropod';

/** 3D viewer rendering modes */
export type ScanMode = 'skeleton' | 'skin' | 'xray';

/** Information display mode */
export type DataMode = 'museum' | 'scientific';

/** Taxonomic grouping for dinosaurs */
export type DinosaurGroup = 'raptor' | 'tyrannosaur';

// -----------------------------------------------------------------------------
// Data Structures
// -----------------------------------------------------------------------------

/** Statistical measurements for a specimen with dual display modes */
export interface SpecimenStats {
  /** Length measurement - museum-friendly string and scientific range in meters */
  length: { museum: string; scientific: [number, number] };
  /** Weight measurement - museum-friendly string and scientific range in kg */
  weight: { museum: string; scientific: [number, number] };
  /** Geographic discovery location */
  location: string;
}

/** Metadata for an individual bone in a 3D model */
export interface BoneMetadata {
  /** Matches node name in GLB file */
  meshName: string;
  /** Human-readable bone label */
  label: string;
  /** Educational description of the bone */
  description: string;
  /** Vector3 position for label line anchor point */
  anchor: [number, number, number];
  /** Direction vector for explode animation */
  explodeVector: [number, number, number];
  /** Data confidence level for this bone */
  confidence: ConfidenceLevel;
}

/** Citation for scientific or educational sources */
export interface SourceCitation {
  /** Title of the source material */
  title: string;
  /** Author name(s) */
  author?: string;
  /** URL to the source */
  url?: string;
  /** Publication year */
  year?: number;
  /** License type (e.g., CC BY 4.0) */
  license: string;
}

/** Variant version of a specimen (e.g., juvenile, adult) */
export interface SpecimenVariant {
  /** Display label for the variant (e.g., "Juvenile", "Adult") */
  label: string;
  /** URL to the variant's GLB model */
  modelOverride: string;
  /** Stats specific to this variant */
  stats: SpecimenStats;
}

/** Camera position presets for different viewing angles */
export interface CameraPositions {
  /** Default idle camera position */
  idle: [number, number, number];
  /** Camera position focused on head */
  head: [number, number, number];
  /** Optional camera position focused on claw */
  claw?: [number, number, number];
}

/** Visual presentation settings for a specimen */
export interface SpecimenPresentation {
  /** Hex color for UI accent elements */
  color: string;
  /** Scale normalization factor for the 3D model */
  scale: number;
  /** Camera position presets */
  camera: CameraPositions;
}

/** 3D model file references for a specimen */
export interface SpecimenModels {
  /** URL to skeleton GLB file */
  skeleton: string;
  /** Optional URL to skin mesh GLB file */
  skin?: string;
  /** Optional URL to fossil rock encasing GLB file */
  fossil?: string;
}

/** Educational content for a specimen */
export interface SpecimenContent {
  /** Array of educational facts */
  facts: string[];
  /** Array of common myths to debunk */
  myths: string[];
  /** Academic and educational source citations */
  sources: SourceCitation[];
}

/** Complete data structure for a dinosaur specimen */
export interface SpecimenData {
  /** Unique identifier for the specimen */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** Scientific taxonomy label */
  taxonomyLabel: string;
  /** Taxonomic group classification */
  group: DinosaurGroup;
  /** 3D model file references */
  models: SpecimenModels;
  /** Optional variant versions of this specimen */
  variants?: SpecimenVariant[];
  /** Physical measurements and location */
  stats: SpecimenStats;
  /** Visual presentation settings */
  presentation: SpecimenPresentation;
  /** Individual bone metadata for interactive features */
  bones: BoneMetadata[];
  /** Educational content */
  content: SpecimenContent;
}
