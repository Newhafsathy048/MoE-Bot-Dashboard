const axios = require('axios');

async function extractFbVideoUrl(link) {
  const { data: html } = await axios.get(link, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    },
    timeout: 20000
  });

  const hd = html.match(/"browser_native_hd_url":"(.*?)"/);
  const sd = html.match(/"browser_native_sd_url":"(.*?)"/);
  const raw = (hd && hd[1]) || (sd && sd[1]);
  if (!raw) return null;

  return raw.replace(/\\u0025/g, '%').replace(/\\\//g, '/').replace(/&amp;/g, '&');
}

module.exports = {
  name: 'fb',
  aliases: ['facebook'],
  description: 'Download a public Facebook video (usage: .fb <link>)',
  execute: async ({ sock, from, args }) => {
    const url = args[0];
    if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch'))) {
      await sock.sendMessage(from, { text: 'Usage: .fb <facebook video link>' });
      return;
    }

    await sock.sendMessage(from, { text: '⏳ Fetching video...' });

    try {
      const videoUrl = await extractFbVideoUrl(url);
      if (!videoUrl) throw new Error('No video URL found on page');

      await sock.sendMessage(from, { video: { url: videoUrl } });
    } catch (err) {
      console.error('Facebook download error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not download that Facebook video. Make sure the link points to a public video.'
      });
    }
  }
};
