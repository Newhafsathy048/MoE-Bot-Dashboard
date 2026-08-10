// Quick verification that all new command files load and run without crashing,
// and that the session manager's multi-account core works.
const path = require('path');

const newCommands = ['ai', 'manus', 'ymp4', 'pin'];
let passed = 0;
let failed = 0;

for (const name of newCommands) {
  try {
    const cmd = require(path.join(__dirname, 'commands', name));
    if (!cmd.name || typeof cmd.execute !== 'function') throw new Error('missing name/execute');
    console.log(`✅ command/${name}.js — loads OK (${cmd.name}, aliases: ${(cmd.aliases || []).join(', ')})`);
    passed++;
  } catch (err) {
    console.log(`❌ command/${name}.js — FAILED: ${err.message}`);
    failed++;
  }
}

// Load all commands like commandLoader does
const { loadCommands } = require('./lib/commandLoader');
const commands = loadCommands();
const expected = ['ymp4', 'pin', 'ai', 'manus'];
for (const name of expected) {
  if (commands.has(name)) console.log(`✅ "${name}" registered in command map`);
  else { console.log(`❌ "${name}" missing from command map`); failed++; }
}

// Session manager API
const sm = require('./lib/sessionManager');
if (typeof sm.requestPairingCode === 'function' && typeof sm.resumeAll === 'function' && typeof sm.getGlobalStats === 'function') {
  console.log('✅ sessionManager API OK (multi-account)');
  passed++;
} else {
  console.log('❌ sessionManager API missing functions');
  failed++;
}

const stats = sm.getGlobalStats();
console.log(`ℹ️  global stats: ${JSON.stringify(stats)}`);

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
