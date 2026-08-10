const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  proto
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');

const settings = require('../settings');
const { loadCommands } = require('./commandLoader');
const { handleStatusUpdate } = require('./autostatus');
const { cacheMessage, handleRevoke } = require('./antidelete');
const { isGroup } = require('./groupHelpers');
const { getGroupSettings } = require('./groupSettings');
const { enforceAntilink } = require('./antilinkGuard');

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

/**
 * Multi-account runtime: every visitor to the dashboard can pair their OWN
 * WhatsApp number and get a live bot running in this same process. Each
 * paired account keeps its own socket, its own group-settings store, and its
 * own stats. MAX_SESSIONS caps the total to protect RAM on the host.
 */
const MAX_SESSIONS = Math.max(1, parseInt(process.env.MAX_SESSIONS || '5', 10) || 5);
const commands = loadCommands();
const sessions = new Map(); // sanitized number -> session record

function sanitizeNumber(raw) {
  return String(raw || '').replace(/[^0-9]/g, '');
}

function getOrCreateRecord(number) {
  let record = sessions.get(number);
  if (record) return record;

  record = {
    number,
    sock: null,
    state: 'connecting',
    seenUsers: new Set(),
    antideleteCache: []
  };
  sessions.set(number, record);
  return record;
}

async function connectSession(number) {
  const record = getOrCreateRecord(number);
  const authDir = path.join(SESSIONS_DIR, number, 'auth');

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    logger: pino({ level: 'silent' })
  });

  record.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  // Registration proof for requestPairingCode(): the QR event only fires
  // AFTER the registration handshake with WhatsApp's servers completes.
  let registrationDone = () => {};
  const registered = new Promise((resolve) => { registrationDone = resolve; });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (update.qr) registrationDone();

    if (connection === 'connecting') {
      record.state = 'connecting';
      console.log(`🔄 [${number}] Connecting...`);
    }
    if (connection === 'open') {
      record.state = 'open';
      console.log(`✅ [${number}] Connected!`);
      const ownerJid = settings.ownerNumber + '@s.whatsapp.net';
      sock.sendMessage(ownerJid, { text: `✅ *${settings.botName} Connected!*` }).catch(() => {});
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : null;
      if (statusCode === DisconnectReason.loggedOut) {
        record.state = 'loggedOut';
        console.log(`🚪 [${number}] Logged out.`);
      } else {
        record.state = 'close';
        console.log(`⚠️  [${number}] Connection closed. Reconnecting...`);
        connectSession(number).catch((err) =>
          console.error(`Failed to resume ${number}:`, err.message)
        );
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      try {
        if (!msg.message) continue;
        const jid = msg.key.remoteJid;
        if (jid === 'status@broadcast') {
          await handleStatusUpdate(sock, msg);
          continue;
        }
        if (msg.message.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
          await handleRevoke(sock, msg);
          continue;
        }
        cacheMessage(msg);
        record.antideleteCache.push(msg);
        if (record.antideleteCache.length > 500) record.antideleteCache.shift();
        await handleMessage(sock, msg, record);
      } catch (err) {
        console.error(`[${number}] Msg Loop Error:`, err);
      }
    }
  });

  // Wait until registration completes before returning (needed for pairing),
  // with a 30s safety timeout so a dead socket never hangs the caller.
  await Promise.race([
    registered,
    new Promise((resolve) => setTimeout(resolve, 30000))
  ]);

  return record;
}

function getBody(m) {
  if (!m.message) return '';
  const type = Object.keys(m.message)[0];
  if (type === 'conversation') return m.message.conversation;
  if (type === 'extendedTextMessage') return m.message.extendedTextMessage.text;
  if (type === 'imageMessage') return m.message.imageMessage.caption;
  if (type === 'videoMessage') return m.message.videoMessage.caption;
  if (type === 'ephemeralMessage') return getBody({ message: m.message.ephemeralMessage.message });
  if (type === 'viewOnceMessage') return getBody({ message: m.message.viewOnceMessage.message });
  if (type === 'viewOnceMessageV2') return getBody({ message: m.message.viewOnceMessageV2.message });
  if (type === 'templateMessage') return getBody({ message: m.message.templateMessage.hydratedFourRowTemplate || m.message.templateMessage.hydratedTemplate });
  if (type === 'buttonsMessage') return m.message.buttonsMessage.contentText;
  return '';
}

