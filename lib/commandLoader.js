const fs = require('fs');
const path = require('path');

/**
 * Loads every command file inside /commands.
 * Each command file must export: { name, aliases?, description, execute(ctx) }
 */
function loadCommands() {
  const commands = new Map();
  const dir = path.join(__dirname, '..', 'commands');

  if (!fs.existsSync(dir)) return commands;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    try {
      const cmd = require(path.join(dir, file));
      if (!cmd || !cmd.name || typeof cmd.execute !== 'function') {
        console.warn(`⚠️  Command file "${file}" is missing required fields ("name"/"execute"), skipping.`);
        continue;
      }
      commands.set(cmd.name.toLowerCase(), cmd);
      (cmd.aliases || []).forEach((alias) => commands.set(alias.toLowerCase(), cmd));
    } catch (err) {
      console.error(`❌ Failed to load command "${file}":`, err.message);
    }
  }

  return commands;
}

module.exports = { loadCommands };
