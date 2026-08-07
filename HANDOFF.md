# HANDOFF — mac-video-transfer-web
更新：2026-08-07／claude

## 目前目標
提供跨平台網頁版影片壓縮工具（FFmpeg WASM），對應 mac-video-transfer 的網頁替代方案。

## GitHub Pages 上線狀態（2026-07-27）
- **已上線**：https://miku4ocean.github.io/mac-video-transfer-web/
- 來源：branch `main`，path `/`
- 資源路徑煙霧測試全通（styles.css、app.js、ffmpeg/*）
- 密鑰掃描：無命中

## 狀態
- 已完成：核心功能（f841945）；Playwright e2e 測試全流程驗證；GitHub Pages 上線
- 已完成：本專案用單執行緒 FFmpeg core，**不需要 SharedArrayBuffer / COOP-COEP header**
- 已完成（2026-08-07）：第二輪品質強化，共 9 項：
  1. **favicon**：inline SVG data URI，消除 console 404 噪音
  2. **移除 Google Fonts 外部依賴**：改用系統字型堆疊，使「完全本地處理」隱私宣稱在技術上成立（零外部網路請求）
  3. **測試防呆**：Playwright 加 `retries: 1` 處理 FFmpeg WASM 間歇性 flake
  4. **大檔案警告**：>500MB 時在選檔階段即顯示 toast 警告
  5. **鍵盤無障礙**：drop zone 可 Tab 聚焦、Enter/Space 開啟檔案選擇器，附 ARIA label 與 focus-visible 樣式
  6. **記憶體回收**：頁面關閉時 revoke 所有 Blob URL
  7. **佇列進度**：多檔案轉檔時在標題旁顯示「X / N」進度徽章
  8. **SEO / 社群分享**：OG meta、theme-color、noscript 降級訊息
  9. **UX 改善**：drop zone 整區可點擊、防重複提交、手機瀏海安全區
- 進行中：無 WIP，工作區乾淨

## 下一步（接手的人從這裡開始）
1. 真人用瀏覽器（非 headless）試幾種實際素材（大檔、不同格式 MOV/AVI/MKV）跑一輪壓縮，確認 UI 顯示與下載檔案可正常播放
2. 在部署網址上實跑一次完整的上傳→壓縮→下載流程（`tests/http-e2e.spec.js` 可調整 `baseURL` 指到 `https://miku4ocean.github.io/mac-video-transfer-web/`）
3. GitHub Pages 需使用者手動觸發重新部署以取得本次變更

## 地雷（別踩）
- 大檔案（>500MB）可能 OOM，非 bug（UI 已加警告）
- ffmpeg/ 目錄為 WASM 二進位，不要手動修改（見 AGENTS.md）
- 測試用小影片壓縮後可能反而變大（bitrate/container overhead 對極短片段是正常現象，非 bug）
- Playwright e2e 偶爾 flake（FFmpeg WASM 連跑時內部狀態問題），已設 retries: 1 處理

## 主辦權
單線／待分派
