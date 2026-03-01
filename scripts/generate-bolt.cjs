const sharp = require("sharp");
const path = require("path");

// A simple lightning bolt SVG at 16x16, gray color to match footer text
const boltSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <path d="M9.5 1L4 9h4l-1.5 6L13 7H9L9.5 1z" fill="#999999"/>
</svg>`;

async function main() {
  const outDir = path.join(__dirname, "..", "public");

  // 1x version (16x16)
  const buf1x = await sharp(Buffer.from(boltSvg))
    .png()
    .toBuffer();
  await sharp(buf1x).toFile(path.join(outDir, "bolt-icon.png"));

  // 2x version (32x32) for retina
  const boltSvg2x = boltSvg.replace('width="16"', 'width="32"').replace('height="16"', 'height="32"');
  const buf2x = await sharp(Buffer.from(boltSvg2x))
    .png()
    .toBuffer();
  await sharp(buf2x).toFile(path.join(outDir, "bolt-icon@2x.png"));

  console.log("Generated bolt-icon.png (16x16) and bolt-icon@2x.png (32x32)");

  // Output base64 for email embedding
  const base64 = buf2x.toString("base64");
  console.log(`\nBase64 length: ${base64.length} chars`);
  console.log(`Data URI: data:image/png;base64,${base64.substring(0, 40)}...`);
}

main().catch(console.error);
