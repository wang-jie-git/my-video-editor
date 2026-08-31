# API 文档索引

本文档提供 Cutia 项目的完整 API 文档。

## 核心 API

### 视频编辑

- **[VideoComposer API](video-composer-api.md)** - 视频合并、分割、裁剪 API 文档
  - 视频合并
  - 转场效果
  - 视频分割
  - 视频裁剪
  - 视频信息查询
  - 类型定义
  - 错误处理

## 服务层 API

### 渲染服务

- **[FFmpegService](../services/renderer/ffmpeg/README.md)** - FFmpeg 核心服务
- **[FFmpegExporter](../services/renderer/ffmpeg-exporter.md)** - FFmpeg 导出服务
- **[VideoComposer](../services/renderer/video-composer.md)** - 视频编辑服务
- **[FormatConverter](../services/renderer/format-converter.md)** - 格式转换服务

### 音频服务

- **[AudioManager](../services/audio/README.md)** - 音频管理服务
- **[AudioEffects](audio-effects.md)** - 音频效果处理

### 字幕服务

- **[SubtitleService](../services/subtitle/README.md)** - 字幕处理服务

## 核心层 API

### EditorCore

- **[EditorCore](../../core/README.md)** - 编辑器核心
  - CommandManager
  - PlaybackManager
  - TimelineManager
  - ScenesManager
  - ProjectManager
  - MediaManager
  - RendererManager
  - SaveManager
  - AudioManager
  - SelectionManager

## 状态管理

### Zustand Stores

- **[EditorStore](../../stores/editor-store.md)** - 编辑器 UI 状态
- **[TimelineStore](../../stores/timeline-store.md)** - 时间轴状态
- **[AI Stores](../../stores/ai/README.md)** - AI 功能状态

## UI 组件 API

### 编辑器面板

- **[VideoComposer Panel](../../components/editor/panels/video-composer/README.md)** - 视频编辑面板

---

**最后更新**: 2026-08-31  
**维护**: Cutia 开发团队
