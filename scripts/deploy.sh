#!/usr/bin/env bash
# mac-video-transfer-web → Cloudflare Pages（白名單 + WASM 分片）
# 用法：bash scripts/deploy.sh   （需 npx wrangler login 過一次）
# Cloudflare Pages 單檔上限 25MiB，ffmpeg-core.wasm 約 32MB，故切成 20MB 分片
# 並在 .deploy/index.html 注入 wasm-parts meta，由 app.js 的 wasmBlobURL() 合併載入。
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf .deploy && mkdir -p .deploy/ffmpeg
cp index.html app.js styles.css _headers .deploy/
cp ffmpeg/ffmpeg.js ffmpeg/814.ffmpeg.js ffmpeg/ffmpeg-core.js .deploy/ffmpeg/
split -b 20m -a 1 ffmpeg/ffmpeg-core.wasm .deploy/ffmpeg/ffmpeg-core.wasm.part-
i=0; parts=""
for f in .deploy/ffmpeg/ffmpeg-core.wasm.part-*; do
  n="ffmpeg-core.wasm.part$i.bin"; mv "$f" ".deploy/ffmpeg/$n"
  parts="$parts${parts:+,}\"$n\""; i=$((i+1))
done
meta=$(echo "$parts" | tr -d '"')
sed -i.bak "s|</head>|<meta name=\"wasm-parts\" content=\"$meta\">\n</head>|" .deploy/index.html && rm .deploy/index.html.bak
echo "==> .deploy/ 檔案清單："; (cd .deploy && find . -type f -exec ls -l {} \; | awk '{print $5, $9}' | sort -k2)
npx wrangler pages deploy .deploy --project-name mac-video-transfer-web --branch main
