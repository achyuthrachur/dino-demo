import type { VoiceCommand } from './config';
import { SYNONYM_MAP } from './config';

// Priority order: EXPLORE > SKIN > ROAR
const PRIORITY: VoiceCommand[] = ['explore', 'skin', 'roar'];

export function normalizeTranscript(text: string): VoiceCommand | null {
  const lower = text.toLowerCase().trim();

  for (const cmd of PRIORITY) {
    const synonyms = SYNONYM_MAP[cmd];
    for (const syn of synonyms) {
      // Word boundary match for single words, includes for multi-word phrases
      if (syn.includes(' ')) {
        if (lower.includes(syn)) return cmd;
      } else {
        const regex = new RegExp(`\\b${syn}\\b`);
        if (regex.test(lower)) return cmd;
      }
    }
  }

  return null;
}
