// @ts-check
// 擬真品質測試：用合成的 10 秒 1080p H.264 高位元率素材（非委託的極短測試片段），
// 驗證 FFmpeg WASM 真跑壓縮後的產物品質與流程正確性。
// 合成素材產生於 os.tmpdir()，測試結束後清除，不進 git。
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

let SOURCE_VIDEO;

test.describe('mac-video-transfer-web — 擬真壓縮品質測試（1080p 10s）', () => {
  test.beforeAll(async () => {
    test.setTimeout(60_000);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mvtw-quality-'));
    SOURCE_VIDEO = path.join(dir, 'source_1080p_10s.mp4');

    // 產生高細節（mandelbrot，不易壓縮）+ 音軌的合成素材，模擬真實相機素材：
    // 1920x1080、10 秒、CRF18（高位元率來源），非低動態測試色塊。
    await execFileAsync('ffmpeg', [
      '-y',
      '-f', 'lavfi', '-i', 'mandelbrot=size=1920x1080:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-t', '10',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '256k',
      '-movflags', '+faststart',
      SOURCE_VIDEO,
      '-loglevel', 'error',
    ]);
  });

  test.afterAll(async () => {
    if (SOURCE_VIDEO) {
      try { fs.rmSync(path.dirname(SOURCE_VIDEO), { recursive: true, force: true }); } catch (_) {}
    }
  });

  test('1080p 10 秒素材：壓縮後解析度/編碼/時長正確，檔案確實變小', async ({ page }) => {
    test.setTimeout(180_000);

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto('/index.html');
    await expect(page.locator('#dropZone')).toBeVisible();

    await page.locator('#fileInput').setInputFiles(SOURCE_VIDEO);

    await expect(page.locator('#fileListContainer')).toBeVisible();
    const startBtn = page.locator('#startConvertBtn');
    await expect(startBtn).toBeEnabled({ timeout: 30_000 });

    await startBtn.click();

    // 追蹤進度條，確認不是從 0% 直接跳到完成（即真的有逐步回報進度）
    const progressPanel = page.locator('#progressPanel');
    await expect(progressPanel).toBeVisible({ timeout: 10_000 });

    const observedPercents = new Set();
    const deadline = Date.now() + 150_000;
    while (Date.now() < deadline) {
      const resultsVisible = await page.locator('#resultsPanel').isVisible().catch(() => false);
      if (resultsVisible) break;
      const text = await page.locator('#progressText').textContent().catch(() => null);
      if (text) observedPercents.add(text.trim());
      await page.waitForTimeout(300);
    }
    await expect(page.locator('#resultsPanel')).toBeVisible({ timeout: 10_000 });

    console.log('[quality-e2e] observed progress readings:', [...observedPercents].join(', '));
    expect(observedPercents.size, '進度條應至少回報過一個以上的百分比讀數').toBeGreaterThan(0);

    const resultItem = page.locator('#resultsList .result-item').first();
    await expect(resultItem).toBeVisible();
    await expect(resultItem).not.toHaveClass(/error/);

    const downloadPromise = page.waitForEvent('download');
    await resultItem.locator('button[data-action="download"]').click();
    const download = await downloadPromise;

    const outPath = path.join(os.tmpdir(), `mvtw-quality-${Date.now()}-${download.suggestedFilename()}`);
    await download.saveAs(outPath);

    const inStat = fs.statSync(SOURCE_VIDEO);
    const outStat = fs.statSync(outPath);
    expect(outStat.size).toBeGreaterThan(0);

    console.log(`[quality-e2e] 原始: ${inStat.size} bytes, 壓縮後: ${outStat.size} bytes, 比例: ${(outStat.size / inStat.size * 100).toFixed(1)}%`);

    // 壓縮工具壓出來的檔案不應該比原檔還大（mac-video-transfer 桌面版曾修過這個 bug）
    expect(outStat.size, '壓縮後檔案應小於原始檔案').toBeLessThan(inStat.size);

    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-show_entries', 'stream=width,height,codec_name,codec_type',
      '-of', 'default=noprint_wrappers=1',
      outPath,
    ]);
    console.log('[quality-e2e] ffprobe:\n' + stdout);

    expect(stdout).toContain('codec_type=video');
    expect(stdout).toMatch(/width=1920/);
    expect(stdout).toMatch(/height=1080/);
    expect(stdout).toMatch(/codec_name=h264/);

    const durationMatch = stdout.match(/duration=([\d.]+)/);
    expect(durationMatch).not.toBeNull();
    const duration = parseFloat(durationMatch[1]);
    expect(Math.abs(duration - 10)).toBeLessThanOrEqual(0.5);

    fs.unlinkSync(outPath);

    const seriousErrors = consoleErrors.filter(
      (e) => !/favicon\.ico/i.test(e) && !/net::ERR_ABORTED.*favicon/i.test(e)
    );
    expect(seriousErrors, `console errors: ${JSON.stringify(seriousErrors, null, 2)}`).toEqual([]);
  });
});
