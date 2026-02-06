// =============================================================================
// Dino Demo - Specimen Registry
// =============================================================================

import type { SpecimenData, DinosaurGroup } from './types';

// -----------------------------------------------------------------------------
// Specimen Data
// -----------------------------------------------------------------------------

const velociraptor: SpecimenData = {
  id: 'velociraptor-mongoliensis',
  displayName: 'Velociraptor',
  taxonomyLabel: 'Velociraptor mongoliensis',
  group: 'raptor',
  models: {
    skeleton: '/models/velociraptor-mongoliensis/skeleton.glb',
    skin: '/models/velociraptor-mongoliensis/skin.glb',
  },
  stats: {
    length: { museum: '6 feet', scientific: [1.5, 2.0] },
    weight: { museum: '33 lbs', scientific: [15, 20] },
    location: 'Mongolia, Gobi Desert',
  },
  presentation: {
    color: '#f59e0b',
    scale: 1.0,
    camera: {
      idle: [3, 2, 5],
      head: [1.5, 1.2, 2],
      claw: [0.5, 0.3, 1.5],
    },
  },
  bones: [
    {
      meshName: 'skull',
      label: 'Skull',
      description:
        'The narrow skull featured a long snout with serrated teeth and large eye sockets for excellent vision.',
      anchor: [0.8, 1.2, 0],
      explodeVector: [0.3, 0.5, 0],
      confidence: 'certain',
    },
    {
      meshName: 'sickle_claw_l',
      label: 'Sickle Claw (Left)',
      description:
        'The iconic 6.5 cm retractable claw on the second toe was likely used for pinning prey rather than slashing.',
      anchor: [-0.2, 0.15, 0.8],
      explodeVector: [-0.2, -0.3, 0.4],
      confidence: 'certain',
    },
    {
      meshName: 'sickle_claw_r',
      label: 'Sickle Claw (Right)',
      description:
        'The iconic 6.5 cm retractable claw on the second toe was likely used for pinning prey rather than slashing.',
      anchor: [-0.2, 0.15, -0.8],
      explodeVector: [-0.2, -0.3, -0.4],
      confidence: 'certain',
    },
    {
      meshName: 'tail_vertebrae',
      label: 'Tail Vertebrae',
      description:
        'Stiffened by long bony rods, the tail acted as a counterbalance during high-speed pursuits.',
      anchor: [-1.5, 0.8, 0],
      explodeVector: [-0.6, 0, 0],
      confidence: 'certain',
    },
  ],
  content: {
    facts: [
      'Velociraptor was about the size of a turkey, not the human-sized predator depicted in movies.',
      'Fossil evidence strongly suggests Velociraptor was covered in feathers, including quill knobs on its forearm bones.',
      'The famous "Fighting Dinosaurs" fossil preserves a Velociraptor locked in combat with a Protoceratops.',
      'Velociraptors hunted in the Late Cretaceous period, approximately 75-71 million years ago.',
    ],
    myths: [
      'Myth: Velociraptors were 6 feet tall. Reality: They stood only about 0.5 meters at the hip.',
      'Myth: Velociraptors could open doors. Reality: Their wrist anatomy would not have allowed the turning motion required.',
    ],
    sources: [
      {
        title: 'A new dromaeosaurid theropod from Ukhaa Tolgod',
        author: 'Norell, M.A. & Makovicky, P.J.',
        year: 1999,
        license: 'Academic',
      },
      {
        title: 'Feather Quill Knobs in the Dinosaur Velociraptor',
        author: 'Turner, A.H. et al.',
        url: 'https://doi.org/10.1126/science.1145076',
        year: 2007,
        license: 'CC BY 4.0',
      },
    ],
  },
};

