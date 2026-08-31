# VideoComposer 用户使用指南

**版本**: 1.0.0  
**更新日期**: 2026-08-31

## 目录

1. [简介](#简介)
2. [快速开始](#快速开始-1)
3. [视频合并](#视频合并)
4. [添加转场效果](#添加转场效果)
5. [视频分割](#视频分割)
6. [视频裁剪](#视频裁剪)
7. [完整工作流](#完整工作流)
8. [常见问题](#常见问题)
9. [性能优化](#性能优化)
10. [故障排除](#故障排除)

---

## 简介

VideoComposer 是 Cutia 内置的视频编辑工具，提供以下功能：

- ✅ **视频合并**: 将多个视频片段合并为一个完整的视频
- ✅ **转场效果**: 在视频片段之间添加淡入淡出、滑动等转场效果
- ✅ **视频分割**: 将长视频分割成多个短片段
- ✅ **视频裁剪**: 裁剪视频的开始和结束部分
- ✅ **进度追踪**: 实时显示操作进度

### 系统要求

- **浏览器**: Chrome 94+, Edge 94+, Firefox 79+（需要 SharedArrayBuffer 支持）
- **网络**: 需要加载 FFmpeg.wasm（约 25MB）
- **内存**: 建议至少 4GB RAM

---

## 快速开始

### 启用 FFmpeg

VideoComposer 依赖 FFmpeg.wasm，使用前需要先启用：

```typescript
import { EditorCore } from '@/core'

// 获取 EditorCore 实例
const editor = EditorCore.getInstance()

// 启用 FFmpeg 导出
await editor.renderer.enableFFmpegExport(true)

// 获取 VideoComposer 实例
const composer = editor.renderer.getVideoComposer()
```

### 第一个合并示例

```typescript
// 1. 确保视频文件已上传到 FFmpeg 虚拟文件系统
const video1 = await fetch('/api/videos/video1.mp4')
const video2 = await fetch('/api/videos/video2.mp4')

await editor.renderer.ffmpegService?.writeFile(
  'video1.mp4',
  new Uint8Array(await video1.arrayBuffer())
)
await editor.renderer.ffmpegService?.writeFile(
  'video2.mp4',
  new Uint8Array(await video2.arrayBuffer())
)

// 2. 合并视频
const result = await composer.mergeVideos(
  ['video1.mp4', 'video2.mp4'],
  {
    outputFile: 'merged.mp4',
    includeAudio: true,
    reencode: false,
  },
  (progress) => {
    console.log(`进度: ${(progress.progress * 100).toFixed(1)}%`)
  }
)

// 3. 处理结果
if (result.success) {
  console.log('合并成功:', result.outputFile)
  // 下载或进一步处理
} else {
  console.error('合并失败:', result.error)
}
```

---

## 视频合并

### 基础合并

最简单的视频合并方式，速度快，无质量损失：

```typescript
const result = await composer.mergeVideos(
  ['intro.mp4', 'main.mp4', 'outro.mp4'],
  {
    outputFile: 'full-video.mp4',
    includeAudio: true,
    reencode: false, // 流复制模式（快速）
  }
)
```

**特点**:
- ✅ 速度极快（几乎瞬间完成）
- ✅ 无质量损失
- ❌ 不支持转场效果
- ❌ 要求所有视频编码格式相同

### 何时使用流复制模式

- 视频格式完全一致
- 不需要转场效果
- 追求速度

### 何时使用重新编码模式

- 需要添加转场效果
- 视频格式不一致
- 需要重新编码为特定格式

```typescript
const result = await composer.mergeVideos(
  ['video1.mp4', 'video2.mp4'],
  {
    outputFile: 'merged.mp4',
    includeAudio: true,
    reencode: true, // 重新编码模式（较慢但支持转场）
  }
)
```

### 合并多个视频

```typescript
const videos = [
  'scene1.mp4',
  'scene2.mp4',
  'scene3.mp4',
  'scene4.mp4',
  'scene5.mp4',
]

const result = await composer.mergeVideos(videos, {
  outputFile: 'full-video.mp4',
  includeAudio: true,
  reencode: false,
})

if (result.success) {
  console.log(`成功合并 ${result.videoCount} 个视频`)
}
```

---

## 添加转场效果

### 转场类型

VideoComposer 支持 4 种转场效果：

| 类型 | 描述 | 适用场景 |
|------|------|---------|
| `fade` | 淡入淡出 | 通用场景，柔和过渡 |
| `slide` | 滑动 | 横向/纵向滑动切换 |
| `wipe` | 擦除 | 从一个画面擦除到另一个 |
| `dissolve` | 溶解 | 像素级混合过渡 |

### 基础转场

```typescript
const result = await composer.concatWithTransitions(
  ['part1.mp4', 'part2.mp4', 'part3.mp4'],
  {
    outputFile: 'merged-with-fade.mp4',
    transitions: [
      { type: 'fade', duration: 1.0 }, // 转场 1：1 秒淡入淡出
      { type: 'fade', duration: 1.0 }, // 转场 2：1 秒淡入淡出
    ],
  }
)
```

**注意**: 转场数量必须比视频数量少 1（N 个视频需要 N-1 个转场）

### 混合转场效果

```typescript
const result = await composer.concatWithTransitions(
  ['intro.mp4', 'main.mp4', 'outro.mp4'],
  {
    outputFile: 'merged-mixed.mp4',
    transitions: [
      { type: 'fade', duration: 0.8 },   // 淡入淡出
      { type: 'slide', duration: 1.0 },  // 滑动
    ],
  }
)
```

### 自定义转场时长

```typescript
// 快速转场（0.5 秒）
const quick = await composer.concatWithTransitions(
  ['video1.mp4', 'video2.mp4'],
  {
    outputFile: 'quick.mp4',
    transitions: [{ type: 'fade', duration: 0.5 }],
  }
)

// 慢速转场（2 秒）
const slow = await composer.concatWithTransitions(
  ['video1.mp4', 'video2.mp4'],
  {
    outputFile: 'slow.mp4',
    transitions: [{ type: 'fade', duration: 2.0 }],
  }
)
```

### 转场时长建议

| 场景 | 推荐时长 |
|------|---------|
| 快速切换（新闻/体育） | 0.3 - 0.5 秒 |
| 标准转场（通用） | 0.8 - 1.2 秒 |
| 慢动作/情感场景 | 1.5 - 2.0 秒 |
| 片头/片尾 | 2.0 - 3.0 秒 |

---

## 视频分割

### 基础分割

将视频分割成多个片段：

```typescript
const result = await composer.splitVideo(
  'video.mp4',
  {
    splitPoints: [10, 20], // 在第 10 秒和第 20 秒处分割
    outputPrefix: 'segment',
  }
)

// 输出文件：
// segment_1.mp4（0-10 秒）
// segment_2.mp4（10-20 秒）
// segment_3.mp4（20 秒到结尾）
```

### 动态计算分割点

```typescript
// 获取视频时长
const videoInfo = await composer.getVideoInfo('long-video.mp4')

// 每隔 30 秒分割一次
const splitPoints = []
for (let t = 30; t < videoInfo.duration; t += 30) {
  splitPoints.push(t)
}

const result = await composer.splitVideo(
  'long-video.mp4',
  { splitPoints, outputPrefix: 'clip' }
)
```

### 快速分割

```typescript
// 每隔 10 秒分割
const result1 = await composer.splitVideo('video.mp4', {
  splitPoints: [10, 20, 30, 40, 50],
  outputPrefix: 'segment',
})

// 每隔 1 分钟分割
const splitPoints = []
for (let t = 60; t < duration; t += 60) {
  splitPoints.push(t)
}

const result2 = await composer.splitVideo('video.mp4', {
  splitPoints,
  outputPrefix: 'minute',
})
```

### 分割点规则

- ✅ 必须为**正数**
- ✅ 必须按**升序排列**
- ✅ 可以使用小数（如 10.5）
- ❌ 不能超过视频时长（会自动截断到视频末尾）

---

## 视频裁剪

### 裁剪开始部分

移除视频开头的片头：

```typescript
const result = await composer.trimVideo(
  'video-with-intro.mp4',
  {
    startTime: 5,   // 从第 5 秒开始
    endTime: 65,     // 到第 65 秒结束
    outputFile: 'trimmed.mp4',
  }
)
```

### 裁剪结束部分

移除视频结尾的片尾：

```typescript
const result = await composer.trimVideo(
  'video.mp4',
  {
    startTime: 0,    // 从开头开始
    endTime: 120,    // 到第 120 秒结束（移除最后部分）
    outputFile: 'trimmed-end.mp4',
  }
)
```

### 提取中间片段

提取视频中间的一部分：

```typescript
const result = await composer.trimVideo(
  'full-video.mp4',
  {
    startTime: 30,   // 从第 30 秒开始
    endTime: 90,     // 到第 90 秒结束
    outputFile: 'extracted.mp4',
    reencode: true,  // 重新编码以确保精度
  }
)
```

### 裁剪预设

```typescript
// 裁剪前 10%
const result1 = await composer.trimVideo(
  'video.mp4',
  {
    startTime: 0,
    endTime: duration * 0.1,
    outputFile: 'trimmed-start.mp4',
  }
)

// 裁剪后 10%
const result2 = await composer.trimVideo(
  'video.mp4',
  {
    startTime: duration * 0.9,
    endTime: duration,
    outputFile: 'trimmed-end.mp4',
  }
)

// 保留中间 50%
const result3 = await composer.trimVideo(
  'video.mp4',
  {
    startTime: duration * 0.25,
    endTime: duration * 0.75,
    outputFile: 'trimmed-middle.mp4',
  }
)
```

---

## 完整工作流

### 场景：制作完整视频

```typescript
// ============ 步骤 1: 获取视频信息 ============
const videoInfo = await composer.getVideoInfo('source.mp4')
console.log(`视频时长: ${videoInfo?.duration} 秒`)

// ============ 步骤 2: 合并片段 ============
console.log('合并视频片段...')
const mergeResult = await composer.mergeVideos(
  ['intro.mp4', 'main.mp4', 'outro.mp4'],
  {
    outputFile: 'merged.mp4',
    includeAudio: true,
    reencode: false,
  }
)

if (!mergeResult.success) {
  console.error('合并失败:', mergeResult.error)
  return
}

// ============ 步骤 3: 添加转场效果 ============
console.log('添加转场效果...')
const transitionResult = await composer.concatWithTransitions(
  ['intro.mp4', 'main.mp4', 'outro.mp4'],
  {
    outputFile: 'merged-with-transitions.mp4',
    transitions: [
      { type: 'fade', duration: 1.0 },
      { type: 'fade', duration: 1.0 },
    ],
  }
)

if (!transitionResult.success) {
  console.error('转场失败:', transitionResult.error)
  return
}

// ============ 步骤 4: 分割视频 ============
console.log('分割视频...')
const splitResult = await composer.splitVideo(
  'merged-with-transitions.mp4',
  {
    splitPoints: [60, 120, 180], // 每分钟分割
    outputPrefix: 'part',
  }
)

if (!splitResult.success) {
  console.error('分割失败:', splitResult.error)
  return
}

// ============ 步骤 5: 裁剪每个片段 ============
console.log('裁剪片段...')
for (let i = 0; i < splitResult.outputFiles!.length; i++) {
  const inputFile = splitResult.outputFiles![i]
  const outputFile = `part_${i + 1}_final.mp4`

  const trimResult = await composer.trimVideo(
    inputFile,
    {
      startTime: 1,    // 移除开头 1 秒
      endTime: 58,     // 移除结尾 1 秒
      outputFile,
      reencode: false,
    }
  )

  if (trimResult.success) {
    console.log(`✓ 裁剪完成: ${outputFile}`)
  }
}

// ============ 步骤 6: 清理临时文件 ============
console.log('清理临时文件...')
const tempFiles = [
  'merged.mp4',
  'merged-with-transitions.mp4',
  ...splitResult.outputFiles!,
]
await composer.cleanup(tempFiles)

console.log('✓ 工作流完成')
```

---

## 常见问题

### Q1: 为什么合并速度很慢？

**原因**: 使用了重新编码模式（`reencode: true`）

**解决方案**: 如果视频格式一致，使用流复制模式（`reencode: false`）

### Q2: 转场效果不生效？

**原因**: 使用了 `mergeVideos()` 而不是 `concatWithTransitions()`

**解决方案**: 使用 `concatWithTransitions()` 方法

### Q3: 分割后的视频长度不正确？

**原因**: 分割点超出视频时长

**解决方案**: 使用 `getVideoDuration()` 或 `getVideoInfo()` 获取实际时长

```typescript
const info = await composer.getVideoInfo('video.mp4')
const splitPoints = [10, 20, info.duration + 10] // 最后一个点超出时长
// 会自动截断到视频末尾
```

### Q4: 如何处理大文件（>1GB）？

**建议**:
1. 使用流复制模式（`reencode: false`）
2. 确保浏览器有足够的内存（至少 4GB）
3. 避免在内存中同时加载多个大文件

### Q5: 裁剪精度不够？

**原因**: 流复制模式基于关键帧，精度有限

**解决方案**: 使用重新编码模式（`reencode: true`）

```typescript
const result = await composer.trimVideo(
  'video.mp4',
  {
    startTime: 5.123,  // 精确到毫秒
    endTime: 15.456,
    outputFile: 'trimmed.mp4',
    reencode: true,    // 重新编码以确保精度
  }
)
```

---

## 性能优化

### 1. 选择合适的编码模式

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 相同格式合并 | 流复制 | 最快，无质量损失 |
| 添加转场 | 重新编码 | 必须重新编码 |
| 精确裁剪 | 重新编码 | 支持任意时间点 |
| 批量分割 | 流复制 | 速度最快 |

### 2. 减少临时文件

```typescript
// ✅ 好的做法：复用文件
const result = await composer.mergeVideos(files, options)
const splitResult = await composer.splitVideo(result.outputFile!, splitOptions)

// ❌ 不好的做法：多次写入
for (const file of files) {
  const data = await readFile(file)
  await ffmpegService.writeFile(file, data) // 重复写入
}
```

### 3. 进度追踪

```typescript
// 提供进度回调，但避免在回调中执行耗时操作
await composer.mergeVideos(files, options, (progress) => {
  // ✅ 简单操作
  updateProgressBar(progress.progress)

  // ❌ 避免复杂操作
  // saveToDatabase(progress) // 不要在进度回调中执行数据库操作
})
```

---

## 故障排除

### 问题：FFmpeg 加载失败

**症状**: `FFmpegService` 加载超时或失败

**解决方案**:
1. 检查网络连接（需要下载 FFmpeg.wasm）
2. 确保服务器设置了正确的 COOP/COEP headers
3. 尝试使用较小的 WASM 文件

### 问题：内存不足

**症状**: 浏览器崩溃或卡顿

**解决方案**:
1. 减少同时处理的文件数量
2. 使用流复制模式
3. 关闭其他浏览器标签
4. 增加浏览器内存限制

### 问题：输出文件损坏

**症状**: 输出文件无法播放

**解决方案**:
1. 确保输入文件格式支持
2. 检查输出格式选择
3. 尝试使用重新编码模式

### 问题：进度不准确

**症状**: 进度条显示不准确

**原因**: FFmpeg 进度估算不准确

**解决方案**: 这只是视觉问题，不影响实际处理结果

---

## 获取帮助

- **文档**: [Cutia 文档](https://github.com/wang-jie-git/my-video-editor/docs)
- **Issues**: [GitHub Issues](https://github.com/wang-jie-git/my-video-editor/issues)
- **讨论**: [GitHub Discussions](https://github.com/wang-jie-git/my-video-editor/discussions)

---

**版本**: 1.0.0  
**更新日期**: 2026-08-31  
**维护**: Cutia 开发团队
