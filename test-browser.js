const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => {
    errors.push(err.message);
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  if (errors.length > 0) {
    console.log("Browser errors:", errors);
  } else {
    console.log("No browser errors!");
  }
  await browser.close();
})();
