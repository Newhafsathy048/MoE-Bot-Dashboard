const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'stats.json');

/**
 * Bridge between the WhatsApp sessions (lib/sessionManager.js) and the web
 * dashboard (lib/server.js). The browser — not the console — is the source
 * of truth for pairing.
 *
 * "Total users" is the set of distinct people (sender JIDs, not chat JIDs —
 * a group counts its participants, not itself) the bot has ever seen a
 * message from. Stored in data/stats.json so it survives a restart (though
 * not a full Railway rebuild, same as data/*.json elsewhere in this project).
 */
function loadUsers() {
  try {
    if (!fs.existsSync(FILE)) return new Set();
    const arr = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (err) {
    console.error('botState: could not read stats, starting fresh:', err.message);
    return new Set();
  }
}

function saveUsers() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify([...seenUsers]));
  } catch (err) {
    console.error('botState: could not save stats:', err.message);
  }
}

let connectionState = 'connecting'; // 'connecting' | 'open' | 'close' | 'loggedOut'
const seenUsers = loadUsers();

function setConnectionState(state) {
  connectionState = state;
}

function trackUser(jid) {
  if (!jid || typeof jid !== 'string') return;
  const sizeBefore = seenUsers.size;
  seenUsers.add(jid);
  if (seenUsers.size !== sizeBefore) saveUsers();
}

/**
 * Legacy helper kept for old command files that still reference botState
 * (menu/alive/ping). Commands now receive their socket via the `sock` in the
 * ctx passed from sessionManager, so this is only a convenience fallback.
 */
function getStatus() {
  return {
    state: connectionState,
    registered: false,
    activeSockets: 0,
    totalUsers: seenUsers.size
  };
}

module.exports = {
  setConnectionState,
  trackUser,
  getStatus
};
