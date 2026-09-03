#!/usr/bin/env bash
# reclip-dl — ReClip (yt-dlp wrapper) 素材下载 CLI
#
# 用途：让 AI 助手 / 开发者通过命令行调用 ReClip 本地服务下载视频/音频素材。
#  - 检查 ReClip 是否运行，未运行自动尝试启动
#  - info:     查询链接可下载信息（标题/清晰度/时长）
#  - download: 下载视频(MP4)或音频(MP3)，完成后复制到目标目录
#
# ReClip 地址: http://localhost:8899 (来自 ~/Tools/reclip)
# API: POST /api/info, POST /api/download, GET /api/status/<job_id>, GET /api/file/<job_id>
set -euo pipefail

RECLIP_URL="${RECLIP_URL:-http://localhost:8899}"
RECLIP_DIR="${RECLIP_DIR:-$HOME/Tools/reclip}"
DEFAULT_OUT_DIR="downloads/reclip"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[reclip]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[reclip]${NC} $*"; }
log_error() { echo -e "${RED}[reclip]${NC} $*" >&2; }

# 检查 ReClip 是否在线；不在线则尝试启动
ensure_reclip() {
  if curl -sf -o /dev/null --max-time 2 "$RECLIP_URL/"; then
    return 0
  fi
  log_warn "ReClip 未在 ${RECLIP_URL} 运行，尝试启动..."
  if [ ! -d "$RECLIP_DIR" ]; then
    log_error "找不到 ReClip 目录: $RECLIP_DIR (请先 git clone https://github.com/averygan/reclip $RECLIP_DIR)"
    exit 1
  fi
  cd "$RECLIP_DIR"
  nohup ./reclip.sh > /tmp/reclip.log 2>&1 &
  for _ in $(seq 1 15); do
    sleep 1
    if curl -sf -o /dev/null --max-time 2 "$RECLIP_URL/"; then
      log_info "ReClip 已启动 (PID $!)"
      return 0
    fi
  done
  log_error "ReClip 启动失败，查看日志: tail /tmp/reclip.log"
  exit 1
}