const deinonychus: SpecimenData = {
  id: 'deinonychus-antirrhopus',
  displayName: 'Deinonychus',
  taxonomyLabel: 'Deinonychus antirrhopus',
  group: 'raptor',
  models: {
    skeleton: '/models/deinonychus-antirrhopus/skeleton.glb',
    skin: '/models/deinonychus-antirrhopus/skin.glb',
  },
  stats: {
    length: { museum: '11 feet', scientific: [3.0, 3.4] },
    weight: { museum: '160 lbs', scientific: [70, 80] },
    location: 'Montana & Wyoming, USA',
  },
  presentation: {
    color: '#dc2626',
    scale: 1.0,
    camera: {
      idle: [5, 3, 7],
      head: [2.5, 2, 3],
      claw: [1, 0.5, 2],
    },
  },
  bones: [
    {
      meshName: 'skull',
      label: 'Skull',
      description:
        'The skull contained approximately 70 curved, blade-like teeth ideal for gripping struggling prey.',
      anchor: [1.5, 1.8, 0],
      explodeVector: [0.4, 0.6, 0],
      confidence: 'certain',
    },
    {
      meshName: 'sickle_claw_l',
      label: 'Killing Claw (Left)',
      description:
        'The 13 cm sickle-shaped claw inspired the name "terrible claw" and was held off the ground while walking.',
      anchor: [-0.3, 0.2, 1.0],
      explodeVector: [-0.2, -0.4, 0.5],
      confidence: 'certain',
    },
    {
      meshName: 'forelimb_r',
      label: 'Right Forelimb',
      description:
        'Long arms with grasping hands suggest Deinonychus could seize and hold prey while attacking with its feet.',
      anchor: [0.5, 1.0, -0.8],
      explodeVector: [0.2, 0.3, -0.5],
      confidence: 'likely',
    },
    {
      meshName: 'pelvis',
      label: 'Pelvis',
      description:
        'The hip structure indicates a highly agile predator capable of rapid direction changes during pursuit.',
      anchor: [-0.5, 1.2, 0],
      explodeVector: [0, 0.4, 0],
      confidence: 'certain',
    },
  ],
  content: {
    facts: [
      'Deinonychus revolutionized our understanding of dinosaurs, helping spark the "Dinosaur Renaissance" of the 1960s-70s.',
      'The discovery of multiple Deinonychus fossils near a Tenontosaurus suggests pack hunting behavior.',
      'Deinonychus is the actual dinosaur that inspired the "Velociraptors" in Jurassic Park.',
    ],
    myths: [
      'Myth: Deinonychus hunted in organized packs like wolves. Reality: While group feeding is evidenced, coordinated pack hunting is debated.',
    ],
    sources: [
      {
        title: 'Ostrom, J.H. (1969). Osteology of Deinonychus antirrhopus',
        author: 'Ostrom, John H.',
        year: 1969,
        license: 'Academic',
      },
      {
        title: 'Yale Peabody Museum - Deinonychus Collection',
        url: 'https://peabody.yale.edu/',
        license: 'Educational',
      },
    ],
  },
};

const utahraptor: SpecimenData = {
  id: 'utahraptor-ostrommaysorum',
  displayName: 'Utahraptor',
  taxonomyLabel: 'Utahraptor ostrommaysorum',
  group: 'raptor',
  models: {
    skeleton: '/models/utahraptor-ostrommaysorum/skeleton.glb',
    skin: '/models/utahraptor-ostrommaysorum/skin.glb',
  },
  stats: {
    length: { museum: '23 feet', scientific: [5.0, 7.0] },
    weight: { museum: '1,100 lbs', scientific: [280, 500] },
    location: 'Utah, USA',
  },
  presentation: {
    color: '#ca8a04',
    scale: 0.8,
    camera: {
      idle: [8, 4, 10],
      head: [4, 3, 5],
      claw: [2, 1, 3],
    },
  },
  bones: [
    {
      meshName: 'skull',
      label: 'Skull',
      description:
        'The robust skull housed powerful jaw muscles capable of delivering crushing bites to large prey.',
      anchor: [3, 2.5, 0],
      explodeVector: [0.5, 0.7, 0],
      confidence: 'likely',
    },
    {
      meshName: 'sickle_claw_l',
      label: 'Giant Sickle Claw (Left)',
      description:
        'At 22 cm (9 inches), this is the largest sickle claw of any known dromaeosaurid.',
      anchor: [-0.5, 0.4, 1.5],
      explodeVector: [-0.3, -0.5, 0.6],
      confidence: 'certain',
    },
    {
      meshName: 'ribcage',
      label: 'Ribcage',
      description:
        'The broad ribcage indicates a powerful body build, more robust than its smaller relatives.',
      anchor: [0, 1.8, 0],
      explodeVector: [0, 0.5, 0],
      confidence: 'likely',
    },
  ],
  content: {
    facts: [
      'Utahraptor is the largest known member of the dromaeosaurid family.',
      'The species name honors paleontologist John Ostrom and roboticist Chris Mays.',
      'A remarkable "quicksand" death trap in Utah preserved multiple Utahraptors together.',
    ],
    myths: [
      'Myth: Utahraptor lived alongside Velociraptors. Reality: Utahraptor lived 50 million years earlier in the Early Cretaceous.',
      'Myth: Large size made Utahraptor slow. Reality: Biomechanical analysis suggests it was still quite agile for its size.',
    ],
    sources: [
      {
        title: 'Kirkland, J.I. et al. (1993). Utahraptor ostrommaysorum',
        author: 'Kirkland, James I.',
        year: 1993,
        license: 'Academic',
      },
    ],
  },
};

