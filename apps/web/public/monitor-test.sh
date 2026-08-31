#!/bin/bash

# 简单的测试脚本 - 监控浏览器测试结果

echo "======================================"
echo "FFmpeg 浏览器自动化测试监控"
echo "======================================"
echo ""
echo "✓ Chrome 已打开: http://127.0.0.1:8888/ffmpeg-auto-test.html"
echo ""
echo "等待测试完成..."
echo ""

# 检查页面是否可访问
if curl -s --max-time 2 "http://127.0.0.1:8888/ffmpeg-auto-test.html" > /dev/null 2>&1; then
    echo "✓ 测试页面可访问"
else
    echo "✗ 测试页面无法访问"
    exit 1
fi

# 尝试连接 Chrome DevTools
echo ""
echo "尝试连接 Chrome DevTools..."
if curl -s --max-time 2 "http://127.0.0.1:9222/json" > /dev/null 2>&1; then
    echo "✓ Chrome DevTools 可访问"
    echo ""
    echo "当前标签页:"
    curl -s "http://127.0.0.1:9222/json" | grep -o '"url":"[^"]*"' | head -5
else
    echo "⚠️  Chrome DevTools 未启用"
    echo ""
    echo "请确保:"
    echo "1. Chrome 已安装"
    echo "2. Chrome 已启动"
    echo "3. 启动参数包含 --remote-debugging-port=9222"
fi

echo ""
echo "======================================"
echo "下一步:"
echo "1. 在 Chrome 中打开测试页面"
echo "2. 按 F12 打开 DevTools"
echo "3. 切换到 Console 标签"
echo "4. 查看日志"
echo "5. 截图或复制日志发给我"
echo "======================================"