async function handleMessage(sock, msg, record) {
  const from = msg.key.remoteJid;
  const body = getBody(msg);
  if (!body) return;

  console.log(`📩 [${record.number}] [${from}] ${body.slice(0, 50)}`);

  const senderJid = isGroup(from) ? msg.key.participant : from;
  record.seenUsers.add(senderJid);

  if (isGroup(from)) {
    const blocked = await enforceAntilink(sock, msg, from, body, getGroupSettings);
    if (blocked) return;
  }

  const prefix = settings.prefix || '.';
  const text = body.trim().toLowerCase();

  // menu/ping/alive still work without a prefix (legacy/debug behaviour)
  const isDebugCmd = ['menu', 'ping', 'alive'].includes(text);
  const isNormalCmd = body.startsWith(prefix);
  if (!isNormalCmd && !isDebugCmd) return;

  const args = isNormalCmd ? body.slice(prefix.length).trim().split(/\s+/) : [text];
  const rawCmd = args.shift().toLowerCase();

  const command = commands.get(rawCmd);
  if (!command) {
    console.log(`❓ [${record.number}] Not found: ${rawCmd}`);
    return;
  }

  console.log(`🚀 [${record.number}] Run: ${command.name}`);
  try {
    await command.execute({ sock, msg, from, args, settings, record });
  } catch (e) {
    console.error(`Exec Error (${command.name}):`, e);
    await sock.sendMessage(from, { text: `❌ Error: ${e.message}` }).catch(() => {});
  }
}

/**
 * Called from the dashboard's "Request Pairing Code" button.
 */
async function requestPairingCode(rawNumber) {
  const number = sanitizeNumber(rawNumber);
  if (number.length < 8) {
    throw new Error('Enter a valid WhatsApp number with country code (digits only, no "+").');
  }

  const existing = sessions.get(number);
  if (existing?.sock?.authState?.creds?.registered) {
    throw new Error('This number is already paired and connected.');
  }
  if (sessions.size >= MAX_SESSIONS) {
    throw new Error(`This bot is full right now (${MAX_SESSIONS} accounts paired). Try again later.`);
  }

  const record = await connectSession(number);

  // Pairing code can only be requested AFTER registration completes (QR event),
  // otherwise WhatsApp throws "Connection Closed".
  await waitForRegistration(record.sock);

  return record.sock.requestPairingCode(number);
}

function waitForRegistration(sock) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      sock.ev.off('connection.update', onConnectionUpdate);
      resolve();
    }, 30000);
    const onConnectionUpdate = (update) => {
      if (update.qr) {
        clearTimeout(timer);
        sock.ev.off('connection.update', onConnectionUpdate);
        resolve();
      }
    };
    sock.ev.on('connection.update', onConnectionUpdate);
  });
}

function getSessionStatus(rawNumber) {
  const number = sanitizeNumber(rawNumber);
  const record = sessions.get(number);
  if (!record) return { state: 'unpaired', registered: false };
  return {
    state: record.state,
    registered: !!record.sock?.authState?.creds?.registered
  };
}

function getGlobalStats() {
  let activeSockets = 0;
  let totalUsers = 0;
  for (const record of sessions.values()) {
    if (record.state === 'open') activeSockets++;
    totalUsers += record.seenUsers.size;
  }
  return { activeSockets, totalUsers, totalSessions: sessions.size, maxSessions: MAX_SESSIONS };
}

/**
 * Resumes every previously-paired account so a restart/redeploy brings
 * everyone back online automatically.
 */
function resumeAll() {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const existingNumbers = fs.readdirSync(SESSIONS_DIR).filter((name) =>
    fs.existsSync(path.join(SESSIONS_DIR, name, 'auth', 'creds.json'))
  );

  for (const number of existingNumbers) {
    console.log(`↻ Resuming saved session for ${number}...`);
    connectSession(number).catch((err) =>
      console.error(`Failed to resume session ${number}:`, err.message)
    );
  }
}

module.exports = {
  requestPairingCode,
  getSessionStatus,
  getGlobalStats,
  resumeAll,
  MAX_SESSIONS,
  sanitizeNumber
};
