const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'botSettings.json');

const DEFAULTS = {
  autoStatusView: (process.env.AUTO_STATUS_VIEW || 'true').toLowerCase() !== 'false',
  antidelete: true,
  groupCommandsEnabled: true,
  enabledCommands: {}
};

function load() {
  try {
    if (!fs.existsSync(FILE)) return { ...DEFAULTS };
    const stored = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return { ...DEFAULTS, ...stored, enabledCommands: { ...DEFAULTS.enabledCommands, ...(stored.enabledCommands || {}) } };
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
  return { ...cache, enabledCommands: { ...(cache.enabledCommands || {}) } };
}

function setBotSetting(key, value) {
  cache = { ...cache, [key]: value };
  save(cache);
}

function isCommandEnabled(name) {
  return cache.enabledCommands?.[String(name).toLowerCase()] !== false;
}

function setCommandEnabled(name, enabled) {
  const commandName = String(name || '').toLowerCase();
  if (!commandName) throw new Error('Command name is required.');
  const enabledCommands = { ...(cache.enabledCommands || {}), [commandName]: Boolean(enabled) };
  cache = { ...cache, enabledCommands };
  save(cache);
  return Boolean(enabled);
}

function areGroupCommandsEnabled() {
  return cache.groupCommandsEnabled !== false;
}

module.exports = { getBotSettings, setBotSetting, isCommandEnabled, setCommandEnabled, areGroupCommandsEnabled };
