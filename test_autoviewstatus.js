const assert = require('assert');
const fs = require('fs');
const path = require('path');

const settingsFile = path.join(__dirname, 'data', 'botSettings.json');
const originalSettings = fs.existsSync(settingsFile) ? fs.readFileSync(settingsFile) : null;

function cleanup() {
  if (originalSettings) {
    fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
    fs.writeFileSync(settingsFile, originalSettings);
  } else if (fs.existsSync(settingsFile)) {
    fs.unlinkSync(settingsFile);
  }
}

(async () => {
  try {
    const { handleStatusUpdate } = require('./lib/autostatus');
    const { setBotSetting } = require('./lib/botSettings');
    const command = require('./commands/autoviewstatus');
    const statusKey = {
      remoteJid: 'status@broadcast',
      id: 'STATUS-1',
      participant: '255700000001@s.whatsapp.net',
      fromMe: false
    };

    let reads = 0;
    let sent = 0;
    const sock = {
      readMessages: async (keys) => {
        assert.deepStrictEqual(keys, [statusKey]);
        reads++;
      },
      sendMessage: async () => { sent++; }
    };

    setBotSetting('autoStatusView', true);
    assert.strictEqual(await handleStatusUpdate(sock, { key: statusKey }), true);
    assert.strictEqual(reads, 1, 'status without msg.message must be marked read');
    assert.strictEqual(sent, 0, 'react is disabled by default');

    setBotSetting('autoStatusView', false);
    await handleStatusUpdate(sock, { key: { ...statusKey, id: 'STATUS-2' } });
    assert.strictEqual(reads, 1, 'disabled autoview must not mark status read');

    const replies = [];
    const commandSock = { sendMessage: async (_from, payload) => replies.push(payload.text) };
    await command.execute({
      sock: commandSock,
      msg: { key: { fromMe: true } },
      from: 'owner@s.whatsapp.net',
      args: ['on']
    });
    assert.strictEqual(replies[0], '👁️ Auto status view enabled.');

    console.log('✅ autoviewstatus regression tests passed');
  } finally {
    cleanup();
  }
})().catch((err) => {
  console.error('❌ autoviewstatus regression tests failed:', err);
  process.exitCode = 1;
});
