module.exports = {
  name: 'ping',
  aliases: ['speed'],
  description: 'Angalia speed ya bot',
  execute: async ({ sock, from }) => {
    const start = Date.now();
    await sock.sendMessage(from, { text: '🏓 Pinging...' });
    const ms = Date.now() - start;
    await sock.sendMessage(from, { text: `🏓 Pong! ${ms}ms` });
  }
};
