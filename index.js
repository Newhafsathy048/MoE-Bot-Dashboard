const chalk = require('chalk');
const settings = require('./settings');
const { startServer } = require('./lib/server');
const sessionManager = require('./lib/sessionManager');

console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.green.bold(`   ${settings.botName} — WhatsApp Bot`));
console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk.white(`Maintainer   : ${settings.ownerName} (${settings.email})`));
console.log(chalk.white(`Max accounts : ${sessionManager.MAX_SESSIONS} (set MAX_SESSIONS to change)`));
console.log(chalk.white(`Pairing      : open the web dashboard — every visitor pairs their own number there`));
console.log(chalk.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

// No interactive terminal prompts anywhere in this file — hosting panels
// (Railway, KataBump, Pterodactyl, etc.) don't provide a real stdin, and
// trying to read from it crashes the process with ERR_USE_AFTER_CLOSE.
//
// This bot supports MULTIPLE independently paired WhatsApp accounts at
// once — see lib/sessionManager.js. Every visitor to the dashboard
// (public/index.html → POST /api/pair) pairs their own number there and
// gets their own isolated bot (own session, own stats) running in this
// same process. Nothing here is tied to a single owner number, and there
// is no QR code fallback — pairing code only.

startServer(settings);
sessionManager.resumeAll();
