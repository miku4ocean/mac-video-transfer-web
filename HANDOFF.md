# HANDOFF — mac-video-transfer-web
更新：2026-07-05／claude

## 目前目標
提供跨平台網頁版影片壓縮工具（FFmpeg WASM），對應 mac-video-transfer 的網頁替代方案。

## 狀態
- 已完成：初始提交，包含完整功能實作（f841945，2026-01-02）；README 完整
- 進行中：無 WIP，工作區乾淨（單一 commit）
- 驗收現況：未驗證（需瀏覽器實際開啟確認 WASM 載入正常）

## 下一步（接手的人從這裡開始）
1. `python3 -m http.server 8080` 啟動後開啟 http://localhost:8080，確認 FFmpeg WASM 正常初始化
2. 測試上傳影片壓縮流程，注意瀏覽器需支援 SharedArrayBuffer（需 HTTPS 或 localhost）
3. 若要部署 GitHub Pages，需確認 Cross-Origin-Opener-Policy / Embedder-Policy header 設定

## 地雷（別踩）
- SharedArrayBuffer 需要特定 HTTP header，直接雙擊 index.html 開啟不會運作
- 大檔案（>500MB）可能 OOM，非 bug

## 主辦權
單線／待分派
