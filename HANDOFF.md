# HANDOFF — mac-video-transfer-web
更新：2026-07-27／claude

## 目前目標
提供跨平台網頁版影片壓縮工具（FFmpeg WASM），對應 mac-video-transfer 的網頁替代方案。

## GitHub Pages 上線狀態（2026-07-27）
- **已上線**：https://miku4ocean.github.io/mac-video-transfer-web/
- 來源：branch `main`，path `/`（repo 原本就是 index.html 在根目錄，不需要 /docs）
- 部署當下 API 顯示 Pages 早已存在（`status: built`），非本次新開站，僅確認現況
- 驗證：`curl -sI` 回 `HTTP/2 200`；`<title>` 抓到「Video Compressor Web - 線上影片壓縮工具」，確認非 404／非 GitHub 預設頁
- 資源路徑煙霧測試：`styles.css`、`app.js`、`ffmpeg/ffmpeg.js`、`ffmpeg/ffmpeg-core.js`、`ffmpeg/ffmpeg-core.wasm` 皆為相對路徑，實際 curl 全部回 200，project pages 子路徑下沒有斷裂，未需修正
- 密鑰掃描（api key/token/secret/sk-/ghp_/AKIA/password，排除 node_modules/.git/dist/build/ffmpeg）：無命中

## 狀態
- 已完成：初始提交，包含完整功能實作（f841945，2026-01-02）；README 完整
- 已完成：本機 smoke test 全綠——`python3 -m http.server 8080` 起服後，用 puppeteer-core
  驅動已安裝的 Chrome 實際跑過「開頁 → FFmpeg WASM 初始化 → 上傳測試影片 → 壓縮 → 結果面板出現下載/預覽」全流程，
  console 無錯誤（僅無害的 favicon.ico 404）
- 確認：本專案用單執行緒 FFmpeg core（app.js:1068 註解已說明），**不需要 SharedArrayBuffer / COOP-COEP header**，
  舊 HANDOFF 記載的地雷已過時
- 已完成（2026-07-27）：補上正式的 Playwright 自動化測試，在**真正的 http:// 環境**（非 file://）下跑完整流程：
  - 新增 `scripts/serve.js`（純 Node http server，不依賴額外套件），`playwright.config.js` 用它當
    `webServer` 啟動本機服務（預設 port 4173）。
  - 新增 `tests/http-e2e.spec.js`：開頁 → 上傳 `tests/fixtures/sample.mp4`（ffmpeg 產生的 2 秒小測試檔）
    → 觸發壓縮 → 等結果面板出現且非 error → 下載產物 → 用 `ffprobe` 驗證產物是可辨識的有效影片檔
    → 檢查 console 無嚴重錯誤（忽略 favicon.ico 404）。
  - 連跑兩次皆全綠：`1 passed (3.3s)`、`1 passed (3.2s)`。
  - **這次驗證再次確認**：即使在真正的 http:// 環境下（有正常的 same-origin response，`scripts/serve.js`
    預設不加 COOP/COEP header），FFmpeg WASM 初始化與壓縮流程仍正常運作，沒有揭露任何 file:// 驗不出來的問題——
    印證了本專案單執行緒 core 不需要 SharedArrayBuffer 的結論，「file:// vs http COOP/COEP」這條舊疑慮可以正式視為解決/不適用。
    `scripts/serve.js` 保留 `COOP_COEP=1` 環境變數開關，供未來若 FFmpeg core 換成多執行緒版本時重新驗證用。
  - 執行方式：`npm install && npx playwright install chromium && npx playwright test`
    （或 `npm test`）。
- 進行中：無 WIP，工作區乾淨

## 下一步（接手的人從這裡開始）
1. 真人用瀏覽器（非 headless）試幾種實際素材（大檔、不同格式 MOV/AVI/MKV）跑一輪壓縮，確認 UI 顯示與下載檔案可正常播放
2. ~~若要部署 GitHub Pages~~ 已完成，見上方「GitHub Pages 上線狀態」。目前只驗證過靜態資源可載入，尚未在部署網址上實跑一次完整的上傳→壓縮→下載流程；`tests/http-e2e.spec.js` 目前只打本機 `scripts/serve.js`，尚未指向部署後網址，需要的話可調整 `baseURL` 指到 `https://miku4ocean.github.io/mac-video-transfer-web/` 再跑一次

## 地雷（別踩）
- 大檔案（>500MB）可能 OOM，非 bug
- ffmpeg/ 目錄為 WASM 二進位，不要手動修改（見 AGENTS.md）
- 測試用小影片壓縮後可能反而變大（bitrate/container overhead 對極短片段是正常現象，非 bug）

## 主辦權
單線／待分派
