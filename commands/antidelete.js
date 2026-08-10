const { getBotSettings, setBotSetting } = require('../lib/botSettings');

module.exports = {
  name: 'antidelete',
  aliases: ['ad'],
  description: 'Toggle deleted-message recovery (owner only) — usage: .antidelete on|off',
  execute: async ({ sock, msg, from, args }) => {
    if (!msg.key.fromMe) {
      await sock.sendMessage(from, { text: '❌ Only the bot owner can use this.' });
      return;
    }

    const choice = (args[0] || '').toLowerCase();
    if (choice !== 'on' && choice !== 'off') {
      const current = getBotSettings().antidelete;
      await sock.sendMessage(from, {
        text: `Anti-delete is currently *${current ? 'ON' : 'OFF'}*.\nUsage: .antidelete on | .antidelete off\n\n` +
          `Note: this only catches *"Delete for everyone"* — WhatsApp never notifies anyone (bots included) about a plain *"Delete for me"*, so that one can never be recovered by any bot.`
      });
      return;
    }

    setBotSetting('antidelete', choice === 'on');
    await sock.sendMessage(from, {
      text: choice === 'on'
        ? '🗑️ Anti-delete enabled.'
        : '🗑️ Anti-delete disabled.'
    });
  }
};
