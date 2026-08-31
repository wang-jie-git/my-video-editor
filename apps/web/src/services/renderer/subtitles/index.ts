/**
 * 字幕服务
 *
 * 导出所有字幕相关的类、类型和工具函数
 */

export { SrtParser } from './srt-parser'
export { VttParser } from './vtt-parser'
export { SubtitlePipeline } from './subtitle-pipeline'

export type {
  Subtitle,
  SubtitleStyle,
  SubtitleTrack,
  SubtitleFormat,
  SubtitleParseResult,
  SubtitleExportOptions,
  SubtitleExportResult,
  SubtitleBurnOptions,
  SubtitleBurnResult,
} from './subtitle-types'

export {
  DEFAULT_SUBTITLE_STYLE,
  SUBTITLE_STYLE_PRESETS,
  createSubtitle,
  createSubtitleTrack,
  validateSubtitleTimeRange,
  formatSrtTime,
  formatVttTime,
  parseTimeString,
} from './subtitle-types'
