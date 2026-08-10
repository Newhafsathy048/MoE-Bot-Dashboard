const axios = require('axios');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

module.exports = {
  name: 'pin',
  aliases: ['pinterest', 'pindl'],
  description: 'Search Pinterest and send a random matching image (usage: .pin <query>)',
  execute: async ({ sock, from, args }) => {
    const query = args.join(' ');
    if (!query) {
      await sock.sendMessage(from, { text: 'Usage: .pin <search query>' });
      return;
    }

    await sock.sendMessage(from, { text: `📌 Searching Pinterest for "${query}"...` });

    try {
      const results = await pinterestSearch(query);
      if (!results.length) {
        await sock.sendMessage(from, { text: '❌ No images found on Pinterest.' });
        return;
      }

      // Pick a random result for variety
      const image = results[Math.floor(Math.random() * results.length)];

      await sock.sendMessage(from, {
        image: { url: image.url },
        caption: `📌 *${image.title || query}*`
      });
    } catch (err) {
      console.error('Pin command error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not fetch Pinterest results. Try again or use different keywords.'
      });
    }
  }
};

/**
 * Searches Pinterest by loading the mobile-friendly id.pinterest.com search
 * page and extracting pin image URLs straight from the HTML. No API key
 * required. Pinterest only renders a limited number of pins in server HTML
 * (the rest loads via JS), so we try a couple of query variants.
 */
async function pinterestSearch(query) {
  const errors = [];
  const seen = new Set();
  const results = [];

  const variants = [
    { url: `https://id.pinterest.com/search/pins/?autologin=true&q=${encodeURIComponent(query)}`, title: query },
    { url: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`, title: query }
  ];

  for (const variant of variants) {
    try {
      const { data } = await axios.get(variant.url, {
        headers: {
          'User-Agent': UA,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 20000
      });

      // Pin image URLs in the server-rendered HTML look like:
      // https://i.pinimg.com/originals/xx/xx/xx/<hash>.jpg|png
      const matches = data.match(/https?:\/\/i\.pinimg\.com\/originals\/[a-z0-9A-Z\/.]+(?:jpg|jpeg|png|webp)/gi) || [];

      for (const url of matches) {
        if (seen.has(url)) continue;
        seen.add(url);
        results.push({ url, title: variant.title });
      }
    } catch (err) {
      errors.push(`${variant.url.split('/')[2]}: ${err.response?.status || err.code || err.message}`);
    }

    if (results.length >= 5) break; // enough variety
  }

  if (!results.length) {
    throw new Error(`Pinterest endpoints returned no images: ${errors.join('; ')}`);
  }

  return results;
}
