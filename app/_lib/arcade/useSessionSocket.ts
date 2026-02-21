'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ARCADE_CONFIG } from './config';
import {
  safeParseWireMessage,
  type ClientRole,
  type ClientHello,
  type ClientPing,
  type WireMessage,
} from './protocol';

export type SocketStatus = 'disconnected' | 'connecting' | 'connected';

interface UseSessionSocketOptions {
  enabled?: boolean;
  role: ClientRole;
  session: string;
  clientId: string;
  bridgeUrl: string;
  onMessage?: (message: WireMessage) => void;
}

interface UseSessionSocketResult {
  status: SocketStatus;
  lastError: string | null;
  send: (message: WireMessage) => boolean;
}

export function useSessionSocket({
  enabled = true,
  role,
  session,
  clientId,
  bridgeUrl,
  onMessage,
}: UseSessionSocketOptions): UseSessionSocketResult {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);
  const closedRef = useRef(false);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const send = useCallback((message: WireMessage) => {
    if (!enabled) return false;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    ws.send(JSON.stringify(message));
    return true;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !session || !bridgeUrl) {
      setStatus('disconnected');
      return;
    }

    closedRef.current = false;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const connect = () => {
      if (closedRef.current) return;

      clearReconnectTimer();
      setStatus('connecting');

      const ws = new WebSocket(bridgeUrl);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        reconnectAttemptRef.current = 0;
        setLastError(null);
        setStatus('connected');

        const hello: ClientHello = {
          type: 'hello',
          role,
          session,
          clientId,
        };
        ws.send(JSON.stringify(hello));
      });

      ws.addEventListener('message', (event) => {
        if (typeof event.data !== 'string') return;
        const message = safeParseWireMessage(event.data);
        if (!message) return;
        onMessageRef.current?.(message);
      });

      ws.addEventListener('error', () => {
        setLastError('WebSocket error');
      });

      ws.addEventListener('close', () => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setStatus('disconnected');
        if (closedRef.current) return;

        const attempt = reconnectAttemptRef.current;
        reconnectAttemptRef.current += 1;
        const delay = Math.min(
          ARCADE_CONFIG.reconnectMaxMs,
          ARCADE_CONFIG.reconnectBaseMs * 2 ** attempt,
        );
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      closedRef.current = true;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [bridgeUrl, clientId, enabled, role, session]);

  useEffect(() => {
    if (!enabled) return;
    if (status !== 'connected') return;
    const heartbeat = window.setInterval(() => {
      const ping: ClientPing = {
        type: 'ping',
        session,
        clientId,
        t: Date.now(),
      };
      send(ping);
    }, ARCADE_CONFIG.heartbeatMs);
    return () => {
      window.clearInterval(heartbeat);
    };
  }, [clientId, enabled, send, session, status]);

  return { status, lastError, send };
}
