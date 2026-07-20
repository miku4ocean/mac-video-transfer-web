# HANDOFF — mac-video-transfer-web
更新：2026-07-20／claude

## 目前目標
提供跨平台網頁版影片壓縮工具（FFmpeg WASM），對應 mac-video-transfer 的網頁替代方案。

## 狀態
- 已完成：初始提交，包含完整功能實作（f841945，2026-01-02）；README 完整
- 已完成：本機 smoke test 全綠——`python3 -m http.server 8080` 起服後，用 puppeteer-core
  驅動已安裝的 Chrome 實際跑過「開頁 → FFmpeg WASM 初始化 → 上傳測試影片 → 壓縮 → 結果面板出現下載/預覽」全流程，
  console 無錯誤（僅無害的 favicon.ico 404）
- 確認：本專案用單執行緒 FFmpeg core（app.js:1068 註解已說明），**不需要 SharedArrayBuffer / COOP-COEP header**，
  舊 HANDOFF 記載的地雷已過時
- 進行中：無 WIP，工作區乾淨

## 下一步（接手的人從這裡開始）
1. 真人用瀏覽器（非 headless）試幾種實際素材（大檔、不同格式 MOV/AVI/MKV）跑一輪壓縮，確認 UI 顯示與下載檔案可正常播放
2. 若要部署 GitHub Pages：目前不需要 COOP/COEP（單執行緒 core），可直接部署，建議部署後照 README 網址跑一次同樣的 smoke test
3. 補齊自動化測試（目前無 package.json/test script）：可將本次驗證用的 puppeteer smoke script 正式收進repo（例如 `scripts/smoke-test.js`）並寫進 AGENTS.md

## 地雷（別踩）
- 大檔案（>500MB）可能 OOM，非 bug
- ffmpeg/ 目錄為 WASM 二進位，不要手動修改（見 AGENTS.md）
- 測試用小影片壓縮後可能反而變大（bitrate/container overhead 對極短片段是正常現象，非 bug）

## 主辦權
單線／待分派
