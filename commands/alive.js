module.exports = {
  name: 'alive',
  aliases: ['status'],
  description: 'Check bot status and uptime',
  execute: async ({ sock, from, settings }) => {
    const uptimeSec = Math.floor(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;

    const text =
      `✅ *${settings.botName}* is online and running!\n\n` +
      `⏱️ Uptime : ${h}h ${m}m ${s}s\n` +
      `👤 Owner  : ${settings.ownerName}`;

    await sock.sendMessage(from, { text });
  }
};
