const { getBotSettings } = require('./botSettings');

const AUTO_REACT = (process.env.AUTO_STATUS_REACT || 'false').toLowerCase() === 'true';
const REACT_EMOJI = process.env.AUTO_STATUS_EMOJI || '💚';
const STATUS_JID = 'status@broadcast';

/**
 * Handle one incoming WhatsApp status message.
 *
 * Baileys may deliver status notifications with a missing `message` payload
 * (for example when the status is only a notification/update). The message
 * key is still enough for readMessages(), so this handler must not depend on
 * msg.message being present.
 */
async function handleStatusUpdate(sock, msg) {
  const key = msg?.key;
  if (!key || key.remoteJid !== STATUS_JID || key.fromMe) return false;

  const settings = getBotSettings();
  const errors = [];

  if (settings.autoStatusView && typeof sock.readMessages === 'function') {
    try {
      await sock.readMessages([key]);
    } catch (err) {
      errors.push(`view: ${err.message}`);
    }
  }

  if (AUTO_REACT && key.participant && typeof sock.sendMessage === 'function') {
    try {
      await sock.sendMessage(
        STATUS_JID,
        { react: { text: REACT_EMOJI, key } },
        { statusJidList: [key.participant] }
      );
    } catch (err) {
      errors.push(`react: ${err.message}`);
    }
  }

  if (errors.length) {
    console.error(`Auto-status error (${errors.join('; ')})`);
  }
  return true;
}

module.exports = { handleStatusUpdate, STATUS_JID };
