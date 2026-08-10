const { isGroup, isAuthorized, getTargetJid } = require('../lib/groupHelpers');

module.exports = {
  name: 'demote',
  aliases: ['unadmin'],
  description: 'Remove admin rights from a member (admin only) — reply to their message or @mention them with .demote',
  execute: async ({ sock, msg, from }) => {
    if (!isGroup(from)) {
      await sock.sendMessage(from, { text: 'This command only works inside a group.' });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;
    const target = getTargetJid(msg);

    if (!target) {
      await sock.sendMessage(from, {
        text: 'Reply to the person\'s message or @mention them, e.g. *.demote @user*.'
      });
      return;
    }

    try {
      if (!(await isAuthorized(sock, msg, from, senderId))) {
        await sock.sendMessage(from, { text: '❌ Only group admins can use .demote.' });
        return;
      }

      await sock.groupParticipantsUpdate(from, [target], 'demote');
      await sock.sendMessage(from, {
        text: `✅ @${target.split('@')[0]} is no longer an admin.`,
        mentions: [target]
      });
    } catch (err) {
      console.error('Demote error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not demote that member. The bot needs to be an admin in this group for this to work.'
      });
    }
  }
};
