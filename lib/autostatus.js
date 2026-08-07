const AUTO_REACT = (process.env.AUTO_STATUS_REACT || 'false').toLowerCase() === 'true';
const REACT_EMOJI = process.env.AUTO_STATUS_EMOJI || '💚';

/**
 * Auto-views (and optionally reacts to) contacts' WhatsApp status updates.
 * `getBotSettings` is the calling account's OWN store, passed in rather
 * than imported directly, so `.autoviewstatus on|off` stays a per-account
 * toggle in multi-account mode. (Auto-react stays env-var controlled;
 * it's off by default and wasn't part of what was asked to be a live
 * toggle.)
 */
async function handleStatusUpdate(sock, msg, getBotSettings) {
  if (msg.key.remoteJid !== 'status@broadcast') return;
  if (msg.key.fromMe) return; // nothing to "view" on your own posted status

  try {
    if (getBotSettings().autoStatusView) {
      await sock.readMessages([msg.key]);
    }

    if (AUTO_REACT && msg.key.participant) {
      await sock.sendMessage(
        'status@broadcast',
        { react: { text: REACT_EMOJI, key: msg.key } },
        { statusJidList: [msg.key.participant] }
      );
    }
  } catch (err) {
    console.error('Auto-status error:', err.message);
  }
}

module.exports = { handleStatusUpdate };
