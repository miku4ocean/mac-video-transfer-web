// @ts-check
// 版面可用性測試：三種尺寸下無水平捲軸，手機尺寸下關鍵操作元件可見可點，
// 轉檔進度條在手機寬度下不溢出容器（Web 版比桌面版更可能被用手機開啟）。
const { test, expect } = require('@playwright/test');
const path = require('path');

const SAMPLE_VIDEO = path.join(__dirname, 'fixtures', 'sample.mp4');

const VIEWPORTS = [
  { name: '手機 (375px)', width: 375, height: 812 },
  { name: '平板 (768px)', width: 768, height: 1024 },
  { name: '桌面 (1440px)', width: 1440, height: 900 },
];

test.describe('mac-video-transfer-web — 版面可用性', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name}：初始頁面無水平捲軸`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/index.html');
      await expect(page.locator('#dropZone')).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${vp.name}: scrollWidth(${scrollWidth}) 不應超過 clientWidth(${clientWidth})`).toBeLessThanOrEqual(clientWidth + 1);
    });

    test(`${vp.name}：加入檔案並顯示設定/檔案列表後仍無水平捲軸`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/index.html');
      await page.locator('#fileInput').setInputFiles(SAMPLE_VIDEO);
      await expect(page.locator('#fileListContainer')).toBeVisible();

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth, `${vp.name}: scrollWidth(${scrollWidth}) 不應超過 clientWidth(${clientWidth})`).toBeLessThanOrEqual(clientWidth + 1);
    });
  }

  test('手機尺寸 (375px)：選檔按鈕與開始轉檔按鈕可見可點、進度條不溢出容器', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/index.html');

    const selectBtn = page.locator('#selectFilesBtn');
    await expect(selectBtn).toBeVisible();
    const selectBox = await selectBtn.boundingBox();
    expect(selectBox).not.toBeNull();
    expect(selectBox.x).toBeGreaterThanOrEqual(0);
    expect(selectBox.x + selectBox.width).toBeLessThanOrEqual(375 + 1);

    await page.locator('#fileInput').setInputFiles(SAMPLE_VIDEO);
    await expect(page.locator('#fileListContainer')).toBeVisible();

    const startBtn = page.locator('#startConvertBtn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled({ timeout: 30_000 });
    const startBox = await startBtn.boundingBox();
    expect(startBox).not.toBeNull();
    expect(startBox.x + startBox.width).toBeLessThanOrEqual(375 + 1);

    await startBtn.click();
    await expect(page.locator('#progressPanel')).toBeVisible();

    const progressBox = await page.locator('#progressBar').boundingBox();
    expect(progressBox).not.toBeNull();
    expect(progressBox.x, '進度條左緣不應被裁切到視窗外').toBeGreaterThanOrEqual(0);
    expect(progressBox.x + progressBox.width, '進度條右緣不應溢出 375px 寬的視窗').toBeLessThanOrEqual(375 + 1);

    await expect(page.locator('#resultsPanel')).toBeVisible({ timeout: 60_000 });
  });
});
