/**
 * 格式转换 UI 组件类型定义
 */

/**
 * 格式转换选项
 */
export interface FormatConvertUIOptions {
  /** 输入文件 */
  inputFile?: File
  /** 输出格式 */
  outputFormat: 'mp4' | 'webm'
  /** 视频编码器 */
  codec?: string
  /** 质量预设 */
  quality?: 'low' | 'medium' | 'high' | 'very_high'
  /** CRF 值 */
  crf?: number
  /** 是否保留音频 */
  includeAudio: boolean
  /** 是否覆盖已存在的文件 */
  overwrite: boolean
}

/**
 * 格式转换进度
 */
export interface FormatConvertProgress {
  /** 当前文件 */
  file: string
  /** 进度（0-1） */
  progress: number
  /** 状态 */
  status: 'idle' | 'detecting' | 'converting' | 'completed' | 'error'
  /** 错误信息 */
  error?: string
}

/**
 * 格式转换结果
 */
export interface FormatConvertUIResult {
  /** 是否成功 */
  success: boolean
  /** 输出文件 */
  outputFile?: string
  /** 文件大小（字节） */
  size?: number
  /** 错误信息 */
  error?: string
}