usage() {
  cat <<'EOF'
reclip-dl — 素材下载 CLI（基于 ReClip / yt-dlp）

用法:
  reclip-dl info <url>
      查询链接信息（标题/时长/清晰度）

  reclip-dl download <url> [video|audio] [--height 1080] [--out <目录>]
      下载视频(默认, MP4)或音频(MP3)
      示例:
        reclip-dl download "https://youtube.com/watch?v=xxx"
        reclip-dl download "https://youtu.be/xxx" audio
        reclip-dl download "https://vimeo.com/xxx" video --height 720 --out assets/refs

  reclip-dl status <job_id>
      查询下载任务进度

环境变量:
  RECLIP_URL   ReClip 地址 (默认 http://localhost:8899)
  RECLIP_DIR   ReClip 源码目录 (默认 ~/Tools/reclip)
EOF
}

info_cmd() {
  local url="$1"
  ensure_reclip
  log_info "查询: $url"
  local resp
  resp=$(curl -sf --max-time 60 -X POST "$RECLIP_URL/api/info" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$url\"}")
  if [ -z "$resp" ]; then
    log_error "查询失败，链接可能不支持或需要登录"
    exit 1
  fi
  echo "$resp" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'error' in d:
    print('ERROR:', d['error']); sys.exit(1)
print('标题:    ', d.get('title', ''))
print('作者:    ', d.get('uploader', ''))
print('时长:    ', d.get('duration', '?'), '秒')
print('清晰度:  ', ', '.join(f['label'] for f in d.get('formats', [])) or '（无损/未知）')
print('封面:    ', d.get('thumbnail', ''))
"
}

download_cmd() {
  local url="$1" fmt="${2:-video}" height=""
  local out_dir="$DEFAULT_OUT_DIR"

  # 解析可选参数
  shift 2 2>/dev/null || true
  while [ $# -gt 0 ]; do
    case "$1" in
      --height) height="$2"; shift 2 ;;
      --out)    out_dir="$2"; shift 2 ;;
      *) log_error "未知参数: $1"; usage; exit 1 ;;
    esac
  done

  ensure_reclip

  # 先查信息（拿 title）
  local info
  info=$(curl -sf --max-time 60 -X POST "$RECLIP_URL/api/info" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$url\"}") || { log_error "链接解析失败"; exit 1; }

  local title
  title=$(echo "$info" | python3 -c "import sys,json; print(json.load(sys.stdin).get('title',''))" 2>/dev/null || true)

  # 选 format_id（如需指定清晰度）
  local format_id=""
  if [ -n "$height" ]; then
    format_id=$(echo "$info" | python3 -c "
import sys, json
d = json.load(sys.stdin)
h = int('$height')
best = None
for f in d.get('formats', []):
    if f.get('height') == h or f.get('height', 0) <= h:
        if best is None or f.get('height', 0) > best['height']:
            best = f
print(best['id'] if best else '')
" 2>/dev/null || true)
    if [ -n "$format_id" ]; then
      log_info "选择清晰度: ${height}p (format_id=$format_id)"
    else
      log_warn "没有 ${height}p 档位，使用最佳可用"
    fi
  fi

  local payload
  payload=$(python3 -c "
import json, sys
p = {'url': '$url'.replace(\"'\", \"\\\"\"), 'format': '$fmt', 'title': '$title'.replace(\"'\", \"\\\"\")}
if '$format_id': p['format_id'] = '$format_id'
print(json.dumps(p))
")

  log_info "提交下载: $title (${fmt})"
  local job
  job=$(curl -sf --max-time 30 -X POST "$RECLIP_URL/api/download" \
    -H "Content-Type: application/json" -d "$payload")
  local job_id
  job_id=$(echo "$job" | python3 -c "import sys,json; print(json.load(sys.stdin).get('job_id',''))" 2>/dev/null || true)
  if [ -z "$job_id" ]; then
    log_error "提交失败: $job"
    exit 1
  fi
  log_info "任务已提交: job_id=$job_id"

  status_cmd "$job_id" "$out_dir" "$fmt"
}

status_cmd() {
  local job_id="${1:-}" out_dir="${2:-$DEFAULT_OUT_DIR}" fmt="${3:-video}"
  if [ -z "$job_id" ]; then
    log_error "缺少 job_id"; usage; exit 1
  fi

  log_info "轮询下载进度 (job_id=$job_id)..."
  local st=""
  for _ in $(seq 1 60); do
    st=$(curl -sf --max-time 5 "$RECLIP_URL/api/status/$job_id") || true
    local status_name
    status_name=$(echo "$st" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))" 2>/dev/null || true)
    case "$status_name" in
      done)
        log_info "下载完成 ✅"
        fetch_file "$job_id" "$out_dir" "$fmt" "$st"
        return 0
        ;;
      error)
        log_error "下载失败: $(echo "$st" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)"
        exit 1
        ;;
      downloading|"")
        printf "."
        sleep 3
        ;;
    esac
  done
  log_warn "等待超时（5 分钟），任务仍在后台进行。用下面命令查看:"
  echo "  $RECLIP_URL/api/status/$job_id"
  exit 1
}

fetch_file() {
  local job_id="$1" out_dir="$2" fmt="${3:-video}" st="$4"
  local filename
  filename=$(echo "$st" | python3 -c "import sys,json; print(json.load(sys.stdin).get('filename',''))" 2>/dev/null || true)

  mkdir -p "$out_dir"
  local dest="$out_dir/$filename"
  if [ -z "$filename" ]; then
    dest="$out_dir/reclip-$job_id.${fmt/audio/mp3}"
    dest="${dest/audio/mp3}"
  fi

  curl -sf --max-time 300 "$RECLIP_URL/api/file/$job_id" -o "$dest" || { log_error "文件下载失败"; exit 1; }
  if [[ "$dest" != /* ]]; then
    dest="$(pwd)/$dest"
  fi
  log_info "已保存: $dest ($(du -h "$dest" | cut -f1))"
}

# --- main ---
case "${1:-}" in
  info)          info_cmd "${2:?用法: reclip-dl info <url>}" ;;
  download)      download_cmd "$2" "${3:-video}" "${@:4}" ;;
  status)        status_cmd "${2:-}" ;;
  *)             usage; exit 0 ;;
esac