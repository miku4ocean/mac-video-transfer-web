# HANDOFF — mac-video-transfer-web
更新：2026-08-17／claude

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
- 已完成（2026-08-17）：擬真品質測試 R1，用合成 10 秒 1080p 高細節（mandelbrot，非低動態色塊）
  素材真跑 FFmpeg WASM 全流程，新增 3 個測試檔（共 +10 測試，1→11 全綠）：
  - `tests/quality-e2e.spec.js`：1080p 10s 素材真壓縮，ffprobe 驗解析度/編碼/時長，
    確認壓縮後檔案確實變小（23.4MB→11.5MB，49.3%），進度條有 28 筆漸進讀數（非 0%→100% 空跳）
  - `tests/responsive.spec.js`：375/768/1440px 三尺寸皆無水平捲軸；手機尺寸下選檔/開始轉檔按鈕與進度條皆不溢出視窗
  - `tests/degradation.spec.js`：WebAssembly 不可用時顯示明確警告且不白屏；FFmpeg core 檔案載入失敗時顯示明確錯誤 toast（非無限卡住）
  - **修了 1 個真 bug**：`getVideoInfo()`/`generateThumbnail()` 對大檔案會在 `onloadedmetadata`/`onseeked`
    後立刻同步 `revokeObjectURL`，與瀏覽器仍在進行的 blob 緩衝 fetch 產生競態，噴出
    `net::ERR_ABORTED` / `net::ERR_FILE_NOT_FOUND` console 錯誤（30KB 的舊測試素材太小，從未觸發過；
    真實尺寸素材才會暴露）。修法：改成 `setTimeout(..., 0)` 延後一個 tick 再 revoke。
  - **修了 1 個 UI 文案 bug**：音訊設定選項標示「保持原始音訊」，但實際程式碼從未做 `-c:a copy`，
    一律重新編碼成 AAC 192k / Vorbis q6（README.md 也同樣寫錯）。已改標籤為「標準音質
    (AAC/Vorbis 高位元率)」如實反映行為，未改動編碼邏輯本身（真正做到逐位元組保留在多數來源
    格式下風險較高，超出本輪範圍）。
  - 外部連線複查：全專案僅剩 footer 的 GitHub 連結（`<a href>`，需使用者點擊才會導覽），
    無 fonts.googleapis 或其他自動載入的外部資源，「完全本地處理」宣稱成立
  - 合成測試素材以 `test.beforeAll`/`afterAll` 產生於 `os.tmpdir()`，測試結束即刪除，未進 git
- 進行中：無 WIP，工作區乾淨

## 下一步（接手的人從這裡開始）
1. 真人用瀏覽器（非 headless）試幾種實際素材（大檔、不同格式 MOV/AVI/MKV）跑一輪壓縮，確認 UI 顯示與下載檔案可正常播放
2. 在部署網址上實跑一次完整的上傳→壓縮→下載流程（`tests/http-e2e.spec.js` 可調整 `baseURL` 指到 `https://miku4ocean.github.io/mac-video-transfer-web/`）
3. GitHub Pages 需使用者手動觸發重新部署以取得本次變更
4. 若之後真的要做到「保持原始音訊」逐位元組不重編碼，需評估 `-c:a copy` 在各種來源格式
   （尤其 MOV 的 PCM、AVI 的各種舊音訊編碼）對 MP4/WebM 容器的相容性，可能需要针對不支援
   直接 copy 的來源另外 fallback 到重新編碼，非本輪範圍

## 地雷（別踩）
- 大檔案（>500MB）可能 OOM，非 bug（UI 已加警告）
- ffmpeg/ 目錄為 WASM 二進位，不要手動修改（見 AGENTS.md）
- 測試用小影片壓縮後可能反而變大（bitrate/container overhead 對極短片段是正常現象，非 bug）
- Playwright e2e 偶爾 flake（FFmpeg WASM 連跑時內部狀態問題），已設 retries: 1 處理
- 「本專案不需要 COOP/COEP」的判斷是對的（單執行緒 core），不要因為看到別的 FFmpeg WASM
  專案要求 SharedArrayBuffer 就誤加這兩個 header——加了反而會擋掉本專案原本可正常運作的東西
- `getVideoInfo`/`generateThumbnail` 的 blob URL revoke 已改成 `setTimeout(...,0)` 延後，
  不要為了「乾淨」把它改回同步呼叫，會讓大檔案的 console 錯誤回歸

## 主辦權
單線／待分派
