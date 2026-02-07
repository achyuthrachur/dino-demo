interface ClipMap {
  idle: string | undefined;
  roar: string | undefined;
  walk: string | undefined;
}

const IDLE_PATTERNS = ['idle', 'breath', 'stand'];
const ROAR_PATTERNS = ['roar', 'attack', 'bite'];
const WALK_PATTERNS = ['walk', 'run'];

function fuzzyMatch(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

export function pickClips(clipNames: string[]): ClipMap {
  let idle: string | undefined;
  let roar: string | undefined;
  let walk: string | undefined;

  for (const name of clipNames) {
    if (!idle && fuzzyMatch(name, IDLE_PATTERNS)) idle = name;
    if (!roar && fuzzyMatch(name, ROAR_PATTERNS)) roar = name;
    if (!walk && fuzzyMatch(name, WALK_PATTERNS)) walk = name;
  }

  // Fallback: use first clip as idle ONLY if it wasn't already matched as roar or walk
  if (!idle && clipNames.length > 0) {
    const first = clipNames[0];
    if (first !== roar && first !== walk) {
      idle = first;
    }
  }

  return { idle, roar, walk };
}
