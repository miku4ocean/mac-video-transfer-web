# mac-video-transfer-web — 薄索引
跨平台規則正本：`~/.agents/institution/`（先讀 core/PRINCIPLES.md，照其指示附版本標記）。

## 專案專屬
- Build/test 指令：`npm install && npx playwright install chromium && npx playwright test`（或 `npm test`）——
  跑 `tests/http-e2e.spec.js`，透過 `scripts/serve.js` 起本機 http:// 服務（非 file://），驗證
  開頁／FFmpeg WASM 初始化／上傳／壓縮／下載全流程，並用 ffprobe 驗證產物是有效影片檔。
- 本地手動啟動（不跑測試）：`node scripts/serve.js 8080` 或 `python3 -m http.server 8080`
- 架構一句話：純靜態網頁（HTML+CSS+JS），使用 FFmpeg WASM 在瀏覽器端壓縮影片，無伺服器。
- 本專案禁區：ffmpeg/ 目錄為 WASM 二進位，不要手動修改。
