const axios = require('axios');

module.exports = {
  name: 'tiktok',
  aliases: ['tt'],
  description: 'Download a TikTok video without watermark (usage: .tiktok <link>)',
  execute: async ({ sock, from, args }) => {
    const url = args[0];
    if (!url || !url.includes('tiktok.com')) {
      await sock.sendMessage(from, { text: 'Usage: .tiktok <tiktok video link>' });
      return;
    }

    await sock.sendMessage(from, { text: '⏳ Fetching video...' });

    try {
      const { data } = await axios.get('https://www.tikwm.com/api/', {
        params: { url },
        timeout: 20000
      });

      const videoUrl = data?.data?.play;
      if (!videoUrl) throw new Error('No video URL in response');

      await sock.sendMessage(from, {
        video: { url: videoUrl },
        caption: data.data.title || ''
      });
    } catch (err) {
      console.error('TikTok download error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not download that TikTok video. The link might be invalid, private, or the download service is temporarily down.'
      });
    }
  }
};
