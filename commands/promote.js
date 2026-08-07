const { isGroup, isAuthorized, getTargetJid } = require('../lib/groupHelpers');

module.exports = {
  name: 'promote',
  aliases: ['admin'],
  description: 'Make a member a group admin (admin only) — reply to their message or @mention them with .promote',
  execute: async ({ sock, msg, from }) => {
    if (!isGroup(from)) {
      await sock.sendMessage(from, { text: 'This command only works inside a group.' });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    const target = getTargetJid(msg);

    if (!target) {
      await sock.sendMessage(from, {
        text: 'Reply to the person\'s message or @mention them, e.g. *.promote @user*.'
      });
      return;
    }

    try {
      if (!(await isAuthorized(sock, msg, from, senderId))) {
        await sock.sendMessage(from, { text: '❌ Only group admins can use .promote.' });
        return;
      }

      await sock.groupParticipantsUpdate(from, [target], 'promote');
      await sock.sendMessage(from, {
        text: `✅ @${target.split('@')[0]} is now an admin.`,
        mentions: [target]
      });
    } catch (err) {
      console.error('Promote error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not promote that member. The bot needs to be an admin in this group for this to work.'
      });
    }
  }
};
