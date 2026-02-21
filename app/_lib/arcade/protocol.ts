import { clamp, type JoyVector } from './config';

export type ClientRole = 'mac' | 'phone';

export type ArcadeAction = 'walk_toggle' | 'roar' | 'mode_toggle' | 'reset_pose';

export type ClientHello = {
  type: 'hello';
  session: string;
  role: ClientRole;
  clientId: string;
};

export type ControllerState = {
  type: 'controller_state';
  session: string;
  clientId: string;
  t: number;
  seq: number;
  joy: JoyVector;
};

export type ControllerAction = {
  type: 'action';
  session: string;
  clientId: string;
  t: number;
  seq: number;
  action: ArcadeAction;
};

export type ClientPing = {
  type: 'ping';
  session: string;
  clientId: string;
  t: number;
};

export type ServerPong = {
  type: 'pong';
  session: string;
  clientId: string;
  t: number;
};

export type ServerStatus = {
  type: 'status';
  session: string;
  ok: boolean;
  message?: string;
  activeControllerId?: string;
};

export type ServerAck = {
  type: 'ack';
  session: string;
  seq: number;
  ok: boolean;
  message?: string;
};

export type ServerMessage = ServerPong | ServerStatus | ServerAck;

export type WireMessage =
  | ClientHello
  | ControllerState
  | ControllerAction
  | ClientPing
  | ServerMessage;

const ACTIONS: ReadonlyArray<ArcadeAction> = ['walk_toggle', 'roar', 'mode_toggle', 'reset_pose'];
const ROLES: ReadonlyArray<ClientRole> = ['mac', 'phone'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isClientRole(value: unknown): value is ClientRole {
  return typeof value === 'string' && ROLES.includes(value as ClientRole);
}

function isArcadeAction(value: unknown): value is ArcadeAction {
  return typeof value === 'string' && ACTIONS.includes(value as ArcadeAction);
}

function isJoyVector(value: unknown): value is JoyVector {
  if (!isRecord(value)) return false;
  return isFiniteNumber(value.x) && isFiniteNumber(value.y);
}

function clampJoy(joy: JoyVector): JoyVector {
  return {
    x: clamp(joy.x, -1, 1),
    y: clamp(joy.y, -1, 1),
  };
}

export function normalizeSessionCode(session: string): string {
  return session.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function isControllerState(message: WireMessage): message is ControllerState {
  return message.type === 'controller_state';
}

export function isControllerAction(message: WireMessage): message is ControllerAction {
  return message.type === 'action';
}

export function safeParseWireMessage(raw: string): WireMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !isString(parsed.type) || !isString(parsed.session)) return null;
  const session = normalizeSessionCode(parsed.session);
  if (!session) return null;

  switch (parsed.type) {
    case 'hello': {
      if (!isClientRole(parsed.role) || !isString(parsed.clientId)) return null;
      return {
        type: 'hello',
        session,
        role: parsed.role,
        clientId: parsed.clientId,
      };
    }
    case 'controller_state': {
      if (!isString(parsed.clientId) || !isFiniteNumber(parsed.t) || !isFiniteNumber(parsed.seq)) return null;
      if (!isJoyVector(parsed.joy)) return null;
      return {
        type: 'controller_state',
        session,
        clientId: parsed.clientId,
        t: parsed.t,
        seq: parsed.seq,
        joy: clampJoy(parsed.joy),
      };
    }
    case 'action': {
      if (!isString(parsed.clientId) || !isFiniteNumber(parsed.t) || !isFiniteNumber(parsed.seq)) return null;
      if (!isArcadeAction(parsed.action)) return null;
      return {
        type: 'action',
        session,
        clientId: parsed.clientId,
        t: parsed.t,
        seq: parsed.seq,
        action: parsed.action,
      };
    }
    case 'ping': {
      if (!isString(parsed.clientId) || !isFiniteNumber(parsed.t)) return null;
      return {
        type: 'ping',
        session,
        clientId: parsed.clientId,
        t: parsed.t,
      };
    }
    case 'pong': {
      if (!isString(parsed.clientId) || !isFiniteNumber(parsed.t)) return null;
      return {
        type: 'pong',
        session,
        clientId: parsed.clientId,
        t: parsed.t,
      };
    }
    case 'status': {
      if (typeof parsed.ok !== 'boolean') return null;
      return {
        type: 'status',
        session,
        ok: parsed.ok,
        message: typeof parsed.message === 'string' ? parsed.message : undefined,
        activeControllerId:
          typeof parsed.activeControllerId === 'string' ? parsed.activeControllerId : undefined,
      };
    }
    case 'ack': {
      if (typeof parsed.ok !== 'boolean' || !isFiniteNumber(parsed.seq)) return null;
      return {
        type: 'ack',
        session,
        seq: parsed.seq,
        ok: parsed.ok,
        message: typeof parsed.message === 'string' ? parsed.message : undefined,
      };
    }
    default:
      return null;
  }
}

export function safeParseWireMessageFromUnknown(raw: unknown): WireMessage | null {
  if (typeof raw === 'string') {
    return safeParseWireMessage(raw);
  }

  try {
    return safeParseWireMessage(JSON.stringify(raw));
  } catch {
    return null;
  }
}
