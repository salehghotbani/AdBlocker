// Development utility: resize the source logo once; production builds copy PNGs.
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('docs/images/logo.png', root));
await mkdir(new URL('extension/icons/', root), { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true, args: ['--no-sandbox']
});
try {
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    const png = await page.evaluate(async ({ source, size }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${source}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, size, size);
      return canvas.toDataURL('image/png').split(',')[1];
    }, { source: source.toString('base64'), size });
    const target = new URL(`extension/icons/${size}.png`, root);
    await writeFile(target, Buffer.from(png, 'base64'));
    console.log(`Logo: ${size}px → ${fileURLToPath(target)}`);
  }
} finally { await browser.close(); }
