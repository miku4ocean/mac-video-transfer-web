// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SAMPLE = path.join(__dirname, 'fixtures', 'sample.mp4');

test.describe('安全：檔名 XSS、非影片檔、檔名淨化', () => {
  test('惡意檔名不會被當成 HTML 執行', async ({ page }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mvt-'));
    const evil = path.join(dir, '"><img src=x onerror=window.__xss=1>.mp4');
    fs.copyFileSync(SAMPLE, evil);
    await page.goto('/index.html');
    await page.locator('#fileInput').setInputFiles(evil);
    await expect(page.locator('#fileListContainer')).toBeVisible();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.locator('#fileList img[src="x"]').count()).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('副檔名是 mp4 但內容不是影片：被拒絕', async ({ page }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mvt-'));
    const fake = path.join(dir, 'fake.mp4');
    fs.writeFileSync(fake, '<html><script>alert(1)</script></html>');
    await page.goto('/index.html');
    await page.locator('#fileInput').setInputFiles(fake);
    await expect(page.locator('.toast.error').last()).toContainText('不是有效的影片檔');
    await expect(page.locator('#fileListContainer')).toBeHidden();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('sanitizeFileName 去除路徑與危險字元', async ({ page }) => {
    await page.goto('/index.html');
    const out = await page.evaluate(() => [
      sanitizeFileName('../../etc/passwd.mp4'),
      sanitizeFileName('a‮gpj.mp4'),
      sanitizeFileName('-rf.mp4'),
      sanitizeFileName('x'.repeat(300) + '.mp4').length,
    ]);
    expect(out[0]).not.toMatch(/[\/\\]/);
    expect(out[1]).not.toMatch(/‮/);
    expect(out[2]).not.toMatch(/^-/);
    expect(out[3]).toBeLessThanOrEqual(120);
  });
});
