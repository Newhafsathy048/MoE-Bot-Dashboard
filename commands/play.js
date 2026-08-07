const ytSearch = require('yt-search');
const ytdl = require('@distube/ytdl-core');

module.exports = {
  name: 'play',
  aliases: ['song'],
  description: 'Search & send a YouTube audio track (usage: .play <song name>)',
  execute: async ({ sock, from, args }) => {
    const query = args.join(' ');
    if (!query) {
      await sock.sendMessage(from, { text: 'Usage: .play <song name>' });
      return;
    }

    await sock.sendMessage(from, { text: `🔎 Searching for "${query}"...` });

    try {
      const { videos } = await ytSearch(query);
      if (!videos?.length) {
        await sock.sendMessage(from, { text: '❌ No results found.' });
        return;
      }

      const video = videos[0];
      await sock.sendMessage(from, {
        text: `🎵 *${video.title}*\n⏱️ ${video.timestamp}\n👤 ${video.author.name}\n\n⏳ Downloading audio...`
      });

      const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);

      await sock.sendMessage(from, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${video.title}.mp3`
      });
    } catch (err) {
      console.error('Play command error:', err.message);
      await sock.sendMessage(from, {
        text: '❌ Could not download that track. YouTube frequently changes its site and breaks downloaders — try again later or search for a different song.'
      });
    }
  }
};
