const { isGroup, isAuthorized } = require('../lib/groupHelpers');

module.exports = {
  name: 'tagall',
  aliases: ['all'],
  description: 'Mention every member of the group (admin only) — usage: .tagall <message>',
  execute: async ({ sock, msg, from, args }) => {
    if (!isGroup(from)) {
      await sock.sendMessage(from, { text: 'This command only works inside a group.' });
      return;
    }

    const senderId = msg.key.participant || msg.key.remoteJid;

    try {
      if (!(await isAuthorized(sock, msg, from, senderId))) {
        await sock.sendMessage(from, { text: '❌ Only group admins can use .tagall.' });
        return;
      }

      const meta = await sock.groupMetadata(from);
      const participants = meta.participants.map((p) => p.id);
      const note = args.join(' ');
      const lines = participants.map((jid) => `• @${jid.split('@')[0]}`);
      const text = `📢 *Tag All*${note ? `\n${note}` : ''}\n\n${lines.join('\n')}`;

      await sock.sendMessage(from, { text, mentions: participants });
    } catch (err) {
      console.error('Tagall error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not tag everyone. Make sure the bot is a member of this group.'
      });
    }
  }
};
