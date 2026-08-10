const { getBotSettings, setBotSetting } = require('../lib/botSettings');

module.exports = {
  name: 'autoviewstatus',
  aliases: ['avs', 'autostatus'],
  description: 'Toggle auto-viewing contacts\' status updates (owner only) — usage: .autoviewstatus on|off',
  execute: async ({ sock, msg, from, args }) => {
    if (!msg.key.fromMe) {
      await sock.sendMessage(from, { text: '❌ Only the bot owner can use this.' });
      return;
    }

    const choice = (args[0] || '').toLowerCase();
    if (choice !== 'on' && choice !== 'off') {
      const current = getBotSettings().autoStatusView;
      await sock.sendMessage(from, {
        text: `Auto status view is currently *${current ? 'ON' : 'OFF'}*.\nUsage: .autoviewstatus on | .autoviewstatus off\n\n` +
          `Note: this only makes the bot mark statuses as viewed. For that view to actually show up to the person who posted it, *Read Receipts* must also be ON in your own WhatsApp: Settings → Privacy → Read Receipts.`
      });
      return;
    }

    setBotSetting('autoStatusView', choice === 'on');
    await sock.sendMessage(from, {
      text: choice === 'on'
        ? '👁️ Auto status view enabled.'
        : '👁️ Auto status view disabled.'
    });
  }
};
