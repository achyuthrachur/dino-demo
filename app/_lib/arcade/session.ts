import { normalizeSessionCode, type ClientRole } from './protocol';

const SESSION_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createSessionCode(length = 4): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * SESSION_CHARS.length);
    out += SESSION_CHARS[idx];
  }
  return out;
}

export function sanitizeSessionCode(raw: string | null | undefined): string {
  if (!raw) return '';
  return normalizeSessionCode(raw);
}

export function createClientId(role: ClientRole): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${role}-${suffix}`;
}

export function buildControllerUrl(origin: string, session: string): string {
  const url = new URL('/controller', origin);
  url.searchParams.set('session', session);
  return url.toString();
}

export function resolveBridgeUrl(
  locationLike: Pick<Location, 'protocol' | 'hostname' | 'search'>,
  fallbackPort = 8787,
): string {
  const searchParams = new URLSearchParams(locationLike.search);
  const explicit = searchParams.get('bridge');
  if (explicit && /^wss?:\/\//i.test(explicit)) {
    return explicit;
  }
  const protocol = locationLike.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${locationLike.hostname}:${fallbackPort}`;
}
