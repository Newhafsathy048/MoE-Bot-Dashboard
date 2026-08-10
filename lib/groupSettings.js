const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'groupSettings.json');

/**
 * Tiny JSON-file-backed store for per-group toggles (antilink, welcome).
 * Loaded once into memory, written back to disk on every change so
 * settings survive a restart. Fine for the message volume a personal
 * bot sees — if this bot ever manages hundreds of busy groups, swap
 * this for a real database instead.
 */
function loadAll() {
  try {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    console.error('groupSettings: could not read store, starting fresh:', err.message);
    return {};
  }
}

function saveAll(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('groupSettings: could not save store:', err.message);
  }
}

let cache = loadAll();

function getGroupSettings(jid) {
  return { antilink: false, welcome: false, ...cache[jid] };
}

function setGroupSetting(jid, key, value) {
  cache[jid] = { ...cache[jid], [key]: value };
  saveAll(cache);
}

module.exports = { getGroupSettings, setGroupSetting };
