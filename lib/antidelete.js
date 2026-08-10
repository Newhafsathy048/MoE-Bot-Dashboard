const { getBotSettings } = require('./botSettings');

const MAX_CACHE_SIZE = 500;
const cache = new Map();

function extractContent(message) {
  if (!message) return null;
  if (message.conversation) return { type: 'text', text: message.conversation };
  if (message.extendedTextMessage) return { type: 'text', text: message.extendedTextMessage.text || '' };
  if (message.imageMessage) return { type: 'image', text: message.imageMessage.caption || '' };
  if (message.videoMessage) return { type: 'video', text: message.videoMessage.caption || '' };
  if (message.stickerMessage) return { type: 'sticker', text: '' };
  if (message.audioMessage) return { type: 'audio', text: '' };
  if (message.documentMessage) return { type: 'document', text: message.documentMessage.fileName || '' };
  return null;
}

/**
 * Caches every incoming message's text/caption in memory so it can be
 * recovered if the sender deletes it. In-memory only (clears on restart) —
 * keeps things simple and avoids writing chat content to disk.
 */
function cacheMessage(msg) {
  if (!getBotSettings().antidelete) return;
  if (!msg?.key?.id || msg.key.remoteJid === 'status@broadcast') return;

  const content = extractContent(msg.message);
  if (!content) return;

  if (cache.size >= MAX_CACHE_SIZE) {
    cache.delete(cache.keys().next().value);
  }

  cache.set(msg.key.id, {
    jid: msg.key.remoteJid,
    sender: msg.key.participant || msg.key.remoteJid,
    ...content,
    timestamp: Date.now()
  });
}

/**
 * Called when a protocolMessage of type REVOKE (message deletion) arrives.
 * Reposts the cached original content into the same chat, if we still have it.
 */
async function handleRevoke(sock, msg) {
  if (!getBotSettings().antidelete) return;

  const revokedKey = msg.message?.protocolMessage?.key;
  if (!revokedKey?.id) return;

  const original = cache.get(revokedKey.id);
  if (!original) return;

  const senderTag = original.sender.split('@')[0];
  const typeLabel = original.type === 'text' ? '' : ` [${original.type}]`;
  const body = original.text?.trim() ? original.text : '(no text content)';

  try {
    await sock.sendMessage(original.jid, {
      text: `🗑️ *Anti-Delete*\n👤 @${senderTag} deleted a message${typeLabel}:\n\n${body}`,
      mentions: [original.sender]
    });
  } catch (err) {
    console.error('Anti-delete send error:', err.message);
  }

  cache.delete(revokedKey.id);
}

module.exports = { cacheMessage, handleRevoke };
