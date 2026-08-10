const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'vv',
  aliases: ['viewonce', 'retrive'],
  description: 'Reveal a View Once message (reply to a view once image/video with .vv)',
  execute: async ({ sock, msg, from }) => {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quoted) {
      await sock.sendMessage(from, { text: '❌ Please reply to a *View Once* message with *.vv*.' });
      return;
    }

    // View Once messages are wrapped in viewOnceMessage or viewOnceMessageV2
    const viewOnce = quoted.viewOnceMessageV2 || quoted.viewOnceMessage || quoted.viewOnceMessageV2Extension;
    const mediaMsg = viewOnce?.message || quoted; // Fallback to quoted if it's already the inner message

    const isImage = !!(mediaMsg.imageMessage || mediaMsg.viewOnceMessageV2?.message?.imageMessage || mediaMsg.viewOnceMessage?.message?.imageMessage);
    const isVideo = !!(mediaMsg.videoMessage || mediaMsg.viewOnceMessageV2?.message?.videoMessage || mediaMsg.viewOnceMessage?.message?.videoMessage);

    if (!isImage && !isVideo) {
      await sock.sendMessage(from, { text: '❌ The replied message is not a View Once image or video.' });
      return;
    }

    // Construct the actual media message object for downloading
    const actualMedia = mediaMsg.imageMessage || mediaMsg.videoMessage || 
                        mediaMsg.viewOnceMessageV2?.message?.imageMessage || 
                        mediaMsg.viewOnceMessageV2?.message?.videoMessage ||
                        mediaMsg.viewOnceMessage?.message?.imageMessage ||
                        mediaMsg.viewOnceMessage?.message?.videoMessage;

    await sock.sendMessage(from, { text: '⏳ Fetching View Once media...' });

    try {
      const buffer = await downloadMediaMessage(
        { 
          key: {
            remoteJid: msg.key.remoteJid,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId,
            participant: msg.message.extendedTextMessage.contextInfo.participant
          }, 
          message: mediaMsg 
        },
        'buffer',
        {}
      );

      if (isImage) {
        await sock.sendMessage(from, { image: buffer, caption: '✅ View Once revealed' });
      } else {
        await sock.sendMessage(from, { video: buffer, caption: '✅ View Once revealed' });
      }
    } catch (err) {
      console.error('View Once Reveal Error:', err);
      await sock.sendMessage(from, { text: '❌ Failed to reveal the View Once message. It might have expired or the bot could not download it.' });
    }
  }
};
