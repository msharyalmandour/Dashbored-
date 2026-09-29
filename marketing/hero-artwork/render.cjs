const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// يرندر ملف HTML لصورة PNG، وبعدها يحوّلها WebP داخل المتصفح نفسه
// (canvas.toDataURL) لأن ما فيه أدوات صور مثبتة بالبيئة.
async function toWebp(browser, pngPath, webpPath, quality, maxWidth) {
  const page = await browser.newPage();
  const b64 = fs.readFileSync(pngPath).toString('base64');
  const dataUrl = await page.evaluate(async ({ b64, quality, maxWidth }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const scale = maxWidth && img.width > maxWidth ? maxWidth / img.width : 1;
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', quality);
  }, { b64, quality, maxWidth });
  fs.writeFileSync(webpPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await page.close();
}

module.exports = { toWebp };

if (require.main === module) {
  (async () => {
    const [, , htmlPath, outBase, w, h] = process.argv;
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
    const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
    await page.goto('file://' + path.resolve(htmlPath));
    await page.waitForTimeout(500);
    await page.screenshot({ path: outBase + '.png' });
    await toWebp(browser, outBase + '.png', outBase + '.webp', 0.86);
    await browser.close();
    console.log(fs.statSync(outBase + '.webp').size, 'bytes webp');
  })();
}
