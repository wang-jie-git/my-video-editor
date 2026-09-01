---
name: video-export-troubleshoot
description: 视频导出问题排查 - 导出失败、格式错误、音画不同步、内存不足
tags: [video, export, ffmpeg, troubleshooting]
---
# 视频导出问题排查技能

## 用途
当用户报告视频导出失败、导出格式错误、音画不同步等问题时使用。

## 执行步骤
1. 收集错误信息：操作步骤、错误消息、导出参数（分辨率/编码/格式）
2. 检查导出引擎状态：确认当前使用 Mediabunny 还是 FFmpeg.wasm
3. 按错误类型排查：
   - **导出失败**：检查 COOP/COEP 头（FFmpeg.wasm 需要 SharedArrayBuffer）、检查内存限制
   - **格式错误**：检查容器格式与编码器兼容性（如 webm 不支持 H.264）
   - **音画不同步**：检查音频采样率、检查 `-vsync` 参数
   - **内存不足**：降低分辨率、分段导出
4. 给出修复方案并验证

## 输出格式
- 根因
- 修复步骤
- 验证方式