#!/usr/bin/env node

import crypto from 'node:crypto';
import http from 'node:http';
import os from 'node:os';

const HOST = process.env.ARCADE_BRIDGE_HOST || '0.0.0.0';
const PORT = Number(process.env.ARCADE_BRIDGE_PORT || 8787);
const HEARTBEAT_MS = Number(process.env.ARCADE_BRIDGE_HEARTBEAT_MS || 5000);
const STALE_CLIENT_MS = Number(process.env.ARCADE_BRIDGE_STALE_MS || 15000);

/** @typedef {'mac' | 'phone'} ClientRole */

/**
 * @typedef {Object} ClientConnection
 * @property {import('node:net').Socket} socket
 * @property {ClientRole | null} role
 * @property {string | null} session
 * @property {string | null} clientId
 * @property {number} lastSeen
 * @property {Buffer} buffer
 */

/**
 * @typedef {Object} SessionState
 * @property {string} id
 * @property {ClientConnection | null} mac
 * @property {Map<string, ClientConnection>} phones
 * @property {string | null} activeControllerId
 * @property {number} lastInputAt
 */

/** @type {Map<import('node:net').Socket, ClientConnection>} */
const clients = new Map();
/** @type {Map<string, SessionState>} */
const sessions = new Map();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, uptimeSec: process.uptime() }));
    return;
  }

  if (req.url === '/info') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        host: HOST,
        port: PORT,
        lanIps: getLanIps(),
      }),
    );
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, message: 'Not found' }));
});

server.on('upgrade', (req, socket) => {
  const upgrade = (req.headers.upgrade || '').toString().toLowerCase();
  const connection = (req.headers.connection || '').toString().toLowerCase();
  const key = req.headers['sec-websocket-key'];

  if (upgrade !== 'websocket' || !connection.includes('upgrade') || typeof key !== 'string') {
    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '\r\n',
  ];
  socket.write(responseHeaders.join('\r\n'));

  /** @type {ClientConnection} */
  const client = {
    socket,
    role: null,
    session: null,
    clientId: null,
    lastSeen: Date.now(),
    buffer: Buffer.alloc(0),
  };
  clients.set(socket, client);

  socket.on('data', (chunk) => {
    handleSocketData(client, chunk);
  });

  socket.on('close', () => {
    removeClient(client, 'socket closed');
  });

  socket.on('error', () => {
    removeClient(client, 'socket error');
  });

  sendStatus(client, true, 'Connected to arcade bridge');
});

setInterval(() => {
  const now = Date.now();
  for (const client of clients.values()) {
    if (now - client.lastSeen > STALE_CLIENT_MS) {
      removeClient(client, 'stale timeout');
      continue;
    }
    if (client.session && client.clientId) {
      sendJson(client, {
        type: 'pong',
        session: client.session,
        clientId: client.clientId,
        t: now,
      });
    }
  }
}, HEARTBEAT_MS);

server.listen(PORT, HOST, () => {
  const ips = getLanIps();
  const ipHint = ips.length > 0 ? ips.join(', ') : 'none detected';
  console.log(`[arcade-bridge] listening on ws://${HOST}:${PORT}`);
  console.log(`[arcade-bridge] LAN IPs: ${ipHint}`);
  console.log('[arcade-bridge] info endpoint: /info');
});

/**
 * @param {ClientConnection} client
 * @param {Buffer} incoming
 */
function handleSocketData(client, incoming) {
  client.lastSeen = Date.now();
  client.buffer = Buffer.concat([client.buffer, incoming]);

  while (true) {
    const frame = readFrame(client.buffer);
    if (!frame) return;
    client.buffer = frame.remaining;

    if (!frame.fin) {
      removeClient(client, 'fragmented frames unsupported');
      return;
    }

    if (frame.opcode === 0x8) {
      removeClient(client, 'close frame');
      return;
    }

    if (frame.opcode === 0x9) {
      sendFrame(client.socket, 0xA, frame.payload);
      continue;
    }

    if (frame.opcode === 0xA) {
      continue;
    }

    if (frame.opcode !== 0x1) {
      continue;
    }

    const text = frame.payload.toString('utf8');
    handleClientMessage(client, text);
  }
}

