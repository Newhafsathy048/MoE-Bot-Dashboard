const { isGroup, isAuthorized } = require('../lib/groupHelpers');
const { getGroupSettings, setGroupSetting } = require('../lib/groupSettings');

module.exports = {
  name: 'welcome',
  aliases: ['greet'],
  description: 'Toggle auto welcome/goodbye messages for this group (admin only) — usage: .welcome on|off',
  execute: async ({ sock, msg, from, args }) => {
    if (!isGroup(from)) {
      await sock.sendMessage(from, { text: 'This command only works inside a group.' });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    if (!(await isAuthorized(sock, msg, from, senderId))) {
      await sock.sendMessage(from, { text: '❌ Only group admins can use .welcome.' });
      return;
    }

    const choice = (args[0] || '').toLowerCase();
    if (choice !== 'on' && choice !== 'off') {
      const current = getGroupSettings(from).welcome;
      await sock.sendMessage(from, {
        text: `Welcome/goodbye messages are currently *${current ? 'ON' : 'OFF'}* in this group.\nUsage: .welcome on | .welcome off`
      });
      return;
    }

    setGroupSetting(from, 'welcome', choice === 'on');
    await sock.sendMessage(from, {
      text: choice === 'on'
        ? '👋 Welcome/goodbye messages enabled for this group.'
        : '👋 Welcome/goodbye messages disabled.'
    });
  }
};
