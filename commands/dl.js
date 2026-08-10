const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'dl',
  aliases: ['download', 'mp3', 'mp4'],
  description: 'Download media from social media (Insta, FB, YT, TikTok) and optionally convert to audio (usage: .dl <link> [mp3])',
  execute: async ({ sock, from, args }) => {
    const url = args[0];
    const format = args[1]?.toLowerCase();
    
    if (!url) {
      await sock.sendMessage(from, { text: 'Usage: .dl <link> [mp3]\nExample: .dl https://youtube.com/watch?v=xxx mp3' });
      return;
    }

    await sock.sendMessage(from, { text: `⏳ Processing your request... ${format === 'mp3' ? 'converting to audio' : 'fetching video'}` });

    const fileName = `dl_${Date.now()}`;
    const outputPath = path.join(__dirname, '../assets', fileName);
    
    // Command to download using yt-dlp
    let command;
    if (format === 'mp3') {
      command = `yt-dlp -x --audio-format mp3 -o "${outputPath}.%(ext)s" "${url}"`;
    } else {
      command = `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${outputPath}.%(ext)s" "${url}"`;
    }

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('yt-dlp error:', error);
        await sock.sendMessage(from, { text: '❌ Error: Could not download the media. Make sure the link is valid and public.' });
        return;
      }

      // Find the downloaded file
      const files = fs.readdirSync(path.join(__dirname, '../assets'));
      const downloadedFile = files.find(f => f.startsWith(fileName));

      if (!downloadedFile) {
        await sock.sendMessage(from, { text: '❌ Error: File not found after download.' });
        return;
      }

      const filePath = path.join(__dirname, '../assets', downloadedFile);

      try {
        if (format === 'mp3') {
          await sock.sendMessage(from, { 
            audio: { url: filePath }, 
            mimetype: 'audio/mpeg',
            fileName: 'audio.mp3'
          });
        } else {
          await sock.sendMessage(from, { 
            video: { url: filePath },
            caption: 'Downloaded via MoE-Bot'
          });
        }
        
        // Delete file after sending
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (sendError) {
        console.error('Send error:', sendError);
        await sock.sendMessage(from, { text: '❌ Error: Failed to send the file.' });
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    });
  }
};
