const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const tokens = fs.readFileSync(path.join(root, 'shared/tokens.css'), 'utf8');
const defs = fs.readFileSync(path.join(root, 'shared/defs.svg.html'), 'utf8');
const outDir = path.join(root, 'output');
const tmpDir = path.join(outDir, '_tmp');
fs.mkdirSync(tmpDir, { recursive: true });

function wrap(bodyFragment) {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />
<style>${tokens}</style>
</head>
<body>
${defs}
${bodyFragment}
</body>
</html>`;
}

const postsDir = path.join(root, 'posts');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(postsDir).filter((f) => f.endsWith('.html')).sort();

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });

  for (const f of files) {
    const fragment = fs.readFileSync(path.join(postsDir, f), 'utf8');
    const html = wrap(fragment);
    const tmpFile = path.join(tmpDir, f);
    fs.writeFileSync(tmpFile, html);
    await page.goto('file://' + tmpFile);
    await page.waitForTimeout(400);
    const outName = f.replace('.html', '.png');
    await page.screenshot({ path: path.join(outDir, outName) });
    console.log('rendered', outName);
  }

  await browser.close();
})();
