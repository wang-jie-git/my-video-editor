/**
 * 字幕类型定义
 */

/**
 * 字幕条目
 */
export interface Subtitle {
  /** 唯一 ID */
  id: string
  /** 字幕文本 */
  text: string
  /** 开始时间（秒） */
  startTime: number
  /** 结束时间（秒） */
  endTime: number
  /** 样式覆盖 */
  style?: SubtitleStyle
}

/**
 * 字幕样式
 */
export interface SubtitleStyle {
  /** 字体 */
  font?: string
  /** 字体大小 */
  fontSize?: number
  /** 字体颜色 */
  color?: string
  /** 背景颜色 */
  backgroundColor?: string
  /** 边框颜色 */
  borderColor?: string
  /** 边框宽度 */
  borderWidth?: number
  /** 是否加粗 */
  bold?: boolean
  /** 是否斜体 */
  italic?: boolean
  /** 是否下划线 */
  underline?: boolean
  /** 位置 */
  position?: 'top' | 'bottom' | 'center'
  /** 水平对齐 */
  align?: 'left' | 'center' | 'right'
  /** 行间距 */
  lineSpacing?: number
  /** 阴影 */
  shadow?: {
    color: string
    blur: number
    x: number
    y: number
  }
  /** 是否为翻译文本 */
  translated?: boolean
  /** 原始文本（翻译时保留） */
  originalText?: string
}

/**
 * 字幕轨道
 */
export interface SubtitleTrack {
  /** 轨道 ID */
  id: string
  /** 轨道名称 */
  name: string
  /** 语言代码（ISO 639-1） */
  language: string
  /** 是否启用 */
  enabled: boolean
  /** 字幕列表 */
  subtitles: Subtitle[]
  /** 轨道样式 */
  style: SubtitleStyle
}

/**
 * 字幕格式
 */
export type SubtitleFormat = 'srt' | 'vtt' | 'ass' | 'ssa'

/**
 * 字幕解析结果
 */
export interface SubtitleParseResult {
  /** 是否成功 */
  success: boolean
  /** 字幕轨道 */
  tracks: SubtitleTrack[]
  /** 错误信息 */
  error?: string
  /** 格式 */
  format?: SubtitleFormat
}

/**
 * 字幕导出选项
 */
export interface SubtitleExportOptions {
  /** 格式 */
  format: SubtitleFormat
  /** 轨道 ID（可选，导出指定轨道） */
  trackId?: string
  /** 是否包含样式 */
  includeStyle?: boolean
}

/**
 * 字幕导出结果
 */
export interface SubtitleExportResult {
  /** 是否成功 */
  success: boolean
  /** 导出的内容 */
  content?: string
  /** 错误信息 */
  error?: string
}

/**
 * 字幕烧录选项
 */
export interface SubtitleBurnOptions {
  /** 输入文件 */
  inputFile: string
  /** 输出文件 */
  outputFile: string
  /** 字幕轨道 */
  track: SubtitleTrack
  /** 视频尺寸 */
  videoSize?: {
    width: number
    height: number
  }
  /** 进度回调 */
  onProgress?: (progress: number) => void
}

/**
 * 字幕烧录结果
 */
export interface SubtitleBurnResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件 */
  outputFile?: string
  /** 文件大小（字节） */
  size?: number
  /** 错误信息 */
  error?: string
}

/**
 * 字幕默认样式
 */
export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  font: 'Arial',
  fontSize: 24,
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  borderColor: '#000000',
  borderWidth: 2,
  bold: false,
  italic: false,
  underline: false,
  position: 'bottom',
  align: 'center',
  lineSpacing: 1.5,
  shadow: {
    color: '#000000',
    blur: 4,
    x: 2,
    y: 2,
  },
}

/**
 * 字幕预设样式
 */
export const SUBTITLE_STYLE_PRESETS: Record<
  string,
  Partial<SubtitleStyle>
> = {
  default: DEFAULT_SUBTITLE_STYLE,
  large: {
    ...DEFAULT_SUBTITLE_STYLE,
    fontSize: 32,
  },
  small: {
    ...DEFAULT_SUBTITLE_STYLE,
    fontSize: 18,
  },
  bold: {
    ...DEFAULT_SUBTITLE_STYLE,
    bold: true,
    fontSize: 28,
  },
  minimal: {
    ...DEFAULT_SUBTITLE_STYLE,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadow: undefined,
  },
  cinematic: {
    ...DEFAULT_SUBTITLE_STYLE,
    font: 'Georgia',
    fontSize: 26,
    color: '#F0E68C',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    shadow: {
      color: '#000000',
      blur: 6,
      x: 2,
      y: 2,
    },
  },
}

/**
 * 创建字幕条目
 */
export function createSubtitle(
  text: string,
  startTime: number,
  endTime: number,
  overrides: Partial<Subtitle> = {}
): Subtitle {
  return {
    id: `subtitle-${Date.now()}-${Math.random()}`,
    text,
    startTime,
    endTime,
    ...overrides,
  }
}

/**
 * 创建字幕轨道
 */
export function createSubtitleTrack(
  name: string,
  language: string,
  overrides: Partial<SubtitleTrack> = {}
): SubtitleTrack {
  return {
    id: `track-${Date.now()}-${Math.random()}`,
    name,
    language,
    enabled: true,
    subtitles: [],
    style: { ...DEFAULT_SUBTITLE_STYLE },
    ...overrides,
  }
}

/**
 * 验证字幕时间范围
 */
export function validateSubtitleTimeRange(
  startTime: number,
  endTime: number
): { valid: boolean; error?: string } {
  if (startTime < 0) {
    return { valid: false, error: '开始时间不能为负数' }
  }

  if (endTime < 0) {
    return { valid: false, error: '结束时间不能为负数' }
  }

  if (endTime <= startTime) {
    return { valid: false, error: '结束时间必须大于开始时间' }
  }

  return { valid: true }
}

/**
 * 转换时间为 SRT 格式
 */
export function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

/**
 * 转换时间为 VTT 格式
 */
export function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.round((seconds % 1) * 1000)

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

/**
 * 解析时间字符串（秒）
 */
export function parseTimeString(timeStr: string): number {
  const parts = timeStr.split(':')
  let seconds = 0

  if (parts.length === 3) {
    // HH:MM:SS 或 HH:MM:SS.mmm
    seconds += parseInt(parts[0]) * 3600
    seconds += parseInt(parts[1]) * 60
    seconds += parseFloat(parts[2])
  } else if (parts.length === 2) {
    // MM:SS 或 MM:SS.mmm
    seconds += parseInt(parts[0]) * 60
    seconds += parseFloat(parts[1])
  } else {
    seconds = parseFloat(parts[0])
  }

  return seconds
}
