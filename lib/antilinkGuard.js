const { isSenderAdmin } = require('./groupHelpers');
const { getGroupSettings } = require('./groupSettings');

const INVITE_LINK = /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;

/**
 * Runs on every message in a group. If antilink is enabled for that group
 * and a non-admin posted a WhatsApp group invite link, deletes the message
 * and warns the sender. Returns true when it has handled (and blocked) the
 * message — the caller should stop processing it any further (e.g. not
 * also treat it as a command).
 */
async function enforceAntilink(sock, msg, from, body) {
  if (!getGroupSettings(from).antilink) return false;
  if (!INVITE_LINK.test(body)) return false;

  const senderId = msg.key.participant || msg.key.remoteJid;

  // Never act on the owner (self-bot: owner messages are fromMe:true) or
  // on an actual group admin sharing their own group's invite link.
  if (msg.key.fromMe || (await isSenderAdmin(sock, from, senderId))) return false;

  try {
    await sock.sendMessage(from, { delete: msg.key });
  } catch (err) {
    console.error('Antilink: could not delete message (is the bot an admin here?):', err.message);
  }

  await sock.sendMessage(from, {
    text: `🔗 @${senderId.split('@')[0]}, group invite links aren't allowed here.`,
    mentions: [senderId]
  });

  return true;
}

module.exports = { enforceAntilink };
