const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
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
const { createAntideleteStore } = require('./antidelete');
const { isGroup } = require('./groupHelpers');
const { createGroupSettingsStore } = require('./groupSettings');
const { createBotSettingsStore } = require('./botSettings');
const { enforceAntilink } = require('./antilinkGuard');

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');
const LEGACY_SESSION_DIR = path.join(__dirname, '..', 'session');
const MAX_SESSIONS = Math.max(1, parseInt(process.env.MAX_SESSIONS || '5', 10) || 5);

// Command definitions are pure functions of (ctx) — safe to load once and
// share across every paired account. What's account-specific (the socket,
// its settings stores, its caches) lives on each session record below.
const commands = loadCommands();

const sessions = new Map(); // sanitized number -> session record

function sanitizeNumber(raw) {
  return String(raw || '').replace(/[^0-9]/g, '');
}

/**
 * One-time upgrade path. Versions of this bot before multi-account support
 * kept a single top-level "session/" folder for one owner number. If that
 * folder exists and there are no per-number sessions yet, detect the
 * number from the saved creds and move it into sessions/<number>/auth/ so
 * whoever already paired doesn't have to pair again.
 */
function migrateLegacySession() {
  if (!fs.existsSync(LEGACY_SESSION_DIR)) return;
  if (fs.existsSync(SESSIONS_DIR) && fs.readdirSync(SESSIONS_DIR).length > 0) return;

  try {
    const credsPath = path.join(LEGACY_SESSION_DIR, 'creds.json');
    if (!fs.existsSync(credsPath)) return;

    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    const meId = creds?.me?.id || '';
    const number = sanitizeNumber(meId.split(':')[0].split('@')[0]);

    if (!number) {
      console.warn(chalk.yellow('⚠️  Found an old "session" folder but could not detect its number — pair again from the dashboard.'));
      return;
    }

    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    fs.renameSync(LEGACY_SESSION_DIR, path.join(SESSIONS_DIR, number, 'auth'));
    console.log(chalk.green(`✅ Migrated your old single-account session to sessions/${number}/ — no need to pair again.`));
  } catch (err) {
    console.error(chalk.red('Legacy session migration failed (you may need to re-pair):'), err.message);
  }
}

function getOrCreateRecord(number) {
  let record = sessions.get(number);
  if (record) return record;

  const dir = path.join(SESSIONS_DIR, number);
  const botSettingsStore = createBotSettingsStore(dir);
  const groupSettingsStore = createGroupSettingsStore(dir);
  const antideleteStore = createAntideleteStore(botSettingsStore.getBotSettings);

  record = {
    number,
    dir,
    sock: null,
    connectionState: 'connecting',
    seenUsers: new Set(),
    ...botSettingsStore,
    ...groupSettingsStore,
    ...antideleteStore
  };

  sessions.set(number, record);
  return record;
}

async function connectSession(number) {
  const record = getOrCreateRecord(number);
  const authDir = path.join(record.dir, 'auth');

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

  // A pairing code can only be requested once the socket's WebSocket has
  // actually connected — makeWASocket() returns immediately, before that
  // handshake finishes. Calling requestPairingCode() too early is what
  // throws "Connection Closed". Resolve once the FIRST connection.update
  // fires (proof the WS is alive), with a timeout as a safety net so a
  // socket that never reports anything doesn't hang the caller forever.
  let announceFirstUpdate = () => {};
  const firstUpdate = new Promise((resolve) => { announceFirstUpdate = resolve; });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    announceFirstUpdate();
    const { connection, lastDisconnect } = update;

    if (connection === 'connecting') {
      record.connectionState = 'connecting';
      console.log(chalk.yellow(`🔄 [${number}] Connecting to WhatsApp...`));
    }

    if (connection === 'open') {
      record.connectionState = 'open';
      console.log(chalk.green(`✅ [${number}] connected successfully!`));
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : null;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        record.connectionState = 'loggedOut';
        console.log(chalk.red(`🚪 [${number}] Logged out. Delete sessions/${number}/ to free that slot, or pair it again from the dashboard.`));
      } else {
        record.connectionState = 'close';
        console.log(chalk.red(`⚠️  [${number}] Connection closed. Reconnecting...`));
        connectSession(number);
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg?.message) continue;

      if (msg.key.remoteJid === 'status@broadcast') {
        await handleStatusUpdate(sock, msg, record.getBotSettings);
        continue;
      }

      if (msg.message.protocolMessage?.type === proto.Message.ProtocolMessage.Type.REVOKE) {
        await record.handleRevoke(sock, msg);
        continue;
      }

      record.cacheMessage(msg);

      try {
        await handleMessage(sock, msg, record);
      } catch (err) {
        console.error(chalk.red(`[${number}] Error handling message:`), err);
      }
    }
  });

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      if (!record.getGroupSettings(id).welcome) return;
      if (action !== 'add' && action !== 'remove') return;

      const meta = await sock.groupMetadata(id);
      for (const participant of participants) {
        const tag = `@${participant.split('@')[0]}`;
        const text = action === 'add'
          ? `👋 Welcome ${tag} to *${meta.subject}*! Glad to have you here.`
          : `👋 ${tag} has left the group. Goodbye!`;
        await sock.sendMessage(id, { text, mentions: [participant] });
      }
    } catch (err) {
      console.error(chalk.red('group-participants.update error:'), err.message);
    }
  });

  // See the comment above where firstUpdate is created: this is what
  // actually makes connectSession() wait for a live WebSocket before its
  // caller (requestPairingCode) tries to use the socket.
  await Promise.race([
    firstUpdate,
    new Promise((resolve) => setTimeout(resolve, 5000))
  ]);

  return record;
}

