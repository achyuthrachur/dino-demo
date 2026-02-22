export interface JoyVector {
  x: number;
  y: number;
}

export interface ArcadeConfig {
  joystickHz: number;
  joystickIntervalMs: number;
  reconnectBaseMs: number;
  reconnectMaxMs: number;
  heartbeatMs: number;
  staleInputMs: number;
  deadzone: number;
  smoothingPerSecond: number;
  maxLiftMeters: number;
  maxYawRadians: number;
}

export const ARCADE_CONFIG: ArcadeConfig = {
  joystickHz: 40,
  joystickIntervalMs: 25,
  reconnectBaseMs: 500,
  reconnectMaxMs: 5000,
  heartbeatMs: 5000,
  staleInputMs: 2000,
  deadzone: 0.08,
  smoothingPerSecond: 8,
  maxLiftMeters: 2.1,
  maxYawRadians: 0.65,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) return 0;
  const sign = Math.sign(value);
  const scaled = (Math.abs(value) - deadzone) / (1 - deadzone);
  return sign * scaled;
}
