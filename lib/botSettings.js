const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'botSettings.json');

const DEFAULTS = {
  autoStatusView: (process.env.AUTO_STATUS_VIEW || 'true').toLowerCase() !== 'false',
  antidelete: true
};

/**
 * Bot-wide (not per-group) feature toggles, backed by a JSON file so a
 * `.autoviewstatus off` / `.antidelete off` survives a restart. Starting
 * values come from DEFAULTS above (autoStatusView still respects the
 * AUTO_STATUS_VIEW env var on first run, so existing deployments don't
 * change behaviour until someone actually flips the new command).
 */
function load() {
  try {
    if (!fs.existsSync(FILE)) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch (err) {
    console.error('botSettings: could not read store, using defaults:', err.message);
    return { ...DEFAULTS };
  }
}

function save(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('botSettings: could not save store:', err.message);
  }
}

let cache = load();

function getBotSettings() {
  return { ...cache };
}

function setBotSetting(key, value) {
  cache = { ...cache, [key]: value };
  save(cache);
}

module.exports = { getBotSettings, setBotSetting };