const microraptor: SpecimenData = {
  id: 'microraptor-gui',
  displayName: 'Microraptor',
  taxonomyLabel: 'Microraptor gui',
  group: 'raptor',
  models: {
    skeleton: '/models/microraptor-gui/skeleton.glb',
    skin: '/models/microraptor-gui/skin.glb',
  },
  stats: {
    length: { museum: '2.5 feet', scientific: [0.7, 0.9] },
    weight: { museum: '2.2 lbs', scientific: [0.9, 1.2] },
    location: 'Liaoning Province, China',
  },
  presentation: {
    color: '#0891b2',
    scale: 2.0,
    camera: {
      idle: [1.5, 1, 2],
      head: [0.8, 0.6, 1],
      claw: [0.3, 0.2, 0.8],
    },
  },
  bones: [
    {
      meshName: 'skull',
      label: 'Skull',
      description:
        'The small skull contained sharp teeth suitable for catching insects, small mammals, and fish.',
      anchor: [0.3, 0.4, 0],
      explodeVector: [0.2, 0.3, 0],
      confidence: 'certain',
    },
    {
      meshName: 'wing_feathers_l',
      label: 'Wing Feathers (Left)',
      description:
        'Asymmetrical flight feathers on the arms indicate aerodynamic capability.',
      anchor: [0, 0.3, 0.4],
      explodeVector: [0, 0.2, 0.4],
      confidence: 'certain',
    },
    {
      meshName: 'leg_feathers_l',
      label: 'Leg Wing (Left)',
      description:
        'Unique among dinosaurs, Microraptor had long feathers on its hind legs forming a "four-winged" configuration.',
      anchor: [-0.2, 0.15, 0.3],
      explodeVector: [-0.1, -0.2, 0.3],
      confidence: 'certain',
    },
    {
      meshName: 'tail_fan',
      label: 'Tail Fan',
      description:
        'A diamond-shaped tail fan likely aided in steering during glides or flight.',
      anchor: [-0.5, 0.25, 0],
      explodeVector: [-0.4, 0, 0],
      confidence: 'certain',
    },
  ],
  content: {
    facts: [
      'Microraptor is the smallest known non-avian dinosaur with confirmed flight or gliding capability.',
      'Exceptional fossils preserve iridescent black feathers, similar to modern crows.',
      'Stomach contents reveal a varied diet including fish, mammals, and even other birds.',
      'The four-winged body plan represents a unique evolutionary experiment in dinosaur flight.',
    ],
    myths: [
      'Myth: Microraptor could fly like modern birds. Reality: It likely glided between trees rather than powered flight.',
    ],
    sources: [
      {
        title: 'Xu, X. et al. (2003). Four-winged dinosaurs from China',
        author: 'Xu Xing et al.',
        url: 'https://doi.org/10.1038/nature01342',
        year: 2003,
        license: 'Academic',
      },
      {
        title: 'Reconstruction of Microraptor and the Evolution of Iridescent Plumage',
        author: 'Li, Q. et al.',
        year: 2012,
        license: 'CC BY 4.0',
      },
    ],
  },
};

