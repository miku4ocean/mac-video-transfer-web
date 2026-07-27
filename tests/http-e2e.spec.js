// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const SAMPLE_VIDEO = path.join(__dirname, 'fixtures', 'sample.mp4');

test.describe('mac-video-transfer-web — 真實 http 環境完整流程', () => {
  test('開頁 → FFmpeg WASM 初始化 → 上傳 → 壓縮 → 下載，產物為有效影片檔', async ({ page }) => {
    test.setTimeout(180_000);

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto('/index.html');
    expect(page.url().startsWith('http://')).toBe(true);

    // 頁面初始化訊息（來自 app.js init()）
    await expect(page.locator('#dropZone')).toBeVisible();

    // 上傳測試影片
    await page.locator('#fileInput').setInputFiles(SAMPLE_VIDEO);

    // 檔案列表出現、開始轉檔按鈕轉為可用
    await expect(page.locator('#fileListContainer')).toBeVisible();
    const startBtn = page.locator('#startConvertBtn');
    await expect(startBtn).toBeEnabled({ timeout: 30_000 });

    // 觸發壓縮（若 FFmpeg 尚未預載完成，startConversion 內部會等待載入）
    await startBtn.click();

    // FFmpeg 載入中的 overlay 曾經出現過或直接進入轉檔進度皆可接受，
    // 真正要驗證的是「最終跑出結果面板」
    await expect(page.locator('#resultsPanel')).toBeVisible({ timeout: 150_000 });

    const resultItem = page.locator('#resultsList .result-item').first();
    await expect(resultItem).toBeVisible();
    await expect(resultItem).not.toHaveClass(/error/);

    // 下載壓縮後的產物
    const downloadPromise = page.waitForEvent('download');
    await resultItem.locator('button[data-action="download"]').click();
    const download = await downloadPromise;

    const outPath = path.join(os.tmpdir(), `mvtw-e2e-${Date.now()}-${download.suggestedFilename()}`);
    await download.saveAs(outPath);

    // 產物存在且非空
    const stat = fs.statSync(outPath);
    expect(stat.size).toBeGreaterThan(0);

    // 用 ffprobe 驗證是可辨識的有效影片檔（而非任意 blob）
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_type,codec_name',
      '-of', 'csv=p=0',
      outPath,
    ]);
    expect(stdout.trim().length).toBeGreaterThan(0);
    expect(stdout).toContain('video');

    fs.unlinkSync(outPath);

    // console 不應有嚴重錯誤（忽略 favicon.ico 404 這類已知無害訊息）
    const seriousErrors = consoleErrors.filter(
      (e) => !/favicon\.ico/i.test(e) && !/net::ERR_ABORTED.*favicon/i.test(e)
    );
    expect(seriousErrors, `console errors: ${JSON.stringify(seriousErrors, null, 2)}`).toEqual([]);
  });
});
