'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as Ably from 'ably';
import {
  safeParseWireMessageFromUnknown,
  type ClientHello,
  type ClientRole,
  type WireMessage,
} from './protocol';

export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected';

interface UseAblySessionOptions {
  enabled?: boolean;
  ablyKey?: string;
  role: ClientRole;
  session: string;
  clientId: string;
  onMessage?: (message: WireMessage) => void;
}

interface UseAblySessionResult {
  status: RealtimeStatus;
  lastError: string | null;
  send: (message: WireMessage) => boolean;
}

const CHANNEL_PREFIX = 'arcade-session:';

function mapConnectionState(state: string): RealtimeStatus {
  if (state === 'connected') return 'connected';
  if (state === 'connecting') return 'connecting';
  return 'disconnected';
}

export function useAblySession({
  enabled = true,
  ablyKey,
  role,
  session,
  clientId,
  onMessage,
}: UseAblySessionOptions): UseAblySessionResult {
  const [status, setStatus] = useState<RealtimeStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);

  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const statusRef = useRef<RealtimeStatus>('disconnected');
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const send = useCallback((message: WireMessage) => {
    if (!enabled) return false;
    const channel = channelRef.current;
    if (!channel || statusRef.current !== 'connected') return false;

    void channel.publish(message.type, message).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : 'Publish failed';
      setLastError(reason);
    });
    return true;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !ablyKey || !session) {
      setStatus('disconnected');
      setLastError(null);
      return;
    }

    setStatus('connecting');
    setLastError(null);

    const realtime = new Ably.Realtime({
      key: ablyKey,
      clientId,
      echoMessages: false,
    });
    clientRef.current = realtime;

    const channelName = `${CHANNEL_PREFIX}${session}`;
    const channel = realtime.channels.get(channelName);
    channelRef.current = channel;

    const hello: ClientHello = {
      type: 'hello',
      role,
      session,
      clientId,
    };

    const onConnectionState = (change: Ably.ConnectionStateChange) => {
      setStatus(mapConnectionState(change.current));
      const reasonMessage = change.reason?.message;
      if (reasonMessage) {
        setLastError(reasonMessage);
      } else if (change.current === 'connected') {
        setLastError(null);
      }
    };

    const onChannelMessage = (msg: Ably.Message) => {
      const parsed = safeParseWireMessageFromUnknown(msg.data);
      if (!parsed) return;
      onMessageRef.current?.(parsed);
    };

    realtime.connection.on(onConnectionState);
    channel.subscribe(onChannelMessage);

    void channel.attach().then(() => {
      void channel.publish(hello.type, hello).catch(() => {
        // no-op
      });
    }).catch((error: unknown) => {
      const reason = error instanceof Error ? error.message : 'Unable to attach channel';
      setLastError(reason);
      setStatus('disconnected');
    });

    return () => {
      channel.unsubscribe(onChannelMessage);
      void channel.detach();
      realtime.connection.off(onConnectionState);
      realtime.close();
      channelRef.current = null;
      clientRef.current = null;
      setStatus('disconnected');
    };
  }, [enabled, ablyKey, clientId, role, session]);

  return { status, lastError, send };
}