const tyrannosaurusRex: SpecimenData = {
  id: 'tyrannosaurus-rex',
  displayName: 'Tyrannosaurus Rex',
  taxonomyLabel: 'Tyrannosaurus rex',
  group: 'tyrannosaur',
  models: {
    skeleton: '/models/tyrannosaurus-rex/skeleton.glb',
    skin: '/models/tyrannosaurus-rex/skin-animated.glb',
    fossil: '/models/tyrannosaurus-rex/fossil.glb',
  },
  variants: [
    {
      label: 'Juvenile',
      modelOverride: '/models/tyrannosaurus-rex/juvenile-skeleton.glb',
      stats: {
        length: { museum: '15 feet', scientific: [4.0, 5.0] },
        weight: { museum: '1,500 lbs', scientific: [600, 800] },
        location: 'Western North America',
      },
    },
  ],
  stats: {
    length: { museum: '40 feet', scientific: [11.0, 12.3] },
    weight: { museum: '9 tons', scientific: [5400, 8000] },
    location: 'Western North America',
  },
  presentation: {
    color: '#84cc16',
    scale: 0.5,
    camera: {
      idle: [15, 8, 20],
      head: [6, 5, 8],
      claw: [4, 2, 6],
    },
  },
  bones: [
    {
      meshName: 'skull',
      label: 'Skull',
      description:
        'The massive skull measured up to 1.5 meters long with 60 serrated teeth, some over 30 cm including the root.',
      anchor: [5, 4, 0],
      explodeVector: [0.8, 1.0, 0],
      confidence: 'certain',
    },
    {
      meshName: 'jaw',
      label: 'Lower Jaw',
      description:
        'Bite force estimates reach 12,800 pounds - the strongest bite of any terrestrial animal ever.',
      anchor: [4.5, 2.5, 0],
      explodeVector: [0.6, -0.3, 0],
      confidence: 'certain',
    },
    {
      meshName: 'forelimb_r',
      label: 'Right Forelimb',
      description:
        'Despite their small size, T. rex arms were muscular and could lift over 400 pounds each.',
      anchor: [1.5, 3, -1.5],
      explodeVector: [0.3, 0.4, -0.5],
      confidence: 'certain',
    },
    {
      meshName: 'femur_r',
      label: 'Right Femur',
      description:
        'The massive thigh bone indicates powerful leg muscles that could propel this predator at speeds up to 25 mph.',
      anchor: [-2, 2.5, -2],
      explodeVector: [-0.2, -0.5, -0.4],
      confidence: 'likely',
    },
  ],
  content: {
    facts: [
      'T. rex had forward-facing eyes providing excellent binocular vision and depth perception.',
      'CT scans reveal an enlarged olfactory bulb, suggesting an exceptional sense of smell.',
      'Sue, the most complete T. rex fossil (90% complete), sold for $8.4 million in 1997.',
      'Growth studies show T. rex gained up to 2 kg per day during its teenage growth spurt.',
    ],
    myths: [
      'Myth: T. rex could not see you if you stood still. Reality: T. rex had excellent vision comparable to modern eagles.',
      'Myth: T. rex arms were useless. Reality: Each arm could curl approximately 430 pounds.',
    ],
    sources: [
      {
        title: 'Tyrannosaurus rex, the Tyrant King',
        author: 'Larson, P. & Carpenter, K.',
        year: 2008,
        license: 'Academic',
      },
      {
        title: 'Field Museum - SUE the T. rex',
        url: 'https://www.fieldmuseum.org/exhibitions/sue-t-rex',
        license: 'Educational',
      },
      {
        title: 'Estimating bite force in extinct animals',
        author: 'Bates, K.T. & Falkingham, P.L.',
        year: 2012,
        license: 'CC BY 4.0',
      },
    ],
  },
};

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

/** All specimens in the registry (T-Rex only) */
export const SPECIMENS: SpecimenData[] = [
  tyrannosaurusRex,
];

/**
 * Retrieves a specimen by its unique ID
 * @param id - The specimen's unique identifier
 * @returns The SpecimenData if found, undefined otherwise
 */
export function getSpecimenById(id: string): SpecimenData | undefined {
  return SPECIMENS.find((specimen) => specimen.id === id);
}

/**
 * Retrieves all specimens belonging to a specific taxonomic group
 * @param group - The dinosaur group to filter by
 * @returns Array of SpecimenData matching the group
 */
export function getSpecimensByGroup(group: DinosaurGroup): SpecimenData[] {
  return SPECIMENS.filter((specimen) => specimen.group === group);
}
