# 字幕面板组件使用指南

## 概述

字幕面板组件集提供了完整的字幕编辑 UI 解决方案，包括：

- **SubtitlePanel** - 主容器组件
- **SubtitleTrackList** - 轨道列表管理
- **SubtitleEditor** - 单个字幕编辑
- **SubtitleStyleEditor** - 样式编辑器
- **SubtitlePreview** - 实时预览

## 快速开始

### 基础用法

```tsx
import { SubtitlePanel } from '@/components/editor/panels/subtitles'
import { createSubtitle, createSubtitleTrack } from '@/services/renderer/subtitles'

function App() {
  const [tracks, setTracks] = useState([
    createSubtitleTrack('English', 'en', {
      subtitles: [
        createSubtitle('Hello World', 1, 4),
        createSubtitle('This is a test', 5, 8),
      ],
      style: {
        fontSize: 24,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
    }),
  ])

  return (
    <SubtitlePanel
      tracks={tracks}
      onTracksChange={setTracks}
    />
  )
}
```

### 多轨道管理

```tsx
<SubtitlePanel
  tracks={tracks}
  selectedTrackId={selectedId}
  onTrackSelect={setSelectedId}
  onTracksChange={setTracks}
/>
```

### 事件监听

```tsx
<SubtitlePanel
  tracks={tracks}
  onTrackSelect={(trackId) => console.log('Track selected:', trackId)}
  onSubtitleSelect={(subtitleId) => console.log('Subtitle selected:', subtitleId)}
/>
```

## 组件 API

### SubtitlePanel

```typescript
interface SubtitlePanelProps {
  tracks: SubtitleTrack[]
  selectedTrackId?: string
  onTracksChange?: (tracks: SubtitleTrack[]) => void
  onTrackSelect?: (trackId: string) => void
  onSubtitleSelect?: (subtitleId: string) => void
  className?: string
}
```

### SubtitleTrackList

```typescript
interface SubtitleTrackListProps {
  tracks: SubtitleTrack[]
  selectedTrackId?: string
  selectedSubtitleId?: string
  onTrackSelect: (trackId: string) => void
  onSubtitleSelect: (subtitleId: string) => void
  onAddTrack: () => void
  onRemoveTrack: (trackId: string) => void
  onToggleTrack: (trackId: string) => void
  onDeleteSubtitle: (subtitleId: string) => void
}
```

### SubtitleStyleEditor

```typescript
interface SubtitleStyleEditorProps {
  style: SubtitleStyle
  onChange: (style: SubtitleStyle) => void
}
```

### SubtitlePreview

```typescript
interface SubtitlePreviewProps {
  track: SubtitleTrack
  currentTime: number
  onTimeUpdate: (time: number) => void
}
```

## 样式定制

### CSS 变量

组件使用 CSS 变量进行主题化，可以在全局 CSS 中覆盖：

```css
:root {
  --editor-panel-bg: #1e1e1e;
  --editor-panel-header: #252525;
  --editor-panel-secondary: #252525;
  --editor-text: #ffffff;
  --editor-text-muted: #888888;
  --editor-border: #333333;
  --editor-accent: #3b82f6;
  --editor-accent-hover: #2563eb;
}
```

### CSS Modules

所有样式都使用 CSS Modules，确保作用域隔离：

```tsx
import styles from './subtitle-panel.module.css'

<div className={styles.subtitlePanel}>
  {/* ... */}
</div>
```

## 集成指南

### 与 EditorCore 集成

```tsx
import { useEditor } from '@/hooks/use-editor'

function EditorWithSubtitles() {
  const { editor } = useEditor()
  const [tracks, setTracks] = useState([])

  // 同步轨道到 EditorCore
  useEffect(() => {
    editor?.subtitleManager?.setTracks(tracks)
  }, [tracks, editor])

  return (
    <SubtitlePanel
      tracks={tracks}
      onTracksChange={setTracks}
    />
  )
}
```

### 与 Timeline 同步

```tsx
function SubtitleWithTimeline() {
  const [currentTime, setCurrentTime] = useState(0)

  return (
    <>
      <Timeline onTimeUpdate={setCurrentTime} />
      <SubtitlePanel
        tracks={tracks}
        previewTime={currentTime}
      />
    </>
  )
}
```

## 高级用法

### 自定义样式预设

```tsx
import { SubtitleStyleEditor, SUBTITLE_STYLE_PRESETS } from '@/components/editor/panels/subtitles'

// 添加自定义预设
const customPresets = {
  ...SUBTITLE_STYLE_PRESETS,
  myPreset: {
    fontSize: 28,
    color: '#FF6B6B',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    bold: true,
  },
}

<SubtitleStyleEditor
  style={style}
  onChange={setStyle}
  presets={customPresets}
/>
```

### 条件渲染

```tsx
{selectedTrack && (
  <SubtitleEditor
    subtitle={selectedSubtitle}
    onSave={handleSave}
    onCancel={handleCancel}
  />
)}
```

## 最佳实践

### 1. 状态管理

- 使用 React hooks 管理本地状态
- 通过 props 回调同步到父组件
- 保持单一数据源

### 2. 性能优化

- 避免在渲染函数中创建新对象
- 使用 `useCallback` 缓存事件处理函数
- 大型轨道列表考虑虚拟化

### 3. 样式定制

- 优先使用 CSS 变量
- 使用 CSS Modules 避免冲突
- 遵循暗色主题设计

### 4. 错误处理

- 验证时间范围
- 检查轨道存在性
- 提供用户友好的错误提示

## 测试

### 运行测试

```bash
bun test src/components/editor/panels/subtitles/__tests__/
```

### 测试覆盖

- ✅ SubtitlePanel 渲染
- ✅ SubtitleTrackList 交互
- ✅ SubtitlePreview 时间更新
- ✅ 事件回调
- ✅ 条件渲染

## 常见问题

### Q: 如何添加新轨道？

```tsx
const handleAddTrack = () => {
  const newTrack = createSubtitleTrack('New Track', 'en', {
    subtitles: [],
    style: {},
  })
  const newTracks = [...tracks, newTrack]
  onTracksChange(newTracks)
}
```

### Q: 如何批量更新字幕？

```tsx
const handleBatchUpdate = () => {
  const updatedTracks = tracks.map(track => ({
    ...track,
    subtitles: track.subtitles.map(sub => ({
      ...sub,
      style: { ...sub.style, fontSize: 28 },
    })),
  }))
  onTracksChange(updatedTracks)
}
```

### Q: 如何导出字幕？

```tsx
import { SubtitlePipeline } from '@/services/renderer/subtitles'

const handleExport = () => {
  const pipeline = new SubtitlePipeline(new FFmpegService())
  const result = pipeline.exportSrt(track)
  if (result.success) {
    console.log(result.content)
  }
}
```

## 参考资料

- [字幕服务 API](/Users/mac/Desktop/cutia/apps/web/src/services/renderer/subtitles/index.ts)
- [组件源码](/Users/mac/Desktop/cutia/apps/web/src/components/editor/panels/subtitles/)
- [使用示例](/Users/mac/Desktop/cutia/apps/web/src/components/editor/panels/subtitles/subtitle-panel-examples.tsx)
- [测试文件](/Users/mac/Desktop/cutia/apps/web/src/components/editor/panels/subtitles/__tests__/)
