const path = require('path');

module.exports = {
  name: 'menu',
  aliases: ['help'],
  description: 'Show the list of available commands',
  execute: async ({ sock, from, settings }) => {
    const caption =
      `╭━━━『 *${settings.botName}* 』━━━╮\n` +
      `│ 👤 Owner   : ${settings.ownerName}\n` +
      `│ 📞 Number  : +${settings.ownerNumber}\n` +
      `│ 🧩 Version : ${settings.version}\n` +
      `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
      `📜 *Available Commands*\n` +
      `• ${settings.prefix}menu    — this list\n` +
      `• ${settings.prefix}ping    — check bot speed\n` +
      `• ${settings.prefix}alive   — check if the bot is online\n` +
      `• ${settings.prefix}owner   — get owner contact info\n` +
      `• ${settings.prefix}sticker — image/video → sticker\n` +
      `• ${settings.prefix}tiktok  — TikTok downloader\n` +
      `• ${settings.prefix}ig      — Instagram downloader\n` +
      `• ${settings.prefix}fb      — Facebook downloader\n` +
      `• ${settings.prefix}play    — YouTube audio search & download\n` +
      `• ${settings.prefix}ymp4    — YouTube video (MP4) download\n` +
      `• ${settings.prefix}pin     — Pinterest image search\n\n` +
      `🤖 *AI*\n` +
      `• ${settings.prefix}ai      — ask the AI anything\n` +
      `• ${settings.prefix}manus   — delegate a task to Manus AI\n\n` +
      `👑 *Group Management* (admin only)\n` +
      `• ${settings.prefix}tagall   — mention every member\n` +
      `• ${settings.prefix}hidetag  — silent mention-all\n` +
      `• ${settings.prefix}kick     — remove a member\n` +
      `• ${settings.prefix}promote  — make a member admin\n` +
      `• ${settings.prefix}demote   — remove admin rights\n` +
      `• ${settings.prefix}antilink — auto-delete invite links (on/off)\n` +
      `• ${settings.prefix}welcome  — auto welcome/goodbye (on/off)\n\n` +
      `🎉 *Fun*\n` +
      `• ${settings.prefix}8ball    — ask a yes/no question\n` +
      `• ${settings.prefix}quote    — random motivational quote\n\n` +
      `⚙️ *Settings* (owner only)\n` +
      `• ${settings.prefix}autoviewstatus — auto-view contacts' status (on/off)\n` +
      `• ${settings.prefix}antidelete     — recover deleted messages (on/off)\n\n` +
      `🔗 GitHub : ${settings.github}\n` +
      `✉️ Email  : ${settings.email}`;

    try {
      await sock.sendMessage(from, {
        image: { url: path.join(__dirname, '..', 'assets', 'menu.png') },
        caption
      });
      
      // Send the menu song
      await sock.sendMessage(from, {
        audio: { url: path.join(__dirname, '..', 'assets', 'menu_audio.m4a') },
        mimetype: 'audio/mp4',
        ptt: true // Send as a voice note for a better experience
      });
    } catch (err) {
      // Fall back to text-only if the image can't be read for any reason.
      await sock.sendMessage(from, { text: caption });
    }
  }
};