/**
 * @param {ClientConnection} client
 * @param {string} raw
 */
function handleClientMessage(client, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    sendStatus(client, false, 'Invalid JSON message');
    return;
  }

  if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') {
    sendStatus(client, false, 'Malformed message');
    return;
  }

  if (msg.type === 'hello') {
    registerHello(client, msg);
    return;
  }

  if (!client.session || !client.clientId || !client.role) {
    sendStatus(client, false, 'Expected hello before other messages');
    return;
  }

  if (typeof msg.session !== 'string' || normalizeSession(msg.session) !== client.session) {
    sendStatus(client, false, 'Session mismatch');
    return;
  }

  if (msg.type === 'ping') {
    sendJson(client, {
      type: 'pong',
      session: client.session,
      clientId: client.clientId,
      t: Date.now(),
    });
    return;
  }

  if (msg.type !== 'controller_state' && msg.type !== 'action') {
    sendStatus(client, false, `Unknown message type "${msg.type}"`);
    return;
  }

  if (client.role !== 'phone') {
    sendStatus(client, false, 'Only phone clients can send controller input');
    return;
  }

  const session = sessions.get(client.session);
  if (!session) {
    sendStatus(client, false, 'Session not found');
    return;
  }

  const previousActive = session.activeControllerId;
  session.activeControllerId = client.clientId;
  session.lastInputAt = Date.now();

  if (session.mac) {
    sendJson(session.mac, msg);
  }

  if (msg.type === 'action' && typeof msg.seq === 'number') {
    sendJson(client, {
      type: 'ack',
      session: client.session,
      seq: msg.seq,
      ok: true,
    });
  }

  if (previousActive !== session.activeControllerId) {
    broadcastStatus(session, 'Active controller changed');
  }
}

/**
 * @param {ClientConnection} client
 * @param {any} msg
 */
function registerHello(client, msg) {
  const role = msg.role;
  const sessionId = normalizeSession(msg.session);
  const clientId = typeof msg.clientId === 'string' ? msg.clientId.trim().slice(0, 40) : '';

  if ((role !== 'mac' && role !== 'phone') || !sessionId || !clientId) {
    sendStatus(client, false, 'Invalid hello payload');
    return;
  }

  // If this socket was already bound to a session, detach it first.
  detachClientFromSession(client);

  client.role = role;
  client.session = sessionId;
  client.clientId = clientId;
  client.lastSeen = Date.now();

  const session = getOrCreateSession(sessionId);

  if (role === 'mac') {
    if (session.mac && session.mac !== client) {
      sendStatus(session.mac, false, 'Mac host replaced by another client');
      try {
        session.mac.socket.end();
      } catch {
        // no-op
      }
    }
    session.mac = client;
  } else {
    const existing = session.phones.get(clientId);
    if (existing && existing !== client) {
      sendStatus(existing, false, 'Controller replaced by same clientId');
      try {
        existing.socket.end();
      } catch {
        // no-op
      }
    }
    session.phones.set(clientId, client);
    session.activeControllerId = clientId;
  }

  sendStatus(client, true, `Joined session ${sessionId}`);
  broadcastStatus(session, `${role} joined`);
}

/**
 * @param {ClientConnection} client
 * @param {string} reason
 */
function removeClient(client, reason) {
  if (!clients.has(client.socket)) return;

  const previousSessionId = client.session;
  detachClientFromSession(client);
  clients.delete(client.socket);

  try {
    client.socket.destroy();
  } catch {
    // no-op
  }

  if (previousSessionId) {
    const session = sessions.get(previousSessionId);
    if (session) {
      broadcastStatus(session, reason);
    }
  }
}

/**
 * @param {ClientConnection} client
 */
