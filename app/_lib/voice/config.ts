export type VoiceCommand = 'roar' | 'skin' | 'explore';

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export const SYNONYM_MAP: Record<VoiceCommand, string[]> = {
  explore: ["let's go", 'lets go', 'explore', 'tour'],
  skin: ['outfit', 'skin', 'skeleton'],
  roar: ['speak', 'roar'],
};
