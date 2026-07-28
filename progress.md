# progress.md — mac-video-transfer-web

> 本檔依 Galley 交付規格產出，內容一律基於實際讀取的程式碼與文件
> （index.html / app.js / styles.css / README.md / HANDOFF.md / AGENTS.md / CLAUDE.md / .gitignore / git log）。
> 查無佐證處一律標「未確認」，不臆造。盤點日期：2026-07-24。

## A. 專案名稱
Video Compressor Web（repo 名稱：mac-video-transfer-web）

## B. 專案路徑
`/Users/leonalin/Code/mac-video-transfer-web`

## C. 專案簡介
一個完全在瀏覽器端運行的線上影片壓縮工具。使用 FFmpeg WASM（WebAssembly 版 FFmpeg）在使用者的分頁內就地執行編碼，
不需要任何後端伺服器，影片資料也不會被上傳。是純 HTML + CSS + JavaScript 的靜態網頁專案（無框架、無建置流程、無 `package.json`）。

## D. 專案開發目的
README 明確定位為「mac-video-transfer（Mac 版工具）的網頁替代方案」（HANDOFF.md 第 5 行：「對應 mac-video-transfer 的網頁替代方案」），
目的是讓沒有 Mac App 版本、或想在其他作業系統（Windows／Linux／行動裝置瀏覽器）上壓縮影片的使用者，
不需安裝原生軟體即可使用同一套「北歐銀白設計風格」介面完成影片壓縮。

## E. 解決使用者痛點
- **不想把私人影片上傳到不明的線上壓縮網站**：README 首要賣點「🔒 完全本地處理，資料不會上傳到任何伺服器」。
- **沒有 Mac / 不想安裝原生工具**：只要有支援 WebAssembly 的瀏覽器（Chrome/Edge/Firefox 89+、Safari 15+）即可使用。
- **影片檔案太大，難以分享或儲存**：提供品質、尺寸縮放、目標檔案大小三種壓縮策略，並在加入檔案時即時預估壓縮後大小。
- **不確定壓縮設定會產生多大的檔案**：`estimateCompressedSize()` 在使用者調整設定的當下，即針對佇列中每個檔案重新試算，先看結果再決定要不要轉檔。

## F. 專案功能細項介紹
- 拖放或點擊選檔，一次可加入多個影片檔案（`addFiles()`，支援 MOV/MP4/MPG/WMV/WebM/AVI/MKV/FLV/M4V/3GP，會擋掉不支援格式與重複檔名+檔案大小的重複檔）
- 每個已加入的檔案自動讀取中繼資料（解析度、時長、大小）與縮圖（`getVideoInfo()` / `generateThumbnail()`）
- 側欄輸出設定：輸出格式（MP4 H.264 / WebM VP8）、編碼器、壓縮品質滑桿（10–100%，相對原始位元率）、音訊模式（保留/壓縮/靜音）
- 選用進階設定：調整影像尺寸（自訂寬高）、壓縮至限定大小以下（MB/GB/KB，會反過來自動換算所需品質，UI 上有「品質由目標大小自動計算」提示）
- 三組「快速預設」按鈕（高畫質 75% / 平衡 50% / 小檔案 25%），一鍵套用品質與編碼器組合
- 轉檔進度面板：目前處理第幾個檔案、進度百分比、已用時間、依已完成比例估算的剩餘時間、可隨時取消
- 結果面板：每個檔案顯示成功/失敗、原始大小 → 壓縮後大小、節省百分比、下載／預覽／個別移除；失敗會顯示錯誤訊息
- Toast 提示系統：加檔、跳過重複/不支援格式、轉檔完成、轉檔失敗、取消等狀態即時通知
- 瀏覽器相容性檢查：偵測 `WebAssembly` 是否存在，不支援時顯示警告區塊
- FFmpeg 於頁面載入約 1 秒後於背景預先載入（`initFFmpeg()` 走本地檔案 + Blob URL，避開 CDN CORS 問題），使用者實際按下「開始轉檔」前多半已就緒

## G. 專案規格及 RPD

**技術棧**
- 純前端：HTML5 + CSS3（CSS Variables，「北歐銀白」設計系統）+ 原生 JavaScript（無框架、無打包工具）
- 影片處理引擎：[ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)，本地儲存核心檔（`ffmpeg/ffmpeg.js`、`ffmpeg/ffmpeg-core.js`、`ffmpeg/ffmpeg-core.wasm`、`ffmpeg/814.ffmpeg.js`），**單執行緒 core**（app.js:1068 明確註記，因此不需要 SharedArrayBuffer / COOP-COEP header）
- 字型：Google Fonts CDN 載入 Inter（index.html 第 9 行）— 是本專案唯一對外的網路請求來源，與「完全本地處理」的行銷語有微妙落差（未確認團隊是否曾檢討移除）

**埠 / 啟動指令**
- 無 `package.json`，無建置步驟
- 本機開發需起一個靜態 HTTP 伺服器（瀏覽器安全限制不能直接用 `file://` 開）：
  - `python3 -m http.server 8080`（AGENTS.md 指定的預設方式）
  - 或 `npx http-server -p 8080`
  - 或 `php -S localhost:8080`
  - 開啟 `http://localhost:8080`

