const { instagramGetUrl } = require('instagram-url-direct');

module.exports = {
  name: 'ig',
  aliases: ['instagram'],
  description: 'Download an Instagram photo/video post or reel (usage: .ig <link>)',
  execute: async ({ sock, from, args }) => {
    const url = args[0];
    if (!url || !url.includes('instagram.com')) {
      await sock.sendMessage(from, { text: 'Usage: .ig <instagram post/reel link>' });
      return;
    }

    await sock.sendMessage(from, { text: '⏳ Fetching media...' });

    try {
      const data = await instagramGetUrl(url);
      const media = data?.media_details?.[0];
      if (!media?.url) throw new Error('No media found in response');

      if (media.type === 'video') {
        await sock.sendMessage(from, { video: { url: media.url } });
      } else {
        await sock.sendMessage(from, { image: { url: media.url } });
      }
    } catch (err) {
      console.error('Instagram download error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not download that Instagram link. It may be private, a Story (not supported), or the account is rate-limiting requests.'
      });
    }
  }
};
