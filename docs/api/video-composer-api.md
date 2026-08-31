# VideoComposer API 文档

**版本**: 1.0.0  
**更新日期**: 2026-08-31

## 概述

VideoComposer 是 Cutia 的视频编辑服务类，提供视频合并、转场、分割、裁剪等功能。基于 FFmpeg.wasm 实现，完全在浏览器端运行。

## 目录

- [快速开始](#快速开始)
- [核心方法](#核心方法)
  - [mergeVideos](#mergevideos)
  - [concatWithTransitions](#concatwithtransitions)
  - [splitVideo](#splitvideo)
  - [trimVideo](#trimvideo)
  - [getVideoDuration](#getvideoduration)
  - [getVideoInfo](#getvideoinfo)
- [类型定义](#类型定义)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)
- [FFmpeg 命令参考](#ffmpeg-命令参考)

---

## 快速开始

### 基本用法

```typescript
import { FFmpegService } from './services/renderer/ffmpeg/ffmpeg-service'
import { VideoComposer } from './services/renderer/video-composer'

// 1. 创建 FFmpeg 服务实例
const ffmpegService = new FFmpegService()
await ffmpegService.load()

// 2. 创建 VideoComposer 实例
const composer = new VideoComposer(ffmpegService)

// 3. 使用 VideoComposer
const result = await composer.mergeVideos(
  ['video1.mp4', 'video2.mp4'],
  { outputFile: 'merged.mp4' }
)
```

### 通过 EditorCore 使用

```typescript
import { EditorCore } from '@/core'

const editor = EditorCore.getInstance()

// 启用 FFmpeg 导出
await editor.renderer.enableFFmpegExport(true)

// 获取 VideoComposer 实例
const composer = editor.renderer.getVideoComposer()

// 使用 VideoComposer
const result = await composer.mergeVideos(
  ['video1.mp4', 'video2.mp4'],
  { outputFile: 'merged.mp4' }
)
```

---

## 核心方法

### mergeVideos

合并多个视频文件为一个视频。

```typescript
async mergeVideos(
  inputFiles: string[],
  options: MergeOptions,
  onProgress?: VideoComposerProgress
): Promise<MergeResult>
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `inputFiles` | `string[]` | ✅ | 输入文件列表（文件名，必须在 FFmpeg 虚拟文件系统中） |
| `options.outputFile` | `string` | ✅ | 输出文件名 |
| `options.includeAudio` | `boolean` | ❌ | 是否包含音频，默认 `true` |
| `options.reencode` | `boolean` | ❌ | 是否重新编码，默认 `false`（流复制模式） |
| `onProgress` | `function` | ❌ | 进度回调函数 |

#### 返回值

`MergeResult` 对象：

```typescript
interface MergeResult {
  success: boolean        // 是否成功
  outputFile?: string     // 输出文件名
  size?: number          // 文件大小（字节）
  duration?: number      // 视频时长（秒）
  videoCount?: number    // 合并的视频数量
  error?: string         // 错误信息（仅当 success=false 时）
}
```

#### 示例

```typescript
// 基础合并（流复制模式 - 快速）
const result1 = await composer.mergeVideos(
  ['intro.mp4', 'main.mp4', 'outro.mp4'],
  { outputFile: 'merged.mp4', includeAudio: true, reencode: false }
)

// 重新编码模式（支持转场效果）
const result2 = await composer.mergeVideos(
  ['video1.mp4', 'video2.mp4'],
  { outputFile: 'merged-reencode.mp4', reencode: true }
)
```

#### 错误处理

```typescript
const result = await composer.mergeVideos([], { outputFile: 'output.mp4' })

if (!result.success) {
  console.error('合并失败:', result.error)
  // 可能的错误：
  // - "输入文件列表为空"
  // - "至少需要 2 个视频文件才能合并"
  // - "输出文件名不能为空"
  // - "不支持的文件格式: xxx"
  // - "不支持的输出格式: xxx"
}
```

#### 性能建议

- **流复制模式** (`reencode: false`)：速度快，无质量损失，但不支持转场效果
- **重新编码模式** (`reencode: true`)：速度慢，但支持转场效果，兼容性更好

---

### concatWithTransitions

合并视频并添加转场效果。

```typescript
async concatWithTransitions(
  inputFiles: string[],
  options: TransitionMergeOptions,
  onProgress?: VideoComposerProgress
): Promise<MergeResult>
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `inputFiles` | `string[]` | ✅ | 输入文件列表 |
| `options.outputFile` | `string` | ✅ | 输出文件名 |
| `options.transitions` | `Transition[]` | ✅ | 转场配置列表 |
| `options.includeAudio` | `boolean` | ❌ | 是否包含音频，默认 `true` |

#### Transition 类型

```typescript
interface Transition {
  type: TransitionType      // 转场类型
  duration: number          // 转场时长（秒）
  offset?: number           // 转场偏移（秒，可选）
}

type TransitionType = 'fade' | 'slide' | 'wipe' | 'dissolve'
```

#### 示例

```typescript
// 淡入淡出转场
const result = await composer.concatWithTransitions(
  ['part1.mp4', 'part2.mp4', 'part3.mp4'],
  {
    outputFile: 'merged-with-fade.mp4',
    transitions: [
      { type: 'fade', duration: 1.0 },  // 第一个转场
      { type: 'fade', duration: 1.0 },  // 第二个转场
    ],
  }
)

// 混合转场效果
const result2 = await composer.concatWithTransitions(
  ['intro.mp4', 'main.mp4', 'outro.mp4'],
  {
    outputFile: 'merged-mixed.mp4',
    transitions: [
      { type: 'fade', duration: 0.8 },
      { type: 'slide', duration: 1.0 },
    ],
  }
)
```

---

### splitVideo

将视频分割成多个片段。

```typescript
async splitVideo(
  inputFile: string,
  options: SplitOptions,
  onProgress?: VideoComposerProgress
): Promise<SplitResult>
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `inputFile` | `string` | ✅ | 输入文件名 |
| `options.splitPoints` | `number[]` | ✅ | 分割点列表（秒，必须按升序排列） |
| `options.outputPrefix` | `string` | ✅ | 输出文件前缀 |
| `options.format` | `'mp4' \| 'webm'` | ❌ | 输出格式，默认 `'mp4'` |
| `onProgress` | `function` | ❌ | 进度回调函数 |

#### 返回值

`SplitResult` 对象：

```typescript
interface SplitResult {
  success: boolean          // 是否成功
  outputFiles?: string[]    // 输出文件列表
  segmentCount?: number     // 片段数量
  error?: string           // 错误信息
}
```

#### 示例

```typescript
// 基础分割（在第 10 秒和第 20 秒处分割）
const result1 = await composer.splitVideo(
  'video.mp4',
  { splitPoints: [10, 20], outputPrefix: 'segment' }
)
// 输出: segment_1.mp4, segment_2.mp4, segment_3.mp4

// 精确分割（每隔 30 秒分割一次）
const splitPoints = []
for (let i = 30; i < 300; i += 30) {
  splitPoints.push(i)
}

const result2 = await composer.splitVideo(
  'long-video.mp4',
  { splitPoints, outputPrefix: 'clip' }
)
```

#### 分割点规则

- 分割点必须为**正数**
- 分割点必须按**升序排列**
- 分割点数量 + 1 = 生成的片段数量

---

### trimVideo

裁剪视频的开始和/或结束部分。

```typescript
async trimVideo(
  inputFile: string,
  options: TrimOptions,
  onProgress?: VideoComposerProgress
): Promise<TrimResult>
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `inputFile` | `string` | ✅ | 输入文件名 |
| `options.startTime` | `number` | ✅ | 开始时间（秒，必须 >= 0） |
| `options.endTime` | `number` | ✅ | 结束时间（秒，必须 > startTime） |
| `options.outputFile` | `string` | ✅ | 输出文件名 |
| `options.reencode` | `boolean` | ❌ | 是否重新编码，默认 `false` |
| `onProgress` | `function` | ❌ | 进度回调函数 |

#### 返回值

`TrimResult` 对象：

```typescript
interface TrimResult {
  success: boolean        // 是否成功
  outputFile?: string     // 输出文件名
  size?: number          // 文件大小（字节）
  duration?: number      // 裁剪后的时长（秒）
  error?: string         // 错误信息
}
```

#### 示例

```typescript
// 裁剪开始部分（保留第 5-15 秒）
const result1 = await composer.trimVideo(
  'video.mp4',
  { startTime: 5, endTime: 15, outputFile: 'trimmed.mp4' }
)

// 裁剪结束部分（保留前 2 分钟）
const result2 = await composer.trimVideo(
  'video.mp4',
  { startTime: 0, endTime: 120, outputFile: 'trimmed-end.mp4' }
)

// 提取中间片段（保留第 30-90 秒）
const result3 = await composer.trimVideo(
  'video.mp4',
  { startTime: 30, endTime: 90, outputFile: 'extracted.mp4', reencode: true }
)
```

---

### getVideoDuration

获取视频时长。

```typescript
async getVideoDuration(inputFile: string): Promise<number>
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `inputFile` | `string` | ✅ | 输入文件名 |

#### 返回值

视频时长（秒）

#### 示例

```typescript
const duration = await composer.getVideoDuration('video.mp4')
console.log(`视频时长: ${duration} 秒`) // 输出: 120.5
```

---

### getVideoInfo

获取视频详细信息。

```typescript
async getVideoInfo(inputFile: string): Promise<VideoInfo | null>
```

#### 参数

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `inputFile` | `string` | ✅ | 输入文件名 |

#### 返回值

`VideoInfo` 对象或 `null`（如果获取失败）：

```typescript
interface VideoInfo {
  fileName: string      // 文件名
  duration: number      // 时长（秒）
  width: number        // 宽度（像素）
  height: number       // 高度（像素）
  fps: number          // 帧率
  size: number         // 文件大小（字节）
  hasAudio: boolean    // 是否有音频
  videoCodec?: string  // 视频编码器
  audioCodec?: string  // 音频编码器
}
```

#### 示例

```typescript
const info = await composer.getVideoInfo('video.mp4')

if (info) {
  console.log(`时长: ${info.duration} 秒`)
  console.log(`分辨率: ${info.width}x${info.height}`)
  console.log(`帧率: ${info.fps} fps`)
  console.log(`大小: ${(info.size / 1024 / 1024).toFixed(2)} MB`)
  console.log(`编码: ${info.videoCodec}`)
}
```

---

## 类型定义

### MergeOptions

```typescript
interface MergeOptions {
  outputFile: string           // 输出文件名
  includeAudio?: boolean       // 是否包含音频（默认 true）
  reencode?: boolean          // 是否重新编码（默认 false）
  format?: 'mp4' | 'webm'     // 输出格式
}
```

### MergeResult

```typescript
interface MergeResult {
  success: boolean        // 是否成功
  outputFile?: string     // 输出文件名
  size?: number          // 文件大小（字节）
  duration?: number      // 视频时长（秒）
  videoCount?: number    // 合并的视频数量
  error?: string         // 错误信息
}
```

### SplitOptions

```typescript
interface SplitOptions {
  inputFile: string           // 输入文件名
  splitPoints: number[]       // 分割点列表（秒）
  outputPrefix: string        // 输出文件前缀
  format?: 'mp4' | 'webm'     // 输出格式
  includeAudio?: boolean      // 是否包含音频
}
```

### SplitResult

```typescript
interface SplitResult {
  success: boolean          // 是否成功
  outputFiles?: string[]    // 输出文件列表
  segmentCount?: number     // 片段数量
  error?: string           // 错误信息
}
```

### TrimOptions

```typescript
interface TrimOptions {
  inputFile: string           // 输入文件名
  startTime: number          // 开始时间（秒）
  endTime: number            // 结束时间（秒）
  outputFile: string         // 输出文件名
  reencode?: boolean         // 是否重新编码
  format?: 'mp4' | 'webm'    // 输出格式
}
```

### TrimResult

```typescript
interface TrimResult {
  success: boolean        // 是否成功
  outputFile?: string     // 输出文件名
  size?: number          // 文件大小（字节）
  duration?: number      // 裁剪后的时长（秒）
  error?: string         // 错误信息
}
```

### Transition

```typescript
interface Transition {
  type: TransitionType      // 转场类型
  duration: number          // 转场时长（秒）
  offset?: number           // 转场偏移（秒，可选）
}

type TransitionType = 'fade' | 'slide' | 'wipe' | 'dissolve'
```

### VideoInfo

```typescript
interface VideoInfo {
  fileName: string      // 文件名
  duration: number      // 时长（秒）
  width: number        // 宽度（像素）
  height: number       // 高度（像素）
  fps: number          // 帧率
  size: number         // 文件大小（字节）
  hasAudio: boolean    // 是否有音频
  videoCodec?: string  // 视频编码器
  audioCodec?: string  // 音频编码器
}
```

### VideoComposerProgress

```typescript
interface VideoComposerProgress {
  phase: 'merging' | 'splitting' | 'trimming' | 'transition' | 'complete' | 'error'
  progress: number        // 总体进度（0-1）
  currentFile?: string    // 当前操作的文件
  completed: number       // 已完成的操作数
  total: number          // 总操作数
  error?: string         // 错误信息
}
```

---

## 错误处理

### 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `输入文件列表为空` | `inputFiles` 为空数组 | 提供至少一个文件 |
| `至少需要 2 个视频文件才能合并` | 只有一个文件 | 提供至少 2 个文件 |
| `输出文件名不能为空` | `outputFile` 为空 | 提供有效的输出文件名 |
| `不支持的文件格式: xxx` | 文件格式不支持 | 使用支持的格式（mp4, webm, mov, avi, mkv） |
| `分割点必须大于 0` | 分割点 <= 0 | 使用正数分割点 |
| `分割点必须按升序排列` | 分割点未排序 | 对分割点进行升序排序 |
| `开始时间不能为负数` | `startTime` < 0 | 使用 >= 0 的开始时间 |
| `结束时间必须大于开始时间` | `endTime` <= `startTime` | 确保结束时间 > 开始时间 |
| `裁剪时长不能小于 0.1 秒` | 裁剪时长 < 0.1s | 至少裁剪 0.1 秒 |

### 错误处理最佳实践

```typescript
try {
  const result = await composer.mergeVideos(files, options)

  if (result.success) {
    console.log('合并成功:', result.outputFile)
  } else {
    console.error('合并失败:', result.error)
    // 根据错误类型采取不同措施
    if (result.error?.includes('文件格式')) {
      // 提示用户选择正确的格式
    }
  }
} catch (error) {
  console.error('异常:', error)
  // 处理未捕获的异常
}
```

---

## 最佳实践

### 1. 文件管理

```typescript
// ✅ 好的做法：在操作前确保文件已写入 FFmpeg 虚拟文件系统
await ffmpegService.writeFile('video1.mp4', fileData1)
await ffmpegService.writeFile('video2.mp4', fileData2)

const result = await composer.mergeVideos(
  ['video1.mp4', 'video2.mp4'],
  { outputFile: 'merged.mp4' }
)

// ❌ 不好的做法：直接使用未确认的文件名
const result = await composer.mergeVideos(
  ['/path/to/video.mp4'], // 错误：应该使用文件名
  { outputFile: 'merged.mp4' }
)
```

### 2. 进度追踪

```typescript
// ✅ 好的做法：提供进度回调
const result = await composer.mergeVideos(files, options, (progress) => {
  const percent = (progress.progress * 100).toFixed(1)
  console.log(`进度: ${percent}%`)

  // 更新 UI
  updateProgressBar(progress.progress)
})

// ❌ 不好的做法：不追踪进度
const result = await composer.mergeVideos(files, options)
```

### 3. 资源清理

```typescript
// ✅ 好的做法：操作完成后清理临时文件
try {
  const result = await composer.mergeVideos(files, options)
  // 处理结果
} finally {
  // 清理临时文件
  await composer.cleanup(['temp1.mp4', 'temp2.mp4'])
}

// 或者使用 FFmpegService 清理
await ffmpegService.deleteFile('temp.mp4')
```

### 4. 流复制 vs 重新编码

```typescript
// ✅ 合并简单视频（相同编码）使用流复制
await composer.mergeVideos(files, { reencode: false })

// ✅ 需要转场效果时使用重新编码
await composer.concatWithTransitions(files, { transitions })

// ✅ 需要精确裁剪时使用重新编码
await composer.trimVideo(file, { startTime, endTime, reencode: true })
```

### 5. 分割点计算

```typescript
// ✅ 好的做法：动态计算分割点
const videoInfo = await composer.getVideoInfo('video.mp4')
const interval = 30 // 每 30 秒一个片段
const splitPoints = []

for (let t = interval; t < videoInfo.duration; t += interval) {
  splitPoints.push(t)
}

await composer.splitVideo('video.mp4', {
  splitPoints,
  outputPrefix: 'segment',
})

// ❌ 不好的做法：硬编码分割点
await composer.splitVideo('video.mp4', {
  splitPoints: [30, 60, 90], // 可能超出视频时长
  outputPrefix: 'segment',
})
```

---

## FFmpeg 命令参考

VideoComposer 内部使用以下 FFmpeg 命令：

### mergeVideos（流复制模式）

```bash
# 生成文件列表
echo "file 'video1.mp4'" > filelist.txt
echo "file 'video2.mp4'" >> filelist.txt

# 合并视频
ffmpeg -f concat -safe 0 -i filelist.txt -c copy -y output.mp4
```

### mergeVideos（重新编码模式）

```bash
ffmpeg -i video1.mp4 -i video2.mp4 \
  -filter_complex "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[vout][aout]" \
  -map "[vout]" -map "[aout]" \
  -y output.mp4
```

### concatWithTransitions（转场效果）

```bash
# 淡入淡出转场
ffmpeg -i video1.mp4 -i video2.mp4 \
  -filter_complex \
  "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[xfade=transition=fade:offset=5:duration=1][ain]" \
  -map "[xfade]" -map "[ain]" \
  -y output.mp4
```

**支持的转场类型**:
- `fade` - 淡入淡出
- `slide` - 滑动
- `wipe` - 擦除
- `dissolve` - 溶解

### splitVideo

```bash
# 第 1 个片段（0-10 秒）
ffmpeg -i input.mp4 -ss 0 -t 10 -c copy -y segment_1.mp4

# 第 2 个片段（10-20 秒）
ffmpeg -i input.mp4 -ss 10 -t 10 -c copy -y segment_2.mp4

# 第 3 个片段（20 秒到结尾）
ffmpeg -i input.mp4 -ss 20 -c copy -y segment_3.mp4
```

### trimVideo（流复制模式）

```bash
# 裁剪视频（保留第 5-15 秒）
ffmpeg -i input.mp4 -ss 5 -t 10 -c copy -y output.mp4
```

### trimVideo（重新编码模式）

```bash
# 精确裁剪（重新编码）
ffmpeg -i input.mp4 -ss 5 -t 10 -c:v libx264 -c:a aac -y output.mp4
```

### getVideoDuration（FFprobe）

```bash
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 video.mp4
# 输出: 120.5
```

### getVideoInfo（FFprobe）

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,r_frame_rate,codec_name \
  -show_entries format=duration,size \
  -of json video.mp4
```

---

## 版本历史

- **v1.0.0** (2026-08-31): 初始版本
  - 支持视频合并、转场、分割、裁剪
  - 完整的类型定义
  - FFmpeg.wasm 集成

---

**维护**: Cutia 开发团队  
**许可**: MIT
