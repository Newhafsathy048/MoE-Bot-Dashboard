const { isGroup, isAuthorized } = require('../lib/groupHelpers');

module.exports = {
  name: 'hidetag',
  aliases: ['ht'],
  description: 'Ping every member silently, without listing names (admin only) — usage: .hidetag <message>',
  execute: async ({ sock, msg, from, args }) => {
    if (!isGroup(from)) {
      await sock.sendMessage(from, { text: 'This command only works inside a group.' });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;

    try {
      if (!(await isAuthorized(sock, msg, from, senderId))) {
        await sock.sendMessage(from, { text: '❌ Only group admins can use .hidetag.' });
        return;
      }

      const meta = await sock.groupMetadata(from);
      const participants = meta.participants.map((p) => p.id);
      const text = args.join(' ') || '📢';

      // Same mentions array as .tagall, but the message body never lists
      // the numbers — WhatsApp still notifies everyone included in `mentions`.
      await sock.sendMessage(from, { text, mentions: participants });
    } catch (err) {
      console.error('Hidetag error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not tag everyone. Make sure the bot is a member of this group.'
      });
    }
  }
};
