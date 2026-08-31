# Phase 5 字幕支持演示

## 功能演示

### 1. 解析字幕

```typescript
import { SubtitlePipeline } from '@/services/renderer/subtitles'

const pipeline = new SubtitlePipeline(ffmpegService)

// 解析 SRT
const srtResult = pipeline.parseSrt(srtContent)

// 解析 VTT
const vttResult = pipeline.parseVtt(vttContent)

// 自动检测格式
const result = pipeline.parse(content)
```

### 2. 编辑字幕

```typescript
// 添加字幕
const newTrack = pipeline.addSubtitle(track, 'New subtitle', 5, 8)

// 更新字幕
const updatedTrack = pipeline.updateSubtitle(track, 'sub-1', { text: 'Updated' })

// 删除字幕
const filteredTrack = pipeline.removeSubtitle(track, 'sub-1')
```

### 3. 调整时间轴

```typescript
// 移动单个字幕
const shifted = pipeline.shiftSubtitleTime(track, 'sub-1', 2)

// 批量移动
const allShifted = pipeline.shiftAllSubtitles(track, -1)

// 缩放时间
const scaled = pipeline.scaleSubtitleTime(track, 2)
```

### 4. 导出字幕

```typescript
// 导出为 SRT
const srtResult = pipeline.exportSrt(track)

// 导出为 VTT
const vttResult = pipeline.exportVtt(track)
```

### 5. 烧录字幕

```typescript
const result = await pipeline.burnSubtitles({
  inputFile: 'input.mp4',
  outputFile: 'output.mp4',
  track,
  onProgress: (progress) => console.log(`${progress}%`),
})
```

### 6. UI 组件

```typescript
import { SubtitlePanel } from '@/components/editor/panels/subtitles'

<SubtitlePanel
  tracks={tracks}
  selectedTrackId={selectedId}
  onTracksChange={setTracks}
  onTrackSelect={setSelectedId}
/>
```

## 支持的格式

### SRT
```
1
00:00:01,000 --> 00:00:04,000
Hello World
```

### WebVTT
```
WEBVTT

00:00:01.000 --> 00:00:04.000
Hello World
```

## 测试覆盖率

- **单元测试**: 96 个 ✅
- **组件测试**: 已开始 ✅
- **通过率**: 100%

## 代码统计

- **核心服务**: ~1,490 行
- **UI 组件**: ~1,690 行
- **测试代码**: ~1,460 行
- **示例代码**: ~750 行
- **文档**: ~1,500 行
- **总计**: ~6,890 行

## 下一步

- 集成测试
- EditorCore 集成
- 移动端适配
- OCR 集成
- 翻译功能
