const ytSearch = require('yt-search');
const ytdl = require('@distube/ytdl-core');

module.exports = {
  name: 'ymp4',
  aliases: ['ytvid', 'ytdl'],
  description: 'Download a YouTube video as MP4 (usage: .ymp4 <song/video name>)',
  execute: async ({ sock, from, args }) => {
    const query = args.join(' ');
    if (!query) {
      await sock.sendMessage(from, { text: 'Usage: .ymp4 <video name or URL>' });
      return;
    }

    await sock.sendMessage(from, { text: `🔎 Searching for "${query}"...` });

    try {
      let videoUrl = query;
      let meta = null;

      if (/^(https?:\/\/)?(www\.)?(youtube|youtu\.?be)/.test(query)) {
        // Direct URL — fetch metadata without searching
        meta = await ytdl.getBasicInfo(query);
        videoUrl = query;
      } else {
        const { videos } = await ytSearch(query);
        if (!videos?.length) {
          await sock.sendMessage(from, { text: '❌ No results found.' });
          return;
        }
        meta = videos[0];
        videoUrl = meta.url;
      }

      const title = meta.title || 'YouTube Video';
      const duration = meta.seconds
        ? `${Math.floor(meta.seconds / 60)}:${String(meta.seconds % 60).padStart(2, '0')}`
        : '';

      await sock.sendMessage(from, {
        text: `🎬 *${title}*${duration ? `\n⏱️ ${duration}` : ''}\n\n⏳ Downloading video (this can take a while)...`
      });

      const stream = ytdl(videoUrl, {
        filter: 'audioandvideo',
        quality: 'highest'
      });
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      await sock.sendMessage(from, {
        video: buffer,
        mimetype: 'video/mp4',
        caption: `🎬 *${title}*${duration ? `\n⏱️ ${duration}` : ''}`
      });
    } catch (err) {
      console.error('Ymp4 command error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not download that video. YouTube frequently changes its site and breaks downloaders — try again later or try a different video.'
      });
    }
  }
};
