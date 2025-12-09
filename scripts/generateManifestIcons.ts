import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';

async function generateManifestIcons() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const svgPath = join(process.cwd(), 'public', 'favicon.svg');
  const svgContent = readFileSync(svgPath, 'utf-8');

  const sizes = [
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    console.log(`Generating ${name} (${size}x${size})...`);

    await page.setViewport({ width: size, height: size });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body { width: ${size}px; height: ${size}px; }
            svg { width: 100%; height: 100%; }
          </style>
        </head>
        <body>${svgContent}</body>
      </html>
    `);

    const outputPath = join(process.cwd(), 'public', name);
    await page.screenshot({
      path: outputPath,
      type: 'png',
      omitBackground: false,
    });

    console.log(`✓ Created ${outputPath}`);
  }

  await browser.close();
  console.log('\nManifest icons generated successfully!');
}

generateManifestIcons().catch(console.error);
