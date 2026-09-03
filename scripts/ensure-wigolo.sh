#!/usr/bin/env bash
# =============================================================================
# ensure-wigolo.sh - ensure wigolo daemon is running (MCP prerequisite)
#
# wigolo's stdio MCP server proxies to its daemon: if the daemon is down,
# tools/list returns empty and the AI assistant's search/fetch tools idle.
# Call this before dev to guarantee availability.
#
# Usage:
#   bash scripts/ensure-wigolo.sh           # check and start (idempotent)
#   WIGOLO_PORT=9999 bash scripts/ensure-wigolo.sh
# =============================================================================
set -uo pipefail

WIGOLO_BIN="${WIGOLO_BIN:-/Users/mac/.npm-global/bin/wigolo}"
WIGOLO_PORT="${WIGOLO_PORT:-3081}"
HEALTH_URL="http://127.0.0.1:${WIGOLO_PORT}/health"

# 1. check wigolo binary exists
if [[ ! -x "$WIGOLO_BIN" ]]; then
  echo "[wigolo] binary not found: $WIGOLO_BIN (skip; AI search tools unavailable)"
  exit 0
fi

# 2. check daemon via wigolo health
health="$("$WIGOLO_BIN" health --json 2>/dev/null || true)"
if echo "$health" | grep -q '"status":"ok"'; then
  echo "[wigolo] daemon already running (port $WIGOLO_PORT)"
  exit 0
fi

# 3. probe HTTP directly (health may false-negative on fetch failure)
if curl -s --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  echo "[wigolo] daemon already running (HTTP $HEALTH_URL)"
  exit 0
fi

# 4. start daemon in background
LOG_DIR="$(cd "$(dirname "$0")/.." && pwd)/.wigolo-logs"
mkdir -p "$LOG_DIR"
echo "[wigolo] starting daemon (port $WIGOLO_PORT)..."
nohup "$WIGOLO_BIN" serve --port "$WIGOLO_PORT" \
  > "$LOG_DIR/wigolo-daemon.log" 2>&1 &
WIGOLO_PID=$!
echo "  PID: $WIGOLO_PID"

# 5. wait for health (max 10s)
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if curl -s --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "[wigolo] daemon ready ($HEALTH_URL)"
    exit 0
  fi
done

echo "[wigolo] daemon not ready in 10s; check $LOG_DIR/wigolo-daemon.log"
exit 0
