const webpmux = require('node-webpmux');

/**
 * Injects WhatsApp sticker-pack EXIF metadata (pack name + author) into a
 * webp buffer. This is the standard TIFF/EXIF header WhatsApp expects —
 * without it the sticker still works, but shows no pack/author name.
 */
async function writeExif(webpBuffer, packname, author) {
  const img = new webpmux.Image();
  await img.load(webpBuffer);

  const json = {
    'sticker-pack-id': `com.moe.bot-${Date.now()}`,
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    emojis: ['🤖']
  };

  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
  const exif = Buffer.concat([exifHeader, jsonBuffer]);
  exif.writeUIntLE(jsonBuffer.length, 14, 4);

  img.exif = exif;
  return img.save(null);
}

module.exports = { writeExif };
