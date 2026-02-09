import { isVoiceSupported } from './config';
import { normalizeTranscript } from './commands';
import { useStore } from '../store';
import { useDirector } from '../director';
import { DURATION_MS } from '../motion';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;
let lastDispatchTime = 0;
let micPermissionGranted = false;
let micStream: MediaStream | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

/**
 * Call when voice toggle is turned ON.
 * Triggers the browser mic permission prompt via getUserMedia.
 * Skips Permissions API query — it returns stale cached state on some browsers.
 */
export async function requestMicPermission(): Promise<boolean> {
  if (micPermissionGranted) return true;

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micPermissionGranted = true;
    useStore.getState().showToast('Microphone ready — hold mic to speak');
    return true;
  } catch (err) {
    const name = err instanceof DOMException ? err.name : 'unknown';
    if (name === 'NotAllowedError') {
      useStore.getState().showToast('Mic blocked — click lock icon in address bar, set Microphone to Allow, then refresh');
    } else if (name === 'NotFoundError') {
      useStore.getState().showToast('No microphone found on this device');
    } else {
      useStore.getState().showToast(`Mic error: ${name}`);
    }
    useStore.getState().setVoiceEnabled(false);
    return false;
  }
}

/**
 * Call when voice toggle is turned OFF.
 */
export function releaseMicPermission(): void {
  if (micStream) {
    micStream.getTracks().forEach((t) => t.stop());
    micStream = null;
  }
  micPermissionGranted = false;
  stopListening();
}

export function startListening(): void {
  if (!isVoiceSupported() || !micPermissionGranted) return;

  const store = useStore.getState();
  if (!store.voiceEnabled) return;

  const SpeechRecognitionClass = getSpeechRecognition();
  if (!SpeechRecognitionClass) return;

  // Stop any existing instance
  stopListening();

  recognition = new SpeechRecognitionClass();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    const transcript = event.results[0]?.[0]?.transcript ?? '';
    useStore.getState().setVoiceTranscript(transcript);

    const now = Date.now();
    if (now - lastDispatchTime < DURATION_MS.voiceCooldown) {
      useStore.getState().showToast('Command cooldown — try again');
      return;
    }

    const command = normalizeTranscript(transcript);
    if (!command) {
      useStore.getState().showToast(`Didn't recognize: "${transcript}"`);
      return;
    }

    lastDispatchTime = now;
    dispatchCommand(command);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onerror = (event: any) => {
    const error = event?.error ?? 'unknown';
    useStore.getState().setVoiceListening(false);

    // These are harmless — don't show scary error toasts
    if (error === 'no-speech' || error === 'aborted') return;

    if (error === 'not-allowed') {
      useStore.getState().showToast('Microphone permission denied');
      useStore.getState().setVoiceEnabled(false);
      micPermissionGranted = false;
    } else if (error === 'network') {
      useStore.getState().showToast('Voice requires internet connection');
    } else {
      useStore.getState().showToast(`Voice error: ${error}`);
    }
  };

  recognition.onend = () => {
    useStore.getState().setVoiceListening(false);
  };

  recognition.start();
  useStore.getState().setVoiceListening(true);
}

export function stopListening(): void {
  if (recognition) {
    try {
      recognition.stop();
    } catch {
      // Already stopped
    }
    recognition = null;
  }
  useStore.getState().setVoiceListening(false);
}

function dispatchCommand(command: 'roar' | 'skin' | 'explore'): void {
  const store = useStore.getState();
  const director = useDirector.getState();

  switch (command) {
    case 'roar': {
      if (store.mode !== 'skin') {
        store.showToast('Roar requires Skin mode');
        return;
      }
      store.triggerRoar();
      store.showToast('ROAR!');
      break;
    }

    case 'skin': {
      store.requestMode(store.mode === 'skin' ? 'skeleton' : 'skin');
      store.showToast(store.mode === 'skin' ? 'Switching to Skeleton' : 'Switching to Skin');
      break;
    }

    case 'explore': {
      if (director.phase === 'home') {
        director.goToChapter(0);
        store.showToast('Starting exhibit tour');
      } else {
        store.showToast('Tour already active');
      }
      break;
    }
  }
}
