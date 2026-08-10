const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const os = require('os');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

async function imageToWebp(buffer) {
  return sharp(buffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp()
    .toBuffer();
}

async function videoToWebp(buffer) {
  const tmpIn = path.join(os.tmpdir(), `moe-sticker-${Date.now()}-in.mp4`);
  const tmpOut = path.join(os.tmpdir(), `moe-sticker-${Date.now()}-out.webp`);

  fs.writeFileSync(tmpIn, buffer);

  await new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0',
        '-loop', '0',
        '-an',
        '-vsync', '0',
        '-t', '00:00:08'
      ])
      .toFormat('webp')
      .save(tmpOut)
      .on('end', resolve)
      .on('error', reject);
  });

  const out = fs.readFileSync(tmpOut);
  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
  return out;
}

module.exports = { imageToWebp, videoToWebp };