**部署**
- README 指向 GitHub Pages：`https://miku4ocean.github.io/mac-video-transfer-web`（**未確認**此網址目前是否已實際部署上線，HANDOFF.md 的「下一步」仍列著「若要部署 GitHub Pages...」）

**資料流**
使用者選檔／拖放 → 檔案以 `File`/`Blob` 形式留在瀏覽器記憶體 → `<video>` 標籤讀出中繼資料＋產生縮圖 →
使用者調整設定，前端即時試算預估壓縮大小 → 按下開始轉檔 → FFmpeg WASM（單執行緒 core）在頁面內就地編碼，
透過 progress/log 事件回報進度 → 輸出結果封裝為 `Blob`／`ObjectURL` → 使用者下載或預覽 → 重新整理頁面即釋放所有暫存資料。
**全程沒有任何影片位元組被送往伺服器。**

**檔案結構**（依 README 與實際 `ls` 核對一致）
```
mac-video-transfer-web/
├── index.html      # 主要 HTML 頁面（單頁四種畫面狀態）
├── styles.css      # 樣式表（1,390 行）
├── app.js          # 主要應用程式邏輯（1,121 行）
├── ffmpeg/          # FFmpeg WASM 二進位與包裝器（AGENTS.md 標為禁區，不要手動修改）
├── HANDOFF.md / AGENTS.md / CLAUDE.md / README.md
└── .gitignore
```

## H. 目前已完成項目
- 核心功能完整實作並已提交（commit `f841945`「Initial commit: Video Compressor Web」）
- 骨架/交接文件補齊（commit `7ad814e`「chore: project skeleton (index + handoff)」）
- 本機端對端 smoke test 全綠（HANDOFF.md 記錄）：`python3 -m http.server 8080` 起服後，用 puppeteer-core 驅動已安裝的 Chrome 實跑「開頁 → FFmpeg WASM 初始化 → 上傳測試影片 → 壓縮 → 結果面板出現下載/預覽」全流程，console 無錯誤（僅無害的 favicon.ico 404），對應 commit `d2a852d`
- 已確認並修正舊有誤解：本專案用單執行緒 FFmpeg core，**不需要** SharedArrayBuffer / COOP-COEP header（HANDOFF.md 明記「舊 HANDOFF 記載的地雷已過時」）
- README 功能說明、設定選項說明、Mac 版對照表齊全

## I. 尚待完成項目
- **真人瀏覽器手動測試**：HANDOFF.md「下一步」第 1 項——用非 headless 瀏覽器實測多種真實素材（大檔、MOV/AVI/MKV 等不同格式），確認 UI 顯示與下載檔案可正常播放。目前僅有 puppeteer 自動化的單一 smoke test，尚未涵蓋多格式/大檔情境
- **GitHub Pages 部署與上線後驗證**：HANDOFF.md「下一步」第 2 項——確認是否已部署，若尚未部署則需部署後依 README 網址重跑一次 smoke test。**未確認**目前 `https://miku4ocean.github.io/mac-video-transfer-web` 是否可正常存取
- **自動化測試收整**：目前無 `package.json` / test script，puppeteer smoke script 只是本次驗證用的臨時腳本，尚未正式收進 repo（HANDOFF.md 建議路徑 `scripts/smoke-test.js`）並寫進 AGENTS.md
- **大檔案 OOM 的使用者體驗**：HANDOFF.md 記錄 >500MB 檔案可能導致瀏覽器記憶體不足，目前定調為「非 bug」，但尚無任何 UI 層的預先警告或檔案大小上限提示（**未確認**是否已規劃）
- **Google Fonts 外部依賴與「完全本地處理」宣稱的落差**：未見任何文件討論是否要把 Inter 字型也內嵌/自架以達成真正零外部連線

## J. 系統優化或增加功能建議
- 在選檔階段就依檔案大小主動提示「超過 500MB 可能導致瀏覽器記憶體不足」，把 HANDOFF 記錄的地雷直接呈現在 UI，而不只是文件裡的但書
- 把 puppeteer smoke test 正式收進 repo 並接上 CI（例如 GitHub Actions 跑一次 `python3 -m http.server` + puppeteer），避免未來改動又不小心踩到 SharedArrayBuffer 之類已澄清過的地雷
- 若要落實「完全本地處理」的行銷語，可考慮把 Inter 字型改為本地內嵌（woff2 base64 或隨 repo 附檔），移除唯一的外部網路依賴，讓「不上傳資料／不連外」在技術上也站得住腳
- 批次轉檔目前是逐檔序列處理（`for` 迴圈跑 `convertVideo`），可評估是否有必要顯示「總體佇列進度」（例如「第 2/5 個檔案，總進度 34%」）而不只是單檔進度，改善多檔案時的等待體感
- 結果面板可增加「一鍵全部下載（zip）」——目前是逐檔個別下載，檔案多時操作次數會隨檔案數線性增加
