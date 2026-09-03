#!/usr/bin/env bash
# =============================================================================
# 全量测试 runner（规避 bun 1.4 测试发现 bug）
#
# bun 1.4 的目录参数/无参发现存在 bug：
#   - 无参只发现 11/47 个测试文件（深层 __tests__ 被跳过）
#   - 多目录参数只跑第一个目录
# 因此这里用 find 显式列出全部测试文件，逐文件运行并汇总结果。
#
# 用法:
#   bash scripts/run-tests.sh          # 全量
#   bash scripts/run-tests.sh --list   # 仅列出测试文件
# =============================================================================
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
ROOT="$(pwd)"
WEB_DIR="$ROOT/apps/web"

# 收集所有测试文件（在 apps/web 下）
cd "$WEB_DIR" || { echo "❌ 找不到 apps/web 目录"; exit 1; }
FILES=()
while IFS= read -r f; do
  FILES+=("$f")
done < <(find src -name "*.test.ts" -not -path "*/node_modules/*" | sort)

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "❌ 未找到任何测试文件"
  exit 1
fi

if [[ "${1:-}" == "--list" ]]; then
  printf '共 %d 个测试文件:\n' "${#FILES[@]}"
  printf '  %s\n' "${FILES[@]}"
  exit 0
fi

echo "🔍 发现 ${#FILES[@]} 个测试文件，开始逐文件运行..."

# bun 二进制（后台/CI 环境无 PATH 时也可用）
BUN_BIN="${BUN_BIN:-/Users/mac/.bun/bin/bun}"
if [[ ! -x "$BUN_BIN" ]]; then
  BUN_BIN="$(command -v bun || true)"
fi
if [[ -z "$BUN_BIN" ]]; then
  echo "❌ 找不到 bun 二进制，请设置 BUN_BIN 环境变量"
  exit 1
fi

PASS_TOTAL=0
FAIL_TOTAL=0
ERRORS=0

for f in "${FILES[@]}"; do
  # 每个文件独立运行，规避 bun 1.4 目录发现 bug
  output="$("$BUN_BIN" test --timeout 30000 "$f" 2>&1)"
  code=$?

  if [[ $code -eq 0 ]]; then
    PASS_TOTAL=$((PASS_TOTAL + 1))
    # 提取 pass 数（示例: "Ran 10 tests across 1 file."）
    ran="$(echo "$output" | grep -oE 'Ran [0-9]+ tests' | head -1 || true)"
    echo "✅ $f $ran"
  else
    FAIL_TOTAL=$((FAIL_TOTAL + 1))
    echo "❌ $f (exit=$code)"
    # 显示失败详情（限制行数）
    echo "$output" | grep -E "\(fail\)|error:" | head -5 | sed 's/^/    /'
  fi
done

echo ""
echo "=========================================="
echo "📊 全量测试汇总"
echo "=========================================="
echo "  测试文件总数: ${#FILES[@]}"
echo "  通过: $PASS_TOTAL"
echo "  失败: $FAIL_TOTAL"
if [[ $FAIL_TOTAL -gt 0 ]]; then
  echo "⚠️  存在失败测试！"
  exit 1
fi
echo "🎉 全部通过！"
exit 0
