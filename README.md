# Video Compressor Web - 線上影片壓縮工具

🎬 一個完全在瀏覽器端運行的影片壓縮工具，使用 FFmpeg WASM 技術，資料不會上傳到伺服器。

## ✨ 功能特色

- **🔒 完全本地處理** - 所有影片處理都在瀏覽器完成，不會上傳到任何伺服器
- **🎨 北歐銀白設計** - 延續 Mac 版的精緻設計風格
- **📦 多格式支援** - 支援 MOV, MP4, WebM, AVI, MKV 等常見格式
- **⚙️ 自訂設定** - 品質調整、尺寸縮放、音訊設定
- **📊 即時預估** - 壓縮前即可看到預估檔案大小
- **📱 響應式設計** - 支援桌面和行動裝置

## 🚀 使用方式

### GitHub Pages

直接訪問：[https://miku4ocean.github.io/mac-video-transfer-web](https://miku4ocean.github.io/mac-video-transfer-web)

### 本地運行

由於瀏覽器安全限制，需要使用 HTTP 伺服器：

```bash
# 使用 Python（Python 3）
cd mac-video-transfer-web
python3 -m http.server 8080

# 或使用 Node.js
npx http-server -p 8080

# 或使用 PHP
php -S localhost:8080
```

然後在瀏覽器中開啟 `http://localhost:8080`

## 📋 系統需求

- **瀏覽器**：Chrome 89+、Edge 89+、Firefox 89+ 或 Safari 15+
- **建議**：支援 SharedArrayBuffer 的瀏覽器以獲得最佳效能

⚠️ **注意**：較大的影片檔案（>500MB）可能會導致瀏覽器記憶體不足

## 🎛️ 設定說明

### 輸出格式
- **MP4 (H.264)** - 相容性最佳，適合大多數裝置
- **WebM (VP8)** - 網頁用，較小的檔案大小

### 壓縮品質
- **100%** - 接近原始品質
- **75%** - 高畫質（推薦）
- **50%** - 平衡模式
- **25%** - 優先檔案大小

### 音訊設定
- **保持原始音訊** - 不壓縮音訊
- **壓縮音訊品質** - 輕微壓縮
- **靜音** - 移除音訊軌道

## 🔧 技術架構

- **[FFmpeg WASM](https://github.com/ffmpegwasm/ffmpeg.wasm)** - WebAssembly 版本的 FFmpeg
- **純 HTML/CSS/JS** - 無需框架，簡單部署
- **CSS Variables** - 北歐銀白設計系統

## 📁 檔案結構

```
mac-video-transfer-web/
├── index.html      # 主要 HTML 頁面
├── styles.css      # 樣式表
├── app.js          # 主要應用程式邏輯
└── README.md       # 說明文件
```

## ⚡ 效能提示

1. **檔案大小**：建議單一檔案不超過 500MB
2. **格式選擇**：WebM 通常比 MP4 更快壓縮
3. **品質設定**：較低的品質設定 = 較快的處理速度
4. **縮放影片**：縮小解析度可以大幅加速處理

## 📝 與 Mac 版的差異

| 功能 | Mac 版 | Web 版 |
|------|--------|--------|
| 硬體加速 | ✅ 支援 | ❌ 不支援 |
| H.265 編碼 | ✅ 支援 | ❌ 不支援 |
| 處理速度 | ⚡ 更快 | 🐢 較慢 |
| 檔案大小限制 | 無限制 | ~500MB |
| 跨平台 | 僅 Mac | 所有平台 |

## 📜 授權

MIT License

## 🙏 致謝

- [FFmpeg](https://ffmpeg.org/) - 影片處理核心
- [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - WebAssembly 移植
- [Inter Font](https://rsms.me/inter/) - 字型設計

---

Made with ❤️ by [miku4ocean](https://github.com/miku4ocean)