async function handleMessage(sock, msg, record) {
  const from = msg.key.remoteJid;
  const body =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    '';

  // Track the actual sender (the group participant, not the group itself)
  // against THIS account's own user set — never the global total directly;
  // getGlobalStats() sums these per-session sets on demand.
  const senderJid = isGroup(from) ? msg.key.participant : from;
  if (senderJid) record.seenUsers.add(senderJid);

  if (isGroup(from)) {
    const blocked = await enforceAntilink(sock, msg, from, body, record.getGroupSettings);
    if (blocked) return;
  }

  if (!body.startsWith(settings.prefix)) return;

  const [rawCmd, ...args] = body.slice(settings.prefix.length).trim().split(/\s+/);
  const command = commands.get((rawCmd || '').toLowerCase());
  if (!command) return;

  await command.execute({
    sock,
    msg,
    from,
    args,
    settings,
    getGroupSettings: record.getGroupSettings,
    setGroupSetting: record.setGroupSetting,
    getBotSettings: record.getBotSettings,
    setBotSetting: record.setBotSetting
  });
}

/**
 * Called from the dashboard's "Request Pairing Code" button. Throws with a
 * message that's safe to show directly in the UI.
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

  // A connection attempt for this number may already be in flight (e.g. the
  // page was refreshed after a first click) — reuse that socket instead of
  // opening a second one for the same number.
  if (existing?.sock) {
    return requestCodeWithRetry(existing.sock, number);
  }

  if (sessions.size >= MAX_SESSIONS) {
    throw new Error(`This bot is full right now (${MAX_SESSIONS} accounts connected). Try again later.`);
  }

  const record = await connectSession(number);
  return requestCodeWithRetry(record.sock, number);
}

/**
 * sock.requestPairingCode() can still throw "Connection Closed" on a brief
 * network hiccup even after connectSession()'s readiness wait. One retry
 * after a short pause clears most of those without making the person
 * click the button again themselves.
 */
async function requestCodeWithRetry(sock, number) {
  try {
    return await sock.requestPairingCode(number);
  } catch (err) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return sock.requestPairingCode(number);
  }
}

function getSessionStatus(rawNumber) {
  const number = sanitizeNumber(rawNumber);
  const record = sessions.get(number);
  if (!record) return { state: 'unpaired', registered: false };
  return {
    state: record.connectionState,
    registered: !!record.sock?.authState?.creds?.registered
  };
}

function getGlobalStats() {
  let activeSockets = 0;
  let totalUsers = 0;
  for (const record of sessions.values()) {
    if (record.connectionState === 'open') activeSockets++;
    totalUsers += record.seenUsers.size;
  }
  return { activeSockets, totalUsers, totalSessions: sessions.size, maxSessions: MAX_SESSIONS };
}

/**
 * Boots every previously-paired account (after migrating an old
 * single-account install, if found) so a restart or redeploy reconnects
 * everyone automatically — nobody has to revisit the dashboard just to
 * bring their own bot back online.
 */
async function init() {
  migrateLegacySession();

  if (!fs.existsSync(SESSIONS_DIR)) return;

  const existingNumbers = fs.readdirSync(SESSIONS_DIR).filter((name) =>
    fs.existsSync(path.join(SESSIONS_DIR, name, 'auth', 'creds.json'))
  );

  for (const number of existingNumbers) {
    console.log(chalk.cyan(`↻ Resuming saved session for ${number}...`));
    connectSession(number).catch((err) =>
      console.error(chalk.red(`Failed to resume session ${number}:`), err)
    );
  }
}

module.exports = {
  init,
  requestPairingCode,
  getSessionStatus,
  getGlobalStats,
  sanitizeNumber,
  MAX_SESSIONS
};
