// @ts-check
// WASM 降級行為測試：
// A) WebAssembly 完全不可用（模擬舊瀏覽器）→ 應有明確錯誤提示，頁面不白屏/不崩潰。
// B) FFmpeg core 檔案（ffmpeg-core.wasm/js）載入失敗（模擬 CDN/資源阻斷）→
//    應有明確錯誤提示（toast），不是無限轉圈或靜默卡死。
//
// 註：本專案使用單執行緒 FFmpeg core（見 app.js checkBrowserCompatibility() 註解、
// scripts/serve.js 開頭註解），不依賴 SharedArrayBuffer / COOP-COEP header，
// 因此「移除 COOP/COEP」對本專案不構成降級情境；真正的降級風險是
// WebAssembly 不可用，或 FFmpeg core 檔案本身載入失敗。
const { test, expect } = require('@playwright/test');
const path = require('path');

const SAMPLE_VIDEO = path.join(__dirname, 'fixtures', 'sample.mp4');

test.describe('mac-video-transfer-web — WASM 降級行為', () => {
  test('WebAssembly 不可用：顯示明確警告，頁面不崩潰、不白屏', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    // 在任何頁面腳本執行前移除 WebAssembly，模擬不支援的瀏覽器
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.WebAssembly;
    });

    await page.goto('/index.html');

    // 頁面本體仍應正常渲染（不是白屏）
    await expect(page.locator('#dropZone')).toBeVisible();

    // 明確的相容性警告應該出現
    const warning = page.locator('#browserWarning');
    await expect(warning).toBeVisible({ timeout: 5_000 });
    const warningText = await page.locator('#warningMessage').textContent();
    expect(warningText).toMatch(/WebAssembly|不支援/);

    // 不應該有未捕捉的例外讓頁面掛掉
    await page.waitForTimeout(1500); // 讓背景 FFmpeg 預載嘗試有機會執行/失敗
    expect(pageErrors, `pageerror: ${JSON.stringify(pageErrors)}`).toEqual([]);

    // 頁面其餘互動仍可用（不是完全鎖死）
    await expect(page.locator('#selectFilesBtn')).toBeEnabled();
  });

  test('FFmpeg core 資源載入失敗：轉檔應以明確錯誤提示收場，不是無限卡住', async ({ page }) => {
    test.setTimeout(60_000);

    // 阻斷 FFmpeg core 的 JS/WASM 檔案請求，模擬 CDN/靜態資源載入失敗
    await page.route('**/ffmpeg/ffmpeg-core.*', (route) => route.abort('failed'));

    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await page.goto('/index.html');
    await expect(page.locator('#dropZone')).toBeVisible();

    await page.locator('#fileInput').setInputFiles(SAMPLE_VIDEO);
    await expect(page.locator('#fileListContainer')).toBeVisible();

    const startBtn = page.locator('#startConvertBtn');
    await expect(startBtn).toBeEnabled({ timeout: 30_000 });
    await startBtn.click();

    // 應該出現明確的錯誤 toast，而不是進度面板無限卡住或靜默無反應
    // （背景預載與點擊觸發的載入都會各自失敗一次，因此可能同時有多個錯誤 toast）
    const errorToast = page.locator('.toast.error').last();
    await expect(errorToast).toBeVisible({ timeout: 20_000 });
    const toastText = await errorToast.locator('.toast-message').textContent();
    expect(toastText).toMatch(/FFmpeg|載入失敗/);

    // 頁面沒有因此整個崩潰
    expect(pageErrors, `pageerror: ${JSON.stringify(pageErrors)}`).toEqual([]);
  });
});
