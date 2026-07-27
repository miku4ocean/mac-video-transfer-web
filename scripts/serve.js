#!/usr/bin/env node
/**
 * 本機靜態伺服器，供 Playwright 測試在真正的 http:// 環境下驗證。
 *
 * 背景：舊 HANDOFF 曾記載「需要 COOP/COEP header」的地雷，但已於 2026-07-20
 * 確認本專案使用單執行緒 FFmpeg core（見 app.js:1068 註解），不依賴
 * SharedArrayBuffer，因此預設「不」加 COOP/COEP header（加了反而會擋掉
 * index.html 對 fonts.googleapis.com 的跨來源請求，屬於不必要的風險）。
 *
 * 若未來 FFmpeg core 換成多執行緒版本、需要 SharedArrayBuffer，可用
 * COOP_COEP=1 環境變數開啟這兩個 header 再驗證一次。
 *
 * 用法：node scripts/serve.js [port]
 *       PORT=4173 node scripts/serve.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 4173);
const ENABLE_COOP_COEP = process.env.COOP_COEP === '1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, urlPath));

  // 防止路徑跳脫到專案目錄之外
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found: ' + urlPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };

    if (ENABLE_COOP_COEP) {
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
      headers['Cross-Origin-Embedder-Policy'] = 'require-corp';
    }

    res.writeHead(200, headers);
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[serve] http://localhost:${PORT} (root=${ROOT}, COOP/COEP=${ENABLE_COOP_COEP})`);
});
