module.exports = {
  name: 'owner',
  aliases: ['contact', 'developer'],
  description: 'Get the bot owner contact info',
  execute: async ({ sock, from, settings }) => {
    const vcard =
      'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      `FN:${settings.ownerName}\n` +
      `ORG:${settings.botName};\n` +
      `TEL;type=CELL;type=VOICE;waid=${settings.ownerNumber}:+${settings.ownerNumber}\n` +
      'END:VCARD';

    await sock.sendMessage(from, {
      contacts: { displayName: settings.ownerName, contacts: [{ vcard }] }
    });

    await sock.sendMessage(from, {
      text:
        `👤 *${settings.ownerName}*\n` +
        `📱 WhatsApp : ${settings.whatsappLink}\n` +
        `✉️ Email    : ${settings.email}\n` +
        `🔗 GitHub   : ${settings.github}`
    });
  }
};
