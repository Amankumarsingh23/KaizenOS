/**
 * Run once to generate PNG icons from icon.svg:
 *   node scripts/generate-icons.mjs
 *
 * Requires: npm install --save-dev sharp
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath   = join(__dirname, "../public/icon.svg");
const svg       = readFileSync(svgPath);

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of SIZES) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(__dirname, `../public/icon-${size}.png`));
  console.log(`✓ icon-${size}.png`);
}

// Apple touch icon (180x180)
await sharp(svg).resize(180, 180).png()
  .toFile(join(__dirname, "../public/icon-apple.png"));
console.log("✓ icon-apple.png");
