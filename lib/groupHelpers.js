const { jidNormalizedUser } = require('@whiskeysockets/baileys');

/** Every WhatsApp group JID ends in "@g.us" (a 1-to-1 chat ends in "@s.whatsapp.net"). */
function isGroup(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

async function isSenderAdmin(sock, groupJid, senderJid) {
  if (!senderJid) return false;
  const meta = await sock.groupMetadata(groupJid);
  const target = jidNormalizedUser(senderJid);
  const participant = meta.participants.find((p) => jidNormalizedUser(p.id) === target);
  return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

async function isBotAdmin(sock, groupJid) {
  return isSenderAdmin(sock, groupJid, sock.user.id);
}

/**
 * Gate for group-management commands: either the owner acting from their
 * own linked phone (this is a self-bot, so that's msg.key.fromMe), or a
 * real admin of the group the command was sent in.
 */
async function isAuthorized(sock, msg, groupJid, senderJid) {
  if (msg.key.fromMe) return true;
  return isSenderAdmin(sock, groupJid, senderJid);
}

/**
 * The user a command targets: whoever is @mentioned, or whoever's message
 * is being replied to. Returns null if the command was given neither.
 */
function getTargetJid(msg) {
  const context = msg.message?.extendedTextMessage?.contextInfo;
  if (context?.mentionedJid?.length) return context.mentionedJid[0];
  if (context?.participant) return context.participant;
  return null;
}

module.exports = { isGroup, isSenderAdmin, isBotAdmin, isAuthorized, getTargetJid };
