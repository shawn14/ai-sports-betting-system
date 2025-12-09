import puppeteer from 'puppeteer';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function generateFavicons() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Read the SVG file
  const svgPath = join(process.cwd(), 'public', 'favicon.svg');
  const svgContent = readFileSync(svgPath, 'utf-8');

  // Sizes to generate
  const sizes = [
    { name: 'favicon.ico', size: 32, path: 'app' },
    { name: 'icon-16x16.png', size: 16, path: 'public' },
    { name: 'icon-32x32.png', size: 32, path: 'public' },
    { name: 'apple-icon.png', size: 180, path: 'public' },
  ];

  for (const { name, size, path: folder } of sizes) {
    console.log(`Generating ${name} (${size}x${size})...`);

    // Set viewport to the desired size
    await page.setViewport({ width: size, height: size });

    // Set SVG as page content
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

    // Take screenshot
    const outputPath = join(process.cwd(), folder, name);
    await page.screenshot({
      path: outputPath,
      type: name.endsWith('.ico') ? 'png' : 'png',
      omitBackground: false,
    });

    console.log(`✓ Created ${outputPath}`);
  }

  await browser.close();
  console.log('\nAll favicons generated successfully!');
}

generateFavicons().catch(console.error);
