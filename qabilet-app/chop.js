const sharp = require('sharp');
const fs = require('fs');

async function processImage() {
  const input = 'public/images/alphabet/reference.png';
  const output = 'public/images/alphabet/reference-wide.png';

  const metadata = await sharp(input).metadata();
  const cutY = Math.round(metadata.height * (3/5)); // cut after row 3

  // Extract top part
  const topPart = await sharp(input)
    .extract({ left: 0, top: 0, width: metadata.width, height: cutY })
    .toBuffer();

  // Extract bottom part
  const bottomPart = await sharp(input)
    .extract({ left: 0, top: cutY, width: metadata.width, height: metadata.height - cutY })
    .toBuffer();

  // We want to append bottomPart to the right of topPart.
  // The new width will be width * 2. The height will be cutY.
  // bottomPart is shorter than cutY, so we align it to the top.
  await sharp({
    create: {
      width: metadata.width * 2 + 10, // 10px gap
      height: cutY,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // white background
    }
  })
  .composite([
    { input: topPart, top: 0, left: 0 },
    { input: bottomPart, top: 0, left: metadata.width + 10 }
  ])
  .png()
  .toFile(output);

  console.log('Done!');
}

processImage().catch(console.error);
