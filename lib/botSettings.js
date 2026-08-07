const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  autoStatusView: (process.env.AUTO_STATUS_VIEW || 'true').toLowerCase() !== 'false',
  antidelete: true
};

/**
 * Per-account bot-wide toggles (antidelete, auto status view), backed by a
 * JSON file inside that account's OWN session folder. Each paired number
 * gets its own store, so `.antidelete off` on one number never touches
 * anyone else's paired bot.
 */
function createBotSettingsStore(sessionDir) {
  const file = path.join(sessionDir, 'botSettings.json');

  function load() {
    try {
      if (!fs.existsSync(file)) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
    } catch (err) {
      console.error('botSettings: could not read store, using defaults:', err.message);
      return { ...DEFAULTS };
    }
  }

  function save(data) {
    try {
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('botSettings: could not save store:', err.message);
    }
  }

  let cache = load();

  return {
    getBotSettings: () => ({ ...cache }),
    setBotSetting: (key, value) => {
      cache = { ...cache, [key]: value };
      save(cache);
    }
  };
}

module.exports = { createBotSettingsStore };