function detachClientFromSession(client) {
  if (!client.session) return;
  const session = sessions.get(client.session);
  if (!session) {
    client.session = null;
    client.role = null;
    client.clientId = null;
    return;
  }

  if (client.role === 'mac' && session.mac === client) {
    session.mac = null;
  }

  if (client.role === 'phone' && client.clientId) {
    session.phones.delete(client.clientId);
    if (session.activeControllerId === client.clientId) {
      let nextActive = null;
      for (const [id, phone] of session.phones.entries()) {
        if (!nextActive || phone.lastSeen > nextActive.lastSeen) {
          nextActive = { id, lastSeen: phone.lastSeen };
        }
      }
      session.activeControllerId = nextActive ? nextActive.id : null;
    }
  }

  if (!session.mac && session.phones.size === 0) {
    sessions.delete(session.id);
  }

  client.session = null;
  client.role = null;
  client.clientId = null;
}

/**
 * @param {string} id
 * @returns {SessionState}
 */
function getOrCreateSession(id) {
  const existing = sessions.get(id);
  if (existing) return existing;
  const created = {
    id,
    mac: null,
    phones: new Map(),
    activeControllerId: null,
    lastInputAt: 0,
  };
  sessions.set(id, created);
  return created;
}

/**
 * @param {SessionState} session
 * @param {string} message
 */
function broadcastStatus(session, message) {
  const payload = {
    type: 'status',
    session: session.id,
    ok: true,
    message,
    activeControllerId: session.activeControllerId || undefined,
  };
  if (session.mac) {
    sendJson(session.mac, payload);
  }
  for (const phone of session.phones.values()) {
    sendJson(phone, payload);
  }
}

/**
 * @param {ClientConnection} client
 * @param {boolean} ok
 * @param {string} message
 */
function sendStatus(client, ok, message) {
  if (!client.session) {
    sendJson(client, {
      type: 'status',
      session: 'UNKNOWN',
      ok,
      message,
    });
    return;
  }
  const session = sessions.get(client.session);
  sendJson(client, {
    type: 'status',
    session: client.session,
    ok,
    message,
    activeControllerId: session?.activeControllerId || undefined,
  });
}

/**
 * @param {ClientConnection} client
 * @param {any} data
 */
function sendJson(client, data) {
  if (client.socket.destroyed) return;
  const serialized = JSON.stringify(data);
  sendFrame(client.socket, 0x1, Buffer.from(serialized));
}

/**
 * @param {import('node:net').Socket} socket
 * @param {number} opcode
 * @param {Buffer} payload
 */
function sendFrame(socket, opcode, payload) {
  if (socket.destroyed) return;

  let header;
  const length = payload.length;

  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  header[0] = 0x80 | (opcode & 0x0f);
  socket.write(Buffer.concat([header, payload]));
}

/**
 * @param {Buffer} buffer
 * @returns {{ fin: boolean; opcode: number; payload: Buffer; remaining: Buffer } | null}
 */
function readFrame(buffer) {
  if (buffer.length < 2) return null;

  const b0 = buffer[0];
  const b1 = buffer[1];
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let payloadLen = b1 & 0x7f;
  let offset = 2;

  if (payloadLen === 126) {
    if (buffer.length < offset + 2) return null;
    payloadLen = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLen === 127) {
    if (buffer.length < offset + 8) return null;
    const big = buffer.readBigUInt64BE(offset);
    if (big > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    payloadLen = Number(big);
    offset += 8;
  }

  const maskLength = masked ? 4 : 0;
  const frameLen = offset + maskLength + payloadLen;
  if (buffer.length < frameLen) return null;

  let payload = buffer.subarray(offset + maskLength, frameLen);
  if (masked) {
    const mask = buffer.subarray(offset, offset + 4);
    const unmasked = Buffer.alloc(payloadLen);
    for (let i = 0; i < payloadLen; i += 1) {
      unmasked[i] = payload[i] ^ mask[i % 4];
    }
    payload = unmasked;
  }

  return {
    fin,
    opcode,
    payload,
    remaining: buffer.subarray(frameLen),
  };
}

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeSession(value) {
  if (typeof value !== 'string') return '';
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

/**
 * @returns {string[]}
 */
function getLanIps() {
  const networkInterfaces = os.networkInterfaces();
  /** @type {string[]} */
  const ips = [];

  for (const interfaces of Object.values(networkInterfaces)) {
    if (!interfaces) continue;
    for (const net of interfaces) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
}
