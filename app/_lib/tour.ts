import { allWeights, chapterWeights } from './explodePresets';
import type { SegmentWeights } from './explodePresets';

export interface ChapterDef {
  id: string;
  title: string;
  /** Camera position [x, y, z] */
  cameraPos: [number, number, number];
  /** OrbitControls target [x, y, z] */
  cameraTarget: [number, number, number];
  /** Target explode progress (0..1) for this chapter */
  explodeAmount: number;
  /** Per-segment weights — which segments explode more/less */
  weights: SegmentWeights;
  /** Facts displayed in the FactsPanel */
  facts: string[];
  /** Skeleton bone name to anchor leader lines (omit = no lines) */
  anchorBone?: string;
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'overview',
    title: 'Full Skeleton',
    cameraPos: [8, 6, 14],
    cameraTarget: [2, 2, 0],
    explodeAmount: 0,
    weights: allWeights(1),
    facts: [
      'Tyrannosaurus rex lived 68-66 million years ago in western North America.',
      'An adult T-Rex could reach 12 meters (40 ft) in length.',
      'This skeleton contains over 300 individual bones.',
      'T-Rex is one of the best-understood dinosaurs thanks to over 50 discovered specimens.',
    ],
  },
  {
    id: 'skull',
    title: 'Skull & Jaws',
    cameraPos: [-2.6, 3.6, 7.1],
    cameraTarget: [3.9, 3.8, 7.1],
    explodeAmount: 0,
    weights: chapterWeights({ skull: 1, neck: 0.6 }),
    facts: [
      'T-Rex had a bite force of ~12,800 pounds — the strongest of any land animal ever.',
      'Its skull could measure up to 1.5 meters (5 ft) long.',
      'The brain was larger than most dinosaurs, with exceptional olfactory lobes for smell.',
      'Serrated teeth up to 30cm (12 inches) long could crush bone.',
    ],
    anchorBone: 'Cabeza_ArmatureRexy',
  },
  {
    id: 'arms',
    title: 'Arms & Claws',
    cameraPos: [6.9, 1.3, 5.6],
    cameraTarget: [1.6, 1.6, 3.0],
    explodeAmount: 0,
    weights: chapterWeights({ arm_l: 1, arm_r: 1, chest: 0.5 }),
    facts: [
      'T-Rex arms were about 1 meter (3.3 ft) long — tiny relative to its body.',
      'Each arm could curl roughly 200 kg (430 lb) — far from useless.',
      'Arms had only two functional clawed fingers per hand.',
      'Scientists debate their purpose: mating grip, prey stabilization, or getting up from prone.',
    ],
    anchorBone: 'Pecho_ArmatureRexy',
  },
  {
    id: 'legs_tail',
    title: 'Legs & Tail',
    cameraPos: [-4, 3, -12],
    cameraTarget: [1, 1, -2],
    explodeAmount: 0,
    weights: chapterWeights({ leg_l: 1, leg_r: 1, tail: 1, pelvis: 0.6 }),
    facts: [
      'T-Rex could reach estimated speeds of 17-25 mph (27-40 km/h).',
      'The massive tail (~40% of body length) served as a dynamic counterbalance.',
      'Leg bones were thick and robust, built for powerful but not agile movement.',
      'Footprints suggest a stride length of about 3.7 meters (12 ft).',
    ],
    anchorBone: 'Cola1_ArmatureRexy',
  },
  {
    id: 'reassembled',
    title: 'Reassembled',
    cameraPos: [8, 6, 14],
    cameraTarget: [2, 2, 0],
    explodeAmount: 0,
    weights: allWeights(1),
    facts: [
      'T-Rex likely had a lifespan of about 28-30 years.',
      'Growth studies show they gained ~2.1 kg (4.6 lb) per day during their teenage growth spurt.',
      'The most complete T-Rex skeleton, "Sue," is 90% complete and resides at the Field Museum in Chicago.',
      'T-Rex went extinct 66 million years ago in the Cretaceous-Paleogene extinction event.',
    ],
  },
];

/** Home camera position — matches Scene.tsx initial camera */
export const HOME_CAMERA = {
  position: [12, 4, 18] as [number, number, number],
  target: [2, 2, 0] as [number, number, number],
};
