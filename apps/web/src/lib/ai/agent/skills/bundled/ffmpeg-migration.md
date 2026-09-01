---
name: ffmpeg-migration
description: FFmpeg.wasm 迁移工作流 - 检查迁移状态、组件清单、导出引擎与已知问题
tags: [ffmpeg, wasm, migration, export]
---
# FFmpeg.wasm 迁移技能

## 用途
当用户询问「FFmpeg 迁移进度」「导出引擎使用什么」「是否已切换到 FFmpeg.wasm」时，按此流程检查。

## 执行步骤
1. 查看 `docs/` 目录中与 ffmpeg 迁移相关的文档（08.FFmpeg迁移任务.md）
2. 检查源码中导出引擎：搜索 `scene-exporter.ts`（Mediabunny）与 `ffmpeg-exporter.ts`（FFmpeg.wasm）的引用
3. 检查 `renderer-manager.ts` 中默认引擎开关（`useFFmpeg`）
4. 汇总：列出 Mediabunny 仍是默认引擎的组件、FFmpeg 已覆盖的组件、迁移障碍

## 输出格式
- 迁移状态：xx%
- 已迁移组件列表
- 未迁移组件列表
- 已知问题