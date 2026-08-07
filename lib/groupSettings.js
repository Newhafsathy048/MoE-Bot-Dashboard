const fs = require('fs');
const path = require('path');

/**
 * Per-account store for per-group toggles (antilink, welcome). Each paired
 * number gets its own groupSettings.json inside its own session folder, so
 * one person's `.antilink on` in their group never touches another
 * person's groups or settings file.
 */
function createGroupSettingsStore(sessionDir) {
  const file = path.join(sessionDir, 'groupSettings.json');

  function loadAll() {
    try {
      if (!fs.existsSync(file)) return {};
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      console.error('groupSettings: could not read store, starting fresh:', err.message);
      return {};
    }
  }

  function saveAll(data) {
    try {
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('groupSettings: could not save store:', err.message);
    }
  }

  let cache = loadAll();

  return {
    getGroupSettings: (jid) => ({ antilink: false, welcome: false, ...cache[jid] }),
    setGroupSetting: (jid, key, value) => {
      cache[jid] = { ...cache[jid], [key]: value };
      saveAll(cache);
    }
  };
}

module.exports = { createGroupSettingsStore };
