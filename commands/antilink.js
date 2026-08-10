const { isGroup, isAuthorized } = require('../lib/groupHelpers');
const { getGroupSettings, setGroupSetting } = require('../lib/groupSettings');

module.exports = {
  name: 'antilink',
  aliases: ['antilinks'],
  description: 'Auto-delete WhatsApp group invite links from non-admins (admin only) — usage: .antilink on|off',
  execute: async ({ sock, msg, from, args }) => {
    if (!isGroup(from)) {
      await sock.sendMessage(from, { text: 'This command only works inside a group.' });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    if (!(await isAuthorized(sock, msg, from, senderId))) {
      await sock.sendMessage(from, { text: '❌ Only group admins can use .antilink.' });
      return;
    }

    const choice = (args[0] || '').toLowerCase();
    if (choice !== 'on' && choice !== 'off') {
      const current = getGroupSettings(from).antilink;
      await sock.sendMessage(from, {
        text: `Antilink is currently *${current ? 'ON' : 'OFF'}* in this group.\nUsage: .antilink on | .antilink off`
      });
      return;
    }

    setGroupSetting(from, 'antilink', choice === 'on');
    await sock.sendMessage(from, {
      text: choice === 'on'
        ? '🔗 Antilink enabled. Group invite links from non-admins will be deleted automatically.'
        : '🔗 Antilink disabled.'
    });
  }
};
