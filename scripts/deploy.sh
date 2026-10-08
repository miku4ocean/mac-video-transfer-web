#!/usr/bin/env bash
# mac-video-transfer-web → Cloudflare Pages（白名單 + WASM 分片）
# 用法：bash scripts/deploy.sh        （需 npx wrangler login 過一次）
#       DRY_RUN=1 bash scripts/deploy.sh   只建置 .deploy/ 並跑守門，不部署
# 專案名：mac-video-transfer-miku → https://mac-video-transfer-miku.pages.dev
# Cloudflare Pages 單檔上限 25MiB，ffmpeg-core.wasm 約 32MB，故切成 20MB 分片，
# 並在 .deploy/index.html 注入 wasm-parts／wasm-size／wasm-sha256 meta，
# 由 app.js 的 wasmBlobURL() 合併後驗證大小與雜湊再載入。
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=mac-video-transfer-miku

rm -rf .deploy && mkdir -p .deploy/ffmpeg
# 白名單 + 保險用 rsync 排除（即使日後白名單擴大也不會帶出開發檔）
rsync -a \
  --exclude '.*' --exclude '.wrangler' --exclude '.dev.vars*' --exclude 'wrangler.json*' --exclude 'wrangler.toml' \
  --exclude 'tests' --exclude '*.md' --exclude 'package*.json' --exclude 'node_modules' --exclude 'scripts' \
  --exclude '*.sqlite*' --exclude '*.env' --exclude '*.pem' --exclude '*.key' --exclude '*.map' \
  index.html app.js styles.css _headers .deploy/
rsync -a --exclude '*.wasm' ffmpeg/ffmpeg.js ffmpeg/814.ffmpeg.js ffmpeg/ffmpeg-core.js .deploy/ffmpeg/

WASM_SIZE=$(wc -c < ffmpeg/ffmpeg-core.wasm | tr -d ' ')
WASM_SHA=$(shasum -a 256 ffmpeg/ffmpeg-core.wasm | awk '{print $1}')
split -b 20m -a 1 ffmpeg/ffmpeg-core.wasm .deploy/ffmpeg/ffmpeg-core.wasm.part-
i=0; parts=""
for f in .deploy/ffmpeg/ffmpeg-core.wasm.part-*; do
  n="ffmpeg-core.wasm.part$i.bin"; mv "$f" ".deploy/ffmpeg/$n"
  parts="$parts${parts:+,}$n"; i=$((i+1))
done
sed -i.bak "s|</head>|<meta name=\"wasm-parts\" content=\"$parts\">\n<meta name=\"wasm-size\" content=\"$WASM_SIZE\">\n<meta name=\"wasm-sha256\" content=\"$WASM_SHA\">\n</head>|" .deploy/index.html && rm .deploy/index.html.bak

# ---- 部署前守門 ----
bad=$(cd .deploy && find . -mindepth 1 \( -name '.*' -o -name '*.sqlite*' -o -name '*.db' -o -name '*.env' -o -name '.env*' -o -name '*.pem' -o -name '*.key' -o -name '*.p12' -o -name '*.md' -o -name 'package*.json' -o -name 'wrangler.*' -o -name node_modules -o -name tests -o -name '*.map' -o -name '*.log' \) | head -20)
if [ -n "$bad" ]; then
  echo "守門失敗：.deploy 內含不該公開的檔案：" >&2; echo "$bad" >&2
  rm -rf .deploy; exit 1
fi
big=$(cd .deploy && find . -type f -size +25M)
if [ -n "$big" ]; then echo "守門失敗：單檔超過 25MiB：$big" >&2; rm -rf .deploy; exit 1; fi
grep -q 'wasm-sha256' .deploy/index.html || { echo "守門失敗：未注入 wasm 雜湊" >&2; rm -rf .deploy; exit 1; }

echo "==> .deploy/ 檔案清單："; (cd .deploy && find . -type f -exec ls -l {} \; | awk '{print $5, $9}' | sort -k2)
if [ "${DRY_RUN:-}" = "1" ]; then echo "DRY_RUN=1：守門通過，不部署。"; exit 0; fi
npx wrangler pages deploy .deploy --project-name "$PROJECT" --branch main
