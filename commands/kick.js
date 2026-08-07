const { isGroup, isAuthorized, getTargetJid } = require('../lib/groupHelpers');

module.exports = {
  name: 'kick',
  aliases: ['remove'],
  description: 'Remove a member from the group (admin only) — reply to their message or @mention them with .kick',
  execute: async ({ sock, msg, from }) => {
    if (!isGroup(from)) {
      await sock.sendMessage(from, { text: 'This command only works inside a group.' });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    const target = getTargetJid(msg);

    if (!target) {
      await sock.sendMessage(from, {
        text: 'Reply to the person\'s message or @mention them, e.g. *.kick @user*.'
      });
      return;
    }

    try {
      if (!(await isAuthorized(sock, msg, from, senderId))) {
        await sock.sendMessage(from, { text: '❌ Only group admins can use .kick.' });
        return;
      }

      await sock.groupParticipantsUpdate(from, [target], 'remove');
      await sock.sendMessage(from, { text: `✅ Removed @${target.split('@')[0]}`, mentions: [target] });
    } catch (err) {
      console.error('Kick error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not remove that member. The bot needs to be an admin in this group for this to work.'
      });
    }
  }
};
